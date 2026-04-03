import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  autoLayoutDocument,
  createCardNode,
  createEdgeFromPorts,
  createEmptyWorkflowDocument,
  createToolStepNode,
  getStartNode,
  getExecutionOrder,
  isStartNode,
  validateDocument as runValidation,
} from '../lib/graph.ts';
import {
  extractFunctionCallsFromMarkup,
  getADKDisplayText,
  getADKMessageId,
  getADKStage,
  getADKThoughtText,
  getSkillInstallFromFunctionCall,
  summarizeFunctionResponse,
  type ADKSessionEventPayload,
} from '../lib/adkEvents.ts';
import { requestToolCatalog, requestSkills, streamSkillGeneration, type ToolCatalogEntry, type Skill } from '../lib/api.ts';
import { runSkillGenerator } from '../lib/skillGenerator.ts';
import { markdownSkillToDocument, skillDocumentToMarkdown } from '../lib/skillMarkdown.ts';
import type { CardType, SkillDocument, SkillEdge, SkillNode } from '../schemas/skill.ts';
import type { StatusType } from '../components/StatusPill.tsx';

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface SkillInstall {
  name: string;
  version: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  timestamp: string;
  streaming?: boolean;
  thoughtStreaming?: boolean;
  displayType?: 'message' | 'status';
  documentId?: string;
  toolCalls?: ToolCall[];
  skillInstalls?: SkillInstall[];
}

export type SidebarTab = 'outline' | 'library';
export type UtilityTab = 'log' | 'validation' | 'search' | 'trace' | 'markdown';
export type GenerationModel = 'qwen3-32b' | 'kimi-k2.5';

interface AppState {
  document: SkillDocument | null;
  rawSkillMarkdown: string;
  markdownError: string | null;
  toolCatalog: ToolCatalogEntry[];
  skills: Skill[];
  isLoadingSkills: boolean;
  skillsError: string | null;
  generationModel: GenerationModel;
  reasoningEnabled: boolean;
  appState: StatusType;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  sidebarTab: SidebarTab;
  utilityTab: UtilityTab;
  fitViewVersion: number;
  messages: ChatMessage[];
  isSkillLibraryOpen: boolean;
  selectedSkillId: string | null;
  matchedSkillId: string | null;
  setDocument: (doc: SkillDocument | null) => void;
  setGenerationModel: (model: GenerationModel) => void;
  setReasoningEnabled: (enabled: boolean) => void;
  updateDocument: (updates: Partial<SkillDocument>) => void;
  validateDocument: () => void;
  autoLayout: () => void;
  requestFitView: () => void;
  runMockExecution: () => void;
  resetExecution: () => void;
  applyAgentPrompt: (prompt: string) => Promise<void>;
  applyUpdateSkillToolCall: (args: { name: string; description: string; operations: Array<{ type: 'replace_document'; document: SkillDocument }> }) => void;
  addCaseToDocument: (_caseId: string) => void;
  addCardOfType: (cardType: CardType) => void;
  addToolStep: (toolName: string) => void;
  setAppState: (state: StatusType) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setUtilityTab: (tab: UtilityTab) => void;
  setSkillLibraryOpen: (isOpen: boolean) => void;
  setSelectedSkillId: (id: string | null) => void;
  setMatchedSkillId: (id: string | null) => void;
  loadToolCatalog: () => Promise<void>;
  loadSkills: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  ensureMessage: (message: ChatMessage) => void;
  appendMessageContent: (id: string, chunk: string, timestamp?: string) => void;
  replaceMessageContent: (id: string, content: string, timestamp?: string) => void;
  appendMessageThought: (id: string, chunk: string, timestamp?: string) => void;
  replaceMessageThought: (id: string, content: string, timestamp?: string) => void;
  clearMessages: () => void;
  updateNode: (id: string, updates: Partial<SkillNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: SkillEdge) => void;
  connectPorts: (sourcePortId: string, targetPortId: string) => void;
  updateEdge: (id: string, updates: Partial<SkillEdge>) => void;
  removeEdge: (id: string) => void;
}

const appendTimeline = (
  document: SkillDocument,
  message: string,
  level: 'info' | 'success' | 'warning' | 'error' = 'info',
  nodeId?: string,
): SkillDocument => ({
  ...document,
  execution: {
    ...document.execution,
    timeline: [
      ...document.execution.timeline,
      {
        id: uuidv4(),
        level,
        message,
        nodeId,
        timestamp: new Date().toISOString(),
      },
    ],
  },
  updatedAt: new Date().toISOString(),
});

const withMarkdownState = (document: SkillDocument | null, markdownError: string | null = null, rawSkillMarkdown?: string) => ({
  document,
  rawSkillMarkdown: rawSkillMarkdown ?? skillDocumentToMarkdown(document),
  markdownError,
});

const layoutLoadedDocument = (document: SkillDocument | null) => (document ? autoLayoutDocument(document) : null);

const appendNodeWithStartLink = (document: SkillDocument, node: SkillNode) => {
  const startNode = getStartNode(document);
  const hasStartLink = startNode
    ? document.edges.some((edge) => edge.fromNodeId === startNode.id)
    : true;

  const nextDocument: SkillDocument = {
    ...document,
    nodes: [...document.nodes, node],
    edges: [...document.edges],
  };

  if (startNode && !hasStartLink && node.id !== startNode.id) {
    const startOutput = startNode.flowOutputs[0];
    const startEdge = startOutput ? createEdgeFromPorts(nextDocument, startOutput.id, node.id) : null;
    if (startEdge) {
      nextDocument.edges = [...nextDocument.edges, startEdge];
    }
  }

  return nextDocument;
};

const isStatusMessage = (content: string) =>
  /^(Analyzing .*|Starting .*|Checking .*|Fixing .*|Skill format check passed\.$|.*still running\.\.\.$|.*is responding\.$|.*completed\.$|Skill generation completed\.)$/.test(content.trim());

const formatStageContent = (content: string, stage: string) => {
  if (stage !== 'analysis') {
    return content;
  }
  return content.replace(/\n/g, '  \n');
};

const applyMarkdownArtifact = (
  set: (partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>)) => void,
  getState: () => AppState,
  markdownText: string,
  timelineMessage: string,
) => {
  try {
    const nextDocument = autoLayoutDocument(markdownSkillToDocument(markdownText, getState().toolCatalog));
    set((state) => ({
      ...withMarkdownState(
        appendTimeline(nextDocument, timelineMessage, 'success'),
        null,
        markdownText,
      ),
      appState: 'draft_ready',
      utilityTab: 'markdown',
      fitViewVersion: state.fitViewVersion + 1,
    }));
    return true;
  } catch (error) {
    set((state) => ({
      ...withMarkdownState(
        state.document ? appendTimeline(state.document, 'Preserved the current workflow because markdown import failed.', 'warning') : state.document,
        error instanceof Error ? error.message : 'Failed to import markdown workflow.',
        state.rawSkillMarkdown,
      ),
      appState: 'error',
      utilityTab: 'markdown',
    }));
    return false;
  }
};

export const useStore = create<AppState>((set, get) => ({
  document: null,
  rawSkillMarkdown: '',
  markdownError: null,
  toolCatalog: [],
  skills: [],
  isLoadingSkills: false,
  skillsError: null,
  generationModel: 'kimi-k2.5',
  reasoningEnabled: true,
  appState: 'idle',
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarTab: 'outline',
  utilityTab: 'log',
  fitViewVersion: 0,
  messages: [],
  isSkillLibraryOpen: false,
  selectedSkillId: null,
  matchedSkillId: null,

  setDocument: (doc) => set((state) => ({
    ...withMarkdownState(layoutLoadedDocument(doc)),
    appState: doc ? 'editing' : 'idle',
    fitViewVersion: doc ? state.fitViewVersion + 1 : state.fitViewVersion,
  })),
  setGenerationModel: (generationModel) => set({ generationModel }),
  setReasoningEnabled: (reasoningEnabled) => set({ reasoningEnabled }),

  updateDocument: (updates) =>
    set((state) => ({
      ...withMarkdownState(
        state.document
          ? {
              ...state.document,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : null,
      ),
    })),

  validateDocument: () =>
    set((state) => {
      if (!state.document) {
        return state;
      }

      const result = runValidation(state.document);
      return {
        ...withMarkdownState(
          appendTimeline(
            {
              ...state.document,
              validation: {
                errors: result.errors,
                warnings: result.warnings,
                lastValidatedAt: new Date().toISOString(),
              },
            },
          result.errors.length > 0 ? 'Validation found invalid action-card links.' : 'Validation passed for the action-card flow.',
          result.errors.length > 0 ? 'warning' : 'success',
          ),
        ),
        appState: result.errors.length > 0 ? 'error' : 'ready_to_run',
        utilityTab: 'validation',
      };
    }),

  autoLayout: () =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withMarkdownState(appendTimeline(autoLayoutDocument(state.document), 'Applied card auto layout.', 'info')),
        appState: 'editing',
      };
    }),

  requestFitView: () => set((state) => ({ fitViewVersion: state.fitViewVersion + 1 })),

  loadToolCatalog: async () => {
    try {
      const [catalog] = await Promise.all([
        requestToolCatalog(),
        get().loadSkills(),
      ]);
      set({ toolCatalog: catalog.tools, markdownError: null });
    } catch (error) {
      set({
        markdownError: error instanceof Error ? error.message : 'Failed to load tool catalog.',
      });
    }
  },

  loadSkills: async () => {
    set({ isLoadingSkills: true, skillsError: null });
    try {
      const response = await requestSkills();
      set({ skills: response.skills, isLoadingSkills: false });
    } catch (error) {
      set({
        skillsError: error instanceof Error ? error.message : 'Failed to load skill library.',
        isLoadingSkills: false,
      });
    }
  },

  setSkillLibraryOpen: (isSkillLibraryOpen) => set({ isSkillLibraryOpen }),
  setSelectedSkillId: (selectedSkillId) => set({ selectedSkillId }),
  setMatchedSkillId: (matchedSkillId) => set({ matchedSkillId }),

  runMockExecution: () => {
    const current = get().document;
    if (!current) {
      return;
    }

    const ordered = getExecutionOrder(current);
    const statuses = Object.fromEntries(current.nodes.map((node) => [node.id, 'pending' as const]));

    set({
      appState: 'mock_running',
      utilityTab: 'trace',
      ...withMarkdownState(
        appendTimeline(
          {
            ...current,
            execution: {
              ...current.execution,
              nodeStatuses: statuses,
            },
          },
          'Starting mock execution over next-action links.',
        ),
      ),
    });

    ordered.forEach((node, index) => {
      window.setTimeout(() => {
        set((state) => {
          if (!state.document) {
            return state;
          }
          return {
            ...withMarkdownState(
              appendTimeline(
                {
                  ...state.document,
                  execution: {
                    ...state.document.execution,
                    nodeStatuses: {
                      ...state.document.execution.nodeStatuses,
                      [node.id]: 'running',
                    },
                  },
                },
                `Running ${node.title}.`,
                'info',
                node.id,
              ),
            ),
          };
        });
      }, index * 700);

      window.setTimeout(() => {
        set((state) => {
          if (!state.document) {
            return state;
          }
          const terminalStatus = node.cardType === 'failure' ? 'error' : 'success';
          const isLast = index === ordered.length - 1;
          return {
            ...withMarkdownState(
              appendTimeline(
                {
                  ...state.document,
                  execution: {
                    ...state.document.execution,
                    lastRun: isLast ? new Date().toISOString() : state.document.execution.lastRun,
                    nodeStatuses: {
                      ...state.document.execution.nodeStatuses,
                      [node.id]: terminalStatus,
                    },
                  },
                },
                `${node.title} completed as ${terminalStatus}.`,
                terminalStatus === 'error' ? 'warning' : 'success',
                node.id,
              ),
            ),
            appState: isLast ? (terminalStatus === 'error' ? 'error' : 'run_complete') : state.appState,
          };
        });
      }, index * 700 + 350);
    });
  },

  resetExecution: () =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withMarkdownState(
          appendTimeline(
            {
              ...state.document,
              execution: {
                lastRun: undefined,
                nodeStatuses: {},
                timeline: [],
              },
            },
            'Execution state reset.',
          ),
        ),
        appState: 'editing',
      };
    }),

  applyAgentPrompt: async (prompt) => {
    const current = get().document;
    const { generationModel, reasoningEnabled } = get();

    if (generationModel === 'qwen3-32b') {
      const simulated = runSkillGenerator({ prompt, currentSkill: current });
      const choice = simulated.choices[0];
      const toolCall = choice.message.tool_calls[0];
      get().applyUpdateSkillToolCall(toolCall.function.arguments);
      get().addMessage({
        id: uuidv4(),
        role: 'assistant',
        content: `${choice.message.content}\n\nWorkflow update applied to the workspace.`,
        timestamp: new Date().toISOString(),
        toolCalls: [{ name: toolCall.function.name, args: toolCall.function.arguments as Record<string, unknown> }],
      });
      return;
    }

    try {
      let markdownApplied = false;
      await streamSkillGeneration({
        runId: uuidv4(),
        messages: [...get().messages.map((message) => ({ role: message.role, content: message.content })), { role: 'user', content: prompt }],
        current_skill_markdown: get().rawSkillMarkdown,
        reasoning_enabled: generationModel === 'kimi-k2.5' ? reasoningEnabled : false,
        context: {
          current_document_id: current?.id ?? null,
        },
      }, (event) => {
        if (event.type === 'session_event') {
          const payload = (event.payload ?? {}) as ADKSessionEventPayload;
          const rawText = typeof payload.text === 'string' ? payload.text : '';
          const rawContent = getADKDisplayText(payload);
          const rawThought = getADKThoughtText(payload);
          const messageId = getADKMessageId(payload);
          const stage = getADKStage(payload);
          const isPartial = Boolean(payload.partial);
          const isFinal = Boolean(payload.final_response || payload.turn_complete);
          const content = formatStageContent(rawContent, stage);
          const thought = rawThought;
          const fallbackFunctionCalls = Array.isArray(payload.function_calls) && payload.function_calls.length > 0
            ? []
            : extractFunctionCallsFromMarkup(rawText);

          if (Array.isArray(payload.function_calls)) {
            for (const call of payload.function_calls) {
              const skillInstall = getSkillInstallFromFunctionCall(call);
              get().addMessage({
                id: uuidv4(),
                role: 'assistant',
                content: `Invoking \`${call.name}\`.`,
                timestamp: event.timestamp,
                toolCalls: [{ name: call.name, args: call.args ?? {} }],
                skillInstalls: skillInstall ? [skillInstall] : undefined,
              });
            }
          }

          for (const call of fallbackFunctionCalls) {
            const skillInstall = getSkillInstallFromFunctionCall(call);
            get().addMessage({
              id: uuidv4(),
              role: 'assistant',
              content: `Invoking \`${call.name}\`.`,
              timestamp: event.timestamp,
              toolCalls: [{ name: call.name, args: call.args ?? {} }],
              skillInstalls: skillInstall ? [skillInstall] : undefined,
            });
          }

          if (Array.isArray(payload.function_responses)) {
            for (const response of payload.function_responses) {
              get().addMessage({
                id: uuidv4(),
                role: 'assistant',
                content: summarizeFunctionResponse(response),
                timestamp: event.timestamp,
              });
            }
          }

          if (thought) {
            if (isPartial) {
              get().ensureMessage({
                id: messageId,
                role: 'assistant',
                content: '',
                thought: '',
                timestamp: event.timestamp,
                streaming: true,
                thoughtStreaming: true,
              });
              get().appendMessageThought(messageId, thought, event.timestamp);
            } else if (isFinal) {
              get().ensureMessage({
                id: messageId,
                role: 'assistant',
                content: '',
                thought: '',
                timestamp: event.timestamp,
                streaming: true,
                thoughtStreaming: true,
              });
              get().replaceMessageThought(messageId, thought, event.timestamp);
            } else {
              get().addMessage({
                id: `${messageId}:thought:${event.timestamp}`,
                role: 'assistant',
                content: '',
                thought,
                timestamp: event.timestamp,
                thoughtStreaming: false,
              });
            }
          }

          if (content) {
            if (isPartial) {
              get().ensureMessage({
                id: messageId,
                role: 'assistant',
                content: '',
                timestamp: event.timestamp,
                streaming: true,
                thoughtStreaming: Boolean(thought),
              });
              get().appendMessageContent(messageId, content, event.timestamp);
            } else if (isFinal) {
              if (content) {
                get().ensureMessage({
                  id: messageId,
                  role: 'assistant',
                  content: '',
                  timestamp: event.timestamp,
                  streaming: true,
                  thoughtStreaming: Boolean(thought),
                });
                get().replaceMessageContent(messageId, content, event.timestamp);
              }
            } else {
              if (isStatusMessage(content)) {
                const statusId = `status:${stage}`;
                get().ensureMessage({
                  id: statusId,
                  role: 'assistant',
                  content,
                  timestamp: event.timestamp,
                  displayType: 'status',
                });
                get().replaceMessageContent(statusId, content, event.timestamp);
              } else {
                get().addMessage({
                  id: messageId,
                  role: 'assistant',
                  content,
                  timestamp: event.timestamp,
                  displayType: 'message',
                });
              }
            }
          }

          const markdownFromState = typeof payload.state_delta?.skill_markdown === 'string' ? payload.state_delta.skill_markdown : '';
          if (markdownFromState.trim() && (stage === 'checker' || isFinal)) {
            markdownApplied = applyMarkdownArtifact(
              set,
              get,
              markdownFromState,
              markdownApplied ? 'Applied updated markdown draft from backend agent.' : 'Applied markdown draft from backend agent.',
            ) || markdownApplied;
          }
          return;
        }

        if (event.type === 'run_complete') {
          set({
            appState: markdownApplied ? 'draft_ready' : 'ready_to_run',
          });
        }
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Network request failed.';
      set({
        markdownError: `Backend mode failed: ${detail}`,
        appState: 'error',
        utilityTab: 'markdown',
      });
      get().addMessage({
        id: uuidv4(),
        role: 'assistant',
        content: `Backend agent failed: ${detail}`,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Backend model failed: ${detail}. Switch to Qwen3-32B if the API is not running.`);
    }
  },

  applyUpdateSkillToolCall: (args) =>
    set((state) => {
      const replace = args.operations.find((operation) => operation.type === 'replace_document');
      if (!replace) {
        return state;
      }
      const nextDocument = autoLayoutDocument(replace.document);
      return {
        ...withMarkdownState(
          appendTimeline(
            nextDocument,
            `Applied update_skill tool call: ${args.description}`,
            'success',
          ),
        ),
        appState: 'draft_ready',
        utilityTab: 'log',
        fitViewVersion: state.fitViewVersion + 1,
      };
    }),

  addCaseToDocument: () => undefined,

  addCardOfType: (cardType) =>
    set((state) => {
      const baseDocument = state.document ?? createEmptyWorkflowDocument();
      const workflowNodeCount = baseDocument.nodes.filter((node) => !isStartNode(node)).length;
      const column = workflowNodeCount % 3;
      const row = Math.floor(workflowNodeCount / 3);
      const node = createCardNode(cardType, {
        x: 180 + column * 360,
        y: 140 + row * 250,
      });
      const nextDocument = appendNodeWithStartLink(baseDocument, node);
      return {
        ...withMarkdownState(
          appendTimeline(
            nextDocument,
            `Added ${cardType} card.`,
            'info',
            node.id,
          ),
        ),
        selectedNodeId: node.id,
        selectedEdgeId: null,
        fitViewVersion: state.fitViewVersion + 1,
        utilityTab: 'log',
        appState: 'editing',
      };
    }),

  addToolStep: (toolName) =>
    set((state) => {
      const tool = state.toolCatalog.find((entry) => entry.name === toolName);
      if (!tool) {
        return state;
      }
      const baseDocument = state.document ?? createEmptyWorkflowDocument();
      const workflowNodeCount = baseDocument.nodes.filter((node) => !isStartNode(node)).length;
      const column = workflowNodeCount % 3;
      const row = Math.floor(workflowNodeCount / 3);
      const node = createToolStepNode(tool, {
        x: 180 + column * 360,
        y: 140 + row * 250,
      });
      const nextDocument = appendNodeWithStartLink(baseDocument, node);
      return {
        ...withMarkdownState(
          appendTimeline(
            nextDocument,
            `Added tool step ${tool.name}.`,
            'info',
            node.id,
          ),
        ),
        selectedNodeId: node.id,
        selectedEdgeId: null,
        fitViewVersion: state.fitViewVersion + 1,
        utilityTab: 'log',
        appState: 'editing',
      };
    }),

  setAppState: (appState) => set({ appState }),
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setUtilityTab: (utilityTab) => set({ utilityTab }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  ensureMessage: (message) =>
    set((state) => ({
      messages: state.messages.some((item) => item.id === message.id)
        ? state.messages
        : [...state.messages, message],
    })),
  appendMessageContent: (id, chunk, timestamp) =>
    set((state) => {
      if (!chunk) {
        return state;
      }
      const existing = state.messages.find((message) => message.id === id);
      if (!existing) {
        return {
          messages: [
            ...state.messages,
            {
              id,
              role: 'assistant',
              content: chunk,
              timestamp: timestamp ?? new Date().toISOString(),
              streaming: true,
            },
          ],
        };
      }
      return {
        messages: state.messages.map((message) =>
          message.id === id
            ? {
                ...message,
                content: `${message.content}${chunk}`,
                timestamp: timestamp ?? message.timestamp,
                streaming: true,
              }
            : message,
        ),
      };
    }),
  replaceMessageContent: (id, content, timestamp) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id
          ? {
              ...message,
              content,
              timestamp: timestamp ?? message.timestamp,
              streaming: false,
              }
            : message,
      ),
    })),
  appendMessageThought: (id, chunk, timestamp) =>
    set((state) => {
      if (!chunk) {
        return state;
      }
      const existing = state.messages.find((message) => message.id === id);
      if (!existing) {
        return {
          messages: [
            ...state.messages,
            {
              id,
              role: 'assistant',
              content: '',
              thought: chunk,
              timestamp: timestamp ?? new Date().toISOString(),
              streaming: true,
              thoughtStreaming: true,
            },
          ],
        };
      }
      return {
        messages: state.messages.map((message) =>
          message.id === id
            ? {
                ...message,
                thought: `${message.thought ?? ''}${chunk}`,
                timestamp: timestamp ?? message.timestamp,
                thoughtStreaming: true,
              }
            : message,
        ),
      };
    }),
  replaceMessageThought: (id, content, timestamp) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id
          ? {
              ...message,
              thought: content,
              timestamp: timestamp ?? message.timestamp,
              thoughtStreaming: false,
            }
          : message,
      ),
    })),
  clearMessages: () =>
    set({
      messages: [],
      document: null,
      rawSkillMarkdown: '',
      markdownError: null,
      appState: 'idle',
      selectedNodeId: null,
      selectedEdgeId: null,
      utilityTab: 'log',
    }),

  updateNode: (id, updates) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withMarkdownState({
          ...state.document,
          nodes: state.document.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
          updatedAt: new Date().toISOString(),
        }),
        appState: 'editing',
      };
    }),

  removeNode: (id) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      const node = state.document.nodes.find((item) => item.id === id);
      if (node && isStartNode(node)) {
        return {
          ...withMarkdownState(
            appendTimeline(state.document, 'Start step cannot be removed.', 'warning', id),
          ),
        };
      }
      return {
        ...withMarkdownState(
          appendTimeline(
            {
              ...state.document,
              nodes: state.document.nodes.filter((node) => node.id !== id),
              edges: state.document.edges.filter((edge) => edge.fromNodeId !== id && edge.toNodeId !== id),
            },
            `Removed card ${id}.`,
            'warning',
            id,
          ),
        ),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        selectedEdgeId: null,
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withMarkdownState(
          appendTimeline(
            {
              ...state.document,
              edges: [...state.document.edges, edge],
            },
            'Linked workflow path.',
            'success',
            edge.toNodeId,
          ),
        ),
        selectedEdgeId: edge.id,
      };
    }),

  connectPorts: (sourcePortId, targetPortId) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      const edge = createEdgeFromPorts(state.document, sourcePortId, targetPortId);
      if (!edge) {
        return {
          ...withMarkdownState(appendTimeline(state.document, 'Rejected an invalid card link.', 'warning')),
        };
      }
      return {
        ...withMarkdownState(
          appendTimeline(
            {
              ...state.document,
              edges: [...state.document.edges, edge],
            },
            'Added workflow link.',
            'success',
            edge.toNodeId,
          ),
        ),
        selectedEdgeId: edge.id,
      };
    }),

  updateEdge: (id, updates) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withMarkdownState({
          ...state.document,
          edges: state.document.edges.map((edge) => (edge.id === id ? { ...edge, ...updates } : edge)),
          updatedAt: new Date().toISOString(),
        }),
      };
    }),

  removeEdge: (id) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withMarkdownState(
          appendTimeline(
            {
              ...state.document,
              edges: state.document.edges.filter((edge) => edge.id !== id),
            },
            `Removed link ${id}.`,
            'warning',
          ),
        ),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      };
    }),
}));

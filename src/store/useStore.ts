import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  autoLayoutDocument,
  createCardNode,
  createEdgeFromPorts,
  getExecutionOrder,
  validateDocument as runValidation,
} from '../lib/graph';
import {
  extractFunctionCallsFromMarkup,
  extractYamlBlockFromText,
  getADKDisplayText,
  getADKMessageId,
  getADKStage,
  getSkillInstallFromFunctionCall,
  stripYamlBlockFromText,
  summarizeFunctionResponse,
  type ADKSessionEventPayload,
} from '../lib/adkEvents';
import { streamSkillGeneration } from '../lib/api';
import { runSkillGenerator } from '../lib/skillGenerator';
import { parseSkillYaml, skillDocumentToYaml } from '../lib/skillYaml';
import type { CardType, SkillDocument, SkillEdge, SkillNode } from '../schemas/skill';
import type { StatusType } from '../components/StatusPill';

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
  timestamp: string;
  streaming?: boolean;
  displayType?: 'message' | 'status';
  documentId?: string;
  toolCalls?: ToolCall[];
  skillInstalls?: SkillInstall[];
}

export type SidebarTab = 'outline' | 'library';
export type UtilityTab = 'log' | 'validation' | 'search' | 'trace' | 'yaml';
export type GenerationModel = 'qwen3-32b' | 'kimi-k2.5';

interface AppState {
  document: SkillDocument | null;
  rawSkillYaml: string;
  yamlError: string | null;
  generationModel: GenerationModel;
  appState: StatusType;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  sidebarTab: SidebarTab;
  utilityTab: UtilityTab;
  fitViewVersion: number;
  messages: ChatMessage[];
  setDocument: (doc: SkillDocument | null) => void;
  setGenerationModel: (model: GenerationModel) => void;
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
  setAppState: (state: StatusType) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setUtilityTab: (tab: UtilityTab) => void;
  addMessage: (message: ChatMessage) => void;
  ensureMessage: (message: ChatMessage) => void;
  appendMessageContent: (id: string, chunk: string, timestamp?: string) => void;
  replaceMessageContent: (id: string, content: string, timestamp?: string) => void;
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

const withYamlState = (document: SkillDocument | null, yamlError: string | null = null) => ({
  document,
  rawSkillYaml: skillDocumentToYaml(document),
  yamlError,
});

const isStatusMessage = (content: string) =>
  /^(Starting .*|.*still running\.\.\.$|.*is responding\.$|.*completed\.$|Skill generation completed\.)$/.test(content.trim());

const applyYamlArtifact = (
  set: (partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>)) => void,
  yamlText: string,
  timelineMessage: string,
) => {
  try {
    const parsed = parseSkillYaml(yamlText);
    set((state) => ({
      ...withYamlState(
        appendTimeline(parsed, timelineMessage, 'success'),
      ),
      appState: 'draft_ready',
      utilityTab: 'yaml',
      fitViewVersion: state.fitViewVersion + 1,
    }));
    return true;
  } catch (error) {
    set({
      yamlError: error instanceof Error ? error.message : 'Failed to parse assistant YAML.',
      appState: 'error',
      utilityTab: 'yaml',
    });
    return false;
  }
};

export const useStore = create<AppState>((set, get) => ({
  document: null,
  rawSkillYaml: '',
  yamlError: null,
  generationModel: 'qwen3-32b',
  appState: 'idle',
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarTab: 'outline',
  utilityTab: 'log',
  fitViewVersion: 0,
  messages: [],

  setDocument: (doc) => set({ ...withYamlState(doc), appState: doc ? 'editing' : 'idle' }),
  setGenerationModel: (generationModel) => set({ generationModel }),

  updateDocument: (updates) =>
    set((state) => ({
      ...withYamlState(
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
        ...withYamlState(
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
        ...withYamlState(appendTimeline(autoLayoutDocument(state.document), 'Applied card auto layout.', 'info')),
        appState: 'editing',
      };
    }),

  requestFitView: () => set((state) => ({ fitViewVersion: state.fitViewVersion + 1 })),

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
      ...withYamlState(
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
            ...withYamlState(
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
            ...withYamlState(
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
        ...withYamlState(
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
    const { generationModel } = get();

    if (generationModel === 'qwen3-32b') {
      const simulated = runSkillGenerator({ prompt, currentSkill: current });
      const choice = simulated.choices[0];
      const toolCall = choice.message.tool_calls[0];
      get().applyUpdateSkillToolCall(toolCall.function.arguments);
      get().addMessage({
        id: uuidv4(),
        role: 'assistant',
        content: `${choice.message.content}\n\nYAML skill applied to the workspace.`,
        timestamp: new Date().toISOString(),
        toolCalls: [{ name: toolCall.function.name, args: toolCall.function.arguments as Record<string, unknown> }],
      });
      return;
    }

    try {
      let yamlApplied = false;
      await streamSkillGeneration({
        runId: uuidv4(),
        messages: [...get().messages.map((message) => ({ role: message.role, content: message.content })), { role: 'user', content: prompt }],
        current_skill_yaml: get().rawSkillYaml,
        context: {
          current_document_id: current?.id ?? null,
        },
      }, (event) => {
        if (event.type === 'session_event') {
          const payload = (event.payload ?? {}) as ADKSessionEventPayload;
          const rawText = typeof payload.text === 'string' ? payload.text : '';
          const rawContent = getADKDisplayText(payload);
          const messageId = getADKMessageId(payload);
          const stage = getADKStage(payload);
          const isPartial = Boolean(payload.partial);
          const isFinal = Boolean(payload.final_response || payload.turn_complete);
          const yamlFromContent = stage === 'draft' ? extractYamlBlockFromText(rawContent) : '';
          const content = yamlFromContent ? stripYamlBlockFromText(rawContent) : rawContent;
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

          if (content) {
            if (isPartial) {
              get().ensureMessage({
                id: messageId,
                role: 'assistant',
                content: '',
                timestamp: event.timestamp,
                streaming: true,
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
                });
                get().replaceMessageContent(messageId, content, event.timestamp);
              }
            } else {
              get().addMessage({
                id: messageId,
                role: 'assistant',
                content,
                timestamp: event.timestamp,
                displayType: isStatusMessage(content) ? 'status' : 'message',
              });
            }
          }

          const yamlFromState = typeof payload.state_delta?.skill_yaml_draft === 'string' ? payload.state_delta.skill_yaml_draft : '';
          const yamlText = yamlFromState || yamlFromContent;
          if (yamlText.trim() && (stage === 'draft' || isFinal)) {
            yamlApplied = applyYamlArtifact(
              set,
              yamlText,
              yamlApplied ? 'Applied updated YAML draft from backend agent.' : 'Applied YAML draft from backend agent.',
            ) || yamlApplied;
          }
          return;
        }

        if (event.type === 'run_complete') {
          set({
            appState: yamlApplied ? 'draft_ready' : 'ready_to_run',
          });
        }
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Network request failed.';
      set({
        yamlError: `Backend mode failed: ${detail}`,
        appState: 'error',
        utilityTab: 'yaml',
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
      return {
        ...withYamlState(
          appendTimeline(
            replace.document,
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
      if (!state.document) {
        return state;
      }
      const column = state.document.nodes.length % 3;
      const row = Math.floor(state.document.nodes.length / 3);
      const node = createCardNode(cardType, {
        x: 180 + column * 360,
        y: 140 + row * 250,
      });
      return {
        ...withYamlState(
          appendTimeline(
            {
              ...state.document,
              nodes: [...state.document.nodes, node],
            },
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
  clearMessages: () => set({ messages: [] }),

  updateNode: (id, updates) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        ...withYamlState({
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
      return {
        ...withYamlState(
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
        ...withYamlState(
          appendTimeline(
            {
              ...state.document,
              edges: [...state.document.edges, edge],
            },
            edge.edgeType === 'data' ? 'Linked outputs to inputs.' : 'Linked next action path.',
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
          ...withYamlState(appendTimeline(state.document, 'Rejected an invalid card link.', 'warning')),
        };
      }
      return {
        ...withYamlState(
          appendTimeline(
            {
              ...state.document,
              edges: [...state.document.edges, edge],
            },
            edge.edgeType === 'data' ? 'Added data link.' : 'Added next action link.',
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
        ...withYamlState({
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
        ...withYamlState(
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

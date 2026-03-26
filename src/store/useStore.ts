import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  CASE_LIBRARY,
  autoLayoutDocument,
  createCardNode,
  createStarterDocument,
  createEdgeFromPorts,
  getExecutionOrder,
  validateDocument as runValidation,
} from '../lib/graph';
import { runSkillGenerator } from '../lib/skillGenerator';
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
  documentId?: string;
  toolCalls?: ToolCall[];
  skillInstalls?: SkillInstall[];
}

export type SidebarTab = 'outline' | 'library';
export type UtilityTab = 'log' | 'validation' | 'search' | 'trace';

interface PromptResult {
  summary: string;
  toolCallName: string;
  model: string;
}

interface AppState {
  document: SkillDocument | null;
  appState: StatusType;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  sidebarTab: SidebarTab;
  utilityTab: UtilityTab;
  fitViewVersion: number;
  messages: ChatMessage[];
  setDocument: (doc: SkillDocument | null) => void;
  updateDocument: (updates: Partial<SkillDocument>) => void;
  validateDocument: () => void;
  autoLayout: () => void;
  requestFitView: () => void;
  runMockExecution: () => void;
  resetExecution: () => void;
  applyAgentPrompt: (prompt: string) => PromptResult;
  applyUpdateSkillToolCall: (args: { name: string; description: string; operations: Array<{ type: 'replace_document'; document: SkillDocument }> }) => void;
  addCaseToDocument: (caseId: string) => void;
  addCardOfType: (cardType: CardType) => void;
  setAppState: (state: StatusType) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setUtilityTab: (tab: UtilityTab) => void;
  addMessage: (message: ChatMessage) => void;
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

export const useStore = create<AppState>((set, get) => ({
  document: createStarterDocument(),
  appState: 'editing',
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarTab: 'outline',
  utilityTab: 'log',
  fitViewVersion: 0,
  messages: [],

  setDocument: (doc) => set({ document: doc, appState: doc ? 'editing' : 'idle' }),

  updateDocument: (updates) =>
    set((state) => ({
      document: state.document
        ? {
            ...state.document,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : null,
    })),

  validateDocument: () =>
    set((state) => {
      if (!state.document) {
        return state;
      }

      const result = runValidation(state.document);
      return {
        document: appendTimeline(
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
        document: appendTimeline(autoLayoutDocument(state.document), 'Applied card auto layout.', 'info'),
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
      document: appendTimeline(
        {
          ...current,
          execution: {
            ...current.execution,
            nodeStatuses: statuses,
          },
        },
        'Starting mock execution over next-action links.',
      ),
    });

    ordered.forEach((node, index) => {
      window.setTimeout(() => {
        set((state) => {
          if (!state.document) {
            return state;
          }
          return {
            document: appendTimeline(
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
            document: appendTimeline(
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
        document: appendTimeline(
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
        appState: 'editing',
      };
    }),

  applyAgentPrompt: (prompt) => {
    const current = get().document;
    const completion = runSkillGenerator({ prompt, currentSkill: current });
    const choice = completion.choices[0];
    const toolCall = choice.message.tool_calls[0];
    get().applyUpdateSkillToolCall(toolCall.function.arguments);

    return {
      summary: choice.message.content,
      toolCallName: toolCall.function.name,
      model: completion.model,
    };
  },

  applyUpdateSkillToolCall: (args) =>
    set((state) => {
      const replace = args.operations.find((operation) => operation.type === 'replace_document');
      if (!replace) {
        return state;
      }
      return {
        document: appendTimeline(
          replace.document,
          `Applied update_skill tool call: ${args.description}`,
          'success',
        ),
        appState: 'draft_ready',
        utilityTab: 'log',
        fitViewVersion: state.fitViewVersion + 1,
      };
    }),

  addCaseToDocument: (caseId) => {
    const current = get().document;
    const promptSeed = CASE_LIBRARY.find((item) => item.id === caseId)?.title ?? caseId;
    const completion = runSkillGenerator({ prompt: promptSeed, currentSkill: current });
    const toolCall = completion.choices[0]?.message.tool_calls[0];
    if (toolCall) {
      get().applyUpdateSkillToolCall(toolCall.function.arguments);
    }
    set({ sidebarTab: 'outline' });
  },

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
        document: appendTimeline(
          {
            ...state.document,
            nodes: [...state.document.nodes, node],
          },
          `Added ${cardType} card.`,
          'info',
          node.id,
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
  clearMessages: () => set({ messages: [] }),

  updateNode: (id, updates) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        document: {
          ...state.document,
          nodes: state.document.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
          updatedAt: new Date().toISOString(),
        },
        appState: 'editing',
      };
    }),

  removeNode: (id) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        document: appendTimeline(
          {
            ...state.document,
            nodes: state.document.nodes.filter((node) => node.id !== id),
            edges: state.document.edges.filter((edge) => edge.fromNodeId !== id && edge.toNodeId !== id),
          },
          `Removed card ${id}.`,
          'warning',
          id,
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
        document: appendTimeline(
          {
            ...state.document,
            edges: [...state.document.edges, edge],
          },
          edge.edgeType === 'data' ? 'Linked outputs to inputs.' : 'Linked next action path.',
          'success',
          edge.toNodeId,
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
          document: appendTimeline(state.document, 'Rejected an invalid card link.', 'warning'),
        };
      }
      return {
        document: appendTimeline(
          {
            ...state.document,
            edges: [...state.document.edges, edge],
          },
          edge.edgeType === 'data' ? 'Added data link.' : 'Added next action link.',
          'success',
          edge.toNodeId,
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
        document: {
          ...state.document,
          edges: state.document.edges.map((edge) => (edge.id === id ? { ...edge, ...updates } : edge)),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeEdge: (id) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      return {
        document: appendTimeline(
          {
            ...state.document,
            edges: state.document.edges.filter((edge) => edge.id !== id),
          },
          `Removed link ${id}.`,
          'warning',
        ),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      };
    }),
}));

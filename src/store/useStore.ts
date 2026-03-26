import { create } from 'zustand';
import { autoLayoutDocument, createStarterDocument, validateDocument as runValidation } from '../lib/graph';
import type { SkillDocument, SkillEdge, SkillNode } from '../schemas/skill';
import type { StatusType } from '../components/StatusPill';

export interface ToolCall {
  name: string;
  args: Record<string, string>;
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
  setAppState: (state: StatusType) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setUtilityTab: (tab: UtilityTab) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  updateNode: (id: string, updates: Partial<SkillNode>) => void;
  addNode: (node: SkillNode) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: SkillEdge) => void;
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
        id: crypto.randomUUID(),
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
      const document = appendTimeline(
        {
          ...state.document,
          validation: {
            errors: result.errors,
            warnings: result.warnings,
            lastValidatedAt: new Date().toISOString(),
          },
        },
        result.errors.length > 0 ? 'Validation finished with blocking errors.' : 'Validation finished successfully.',
        result.errors.length > 0 ? 'warning' : 'success',
      );

      return {
        document,
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
        document: appendTimeline(autoLayoutDocument(state.document), 'Applied auto layout.', 'info'),
        appState: 'editing',
      };
    }),

  requestFitView: () => set((state) => ({ fitViewVersion: state.fitViewVersion + 1 })),

  runMockExecution: () => {
    const current = get().document;
    if (!current) {
      return;
    }

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
        'Starting mock execution.',
        'info',
      ),
    });

    current.nodes.forEach((node, index) => {
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
              `Executing ${node.title}.`,
              'info',
              node.id,
            ),
          };
        });
      }, index * 650);

      window.setTimeout(() => {
        set((state) => {
          if (!state.document) {
            return state;
          }

          const isLast = index === current.nodes.length - 1;

          return {
            document: appendTimeline(
              {
                ...state.document,
                execution: {
                  ...state.document.execution,
                  lastRun: isLast ? new Date().toISOString() : state.document.execution.lastRun,
                  nodeStatuses: {
                    ...state.document.execution.nodeStatuses,
                    [node.id]: 'success',
                  },
                },
              },
              `${node.title} completed.`,
              'success',
              node.id,
            ),
            appState: isLast ? 'run_complete' : state.appState,
          };
        });
      }, index * 650 + 350);
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
          'info',
        ),
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

  addNode: (node) =>
    set((state) => {
      if (!state.document) {
        return state;
      }

      return {
        document: appendTimeline(
          {
            ...state.document,
            nodes: [...state.document.nodes, node],
          },
          `Added node ${node.title}.`,
          'info',
          node.id,
        ),
        selectedNodeId: node.id,
        selectedEdgeId: null,
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
            groups: state.document.groups.map((group) => ({
              ...group,
              childNodeIds: group.childNodeIds.filter((nodeId) => nodeId !== id),
            })),
          },
          `Removed node ${id}.`,
          'warning',
          id,
        ),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        appState: 'editing',
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
          'Connected pins.',
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
          `Removed edge ${id}.`,
          'warning',
        ),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      };
    }),
}));

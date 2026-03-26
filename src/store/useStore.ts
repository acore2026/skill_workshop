import { create } from 'zustand';
import type { SkillDocument, SkillNode, SkillEdge } from '../schemas/skill';
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

interface AppState {
  document: SkillDocument | null;
  appState: StatusType;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  messages: ChatMessage[];
  
  // Actions
  setDocument: (doc: SkillDocument | null) => void;
  updateDocument: (updates: Partial<SkillDocument>) => void;
  setAppState: (state: StatusType) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  
  // Node actions
  updateNode: (id: string, updates: Partial<SkillNode>) => void;
  addNode: (node: SkillNode) => void;
  removeNode: (id: string) => void;
  
  // Edge actions
  addEdge: (edge: SkillEdge) => void;
  removeEdge: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  document: null,
  appState: 'idle',
  selectedNodeId: null,
  selectedEdgeId: null,
  messages: [],
  
  setDocument: (doc) => set({ document: doc }),
  
  updateDocument: (updates) => set((state) => ({
    document: state.document ? { ...state.document, ...updates } : null
  })),
  
  setAppState: (appState) => set({ appState }),
  
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  clearMessages: () => set({ messages: [] }),
  
  updateNode: (id, updates) => set((state) => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        nodes: state.document.nodes.map((node) => 
          node.id === id ? { ...node, ...updates } : node
        ),
      }
    };
  }),
  
  addNode: (node) => set((state) => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        nodes: [...state.document.nodes, node],
      }
    };
  }),
  
  removeNode: (id) => set((state) => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        nodes: state.document.nodes.filter((node) => node.id !== id),
        edges: state.document.edges.filter((edge) => edge.source !== id && edge.target !== id),
      },
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    };
  }),
  
  addEdge: (edge) => set((state) => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        edges: [...state.document.edges, edge],
      }
    };
  }),
  
  removeEdge: (id) => set((state) => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        edges: state.document.edges.filter((edge) => edge.id !== id),
      },
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    };
  }),
}));

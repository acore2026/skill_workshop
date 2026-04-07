import { MarkerType, type Node } from '@xyflow/react';

export interface ArchitectureNodeData {
  label: string;
  type: 'ue' | 'app' | 'agent' | 'core' | 'registry' | 'gateway' | 'domain' | 'ran';
  domain?: 'Device' | 'Network' | 'App';
  description?: string;
  properties?: Record<string, string>;
}

export const ARCHITECTURE_NODES: Node[] = [
  // --- DOMAIN GROUPS (Parent Nodes) ---
  {
    id: 'group-app',
    type: 'architectureNode',
    position: { x: 20, y: 20 },
    style: { width: 260, height: 220, backgroundColor: 'rgba(238, 242, 255, 0.4)', border: '2px dashed #e0e7ff', borderRadius: '16px' },
    data: { label: 'APP DOMAIN', type: 'domain' },
  },
  {
    id: 'group-device',
    type: 'architectureNode',
    position: { x: 20, y: 300 },
    style: { width: 260, height: 340, backgroundColor: 'rgba(255, 241, 242, 0.4)', border: '2px dashed #fecdd3', borderRadius: '16px' },
    data: { label: 'DEVICE DOMAIN', type: 'domain' },
  },
  {
    id: 'group-network',
    type: 'architectureNode',
    position: { x: 320, y: 20 },
    style: { width: 950, height: 620, backgroundColor: 'rgba(241, 245, 249, 0.4)', border: '2px dashed #cbd5e1', borderRadius: '16px' },
    data: { label: 'NETWORK DOMAIN', type: 'domain' },
  },

  // --- DEVICE DOMAIN NODES ---
  {
    id: 'ue-phone',
    parentId: 'group-device',
    type: 'architectureNode',
    position: { x: 80, y: 40 },
    extent: 'parent',
    data: { 
      label: 'Phone', 
      type: 'ue',
      domain: 'Device',
      description: 'Standard smartphone with 6G capabilities.',
      properties: { 'ID': 'SUCI_P001', 'Status': 'Active' }
    },
  },
  {
    id: 'ue-robot',
    parentId: 'group-device',
    type: 'architectureNode',
    position: { x: 80, y: 140 },
    extent: 'parent',
    data: { 
      label: 'Robot', 
      type: 'ue',
      domain: 'Device',
      description: 'Autonomous robotic system for industrial or service use.',
      properties: { 'ID': 'SUCI_R001', 'Status': 'Idle' }
    },
  },
  {
    id: 'ue-glasses',
    parentId: 'group-device',
    type: 'architectureNode',
    position: { x: 80, y: 240 },
    extent: 'parent',
    data: { 
      label: 'Glasses', 
      type: 'ue',
      domain: 'Device',
      description: 'AR/VR glasses for immersive experiences.',
      properties: { 'ID': 'SUCI_G001', 'Status': 'Connected' }
    },
  },

  // --- APP DOMAIN NODES ---
  {
    id: 'app-layer',
    parentId: 'group-app',
    type: 'architectureNode',
    position: { x: 40, y: 80 },
    extent: 'parent',
    data: { 
      label: 'App (Telegram/A2UI)', 
      type: 'app',
      domain: 'App',
      description: 'User-facing application interfaces providing natural language interaction.',
      properties: { 'Interface': 'Web/Mobile', 'Input': 'Voice/Text' }
    },
  },

  // --- NETWORK DOMAIN NODES ---
  {
    id: 'nef',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 40, y: 60 },
    extent: 'parent',
    data: { 
      label: 'NEF (NRF/GW)', 
      type: 'gateway',
      domain: 'Network',
      description: 'Network Exposure Function and Gateway. Acts as the interface between App and Network.',
      properties: { 'Access': 'Secure', 'API': 'REST/gRPC' }
    },
  },
  {
    id: 'srf',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 40, y: 360 },
    extent: 'parent',
    data: { 
      label: 'SRF', 
      type: 'core',
      domain: 'Network',
      description: 'Service Routing Function. Connects user equipment to the network intelligence layer.',
      properties: { 'Latency': '<0.5ms', 'Protocol': '6G-S' }
    },
  },
  {
    id: 'system-agent',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 280, y: 210 },
    extent: 'parent',
    data: { 
      label: 'System Agent', 
      type: 'agent',
      domain: 'Network',
      description: 'The master orchestrator analyzing intent and routing to specialized skill agents.',
      properties: { 'LLM': 'Active', 'Role': 'Orchestrator' }
    },
  },
  {
    id: 'conn-agent',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 520, y: 60 },
    extent: 'parent',
    data: { 
      label: 'ConnAgent / AAIHF', 
      type: 'agent',
      domain: 'Network',
      description: 'Specialized agent for managing secure connectivity and subnet onboarding.',
      properties: { 'Capability': 'Networking', 'Status': 'Ready' }
    },
  },
  {
    id: 'compute-agent',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 520, y: 210 },
    extent: 'parent',
    data: { 
      label: 'Compute Agent', 
      type: 'agent',
      domain: 'Network',
      description: 'Agent focused on computational task offloading and resource placement.',
      properties: { 'Capability': 'Compute', 'Status': 'Ready' }
    },
  },
  {
    id: 'sense-agent',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 520, y: 360 },
    extent: 'parent',
    data: { 
      label: 'Sense Agent', 
      type: 'agent',
      domain: 'Network',
      description: 'Agent specialized in environmental sensing and data acquisition.',
      properties: { 'Capability': 'Sensing', 'Status': 'Ready' }
    },
  },
  {
    id: 'acrf',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 780, y: 210 },
    extent: 'parent',
    data: { 
      label: 'ACRF', 
      type: 'registry',
      domain: 'Network',
      description: 'Agent Capability Repository Function. Stores skill definitions and embeddings.',
      properties: { 'Opt1': 'LLM Thinking', 'Opt2': 'Vector Store' }
    },
  },
  {
    id: 'igw',
    parentId: 'group-network',
    type: 'architectureNode',
    position: { x: 780, y: 380 },
    extent: 'parent',
    data: { 
      label: 'IGW', 
      type: 'gateway',
      domain: 'Network',
      description: 'Intelligence Gateway. Registers new skills and agents into the ACRF.',
      properties: { 'Action': 'RegisterSkill', 'Auth': 'Verified' }
    },
  },
];

export const ARCHITECTURE_EDGES = [
  // App -> SystemAgent via NEF
  { id: 'e-app-nef', source: 'app-layer', target: 'nef' },
  { id: 'e-nef-sa', source: 'nef', target: 'system-agent', animated: true },

  // UE -> SystemAgent via SRF
  { id: 'e-phone-srf', source: 'ue-phone', target: 'srf' },
  { id: 'e-robot-srf', source: 'ue-robot', target: 'srf' },
  { id: 'e-glasses-srf', source: 'ue-glasses', target: 'srf' },
  { id: 'e-srf-sa', source: 'srf', target: 'system-agent', animated: true },

  // SystemAgent -> Specialized Agents
  { id: 'e-sa-conn', source: 'system-agent', target: 'conn-agent' },
  { id: 'e-sa-compute', source: 'system-agent', target: 'compute-agent' },
  { id: 'e-sa-sense', source: 'system-agent', target: 'sense-agent' },

  // Specialized Agents -> ACRF (SearchSkill)
  { 
    id: 'e-conn-acrf', source: 'conn-agent', target: 'acrf', 
    label: 'SearchSkill', markerEnd: { type: MarkerType.ArrowClosed } 
  },
  { 
    id: 'e-compute-acrf', source: 'compute-agent', target: 'acrf', 
    label: 'SearchSkill', markerEnd: { type: MarkerType.ArrowClosed } 
  },
  { 
    id: 'e-sense-acrf', source: 'sense-agent', target: 'acrf', 
    label: 'SearchSkill', markerEnd: { type: MarkerType.ArrowClosed } 
  },

  // IGW -> ACRF (RegisterSkill)
  { 
    id: 'e-igw-acrf', source: 'igw', target: 'acrf', 
    label: 'RegisterSkill', markerEnd: { type: MarkerType.ArrowClosed } 
  },
];

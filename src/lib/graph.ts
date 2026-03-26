import { v4 as uuidv4 } from 'uuid';
import type {
  EdgeType,
  PinKind,
  SkillDocument,
  SkillEdge,
  SkillNode,
  SkillNodeType,
  SkillPin,
} from '../schemas/skill';

type TemplatePin = Omit<SkillPin, 'id' | 'nodeId' | 'optional'> & {
  optional?: boolean;
};

export interface NodeTemplate {
  id: string;
  type: SkillNodeType;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  tint: string;
  inputs: TemplatePin[];
  outputs: TemplatePin[];
  properties: Record<string, unknown>;
}

const pin = (pinConfig: TemplatePin): TemplatePin => pinConfig;

export const NODE_LIBRARY: NodeTemplate[] = [
  {
    id: 'on-prompt',
    type: 'entry',
    title: 'On User Prompt',
    subtitle: 'Entry',
    description: 'Root event that starts the graph.',
    badge: 'Event',
    tint: '#dbeafe',
    inputs: [],
    outputs: [pin({ direction: 'output', name: 'Exec', dataType: 'flow', pinKind: 'execution', multiplicity: 'single' })],
    properties: { trigger: 'prompt' },
  },
  {
    id: 'call-tool',
    type: 'action',
    title: 'Call Tool',
    subtitle: 'Action',
    description: 'Invokes an external tool with execution and data pins.',
    badge: 'Action',
    tint: '#e0f2fe',
    inputs: [
      pin({ direction: 'input', name: 'Exec', dataType: 'flow', pinKind: 'execution', multiplicity: 'single' }),
      pin({ direction: 'input', name: 'Payload', dataType: 'json', pinKind: 'data', multiplicity: 'single', optional: true }),
    ],
    outputs: [
      pin({ direction: 'output', name: 'Then', dataType: 'flow', pinKind: 'execution', multiplicity: 'single' }),
      pin({ direction: 'output', name: 'Result', dataType: 'json', pinKind: 'data', multiplicity: 'single' }),
    ],
    properties: { tool: 'semantic_search', timeoutMs: 800 },
  },
  {
    id: 'branch',
    type: 'branch',
    title: 'Route by Confidence',
    subtitle: 'Branch',
    description: 'Splits execution based on a confidence threshold.',
    badge: 'Branch',
    tint: '#fef3c7',
    inputs: [
      pin({ direction: 'input', name: 'Exec', dataType: 'flow', pinKind: 'execution', multiplicity: 'single' }),
      pin({ direction: 'input', name: 'Score', dataType: 'number', pinKind: 'data', multiplicity: 'single' }),
    ],
    outputs: [
      pin({ direction: 'output', name: 'High', dataType: 'flow', pinKind: 'execution', multiplicity: 'single' }),
      pin({ direction: 'output', name: 'Low', dataType: 'flow', pinKind: 'execution', multiplicity: 'single' }),
    ],
    properties: { threshold: 0.72 },
  },
  {
    id: 'format',
    type: 'pure',
    title: 'Format Prompt',
    subtitle: 'Pure',
    description: 'Formats inputs into an enriched prompt body.',
    badge: 'Pure',
    tint: '#e0e7ff',
    inputs: [
      pin({ direction: 'input', name: 'Intent', dataType: 'string', pinKind: 'data', multiplicity: 'single' }),
      pin({ direction: 'input', name: 'Context', dataType: 'json', pinKind: 'data', multiplicity: 'single', optional: true }),
    ],
    outputs: [pin({ direction: 'output', name: 'Prompt', dataType: 'string', pinKind: 'data', multiplicity: 'single' })],
    properties: { template: 'Summarize intent and route to best tool' },
  },
  {
    id: 'constant',
    type: 'parameter',
    title: 'Model Config',
    subtitle: 'Parameter',
    description: 'Provides a reusable configuration value.',
    badge: 'Param',
    tint: '#dcfce7',
    inputs: [],
    outputs: [pin({ direction: 'output', name: 'Value', dataType: 'json', pinKind: 'data', multiplicity: 'single' })],
    properties: { model: 'gpt-5.4', temperature: 0.2 },
  },
  {
    id: 'respond',
    type: 'output',
    title: 'Final Response',
    subtitle: 'Output',
    description: 'Terminal result sink for the graph.',
    badge: 'Output',
    tint: '#fce7f3',
    inputs: [
      pin({ direction: 'input', name: 'Exec', dataType: 'flow', pinKind: 'execution', multiplicity: 'single', optional: true }),
      pin({ direction: 'input', name: 'Content', dataType: 'string', pinKind: 'data', multiplicity: 'single' }),
    ],
    outputs: [],
    properties: { channel: 'chat' },
  },
];

const createPin = (pinTemplate: TemplatePin, nodeId: string): SkillPin => ({
  ...pinTemplate,
  optional: pinTemplate.optional ?? false,
  id: `${nodeId}-${pinTemplate.direction}-${pinTemplate.name.toLowerCase().replace(/\s+/g, '-')}`,
  nodeId,
});

export const createNodeFromTemplate = (
  template: NodeTemplate,
  position: { x: number; y: number },
): SkillNode => {
  const nodeId = uuidv4();

  return {
    id: nodeId,
    type: template.type,
    title: template.title,
    subtitle: template.subtitle,
    position,
    size: { w: 256, h: 168 },
    inputs: template.inputs.map((item) => createPin(item, nodeId)),
    outputs: template.outputs.map((item) => createPin(item, nodeId)),
    properties: template.properties,
    uiState: {
      category: template.type,
      badge: template.badge,
      tint: template.tint,
    },
    validationState: {
      errors: [],
      warnings: [],
    },
  };
};

const getPinKindEdgeType = (pinKind: PinKind): EdgeType => {
  if (pinKind === 'execution' || pinKind === 'trigger') {
    return 'execution';
  }

  if (pinKind === 'event') {
    return 'event';
  }

  if (pinKind === 'reference') {
    return 'reference';
  }

  return 'data';
};

export const createEdgeFromPins = (
  sourceNode: SkillNode,
  sourcePin: SkillPin,
  targetNode: SkillNode,
  targetPin: SkillPin,
): SkillEdge => ({
  id: uuidv4(),
  fromNodeId: sourceNode.id,
  fromPinId: sourcePin.id,
  toNodeId: targetNode.id,
  toPinId: targetPin.id,
  edgeType: getPinKindEdgeType(sourcePin.pinKind),
  style: {
    stroke: sourcePin.pinKind === 'execution' ? '#e67e22' : '#3b82f6',
    animated: sourcePin.pinKind === 'execution',
  },
});

export const validateDocument = (document: SkillDocument) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allPins = new Map<string, SkillPin>();
  document.nodes.forEach((node) => {
    [...node.inputs, ...node.outputs].forEach((pinItem) => {
      allPins.set(pinItem.id, pinItem);
    });
  });

  document.nodes.forEach((node) => {
    if (!node.title.trim()) {
      errors.push(`Node ${node.id} is missing a title.`);
    }

    node.inputs.forEach((inputPin) => {
      const inboundEdge = document.edges.find((edge) => edge.toPinId === inputPin.id);
      if (!inboundEdge && !inputPin.optional && inputPin.defaultValue === undefined) {
        warnings.push(`Node "${node.title}" has an unbound required input "${inputPin.name}".`);
      }
    });
  });

  document.edges.forEach((edge) => {
    const sourcePin = allPins.get(edge.fromPinId);
    const targetPin = allPins.get(edge.toPinId);

    if (!sourcePin || !targetPin) {
      errors.push(`Edge ${edge.id} points to a missing pin.`);
      return;
    }

    if (sourcePin.direction !== 'output' || targetPin.direction !== 'input') {
      errors.push(`Edge ${edge.id} has invalid pin directions.`);
    }

    if (sourcePin.pinKind !== targetPin.pinKind) {
      errors.push(`Edge ${edge.id} connects incompatible pin kinds.`);
    }

    if (sourcePin.dataType !== targetPin.dataType && sourcePin.pinKind !== 'execution') {
      warnings.push(`Edge ${edge.id} connects mismatched data types: ${sourcePin.dataType} -> ${targetPin.dataType}.`);
    }
  });

  return { errors, warnings };
};

export const autoLayoutDocument = (document: SkillDocument): SkillDocument => {
  const columns: Record<SkillNodeType, number> = {
    entry: 0,
    parameter: 0,
    pure: 1,
    action: 2,
    branch: 2,
    reroute: 3,
    subgraph: 3,
    output: 4,
    annotation: 1,
  };

  const rowCounts: Record<number, number> = {};
  const nodes = document.nodes.map((node) => {
    const column = columns[node.type];
    const row = rowCounts[column] ?? 0;
    rowCounts[column] = row + 1;

    return {
      ...node,
      position: {
        x: 120 + column * 280,
        y: 120 + row * 200,
      },
    };
  });

  return {
    ...document,
    nodes,
    updatedAt: new Date().toISOString(),
  };
};

export const createStarterDocument = (): SkillDocument => {
  const now = new Date().toISOString();
  const entry = createNodeFromTemplate(NODE_LIBRARY[0], { x: 120, y: 180 });
  const format = createNodeFromTemplate(NODE_LIBRARY[3], { x: 380, y: 120 });
  const tool = createNodeFromTemplate(NODE_LIBRARY[1], { x: 640, y: 180 });
  const branch = createNodeFromTemplate(NODE_LIBRARY[2], { x: 900, y: 180 });
  const output = createNodeFromTemplate(NODE_LIBRARY[5], { x: 1180, y: 180 });
  const config = createNodeFromTemplate(NODE_LIBRARY[4], { x: 380, y: 340 });

  const nodes = [entry, format, tool, branch, output, config];
  const edges = [
    createEdgeFromPins(entry, entry.outputs[0], tool, tool.inputs[0]),
    createEdgeFromPins(format, format.outputs[0], output, output.inputs[1]),
    createEdgeFromPins(tool, tool.outputs[0], branch, branch.inputs[0]),
    createEdgeFromPins(config, config.outputs[0], tool, tool.inputs[1]),
  ];

  return {
    id: uuidv4(),
    name: 'Agent Orchestration Graph',
    type: 'event_graph',
    version: '1.0.0',
    nodes,
    edges,
    groups: [
      {
        id: uuidv4(),
        title: 'Drafting Lane',
        rect: { x: 80, y: 80, w: 900, h: 480 },
        style: {
          color: '#f5f7fb',
          borderColor: '#d6deee',
        },
        childNodeIds: [entry.id, format.id, tool.id, branch.id],
      },
    ],
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.9,
    },
    metadata: {
      description: 'UE-inspired light workspace for composing tool-first orchestration.',
      tags: ['workspace', 'orchestration', 'ue-style'],
      executionMode: 'Sequential',
      authoringMode: 'Visual Graph',
    },
    createdAt: now,
    updatedAt: now,
    validation: {
      errors: [],
      warnings: [],
    },
    execution: {
      nodeStatuses: {},
      timeline: [
        {
          id: uuidv4(),
          level: 'info',
          message: 'Workspace loaded with starter graph.',
          timestamp: now,
        },
      ],
    },
  };
};

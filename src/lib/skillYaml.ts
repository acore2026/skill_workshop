import { parse, stringify } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import { CARD_LIBRARY } from './graph.ts';
import { SkillDocumentSchema } from '../schemas/skill.ts';
import type { CardType, DataPort, NextActionPort, SkillDocument, SkillEdge, SkillNode } from '../schemas/skill.ts';

interface YamlPort {
  name: string;
  dataType: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
}

interface YamlNextAction {
  label: string;
  mode?: 'inout' | 'target';
}

interface YamlAttribute {
  key: string;
  value: string | number | boolean | null;
}

interface YamlCard {
  id?: string;
  type: CardType;
  title: string;
  summary: string;
  position?: { x: number; y: number };
  sbi?: SkillNode['sbi'];
  config?: Record<string, unknown>;
  inputs?: YamlPort[];
  outputs?: YamlPort[];
  nextActions?: YamlNextAction[];
  attributes?: YamlAttribute[];
}

interface YamlLink {
  id?: string;
  type: SkillEdge['edgeType'];
  from: { cardId: string; port: string };
  to: { cardId: string; port: string };
  label?: string;
}

interface SkillYamlDocument {
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    executionMode?: string;
  };
  cards: YamlCard[];
  links: YamlLink[];
}

const createDataPort = (
  nodeId: string,
  direction: 'input' | 'output',
  name: string,
  dataType: string,
  required = false,
  defaultValue?: string | number | boolean | null,
): DataPort => ({
  id: `${nodeId}-${direction}-${name.toLowerCase().replace(/\s+/g, '-')}`,
  nodeId,
  direction,
  name,
  dataType,
  required,
  defaultValue,
});

const createNextActionPort = (
  nodeId: string,
  label: string,
  mode: 'inout' | 'target' = 'inout',
): NextActionPort => ({
  id: `${nodeId}-next-${label.toLowerCase().replace(/\s+/g, '-')}`,
  nodeId,
  label,
  mode,
});

const templateForType = (cardType: CardType) => CARD_LIBRARY.find((item) => item.cardType === cardType);

const nodeToYamlCard = (node: SkillNode): YamlCard => {
  const isDataCard = ['constant', 'user_container', 'device_container', 'network_container', 'app_container'].includes(node.cardType);
  const attributes = Object.entries(node.properties).map(([key, value]) => ({
    key,
    value: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null ? value : String(value),
  }));
  const config = isDataCard ? undefined : node.properties;
  const inputs = isDataCard
    ? undefined
    : node.inputs.map((port) => ({
        name: port.name,
        dataType: port.dataType,
        required: port.required,
        defaultValue: port.defaultValue,
      }));
  const outputs = isDataCard
    ? undefined
    : node.outputs.map((port) => ({
        name: port.name,
        dataType: port.dataType,
        required: port.required,
        defaultValue: port.defaultValue,
      }));
  const nextActions = isDataCard ? undefined : node.nextActions.map((port) => ({ label: port.label, mode: port.mode }));

  return {
    id: node.id,
    type: node.cardType,
    title: node.title,
    summary: node.summary,
    position: node.position,
    sbi: node.sbi,
    ...(config && Object.keys(config).length > 0 ? { config } : {}),
    ...(inputs && inputs.length > 0 ? { inputs } : {}),
    ...(outputs && outputs.length > 0 ? { outputs } : {}),
    ...(nextActions && nextActions.length > 0 ? { nextActions } : {}),
    ...(isDataCard && attributes.length > 0 ? { attributes } : {}),
  };
};

const edgeToYamlLink = (edge: SkillEdge, nodes: SkillNode[]): YamlLink | null => {
  const sourceNode = nodes.find((node) => node.id === edge.fromNodeId);
  const targetNode = nodes.find((node) => node.id === edge.toNodeId);
  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourcePort =
    sourceNode.outputs.find((port) => port.id === edge.fromPortId) ??
    sourceNode.nextActions.find((port) => port.id === edge.fromPortId);
  const targetPort =
    targetNode.inputs.find((port) => port.id === edge.toPortId) ??
    targetNode.nextActions.find((port) => port.id === edge.toPortId);

  if (!sourcePort || !targetPort) {
    return null;
  }

  return {
    id: edge.id,
    type: edge.edgeType,
    from: { cardId: edge.fromNodeId, port: 'name' in sourcePort ? sourcePort.name : sourcePort.label },
    to: { cardId: edge.toNodeId, port: 'name' in targetPort ? targetPort.name : targetPort.label },
    label: edge.label,
  };
};

export const skillDocumentToYaml = (document: SkillDocument | null) => {
  if (!document) {
    return '';
  }

  const payload: SkillYamlDocument = {
    metadata: {
      name: document.name,
      description: document.metadata.description,
      tags: document.metadata.tags,
      executionMode: document.metadata.executionMode,
    },
    cards: document.nodes.map(nodeToYamlCard),
    links: document.edges.map((edge) => edgeToYamlLink(edge, document.nodes)).filter(Boolean) as YamlLink[],
  };

  return stringify(payload, {
    indent: 2,
  });
};

export const parseSkillYaml = (yamlText: string): SkillDocument => {
  const parsed = parse(yamlText) as SkillYamlDocument;
  if (!parsed || !parsed.metadata || !Array.isArray(parsed.cards) || !Array.isArray(parsed.links)) {
    throw new Error('YAML skill document must include metadata, cards, and links.');
  }

  const now = new Date().toISOString();

  const nodes: SkillNode[] = parsed.cards.map((card) => {
    const nodeId = card.id ?? uuidv4();
    const template = templateForType(card.type);

    const isDataCard = ['constant', 'user_container', 'device_container', 'network_container', 'app_container'].includes(card.type);
    const attributes = card.attributes ?? [];
    const properties = isDataCard
      ? Object.fromEntries(attributes.map((attribute) => [attribute.key, attribute.value]))
      : {};

    const outputs = isDataCard
      ? attributes.map((attribute) =>
          createDataPort(
            nodeId,
            'output',
            attribute.key,
            typeof attribute.value === 'number' ? 'number' : typeof attribute.value === 'boolean' ? 'boolean' : 'string',
            false,
            attribute.value,
          ),
        )
      : (card.outputs ?? []).map((port) =>
          createDataPort(nodeId, 'output', port.name, port.dataType, Boolean(port.required), port.defaultValue),
        );

    return {
      id: nodeId,
      cardType: card.type,
      title: card.title,
      summary: card.summary,
      position: card.position ?? { x: 120, y: 120 },
      size: { w: 320, h: 220 },
      inputs: isDataCard
        ? []
        : (card.inputs ?? []).map((port) =>
            createDataPort(nodeId, 'input', port.name, port.dataType, Boolean(port.required), port.defaultValue),
          ),
      outputs,
      nextActions: isDataCard
        ? []
        : (card.nextActions ?? []).map((port) => createNextActionPort(nodeId, port.label, port.mode ?? 'inout')),
      sbi: card.sbi,
      properties: isDataCard ? properties : card.config ?? {},
      sourceCase: {
        caseId: 'yaml',
        title: 'YAML Skill',
        excerpt: 'Applied from assistant-provided YAML.',
      },
      uiState: {
        tint: template?.tint,
        badge: template?.badge,
      },
      validationState: {
        errors: [],
        warnings: [],
      },
    };
  });

  const edges: SkillEdge[] = parsed.links.map((link) => {
    const fromNode = nodes.find((node) => node.id === link.from.cardId);
    const toNode = nodes.find((node) => node.id === link.to.cardId);
    if (!fromNode || !toNode) {
      throw new Error(`Link references missing card: ${link.from.cardId} -> ${link.to.cardId}`);
    }

    const fromPort =
      fromNode.outputs.find((port) => port.name === link.from.port) ??
      fromNode.nextActions.find((port) => port.label === link.from.port);
    const toPort =
      toNode.inputs.find((port) => port.name === link.to.port) ??
      toNode.nextActions.find((port) => port.label === link.to.port);

    if (!fromPort || !toPort) {
      throw new Error(`Link references missing port: ${link.from.port} -> ${link.to.port}`);
    }

    return {
      id: link.id ?? uuidv4(),
      fromNodeId: fromNode.id,
      fromPortId: fromPort.id,
      toNodeId: toNode.id,
      toPortId: toPort.id,
      edgeType: link.type,
      label: link.label,
      style: {
        stroke: link.type === 'next_action' ? '#f59e0b' : '#2563eb',
        animated: link.type === 'next_action',
      },
    };
  });

  return SkillDocumentSchema.parse({
    id: uuidv4(),
    name: parsed.metadata.name,
    type: 'action_graph',
    version: '1.0.0',
    nodes,
    edges,
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.9,
    },
    metadata: {
      description: parsed.metadata.description ?? '',
      tags: parsed.metadata.tags ?? [],
      executionMode: parsed.metadata.executionMode ?? 'Action Flow',
      sourceDocument: 'assistant-yaml',
    },
    createdAt: now,
    updatedAt: now,
    validation: {
      errors: [],
      warnings: [],
    },
    execution: {
      nodeStatuses: {},
      timeline: [],
    },
  });
};

const extractMessageText = (content: unknown) => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
};

export interface AssistantArtifacts {
  content: string;
  displayContent: string;
  yamlBlock: string | null;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  skillInstalls: Array<{ name: string; version: string }>;
}

export const extractAssistantArtifacts = (completion: unknown): AssistantArtifacts => {
  const choice = (completion as { choices?: Array<{ message?: { content?: unknown; tool_calls?: Array<{ function?: { name?: string; arguments?: Record<string, unknown> } }> } }> })?.choices?.[0];
  const content = extractMessageText(choice?.message?.content);
  const yamlMatch = content.match(/```yaml\s*([\s\S]*?)```/i);
  const yamlBlock = yamlMatch?.[1]?.trim() ?? null;
  const displayContent = content.replace(/```yaml\s*[\s\S]*?```/gi, '').trim();

  const toolCalls =
    choice?.message?.tool_calls?.flatMap((toolCall) =>
      toolCall.function?.name
        ? [{ name: toolCall.function.name, args: toolCall.function.arguments ?? {} }]
        : [],
    ) ?? [];

  const skillInstalls = /6gcore_skill_generation/i.test(content)
    ? [{ name: '6gcore_skill_generation', version: 'latest' }]
    : [];

  return {
    content,
    displayContent,
    yamlBlock,
    toolCalls,
    skillInstalls,
  };
};

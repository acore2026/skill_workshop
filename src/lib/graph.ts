import { v4 as uuidv4 } from 'uuid';
import type { CardType, SkillDocument, SkillEdge, SkillNode, WorkflowNodeType, WorkflowOutput } from '../schemas/skill.ts';

export interface ToolCatalogTool {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

export interface CardTemplate {
  id: string;
  nodeType: WorkflowNodeType;
  cardType: CardType;
  title: string;
  summary: string;
  badge: string;
  tint: string;
  flowOutputs: Array<{ label: string }>;
  properties: Record<string, unknown>;
}

export interface CaseTemplate {
  id: string;
  title: string;
  summary: string;
  excerpt: string;
  tags: string[];
  cards: Array<{
    key: string;
    templateId: string;
    title?: string;
    summary?: string;
    properties?: Record<string, unknown>;
    flowOutputs?: CardTemplate['flowOutputs'];
    position: { x: number; y: number };
  }>;
  edges: Array<{
    from: { card: string; output: string };
    to: { card: string };
    label?: string;
  }>;
}

const createFlowOutput = (nodeId: string, label: string): WorkflowOutput => ({
  id: `${nodeId}-flow-${label.toLowerCase().replace(/\s+/g, '-')}`,
  nodeId,
  label,
});

export const isStartNode = (node: Pick<SkillNode, 'cardType'>) => node.cardType === 'start';

export const getStartNode = (document: SkillDocument) => document.nodes.find((node) => isStartNode(node)) ?? null;

export const CARD_LIBRARY: CardTemplate[] = [
  {
    id: 'start',
    nodeType: 'control',
    cardType: 'start',
    title: 'Start',
    summary: 'Fixed entry point for the workflow.',
    badge: 'Start',
    tint: '#d1fae5',
    flowOutputs: [{ label: 'begin' }],
    properties: { fixed: true },
  },
  {
    id: 'action',
    nodeType: 'tool_step',
    cardType: 'action',
    title: 'Workflow Step',
    summary: 'Invoke a real tool step inside the workflow.',
    badge: 'Tool',
    tint: '#dbeafe',
    flowOutputs: [{ label: 'next' }],
    properties: {},
  },
  {
    id: 'branch',
    nodeType: 'control',
    cardType: 'branch',
    title: 'Branch',
    summary: 'Choose the next route based on a workflow gate.',
    badge: 'Branch',
    tint: '#fef3c7',
    flowOutputs: [{ label: 'continue' }, { label: 'abort' }],
    properties: {},
  },
  {
    id: 'loop',
    nodeType: 'control',
    cardType: 'loop',
    title: 'Loop',
    summary: 'Repeat a section until a workflow condition is satisfied.',
    badge: 'Loop',
    tint: '#e0e7ff',
    flowOutputs: [{ label: 'repeat' }, { label: 'done' }],
    properties: {},
  },
  {
    id: 'parallel',
    nodeType: 'control',
    cardType: 'parallel',
    title: 'Parallel',
    summary: 'Fan out work across multiple lanes before joining.',
    badge: 'Parallel',
    tint: '#dcfce7',
    flowOutputs: [{ label: 'lane-a' }, { label: 'lane-b' }, { label: 'join' }],
    properties: {},
  },
  {
    id: 'success',
    nodeType: 'control',
    cardType: 'success',
    title: 'Done',
    summary: 'Terminal success state for the workflow.',
    badge: 'Done',
    tint: '#dcfce7',
    flowOutputs: [],
    properties: { outcome: 'success' },
  },
  {
    id: 'failure',
    nodeType: 'control',
    cardType: 'failure',
    title: 'Abort',
    summary: 'Terminal failure state for the workflow.',
    badge: 'Abort',
    tint: '#fee2e2',
    flowOutputs: [],
    properties: { outcome: 'failure' },
  },
];

export const CASE_LIBRARY: CaseTemplate[] = [
  {
    id: 'acn-agent-access',
    title: 'ACN',
    summary: 'Process of connecting embodied agents to the network.',
    excerpt: 'Direct the workflow of a tool chain to connect a new embodied agent into a core network subnet.',
    tags: ['acn', 'subnet', 'access'],
    cards: [
      {
        key: 'subscription',
        templateId: 'action',
        title: 'Subscription_tool',
        summary: 'Validate whether the user or agent has subscribed to the required network capability.',
        properties: {
          tool_name: 'Subscription_tool',
          parameter_names: ['ue_id', 'service_type'],
        },
        position: { x: 160, y: 180 },
      },
      {
        key: 'subscription_gate',
        templateId: 'branch',
        title: 'Subscription OK?',
        summary: 'Abort the workflow if subscription validation fails.',
        flowOutputs: [{ label: 'continue' }, { label: 'abort' }],
        position: { x: 480, y: 180 },
      },
      {
        key: 'subnet_context',
        templateId: 'action',
        title: 'Create_Or_Update_Subnet_Context_tool',
        summary: 'Create or update the collaborative subnet context before onboarding the new agent.',
        properties: {
          tool_name: 'Create_Or_Update_Subnet_Context_tool',
          parameter_names: ['ue_id', 'agent_list', 'subnet_specification'],
        },
        position: { x: 840, y: 100 },
      },
      {
        key: 'context_gate',
        templateId: 'branch',
        title: 'Subnet Context Ready?',
        summary: 'Abort the workflow if subnet context creation fails.',
        flowOutputs: [{ label: 'continue' }, { label: 'abort' }],
        position: { x: 1160, y: 100 },
      },
      {
        key: 'issue_token',
        templateId: 'action',
        title: 'Issue_Access_Token_tool',
        summary: 'Generate the access token required for the target agent to enter the subnet.',
        properties: {
          tool_name: 'Issue_Access_Token_tool',
          parameter_names: ['subnet_id', 'agent_id'],
        },
        position: { x: 1520, y: 40 },
      },
      {
        key: 'validate_token',
        templateId: 'action',
        title: 'Validate_Access_Token_tool',
        summary: 'Validate that the issued access token is still valid for the subnet.',
        properties: {
          tool_name: 'Validate_Access_Token_tool',
          parameter_names: ['agent_id', 'subnet_id', 'provided_token'],
        },
        position: { x: 1880, y: 40 },
      },
      {
        key: 'token_gate',
        templateId: 'branch',
        title: 'Token Valid?',
        summary: 'Abort the workflow if token validation fails.',
        flowOutputs: [{ label: 'continue' }, { label: 'abort' }],
        position: { x: 2240, y: 40 },
      },
      {
        key: 'pdu_session',
        templateId: 'action',
        title: 'Create_Subnet_PDUSession_tool',
        summary: 'Establish the subnet PDU session that connects the new agent to the subnet.',
        properties: {
          tool_name: 'Create_Subnet_PDUSession_tool',
          parameter_names: ['agent_id', 'subnet_id'],
        },
        position: { x: 2600, y: 40 },
      },
      {
        key: 'done',
        templateId: 'success',
        title: 'DONE',
        summary: 'The embodied agent has been connected to the network subnet successfully.',
        position: { x: 2960, y: 40 },
      },
      {
        key: 'abort',
        templateId: 'failure',
        title: 'ABORT',
        summary: 'The workflow stops immediately when any required gate fails.',
        position: { x: 1520, y: 320 },
      },
    ],
    edges: [
      { from: { card: 'subscription', output: 'next' }, to: { card: 'subscription_gate' } },
      { from: { card: 'subscription_gate', output: 'continue' }, to: { card: 'subnet_context' } },
      { from: { card: 'subscription_gate', output: 'abort' }, to: { card: 'abort' }, label: 'abort' },
      { from: { card: 'subnet_context', output: 'next' }, to: { card: 'context_gate' } },
      { from: { card: 'context_gate', output: 'continue' }, to: { card: 'issue_token' } },
      { from: { card: 'context_gate', output: 'abort' }, to: { card: 'abort' }, label: 'abort' },
      { from: { card: 'issue_token', output: 'next' }, to: { card: 'validate_token' } },
      { from: { card: 'validate_token', output: 'next' }, to: { card: 'token_gate' } },
      { from: { card: 'token_gate', output: 'continue' }, to: { card: 'pdu_session' } },
      { from: { card: 'token_gate', output: 'abort' }, to: { card: 'abort' }, label: 'abort' },
      { from: { card: 'pdu_session', output: 'next' }, to: { card: 'done' } },
    ],
  },
  {
    id: 'a2ui-negotiation',
    title: 'A2UI Negotiation and Refinement',
    summary: 'Refine ambiguous intents through iterative branching before selecting a tool path.',
    excerpt: 'A2UI acts as a declarative broker that refines ambiguous intents before the workflow continues.',
    tags: ['a2ui', 'negotiation', 'loop'],
    cards: [
      { key: 'capture', templateId: 'action', title: 'Capture Intent', summary: 'Receive the high-level request from the user or app.', properties: { tool_name: 'Capture Intent' }, position: { x: 120, y: 170 } },
      { key: 'loop', templateId: 'loop', title: 'Negotiation Loop', summary: 'Refine the workflow path until the request is constrained.', position: { x: 430, y: 150 } },
      { key: 'select', templateId: 'action', title: 'Select Workflow Tool', summary: 'Choose the best tool step after refinement.', properties: { tool_name: 'Select Workflow Tool' }, position: { x: 790, y: 90 } },
      { key: 'reject', templateId: 'failure', title: 'Negotiation Failed', summary: 'The workflow could not converge on a safe route.', position: { x: 790, y: 300 } },
      { key: 'accept', templateId: 'success', title: 'Negotiation Complete', summary: 'The workflow is stable and ready for execution.', position: { x: 1120, y: 90 } },
    ],
    edges: [
      { from: { card: 'capture', output: 'next' }, to: { card: 'loop' } },
      { from: { card: 'loop', output: 'repeat' }, to: { card: 'loop' }, label: 'ask again' },
      { from: { card: 'loop', output: 'done' }, to: { card: 'select' } },
      { from: { card: 'loop', output: 'repeat' }, to: { card: 'reject' }, label: 'give up' },
      { from: { card: 'select', output: 'next' }, to: { card: 'accept' } },
    ],
  },
  {
    id: 'multi-domain-discovery',
    title: 'Multi-Domain Semantic Discovery',
    summary: 'Discover skills across multiple domains with a workflow branch for fallback.',
    excerpt: 'The architecture supports heterogeneous entities exposing capabilities through a unified workflow.',
    tags: ['ue', 'nf', 'af', 'parallel'],
    cards: [
      { key: 'request', templateId: 'action', title: 'Discovery Request', summary: 'Start capability-based discovery.', properties: { tool_name: 'Discovery Request' }, position: { x: 110, y: 200 } },
      { key: 'fanout', templateId: 'parallel', title: 'Search Domains', summary: 'Query domains in parallel.', flowOutputs: [{ label: 'lane-a' }, { label: 'lane-b' }, { label: 'join' }], position: { x: 430, y: 160 } },
      { key: 'decide', templateId: 'branch', title: 'Capability Match?', summary: 'Branch based on semantic match confidence.', flowOutputs: [{ label: 'match' }, { label: 'fallback' }], position: { x: 820, y: 200 } },
      { key: 'success', templateId: 'success', title: 'Skill Resolved', summary: 'A skill endpoint is available for execution.', position: { x: 1160, y: 130 } },
      { key: 'failure', templateId: 'failure', title: 'Fallback Route', summary: 'No trusted match was found.', position: { x: 1160, y: 300 } },
    ],
    edges: [
      { from: { card: 'request', output: 'next' }, to: { card: 'fanout' } },
      { from: { card: 'fanout', output: 'join' }, to: { card: 'decide' } },
      { from: { card: 'decide', output: 'match' }, to: { card: 'success' } },
      { from: { card: 'decide', output: 'fallback' }, to: { card: 'failure' } },
    ],
  },
];

export const getTemplateById = (templateId: string) => CARD_LIBRARY.find((item) => item.id === templateId);
export const getCaseById = (caseId: string) => CASE_LIBRARY.find((item) => item.id === caseId);

export const createCardFromTemplate = (
  template: CardTemplate,
  position: { x: number; y: number },
  overrides?: Partial<Pick<SkillNode, 'title' | 'summary' | 'properties'>> & {
    flowOutputs?: CardTemplate['flowOutputs'];
  },
  sourceCase?: SkillNode['sourceCase'],
): SkillNode => {
  const nodeId = uuidv4();

  return {
    id: nodeId,
    nodeType: template.nodeType,
    cardType: template.cardType,
    title: overrides?.title ?? template.title,
    summary: overrides?.summary ?? template.summary,
    position,
    size: { w: 320, h: 220 },
    flowOutputs: (overrides?.flowOutputs ?? template.flowOutputs).map((output) => createFlowOutput(nodeId, output.label)),
    properties: overrides?.properties ?? template.properties,
    sourceCase:
      sourceCase ?? {
        caseId: 'manual',
        title: 'Manual Workflow Step',
        excerpt: 'Inserted from the workflow editor.',
      },
    uiState: {
      tint: template.tint,
      badge: template.badge,
    },
    validationState: {
      errors: [],
      warnings: [],
    },
  };
};

const findFlowOutput = (node: SkillNode, label: string) =>
  node.flowOutputs.find((output) => output.label.toLowerCase() === label.toLowerCase());

const createCaseEdge = (edge: CaseTemplate['edges'][number], cardsByKey: Record<string, SkillNode>): SkillEdge => {
  const sourceCard = cardsByKey[edge.from.card];
  const targetCard = cardsByKey[edge.to.card];
  if (!sourceCard || !targetCard) {
    throw new Error(`Case edge points at a missing card: ${edge.from.card} -> ${edge.to.card}`);
  }

  const sourceOutput = findFlowOutput(sourceCard, edge.from.output);
  if (!sourceOutput) {
    throw new Error(`Case edge points at a missing workflow output: ${edge.from.output}`);
  }

  return {
    id: uuidv4(),
    fromNodeId: sourceCard.id,
    fromOutputId: sourceOutput.id,
    toNodeId: targetCard.id,
    kind: 'workflow',
    label: edge.label,
    style: {
      stroke: '#f59e0b',
      animated: true,
    },
  };
};

export const instantiateCase = (caseTemplate: CaseTemplate): SkillDocument => {
  const now = new Date().toISOString();
  const startNode = createStartNode({ x: 120, y: 180 });
  const cardsByKey = Object.fromEntries(
    caseTemplate.cards.map((card) => {
      const template = getTemplateById(card.templateId);
      if (!template) {
        throw new Error(`Unknown card template ${card.templateId}`);
      }

      const node = createCardFromTemplate(
        template,
        card.position,
        {
          title: card.title,
          summary: card.summary,
          properties: {
            ...template.properties,
            ...card.properties,
          },
          flowOutputs: card.flowOutputs,
        },
        {
          caseId: caseTemplate.id,
          title: caseTemplate.title,
          excerpt: caseTemplate.excerpt,
        },
      );

      return [card.key, node];
    }),
  ) as Record<string, SkillNode>;

  const nodes = [startNode, ...Object.values(cardsByKey)];
  const edges = caseTemplate.edges.map((edge) => createCaseEdge(edge, cardsByKey));
  const roots = Object.values(cardsByKey).filter(
    (node) => !edges.some((edge) => edge.toNodeId === node.id),
  );
  for (const root of roots) {
    edges.unshift({
      id: uuidv4(),
      fromNodeId: startNode.id,
      fromOutputId: startNode.flowOutputs[0].id,
      toNodeId: root.id,
      kind: 'workflow',
      label: 'begin',
      style: {
        stroke: '#f59e0b',
        animated: true,
      },
    });
  }

  return {
    id: uuidv4(),
    name: caseTemplate.title,
    type: 'workflow_graph',
    version: '1.0.0',
    nodes,
    edges,
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.9,
    },
    metadata: {
      description: caseTemplate.summary,
      tags: caseTemplate.tags,
      executionMode: 'Workflow',
      sourceDocument: 'ACN_SKILL.md',
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
          message: `Loaded workflow case: ${caseTemplate.title}.`,
          timestamp: now,
        },
      ],
    },
  };
};

const inferCaseFromPrompt = (prompt: string): CaseTemplate => {
  const normalized = prompt.toLowerCase();
  if (normalized.includes('a2ui') || normalized.includes('negot') || normalized.includes('refine')) {
    return CASE_LIBRARY[1];
  }
  if (normalized.includes('ue') || normalized.includes('nf') || normalized.includes('af') || normalized.includes('parallel') || normalized.includes('domain')) {
    return CASE_LIBRARY[2];
  }
  return CASE_LIBRARY[0];
};

const cloneDocument = (document: SkillDocument): SkillDocument => ({
  ...document,
  nodes: document.nodes.map((node) => ({
    ...node,
    flowOutputs: node.flowOutputs.map((output) => ({ ...output })),
    properties: { ...node.properties },
    sourceCase: { ...node.sourceCase },
    uiState: { ...node.uiState },
    validationState: {
      errors: [...node.validationState.errors],
      warnings: [...node.validationState.warnings],
    },
  })),
  edges: document.edges.map((edge) => ({
    ...edge,
    style: { ...edge.style },
  })),
  viewport: { ...document.viewport },
  metadata: {
    ...document.metadata,
    tags: [...document.metadata.tags],
  },
  validation: {
    ...document.validation,
    errors: [...document.validation.errors],
    warnings: [...document.validation.warnings],
  },
  execution: {
    ...document.execution,
    nodeStatuses: { ...document.execution.nodeStatuses },
    timeline: document.execution.timeline.map((item) => ({ ...item })),
  },
});

const getAppendOffset = (document: SkillDocument) => {
  const maxX = document.nodes.reduce((acc, node) => Math.max(acc, node.position.x + node.size.w), 0);
  return { x: maxX + 180, y: 0 };
};

const getRootActionTarget = (document: SkillDocument) => {
  const inbound = new Set(document.edges.map((edge) => edge.toNodeId));
  return document.nodes.find((node) => !inbound.has(node.id) && !isStartNode(node));
};

const getLastNonTerminalCard = (document: SkillDocument) =>
  [...document.nodes]
    .reverse()
    .find((node) => node.cardType !== 'success' && node.cardType !== 'failure' && !isStartNode(node));

const hasOnlyStartNode = (document: SkillDocument | null | undefined) => {
  if (!document) {
    return false;
  }
  return document.nodes.length === 1 && document.nodes.every((node) => isStartNode(node));
};

export const applyPromptToDocument = (
  prompt: string,
  currentDocument?: SkillDocument | null,
): { document: SkillDocument; summary: string; caseTemplate: CaseTemplate; mode: 'created' | 'updated' } => {
  const caseTemplate = inferCaseFromPrompt(prompt);

  if (!currentDocument || currentDocument.nodes.length === 0 || hasOnlyStartNode(currentDocument)) {
    const document = instantiateCase(caseTemplate);
    document.metadata.description = `Generated from chat prompt: ${prompt}`;
    return {
      document,
      summary: `Generated ${caseTemplate.title} from the ACN markdown workflow example.`,
      caseTemplate,
      mode: 'created',
    };
  }

  const incomingCase = instantiateCase(caseTemplate);
  const next = cloneDocument(currentDocument);
  const offset = getAppendOffset(next);
  const incomingStartNode = getStartNode(incomingCase);

  const shiftedNodes = incomingCase.nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
  }));
  const appendedNodes = shiftedNodes.filter((node) => !isStartNode(node));
  const appendedEdges = incomingCase.edges.filter((edge) => edge.fromNodeId !== incomingStartNode?.id);

  next.nodes = [...next.nodes, ...appendedNodes];
  next.edges = [...next.edges, ...appendedEdges];
  next.metadata.tags = Array.from(new Set([...next.metadata.tags, ...caseTemplate.tags]));
  next.updatedAt = new Date().toISOString();
  next.execution.timeline = [
    ...next.execution.timeline,
    {
      id: uuidv4(),
      level: 'info',
      message: `Appended workflow case "${caseTemplate.title}" from prompt: ${prompt}`,
      timestamp: new Date().toISOString(),
    },
  ];

  const sourceCard = getLastNonTerminalCard(currentDocument);
  const targetCard = getRootActionTarget(incomingCase);
  const sourceOutput = sourceCard?.flowOutputs[0];
  if (sourceCard && sourceOutput && targetCard) {
    next.edges.push({
      id: uuidv4(),
      fromNodeId: sourceCard.id,
      fromOutputId: sourceOutput.id,
      toNodeId: targetCard.id,
      kind: 'workflow',
      label: 'continue',
      style: {
        stroke: '#f59e0b',
        animated: true,
      },
    });
  }

  return {
    document: next,
    summary: `Appended ${caseTemplate.title} and linked it into the current workflow.`,
    caseTemplate,
    mode: 'updated',
  };
};

export const createStarterDocument = (): SkillDocument => instantiateCase(CASE_LIBRARY[0]);

export const createStartNode = (position: { x: number; y: number } = { x: 120, y: 180 }) => {
  const template = CARD_LIBRARY.find((item) => item.cardType === 'start');
  if (!template) {
    throw new Error('Missing start template');
  }
  return createCardFromTemplate(
    template,
    position,
    {
      properties: {
        ...template.properties,
        fixed: true,
      },
    },
    {
      caseId: 'system',
      title: 'Workflow System',
      excerpt: 'Fixed workflow entry point.',
    },
  );
};

export const createEmptyWorkflowDocument = (): SkillDocument => {
  const now = new Date().toISOString();
  const startNode = createStartNode();
  return {
    id: uuidv4(),
    name: 'Untitled Workflow',
    type: 'workflow_graph',
    version: '1.0.0',
    nodes: [startNode],
    edges: [],
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    metadata: {
      description: 'A workflow skill built from real tools and control steps.',
      tags: [],
      executionMode: 'Workflow',
      sourceDocument: 'ACN_SKILL.md',
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
  };
};

export const createCardNode = (cardType: CardType, position: { x: number; y: number }) => {
  const template = CARD_LIBRARY.find((item) => item.cardType === cardType);
  if (!template) {
    throw new Error(`Unknown card type ${cardType}`);
  }
  return createCardFromTemplate(template, position);
};

export const createToolStepNode = (tool: ToolCatalogTool, position: { x: number; y: number }) => {
  const actionTemplate = CARD_LIBRARY.find((item) => item.cardType === 'action');
  if (!actionTemplate) {
    throw new Error('Missing action template');
  }

  return createCardFromTemplate(
    actionTemplate,
    position,
    {
      title: tool.name,
      summary: tool.description,
      properties: {
        tool_name: tool.name,
        parameter_names: tool.parameters.map((parameter) => parameter.name),
      },
      flowOutputs: [{ label: 'next' }],
    },
    {
      caseId: 'tool_catalog',
      title: 'Tool Catalog',
      excerpt: 'Inserted from the real tool catalog.',
    },
  );
};

export const resolveFlowOutput = (document: SkillDocument, outputId: string) => {
  for (const node of document.nodes) {
    const output = node.flowOutputs.find((item) => item.id === outputId);
    if (output) {
      return { node, output };
    }
  }
  return null;
};

export const createEdgeFromPorts = (document: SkillDocument, sourceOutputId: string, targetNodeId: string): SkillEdge | null => {
  const source = resolveFlowOutput(document, sourceOutputId);
  const target = document.nodes.find((node) => node.id === targetNodeId);
  if (!source || !target) {
    return null;
  }
  if (source.node.id === target.id) {
    return null;
  }
  if (isStartNode(target)) {
    return null;
  }
  if (source.node.cardType === 'success' || source.node.cardType === 'failure') {
    return null;
  }

  const duplicate = document.edges.find(
    (edge) => edge.fromOutputId === source.output.id && edge.toNodeId === target.id,
  );
  if (duplicate) {
    return null;
  }

  return {
    id: uuidv4(),
    fromNodeId: source.node.id,
    fromOutputId: source.output.id,
    toNodeId: target.id,
    kind: 'workflow',
    label: source.output.label === 'next' ? undefined : source.output.label,
    style: {
      stroke: '#f59e0b',
      animated: true,
    },
  };
};

export const validateDocument = (document: SkillDocument) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const startNodes = document.nodes.filter((node) => isStartNode(node));

  if (startNodes.length !== 1) {
    errors.push('Workflow must contain exactly one start step.');
  }

  document.nodes.forEach((node) => {
    if (!node.title.trim()) {
      errors.push(`Step ${node.id} is missing a title.`);
    }

    const outbound = document.edges.filter((edge) => edge.fromNodeId === node.id);
    const inbound = document.edges.filter((edge) => edge.toNodeId === node.id);
    if (isStartNode(node)) {
      if (inbound.length > 0) {
        errors.push('Start step cannot have incoming workflow links.');
      }
      if (document.nodes.length > 1 && outbound.length === 0) {
        warnings.push('Start step is not linked to any workflow step.');
      }
      return;
    }
    if ((node.cardType === 'success' || node.cardType === 'failure') && outbound.length > 0) {
      errors.push(`Terminal step "${node.title}" cannot have outgoing workflow links.`);
    }
    if (node.cardType !== 'success' && node.cardType !== 'failure' && outbound.length === 0) {
      warnings.push(`Step "${node.title}" has no outgoing workflow path.`);
    }
    if (node.cardType === 'action') {
      const toolName = typeof node.properties.tool_name === 'string' ? node.properties.tool_name.trim() : '';
      if (!toolName) {
        warnings.push(`Action step "${node.title}" is not bound to a real tool yet.`);
      }
    }
  });

  document.edges.forEach((edge) => {
    const source = resolveFlowOutput(document, edge.fromOutputId);
    const target = document.nodes.find((node) => node.id === edge.toNodeId);
    if (!source || !target) {
      errors.push(`Workflow link ${edge.id} points to a missing step or output.`);
    }
  });

  return { errors, warnings };
};

export const autoLayoutDocument = (document: SkillDocument): SkillDocument => {
  if (document.nodes.length <= 1) {
    return {
      ...document,
      updatedAt: new Date().toISOString(),
    };
  }

  const horizontalGap = 160;
  const verticalGap = 88;
  const baseX = 96;
  const baseY = 88;

  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const startNode = getStartNode(document);
  const incomingCount = new Map(document.nodes.map((node) => [node.id, 0]));
  const childrenByNode = new Map<string, string[]>();
  const parentsByNode = new Map<string, string[]>();

  for (const node of document.nodes) {
    childrenByNode.set(node.id, []);
    parentsByNode.set(node.id, []);
  }

  for (const edge of document.edges) {
    childrenByNode.get(edge.fromNodeId)?.push(edge.toNodeId);
    parentsByNode.get(edge.toNodeId)?.push(edge.fromNodeId);
    incomingCount.set(edge.toNodeId, (incomingCount.get(edge.toNodeId) ?? 0) + 1);
  }

  const roots = startNode
    ? [startNode]
    : document.nodes
        .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
        .sort((left, right) => left.position.x - right.position.x || left.position.y - right.position.y);

  const queue = [...roots.map((node) => node.id)];
  const depthByNode = new Map<string, number>(roots.map((node) => [node.id, 0]));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentDepth = depthByNode.get(nodeId) ?? 0;
    for (const childId of childrenByNode.get(nodeId) ?? []) {
      const nextDepth = currentDepth + 1;
      const existingDepth = depthByNode.get(childId);
      if (existingDepth === undefined || nextDepth > existingDepth) {
        depthByNode.set(childId, nextDepth);
      }
      queue.push(childId);
    }
  }

  for (const node of document.nodes) {
    if (!depthByNode.has(node.id)) {
      depthByNode.set(node.id, startNode && !isStartNode(node) ? 1 : 0);
    }
  }

  const levels = new Map<number, string[]>();
  for (const node of document.nodes) {
    const depth = depthByNode.get(node.id) ?? 0;
    const level = levels.get(depth) ?? [];
    level.push(node.id);
    levels.set(depth, level);
  }

  const orderIndex = new Map<string, number>();
  const sortedDepths = [...levels.keys()].sort((a, b) => a - b);

  for (const depth of sortedDepths) {
    const level = levels.get(depth) ?? [];
    level.sort((leftId, rightId) => {
      if (depth === 0) {
        const left = byId.get(leftId)!;
        const right = byId.get(rightId)!;
        return left.position.y - right.position.y || left.position.x - right.position.x;
      }

      const leftParents = parentsByNode.get(leftId) ?? [];
      const rightParents = parentsByNode.get(rightId) ?? [];
      const leftAvg =
        leftParents.length > 0
          ? leftParents.reduce((sum, parentId) => sum + (orderIndex.get(parentId) ?? 0), 0) / leftParents.length
          : Number.MAX_SAFE_INTEGER;
      const rightAvg =
        rightParents.length > 0
          ? rightParents.reduce((sum, parentId) => sum + (orderIndex.get(parentId) ?? 0), 0) / rightParents.length
          : Number.MAX_SAFE_INTEGER;
      if (leftAvg !== rightAvg) {
        return leftAvg - rightAvg;
      }
      const left = byId.get(leftId)!;
      const right = byId.get(rightId)!;
      return left.position.y - right.position.y || left.position.x - right.position.x;
    });

    for (let index = 0; index < level.length; index += 1) {
      orderIndex.set(level[index], index);
    }
  }

  const maxNodeWidth = Math.max(...document.nodes.map((node) => node.size.w));
  const columnWidth = maxNodeWidth + horizontalGap;
  const levelHeights = new Map<number, number>();

  for (const depth of sortedDepths) {
    const level = levels.get(depth) ?? [];
    const totalHeight = level.reduce((sum, nodeId) => sum + (byId.get(nodeId)?.size.h ?? 220), 0) + Math.max(0, level.length - 1) * verticalGap;
    levelHeights.set(depth, totalHeight);
  }

  const maxColumnHeight = Math.max(...[...levelHeights.values()]);
  const positionedById = new Map<string, SkillNode>();

  for (const depth of sortedDepths) {
    const level = levels.get(depth) ?? [];
    const levelHeight = levelHeights.get(depth) ?? 0;
    let currentY = baseY + (maxColumnHeight - levelHeight) / 2;

    for (const nodeId of level) {
      const node = byId.get(nodeId);
      if (!node) {
        continue;
      }
      positionedById.set(nodeId, {
        ...node,
        position: {
          x: baseX + depth * columnWidth,
          y: currentY,
        },
      });
      currentY += node.size.h + verticalGap;
    }
  }

  if (startNode) {
    const positionedStart = positionedById.get(startNode.id);
    const startChildren = childrenByNode.get(startNode.id) ?? [];
    if (positionedStart && startChildren.length > 0) {
      const childCenters = startChildren
        .map((childId) => positionedById.get(childId))
        .filter((node): node is SkillNode => Boolean(node))
        .map((node) => node.position.y + node.size.h / 2);

      if (childCenters.length > 0) {
        positionedById.set(startNode.id, {
          ...positionedStart,
          position: {
            x: baseX,
            y: Math.max(baseY, childCenters.reduce((sum, value) => sum + value, 0) / childCenters.length - positionedStart.size.h / 2),
          },
        });
      }
    }
  }

  const nextNodes = document.nodes.map((node) => positionedById.get(node.id) ?? node);

  return {
    ...document,
    nodes: nextNodes,
    updatedAt: new Date().toISOString(),
  };
};

export const getExecutionOrder = (document: SkillDocument) => {
  const inboundTargets = new Set(document.edges.map((edge) => edge.toNodeId));
  const start = document.nodes.find((node) => !inboundTargets.has(node.id)) ?? document.nodes[0];
  if (!start) {
    return [];
  }

  const visited = new Set<string>();
  const queue = [start.id];
  const order: SkillNode[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    const node = document.nodes.find((item) => item.id === nodeId);
    if (!node) {
      continue;
    }
    if (!isStartNode(node)) {
      order.push(node);
    }
    queue.push(...document.edges.filter((edge) => edge.fromNodeId === node.id).map((edge) => edge.toNodeId));
  }

  return order;
};

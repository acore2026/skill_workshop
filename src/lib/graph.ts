import { v4 as uuidv4 } from 'uuid';
import type { CardType, DataPort, NextActionPort, SbiAction, SkillDocument, SkillEdge, SkillNode } from '../schemas/skill.ts';

export interface CardTemplate {
  id: string;
  cardType: CardType;
  title: string;
  summary: string;
  badge: string;
  tint: string;
  inputs: Array<Omit<DataPort, 'id' | 'nodeId'>>;
  outputs: Array<Omit<DataPort, 'id' | 'nodeId'>>;
  nextActions: Array<Omit<NextActionPort, 'id' | 'nodeId'>>;
  sbi?: SbiAction;
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
    inputs?: Array<Omit<DataPort, 'id' | 'nodeId'>>;
    outputs?: Array<Omit<DataPort, 'id' | 'nodeId'>>;
    nextActions?: Array<Omit<NextActionPort, 'id' | 'nodeId'>>;
    sbi?: SbiAction;
    position: { x: number; y: number };
  }>;
  edges: Array<
    | {
        type: 'data';
        from: { card: string; port: string };
        to: { card: string; port: string };
        label?: string;
      }
    | {
        type: 'next_action';
        from: { card: string; port: string };
        to: { card: string; port: string };
        label?: string;
      }
  >;
}

type DataPortDirection = 'input' | 'output';

const createDataPort = (
  nodeId: string,
  direction: DataPortDirection,
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

export const CARD_LIBRARY: CardTemplate[] = [
  {
    id: 'action',
    cardType: 'action',
    title: 'Nacrf Skill Discovery',
    summary: 'Executes an SBI interface call against the capability repository.',
    badge: 'Action',
    tint: '#dbeafe',
    inputs: [
      { direction: 'input', name: 'intent', dataType: 'text', required: true },
      { direction: 'input', name: 'domain', dataType: 'string', required: false, defaultValue: 'network' },
      { direction: 'input', name: 'constraints', dataType: 'json', required: false },
    ],
    outputs: [
      { direction: 'output', name: 'intent', dataType: 'text', required: false },
      { direction: 'output', name: 'options', dataType: 'json', required: false },
      { direction: 'output', name: 'skill_uri', dataType: 'skill', required: false },
      { direction: 'output', name: 'match_score', dataType: 'number', required: false },
      { direction: 'output', name: 'service_directive', dataType: 'directive', required: false },
    ],
    nextActions: [{ label: 'next', mode: 'inout' }],
    sbi: {
      service: 'Nacrf_SkillDiscovery',
      operation: 'DiscoverSkill',
      method: 'POST',
      endpoint: '/skill-discovery/v1/query',
    },
    properties: { operation: 'semantic_discovery' },
  },
  {
    id: 'branch',
    cardType: 'branch',
    title: 'Capability Decision',
    summary: 'Chooses the next route based on confidence or capability match.',
    badge: 'Branch',
    tint: '#fef3c7',
    inputs: [
      { direction: 'input', name: 'skill', dataType: 'skill', required: true },
      { direction: 'input', name: 'match_score', dataType: 'number', required: false },
    ],
    outputs: [{ direction: 'output', name: 'decision', dataType: 'decision', required: false }],
    nextActions: [
      { label: 'match', mode: 'inout' },
      { label: 'fallback', mode: 'inout' },
    ],
    properties: { threshold: 0.8 },
  },
  {
    id: 'loop',
    cardType: 'loop',
    title: 'Refinement Loop',
    summary: 'Repeats negotiation until constraints are satisfied.',
    badge: 'Loop',
    tint: '#e0e7ff',
    inputs: [
      { direction: 'input', name: 'options', dataType: 'json', required: false },
      { direction: 'input', name: 'policy', dataType: 'json', required: false },
    ],
    outputs: [
      { direction: 'output', name: 'refined', dataType: 'json', required: false },
      { direction: 'output', name: 'skill_uri', dataType: 'skill', required: false },
    ],
    nextActions: [
      { label: 'repeat', mode: 'inout' },
      { label: 'done', mode: 'inout' },
    ],
    properties: { maxIterations: 3 },
  },
  {
    id: 'parallel',
    cardType: 'parallel',
    title: 'Domain Fan-Out',
    summary: 'Runs discovery across UE, NF, and AF domains.',
    badge: 'Parallel',
    tint: '#dcfce7',
    inputs: [
      { direction: 'input', name: 'capability', dataType: 'capability', required: true },
      { direction: 'input', name: 'slice', dataType: 'string', required: false },
    ],
    outputs: [
      { direction: 'output', name: 'ue_match', dataType: 'json', required: false },
      { direction: 'output', name: 'nf_match', dataType: 'json', required: false },
      { direction: 'output', name: 'af_match', dataType: 'json', required: false },
      { direction: 'output', name: 'matches', dataType: 'json', required: false },
    ],
    nextActions: [
      { label: 'ue lane', mode: 'inout' },
      { label: 'nf lane', mode: 'inout' },
      { label: 'af lane', mode: 'inout' },
      { label: 'join', mode: 'inout' },
    ],
    properties: { mode: 'best-effort' },
  },
  {
    id: 'success',
    cardType: 'success',
    title: 'Success',
    summary: 'Terminal success state for the current skill path.',
    badge: 'Success',
    tint: '#dcfce7',
    inputs: [],
    outputs: [],
    nextActions: [{ label: 'complete', mode: 'target' }],
    properties: { outcome: 'success' },
  },
  {
    id: 'failure',
    cardType: 'failure',
    title: 'Failure',
    summary: 'Terminal failure state for the current skill path.',
    badge: 'Failure',
    tint: '#fee2e2',
    inputs: [],
    outputs: [],
    nextActions: [{ label: 'halt', mode: 'target' }],
    properties: { outcome: 'failure' },
  },
  {
    id: 'constant',
    cardType: 'constant',
    title: 'Constant',
    summary: 'Provide an inline literal value for downstream skill inputs.',
    badge: 'Constant',
    tint: '#fae8ff',
    inputs: [],
    outputs: [{ direction: 'output', name: 'attribute_1', dataType: 'string', required: false, defaultValue: 'sample' }],
    nextActions: [],
    properties: { attribute_1: 'sample' },
  },
  {
    id: 'user_container',
    cardType: 'user_container',
    title: 'User Container',
    summary: 'Expose subscriber and session identity values as a single data object.',
    badge: 'User',
    tint: '#e0f2fe',
    inputs: [],
    outputs: [
      { direction: 'output', name: 'SUPI', dataType: 'string', required: false },
      { direction: 'output', name: 'PDU Session ID', dataType: 'number', required: false },
      { direction: 'output', name: 'DNN', dataType: 'string', required: false },
      { direction: 'output', name: 'S-NSSAI', dataType: 'string', required: false },
      { direction: 'output', name: 'GPSI', dataType: 'string', required: false },
    ],
    nextActions: [],
    properties: {
      SUPI: 'imsi-001010123456789',
      'PDU Session ID': 10,
      DNN: 'internet',
      'S-NSSAI': '1-010203',
      GPSI: 'msisdn-8613712345678',
    },
  },
  {
    id: 'device_container',
    cardType: 'device_container',
    title: 'Device Container',
    summary: 'Expose UE mobility, compute, and capability context as a single value.',
    badge: 'Device',
    tint: '#ede9fe',
    inputs: [],
    outputs: [
      { direction: 'output', name: 'Mobility State', dataType: 'string', required: false },
      { direction: 'output', name: 'Compute Resource Type', dataType: 'string', required: false },
      { direction: 'output', name: 'UE Service Capabilities', dataType: 'string', required: false },
      { direction: 'output', name: '3GPP Service Role', dataType: 'string', required: false },
    ],
    nextActions: [],
    properties: {
      'Mobility State': 'stationary',
      'Compute Resource Type': 'edge-assisted',
      'UE Service Capabilities': 'voice,data,sensing',
      '3GPP Service Role': 'consumer',
    },
  },
  {
    id: 'network_container',
    cardType: 'network_container',
    title: 'Network Container',
    summary: 'Expose service-area and network capability context as a single value.',
    badge: 'Network',
    tint: '#dcfce7',
    inputs: [],
    outputs: [
      { direction: 'output', name: 'Service Area', dataType: 'string', required: false },
      { direction: 'output', name: 'NF Load Status', dataType: 'string', required: false },
      { direction: 'output', name: 'Supported Protocols', dataType: 'string', required: false },
    ],
    nextActions: [],
    properties: {
      'Service Area': 'shanghai-core',
      'NF Load Status': 'nominal',
      'Supported Protocols': 'HTTP2,QUIC',
    },
  },
  {
    id: 'app_container',
    cardType: 'app_container',
    title: 'App Container',
    summary: 'Expose application intent constraints as a single value.',
    badge: 'App',
    tint: '#ffe4e6',
    inputs: [],
    outputs: [
      { direction: 'output', name: 'App Service Category', dataType: 'string', required: false },
      { direction: 'output', name: 'Min Bandwidth Req', dataType: 'string', required: false },
    ],
    nextActions: [],
    properties: {
      'App Service Category': 'immersive-media',
      'Min Bandwidth Req': '25Mbps',
    },
  },
];

export const CASE_LIBRARY: CaseTemplate[] = [
  {
    id: 'three-stage-pipeline',
    title: 'Gaming Turbo Mode',
    summary: 'Create QoS, charging, and policy updates for a gaming turbo-mode request.',
    excerpt:
      'Enable Turbo Mode for Gaming drives a compact AF, charging, and policy authorization flow for a latency-sensitive session.',
    tags: ['gaming', 'qos', 'policy'],
    cards: [
      {
        key: 'afsession',
        templateId: 'action',
        title: 'AFSessionWithQosCreate',
        summary: 'Create an application session with required QoS for gaming traffic.',
        properties: {
          afAppId: 'cloud-gaming',
          dnn: 'internet',
          snssai: '1-010203',
          qosReference: 'GBR',
          notificationUri: 'https://af.example.com/callbacks/qos',
        },
        inputs: [
          { direction: 'input', name: 'afAppId', dataType: 'string', required: true, defaultValue: 'cloud-gaming' },
          { direction: 'input', name: 'dnn', dataType: 'string', required: false, defaultValue: 'internet' },
          { direction: 'input', name: 'snssai', dataType: 'string', required: false, defaultValue: '1-010203' },
          { direction: 'input', name: 'qosReference', dataType: 'string', required: false, defaultValue: 'GBR' },
          { direction: 'input', name: 'notificationUri', dataType: 'string', required: false, defaultValue: 'https://af.example.com/callbacks/qos' },
        ],
        outputs: [
          { direction: 'output', name: 'appSessionId', dataType: 'string', required: false },
          { direction: 'output', name: 'qosDecision', dataType: 'json', required: false },
        ],
        sbi: {
          service: 'Npcf_PolicyAuthorization',
          operation: 'AFSessionWithQosCreate',
          method: 'POST',
          endpoint: '/npcf-policyauthorization/v1/app-sessions',
        },
        position: { x: 160, y: 180 },
      },
      {
        key: 'chargeable',
        templateId: 'action',
        title: 'ChargeablePartyCreate',
        summary: 'Create a sponsored charging transaction for the boosted gaming flow.',
        properties: {
          dnn: 'internet',
          snssai: '1-010203',
          sponsorInformation: 'game-pass-premium',
          sponsoringStatus: 'enabled',
          notificationDestination: 'https://af.example.com/callbacks/charging',
        },
        inputs: [
          { direction: 'input', name: 'dnn', dataType: 'string', required: false, defaultValue: 'internet' },
          { direction: 'input', name: 'snssai', dataType: 'string', required: false, defaultValue: '1-010203' },
          { direction: 'input', name: 'sponsorInformation', dataType: 'string', required: false, defaultValue: 'game-pass-premium' },
          { direction: 'input', name: 'sponsoringStatus', dataType: 'string', required: false, defaultValue: 'enabled' },
          { direction: 'input', name: 'notificationDestination', dataType: 'string', required: false, defaultValue: 'https://af.example.com/callbacks/charging' },
        ],
        outputs: [
          { direction: 'output', name: 'transactionId', dataType: 'string', required: false },
          { direction: 'output', name: 'chargeableParty', dataType: 'json', required: false },
        ],
        sbi: {
          service: 'ChargeableParty',
          operation: 'ChargeablePartyCreate',
          method: 'POST',
          endpoint: '/3gpp-chargeable-party/v1/{scsAsId}/transactions',
        },
        position: { x: 500, y: 120 },
      },
      {
        key: 'policy',
        templateId: 'action',
        title: 'PolicyAuthorizationUpdate',
        summary: 'Update the policy authorization session with gaming QoS refinements.',
        properties: {
          qosReference: 'GBR',
          altSerReqs: 'LOW_LATENCY,HIGH_THROUGHPUT',
          disUeNotif: true,
          maxSuppBwDl: '150 Mbps',
          maxSuppBwUl: '50 Mbps',
        },
        inputs: [
          { direction: 'input', name: 'appSessionId', dataType: 'string', required: true },
          { direction: 'input', name: 'qosReference', dataType: 'string', required: false, defaultValue: 'GBR' },
          { direction: 'input', name: 'altSerReqs', dataType: 'string', required: false, defaultValue: 'LOW_LATENCY,HIGH_THROUGHPUT' },
          { direction: 'input', name: 'disUeNotif', dataType: 'boolean', required: false, defaultValue: true },
          { direction: 'input', name: 'maxSuppBwDl', dataType: 'string', required: false, defaultValue: '150 Mbps' },
        ],
        outputs: [
          { direction: 'output', name: 'policyPatchResult', dataType: 'json', required: false },
          { direction: 'output', name: 'serviceDirective', dataType: 'directive', required: false },
        ],
        sbi: {
          service: 'Npcf_PolicyAuthorization',
          operation: 'PolicyAuthorizationUpdate',
          method: 'PATCH',
          endpoint: '/npcf-policyauthorization/v1/app-sessions/{appSessionId}',
        },
        position: { x: 500, y: 300 },
      },
      { key: 'result', templateId: 'success', title: 'Turbo Mode Enabled', summary: 'Gaming boost policy is active and sponsor charging is attached.', position: { x: 860, y: 210 } },
    ],
    edges: [
      { type: 'data', from: { card: 'afsession', port: 'appSessionId' }, to: { card: 'policy', port: 'appSessionId' }, label: 'session id' },
      { type: 'next_action', from: { card: 'afsession', port: 'next' }, to: { card: 'chargeable', port: 'next' } },
      { type: 'next_action', from: { card: 'chargeable', port: 'next' }, to: { card: 'policy', port: 'next' } },
      { type: 'next_action', from: { card: 'policy', port: 'next' }, to: { card: 'result', port: 'complete' } },
    ],
  },
  {
    id: 'a2ui-negotiation',
    title: 'A2UI Negotiation and Refinement',
    summary: 'Refine ambiguous intents through A2UI before selecting a skill.',
    excerpt:
      'The document positions A2UI as a declarative broker that refines ambiguous intents before they enter the deterministic stages.',
    tags: ['a2ui', 'negotiation', 'loop'],
    cards: [
      { key: 'capture', templateId: 'action', title: 'Capture Ambiguous Intent', summary: 'Receive a natural-language objective from the application or user.', position: { x: 120, y: 160 } },
      { key: 'loop', templateId: 'loop', title: 'A2UI Negotiation', summary: 'Exchange structured skill options until the intent is constrained.', position: { x: 420, y: 130 } },
      { key: 'select', templateId: 'action', title: 'Select Skill', summary: 'Choose the best skill after refinement.', position: { x: 760, y: 90 } },
      { key: 'reject', templateId: 'failure', title: 'Negotiation Failed', summary: 'Could not converge on a safe directive.', position: { x: 760, y: 290 } },
      { key: 'accept', templateId: 'success', title: 'Negotiation Complete', summary: 'Constraints are stable and ready for directive generation.', position: { x: 1070, y: 90 } },
    ],
    edges: [
      { type: 'data', from: { card: 'capture', port: 'options' }, to: { card: 'loop', port: 'options' }, label: 'intent options' },
      { type: 'data', from: { card: 'loop', port: 'refined' }, to: { card: 'select', port: 'intent' }, label: 'refined intent' },
      { type: 'next_action', from: { card: 'capture', port: 'next' }, to: { card: 'loop', port: 'repeat' } },
      { type: 'next_action', from: { card: 'loop', port: 'repeat' }, to: { card: 'loop', port: 'repeat' }, label: 'ask again' },
      { type: 'next_action', from: { card: 'loop', port: 'done' }, to: { card: 'select', port: 'next' } },
      { type: 'next_action', from: { card: 'select', port: 'next' }, to: { card: 'accept', port: 'complete' } },
      { type: 'next_action', from: { card: 'loop', port: 'repeat' }, to: { card: 'reject', port: 'halt' }, label: 'give up' },
    ],
  },
  {
    id: 'multi-domain-discovery',
    title: 'Multi-Domain Semantic Discovery',
    summary: 'Discover skills across UE, NF, and AF domains with fallback.',
    excerpt:
      'The architecture supports heterogeneous UE, NF, and AF entities exposing capabilities through a unified agentic skill profile.',
    tags: ['ue', 'nf', 'af', 'parallel'],
    cards: [
      { key: 'request', templateId: 'action', title: 'Discovery Request', summary: 'Start capability-based discovery instead of identity-based routing.', position: { x: 110, y: 200 } },
      { key: 'fanout', templateId: 'parallel', title: 'Search Domains', summary: 'Query UE, NF, and AF domains in parallel.', position: { x: 410, y: 140 } },
      { key: 'decide', templateId: 'branch', title: 'Capability Match?', summary: 'Branch based on semantic match confidence.', position: { x: 820, y: 200 } },
      { key: 'success', templateId: 'success', title: 'Skill Resolved', summary: 'A skill endpoint is available for execution.', position: { x: 1160, y: 130 } },
      { key: 'failure', templateId: 'failure', title: 'Fallback Route', summary: 'No trusted match was found.', position: { x: 1160, y: 300 } },
    ],
    edges: [
      { type: 'data', from: { card: 'request', port: 'options' }, to: { card: 'fanout', port: 'capability' }, label: 'requested capability' },
      { type: 'data', from: { card: 'fanout', port: 'matches' }, to: { card: 'decide', port: 'skill' }, label: 'candidate skills' },
      { type: 'next_action', from: { card: 'request', port: 'next' }, to: { card: 'fanout', port: 'ue lane' } },
      { type: 'next_action', from: { card: 'fanout', port: 'join' }, to: { card: 'decide', port: 'match' } },
      { type: 'next_action', from: { card: 'decide', port: 'match' }, to: { card: 'success', port: 'complete' } },
      { type: 'next_action', from: { card: 'decide', port: 'fallback' }, to: { card: 'failure', port: 'halt' } },
    ],
  },
];

export const getTemplateById = (templateId: string) => CARD_LIBRARY.find((item) => item.id === templateId);
export const getCaseById = (caseId: string) => CASE_LIBRARY.find((item) => item.id === caseId);

export const createCardFromTemplate = (
  template: CardTemplate,
  position: { x: number; y: number },
  overrides?: Partial<Pick<SkillNode, 'title' | 'summary' | 'properties' | 'sbi'>> & {
    inputs?: CardTemplate['inputs'];
    outputs?: CardTemplate['outputs'];
    nextActions?: CardTemplate['nextActions'];
  },
  sourceCase?: SkillNode['sourceCase'],
): SkillNode => {
  const nodeId = uuidv4();

  return {
    id: nodeId,
    cardType: template.cardType,
    title: overrides?.title ?? template.title,
    summary: overrides?.summary ?? template.summary,
    position,
    size: { w: 320, h: 220 },
    inputs: (overrides?.inputs ?? template.inputs).map((port) =>
      createDataPort(nodeId, 'input', port.name, port.dataType, port.required, port.defaultValue),
    ),
    outputs: (overrides?.outputs ?? template.outputs).map((port) =>
      createDataPort(nodeId, 'output', port.name, port.dataType, port.required, port.defaultValue),
    ),
    nextActions: (overrides?.nextActions ?? template.nextActions).map((port) => createNextActionPort(nodeId, port.label, port.mode)),
    sbi: overrides?.sbi ?? template.sbi,
    properties: overrides?.properties ?? template.properties,
    sourceCase:
      sourceCase ?? {
        caseId: 'manual',
        title: 'Manual Card',
        excerpt: 'Inserted from the constrained card palette.',
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

const findDataPort = (node: SkillNode, portName: string, direction: DataPortDirection) =>
  [...(direction === 'input' ? node.inputs : node.outputs)].find((port) => port.name.toLowerCase() === portName.toLowerCase());

const findNextActionPort = (node: SkillNode, label: string) =>
  node.nextActions.find((port) => port.label.toLowerCase() === label.toLowerCase());

const createCaseEdge = (
  edge: CaseTemplate['edges'][number],
  cardsByKey: Record<string, SkillNode>,
): SkillEdge => {
  const sourceCard = cardsByKey[edge.from.card];
  const targetCard = cardsByKey[edge.to.card];
  if (!sourceCard || !targetCard) {
    throw new Error(`Case edge points at a missing card: ${edge.from.card} -> ${edge.to.card}`);
  }

  if (edge.type === 'data') {
    const sourcePort = findDataPort(sourceCard, edge.from.port, 'output');
    const targetPort = findDataPort(targetCard, edge.to.port, 'input');
    if (!sourcePort || !targetPort) {
      throw new Error(`Case edge points at a missing data port: ${edge.from.port} -> ${edge.to.port}`);
    }

    return {
      id: uuidv4(),
      fromNodeId: sourceCard.id,
      fromPortId: sourcePort.id,
      toNodeId: targetCard.id,
      toPortId: targetPort.id,
      edgeType: 'data',
      label: edge.label,
      style: {
        stroke: '#2563eb',
        animated: false,
      },
    };
  }

  const sourcePort = findNextActionPort(sourceCard, edge.from.port);
  const targetPort = findNextActionPort(targetCard, edge.to.port);
  if (!sourcePort || !targetPort) {
    throw new Error(`Case edge points at a missing next-action port: ${edge.from.port} -> ${edge.to.port}`);
  }

  return {
    id: uuidv4(),
    fromNodeId: sourceCard.id,
    fromPortId: sourcePort.id,
    toNodeId: targetCard.id,
    toPortId: targetPort.id,
    edgeType: 'next_action',
    label: edge.label,
    style: {
      stroke: '#f59e0b',
      animated: true,
    },
  };
};

export const instantiateCase = (caseTemplate: CaseTemplate): SkillDocument => {
  const now = new Date().toISOString();
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
          inputs: card.inputs,
          outputs: card.outputs,
          nextActions: card.nextActions,
          sbi: card.sbi,
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

  const nodes = Object.values(cardsByKey);
  const edges = caseTemplate.edges.map((edge) => createCaseEdge(edge, cardsByKey));

  return {
    id: uuidv4(),
    name: caseTemplate.title,
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
      description: caseTemplate.summary,
      tags: caseTemplate.tags,
      executionMode: 'Action Flow',
      sourceDocument: 'S2-2600222.md',
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
          message: `Loaded S2 case: ${caseTemplate.title}.`,
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
  if (
    normalized.includes('ue') ||
    normalized.includes('nf') ||
    normalized.includes('af') ||
    normalized.includes('parallel') ||
    normalized.includes('domain')
  ) {
    return CASE_LIBRARY[2];
  }
  return CASE_LIBRARY[0];
};

const cloneDocument = (document: SkillDocument): SkillDocument => ({
  ...document,
  nodes: document.nodes.map((node) => ({
    ...node,
    inputs: node.inputs.map((port) => ({ ...port })),
    outputs: node.outputs.map((port) => ({ ...port })),
    nextActions: node.nextActions.map((port) => ({ ...port })),
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
  const inbound = new Set(
    document.edges.filter((edge) => edge.edgeType === 'next_action').map((edge) => edge.toNodeId),
  );
  return document.nodes.find((node) => !inbound.has(node.id));
};

const getLastNonTerminalCard = (document: SkillDocument) =>
  [...document.nodes].reverse().find((node) => node.cardType !== 'success' && node.cardType !== 'failure');

export const applyPromptToDocument = (
  prompt: string,
  currentDocument?: SkillDocument | null,
): { document: SkillDocument; summary: string; caseTemplate: CaseTemplate; mode: 'created' | 'updated' } => {
  const caseTemplate = inferCaseFromPrompt(prompt);

  if (!currentDocument || currentDocument.nodes.length === 0) {
    const document = instantiateCase(caseTemplate);
    document.metadata.description = `Generated from chat prompt: ${prompt}`;
    return {
      document,
      summary: `Generated ${caseTemplate.title} from the S2 skill-based architecture examples.`,
      caseTemplate,
      mode: 'created',
    };
  }

  const incomingCase = instantiateCase(caseTemplate);
  const next = cloneDocument(currentDocument);
  const offset = getAppendOffset(next);

  const shiftedNodes = incomingCase.nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
  }));

  next.nodes = [...next.nodes, ...shiftedNodes];
  next.edges = [...next.edges, ...incomingCase.edges];
  next.metadata.tags = Array.from(new Set([...next.metadata.tags, ...caseTemplate.tags]));
  next.updatedAt = new Date().toISOString();
  next.execution.timeline = [
    ...next.execution.timeline,
    {
      id: uuidv4(),
      level: 'info',
      message: `Appended S2 case "${caseTemplate.title}" from prompt: ${prompt}`,
      timestamp: new Date().toISOString(),
    },
  ];

  const sourceCard = getLastNonTerminalCard(currentDocument);
  const targetCard = getRootActionTarget(incomingCase);
  if (sourceCard && targetCard) {
    const sourcePort = sourceCard.nextActions.find((port) => port.mode === 'inout');
    const targetPort = targetCard.nextActions[0];
    if (sourcePort && targetPort) {
      next.edges.push({
        id: uuidv4(),
        fromNodeId: sourceCard.id,
        fromPortId: sourcePort.id,
        toNodeId: targetCard.id,
        toPortId: targetPort.id,
        edgeType: 'next_action',
        label: 'continue',
        style: {
          stroke: '#f59e0b',
          animated: true,
        },
      });
    }
  }

  return {
    document: next,
    summary: `Appended ${caseTemplate.title} and linked it into the current action flow.`,
    caseTemplate,
    mode: 'updated',
  };
};

export const createStarterDocument = (): SkillDocument => instantiateCase(CASE_LIBRARY[0]);

export const createCardNode = (cardType: CardType, position: { x: number; y: number }) => {
  const template = CARD_LIBRARY.find((item) => item.cardType === cardType);
  if (!template) {
    throw new Error(`Unknown card type ${cardType}`);
  }

  return createCardFromTemplate(template, position);
};

export const resolvePort = (document: SkillDocument, portId: string) => {
  for (const node of document.nodes) {
    const input = node.inputs.find((port) => port.id === portId);
    if (input) {
      return { node, port: input, family: 'input' as const };
    }
    const output = node.outputs.find((port) => port.id === portId);
    if (output) {
      return { node, port: output, family: 'output' as const };
    }
    const next = node.nextActions.find((port) => port.id === portId);
    if (next) {
      return { node, port: next, family: 'next_action' as const };
    }
  }
  return null;
};

export const createEdgeFromPorts = (
  document: SkillDocument,
  sourcePortId: string,
  targetPortId: string,
): SkillEdge | null => {
  const source = resolvePort(document, sourcePortId);
  const target = resolvePort(document, targetPortId);
  if (!source || !target) {
    return null;
  }

  if (source.family === 'output' && target.family === 'input') {
    const duplicate = document.edges.find(
      (edge) =>
        edge.edgeType === 'data' &&
        edge.fromPortId === source.port.id &&
        edge.toPortId === target.port.id,
    );
    if (duplicate) {
      return null;
    }
    return {
      id: uuidv4(),
      fromNodeId: source.node.id,
      fromPortId: source.port.id,
      toNodeId: target.node.id,
      toPortId: target.port.id,
      edgeType: 'data',
      style: {
        stroke: '#2563eb',
        animated: false,
      },
    };
  }

  if (source.family === 'next_action' && target.family === 'next_action') {
    if (source.node.id === target.node.id && source.port.id === target.port.id) {
      return null;
    }
    const duplicate = document.edges.find(
      (edge) =>
        edge.edgeType === 'next_action' &&
        edge.fromPortId === source.port.id &&
        edge.toPortId === target.port.id,
    );
    if (duplicate) {
      return null;
    }
    if (source.node.cardType === 'success' || source.node.cardType === 'failure') {
      return null;
    }
    return {
      id: uuidv4(),
      fromNodeId: source.node.id,
      fromPortId: source.port.id,
      toNodeId: target.node.id,
      toPortId: target.port.id,
      edgeType: 'next_action',
      label: source.port.label !== target.port.label ? source.port.label : undefined,
      style: {
        stroke: '#f59e0b',
        animated: true,
      },
    };
  }

  return null;
};

export const validateDocument = (document: SkillDocument) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dataCardTypes = new Set<CardType>([
    'constant',
    'user_container',
    'device_container',
    'network_container',
    'app_container',
  ]);

  document.nodes.forEach((node) => {
    if (!node.title.trim()) {
      errors.push(`Card ${node.id} is missing a title.`);
    }

    node.inputs.forEach((input) => {
      const inbound = document.edges.find((edge) => edge.toPortId === input.id);
      if (input.required && !inbound && input.defaultValue === undefined) {
        warnings.push(`Card "${node.title}" is missing required input "${input.name}".`);
      }
    });

    const outboundNext = document.edges.filter(
      (edge) =>
        edge.edgeType === 'next_action' &&
        edge.fromNodeId === node.id &&
        node.nextActions.some((port) => port.id === edge.fromPortId),
    );

    if ((node.cardType === 'success' || node.cardType === 'failure') && outboundNext.length > 0) {
      errors.push(`Terminal card "${node.title}" cannot have outgoing next action links.`);
    }

    if (!dataCardTypes.has(node.cardType) && node.cardType !== 'success' && node.cardType !== 'failure' && outboundNext.length === 0) {
      warnings.push(`Card "${node.title}" has no outgoing next action path.`);
    }
  });

  document.edges.forEach((edge) => {
    const source = resolvePort(document, edge.fromPortId);
    const target = resolvePort(document, edge.toPortId);

    if (!source || !target) {
      errors.push(`Link ${edge.id} points to a missing port.`);
      return;
    }

    if (edge.edgeType === 'data') {
      if (source.family !== 'output' || target.family !== 'input') {
        errors.push(`Data link ${edge.id} must connect outputs to inputs.`);
      }
    }

    if (edge.edgeType === 'next_action') {
      if (source.family !== 'next_action' || target.family !== 'next_action') {
        errors.push(`Next action link ${edge.id} must connect next-action ports.`);
      }
    }
  });

  return { errors, warnings };
};

export const autoLayoutDocument = (document: SkillDocument): SkillDocument => {
  const nodes = document.nodes.map((node, index) => ({
    ...node,
    position: {
      x: 120 + (index % 3) * 360,
      y: 120 + Math.floor(index / 3) * 260,
    },
  }));

  return {
    ...document,
    nodes,
    updatedAt: new Date().toISOString(),
  };
};

export const getExecutionOrder = (document: SkillDocument) => {
  const inboundTargets = new Set(
    document.edges.filter((edge) => edge.edgeType === 'next_action').map((edge) => edge.toNodeId),
  );
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
    order.push(node);
    const nextNodeIds = document.edges
      .filter((edge) => edge.edgeType === 'next_action' && edge.fromNodeId === node.id)
      .map((edge) => edge.toNodeId);
    queue.push(...nextNodeIds);
  }

  return order;
};

import type { SkillDocument, SkillNode, SkillEdge } from '../schemas/skill';
import { v4 as uuidv4 } from 'uuid';

export const generateMockDocument = (prompt: string): SkillDocument => {
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  const nodes: SkillNode[] = [
    {
      id: 'node-1',
      type: 'intent',
      label: 'Abstract Intent',
      position: { x: 100, y: 200 },
      config: { prompt },
      inputs: [],
      outputs: ['intent_output'],
    },
    {
      id: 'node-2',
      type: 'discovery',
      label: 'Agentic Capability Repository Function (ACRF)',
      position: { x: 300, y: 200 },
      config: { strategy: 'semantic_matching' },
      inputs: ['intent_output'],
      outputs: ['skill_uri'],
    },
    {
      id: 'node-3',
      type: 'skill',
      label: 'Agentic Skill URI',
      position: { x: 500, y: 200 },
      config: { skillId: 'mcp://skill/generic-process' },
      inputs: ['skill_uri'],
      outputs: ['service_directive'],
    },
    {
      id: 'node-4',
      type: 'directive',
      label: 'Service Directive',
      position: { x: 700, y: 200 },
      config: { directive: 'Nsmf_Generic_Operation' },
      inputs: ['service_directive'],
      outputs: ['final_output'],
    },
    {
      id: 'node-5',
      type: 'execution',
      label: 'AgenticService-URI Execution',
      position: { x: 900, y: 200 },
      config: {},
      inputs: ['final_output'],
      outputs: [],
    },
  ];

  const edges: SkillEdge[] = [
    { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
    { id: 'edge-2-3', source: 'node-2', target: 'node-3' },
    { id: 'edge-3-4', source: 'node-3', target: 'node-4' },
    { id: 'edge-4-5', source: 'node-4', target: 'node-5' },
  ];

  return {
    meta: {
      id,
      title: `Agentic Skill: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`,
      description: `Auto-generated Agentic Skill Profile for: ${prompt}`,
      version: '1.0.0',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    profileHeader: {
      skillId: `mcp://skill/generated-${id.split('-')[0]}`,
      entityType: 'NF',
      serviceClass: 'GOLD',
      agenticServiceUri: `https://network.local/mcp/invoke/${id.split('-')[0]}`,
    },
    domainContainers: {
      device: {},
      network: {
        nfLoadStatus: 45,
        networkLocality: 'Edge-Region-1',
      },
      app: {},
    },
    promptContext: {
      originalPrompt: prompt,
      generationNotes: 'Generated Unified Agentic Skill Profile using default Three-Stage Execution Pipeline template.',
    },
    nodes,
    edges,
    layout: {
      viewport: { x: 0, y: 0, zoom: 1 },
      grouping: [],
    },
    validation: {
      errors: [],
      warnings: [],
      lastValidatedAt: timestamp,
    },
    execution: {
      nodeStatuses: {},
      timeline: [],
    },
  };
};

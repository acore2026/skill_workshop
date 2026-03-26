import { z } from 'zod';

export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['intent', 'discovery', 'skill', 'directive', 'execution']),
  label: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  config: z.record(z.string(), z.any()).default({}),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  ui: z.record(z.string(), z.any()).optional(),
});

export const NodeTypeSchema = z.enum(['intent', 'discovery', 'skill', 'directive', 'execution']);

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  condition: z.string().optional(),
});

export const SkillDocumentSchema = z.object({
  meta: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    version: z.string().default('1.0.0'),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  // Unified Agentic Skill Profile Header
  profileHeader: z.object({
    skillId: z.string().default('mcp://skill/generic'),
    entityType: z.enum(['UE', 'NF', 'AF']).default('NF'),
    serviceClass: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).default('GOLD'),
    agenticServiceUri: z.string().default('https://network.local/mcp/invoke'),
  }).optional(),
  // Polymorphic Domain Containers
  domainContainers: z.object({
    device: z.object({
      energyAvailabilityStatus: z.number().optional(),
      mobilityState: z.string().optional(),
    }).optional(),
    network: z.object({
      networkLocality: z.string().optional(),
      nfLoadStatus: z.number().optional(),
      sNssai: z.string().optional(),
    }).optional(),
    app: z.object({
      appServiceCategory: z.string().optional(),
      minBandwidthReq: z.string().optional(),
      transportLatencyReq: z.number().optional(),
    }).optional(),
  }).optional(),
  promptContext: z.object({
    originalPrompt: z.string(),
    generationNotes: z.string().optional(),
  }).optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  layout: z.object({
    viewport: z.object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    }).optional(),
    grouping: z.array(z.any()).default([]),
  }).optional(),
  validation: z.object({
    errors: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    lastValidatedAt: z.string().optional(),
  }).optional(),
  execution: z.object({
    lastRun: z.string().optional(),
    nodeStatuses: z.record(z.string(), z.enum(['pending', 'running', 'success', 'skipped', 'error'])).default({}),
    timeline: z.array(z.any()).default([]),
  }).optional(),
});

export type SkillNode = z.infer<typeof NodeSchema>;
export type SkillNodeType = z.infer<typeof NodeTypeSchema>;
export type SkillEdge = z.infer<typeof EdgeSchema>;
export type SkillDocument = z.infer<typeof SkillDocumentSchema>;

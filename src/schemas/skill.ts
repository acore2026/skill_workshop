import { z } from 'zod';

export const GraphTypeSchema = z.enum(['action_graph']);
export const CardTypeSchema = z.enum([
  'action',
  'branch',
  'loop',
  'parallel',
  'success',
  'failure',
  'constant',
  'userdata',
]);
export const DataPortDirectionSchema = z.enum(['input', 'output']);
export const NextActionPortModeSchema = z.enum(['inout', 'target']);
export const EdgeTypeSchema = z.enum(['data', 'next_action']);

export const DataPortSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  direction: DataPortDirectionSchema,
  name: z.string(),
  dataType: z.string(),
  required: z.boolean().default(false),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const SbiActionSchema = z.object({
  service: z.string(),
  operation: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  endpoint: z.string(),
});

export const NextActionPortSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  label: z.string(),
  mode: NextActionPortModeSchema.default('inout'),
});

export const CardNodeSchema = z.object({
  id: z.string(),
  cardType: CardTypeSchema,
  title: z.string(),
  summary: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    w: z.number(),
    h: z.number(),
  }),
  inputs: z.array(DataPortSchema).default([]),
  outputs: z.array(DataPortSchema).default([]),
  nextActions: z.array(NextActionPortSchema).default([]),
  sbi: SbiActionSchema.optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
  sourceCase: z.object({
    caseId: z.string(),
    title: z.string(),
    excerpt: z.string(),
  }),
  uiState: z
    .object({
      tint: z.string().optional(),
      badge: z.string().optional(),
    })
    .default({}),
  validationState: z
    .object({
      errors: z.array(z.string()).default([]),
      warnings: z.array(z.string()).default([]),
    })
    .default({
      errors: [],
      warnings: [],
    }),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  fromNodeId: z.string(),
  fromPortId: z.string(),
  toNodeId: z.string(),
  toPortId: z.string(),
  edgeType: EdgeTypeSchema,
  label: z.string().optional(),
  style: z
    .object({
      stroke: z.string().optional(),
      animated: z.boolean().optional(),
    })
    .default({}),
});

export const SkillDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: GraphTypeSchema.default('action_graph'),
  version: z.string().default('1.0.0'),
  nodes: z.array(CardNodeSchema),
  edges: z.array(GraphEdgeSchema),
  viewport: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    zoom: z.number().default(1),
  }),
  metadata: z.object({
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    executionMode: z.string().default('Action Flow'),
    sourceDocument: z.string().default('S2-2600222.md'),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  validation: z.object({
    errors: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    lastValidatedAt: z.string().optional(),
  }),
  execution: z.object({
    lastRun: z.string().optional(),
    nodeStatuses: z
      .record(z.string(), z.enum(['pending', 'running', 'success', 'skipped', 'error']))
      .default({}),
    timeline: z
      .array(
        z.object({
          id: z.string(),
          level: z.enum(['info', 'success', 'warning', 'error']).default('info'),
          message: z.string(),
          nodeId: z.string().optional(),
          timestamp: z.string(),
        }),
      )
      .default([]),
  }),
});

export type GraphType = z.infer<typeof GraphTypeSchema>;
export type CardType = z.infer<typeof CardTypeSchema>;
export type DataPort = z.infer<typeof DataPortSchema>;
export type NextActionPort = z.infer<typeof NextActionPortSchema>;
export type SbiAction = z.infer<typeof SbiActionSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type SkillNode = z.infer<typeof CardNodeSchema>;
export type SkillEdge = z.infer<typeof GraphEdgeSchema>;
export type SkillDocument = z.infer<typeof SkillDocumentSchema>;

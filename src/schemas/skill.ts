import { z } from 'zod';

export const GraphTypeSchema = z.enum(['event_graph', 'function_graph', 'subgraph']);
export const SkillNodeTypeSchema = z.enum([
  'entry',
  'action',
  'branch',
  'pure',
  'parameter',
  'output',
  'subgraph',
  'annotation',
  'reroute',
]);
export const PinDirectionSchema = z.enum(['input', 'output']);
export const PinKindSchema = z.enum(['execution', 'data', 'event', 'trigger', 'reference']);
export const PinMultiplicitySchema = z.enum(['single', 'multiple']);
export const EdgeTypeSchema = z.enum(['execution', 'data', 'event', 'reference']);

export const GraphMetadataSchema = z.object({
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  executionMode: z.string().default('Sequential'),
  authoringMode: z.string().default('Workspace'),
});

export const PinSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  direction: PinDirectionSchema,
  name: z.string(),
  dataType: z.string(),
  pinKind: PinKindSchema,
  multiplicity: PinMultiplicitySchema.default('single'),
  optional: z.boolean().default(false),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  ui: z
    .object({
      accent: z.string().optional(),
      compactLabel: z.boolean().optional(),
    })
    .optional(),
});

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: SkillNodeTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    w: z.number(),
    h: z.number(),
  }),
  inputs: z.array(PinSchema).default([]),
  outputs: z.array(PinSchema).default([]),
  properties: z.record(z.string(), z.unknown()).default({}),
  uiState: z
    .object({
      category: z.string().optional(),
      badge: z.string().optional(),
      tint: z.string().optional(),
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
  fromPinId: z.string(),
  toNodeId: z.string(),
  toPinId: z.string(),
  edgeType: EdgeTypeSchema,
  label: z.string().optional(),
  style: z
    .object({
      stroke: z.string().optional(),
      animated: z.boolean().optional(),
    })
    .default({}),
});

export const GroupRegionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rect: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  style: z
    .object({
      color: z.string().default('#f5f7fb'),
      borderColor: z.string().default('#d9e1f2'),
    })
    .default({
      color: '#f5f7fb',
      borderColor: '#d9e1f2',
    }),
  childNodeIds: z.array(z.string()).default([]),
  collapsed: z.boolean().optional(),
});

export const SkillDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: GraphTypeSchema.default('event_graph'),
  version: z.string().default('1.0.0'),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  groups: z.array(GroupRegionSchema).default([]),
  viewport: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    zoom: z.number().default(1),
  }),
  metadata: GraphMetadataSchema.default({
    description: '',
    tags: [],
    executionMode: 'Sequential',
    authoringMode: 'Workspace',
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
export type SkillNodeType = z.infer<typeof SkillNodeTypeSchema>;
export type PinDirection = z.infer<typeof PinDirectionSchema>;
export type PinKind = z.infer<typeof PinKindSchema>;
export type PinMultiplicity = z.infer<typeof PinMultiplicitySchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type SkillPin = z.infer<typeof PinSchema>;
export type SkillNode = z.infer<typeof GraphNodeSchema>;
export type SkillEdge = z.infer<typeof GraphEdgeSchema>;
export type GroupRegion = z.infer<typeof GroupRegionSchema>;
export type SkillDocument = z.infer<typeof SkillDocumentSchema>;

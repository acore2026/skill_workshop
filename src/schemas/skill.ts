import { z } from 'zod';

export const GraphTypeSchema = z.enum(['workflow_graph']);
export const CardTypeSchema = z.enum([
  'start',
  'action',
  'branch',
  'loop',
  'parallel',
  'success',
  'failure',
]);
export const WorkflowNodeTypeSchema = z.enum(['tool_step', 'control']);
export const WorkflowEdgeKindSchema = z.enum(['workflow']);

export const WorkflowOutputSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  label: z.string(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  nodeType: WorkflowNodeTypeSchema,
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
  flowOutputs: z.array(WorkflowOutputSchema).default([]),
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

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  fromNodeId: z.string(),
  fromOutputId: z.string(),
  toNodeId: z.string(),
  kind: WorkflowEdgeKindSchema.default('workflow'),
  label: z.string().optional(),
  style: z
    .object({
      stroke: z.string().optional(),
      animated: z.boolean().optional(),
    })
    .default({}),
});

export const MarkdownSkillDocumentSchema = z.object({
  frontMatter: z.object({
    name: z.string(),
    description: z.string(),
  }),
  overview: z.string(),
  toolInventory: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
  workflow: z.array(
    z.object({
      call: z.string().optional(),
      abort_if: z.string().optional(),
      done: z.string().optional(),
    }),
  ),
  criticalRules: z.array(z.string()),
  outputFormat: z.array(z.string()),
  raw: z.string(),
});

export const SkillDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: GraphTypeSchema.default('workflow_graph'),
  version: z.string().default('1.0.0'),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  viewport: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    zoom: z.number().default(1),
  }),
  metadata: z.object({
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    executionMode: z.string().default('Workflow'),
    sourceDocument: z.string().default('ACN_SKILL.md'),
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
export type WorkflowNodeType = z.infer<typeof WorkflowNodeTypeSchema>;
export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;
export type WorkflowEdgeKind = z.infer<typeof WorkflowEdgeKindSchema>;
export type SkillNode = z.infer<typeof WorkflowNodeSchema>;
export type SkillEdge = z.infer<typeof WorkflowEdgeSchema>;
export type SkillDocument = z.infer<typeof SkillDocumentSchema>;
export type MarkdownSkillDocument = z.infer<typeof MarkdownSkillDocumentSchema>;

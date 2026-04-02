import { parse } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import type { ToolCatalogEntry } from './api.ts';
import { createEmptyWorkflowDocument, createToolStepNode, getStartNode, isStartNode } from './graph.ts';
import { MarkdownSkillDocumentSchema, type CardType, type MarkdownSkillDocument, type SkillDocument, type SkillEdge, type SkillNode } from '../schemas/skill.ts';

interface WorkflowStep {
  call?: string;
  done?: string;
}

interface WorkflowYaml {
  workflow?: WorkflowStep[];
}

const frontMatterPattern = /^---\n([\s\S]*?)\n---\n?/;
const workflowBlockPattern = /## Workflow\s+```yaml\s*([\s\S]*?)```/i;
const workflowCodeBlockPattern = /## Workflow[\s\S]*?```(?:python|py)?\s*([\s\S]*?)```/i;
const overviewPattern = /## Overview\s+([\s\S]*?)(?=\n##\s)/i;
const toolInventoryPattern = /## Tool Inventory\s+([\s\S]*?)(?=\n##\s)/i;
const criticalRulesPattern = /## Critical Rules\s+([\s\S]*?)(?=\n##\s)/i;
const outputFormatPattern = /## Output Format\s+(?:```[\w-]*\s*([\s\S]*?)```|([\s\S]*?)(?=\n##\s|$))/i;

const createFlowOutput = (nodeId: string, label: string) => ({
  id: `${nodeId}-flow-${label.toLowerCase().replace(/\s+/g, '-')}`,
  nodeId,
  label,
});

const createControlNode = (
  cardType: CardType,
  title: string,
  summary: string,
  position: { x: number; y: number },
  flowLabels: string[],
): SkillNode => {
  const nodeId = uuidv4();
  return {
    id: nodeId,
    nodeType: 'control',
    cardType,
    title,
    summary,
    position,
    size: { w: 320, h: 220 },
    flowOutputs: flowLabels.map((label) => createFlowOutput(nodeId, label)),
    properties: {},
    sourceCase: {
      caseId: 'markdown_import',
      title: 'Markdown Import',
      excerpt: 'Imported from a markdown skill workflow.',
    },
    uiState: {
      badge: cardType,
    },
    validationState: {
      errors: [],
      warnings: [],
    },
  };
};

const connectFlow = (fromNode: SkillNode, fromLabel: string, toNode: SkillNode, label?: string): SkillEdge => {
  const fromOutput = fromNode.flowOutputs.find((output) => output.label === fromLabel) ?? fromNode.flowOutputs[0];
  if (!fromOutput) {
    throw new Error(`Cannot connect workflow nodes: ${fromNode.title} has no "${fromLabel}" output.`);
  }
  return {
    id: uuidv4(),
    fromNodeId: fromNode.id,
    fromOutputId: fromOutput.id,
    toNodeId: toNode.id,
    kind: 'workflow',
    label,
    style: {
      stroke: '#f59e0b',
      animated: true,
    },
  };
};

const negativeFlowLabels = new Set(['abort', 'fail', 'failure', 'fallback', 'stop']);
const positiveFlowLabels = new Set(['begin', 'next', 'continue', 'done', 'match', 'join']);

const indentOf = (level: number) => '    '.repeat(level);

const getOutgoingEdges = (document: SkillDocument, node: SkillNode) =>
  node.flowOutputs.flatMap((output) =>
    document.edges
      .filter((edge) => edge.fromOutputId === output.id)
      .map((edge) => ({ edge, output })),
  );

const isNegativeFlow = (label: string | undefined) => {
  const normalized = (label ?? '').trim().toLowerCase();
  return negativeFlowLabels.has(normalized);
};

const isPositiveFlow = (label: string | undefined) => {
  const normalized = (label ?? '').trim().toLowerCase();
  return positiveFlowLabels.has(normalized);
};

const resolveTargetNode = (document: SkillDocument, edge: SkillEdge) =>
  document.nodes.find((node) => node.id === edge.toNodeId);

const renderWorkflowNode = (
  document: SkillDocument,
  node: SkillNode,
  visited: Set<string>,
  indent = 0,
): string[] => {
  if (visited.has(node.id)) {
    return [];
  }

  const lines: string[] = [];
  const pad = indentOf(indent);
  visited.add(node.id);

  if (isStartNode(node)) {
    const outgoing = getOutgoingEdges(document, node);
    const primaryEdge = outgoing.find((item) => isPositiveFlow(item.output.label) || !isNegativeFlow(item.output.label))?.edge;
    if (!primaryEdge) {
      return [];
    }
    const target = resolveTargetNode(document, primaryEdge);
    return target ? renderWorkflowNode(document, target, visited, indent) : [];
  }

  if (node.cardType === 'success') {
    lines.push(`${pad}OUTPUT "${node.title || 'DONE'}"`);
    return lines;
  }

  if (node.cardType === 'failure') {
    return lines;
  }

  if (node.cardType === 'action') {
    lines.push(`${pad}CALL "${node.title}"`);

    const outgoing = getOutgoingEdges(document, node);
    const primaryEdge = outgoing.find((item) => isPositiveFlow(item.output.label) || !isNegativeFlow(item.output.label))?.edge;
    if (primaryEdge) {
        const target = resolveTargetNode(document, primaryEdge);
        if (target) {
          const nextLines = renderWorkflowNode(document, target, visited, indent);
          if (nextLines.length > 0) {
            lines.push(...nextLines);
          }
      }
    }
    return lines;
  }

  const outgoing = getOutgoingEdges(document, node);
  const primaryEdge = outgoing[0]?.edge;
  if (primaryEdge) {
    const target = resolveTargetNode(document, primaryEdge);
    if (target) {
      lines.push(...renderWorkflowNode(document, target, visited, indent));
    }
  }
  return lines;
};

const parseFrontMatter = (markdown: string) => {
  const match = markdown.match(frontMatterPattern);
  if (!match) {
    return { name: 'Untitled Workflow', description: 'Imported markdown workflow.' };
  }
  const parsed = parse(match[1]) as { name?: string; description?: string };
  return {
    name: parsed?.name?.trim() || 'Untitled Workflow',
    description: parsed?.description?.trim() || 'Imported markdown workflow.',
  };
};

const parseWorkflow = (markdown: string) => {
  const match = markdown.match(workflowBlockPattern);
  if (match) {
    const parsed = parse(match[1]) as WorkflowYaml;
    if (!Array.isArray(parsed?.workflow)) {
      throw new Error('Workflow YAML must define a workflow array.');
    }
    return parsed.workflow;
  }

  const codeMatch = markdown.match(workflowCodeBlockPattern);
  if (!codeMatch) {
    throw new Error('Markdown skill is missing a workflow block.');
  }

  const steps: WorkflowStep[] = [];
  for (const rawLine of codeMatch[1].split('\n')) {
    const line = rawLine.trim();
    const callMatch = line.match(/^CALL\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\(|\s|$)/i);
    if (callMatch) {
      steps.push({ call: (callMatch[1] || callMatch[2]).trim() });
      continue;
    }
    const doneMatch = line.match(/^OUTPUT\s+"([^"]+)"/i);
    if (doneMatch && doneMatch[1].toUpperCase() === 'DONE') {
      steps.push({ done: 'DONE' });
    }
  }
  if (steps.length === 0) {
    throw new Error('Workflow block could not be parsed into executable steps.');
  }
  return steps;
};

export const parseMarkdownSkillDocument = (markdown: string): MarkdownSkillDocument => {
  const frontMatter = parseFrontMatter(markdown);
  const workflow = parseWorkflow(markdown);
  const overview = markdown.match(overviewPattern)?.[1]?.trim() || frontMatter.description;
  const toolInventory = (markdown.match(toolInventoryPattern)?.[1] ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => {
      const match = line.match(/^- `([^`]+)` — (.+)$/);
      return {
        name: match?.[1] ?? line.replace(/^- /, ''),
        description: match?.[2] ?? '',
      };
    });
  const criticalRules = (markdown.match(criticalRulesPattern)?.[1] ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, ''));
  const outputFormatMatch = markdown.match(outputFormatPattern);
  const outputFormat = (outputFormatMatch?.[1] ?? outputFormatMatch?.[2] ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return MarkdownSkillDocumentSchema.parse({
    frontMatter,
    overview,
    toolInventory,
    workflow,
    criticalRules,
    outputFormat,
    raw: markdown,
  });
};

export const skillDocumentToMarkdown = (document: SkillDocument | null) => {
  if (!document) {
    return '';
  }

  const startNode = getStartNode(document);
  const visited = new Set<string>();
  const workflowLines =
    startNode
      ? renderWorkflowNode(document, startNode, visited)
      : [];
  if (!workflowLines.some((line) => line.includes('OUTPUT "DONE"'))) {
    workflowLines.push('OUTPUT "DONE"');
  }

  const toolInventory = document.nodes
    .filter((node) => node.nodeType === 'tool_step' && !isStartNode(node))
    .map((node) => `- \`${node.title}\` — ${node.summary || 'Workflow step.'}`)
    .join('\n');
  const outputFormat = document.nodes
    .filter((node) => node.nodeType === 'tool_step' && !isStartNode(node))
    .map((node) => node.title)
    .concat('DONE')
    .join('\n');

  return `---
name: ${document.name || 'Untitled Workflow'}
description: ${document.metadata.description || 'Process of connecting embodied agents to the network.'}
---
# ${document.name || 'Untitled Workflow'} Skill

## Overview
${document.metadata.description || 'Process of connecting embodied agents to the network.'}

This Skill directs the workflow of a tool chain to achieve the requested outcome. Follow the defined process and preserve the tool order exactly.

## Tool Inventory
${toolInventory}

## Workflow
\`\`\`python
${workflowLines.join('\n')}
\`\`\`

## Critical Rules
- Preserve the workflow order shown in the graph.
- Use only tools and control steps present in the current workflow.
- Keep the workflow linear and free of parameter wiring or conditional branches.

## Output Format
\`\`\`
${outputFormat}
\`\`\`
`;
};

export const markdownSkillToDocument = (markdown: string, toolCatalog: ToolCatalogEntry[]): SkillDocument => {
  const parsedSkill = parseMarkdownSkillDocument(markdown);
  const document = createEmptyWorkflowDocument();
  const startNode = getStartNode(document);
  document.name = parsedSkill.frontMatter.name;
  document.metadata.description = parsedSkill.frontMatter.description;
  document.metadata.sourceDocument = 'ACN_SKILL.md';

  const nodes: SkillNode[] = [];
  const edges: SkillEdge[] = [];
  let currentSource: { node: SkillNode; outputLabel: string } | null = null;
  let y = 140;

  for (const step of parsedSkill.workflow) {
    if (typeof step.call === 'string' && step.call.trim()) {
      const toolName = step.call.trim();
      const tool = toolCatalog.find((entry) => entry.name === toolName);
      const node = tool
        ? createToolStepNode(tool, { x: 180 + nodes.length * 220, y })
        : createControlNode('action', toolName, 'Imported workflow action step.', { x: 180 + nodes.length * 220, y }, ['next']);
      nodes.push(node);
      if (currentSource) {
        edges.push(connectFlow(currentSource.node, currentSource.outputLabel, node));
      } else if (startNode) {
        edges.push(connectFlow(startNode, 'begin', node, 'begin'));
      }
      currentSource = { node, outputLabel: 'next' };
      continue;
    }

    if (typeof step.done === 'string' && step.done.trim() && currentSource) {
      const success = createControlNode('success', step.done.trim(), 'Workflow completed successfully.', { x: 180 + nodes.length * 220, y }, []);
      nodes.push(success);
      edges.push(connectFlow(currentSource.node, currentSource.outputLabel, success));
      currentSource = { node: success, outputLabel: 'complete' };
    }
  }

  document.nodes = startNode ? [startNode, ...nodes] : nodes;
  document.edges = edges;
  document.updatedAt = new Date().toISOString();
  return document;
};

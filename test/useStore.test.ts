import test from 'node:test';
import assert from 'node:assert/strict';
import { useStore } from '../src/store/useStore.ts';
import { markdownSkillToDocument } from '../src/lib/skillMarkdown.ts';
import type { ToolCatalogEntry } from '../src/lib/api.ts';

const toolCatalog: ToolCatalogEntry[] = [
  {
    name: 'Subscription_tool',
    description: 'Validate whether a user or agent has subscribed to a network service capability.',
    required_params: ['ue_id', 'service_type'],
    all_params: ['ue_id', 'service_type'],
    parameters: [
      { name: 'ue_id', type: 'string', required: true },
      { name: 'service_type', type: 'string', required: true },
    ],
  },
];

const markdown = `---
name: ACN
description: Process of connecting embodied agents to the network.
---
# ACN Skill

## Overview
This Skill directs the workflow of a tool chain to connect a new embodied agent into a core network subnet.

## Tool Inventory
- \`Subscription_tool\` — Validate subscription.

## Workflow
\`\`\`python
CALL "Subscription_tool"
OUTPUT "DONE"
\`\`\`

## Critical Rules
- Do not skip validation.

## Output Format
Subscription_tool(ue_id="<ue_id>", service_type="<service_type>")
DONE
`;

const resetStore = () => {
  useStore.setState({
    document: null,
    rawSkillMarkdown: '',
    markdownError: null,
    toolCatalog,
    generationModel: 'qwen3-32b',
    appState: 'idle',
    selectedNodeId: null,
    selectedEdgeId: null,
    sidebarTab: 'outline',
    utilityTab: 'log',
    fitViewVersion: 0,
    messages: [],
  });
};

test('graph edits update the markdown preview immediately', () => {
  resetStore();

  const document = markdownSkillToDocument(markdown, toolCatalog);
  useStore.getState().setDocument(document);

  const actionNode = useStore.getState().document?.nodes.find((node) => node.cardType === 'action');
  assert.ok(actionNode);

  useStore.getState().updateNode(actionNode.id, {
    title: 'Subscription_Check',
    summary: 'Confirm the user can access the requested service.',
    properties: {
      ...actionNode.properties,
      tool_name: 'Subscription_Check',
    },
  });

  const rawSkillMarkdown = useStore.getState().rawSkillMarkdown;
  assert.match(rawSkillMarkdown, /Subscription_Check/);
  assert.match(rawSkillMarkdown, /Confirm the user can access the requested service\./);
});

test('fixed start step cannot be removed', () => {
  resetStore();

  const document = markdownSkillToDocument(markdown, toolCatalog);
  useStore.getState().setDocument(document);

  const startNode = useStore.getState().document?.nodes.find((node) => node.cardType === 'start');
  assert.ok(startNode);

  useStore.getState().removeNode(startNode.id);

  const nextDocument = useStore.getState().document;
  assert.ok(nextDocument?.nodes.some((node) => node.id === startNode.id));
});

test('setDocument auto-aligns the loaded workflow', () => {
  resetStore();

  const document = markdownSkillToDocument(markdown, toolCatalog);
  const startNode = document.nodes.find((node) => node.cardType === 'start');
  const actionNode = document.nodes.find((node) => node.cardType === 'action');
  assert.ok(startNode);
  assert.ok(actionNode);

  startNode.position = { x: 900, y: 900 };
  actionNode.position = { x: 40, y: 40 };

  useStore.getState().setDocument(document);

  const loadedDocument = useStore.getState().document;
  const loadedStartNode = loadedDocument?.nodes.find((node) => node.cardType === 'start');
  const loadedActionNode = loadedDocument?.nodes.find((node) => node.cardType === 'action');
  assert.ok(loadedStartNode);
  assert.ok(loadedActionNode);
  assert.ok(loadedStartNode.position.x < loadedActionNode.position.x);
});

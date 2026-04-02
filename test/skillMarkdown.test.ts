import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markdownSkillToDocument, skillDocumentToMarkdown } from '../src/lib/skillMarkdown.ts';

const toolCatalog = [
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
  {
    name: 'Issue_Access_Token_tool',
    description: 'Generate an access token for a target agent.',
    required_params: ['subnet_id', 'agent_id'],
    all_params: ['subnet_id', 'agent_id'],
    parameters: [
      { name: 'subnet_id', type: 'string', required: true },
      { name: 'agent_id', type: 'string', required: true },
    ],
  },
] as const;

const markdown = `---
name: ACN
description: Process of connecting embodied agents to the network.
---
# ACN Skill

## Overview
This Skill directs the workflow of a tool chain to connect a new embodied agent into a core network subnet.

## Tool Inventory
- \`Subscription_tool\` — Validate subscription.
- \`Issue_Access_Token_tool\` — Issue access token.

## Workflow
\`\`\`python
CALL "Subscription_tool"
CALL "Issue_Access_Token_tool"
OUTPUT "DONE"
\`\`\`

## Critical Rules
- Do not skip validation.

## Output Format
Subscription_tool
Issue_Access_Token_tool
DONE
`;

test('markdownSkillToDocument rebuilds a workflow graph from markdown', () => {
  const document = markdownSkillToDocument(markdown, [...toolCatalog]);

  assert.equal(document.name, 'ACN');
  assert.equal(document.nodes.filter((node) => node.cardType === 'start').length, 1);
  assert.equal(document.nodes.filter((node) => node.cardType === 'action').length, 2);
  assert.ok(document.nodes.some((node) => node.cardType === 'success'));
  assert.ok(document.edges.length >= 3);
  assert.equal(document.metadata.sourceDocument, 'ACN_SKILL.md');
});

test('skillDocumentToMarkdown emits a workflow block and output format', () => {
  const document = markdownSkillToDocument(markdown, [...toolCatalog]);
  const roundTrip = skillDocumentToMarkdown(document);

  assert.match(roundTrip, /## Workflow/);
  assert.match(roundTrip, /```python/);
  assert.match(roundTrip, /Subscription_tool/);
  assert.match(roundTrip, /Issue_Access_Token_tool/);
  assert.doesNotMatch(roundTrip, /IF /);
  assert.doesNotMatch(roundTrip, /ABORT/);
  assert.match(roundTrip, /## Output Format/);
  assert.match(roundTrip, /Subscription_tool\nIssue_Access_Token_tool\nDONE/);
});

test('markdownSkillToDocument imports the canonical ACN example document', () => {
  const acnMarkdown = readFileSync(new URL('../doc/md/ACN_SKILL.md', import.meta.url), 'utf8');
  const document = markdownSkillToDocument(acnMarkdown, [...toolCatalog]);

  assert.equal(document.name, 'ACN');
  assert.ok(document.nodes.some((node) => node.cardType === 'start'));
  assert.ok(document.nodes.some((node) => node.title === 'Subscription_tool'));
  assert.ok(document.nodes.some((node) => node.title === 'DONE'));
  assert.ok(!document.nodes.some((node) => node.title === 'ABORT'));
});

test('markdownSkillToDocument imports writer-style callable workflow lines', () => {
  const writerMarkdown = `---
name: ACN
description: Establish secure network connectivity for embodied agents.
---
# ACN Skill

## Overview
Writer-style workflow output.

## Tool Inventory
- \`Subscription_tool\` — Validate subscription.
- \`Issue_Access_Token_tool\` — Issue access token.

## Workflow
\`\`\`python
CALL Subscription_tool()
CALL Issue_Access_Token_tool()
OUTPUT "DONE"
\`\`\`

## Critical Rules
- Keep the workflow gated.

## Output Format
Subscription_tool
Issue_Access_Token_tool
DONE
`;

  const document = markdownSkillToDocument(writerMarkdown, [...toolCatalog]);

  assert.ok(document.nodes.some((node) => node.cardType === 'action' && node.title === 'Subscription_tool'));
  assert.ok(document.nodes.some((node) => node.cardType === 'action' && node.title === 'Issue_Access_Token_tool'));
  assert.ok(document.nodes.some((node) => node.cardType === 'success'));
  assert.ok(document.edges.length >= 3);
});

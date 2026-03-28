import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAssistantArtifacts, parseSkillYaml, skillDocumentToYaml } from '../src/lib/skillYaml.ts';
import type { SkillDocument } from '../src/schemas/skill.ts';

const sampleDocument = (): SkillDocument =>
  parseSkillYaml(`
metadata:
  name: Demo Skill
  description: Example YAML skill
  tags:
    - demo
  executionMode: Action Flow
cards:
  - id: action-1
    type: action
    title: AFSessionWithQosCreate
    summary: Create AF QoS session
    position:
      x: 120
      y: 160
    sbi:
      service: Npcf_PolicyAuthorization
      operation: AFSessionWithQosCreate
      method: POST
      endpoint: /npcf-policyauthorization/v1/app-sessions
    config:
      afAppId: cloud-gaming
    inputs:
      - name: afAppId
        dataType: string
        required: true
    outputs:
      - name: appSessionId
        dataType: string
    nextActions:
      - label: next
        mode: inout
  - id: data-1
    type: user_container
    title: User Container
    summary: User data
    attributes:
      - key: SUPI
        value: imsi-001010123456789
      - key: PDU Session ID
        value: 10
  - id: success-1
    type: success
    title: Success
    summary: Completed
    nextActions:
      - label: complete
        mode: target
links:
  - id: link-1
    type: data
    from:
      cardId: data-1
      port: SUPI
    to:
      cardId: action-1
      port: afAppId
  - id: link-2
    type: next_action
    from:
      cardId: action-1
      port: next
    to:
      cardId: success-1
      port: complete
`);

test('extractAssistantArtifacts returns display text, yaml block, tool calls, and skill install metadata', () => {
  const artifacts = extractAssistantArtifacts({
    choices: [
      {
        message: {
          content: `Plan ready.\n\n6gcore_skill_generation installed.\n\n\`\`\`yaml\nmetadata:\n  name: Demo\ncards: []\nlinks: []\n\`\`\``,
          tool_calls: [
            {
              function: {
                name: 'update_skill',
                arguments: { source: 'assistant' },
              },
            },
          ],
        },
      },
    ],
  });

  assert.match(artifacts.displayContent, /Plan ready/);
  assert.ok(artifacts.yamlBlock?.includes('metadata:'));
  assert.equal(artifacts.toolCalls[0]?.name, 'update_skill');
  assert.equal(artifacts.skillInstalls[0]?.name, '6gcore_skill_generation');
});

test('parseSkillYaml builds data card attribute handles and terminal cards without data ports', () => {
  const document = sampleDocument();
  const userContainer = document.nodes.find((node) => node.id === 'data-1');
  const successCard = document.nodes.find((node) => node.id === 'success-1');

  assert.ok(userContainer);
  assert.equal(userContainer?.inputs.length, 0);
  assert.equal(userContainer?.outputs.length, 2);
  assert.deepEqual(
    userContainer?.outputs.map((port) => port.name),
    ['SUPI', 'PDU Session ID'],
  );

  assert.ok(successCard);
  assert.equal(successCard?.inputs.length, 0);
  assert.equal(successCard?.outputs.length, 0);
});

test('skillDocumentToYaml preserves attributes and omits data flow for data cards', () => {
  const document = sampleDocument();
  const yaml = skillDocumentToYaml(document);
  const dataCardBlock = yaml.match(/- id: data-1[\s\S]*?(?=\n {2}- id:|\nlinks:)/)?.[0] ?? '';

  assert.match(yaml, /attributes:/);
  assert.match(yaml, /key: SUPI/);
  assert.equal(dataCardBlock.includes('nextActions:'), false);
  assert.equal(dataCardBlock.includes('inputs:'), false);
  assert.equal(dataCardBlock.includes('outputs:'), false);
});

test('YAML round-trip preserves action config and links', () => {
  const document = sampleDocument();
  const roundTrip = parseSkillYaml(skillDocumentToYaml(document));
  const actionCard = roundTrip.nodes.find((node) => node.id === 'action-1');

  assert.equal(roundTrip.edges.length, 2);
  assert.equal(actionCard?.properties.afAppId, 'cloud-gaming');
  assert.equal(actionCard?.nextActions[0]?.label, 'next');
});

test('acceptance scenario: assistant yaml can be extracted and applied into a workspace document', () => {
  const completion = {
    choices: [
      {
        message: {
          content: `Turbo mode ready.\n\n\`\`\`yaml\n${skillDocumentToYaml(sampleDocument())}\n\`\`\``,
        },
      },
    ],
  };

  const artifacts = extractAssistantArtifacts(completion);
  assert.ok(artifacts.yamlBlock);

  const parsed = parseSkillYaml(artifacts.yamlBlock as string);
  assert.equal(parsed.name, 'Demo Skill');
  assert.equal(parsed.nodes.length, 3);
});

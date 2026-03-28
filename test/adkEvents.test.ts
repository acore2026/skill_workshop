import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYamlBlockFromText,
  getADKDisplayText,
  getADKMessageId,
  getADKStage,
  getSkillInstallFromFunctionCall,
  stripYamlBlockFromText,
  summarizeFunctionResponse,
  type ADKSessionEventPayload,
} from '../src/lib/adkEvents.ts';

test('ADK event adapter derives stage, message id, and display text', () => {
  const payload: ADKSessionEventPayload = {
    id: 'evt-1',
    invocation_id: 'inv-1',
    author: 'analysis_agent',
    text: 'Analyze the requested gaming flow.',
  };

  assert.equal(getADKMessageId(payload), 'analysis_agent:inv-1');
  assert.equal(getADKStage(payload), 'analysis');
  assert.equal(getADKDisplayText(payload), 'Analyze the requested gaming flow.');
});

test('ADK function call adapter preserves skill install semantics', () => {
  const skillInstall = getSkillInstallFromFunctionCall({
    name: 'install_skill_package',
    args: {
      name: '6gcore_skill_creater',
      version: 'latest',
    },
  });

  assert.deepEqual(skillInstall, {
    name: '6gcore_skill_creater',
    version: 'latest',
  });
});

test('ADK function response adapter extracts summary', () => {
  assert.equal(
    summarizeFunctionResponse({
      name: 'install_skill_package',
      response: {
        summary: 'Prepared the 6gcore_skill_creater package for agent-guided synthesis.',
      },
    }),
    'Prepared the 6gcore_skill_creater package for agent-guided synthesis.',
  );
});

test('ADK draft adapter extracts and strips YAML from markdown text', () => {
  const content = `Draft ready.\n\n\`\`\`yaml\nmetadata:\n  name: Demo\ncards: []\nlinks: []\n\`\`\``;

  assert.match(extractYamlBlockFromText(content), /metadata:/);
  assert.equal(stripYamlBlockFromText(content), 'Draft ready.');
});

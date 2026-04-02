import { v4 as uuidv4 } from 'uuid';
import { applyPromptToDocument } from './graph.ts';
import type { SkillDocument } from '../schemas/skill.ts';

export interface UpdateSkillOperation {
  type: 'replace_document';
  document: SkillDocument;
}

export interface UpdateSkillToolCall {
  id: string;
  type: 'function';
  function: {
    name: 'update_skill';
    arguments: {
      name: string;
      description: string;
      operations: UpdateSkillOperation[];
    };
  };
}

export interface SkillGeneratorResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      tool_calls: UpdateSkillToolCall[];
    };
    finish_reason: 'tool_calls';
  }>;
}

export const runSkillGenerator = ({
  prompt,
  currentSkill,
}: {
  prompt: string;
  currentSkill?: SkillDocument | null;
}): SkillGeneratorResponse => {
  const result = applyPromptToDocument(prompt, currentSkill);
  const toolCall: UpdateSkillToolCall = {
    id: uuidv4(),
    type: 'function',
    function: {
      name: 'update_skill',
      arguments: {
        name: result.document.name,
        description: result.summary,
        operations: [
          {
            type: 'replace_document',
            document: result.document,
          },
        ],
      },
    },
  };

  return {
    id: uuidv4(),
    object: 'chat.completion',
    created: Date.now(),
    model: 'skill-generator-local-adapter',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `${result.summary} I prepared an \`update_skill\` tool call for "${result.caseTemplate.title}".`,
          tool_calls: [toolCall],
        },
        finish_reason: 'tool_calls',
      },
    ],
  };
};

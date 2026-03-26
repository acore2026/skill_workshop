import type { SkillDocument } from '../schemas/skill';
import { createStarterDocument } from '../lib/graph';

export const generateMockDocument = (prompt: string): SkillDocument => {
  const document = createStarterDocument();

  return {
    ...document,
    name: `Prompt Flow: ${prompt.slice(0, 32)}${prompt.length > 32 ? '...' : ''}`,
    metadata: {
      ...document.metadata,
      description: `Generated from prompt: ${prompt}`,
      tags: [...document.metadata.tags, 'generated'],
    },
    nodes: document.nodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          properties: {
            ...node.properties,
            prompt,
          },
        };
      }

      return node;
    }),
  };
};

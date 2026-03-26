import { applyPromptToDocument } from '../lib/graph';
import type { SkillDocument } from '../schemas/skill';

export const generateMockDocument = (prompt: string, currentDocument?: SkillDocument | null) =>
  applyPromptToDocument(prompt, currentDocument);

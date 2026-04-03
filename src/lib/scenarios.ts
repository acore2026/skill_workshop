import type { Skill } from './api';

/**
 * @deprecated Use store.skills instead. This file now only provides the type definition
 * and a placeholder for backward compatibility during the API migration.
 */
export type Scenario = Skill;

export const SCENARIOS: Record<string, Scenario> = {};

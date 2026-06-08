import { healthScenario } from './health.scenario.js';
import { authScenario } from './auth.scenario.js';
import { superScenario } from './super.scenario.js';
import { discoveryScenario } from './discovery.scenario.js';
import { rateLimitScenario } from './rateLimit.scenario.js';
import { communityScenario } from './community.scenario.js';
import type { Scenario } from './types.js';

export const ALL_SCENARIOS: Scenario[] = [
  healthScenario,
  authScenario,
  superScenario,
  discoveryScenario,
  communityScenario,
  rateLimitScenario,
];

export function getScenario(id: string): Scenario | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id);
}

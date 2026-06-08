export type RouteRow = {
  method: string;
  path: string;
  file: string;
  middlewares: string[];
};

export type ModelInfo = {
  name: string;
  file: string;
  fields: string[];
  indexes: string[];
  hasCommunityId: boolean;
};

export type ServiceInfo = {
  name: string;
  file: string;
  exports: string[];
};

export type Invariant = {
  id: string;
  title: string;
  body: string;
  enforcedBy: string[];
};

export type SystemData = {
  meta: { backendUrl: string; apiBase: string; repoRoot: string };
  counts: { routes: number; models: number; services: number; jobs: number; middleware: number };
  routes: RouteRow[];
  models: ModelInfo[];
  services: ServiceInfo[];
  jobs: ServiceInfo[];
  middleware: ServiceInfo[];
  invariants: Invariant[];
};

export type HealthSample = {
  t: number;
  ok: boolean;
  db: 'ok' | 'down' | 'unknown';
  latencyMs: number;
  uptime: number | null;
};

export type HealthData = {
  backend: {
    url: string;
    ok: boolean;
    status: number;
    latencyMs: number;
    uptime: number | null;
    version: string | null;
    dbReported: string;
    error?: string;
  };
  mongo: { uri: string; ok: boolean; pingMs: number };
  latest: HealthSample;
};

export type CollectionRow = { name: string; exists: boolean; count: number };

export type ScenarioSummary = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  stepCount: number;
  steps: string[];
};

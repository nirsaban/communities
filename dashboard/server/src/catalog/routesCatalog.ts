import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export type RouteRow = {
  method: string;
  path: string;
  file: string;
  middlewares: string[];
};

// Hand-curated mount table — mirrors backend/src/routes/index.ts. We parse the
// per-file routers and combine with these mounts to get full paths.
const MOUNTS: { mount: string; file: string; exportName?: string }[] = [
  { mount: '', file: 'health.routes.ts' },
  { mount: '/auth', file: 'auth.routes.ts' },
  { mount: '/super', file: 'super.routes.ts' },
  { mount: '/communities', file: 'community.routes.ts' },
  { mount: '/communities', file: 'event.routes.ts', exportName: 'communityEventsRouter' },
  { mount: '/communities', file: 'payment.routes.ts', exportName: 'communityPaymentRouter' },
  { mount: '/communities', file: 'initiative.routes.ts', exportName: 'communityInitiativesRouter' },
  { mount: '/communities', file: 'post.routes.ts', exportName: 'communityPostsRouter' },
  { mount: '/communities', file: 'admin.routes.ts', exportName: 'communityAdminRouter' },
  { mount: '/events', file: 'event.routes.ts', exportName: 'eventsRouter' },
  { mount: '/events', file: 'payment.routes.ts', exportName: 'eventCheckoutRouter' },
  { mount: '/initiatives', file: 'initiative.routes.ts', exportName: 'initiativesRouter' },
  { mount: '/posts', file: 'post.routes.ts', exportName: 'postsRouter' },
  { mount: '/invitations', file: 'invitation.routes.ts' },
  { mount: '/me', file: 'payment.routes.ts', exportName: 'meSubscriptionsRouter' },
  { mount: '/me', file: 'notification.routes.ts', exportName: 'meNotificationsRouter' },
  { mount: '/me', file: 'me.routes.ts', exportName: 'meAggregatesRouter' },
  { mount: '/discovery', file: 'discovery.routes.ts' },
  { mount: '/payments', file: 'payment.routes.ts', exportName: 'paymentRouter' },
];

const VERB_RE = /\b(router|[A-Za-z_]+Router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([\s\S]*?)\)\s*;/g;

function detectMiddlewares(args: string): string[] {
  const known = [
    'verifyToken',
    'loadMembership',
    'loadEventScope',
    'requireGlobalRole',
    'requireCommunityRole',
    'requireEventManager',
    'authLimiter',
    'readLimiter',
    'writeLimiter',
    'uploadLimiter',
    'validate',
    'blockSubAdminFromFinancial',
  ];
  const hits: string[] = [];
  for (const m of known) {
    const re = new RegExp(`\\b${m}\\b`);
    if (re.test(args)) hits.push(m);
  }
  return hits;
}

function extractRouterBlock(src: string, exportName?: string): string {
  if (!exportName) return src;
  const start = src.indexOf(`export const ${exportName}`);
  if (start === -1) return src;
  return src.slice(start);
}

export async function buildRoutesCatalog(): Promise<RouteRow[]> {
  const routesDir = path.join(config.backendSrc, 'routes');
  const rows: RouteRow[] = [];
  for (const m of MOUNTS) {
    let src: string;
    try {
      src = await fs.readFile(path.join(routesDir, m.file), 'utf8');
    } catch {
      continue;
    }
    const block = extractRouterBlock(src, m.exportName);
    const seen = new Set<string>();
    for (const match of block.matchAll(VERB_RE)) {
      const [, routerName, verb, p, args] = match;
      // For files with multiple routers, skip lines that don't reference the
      // exported router we care about. If exportName is set, only count those
      // routerNames (or 'router' if it's the default).
      if (m.exportName && routerName !== m.exportName) continue;
      if (!m.exportName && routerName !== 'router') continue;
      const fullPath = `${config.apiBase}${m.mount}${p === '/' ? '' : p}`;
      const key = `${verb.toUpperCase()} ${fullPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        method: verb.toUpperCase(),
        path: fullPath,
        file: `backend/src/routes/${m.file}`,
        middlewares: detectMiddlewares(args),
      });
    }
  }
  rows.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return rows;
}

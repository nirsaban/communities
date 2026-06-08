import { Router } from 'express';
import { buildRoutesCatalog } from '../catalog/routesCatalog.js';
import { buildModelsCatalog } from '../catalog/modelsCatalog.js';
import {
  buildJobsCatalog,
  buildMiddlewareCatalog,
  buildServicesCatalog,
} from '../catalog/servicesCatalog.js';
import { INVARIANTS } from '../catalog/invariants.js';
import { config } from '../config.js';

const router = Router();

router.get('/system', async (_req, res, next) => {
  try {
    const [routes, models, services, jobs, middleware] = await Promise.all([
      buildRoutesCatalog(),
      buildModelsCatalog(),
      buildServicesCatalog(),
      buildJobsCatalog(),
      buildMiddlewareCatalog(),
    ]);
    res.json({
      data: {
        meta: {
          backendUrl: config.backendUrl,
          apiBase: config.apiBase,
          repoRoot: config.repoRoot,
        },
        counts: {
          routes: routes.length,
          models: models.length,
          services: services.length,
          jobs: jobs.length,
          middleware: middleware.length,
        },
        routes,
        models,
        services,
        jobs,
        middleware,
        invariants: INVARIANTS,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

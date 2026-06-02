import path from 'path';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import env from './config/env';
import logger from './config/logger';
import apiV1 from './routes';
import { webhookRouter } from './routes/payment.routes';
import { notFound, errorHandler } from './middleware/errorHandler';

export function buildApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins === '*' ? true : env.corsOrigins,
      credentials: false,
    }),
  );

  if (!env.isTest) {
    app.use(
      morgan(env.isProd ? 'combined' : 'dev', {
        stream: {
          write: (msg) => logger.info({ msg: 'http', line: msg.trim() }),
        },
      }),
    );
  }

  // Stripe webhook MUST receive the raw body for signature verification, so it is
  // mounted before the JSON parser. Inside the router, express.raw() is wired.
  app.use('/api/v1/webhooks', webhookRouter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(
    mongoSanitize({
      replaceWith: '_',
    }),
  );

  // Static serve dev uploads.
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  app.use('/api/v1', apiV1);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default buildApp;

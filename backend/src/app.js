import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFound } from './middlewares/not-found.js';
import { generalLimiter } from './middlewares/rate-limit.js';
import { apiRouter } from './routes/index.js';

export const createApp = () => {
  const app = express();

  // Behind a reverse proxy in production, so rate limiting and req.ip
  // read the forwarded address rather than the proxy's.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ---- security & transport ----
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const allowedOrigins = [env.clientUrl, env.siteOrigin].filter(Boolean);

  /**
   * In development the front end moves between ports — 4200 for `ng serve`,
   * 4000 for the SSR build, whatever a second instance grabs — and each one
   * is a different Origin. Pinning the allowlist to a single port means the
   * first thing you see after switching is a CORS failure that looks like a
   * broken login rather than a config mismatch.
   *
   * So: any localhost port is allowed in development. In production only the
   * configured origins are, and nothing about that is relaxed.
   */
  const isLocalhost = origin =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

  app.use(
    cors({
      origin(origin, callback) {
        // No origin = curl, server-to-server, same-origin. Allow those.
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        if (!env.isProduction && isLocalhost(origin)) {
          return callback(null, true);
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  // ---- routes ----
  app.use('/api', generalLimiter, apiRouter);

  // ---- tail: unknown route, then the single error handler ----
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

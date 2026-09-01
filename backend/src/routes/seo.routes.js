import { Router } from 'express';

import {
  indexNowKeyFile,
  robots,
  sitemap
} from '../controllers/seo.controller.js';

export const seoRouter = Router();

// Crawler-facing, so deliberately unauthenticated and cached.
seoRouter.get('/sitemap.xml', sitemap);
seoRouter.get('/robots.txt', robots);
seoRouter.get('/indexnow/:key.txt', indexNowKeyFile);

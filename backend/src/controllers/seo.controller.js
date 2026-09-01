import { env } from '../config/env.js';
import {
  buildRobotsTxt,
  getSitemapXml
} from '../services/sitemap.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middlewares/async-handler.js';

/**
 * GET /api/sitemap.xml
 *
 * nginx proxies /sitemap.xml here with an exact-match location, which beats
 * both the SPA fallback and the data-file rule.
 */
export const sitemap = asyncHandler(async (_req, res) => {
  const { xml, hit, count } = await getSitemapXml();

  res.set('X-Sitemap-Cache', hit ? 'HIT' : 'MISS');
  res.set('X-Sitemap-Urls', String(count));
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/xml');

  return res.send(xml);
});

/**
 * GET /api/robots.txt
 */
export const robots = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.type('text/plain');

  return res.send(buildRobotsTxt());
});

/**
 * GET /:key.txt — the IndexNow key file, served from config so the key
 * lives in one place. Returns 404 when IndexNow is not configured.
 */
export const indexNowKeyFile = asyncHandler(async (req, res) => {
  const key = env.indexNowKey;

  if (!key || req.params.key !== key) {
    throw ApiError.notFound('Not found.');
  }

  res.type('text/plain');

  return res.send(key);
});

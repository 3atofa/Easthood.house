#!/usr/bin/env node
/**
 * Generates routes.txt — every public URL the site should answer.
 *
 * WHAT THIS IS FOR NOW:
 *
 * Under Angular 19 server routing, the BUILD no longer reads this file —
 * render modes live in src/app/app.routes.server.ts, and the content routes
 * are RenderMode.Server, so there is no prerendered file to check for.
 *
 * The list is still worth generating, because deploy.sh uses it to hit every
 * URL against the running SSR server and prove each one returns real HTML
 * rather than an empty shell. That check replaces the "did the file get
 * written" check that prerendering needed.
 *
 * It also feeds check-route-drift.js, which fails the deploy when the router,
 * this generator and the sitemap stop agreeing.
 *
 * Run:  node scripts/generate-routes.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const API = process.env.API_URL || 'http://localhost:3000/api';
const OUT = path.join(ROOT, 'routes.txt');

/** Stop runaway loops if an API ever reports a bad totalPages. */
const MAX_PAGES = 200;
const PAGE_SIZE = 100;

/**
 * Static routes. THE one list — the sitemap's STATIC_ROUTES on the server
 * mirrors this. Three copies of the same routes drift silently and each
 * drift costs a page, so if you add one here, add it there too.
 */
const STATIC_ROUTES = [
  '/',
  '/work',
  '/services',
  '/articles',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/404'
];

const log = (...args) => console.log('[routes]', ...args);
const warn = (...args) => console.warn('[routes] WARNING:', ...args);

/**
 * Collects every slug from a paginated endpoint.
 *
 * The bug this exists to prevent: `fetch('/api/articles')` with no page
 * parameter returns page ONE ONLY. Every article past the first page then
 * silently never gets a prerendered file — and the build still succeeds.
 */
async function collectSlugs(resource) {
  const slugs = [];
  let reportedTotal = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${API}/${resource}?page=${page}&limit=${PAGE_SIZE}`;

    let json;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      json = await res.json();
    } catch (error) {
      throw new Error(`Could not read ${url} — ${error.message}`);
    }

    const rows = Array.isArray(json.data) ? json.data : [];

    slugs.push(...rows.map(row => row.slug).filter(Boolean));

    const meta = json.meta ?? json.pagination ?? {};
    reportedTotal = meta.total ?? reportedTotal;

    const totalPages = meta.totalPages ?? 1;

    if (page >= totalPages || rows.length === 0) {
      break;
    }
  }

  // Reconcile against what the source says exists. This comparison is the
  // whole point: a silent shortfall is what puts pages on the shell.
  if (reportedTotal !== null && reportedTotal > slugs.length) {
    warn(
      `API reports ${reportedTotal} ${resource} but only ${slugs.length} ` +
        'have usable slugs. The rest will NOT be prerendered.'
    );
  }

  log(`${resource}: ${slugs.length} slug(s)`);

  return slugs;
}

async function main() {
  log(`source: ${API}`);

  const routes = [...STATIC_ROUTES];

  const [articles, projects] = await Promise.all([
    collectSlugs('articles'),
    collectSlugs('projects')
  ]);

  articles.forEach(slug => routes.push(`/articles/${slug}`));
  projects.forEach(slug => routes.push(`/work/${slug}`));

  // No per-service URLs: every service is shown on the one /services page.

  const unique = [...new Set(routes)];

  if (unique.length !== routes.length) {
    warn(`${routes.length - unique.length} duplicate route(s) removed.`);
  }

  fs.writeFileSync(OUT, unique.join('\n') + '\n', 'utf8');

  log(`wrote ${unique.length} route(s) to ${path.relative(ROOT, OUT)}`);
}

main().catch(error => {
  console.error('\n[routes] FAILED:', error.message);
  console.error(
    '[routes] The API must be running and reachable before a production build.\n' +
      '[routes] Building now would prerender the static pages only, and every\n' +
      '[routes] article and case study would serve the generic shell.\n'
  );
  process.exit(1);
});

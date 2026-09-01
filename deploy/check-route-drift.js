#!/usr/bin/env node
/**
 * Route-list drift check.
 *
 * This architecture keeps the same static routes in three places:
 *   1. the Angular router            (frontend/src/app/app.routes.ts)
 *   2. the prerender generator       (frontend/scripts/generate-routes.js)
 *   3. the sitemap                   (backend/src/services/sitemap.service.js)
 *   4. the server render modes       (frontend/src/app/app.routes.server.ts)
 *
 * Drift between them is silent and always costs a page: a route the sitemap
 * announces but the router does not have becomes a 404 in Search Console; a
 * route the router has but the sitemap omits is never discovered.
 *
 * Run:  node deploy/check-route-drift.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---- 1. router: the PUBLIC portal's children only ----
//
// Scoped to the block between the public-portal marker and the admin one,
// because admin children ('dashboard', 'users'...) declare bare paths that
// would otherwise look like public routes. And `path: ''` is the homepage,
// so it must map to '/' rather than being dropped as falsy.
const routerSrc = read('frontend/src/app/app.routes.ts');

const publicBlock = routerSrc.slice(
  routerSrc.indexOf('PUBLIC PORTAL'),
  routerSrc.indexOf('ADMIN LOGIN')
);

const routerPaths = new Set(
  [...publicBlock.matchAll(/path:\s*'([^']*)'/g)]
    .map(m => m[1])
    .filter(p => p !== '**' && !p.includes(':'))
    .map(p => (p === '' ? '/' : `/${p}`))
);

// ---- 2. generator ----
const genSrc = read('frontend/scripts/generate-routes.js');
const genBlock = genSrc.match(/const STATIC_ROUTES = \[([\s\S]*?)\];/);
const genPaths = new Set(
  [...(genBlock?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1])
);

// ---- 3. sitemap ----
const mapSrc = read('backend/src/services/sitemap.service.js');
const mapBlock = mapSrc.match(/export const STATIC_ROUTES = \[([\s\S]*?)\n\];/);
const mapPaths = new Set(
  [...(mapBlock?.[1] ?? '').matchAll(/path:\s*'([^']+)'/g)].map(m => m[1])
);

// ---- 4. server render modes, including parameterised routes ----
//
// @angular/ssr REJECTS a server route with no matching Angular route, and a
// parameterised route declared here but absent from the router is how that
// happens. This is not hypothetical: 'services/:slug' was declared in all of
// the sitemap, the generator and this file while the router only ever had a
// single /services page, so every /services/<slug> URL would have 404'd.
const serverSrc = read('frontend/src/app/app.routes.server.ts');

const serverPaths = new Set(
  [...serverSrc.matchAll(/path:\s*'([^']*)'/g)]
    .map(m => (m[1] === '' ? '/' : `/${m[1]}`))
    .filter(p => !p.includes('*'))
);

// Parameterised routes from the router, e.g. /work/:slug
const routerParamPaths = new Set(
  [...publicBlock.matchAll(/path:\s*'([^']*)'/g)]
    .map(m => m[1])
    .filter(p => p.includes(':'))
    .map(p => `/${p}`)
);

const problems = [];

const diff = (label, a, aName, b, bName) => {
  for (const route of a) {
    if (!b.has(route)) {
      problems.push(`${route} is in ${aName} but NOT in ${bName}`);
    }
  }
};

// The sitemap is the contract with crawlers: everything it announces must
// exist in the router, and everything indexable must be prerenderable.
diff('', mapPaths, 'the sitemap', routerPaths, 'the router  -> would 404');
diff('', mapPaths, 'the sitemap', genPaths, 'the generator -> not prerendered');
diff('', genPaths, 'the generator', routerPaths, 'the router  -> would 404');

// Every parameterised server route must exist in the router, or the build
// fails at route extraction.
for (const route of serverPaths) {
  if (!route.includes(':')) {
    continue;
  }

  if (!routerParamPaths.has(route)) {
    problems.push(
      `${route} is a server route but the router has no such path -> ` +
        '@angular/ssr will reject the build'
    );
  }
}

// And every static route the sitemap announces must have a render mode.
for (const route of mapPaths) {
  if (!serverPaths.has(route)) {
    problems.push(
      `${route} is in the sitemap but has no render mode in app.routes.server.ts`
    );
  }
}

// /404 is rendered deliberately and must never be in the sitemap.
if (mapPaths.has('/404')) {
  problems.push('/404 must NOT be in the sitemap');
}

console.log('router    :', [...routerPaths].sort().join(' '));
console.log('generator :', [...genPaths].sort().join(' '));
console.log('sitemap   :', [...mapPaths].sort().join(' '));
console.log('server    :', [...serverPaths].sort().join(' '));
console.log('router :param:', [...routerParamPaths].sort().join(' ') || '(none)');
console.log();

if (problems.length) {
  console.error('DRIFT DETECTED:');
  problems.forEach(p => console.error('  -', p));
  process.exit(1);
}

console.log('No drift — the three route lists agree.');

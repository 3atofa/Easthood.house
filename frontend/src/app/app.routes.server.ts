import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Per-route rendering strategy (Angular 19's server routing).
 *
 * WHY THE PARAMETERISED ROUTES ARE `Server` AND NOT `Prerender`:
 *
 * Prerendering /articles/:slug would need getPrerenderParams() — and that
 * hook is not reliably invoked by the CLI in the 19.2 line. When it silently
 * does not run, every article falls back to the client-rendered shell with
 * ZERO build errors, and Search Console reports them all as duplicates of
 * the homepage.
 *
 * Server rendering sidesteps that failure entirely, and it is the right
 * answer for database-backed content anyway: an article published in the
 * admin is server-rendered on the very next request, with no rebuild and
 * no window where a live URL serves an empty shell.
 *
 * The fixed marketing pages have no such dependency, so they are prerendered
 * at build time and served as static files.
 */
export const serverRoutes: ServerRoute[] = [
  // ---- static pages: prerendered at build time ----
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: '404', renderMode: RenderMode.Prerender },

  // ---- listings: server-rendered so new content appears immediately ----
  { path: 'work', renderMode: RenderMode.Server },
  { path: 'services', renderMode: RenderMode.Server },
  { path: 'articles', renderMode: RenderMode.Server },

  // ---- content detail pages: server-rendered per request ----
  { path: 'articles/:slug', renderMode: RenderMode.Server },
  { path: 'work/:slug', renderMode: RenderMode.Server },

  // NOTE: there is deliberately no 'services/:slug' here. Every service is
  // shown on the one /services page, so a per-service URL has no Angular
  // route behind it. Declaring one makes @angular/ssr reject the build, and
  // putting one in the sitemap would announce URLs that 404.

  // ---- admin: behind a login, never indexed, no reason to render on the
  //      server. Client rendering keeps the admin bundle off the SSR path.
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },

  // Everything else is server-rendered so unknown URLs still return real
  // HTML (the 404 page) rather than a shell.
  { path: '**', renderMode: RenderMode.Server }
];

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SSR host for the EAST HOOD site.
 *
 * Angular 19 replaced CommonEngine with AngularNodeAppEngine: the engine
 * takes the request, resolves the route's render mode from
 * app.routes.server.ts, and returns a Web API Response that
 * writeResponseToNodeResponse pipes back to Express.
 *
 * The point of all of it: a crawler that does not execute JavaScript — which
 * is most AI crawlers, and the safest assumption for Googlebot's first pass —
 * receives the real page text, title, canonical and JSON-LD.
 */
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');

/**
 * Static assets first. Build output is content-hashed, so it is immutable;
 * `index: false` stops express from answering '/' with index.html and
 * bypassing the renderer.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false
  })
);

/**
 * Everything else goes to Angular. A null response means the engine had no
 * route for it, so it falls through to Express's own 404 rather than being
 * answered with a shell.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(response =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;

  app.listen(port, () => {
    console.log(`[ssr] EAST HOOD listening on http://localhost:${port}`);
  });
}

/** Used by deployment adapters that import the handler rather than listen. */
export const reqHandler = createNodeRequestHandler(app);

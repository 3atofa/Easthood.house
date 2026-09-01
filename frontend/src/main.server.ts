import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Server bootstrap.
 *
 * The `context` argument is not optional, despite what most Angular 19
 * tutorials show. Later 19.2 patches backported `BootstrapContext` from
 * v20: `@angular/ssr` now invokes this as `bootstrap({ platformRef })`,
 * and that platformRef is the only thing that establishes the server
 * platform. Dropping it — the old `() => bootstrapApplication(App, config)`
 * signature — fails at route extraction with:
 *
 *   NG0401: Missing Platform: This may be due to using
 *   `bootstrapApplication` on the server without passing a
 *   `BootstrapContext`.
 *
 * So the context must be accepted and forwarded, always.
 */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;

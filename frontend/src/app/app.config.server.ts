import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Server-side additions to the browser config.
 *
 * In Angular 19 these come from two different packages:
 *   provideServerRendering -> @angular/platform-server
 *   provideServerRouting   -> @angular/ssr
 *
 * (provideServerRouting replaced provideServerRoutesConfig in 19.1; the old
 * name still exists as a deprecated alias but should not be used.)
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes)
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

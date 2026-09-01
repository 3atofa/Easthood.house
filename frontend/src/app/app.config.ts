import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Reuses the server-rendered DOM instead of throwing it away and
    // re-rendering, and replays clicks that land before hydration finishes.
    provideClientHydration(withEventReplay()),

    provideRouter(
      routes,
      withInMemoryScrolling({
        // Jump to the top on navigation, honour #fragments when present.
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      }),
      withRouterConfig({
        paramsInheritanceStrategy: 'always'
      })
    ),

    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    )
  ]
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

/** Endpoints where a 401 is the answer, not a stale token. */
const NO_RETRY = ['/auth/login', '/auth/refresh'];

/**
 * On a 401 from an expired access token, spends the refresh token once and
 * replays the original request. If that fails too, the session is genuinely
 * over and the user is sent to the login screen.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const storage = inject(TokenStorageService);
  const router = inject(Router);

  const isOurApi = req.url.startsWith(environment.apiUrl);
  const canRetry = isOurApi && !NO_RETRY.some(path => req.url.includes(path));

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !canRetry || !storage.refreshToken) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap(result =>
          // Replay with the token we just obtained — the auth interceptor
          // already ran, so set it explicitly here.
          next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${result.accessToken}` }
            })
          )
        ),
        catchError(refreshError => {
          storage.clear();

          router.navigate(['/admin/login'], {
            queryParams: { returnUrl: router.url }
          });

          return throwError(() => refreshError);
        })
      );
    })
  );
};

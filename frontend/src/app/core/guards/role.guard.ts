import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Usage:  { path: 'settings', canActivate: [authGuard, roleGuard(['admin'])] }
 */
export const roleGuard = (allowed: UserRole[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.hasRole(...allowed)
    ? true
    : router.createUrlTree(['/admin/dashboard']);
};

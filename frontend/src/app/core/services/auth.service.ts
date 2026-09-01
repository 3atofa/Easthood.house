import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { AuthResult, LoginPayload, User, UserRole } from '../models/user.model';
import { ApiService } from './api.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly api = inject(ApiService);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(this.restoreUser());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly role = computed<UserRole | null>(() => this.userSignal()?.role ?? null);

  login(payload: LoginPayload): Observable<AuthResult> {
    return this.api
      .post<AuthResult>('/auth/login', payload)
      .pipe(tap(result => this.persist(result)));
  }

  /** Called by the interceptor when a 401 says the access token expired. */
  refresh(): Observable<AuthResult> {
    return this.api
      .post<AuthResult>('/auth/refresh', {
        refreshToken: this.storage.refreshToken
      })
      .pipe(tap(result => this.persist(result)));
  }

  // ---- password reset by emailed one-time code ----

  /**
   * Always resolves the same way whether or not the address has an account —
   * the API answers neutrally on purpose, so this endpoint cannot be used to
   * discover which addresses exist.
   */
  forgotPassword(email: string): Observable<{ expiresInMinutes: number }> {
    return this.api.post<{ expiresInMinutes: number }>('/auth/forgot-password', {
      email
    });
  }

  /** Exchanges a correct code for a short-lived reset token. */
  verifyOtp(
    email: string,
    code: string
  ): Observable<{ resetToken: string; expiresInMinutes: number }> {
    return this.api.post<{ resetToken: string; expiresInMinutes: number }>(
      '/auth/verify-otp',
      { email, code }
    );
  }

  resetPassword(resetToken: string, newPassword: string): Observable<null> {
    return this.api.post<null>('/auth/reset-password', {
      resetToken,
      newPassword
    });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<null> {
    return this.api.patch<null>('/auth/password', {
      currentPassword,
      newPassword
    });
  }

  logout(redirectTo: string = '/admin/login'): void {
    this.storage.clear();
    this.userSignal.set(null);
    this.router.navigateByUrl(redirectTo);
  }

  get accessToken(): string | null {
    return this.storage.accessToken;
  }

  get refreshToken(): string | null {
    return this.storage.refreshToken;
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  private persist(result: AuthResult): void {
    this.storage.save(result.accessToken, result.refreshToken, result.user);
    this.userSignal.set(result.user);
  }

  private restoreUser(): User | null {
    const raw = this.storage.rawUser;

    if (!raw || !this.storage.accessToken) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      this.storage.clear();
      return null;
    }
  }
}

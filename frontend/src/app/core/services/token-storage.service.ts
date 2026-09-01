import { Injectable } from '@angular/core';

const ACCESS_KEY = 'eh.access';
const REFRESH_KEY = 'eh.refresh';
const USER_KEY = 'eh.user';

/**
 * Thin wrapper over localStorage so nothing else in the app has to know
 * where tokens live (or guard against SSR / private-mode failures).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {

  private get store(): Storage | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }

  get accessToken(): string | null {
    return this.read(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return this.read(REFRESH_KEY);
  }

  get rawUser(): string | null {
    return this.read(USER_KEY);
  }

  save(accessToken: string, refreshToken: string, user: unknown): void {
    this.write(ACCESS_KEY, accessToken);
    this.write(REFRESH_KEY, refreshToken);
    this.write(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach(key => {
      try {
        this.store?.removeItem(key);
      } catch {
        /* ignore */
      }
    });
  }

  private read(key: string): string | null {
    try {
      return this.store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      this.store?.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

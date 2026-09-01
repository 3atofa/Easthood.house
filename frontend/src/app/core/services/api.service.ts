import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, PaginationMeta } from '../models/api.model';

export interface Paged<T> {
  items: T[];
  meta?: PaginationMeta;
}

/**
 * One place that knows the API's response envelope. Every resource service
 * goes through here, so unwrapping `{ success, message, data }` is written
 * once rather than in a dozen `.pipe(map(r => r.data))` calls.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {

  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Drops null/undefined/'' so absent filters never reach the query string. */
  private toParams(query: Record<string, unknown> = {}): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return params;
  }

  get<T>(path: string, query?: Record<string, unknown>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.base}${path}`, { params: this.toParams(query) })
      .pipe(map(res => res.data));
  }

  /** Same as get(), but keeps the pagination meta the list screens need. */
  getPaged<T>(path: string, query?: Record<string, unknown>): Observable<Paged<T>> {
    return this.http
      .get<ApiResponse<T[]>>(`${this.base}${path}`, { params: this.toParams(query) })
      .pipe(map(res => ({ items: res.data, meta: res.meta })));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(res => res.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(res => res.data));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(res => res.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(`${this.base}${path}`)
      .pipe(map(res => res.data));
  }
}

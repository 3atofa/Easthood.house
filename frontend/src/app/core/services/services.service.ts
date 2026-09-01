import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  PackageItem,
  PackagePayload,
  ServiceItem,
  ServicePayload
} from '../models/service.model';
import { ApiService } from './api.service';

/**
 * Services and packages are now SEPARATE resources: a package bundles many
 * services rather than belonging to one, so neither is nested inside the
 * other's endpoint.
 */
@Injectable({ providedIn: 'root' })
export class ServicesService {

  private readonly api = inject(ApiService);

  // ---- services ----
  list(query: Record<string, unknown> = {}): Observable<ServiceItem[]> {
    return this.api.get<ServiceItem[]>('/services', query);
  }

  bySlug(slug: string): Observable<ServiceItem> {
    return this.api.get<ServiceItem>(`/services/${slug}`);
  }

  create(payload: Partial<ServicePayload>): Observable<ServiceItem> {
    return this.api.post<ServiceItem>('/services', payload);
  }

  update(id: string, payload: Partial<ServicePayload>): Observable<ServiceItem> {
    return this.api.put<ServiceItem>(`/services/${id}`, payload);
  }

  remove(id: string): Observable<null> {
    return this.api.delete<null>(`/services/${id}`);
  }

  // ---- packages ----
  listPackages(query: Record<string, unknown> = {}): Observable<PackageItem[]> {
    return this.api.get<PackageItem[]>('/packages', query);
  }

  createPackage(payload: Partial<PackagePayload>): Observable<PackageItem> {
    return this.api.post<PackageItem>('/packages', payload);
  }

  updatePackage(
    id: string,
    payload: Partial<PackagePayload>
  ): Observable<PackageItem> {
    return this.api.put<PackageItem>(`/packages/${id}`, payload);
  }

  removePackage(id: string): Observable<null> {
    return this.api.delete<null>(`/packages/${id}`);
  }
}

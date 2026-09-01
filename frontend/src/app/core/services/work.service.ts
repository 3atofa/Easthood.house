import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { WorkProject, WorkProjectPayload } from '../models/work.model';
import { ApiService, Paged } from './api.service';

@Injectable({ providedIn: 'root' })
export class WorkService {

  private readonly api = inject(ApiService);

  list(query: Record<string, unknown> = {}): Observable<Paged<WorkProject>> {
    return this.api.getPaged<WorkProject>('/projects', query);
  }

  bySlug(slug: string): Observable<WorkProject> {
    return this.api.get<WorkProject>(`/projects/${slug}`);
  }

  create(payload: WorkProjectPayload): Observable<WorkProject> {
    return this.api.post<WorkProject>('/projects', payload);
  }

  update(id: string, payload: Partial<WorkProjectPayload>): Observable<WorkProject> {
    return this.api.put<WorkProject>(`/projects/${id}`, payload);
  }

  remove(id: string): Observable<null> {
    return this.api.delete<null>(`/projects/${id}`);
  }
}

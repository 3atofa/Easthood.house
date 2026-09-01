import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ContactRequest,
  ContactRequestPayload,
  ContactStats,
  ContactStatus
} from '../models/contact-request.model';
import { ApiService, Paged } from './api.service';

export interface ContactQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ContactStatus | 'all';
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class ContactService {

  private readonly api = inject(ApiService);

  /** Public contact form. */
  submit(payload: ContactRequestPayload): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/contact', payload);
  }

  list(query: ContactQuery = {}): Observable<Paged<ContactRequest>> {
    return this.api.getPaged<ContactRequest>('/contact', { ...query });
  }

  stats(): Observable<ContactStats> {
    return this.api.get<ContactStats>('/contact/stats');
  }

  update(
    id: string,
    changes: { status?: ContactStatus; adminNote?: string | null }
  ): Observable<ContactRequest> {
    return this.api.patch<ContactRequest>(`/contact/${id}`, changes);
  }

  remove(id: string): Observable<null> {
    return this.api.delete<null>(`/contact/${id}`);
  }
}

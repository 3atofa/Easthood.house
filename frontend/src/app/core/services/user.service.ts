import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { User, UserPayload } from '../models/user.model';
import { ApiService, Paged } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly api = inject(ApiService);

  list(query: Record<string, unknown> = {}): Observable<Paged<User>> {
    return this.api.getPaged<User>('/users', query);
  }

  create(payload: UserPayload): Observable<User> {
    return this.api.post<User>('/users', payload);
  }

  update(id: string, payload: Partial<UserPayload>): Observable<User> {
    return this.api.put<User>(`/users/${id}`, payload);
  }

  remove(id: string): Observable<null> {
    return this.api.delete<null>(`/users/${id}`);
  }
}

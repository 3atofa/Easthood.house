import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Article,
  ArticleDetail,
  ArticlePayload
} from '../models/article.model';
import { ApiService, Paged } from './api.service';

export interface ArticleQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  published?: boolean;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class ArticleService {

  private readonly api = inject(ApiService);

  list(query: ArticleQuery = {}): Observable<Paged<Article>> {
    return this.api.getPaged<Article>('/articles', { ...query });
  }

  /** Returns the article plus its previous/next neighbours. */
  bySlug(slug: string): Observable<ArticleDetail> {
    return this.api.get<ArticleDetail>(`/articles/${slug}`);
  }

  create(payload: ArticlePayload): Observable<Article> {
    return this.api.post<Article>('/articles', payload);
  }

  update(id: string, payload: Partial<ArticlePayload>): Observable<Article> {
    return this.api.put<Article>(`/articles/${id}`, payload);
  }

  remove(id: string): Observable<null> {
    return this.api.delete<null>(`/articles/${id}`);
  }
}

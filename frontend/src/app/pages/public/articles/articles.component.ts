import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { Article } from '../../../core/models/article.model';
import { PaginationMeta } from '../../../core/models/api.model';
import { SeoService } from '../../../core/seo/seo.service';
import { ArticleService } from '../../../core/services/article.service';
import { apiErrorMessage } from '../../../core/utils/form-errors';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.css'
})
export class ArticlesComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly articles = inject(ArticleService);
  private readonly seo = inject(SeoService);

  readonly rows = signal<Article[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly page = signal(1);
  readonly category = signal<string | null>(null);

  readonly totalPages = computed(() => this.meta()?.totalPages ?? 1);

  constructor() {
    this.route.queryParamMap
      .pipe(
        switchMap(params => {
          const page = Math.max(1, Number(params.get('page')) || 1);
          const category = params.get('category');

          this.page.set(page);
          this.category.set(category);
          this.loading.set(true);
          this.applySeo(page, category);

          return this.articles.list({
            page,
            limit: 12,
            category: category ?? undefined
          });
        })
      )
      .subscribe({
        next: result => {
          this.rows.set(result.items);
          this.meta.set(result.meta ?? null);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err));
          this.loading.set(false);
        }
      });
  }

  /**
   * Builds the querystring for a page link so pagination can be real
   * <a href> anchors. A button that only mutates state is invisible to a
   * crawler, and those pages end up reachable from the sitemap alone with
   * no link equity at all.
   */
  pageParams(page: number): Record<string, string> {
    const params: Record<string, string> = {};

    if (page > 1) {
      params['page'] = String(page);
    }

    const category = this.category();

    if (category) {
      params['category'] = category;
    }

    return params;
  }

  /** Page numbers to render — a window around the current page. */
  get pageWindow(): number[] {
    const total = this.totalPages();
    const current = this.page();

    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, Math.max(current + 2, 5));

    const pages: number[] = [];

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  private applySeo(page: number, category: string | null): void {
    // Page 2 canonicalises to ITSELF, not back to page 1. Pointing it at
    // page 1 makes Google drop it, and with it every link to the articles
    // that appear only there.
    //
    // A category filter is different: it is an alternative slice of the
    // same set, so it canonicalises to the clean URL to avoid generating
    // unbounded near-duplicates.
    const canonicalPath = category
      ? '/articles'
      : page > 1
        ? `/articles?page=${page}`
        : '/articles';

    // Distinct title per page, or every page competes for the same one.
    const suffix = page > 1 ? ` — Page ${page}` : '';

    this.seo.apply({
      title: `Insights${suffix}`,
      description:
        'Writing from the EAST HOOD studio on brand strategy, identity systems, creative direction and production.',
      path: canonicalPath,
      type: 'website',
      noIndex: Boolean(category)
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.breadcrumbs([{ label: 'Insights', path: '/articles' }])
    ]);
  }
}

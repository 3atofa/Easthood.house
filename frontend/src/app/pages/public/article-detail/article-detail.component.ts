import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import {
  Article,
  ArticleNeighbour
} from '../../../core/models/article.model';
import { SeoService } from '../../../core/seo/seo.service';
import { ArticleService } from '../../../core/services/article.service';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.css'
})
export class ArticleDetailComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articles = inject(ArticleService);
  private readonly seo = inject(SeoService);

  readonly article = signal<Article | null>(null);
  readonly previous = signal<ArticleNeighbour | null>(null);
  readonly next = signal<ArticleNeighbour | null>(null);

  /** Paragraphs, split on blank lines. */
  readonly paragraphs = signal<string[]>([]);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap(params => this.articles.bySlug(params.get('slug') ?? ''))
      )
      .subscribe({
        next: ({ article, previous, next }) => {
          this.article.set(article);
          this.previous.set(previous);
          this.next.set(next);

          this.paragraphs.set(
            (article.content ?? '')
              .split(/\n{2,}/)
              .map(part => part.trim())
              .filter(Boolean)
          );

          this.applySeo(article);
        },
        error: () => this.router.navigateByUrl('/articles', { replaceUrl: true })
      });
  }

  private applySeo(article: Article): void {
    const path = `/articles/${article.slug}`;

    const words = (article.content ?? '').split(/\s+/).filter(Boolean).length;

    this.seo.apply({
      // metaTitle falls back to the headline server-side, so it is never blank.
      title: article.metaTitle,
      description: article.metaDescription,
      path,
      image: article.coverImage,
      imageAlt: article.coverAlt,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      author: article.author,
      tags: article.tags,
      // A draft previewed by an admin must never be indexed.
      noIndex: !article.isPublished
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.article({
        title: article.title,
        description: article.metaDescription,
        path,
        image: article.coverImage,
        published: article.publishedAt,
        modified: article.updatedAt,
        author: article.author,
        section: article.category,
        words
      }),
      this.seo.breadcrumbs([
        { label: 'Insights', path: '/articles' },
        { label: article.title, path }
      ])
    ]);
  }
}

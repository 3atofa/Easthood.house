import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { WorkProject } from '../../../core/models/work.model';
import { SeoService } from '../../../core/seo/seo.service';
import { WorkService } from '../../../core/services/work.service';

@Component({
  selector: 'app-work-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './work-detail.component.html',
  styleUrl: './work-detail.component.css'
})
export class WorkDetailComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workService = inject(WorkService);
  private readonly seo = inject(SeoService);

  readonly project = signal<WorkProject | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap(params => this.workService.bySlug(params.get('slug') ?? ''))
      )
      .subscribe({
        next: project => {
          this.project.set(project);
          this.applySeo(project);
          window.scrollTo({ top: 0, behavior: 'auto' });
        },
        // An unknown or unpublished slug is a 404 from the API — send the
        // visitor back to the index rather than showing an empty page.
        error: () => this.router.navigateByUrl('/work', { replaceUrl: true })
      });
  }

  private applySeo(project: WorkProject): void {
    const path = `/work/${project.slug}`;

    this.seo.apply({
      title: project.title,
      description: project.excerpt,
      path,
      image: project.cover,
      imageAlt: project.title,
      type: 'article',
      modifiedTime: null,
      noIndex: !project.isPublished
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.article({
        title: project.title,
        description: project.excerpt,
        path,
        image: project.cover,
        section: project.category
      }),
      this.seo.breadcrumbs([
        { label: 'Work', path: '/work' },
        { label: project.title, path }
      ])
    ]);
  }
}

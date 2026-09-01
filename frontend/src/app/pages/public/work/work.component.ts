import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WorkProject } from '../../../core/models/work.model';
import { SeoService } from '../../../core/seo/seo.service';
import { WorkService } from '../../../core/services/work.service';
import { apiErrorMessage } from '../../../core/utils/form-errors';

@Component({
  selector: 'app-work',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './work.component.html',
  styleUrl: './work.component.css'
})
export class WorkComponent {

  private readonly workService = inject(WorkService);
  private readonly seo = inject(SeoService);

  readonly projects = signal<WorkProject[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.seo.apply({
      title: 'Selected Work',
      description:
        'Brand identities, campaigns and production from EAST HOOD — case studies for brands built to lead.',
      path: '/work',
      type: 'website'
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.breadcrumbs([{ label: 'Work', path: '/work' }])
    ]);

    this.workService.list().subscribe({
      next: result => {
        this.projects.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  /** Display index — the API's sort order, not the array position. */
  indexFor(position: number): string {
    return String(position + 1).padStart(2, '0');
  }
}

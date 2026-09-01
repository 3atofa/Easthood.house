import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ContactRequest,
  ContactStats
} from '../../../core/models/contact-request.model';
import { AuthService } from '../../../core/services/auth.service';
import { ContactService } from '../../../core/services/contact.service';
import { ServicesService } from '../../../core/services/services.service';
import { WorkService } from '../../../core/services/work.service';
import { apiErrorMessage } from '../../../core/utils/form-errors';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {

  private readonly contact = inject(ContactService);
  private readonly work = inject(WorkService);
  private readonly services = inject(ServicesService);
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly stats = signal<ContactStats | null>(null);
  readonly latest = signal<ContactRequest[]>([]);
  readonly projectCount = signal(0);
  readonly serviceCount = signal(0);
  readonly packageCount = signal(0);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      stats: this.contact.stats(),
      latest: this.contact.list({ limit: 5, sortBy: 'createdAt', sortDir: 'DESC' }),
      projects: this.work.list({ limit: 1 }),
      services: this.services.list(),
      packages: this.services.listPackages({ active: 'all' })
    }).subscribe({
      next: ({ stats, latest, projects, services, packages }) => {
        this.stats.set(stats);
        this.latest.set(latest.items);
        this.projectCount.set(projects.meta?.total ?? projects.items.length);
        this.serviceCount.set(services.length);
        this.packageCount.set(packages.length);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  get tiles() {
    const stats = this.stats();

    return [
      {
        label: 'New enquiries',
        value: stats?.new ?? 0,
        icon: 'fa-envelope-open-text',
        accent: 'text-[#78c8a0]',
        link: '/admin/contact-requests'
      },
      {
        label: 'In review',
        value: stats?.inReview ?? 0,
        icon: 'fa-hourglass-half',
        accent: 'text-[#e0be6e]',
        link: '/admin/contact-requests'
      },
      {
        label: 'Case studies',
        value: this.projectCount(),
        icon: 'fa-layer-group',
        accent: 'text-[#8caae6]',
        link: '/admin/projects'
      },
      {
        label: 'Packages',
        value: this.packageCount(),
        icon: 'fa-boxes-stacked',
        accent: 'text-[#e85b17]',
        link: '/admin/packages'
      }
    ];
  }

  statusClass(status: string): string {
    switch (status) {
      case 'new':
        return 'border-[#78c8a0]/40 text-[#78c8a0]';
      case 'in-review':
        return 'border-[#e0be6e]/40 text-[#e0be6e]';
      case 'replied':
        return 'border-[#8caae6]/40 text-[#8caae6]';
      default:
        return 'border-white/15 text-white/45';
    }
  }
}

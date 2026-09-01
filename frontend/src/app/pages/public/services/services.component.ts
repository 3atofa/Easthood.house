import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

import { PackageItem, ServiceItem } from '../../../core/models/service.model';
import { SeoService } from '../../../core/seo/seo.service';
import { ServicesService } from '../../../core/services/services.service';
import { apiErrorMessage } from '../../../core/utils/form-errors';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent {

  private readonly api = inject(ServicesService);
  private readonly seo = inject(SeoService);

  readonly capabilities = signal<ServiceItem[]>([]);
  readonly packages = signal<PackageItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.seo.apply({
      title: 'Capabilities',
      description:
        'Brand strategy, visual identity, creative direction and film production — the four things EAST HOOD does, and what each one includes.',
      path: '/services',
      type: 'website'
    });

    forkJoin({
      services: this.api.list(),
      packages: this.api.listPackages()
    }).subscribe({
      next: ({ services, packages }) => {
        this.capabilities.set(services);
        this.packages.set(packages);
        this.loading.set(false);
        this.applySeo(services, packages);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  indexFor(position: number, service: ServiceItem): string {
    return service.code || String(position + 1).padStart(2, '0');
  }

  /**
   * One Service block per capability, each carrying its packages as Offers,
   * so the priced offer is machine-readable rather than only visual.
   */
  /**
   * One Service block per capability, plus the bundles as a second catalogue
   * of Offers — so a search engine sees both the individual prices and the
   * combined ones, rather than only the words describing them.
   */
  private applySeo(services: ServiceItem[], packages: PackageItem[]): void {
    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.breadcrumbs([{ label: 'Services', path: '/services' }]),

      ...services.map(service =>
        this.seo.service({
          name: service.title,
          description: service.summary,
          path: '/services',
          offers: [
            {
              name: service.title,
              price: service.price,
              currency: service.currency,
              description: service.summary
            }
          ]
        })
      ),

      ...(packages.length
        ? [
            this.seo.service({
              name: 'EAST HOOD packages',
              description:
                'Combinations of services sold together, below the price of buying each separately.',
              path: '/services',
              offers: packages.map(pack => ({
                name: pack.name,
                price: pack.price,
                currency: pack.currency,
                description:
                  pack.description ??
                  pack.services.map(service => service.title).join(', ')
              }))
            })
          ]
        : [])
    ]);
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '../../../core/seo/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="eh-page not-found">

      <div class="eh-container">

        <p class="eh-eyebrow">(404) <span>PAGE NOT FOUND</span></p>

        <h1 class="eh-display">
          NOTHING<br />
          TO SEE<br />
          HERE.
        </h1>

        <p class="eh-lead">
          The page you were looking for has moved, or never existed.
        </p>

        <a routerLink="/" class="eh-link">
          BACK TO HOME
          <i class="fa-solid fa-arrow-right"></i>
        </a>

      </div>

    </section>
  `,
  styles: [`
    .not-found {
      min-height: 82vh;

      display: flex;

      align-items: center;
    }

    .eh-lead {
      margin: 40px 0;
    }
  `]
})
export class NotFoundComponent {

  private readonly seo = inject(SeoService);

  constructor() {
    // noindex: a 404 that gets indexed is a phantom URL in the results.
    this.seo.apply({
      title: 'Page not found',
      description: 'The page you were looking for has moved, or never existed.',
      path: '/404',
      noIndex: true
    });

    this.seo.setJsonLd([]);
  }
}

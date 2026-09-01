import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';

import { SeoService } from '../../../core/seo/seo.service';

export interface LegalSection {
  heading: string;
  body: string[];
}

/**
 * Shared layout for the legal pages so privacy and terms cannot drift apart.
 */
@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="eh-page">

      <div class="eh-container">

        <p class="eh-eyebrow">LEGAL <span>{{ title }}</span></p>

        <h1 class="eh-heading">{{ title }}</h1>

        <p class="legal-updated">Last updated {{ updated }}</p>

        <hr class="eh-rule" />

        <div class="legal-body">

          @for (section of sections; track section.heading) {

            <section class="legal-section">

              <h2>{{ section.heading }}</h2>

              @for (paragraph of section.body; track $index) {
                <p>{{ paragraph }}</p>
              }

            </section>

          }

        </div>

      </div>

    </section>
  `,
  styles: [`
    .legal-updated {
      font-size: 10px;

      letter-spacing: 0.2em;

      color: var(--eh-faint);

      margin: 20px 0 40px;
    }

    .legal-body {
      display: flex;

      flex-direction: column;

      gap: 48px;

      padding-top: 48px;

      max-width: 76ch;
    }

    .legal-section h2 {
      font-size: 16px;

      font-weight: 500;

      letter-spacing: 0.02em;

      margin: 0 0 16px;
    }

    .legal-section p {
      font-size: 14px;

      line-height: 1.75;

      color: var(--eh-muted);

      margin: 0 0 16px;
    }
  `]
})
export class LegalComponent implements OnInit {

  private readonly seo = inject(SeoService);

  /** Path of THIS page — used for a self-referencing canonical. */
  @Input({ required: true }) path = '';

  @Input({ required: true }) description = '';

  ngOnInit(): void {
    this.seo.apply({
      title: this.title,
      description: this.description,
      path: this.path,
      type: 'website'
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.breadcrumbs([{ label: this.title, path: this.path }])
    ]);
  }


  @Input({ required: true }) title = '';

  @Input({ required: true }) updated = '';

  @Input({ required: true }) sections: LegalSection[] = [];
}

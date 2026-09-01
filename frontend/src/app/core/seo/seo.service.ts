import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { environment } from '../../../environments/environment';

export interface SeoTags {
  /** The <title>. The site name is appended unless `exactTitle` is set. */
  title: string;
  description: string;

  /** Path only, e.g. '/articles/some-slug'. Made absolute here. */
  path: string;

  /** Path or absolute URL. Falls back to the site image. */
  image?: string | null;
  imageAlt?: string | null;

  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  author?: string | null;
  tags?: string[];

  /** Set on drafts, admin screens and filtered views. */
  noIndex?: boolean;

  exactTitle?: boolean;
}

/** JSON-LD blocks are written as plain objects and serialised here. */
type JsonLd = Record<string, unknown>;

const DEFAULT_IMAGE = '/hero section bg.png';

/**
 * Every per-page tag the crawler reads. Called once per route, from the
 * component that knows the content — so the tags are already in the HTML
 * that SSR sends, rather than being patched in after hydration.
 *
 * The rule this service exists to enforce: a self-referencing canonical.
 * A shared canonical across a template is how a whole section gets dropped
 * as duplicates of one page.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {

  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly site = environment.site;
  private readonly siteUrl = environment.siteUrl;

  /** Ids so repeated navigations replace rather than accumulate blocks. */
  private static readonly LD_ID = 'eh-jsonld';

  constructor(@Inject(DOCUMENT) private readonly doc: Document) {}

  get isServer(): boolean {
    return isPlatformServer(this.platformId);
  }

  absolute(path: string): string {
    if (!path) {
      return this.siteUrl;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Sets title, description, canonical, Open Graph and Twitter in one call. */
  apply(tags: SeoTags): void {
    const fullTitle = tags.exactTitle
      ? tags.title
      : `${tags.title} — ${this.site.name}`;

    const url = this.absolute(tags.path);
    const image = this.absolute(tags.image || DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);

    this.setName('description', tags.description);

    // A canonical that points at the URL you are on. Never a shared one.
    this.setCanonical(url);

    this.setName(
      'robots',
      tags.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    );

    // ---- Open Graph ----
    this.setProperty('og:site_name', this.site.name);
    this.setProperty('og:type', tags.type ?? 'website');
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', tags.description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setProperty('og:locale', 'en_GB');

    if (tags.imageAlt) {
      this.setProperty('og:image:alt', tags.imageAlt);
    }

    if (tags.type === 'article') {
      this.setProperty('article:published_time', tags.publishedTime ?? '');
      this.setProperty('article:modified_time', tags.modifiedTime ?? '');
      this.setProperty('article:author', tags.author ?? this.site.name);

      // Replace, never append — stale tags from the previous article
      // otherwise stack up across client-side navigations.
      this.removeAll('property="article:tag"');
      (tags.tags ?? []).forEach(tag =>
        this.meta.addTag({ property: 'article:tag', content: tag })
      );
    } else {
      this.removeAll('property^="article:"');
    }

    // ---- Twitter ----
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', fullTitle);
    this.setName('twitter:description', tags.description);
    this.setName('twitter:image', image);
  }

  // ================= JSON-LD =================

  /** Replaces every managed JSON-LD block with the ones given. */
  setJsonLd(blocks: JsonLd[]): void {
    this.doc
      .querySelectorAll(`script[data-${SeoService.LD_ID}]`)
      .forEach(node => node.remove());

    for (const block of blocks) {
      const script = this.doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute(`data-${SeoService.LD_ID}`, '');
      script.textContent = JSON.stringify(block);
      this.doc.head.appendChild(script);
    }
  }

  /**
   * The site-wide entity. Search engines and assistants reason about this,
   * so it carries the concrete facts — legal name, founding date, contact —
   * rather than just a name and a logo.
   */
  organization(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${this.siteUrl}/#organization`,
      name: this.site.name,
      legalName: this.site.legalName,
      alternateName: 'EASTHOOD',
      url: this.siteUrl,
      logo: this.absolute(DEFAULT_IMAGE),
      description: this.site.description,
      foundingDate: this.site.foundingDate,
      email: this.site.email,
      telephone: this.site.phone,
      address: {
        '@type': 'PostalAddress',
        addressLocality: this.site.locality,
        addressCountry: this.site.country
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: this.site.email,
        telephone: this.site.phone,
        areaServed: 'Worldwide',
        availableLanguage: ['en', 'ar']
      },
      sameAs: [this.site.instagram, this.site.behance].filter(
        link => link && link !== '#'
      )
    };
  }

  webSite(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${this.siteUrl}/#website`,
      url: this.siteUrl,
      name: this.site.name,
      publisher: { '@id': `${this.siteUrl}/#organization` }
    };
  }

  /** Crumbs as [label, path] pairs, in order, excluding the site root. */
  breadcrumbs(trail: { label: string; path: string }[]): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { label: 'Home', path: '/' },
        ...trail
      ].map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
        item: this.absolute(crumb.path)
      }))
    };
  }

  article(input: {
    title: string;
    description: string;
    path: string;
    image?: string | null;
    published?: string | null;
    modified?: string | null;
    author?: string | null;
    section?: string | null;
    words?: number;
  }): JsonLd {
    const url = this.absolute(input.path);

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: input.title.slice(0, 110),
      description: input.description,
      image: [this.absolute(input.image || DEFAULT_IMAGE)],
      datePublished: input.published ?? undefined,
      dateModified: input.modified ?? input.published ?? undefined,
      articleSection: input.section ?? undefined,
      wordCount: input.words ?? undefined,
      inLanguage: 'en',
      author: {
        '@type': 'Organization',
        name: input.author || this.site.name,
        url: this.siteUrl
      },
      publisher: { '@id': `${this.siteUrl}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }
    };
  }

  service(input: {
    name: string;
    description: string;
    path: string;
    offers?: {
      name: string;
      price: number;
      currency: string;
      description?: string | null;
    }[];
  }): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${this.absolute(input.path)}#service`,
      name: input.name,
      description: input.description,
      serviceType: input.name,
      provider: { '@id': `${this.siteUrl}/#organization` },
      areaServed: 'Worldwide',
      ...(input.offers?.length
        ? {
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: `${input.name} packages`,
              itemListElement: input.offers.map(offer => ({
                '@type': 'Offer',
                name: offer.name,
                price: offer.price.toFixed(2),
                priceCurrency: offer.currency,
                description: offer.description ?? undefined,
                availability: 'https://schema.org/InStock'
              }))
            }
          }
        : {})
    };
  }

  // ================= internals =================

  private setName(name: string, content: string): void {
    if (content) {
      this.meta.updateTag({ name, content });
    } else {
      this.meta.removeTag(`name="${name}"`);
    }
  }

  private setProperty(property: string, content: string): void {
    if (content) {
      this.meta.updateTag({ property, content });
    } else {
      this.meta.removeTag(`property="${property}"`);
    }
  }

  private removeAll(selector: string): void {
    this.doc
      .querySelectorAll(`meta[${selector}]`)
      .forEach(node => node.remove());
  }

  /** One canonical link element, rewritten in place. */
  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );

    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}

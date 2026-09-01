export type ArticleCategory = 'insight' | 'case-note' | 'news' | 'guide';

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  'insight',
  'case-note',
  'news',
  'guide'
];

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;

  /** Truncated to 400 chars in list responses; full only on the detail call. */
  content: string;

  coverImage: string | null;
  coverAlt: string | null;
  category: ArticleCategory;
  tags: string[];
  author: string;

  /** Falls back to title/excerpt server-side, so these are never blank. */
  metaTitle: string;
  metaDescription: string;

  readingMinutes: number;
  views: number;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Neighbour links for prev/next — real internal linking. */
export interface ArticleNeighbour {
  slug: string;
  title: string;
}

export interface ArticleDetail {
  article: Article;
  previous: ArticleNeighbour | null;
  next: ArticleNeighbour | null;
}

export interface ArticlePayload {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverAlt?: string | null;
  category: ArticleCategory;
  tags: string[];
  author?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished: boolean;
  slug?: string;
}

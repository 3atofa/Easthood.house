/** A case study. `slug` is what the public /work/:slug route resolves. */
export interface WorkProject {
  id: string;
  slug: string;
  title: string;
  client: string;
  category: string;
  year: string;
  excerpt: string;
  cover: string | null;
  services: string[];
  body: string[];
  sortOrder: number;
  isPublished: boolean;
}

export type WorkProjectPayload = Omit<WorkProject, 'id' | 'slug'> & {
  slug?: string;
};

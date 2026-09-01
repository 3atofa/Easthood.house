export type BillingPeriod = 'one-off' | 'monthly' | 'quarterly' | 'yearly';

/** A single capability, priced on its own. */
export interface ServiceItem {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  summary: string;
  deliverables: string[];
  icon: string | null;

  /** Major units, e.g. 45000. The API converts from minor units. */
  price: number;
  currency: string;

  sortOrder: number;
  isPublished: boolean;
}

/** The services as they appear nested inside a package. */
export interface PackageService {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  price?: number;
  priceMinor: number;
  currency: string;
  icon: string | null;
}

/**
 * A bundle of several services at one price.
 *
 * `price` is set by hand; `servicesTotal`, `savings` and `savingsPercent`
 * are derived server-side from the bundled services, so the client never
 * does the arithmetic itself.
 */
export interface PackageItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  features: string[];

  price: number;
  servicesTotal: number;
  savings: number;
  savingsPercent: number;

  currency: string;
  billingPeriod: BillingPeriod;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;

  services: PackageService[];
}

export interface ServicePayload {
  title: string;
  code: string | null;
  summary: string;
  deliverables: string[];
  icon: string | null;
  price: number;
  currency: string;
  sortOrder: number;
  isPublished: boolean;
  slug?: string;
}

export interface PackagePayload {
  name: string;
  description: string | null;
  features: string[];
  serviceIds: string[];
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
  slug?: string;
}

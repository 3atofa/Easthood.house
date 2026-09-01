export const environment = {
  production: true,

  apiUrl: '/api',

  /**
   * The ONE canonical origin, no trailing slash. Every canonical tag,
   * og:url and JSON-LD @id is built from this — it must match the backend's
   * SITE_URL exactly or the two disagree about what the page's URL is.
   */
  siteUrl: 'https://easthood.house',

  site: {
    name: 'EAST HOOD',
    legalName: 'EAST HOOD',
    foundingDate: '2018',
    description:
      'EAST HOOD is a branding, strategy and production house built for brands that refuse to disappear into the noise.',
    locality: 'Cairo',
    country: 'EG',
    email: 'hello@easthood.house',
    phone: '+20 100 123 4567',
    instagram: '#',
    behance: '#'
  }
};

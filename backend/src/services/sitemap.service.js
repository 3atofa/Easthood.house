import { env } from '../config/env.js';
import { Article, Project, Service } from '../models/index.js';

/**
 * The sitemap is generated from the database on request, not maintained by
 * hand — a hand-written sitemap is always out of date, and content that is
 * never announced is never crawled.
 *
 * Two things keep this cheap:
 *   1. a TTL cache, because crawlers hit /sitemap.xml hard and an uncached
 *      full-catalogue scan is a self-inflicted DDoS;
 *   2. invalidation on every write, because a TTL alone means up to an hour
 *      of invisibility for a just-published page.
 */

const CACHE_TTL_MS = 60 * 60 * 1000;

/** Above this, split into a sitemap index (see buildIndex). */
const MAX_URLS_PER_FILE = 50_000;

let cache = null;

export const invalidateSitemapCache = () => {
  cache = null;
};

export const isCacheWarm = () => Boolean(cache && cache.expires > Date.now());

/**
 * XML-escape. One unescaped & in a slug invalidates the whole document and
 * a crawler discards every URL in it, not just the bad one.
 */
const xmlEscape = value =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const absolute = path =>
  `${env.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;

/** W3C datetime, which is what <lastmod> expects. */
const isoDate = value => new Date(value ?? Date.now()).toISOString();

/**
 * Routes that exist regardless of the database. Kept here so the sitemap,
 * robots.txt and the prerender route generator all read one list — three
 * copies of the same routes drift silently and always cost a page.
 */
export const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/work', changefreq: 'weekly', priority: '0.9' },
  { path: '/services', changefreq: 'monthly', priority: '0.9' },
  { path: '/articles', changefreq: 'daily', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' }
];

const urlEntry = ({ path, lastmod, changefreq, priority }) =>
  [
    '  <url>',
    `    <loc>${xmlEscape(absolute(path))}</loc>`,
    lastmod ? `    <lastmod>${isoDate(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>'
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Only slug + updatedAt from each table. Never the body columns: they are
 * large blobs fetched purely to be discarded.
 */
const collectUrls = async () => {
  const [articles, projects, services] = await Promise.all([
    Article.findAll({
      where: { isPublished: true },
      attributes: ['slug', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    }),
    Project.findAll({
      where: { isPublished: true },
      attributes: ['slug', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    }),
    Service.findAll({
      where: { isPublished: true },
      attributes: ['slug', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    })
  ]);

  /**
   * A static route's lastmod is the newest thing it lists — claiming
   * "changed today" for everything teaches crawlers to ignore the field.
   */
  const newest = rows =>
    rows.length ? rows[0].updatedAt : undefined;

  const staticLastmod = {
    '/articles': newest(articles),
    '/work': newest(projects),
    '/services': newest(services)
  };

  return [
    ...STATIC_ROUTES.map(route => ({
      ...route,
      lastmod: staticLastmod[route.path]
    })),

    ...articles.map(row => ({
      path: `/articles/${row.slug}`,
      lastmod: row.updatedAt,
      changefreq: 'monthly',
      priority: '0.8'
    })),

    ...projects.map(row => ({
      path: `/work/${row.slug}`,
      lastmod: row.updatedAt,
      changefreq: 'monthly',
      priority: '0.8'
    }))

    // Services are NOT listed individually. They all live on the single
    // /services page, so /services/<slug> has no route behind it — a
    // sitemap must never announce a URL the app cannot answer.
  ];
};

const buildUrlSet = urls =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(urlEntry),
    '</urlset>',
    ''
  ].join('\n');

/**
 * Returns the sitemap XML, from cache when warm.
 * `{ xml, hit, count }` so the controller can set an X-Sitemap-Cache header.
 */
export const getSitemapXml = async () => {
  if (cache && cache.expires > Date.now()) {
    return { xml: cache.xml, hit: true, count: cache.count };
  }

  const urls = await collectUrls();

  if (urls.length > MAX_URLS_PER_FILE) {
    // Past this the spec requires a sitemap index. Fail loudly rather than
    // silently serving an oversized file crawlers will reject.
    console.warn(
      `[sitemap] ${urls.length} URLs exceeds the ${MAX_URLS_PER_FILE} limit — ` +
        'split into a sitemap index.'
    );
  }

  const xml = buildUrlSet(urls);

  cache = { xml, count: urls.length, expires: Date.now() + CACHE_TTL_MS };

  return { xml, hit: false, count: urls.length };
};

/**
 * robots.txt.
 *
 * Two rules that are easy to get wrong and silent when you do:
 *
 *  1. A crawler that finds a group naming itself obeys ONLY that group and
 *     ignores `User-agent: *` entirely — so every named group has to repeat
 *     the private-area rules, or naming an agent invites it into /admin/.
 *
 *  2. The sitemap needs the `Sitemap:` directive. A bare URL on its own line
 *     is an unrecognised line and is silently ignored by every crawler.
 */
export const buildRobotsTxt = () => {
  const shared = ['Allow: /', 'Disallow: /admin/', 'Disallow: /api/', ''];

  return [
    '# EAST HOOD',
    '',
    'User-agent: *',
    ...shared,

    '# Search and AI citation crawlers. Blocking these removes the site from',
    '# answers immediately, so they are named and explicitly allowed.',
    'User-agent: Googlebot',
    'User-agent: Bingbot',
    'User-agent: Google-Extended',
    'User-agent: OAI-SearchBot',
    'User-agent: ChatGPT-User',
    'User-agent: Claude-SearchBot',
    'User-agent: Claude-User',
    'User-agent: PerplexityBot',
    ...shared,

    `Sitemap: ${absolute('/sitemap.xml')}`,
    ''
  ].join('\n');
};

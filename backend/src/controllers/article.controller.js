import { Op, literal } from '../lib/sequelize.js';

import { Article } from '../models/index.js';
import { invalidateSitemapCache } from '../services/sitemap.service.js';
import { ApiError } from '../utils/ApiError.js';
import {
  paginationMeta,
  sendCreated,
  sendSuccess
} from '../utils/ApiResponse.js';
import { buildSearch, getOrder, getPagination } from '../utils/query.js';
import { slugify } from '../utils/slugify.js';
import { asyncHandler } from '../middlewares/async-handler.js';

const SORTABLE = ['publishedAt', 'createdAt', 'title', 'views'];

const EDITABLE = [
  'title',
  'excerpt',
  'content',
  'coverImage',
  'coverAlt',
  'category',
  'tags',
  'author',
  'metaTitle',
  'metaDescription',
  'isPublished'
];

/**
 * List columns. `content` is a large blob and is NEVER selected whole for a
 * list — it is truncated in SQL so the card can render a preview without
 * dragging full article HTML through Postgres and over the wire.
 */
const LIST_ATTRIBUTES = [
  'id',
  'slug',
  'title',
  'excerpt',
  'coverImage',
  'coverAlt',
  'category',
  'tags',
  'author',
  'readingMinutes',
  'views',
  'isPublished',
  'publishedAt',
  'createdAt',
  'updatedAt',
  [literal('LEFT("Article"."content", 400)'), 'content']
];

const findOr404 = async id => {
  const article = await Article.findByPk(id);

  if (!article) {
    throw ApiError.notFound('That article no longer exists.');
  }

  return article;
};

/**
 * GET /api/articles
 *
 * Public callers see published articles only. An admin token widens it to
 * drafts, so the admin list and the public list share one handler.
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, {
    defaultLimit: 12,
    maxLimit: 100
  });

  const where = {
    ...buildSearch(req.query.search, ['title', 'excerpt'])
  };

  if (!req.user) {
    where.isPublished = true;
  } else if (req.query.published === 'true' || req.query.published === 'false') {
    where.isPublished = req.query.published === 'true';
  }

  if (req.query.category && req.query.category !== 'all') {
    where.category = req.query.category;
  }

  if (req.query.tag) {
    where.tags = { [Op.contains]: [req.query.tag] };
  }

  const { rows, count } = await Article.findAndCountAll({
    where,
    attributes: LIST_ATTRIBUTES,
    order: getOrder(req.query, SORTABLE, [
      ['publishedAt', 'DESC'],
      ['createdAt', 'DESC']
    ]),
    limit,
    offset
  });

  return sendSuccess(res, {
    data: rows,
    meta: paginationMeta({ count, page, limit })
  });
});

/**
 * GET /api/articles/slugs
 *
 * Everything the prerender route generator and the sitemap need, and
 * nothing else. Deliberately uncapped — it is slug + updatedAt only, so
 * the whole catalogue is a few KB.
 */
export const slugs = asyncHandler(async (_req, res) => {
  const rows = await Article.findAll({
    where: { isPublished: true },
    attributes: ['slug', 'updatedAt'],
    order: [['publishedAt', 'DESC']]
  });

  return sendSuccess(res, {
    data: rows,
    meta: { total: rows.length, page: 1, limit: rows.length, totalPages: 1 }
  });
});

/**
 * GET /api/articles/:slug
 */
export const getBySlug = asyncHandler(async (req, res) => {
  const where = { slug: req.params.slug };

  if (!req.user) {
    where.isPublished = true;
  }

  const article = await Article.findOne({ where });

  if (!article) {
    throw ApiError.notFound('That article no longer exists.');
  }

  // increment(), not save(): save() would rewrite every dirty column —
  // including the content blob — on every page view, every crawler hit and
  // every prerender, and would lose counts under concurrency.
  if (!req.user) {
    Article.increment('views', { where: { id: article.id } }).catch(() => {});
  }

  // Neighbours for prev/next links — real internal linking, cheap columns.
  const [previous, next] = await Promise.all([
    Article.findOne({
      where: {
        isPublished: true,
        publishedAt: { [Op.lt]: article.publishedAt ?? article.createdAt }
      },
      attributes: ['slug', 'title'],
      order: [['publishedAt', 'DESC']]
    }),
    Article.findOne({
      where: {
        isPublished: true,
        publishedAt: { [Op.gt]: article.publishedAt ?? article.createdAt }
      },
      attributes: ['slug', 'title'],
      order: [['publishedAt', 'ASC']]
    })
  ]);

  return sendSuccess(res, { data: { article, previous, next } });
});

/**
 * POST /api/articles — admin
 */
export const create = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE);

  payload.slug = req.body.slug ? slugify(req.body.slug) : slugify(payload.title);

  await assertSlugFree(payload.slug);

  const article = await Article.create(payload);

  // A new URL must appear in the sitemap immediately, not after the TTL.
  invalidateSitemapCache();

  return sendCreated(res, article, 'Article created.');
});

/**
 * PUT /api/articles/:id — admin
 */
export const update = asyncHandler(async (req, res) => {
  const article = await findOr404(req.params.id);

  const payload = pick(req.body, EDITABLE);

  // Changing a slug orphans every existing link, so it is deliberate and
  // explicit — and the old URL then needs a 301 in nginx.
  if (req.body.slug && slugify(req.body.slug) !== article.slug) {
    payload.slug = slugify(req.body.slug);
    await assertSlugFree(payload.slug, article.id);
  }

  await article.update(payload);

  invalidateSitemapCache();

  return sendSuccess(res, { data: article, message: 'Article updated.' });
});

/**
 * DELETE /api/articles/:id — admin
 */
export const remove = asyncHandler(async (req, res) => {
  const article = await findOr404(req.params.id);

  await article.destroy();

  invalidateSitemapCache();

  return sendSuccess(res, { message: 'Article deleted.' });
});

// ------------------------------------------------------------------

function pick(source, keys) {
  const out = {};

  for (const key of keys) {
    if (source[key] !== undefined) {
      out[key] = source[key];
    }
  }

  return out;
}

async function assertSlugFree(slug, exceptId = null) {
  const existing = await Article.findOne({ where: { slug } });

  if (existing && existing.id !== exceptId) {
    throw ApiError.conflict('An article with that slug already exists.');
  }
}

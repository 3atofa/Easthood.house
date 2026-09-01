import { Service } from '../models/index.js';
import { invalidateSitemapCache } from '../services/sitemap.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import { buildSearch, getOrder } from '../utils/query.js';
import { slugify } from '../utils/slugify.js';
import { asyncHandler } from '../middlewares/async-handler.js';

const SORTABLE = ['sortOrder', 'createdAt', 'title'];

const EDITABLE = [
  'title',
  'code',
  'summary',
  'deliverables',
  'icon',
  'currency',
  'sortOrder',
  'isPublished'
];

/** Prices arrive in major units and are stored in minor units. */
const toMinor = value => Math.round(Number(value) * 100);

const findOr404 = async id => {
  const service = await Service.findByPk(id);

  if (!service) {
    throw ApiError.notFound('That service no longer exists.');
  }

  return service;
};

/**
 * GET /api/services — public sees published services and active packages.
 */
export const list = asyncHandler(async (req, res) => {
  const isAdmin = Boolean(req.user);

  const where = {
    ...buildSearch(req.query.search, ['title', 'summary'])
  };

  if (!isAdmin) {
    where.isPublished = true;
  }

  const services = await Service.findAll({
    where,
    order: getOrder(req.query, SORTABLE, [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC']
    ])
  });

  return sendSuccess(res, { data: services });
});

/**
 * GET /api/services/:slug — public
 */
export const getBySlug = asyncHandler(async (req, res) => {
  const isAdmin = Boolean(req.user);

  const where = { slug: req.params.slug };

  if (!isAdmin) {
    where.isPublished = true;
  }

  const service = await Service.findOne({ where });

  if (!service) {
    throw ApiError.notFound('That service no longer exists.');
  }

  return sendSuccess(res, { data: service });
});

/**
 * POST /api/services — admin
 */
export const create = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE);

  payload.priceMinor = toMinor(req.body.price ?? 0);
  payload.slug = req.body.slug ? slugify(req.body.slug) : slugify(payload.title);

  await assertSlugFree(payload.slug);

  const service = await Service.create(payload);

  // A new public URL must reach the sitemap now, not after the TTL.
  invalidateSitemapCache();

  return sendCreated(res, service, 'Service created.');
});

/**
 * PUT /api/services/:id — admin
 */
export const update = asyncHandler(async (req, res) => {
  const service = await findOr404(req.params.id);

  const payload = pick(req.body, EDITABLE);

  if (req.body.price !== undefined) {
    payload.priceMinor = toMinor(req.body.price);
  }

  if (req.body.slug) {
    payload.slug = slugify(req.body.slug);
    await assertSlugFree(payload.slug, service.id);
  }

  await service.update(payload);

  invalidateSitemapCache();

  return sendSuccess(res, { data: service, message: 'Service updated.' });
});

/**
 * DELETE /api/services/:id — admin.
 *
 * The association is ON DELETE CASCADE, so this takes the service's
 * packages with it. The client is warned before it calls this.
 */
export const remove = asyncHandler(async (req, res) => {
  const service = await findOr404(req.params.id);

  /**
   * Removing a service takes it out of any bundles that included it, but
   * leaves those bundles standing. A package that loses a service still
   * needs repricing by a person — deleting it silently would throw away
   * the studio's work.
   */
  const bundles = await service.countPackages();

  await service.destroy();

  invalidateSitemapCache();

  return sendSuccess(res, {
    message: bundles
      ? `Service deleted. ${bundles} package(s) contained it and now need repricing.`
      : 'Service deleted.'
  });
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
  const existing = await Service.findOne({ where: { slug } });

  if (existing && existing.id !== exceptId) {
    throw ApiError.conflict('A service with that slug already exists.');
  }
}

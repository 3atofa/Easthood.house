import { Package, Service, sequelize } from '../models/index.js';
import { invalidateSitemapCache } from '../services/sitemap.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import { buildSearch } from '../utils/query.js';
import { slugify } from '../utils/slugify.js';
import { asyncHandler } from '../middlewares/async-handler.js';

const EDITABLE = [
  'name',
  'description',
  'features',
  'currency',
  'billingPeriod',
  'isPopular',
  'sortOrder',
  'isActive'
];

/**
 * The bundled services always travel with a package — the price only means
 * anything next to what it replaces. `priceMinor` is included so the model's
 * toJSON can compute the total and the saving.
 */
const withServices = {
  model: Service,
  as: 'services',
  attributes: ['id', 'slug', 'code', 'title', 'priceMinor', 'currency', 'icon'],
  through: { attributes: [] }
};

const ORDER = [
  ['sortOrder', 'ASC'],
  ['priceMinor', 'ASC']
];

const findOr404 = async id => {
  const record = await Package.findByPk(id, { include: [withServices] });

  if (!record) {
    throw ApiError.notFound('That package no longer exists.');
  }

  return record;
};

/** Money arrives in major units and is stored in minor units. */
const toMinor = value => Math.round(Number(value) * 100);

/**
 * A bundle of nothing is not a bundle. Validated here as well as in the
 * validator chain, because the ids also have to exist.
 */
const resolveServices = async serviceIds => {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw ApiError.badRequest('Some fields need attention.', {
      serviceIds: 'Choose at least one service for this package.'
    });
  }

  const services = await Service.findAll({ where: { id: serviceIds } });

  if (services.length !== serviceIds.length) {
    throw ApiError.badRequest('Some fields need attention.', {
      serviceIds: 'One of those services no longer exists.'
    });
  }

  return services;
};

/**
 * GET /api/packages — public sees active packages only.
 */
export const list = asyncHandler(async (req, res) => {
  const where = { ...buildSearch(req.query.search, ['name', 'description']) };

  if (!req.user) {
    where.isActive = true;
  } else if (req.query.active === 'true' || req.query.active === 'false') {
    where.isActive = req.query.active === 'true';
  }

  const packages = await Package.findAll({
    where,
    include: [withServices],
    order: ORDER
  });

  return sendSuccess(res, { data: packages });
});

/**
 * GET /api/packages/:id
 */
export const getOne = asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await findOr404(req.params.id) })
);

/**
 * POST /api/packages — admin
 */
export const create = asyncHandler(async (req, res) => {
  const services = await resolveServices(req.body.serviceIds);

  const payload = pick(req.body, EDITABLE);

  payload.priceMinor = toMinor(req.body.price ?? 0);
  payload.slug = req.body.slug ? slugify(req.body.slug) : slugify(payload.name);

  await assertSlugFree(payload.slug);

  // One transaction: a package without its services is meaningless, so it
  // must never be possible to end up with the row but not the links.
  const created = await sequelize.transaction(async transaction => {
    const record = await Package.create(payload, { transaction });
    await record.setServices(services, { transaction });
    return record;
  });

  invalidateSitemapCache();

  return sendCreated(res, await findOr404(created.id), 'Package created.');
});

/**
 * PUT /api/packages/:id — admin
 */
export const update = asyncHandler(async (req, res) => {
  const record = await findOr404(req.params.id);

  const payload = pick(req.body, EDITABLE);

  if (req.body.price !== undefined) {
    payload.priceMinor = toMinor(req.body.price);
  }

  if (req.body.slug) {
    payload.slug = slugify(req.body.slug);
    await assertSlugFree(payload.slug, record.id);
  }

  const services =
    req.body.serviceIds !== undefined
      ? await resolveServices(req.body.serviceIds)
      : null;

  await sequelize.transaction(async transaction => {
    await record.update(payload, { transaction });

    if (services) {
      await record.setServices(services, { transaction });
    }
  });

  invalidateSitemapCache();

  return sendSuccess(res, {
    data: await findOr404(record.id),
    message: 'Package updated.'
  });
});

/**
 * DELETE /api/packages/:id — admin
 */
export const remove = asyncHandler(async (req, res) => {
  const record = await findOr404(req.params.id);

  await record.destroy();

  invalidateSitemapCache();

  return sendSuccess(res, { message: 'Package deleted.' });
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
  const existing = await Package.findOne({ where: { slug } });

  if (existing && existing.id !== exceptId) {
    throw ApiError.conflict('A package with that name already exists.');
  }
}

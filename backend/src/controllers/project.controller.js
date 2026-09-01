import { Project } from '../models/index.js';
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

const SORTABLE = ['sortOrder', 'createdAt', 'title', 'year'];

const EDITABLE = [
  'title',
  'client',
  'category',
  'year',
  'excerpt',
  'cover',
  'services',
  'body',
  'sortOrder',
  'isPublished'
];

const findOr404 = async id => {
  const project = await Project.findByPk(id);

  if (!project) {
    throw ApiError.notFound('That project no longer exists.');
  }

  return project;
};

/**
 * GET /api/projects  — public sees published only, admin sees everything.
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, { defaultLimit: 50 });

  const where = {
    ...buildSearch(req.query.search, ['title', 'client', 'category'])
  };

  // req.user is set only behind authenticate, so this is the public/admin
  // switch without needing two separate handlers.
  if (!req.user) {
    where.isPublished = true;
  } else if (req.query.published === 'true' || req.query.published === 'false') {
    where.isPublished = req.query.published === 'true';
  }

  const { rows, count } = await Project.findAndCountAll({
    where,
    order: getOrder(req.query, SORTABLE, [
      ['sortOrder', 'ASC'],
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
 * GET /api/projects/:slug  — public. Looked up by slug, not id, so the
 * case-study URLs stay readable.
 */
export const getBySlug = asyncHandler(async (req, res) => {
  const where = { slug: req.params.slug };

  if (!req.user) {
    where.isPublished = true;
  }

  const project = await Project.findOne({ where });

  if (!project) {
    throw ApiError.notFound('That project no longer exists.');
  }

  return sendSuccess(res, { data: project });
});

/**
 * POST /api/projects  — admin
 */
export const create = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE);

  payload.slug = req.body.slug
    ? slugify(req.body.slug)
    : slugify(payload.title);

  await assertSlugFree(payload.slug);

  const project = await Project.create(payload);

  // A new public URL must reach the sitemap now, not after the TTL.
  invalidateSitemapCache();

  return sendCreated(res, project, 'Project created.');
});

/**
 * PUT /api/projects/:id  — admin
 */
export const update = asyncHandler(async (req, res) => {
  const project = await findOr404(req.params.id);

  const payload = pick(req.body, EDITABLE);

  if (req.body.slug) {
    payload.slug = slugify(req.body.slug);
    await assertSlugFree(payload.slug, project.id);
  }

  await project.update(payload);

  invalidateSitemapCache();

  return sendSuccess(res, { data: project, message: 'Project updated.' });
});

/**
 * DELETE /api/projects/:id  — admin
 */
export const remove = asyncHandler(async (req, res) => {
  const project = await findOr404(req.params.id);

  await project.destroy();

  invalidateSitemapCache();

  return sendSuccess(res, { message: 'Project deleted.' });
});

/**
 * PATCH /api/projects/reorder  — admin. Takes [{ id, sortOrder }] and
 * writes them in one transaction so the list can never be half-reordered.
 */
export const reorder = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) {
    throw ApiError.badRequest('Nothing to reorder.');
  }

  await Project.sequelize.transaction(async transaction =>
    Promise.all(
      items.map(({ id, sortOrder }) =>
        Project.update({ sortOrder }, { where: { id }, transaction })
      )
    )
  );

  return sendSuccess(res, { message: 'Order saved.' });
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
  const existing = await Project.findOne({ where: { slug } });

  if (existing && existing.id !== exceptId) {
    throw ApiError.conflict('A project with that slug already exists.');
  }
}

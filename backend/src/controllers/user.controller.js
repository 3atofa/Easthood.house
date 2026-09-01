import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import {
  paginationMeta,
  sendCreated,
  sendSuccess
} from '../utils/ApiResponse.js';
import { buildSearch, getOrder, getPagination } from '../utils/query.js';
import { asyncHandler } from '../middlewares/async-handler.js';

const SORTABLE = ['createdAt', 'name', 'email', 'role', 'lastLoginAt'];

const findOr404 = async id => {
  const user = await User.findByPk(id);

  if (!user) {
    throw ApiError.notFound('That user no longer exists.');
  }

  return user;
};

/**
 * GET /api/users — admin
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);

  const where = { ...buildSearch(req.query.search, ['name', 'email']) };

  if (req.query.role && req.query.role !== 'all') {
    where.role = req.query.role;
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    order: getOrder(req.query, SORTABLE),
    limit,
    offset
  });

  return sendSuccess(res, {
    data: rows,
    meta: paginationMeta({ count, page, limit })
  });
});

/**
 * GET /api/users/:id — admin
 */
export const getOne = asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await findOr404(req.params.id) })
);

/**
 * POST /api/users — admin
 */
export const create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const user = await User.create({ name, email, password, role });

  return sendCreated(res, user.toJSON(), 'User created.');
});

/**
 * PUT /api/users/:id — admin
 */
export const update = asyncHandler(async (req, res) => {
  const user = await findOr404(req.params.id);

  const { name, email, role, isActive, password } = req.body;

  // An admin locking or demoting themselves would leave the portal
  // unreachable, so both are refused rather than silently allowed.
  if (user.id === req.user.id) {
    if (role !== undefined && role !== user.role) {
      throw ApiError.badRequest('You cannot change your own role.');
    }

    if (isActive === false) {
      throw ApiError.badRequest('You cannot deactivate your own account.');
    }
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) user.password = password;

  await user.save();

  return sendSuccess(res, { data: user.toJSON(), message: 'User updated.' });
});

/**
 * DELETE /api/users/:id — admin
 */
export const remove = asyncHandler(async (req, res) => {
  const user = await findOr404(req.params.id);

  if (user.id === req.user.id) {
    throw ApiError.badRequest('You cannot delete your own account.');
  }

  const admins = await User.count({ where: { role: 'admin', isActive: true } });

  if (user.role === 'admin' && admins <= 1) {
    throw ApiError.badRequest(
      'This is the last active admin — promote someone else first.'
    );
  }

  await user.destroy();

  return sendSuccess(res, { message: 'User deleted.' });
});

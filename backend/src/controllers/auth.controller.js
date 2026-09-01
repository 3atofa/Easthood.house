import { User } from '../models/index.js';
import {
  issueTokens,
  verifyRefreshToken
} from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../middlewares/async-handler.js';

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // withPassword — the default scope hides the hash.
  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).trim().toLowerCase() }
  });

  // Same message either way: telling an attacker which half was wrong
  // turns the login form into an account-enumeration tool.
  const invalid = ApiError.unauthorized('Invalid email or password.');

  if (!user) {
    throw invalid;
  }

  if (!(await user.verifyPassword(password))) {
    throw invalid;
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return sendSuccess(res, {
    message: 'Signed in.',
    data: {
      user: user.toJSON(),
      ...issueTokens(user)
    }
  });
});

/**
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token missing.');
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token expired or invalid.');
  }

  const user = await User.findByPk(payload.sub);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is no longer active.');
  }

  return sendSuccess(res, {
    message: 'Token refreshed.',
    data: { user: user.toJSON(), ...issueTokens(user) }
  });
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) =>
  sendSuccess(res, { data: { user: req.user.toJSON() } })
);

/**
 * PATCH /api/auth/password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.scope('withPassword').findByPk(req.user.id);

  if (!(await user.verifyPassword(currentPassword))) {
    throw ApiError.badRequest('Some fields need attention.', {
      currentPassword: 'That is not your current password.'
    });
  }

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, { message: 'Password updated.' });
});

/**
 * POST /api/auth/logout
 *
 * Tokens are stateless, so this exists for the client to call and for a
 * token denylist to hook into later. It always succeeds.
 */
export const logout = asyncHandler(async (_req, res) =>
  sendSuccess(res, { message: 'Signed out.' })
);

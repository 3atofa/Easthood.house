import { User } from '../models/index.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from './async-handler.js';

/**
 * Requires a valid access token and loads the user behind it.
 *
 * The token is only a claim; the account is re-checked on every request so
 * a deactivated admin loses access immediately rather than when their
 * token happens to expire.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null;

  if (!token) {
    throw ApiError.unauthorized('Authentication token missing.');
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid.');
  }

  const user = await User.findByPk(payload.sub);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is no longer active.');
  }

  req.user = user;

  next();
});

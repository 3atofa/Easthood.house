import { User } from '../models/index.js';
import { verifyAccessToken } from '../services/token.service.js';

/**
 * Sets req.user when a valid token happens to be present, and does nothing
 * when it is not. Public list endpoints use this to widen what an admin
 * sees (drafts, inactive packages) without needing a second route.
 *
 * Never use this to protect anything — that is authenticate's job.
 */
export const optionalAuth = async (req, _res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next();
  }

  try {
    const payload = verifyAccessToken(header.slice(7).trim());
    const user = await User.findByPk(payload.sub);

    if (user?.isActive) {
      req.user = user;
    }
  } catch {
    // An invalid token on a public route is simply an anonymous visitor.
  }

  next();
};

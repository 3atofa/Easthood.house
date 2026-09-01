import { ApiError } from '../utils/ApiError.js';

/**
 * Role gate. Always used AFTER authenticate:
 *
 *   router.delete('/:id', authenticate, authorize('admin'), remove)
 */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }

  if (roles.length && !roles.includes(req.user.role)) {
    return next(
      ApiError.forbidden('Your role does not permit this action.')
    );
  }

  next();
};

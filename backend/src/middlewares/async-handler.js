/**
 * Wraps an async route handler so a rejected promise reaches Express's
 * error handler instead of hanging the request. Every controller below
 * is wrapped in this.
 */
export const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

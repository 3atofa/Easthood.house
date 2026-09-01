import {
  BaseError as SequelizeBaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError
} from '../lib/sequelize.js';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * The single place a failure becomes a response. Everything the client
 * sees goes through here, so the error envelope always matches the
 * success envelope: { success, message, details }.
 */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg shape
export const errorHandler = (err, req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong.';
  let details = err.details || null;

  // ---- Sequelize: turn database complaints into field-level messages ----
  if (err instanceof SequelizeValidationError) {
    status = 400;
    message = 'Some fields need attention.';
    details = Object.fromEntries(
      err.errors.map(e => [e.path, e.message])
    );
  }

  if (err instanceof UniqueConstraintError) {
    status = 409;
    message = 'That value is already taken.';
    details = Object.fromEntries(
      err.errors.map(e => [e.path, `${e.path} is already in use.`])
    );
  }

  if (err instanceof ForeignKeyConstraintError) {
    status = 409;
    message = 'That record is still referenced by something else.';
  }

  if (err instanceof SequelizeBaseError && status === 500) {
    // A database fault the client can do nothing about — do not leak SQL.
    message = 'A database error occurred.';
  }

  // ---- Never hand an internal message to the client in production ----
  if (status >= 500 && env.isProduction) {
    message = 'Something went wrong.';
    details = null;
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.isProduction ? {} : { stack: err.stack })
  });
};

export { ApiError };

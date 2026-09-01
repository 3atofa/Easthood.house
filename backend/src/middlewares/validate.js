import { validationResult } from 'express-validator';

import { ApiError } from '../utils/ApiError.js';

/**
 * Runs after a validator chain and turns express-validator's output into
 * one 400 with a field->message map the Angular forms can display directly.
 */
export const validate = (req, _res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const details = {};

  for (const error of result.array()) {
    const field = error.path ?? error.param ?? '_';

    if (!details[field]) {
      details[field] = error.msg;
    }
  }

  next(ApiError.badRequest('Some fields need attention.', details));
};

import { Router } from 'express';

import {
  create,
  getBySlug,
  list,
  remove,
  update
} from '../controllers/service.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { optionalAuth } from '../middlewares/optional-auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createServiceRules,
  idRule,
  updateServiceRules
} from '../validators/service.validator.js';

export const serviceRouter = Router();

// ---- public (packages come nested on each service) ----
serviceRouter.get('/', optionalAuth, list);
serviceRouter.get('/:slug', optionalAuth, getBySlug);

// ---- admin ----
serviceRouter.post('/', authenticate, createServiceRules, validate, create);
serviceRouter.put('/:id', authenticate, updateServiceRules, validate, update);
serviceRouter.delete('/:id', authenticate, idRule, validate, remove);

import { Router } from 'express';

import {
  create,
  getOne,
  list,
  remove,
  update
} from '../controllers/package.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { optionalAuth } from '../middlewares/optional-auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createPackageRules,
  idRule,
  updatePackageRules
} from '../validators/package.validator.js';

export const packageRouter = Router();

// Public callers get active packages only; an admin token returns all.
packageRouter.get('/', optionalAuth, list);

packageRouter.get('/:id', authenticate, idRule, validate, getOne);
packageRouter.post('/', authenticate, createPackageRules, validate, create);
packageRouter.put('/:id', authenticate, updatePackageRules, validate, update);
packageRouter.delete('/:id', authenticate, idRule, validate, remove);

import { Router } from 'express';

import {
  create,
  getBySlug,
  list,
  remove,
  reorder,
  update
} from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { optionalAuth } from '../middlewares/optional-auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createProjectRules,
  idRule,
  updateProjectRules
} from '../validators/project.validator.js';

export const projectRouter = Router();

// ---- public (an admin token widens the result to include drafts) ----
projectRouter.get('/', optionalAuth, list);

// Declared before '/:slug' so "reorder" is never read as a slug.
projectRouter.patch('/reorder', authenticate, reorder);

projectRouter.get('/:slug', optionalAuth, getBySlug);

// ---- admin ----
projectRouter.post('/', authenticate, createProjectRules, validate, create);
projectRouter.put('/:id', authenticate, updateProjectRules, validate, update);
projectRouter.delete('/:id', authenticate, idRule, validate, remove);

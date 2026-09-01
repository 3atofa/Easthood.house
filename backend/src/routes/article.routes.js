import { Router } from 'express';

import {
  create,
  getBySlug,
  list,
  remove,
  slugs,
  update
} from '../controllers/article.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { optionalAuth } from '../middlewares/optional-auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createArticleRules,
  idRule,
  updateArticleRules
} from '../validators/article.validator.js';

export const articleRouter = Router();

// ---- public (an admin token widens the result to include drafts) ----
articleRouter.get('/', optionalAuth, list);

// Declared BEFORE '/:slug' so "slugs" is never read as an article slug.
articleRouter.get('/slugs', slugs);

articleRouter.get('/:slug', optionalAuth, getBySlug);

// ---- admin ----
articleRouter.post('/', authenticate, createArticleRules, validate, create);
articleRouter.put('/:id', authenticate, updateArticleRules, validate, update);
articleRouter.delete('/:id', authenticate, idRule, validate, remove);

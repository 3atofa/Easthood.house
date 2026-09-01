import { Router } from 'express';

import {
  create,
  getOne,
  list,
  remove,
  stats,
  update
} from '../controllers/contact.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { contactLimiter } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';
import {
  createContactRules,
  idRule,
  updateContactRules
} from '../validators/contact.validator.js';

export const contactRouter = Router();

// ---- public ----
contactRouter.post('/', contactLimiter, createContactRules, validate, create);

// ---- admin ----
contactRouter.use(authenticate);

contactRouter.get('/stats', stats);
contactRouter.get('/', list);
contactRouter.get('/:id', idRule, validate, getOne);
contactRouter.patch('/:id', updateContactRules, validate, update);
contactRouter.delete('/:id', authorize('admin'), idRule, validate, remove);

import { Router } from 'express';

import {
  create,
  getOne,
  list,
  remove,
  update
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import {
  createUserRules,
  idRule,
  updateUserRules
} from '../validators/user.validator.js';

export const userRouter = Router();

// Managing accounts is an admin-only concern — editors never see this.
userRouter.use(authenticate, authorize('admin'));

userRouter.get('/', list);
userRouter.get('/:id', idRule, validate, getOne);
userRouter.post('/', createUserRules, validate, create);
userRouter.put('/:id', updateUserRules, validate, update);
userRouter.delete('/:id', idRule, validate, remove);

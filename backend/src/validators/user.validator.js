import { body, param } from 'express-validator';

import { USER_ROLES } from '../models/user.model.js';

const passwordChain = chain =>
  chain
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[a-z]/).withMessage('Include at least one lowercase letter.')
    .matches(/[A-Z]/).withMessage('Include at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Include at least one number.');

export const createUserRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Name is required.'),

  body('email')
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  passwordChain(body('password')),

  body('role').optional().isIn(USER_ROLES).withMessage('Unknown role.')
];

export const updateUserRules = [
  param('id').isUUID().withMessage('Invalid id.'),

  body('name').optional().trim().isLength({ min: 2, max: 120 }),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  // Only validated when a new password is actually being set.
  passwordChain(body('password').optional({ checkFalsy: true })),

  body('role').optional().isIn(USER_ROLES).withMessage('Unknown role.'),
  body('isActive').optional().isBoolean()
];

export const idRule = [param('id').isUUID().withMessage('Invalid id.')];

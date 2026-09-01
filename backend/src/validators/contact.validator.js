import { body, param } from 'express-validator';

import {
  CONTACT_STATUSES,
  PROJECT_TYPES
} from '../models/contact-request.model.js';

export const createContactRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Enter your name.'),

  body('email')
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  /**
   * Deliberately permissive. Phone formats differ wildly by country and a
   * strict pattern rejects real numbers — which, on a contact form, means
   * losing the enquiry rather than catching a typo. Check the shape only:
   * digits, and the punctuation people actually type.
   */
  body('phone')
    .trim()
    .customSanitizer(value => String(value ?? '').replace(/\s+/g, ' '))
    .matches(/^\+?[\d\s()./-]{6,32}$/)
    .withMessage('Enter a phone number we can reach you on.')
    .custom(value => (value.match(/\d/g) || []).length >= 6)
    .withMessage('That does not look like enough digits for a phone number.'),

  body('projectType')
    .isIn(PROJECT_TYPES)
    .withMessage('Choose a project type.'),

  body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Tell us a little more about the project.')
];

export const updateContactRules = [
  param('id').isUUID().withMessage('Invalid id.'),

  body('status')
    .optional()
    .isIn(CONTACT_STATUSES)
    .withMessage('Unknown status.'),

  body('adminNote')
    .optional({ nullable: true })
    .isLength({ max: 5000 })
    .withMessage('Note is too long.')
];

export const idRule = [param('id').isUUID().withMessage('Invalid id.')];

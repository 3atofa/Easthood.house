import { body, param } from 'express-validator';

import { BILLING_PERIODS } from '../models/package.model.js';

const packageRules = ({ optional }) => {
  const field = chain => (optional ? chain.optional() : chain);

  return [
    field(
      body('name')
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage('Package name is required.')
    ),

    // A bundle of nothing is not a bundle.
    field(
      body('serviceIds')
        .isArray({ min: 1 })
        .withMessage('Choose at least one service for this package.')
    ),

    body('serviceIds.*')
      .optional()
      .isUUID()
      .withMessage('One of those services is not valid.'),

    field(
      body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be zero or more.')
    ),

    body('slug').optional().trim().isLength({ max: 160 }),

    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 2000 }),

    body('features')
      .optional()
      .isArray()
      .withMessage('Features must be a list.'),

    body('currency')
      .optional()
      .trim()
      .isLength({ min: 3, max: 3 })
      .withMessage('Use a 3-letter currency code, e.g. EGP.'),

    body('billingPeriod')
      .optional()
      .isIn(BILLING_PERIODS)
      .withMessage('Unknown billing period.'),

    body('isPopular').optional().isBoolean(),
    body('sortOrder').optional().isInt(),
    body('isActive').optional().isBoolean()
  ];
};

export const createPackageRules = packageRules({ optional: false });

export const updatePackageRules = [
  param('id').isUUID().withMessage('Invalid id.'),
  ...packageRules({ optional: true })
];

export const idRule = [param('id').isUUID().withMessage('Invalid id.')];

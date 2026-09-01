import { body, param } from 'express-validator';

const serviceRules = ({ optional }) => {
  const field = chain => (optional ? chain.optional() : chain);

  return [
    field(
      body('title')
        .trim()
        .isLength({ min: 2, max: 160 })
        .withMessage('Title is required.')
    ),

    field(
      body('summary')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Write a short summary (10-1000 characters).')
    ),

    field(
      body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be zero or more.')
    ),

    body('currency')
      .optional()
      .trim()
      .isLength({ min: 3, max: 3 })
      .withMessage('Use a 3-letter currency code, e.g. EGP.'),

    body('code').optional({ nullable: true }).trim().isLength({ max: 8 }),
    body('slug').optional().trim().isLength({ max: 160 }),
    body('icon').optional({ nullable: true }).trim().isLength({ max: 60 }),

    body('deliverables')
      .optional()
      .isArray()
      .withMessage('Deliverables must be a list.'),

    body('sortOrder').optional().isInt(),
    body('isPublished').optional().isBoolean()
  ];
};

export const createServiceRules = serviceRules({ optional: false });

export const updateServiceRules = [
  param('id').isUUID().withMessage('Invalid id.'),
  ...serviceRules({ optional: true })
];

export const idRule = [param('id').isUUID().withMessage('Invalid id.')];

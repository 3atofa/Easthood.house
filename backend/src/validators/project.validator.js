import { body, param } from 'express-validator';

/**
 * Built by a factory rather than shared constants: express-validator
 * chains are mutable, so calling .optional() on a shared array would make
 * the CREATE rules optional too. Every call returns fresh chains.
 */
const projectRules = ({ optional }) => {
  const field = chain => (optional ? chain.optional() : chain);

  return [
    field(
      body('title')
        .trim()
        .isLength({ min: 2, max: 160 })
        .withMessage('Title is required.')
    ),

    field(
      body('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required.')
    ),

    field(
      body('year')
        .trim()
        .matches(/^\d{4}(-\d{4})?$/)
        .withMessage('Use a year like 2026, or a range like 2025-2026.')
    ),

    field(
      body('excerpt')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Write a short excerpt (10-500 characters).')
    ),

    body('client').optional().trim().isLength({ max: 160 }),
    body('slug').optional().trim().isLength({ max: 160 }),
    body('cover').optional({ nullable: true }).trim().isLength({ max: 255 }),

    body('services')
      .optional()
      .isArray()
      .withMessage('Services must be a list.'),

    body('body')
      .optional()
      .isArray()
      .withMessage('Body must be a list of paragraphs.'),

    body('sortOrder')
      .optional()
      .isInt()
      .withMessage('Sort order must be a number.'),

    body('isPublished').optional().isBoolean()
  ];
};

export const createProjectRules = projectRules({ optional: false });

export const updateProjectRules = [
  param('id').isUUID().withMessage('Invalid id.'),
  ...projectRules({ optional: true })
];

export const idRule = [param('id').isUUID().withMessage('Invalid id.')];

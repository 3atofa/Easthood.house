import { body, param } from 'express-validator';

import { ARTICLE_CATEGORIES } from '../models/article.model.js';

/**
 * Built by a factory: express-validator chains are mutable, so calling
 * .optional() on a shared array would make the CREATE rules optional too.
 */
const articleRules = ({ optional }) => {
  const field = chain => (optional ? chain.optional() : chain);

  return [
    field(
      body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title is required (3-200 characters).')
    ),

    field(
      body('excerpt')
        .trim()
        .isLength({ min: 20, max: 500 })
        .withMessage('Write an excerpt of 20-500 characters.')
    ),

    field(
      body('content')
        .trim()
        .isLength({ min: 50 })
        .withMessage('The article body is too short.')
    ),

    body('slug').optional().trim().isLength({ max: 180 }),

    // Enforced at the editor, not the database: a site-wide fallback image
    // makes every share look identical.
    field(
      body('coverImage')
        .trim()
        .notEmpty()
        .withMessage('A cover image is required — it is the og:image.')
    ),

    body('coverAlt').optional({ nullable: true }).trim().isLength({ max: 255 }),

    body('category')
      .optional()
      .isIn(ARTICLE_CATEGORIES)
      .withMessage('Unknown category.'),

    body('tags').optional().isArray().withMessage('Tags must be a list.'),

    body('author').optional().trim().isLength({ max: 120 }),

    // Truncated, not rejected, would be worse: a title cut mid-word looks
    // broken in results, so the limits are enforced here.
    body('metaTitle')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 70 })
      .withMessage('Meta title should be 70 characters or fewer.'),

    body('metaDescription')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 180 })
      .withMessage('Meta description should be 180 characters or fewer.'),

    body('isPublished').optional().isBoolean()
  ];
};

export const createArticleRules = articleRules({ optional: false });

export const updateArticleRules = [
  param('id').isUUID().withMessage('Invalid id.'),
  ...articleRules({ optional: true })
];

export const idRule = [param('id').isUUID().withMessage('Invalid id.')];

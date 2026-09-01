import { ContactRequest } from '../models/index.js';
import {
  sendContactAcknowledgement,
  sendContactNotification
} from '../services/mail.service.js';
import { ApiError } from '../utils/ApiError.js';
import {
  paginationMeta,
  sendCreated,
  sendSuccess
} from '../utils/ApiResponse.js';
import { buildSearch, getOrder, getPagination } from '../utils/query.js';
import { asyncHandler } from '../middlewares/async-handler.js';

const SORTABLE = ['createdAt', 'name', 'status', 'projectType'];

const findOr404 = async id => {
  const record = await ContactRequest.findByPk(id);

  if (!record) {
    throw ApiError.notFound('That enquiry no longer exists.');
  }

  return record;
};

/**
 * POST /api/contact  — public
 */
export const create = asyncHandler(async (req, res) => {
  const { name, email, phone, projectType, message } = req.body;

  const request = await ContactRequest.create({
    name,
    email,
    phone,
    projectType,
    message
  });

  // Mail is best-effort: the enquiry is already saved, so a dead SMTP
  // account must not turn into an error for the visitor.
  await Promise.allSettled([
    sendContactNotification(request),
    sendContactAcknowledgement(request)
  ]);

  return sendCreated(
    res,
    { id: request.id },
    "Thank you — your brand called. We'll answer."
  );
});

/**
 * GET /api/contact  — admin
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);

  const where = {
    ...buildSearch(req.query.search, ['name', 'email', 'phone', 'message'])
  };

  if (req.query.status && req.query.status !== 'all') {
    where.status = req.query.status;
  }

  if (req.query.projectType && req.query.projectType !== 'all') {
    where.projectType = req.query.projectType;
  }

  const { rows, count } = await ContactRequest.findAndCountAll({
    where,
    order: getOrder(req.query, SORTABLE),
    limit,
    offset
  });

  return sendSuccess(res, {
    data: rows,
    meta: paginationMeta({ count, page, limit })
  });
});

/**
 * GET /api/contact/stats  — admin. Powers the dashboard tiles.
 */
export const stats = asyncHandler(async (_req, res) => {
  const grouped = await ContactRequest.findAll({
    attributes: [
      'status',
      // col('id'), not '*' — fn() binds a bare string as a literal, which
      // would emit COUNT('*') and count every row identically.
      [
        ContactRequest.sequelize.fn(
          'COUNT',
          ContactRequest.sequelize.col('id')
        ),
        'count'
      ]
    ],
    group: ['status'],
    raw: true
  });

  const byStatus = Object.fromEntries(
    grouped.map(row => [row.status, Number(row.count)])
  );

  return sendSuccess(res, {
    data: {
      total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
      new: byStatus.new ?? 0,
      inReview: byStatus['in-review'] ?? 0,
      replied: byStatus.replied ?? 0,
      archived: byStatus.archived ?? 0
    }
  });
});

/**
 * GET /api/contact/:id  — admin
 */
export const getOne = asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await findOr404(req.params.id) })
);

/**
 * PATCH /api/contact/:id  — admin. Status and internal note only; the
 * visitor's own words are never editable.
 */
export const update = asyncHandler(async (req, res) => {
  const request = await findOr404(req.params.id);

  const { status, adminNote } = req.body;

  if (status !== undefined) {
    request.status = status;

    if (status === 'replied' && !request.repliedAt) {
      request.repliedAt = new Date();
    }
  }

  if (adminNote !== undefined) {
    request.adminNote = adminNote;
  }

  await request.save();

  return sendSuccess(res, { data: request, message: 'Enquiry updated.' });
});

/**
 * DELETE /api/contact/:id  — admin
 */
export const remove = asyncHandler(async (req, res) => {
  const request = await findOr404(req.params.id);

  await request.destroy();

  return sendSuccess(res, { message: 'Enquiry deleted.' });
});

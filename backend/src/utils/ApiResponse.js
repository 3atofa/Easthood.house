/**
 * One response envelope for the whole API, so the Angular client can read
 * every success the same way: { success, message, data, meta }.
 */
export const sendSuccess = (
  res,
  { data = null, message = 'OK', meta = undefined, status = 200 } = {}
) =>
  res.status(status).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {})
  });

export const sendCreated = (res, data, message = 'Created') =>
  sendSuccess(res, { data, message, status: 201 });

/** Pagination meta from the shape Sequelize's findAndCountAll returns. */
export const paginationMeta = ({ count, page, limit }) => ({
  total: count,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(count / limit))
});

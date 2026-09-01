import { Op } from '../lib/sequelize.js';

/** Clamped page/limit so a client cannot ask for a million rows. */
export const getPagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);

  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit)
  );

  return { page, limit, offset: (page - 1) * limit };
};

/**
 * Only allows sorting by a column we named — otherwise `?sort=` becomes a
 * way to probe the schema.
 */
export const getOrder = (query, allowed, fallback = [['createdAt', 'DESC']]) => {
  const field = query.sortBy;
  const dir = String(query.sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return allowed.includes(field) ? [[field, dir]] : fallback;
};

/** Case-insensitive OR search across the given columns. */
export const buildSearch = (term, fields) => {
  const value = String(term || '').trim();

  if (!value) {
    return {};
  }

  return {
    [Op.or]: fields.map(field => ({
      [field]: { [Op.iLike]: `%${value}%` }
    }))
  };
};

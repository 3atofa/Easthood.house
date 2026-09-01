import { sequelize } from '../models/index.js';

/**
 * Creates or updates the tables from the models.
 *
 *   npm run db:sync            -> alter existing tables in place
 *   npm run db:sync -- --force -> DROP every table and recreate
 *
 * `alter` is fine for building the site out. Once real enquiries exist,
 * move to real migrations rather than letting sync guess.
 */
const force = process.argv.includes('--force');

const run = async () => {
  try {
    await sequelize.authenticate();

    if (force) {
      console.warn('[db] --force: dropping and recreating ALL tables');
    }

    await sequelize.sync(force ? { force: true } : { alter: true });

    console.log('[db] schema synchronised.');
    process.exit(0);
  } catch (error) {
    console.error('[db] sync failed:', error.message);
    process.exit(1);
  }
};

run();

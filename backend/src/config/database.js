import { Sequelize } from '../lib/sequelize.js';

import { env } from './env.js';

export const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.password,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: 'postgres',

    logging: env.isProduction ? false : msg => console.log(`[sql] ${msg}`),

    define: {
      // created_at / updated_at rather than createdAt / updatedAt in Postgres,
      // while the JS side keeps camelCase.
      underscored: true,
      freezeTableName: false
    },

    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const connectDatabase = async () => {
  await sequelize.authenticate();

  console.log(
    `[db] connected to ${env.db.name} at ${env.db.host}:${env.db.port}`
  );
};

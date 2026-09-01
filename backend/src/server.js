import { connectDatabase, sequelize } from './config/database.js';
import { env } from './config/env.js';
import { createApp } from './app.js';

// Importing the registry defines every model and its associations.
import './models/index.js';

const start = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('[db] connection failed:', error.message);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(
      `[api] EAST HOOD API listening on http://localhost:${env.port}/api (${env.nodeEnv})`
    );
  });

  // ---- shut down without dropping in-flight requests ----
  const shutdown = signal => async () => {
    console.log(`\n[api] ${signal} received, shutting down…`);

    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });

    // Do not hang for ever on a stuck connection.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));

  process.on('unhandledRejection', reason => {
    console.error('[api] unhandled rejection:', reason);
  });
};

start();

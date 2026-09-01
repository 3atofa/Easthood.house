import { Router } from 'express';

import { articleRouter } from './article.routes.js';
import { authRouter } from './auth.routes.js';
import { contactRouter } from './contact.routes.js';
import { packageRouter } from './package.routes.js';
import { projectRouter } from './project.routes.js';
import { seoRouter } from './seo.routes.js';
import { serviceRouter } from './service.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) =>
  res.json({ success: true, message: 'EAST HOOD API is up.', data: { uptime: process.uptime() } })
);

// Crawler-facing, mounted first so nothing shadows them.
apiRouter.use('/', seoRouter);

apiRouter.use('/auth', authRouter);
apiRouter.use('/articles', articleRouter);
apiRouter.use('/contact', contactRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/services', serviceRouter);
apiRouter.use('/packages', packageRouter);
apiRouter.use('/users', userRouter);

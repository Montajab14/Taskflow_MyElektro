const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const openapi = require('./docs/openapi');
const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const statsRoutes = require('./routes/stats.routes');
const habitRoutes = require('./routes/habit.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { createAuthLimiter } = require('./middlewares/rateLimit');

/**
 * options.authRateLimit permet aux tests de choisir leur propre limite ;
 * sinon, celle de la configuration (variables AUTH_RATE_LIMIT_*).
 */
function createApp(options = {}) {
  const app = express();
  const authLimiter = createAuthLimiter(options.authRateLimit || config.authRateLimit);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/api/docs.json', (req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/habits', habitRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

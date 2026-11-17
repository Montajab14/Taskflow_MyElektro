const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

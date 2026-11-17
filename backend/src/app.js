const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  return app;
}

module.exports = createApp;

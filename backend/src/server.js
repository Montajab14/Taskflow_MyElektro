const config = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');

async function start() {
  await connectDB(config.mongoUri);
  console.log('MongoDB connecté');

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API TaskFlow sur http://localhost:${config.port}`);
    console.log(`Documentation : http://localhost:${config.port}/api/docs`);
  });
}

start().catch((err) => {
  console.error('Démarrage impossible :', err.message);
  process.exit(1);
});

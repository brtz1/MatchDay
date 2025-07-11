import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import importRoutes from './routes/importRoute';
import { initializeGameState } from './services/gameState';

// Parse PORT from environment or default to 4000
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Mount import routes
app.use('/api/import', importRoutes);

// Bootstrap server
async function startServer() {
  // Ensure a GameState record exists
  try {
    await initializeGameState();
    console.log('✅ GameState initialized');
  } catch (error) {
    console.error('❌ Failed to initialize GameState:', error);
  }

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`🚀 MatchDay! backend running on port ${PORT}`);
  });
}

startServer();

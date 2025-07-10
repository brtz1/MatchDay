// server.ts

import app from './app';
import importRoutes from './routes/importRoute';
import { initializeGameState } from './services/gameState';

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Auto-create GameState record on boot if missing
  try {
    await initializeGameState();
    console.log('✅ GameState initialized');
  } catch (err) {
    console.error('❌ Failed to initialize GameState:', err);
  }

  app.use('/api/import', importRoutes);
});

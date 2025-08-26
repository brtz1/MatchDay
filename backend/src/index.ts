// backend/src/index.ts
import "module-alias/register";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { ensureGameState } from "./services/gameState";
import { initSocket } from "./sockets/io"; // ✅ singleton initializer

async function main() {
  try {
    await ensureGameState();
  } catch (err) {
    console.error("❌ Cannot ensure GameState. Likely DB not migrated yet.");
    throw err;
  }

  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  const httpServer = http.createServer(app);

  // ✅ initialize socket.io at /socket (matches frontend)
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`✅ MatchDay! backend running at http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error("❌ Fatal startup error:", err);
    process.exit(1);
  });
}

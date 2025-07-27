import "module-alias/register";
import dotenv from "dotenv";
dotenv.config();

import { default as express } from 'express';
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import newGameRoute from "./routes/newGameRoute";
import saveGameRoute from "./routes/saveGameRoute";
import saveGameTeamsRoute from "./routes/saveGameTeamRoute";
import teamRoute from "./routes/teamRoute";
import playerRoute from "./routes/playerRoute";
import transferRoute from "./routes/transferRoute";
import matchRoute from "./routes/matchRoute";
import matchdayRoute from "./routes/matchdayRoute";
import gameStateRoute from "./routes/gameStateRoute";
import matchStateRoute from "./routes/matchStateRoute";
import manualSaveRoute from "./routes/manualSaveRoute";
import countryRoute from "./routes/countryRoute";
import statsRoute from "./routes/statsRoute";
import standings from "./routes/standingsRoute";

/* 👇  NEW: bootstrap GameState so it always exists */
import { ensureGameState } from "./services/gameState";

/* 👇  Socket instance export */
export let io: Server; // Will be initialized in main()

async function main() {
  /* ------------------------------------------------ Express app */
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json());

  /* ------------------------------------------------ routes */
  app.use("/api/new-game", newGameRoute);
  app.use("/api/save-game", saveGameRoute);
  app.use("/api/players", playerRoute);
  app.use("/api/transfers", transferRoute);
  app.use("/api/matches", matchRoute);
  app.use("/api/matchdays", matchdayRoute);
  app.use("/api/gamestate", gameStateRoute);
  app.use("/api/matchstate", matchStateRoute);
  app.use("/api/manual-save", manualSaveRoute);
  app.use("/api/countries", countryRoute);
  app.use("/api/save-game-teams", saveGameTeamsRoute);
  app.use("/api/stats", statsRoute);
  app.use("/api/standings", standings);

  /* ------------------------------------------------ ensure GameState row */
  try {
    await ensureGameState(); // creates default if table is empty
  } catch (err) {
    console.error("❌ Cannot ensure GameState. Likely DB not migrated yet.");
    throw err;
  }

  /* ------------------------------------------------ HTTP & Socket.io */
  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  const httpServer = http.createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });

    // Optional: Join matchday rooms
    socket.on("join-matchday", ({ matchdayId }) => {
      socket.join(`matchday:${matchdayId}`);
    });

    socket.on("leave-matchday", ({ matchdayId }) => {
      socket.leave(`matchday:${matchdayId}`);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`✅ MatchDay! backend running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});

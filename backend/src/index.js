"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
var express_1 = require("express");
var http_1 = require("http");
var cors_1 = require("cors");
var socket_io_1 = require("socket.io");
var Routes_1 = require("./routes/Routes");
var gameStateRoute_1 = require("./routes/gameStateRoute");
var saveGameRoute_1 = require("./routes/saveGameRoute");
var teamRoute_1 = require("./routes/teamRoute");
var countryRoute_1 = require("./routes/countryRoute");
var manualSaveRoute_1 = require("./routes/manualSaveRoute");
var app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
app.use('/api', Routes_1.default);
app.use('/api/gamestate', gameStateRoute_1.default); // ✅ Ensure this is present
app.use('/api/save-game', saveGameRoute_1.default);
app.use('/team', teamRoute_1.default);
app.use('/api/countries', countryRoute_1.default);
app.use('/api/manual-save', manualSaveRoute_1.default);
// Define PORT before using it and ensure it's a number
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, '0.0.0.0', function () {
    console.log("\uD83D\uDE80 Server running on http://0.0.0.0:".concat(PORT));
});
// Socket setup
var httpServer = http_1.default.createServer(app);
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
io.on('connection', function (socket) {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', function () {
        console.log('Client disconnected:', socket.id);
    });
});
httpServer.listen(PORT, function () {
    console.log("\u2705 MatchDay! backend running at http://localhost:".concat(PORT));
});

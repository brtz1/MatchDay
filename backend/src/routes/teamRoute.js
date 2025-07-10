"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var prisma_1 = require("../utils/prisma");
var router = (0, express_1.Router)();
/**
 * Get all save game teams
 */
router.get('/', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var teams, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.saveGameTeam.findMany()];
            case 1:
                teams = _a.sent();
                res.json(teams);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error(error_1);
                res.status(500).json({ error: 'Failed to fetch teams' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Get a single save game team by ID
 */
router.get('/:teamId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var teamId, team, error_2;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                teamId = parseInt(req.params.teamId);
                if (isNaN(teamId))
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid team ID' })];
                _g.label = 1;
            case 1:
                _g.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.saveGameTeam.findUnique({
                        where: { id: teamId },
                        include: {
                            players: true,
                            baseTeam: true,
                        },
                    })];
            case 2:
                team = _g.sent();
                if (!team)
                    return [2 /*return*/, res.status(404).json({ error: 'Team not found' })];
                res.json({
                    id: team.id,
                    name: team.name,
                    primaryColor: (_b = (_a = team.baseTeam) === null || _a === void 0 ? void 0 : _a.primaryColor) !== null && _b !== void 0 ? _b : '#facc15',
                    secondaryColor: (_d = (_c = team.baseTeam) === null || _c === void 0 ? void 0 : _c.secondaryColor) !== null && _d !== void 0 ? _d : '#000000',
                    country: (_f = (_e = team.baseTeam) === null || _e === void 0 ? void 0 : _e.country) !== null && _f !== void 0 ? _f : 'Unknown',
                    division: { name: team.division },
                    coach: {
                        name: 'You',
                        level: 1,
                        morale: team.morale,
                    },
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _g.sent();
                console.error(error_2);
                res.status(500).json({ error: 'Failed to fetch team details' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Get all players in a save game team
   */
router.get('/:teamId/players', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var teamId, players, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                teamId = parseInt(req.params.teamId);
                if (isNaN(teamId))
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid team ID' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.saveGamePlayer.findMany({
                        where: { teamId: teamId },
                        orderBy: { position: 'asc' },
                    })];
            case 2:
                players = _a.sent();
                res.json(players);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error(error_3);
                res.status(500).json({ error: 'Error fetching players' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Get next match for a team
 */
router.get('/:teamId/next-match', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var teamId, nextMatch, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                teamId = parseInt(req.params.teamId);
                if (isNaN(teamId))
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid team ID' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.saveGameMatch.findFirst({
                        where: {
                            played: false,
                            OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
                        },
                        include: {
                            homeTeam: true,
                            awayTeam: true,
                            matchday: true,
                        },
                        orderBy: { matchDate: 'asc' },
                    })];
            case 2:
                nextMatch = _a.sent();
                if (!nextMatch)
                    return [2 /*return*/, res.status(404).json({ error: 'No upcoming match found' })];
                res.json(nextMatch);
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                console.error(error_4);
                res.status(500).json({ error: 'Failed to fetch next match' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Get opponent team info
 */
router.get('/opponent/:teamId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var teamId, team, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                teamId = parseInt(req.params.teamId);
                if (isNaN(teamId))
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid team ID' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.saveGameTeam.findUnique({
                        where: { id: teamId },
                    })];
            case 2:
                team = _a.sent();
                if (!team)
                    return [2 /*return*/, res.status(404).json({ error: 'Team not found' })];
                res.json(team);
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error(error_5);
                res.status(500).json({ error: 'Failed to fetch opponent info' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Get team finances (placeholder logic)
 */
router.get('/:teamId/finances', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var teamId, players, totalSalaries, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                teamId = parseInt(req.params.teamId);
                if (isNaN(teamId))
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid team ID' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.saveGamePlayer.findMany({
                        where: { saveGameId: teamId },
                    })];
            case 2:
                players = _a.sent();
                totalSalaries = players.reduce(function (sum, player) { return sum + (player.salary || 0); }, 0);
                res.json({
                    salaryTotal: totalSalaries,
                    salaryByPlayer: players.map(function (player) { return ({
                        id: player.id,
                        name: player.name,
                        salary: player.salary,
                    }); }),
                });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error(error_6);
                res.status(500).json({ error: 'Failed to load finances' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

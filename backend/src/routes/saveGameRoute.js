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
var teamRater_1 = require("../utils/teamRater");
var playerSync_1 = require("../utils/playerSync");
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
// GET all save games
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var includeTeams, saves, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                includeTeams = req.query.includeTeams === 'true';
                return [4 /*yield*/, prisma_1.default.saveGame.findMany({
                        orderBy: { createdAt: 'desc' },
                        include: includeTeams ? { teams: true } : undefined,
                    })];
            case 1:
                saves = _a.sent();
                res.json(saves);
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                console.error(e_1);
                res.status(500).json({ error: "Could not load savegames" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST new save game from country selection
router.post("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, coachName, countries, baseTeams, ordered, divisionMap, userTeam, saveGame, saveGameTeamIds_1, _i, _b, _c, division, teams, _d, teams_1, team, newTeam, _e, _f, player, coachSaveGameTeamId, divisionPreview, e_2;
    var _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _a = req.body, name = _a.name, coachName = _a.coachName, countries = _a.countries;
                _h.label = 1;
            case 1:
                _h.trys.push([1, 16, , 17]);
                return [4 /*yield*/, prisma_1.default.baseTeam.findMany({
                        where: { country: { in: countries } },
                        include: { players: true },
                    })];
            case 2:
                baseTeams = _h.sent();
                if (baseTeams.length < 128) {
                    return [2 /*return*/, res.status(400).json({ error: "Not enough teams in selected countries" })];
                }
                ordered = baseTeams.sort(function (a, b) { return b.rating - a.rating; });
                divisionMap = {
                    D1: ordered.slice(0, 8),
                    D2: ordered.slice(8, 16),
                    D3: ordered.slice(16, 24),
                    D4: ordered.slice(24, 32),
                };
                userTeam = divisionMap.D4[Math.floor(Math.random() * 8)];
                return [4 /*yield*/, prisma_1.default.saveGame.create({
                        data: { name: name, coachName: coachName },
                    })];
            case 3:
                saveGame = _h.sent();
                saveGameTeamIds_1 = {};
                _i = 0, _b = Object.entries(divisionMap);
                _h.label = 4;
            case 4:
                if (!(_i < _b.length)) return [3 /*break*/, 12];
                _c = _b[_i], division = _c[0], teams = _c[1];
                _d = 0, teams_1 = teams;
                _h.label = 5;
            case 5:
                if (!(_d < teams_1.length)) return [3 /*break*/, 11];
                team = teams_1[_d];
                return [4 /*yield*/, prisma_1.default.saveGameTeam.create({
                        data: {
                            saveGameId: saveGame.id,
                            name: team.name,
                            morale: 50,
                            baseTeamId: team.id,
                            currentSeason: 1,
                            division: division,
                        },
                    })];
            case 6:
                newTeam = _h.sent();
                saveGameTeamIds_1[team.id] = newTeam.id;
                _e = 0, _f = team.players;
                _h.label = 7;
            case 7:
                if (!(_e < _f.length)) return [3 /*break*/, 10];
                player = _f[_e];
                return [4 /*yield*/, prisma_1.default.saveGamePlayer.create({
                        data: {
                            saveGameId: saveGame.id,
                            teamId: newTeam.id,
                            basePlayerId: player.id,
                            name: player.name,
                            position: player.position,
                            rating: 0,
                            salary: 0,
                            behavior: (_g = player.behavior) !== null && _g !== void 0 ? _g : 3,
                            contractUntil: 1,
                        },
                    })];
            case 8:
                _h.sent();
                _h.label = 9;
            case 9:
                _e++;
                return [3 /*break*/, 7];
            case 10:
                _d++;
                return [3 /*break*/, 5];
            case 11:
                _i++;
                return [3 /*break*/, 4];
            case 12: return [4 /*yield*/, (0, teamRater_1.applyTeamRatingBasedOnDivision)(saveGame.id)];
            case 13:
                _h.sent();
                return [4 /*yield*/, (0, playerSync_1.syncPlayersWithNewTeamRating)(saveGame.id, baseTeams, divisionMap)];
            case 14:
                _h.sent();
                coachSaveGameTeamId = saveGameTeamIds_1[userTeam.id];
                return [4 /*yield*/, prisma_1.default.gameState.create({
                        data: {
                            currentSaveGameId: saveGame.id,
                            coachTeamId: coachSaveGameTeamId,
                            currentMatchday: 1,
                            matchdayType: client_1.MatchdayType.LEAGUE,
                            gameStage: client_1.GameStage.ACTION,
                        },
                    })];
            case 15:
                _h.sent();
                divisionPreview = Object.entries(divisionMap).map(function (_a) {
                    var div = _a[0], teams = _a[1];
                    return "".concat(div, ": ").concat(teams.map(function (team) { return saveGameTeamIds_1[team.id]; }).join(', '));
                });
                res.status(201).json({
                    saveGameId: saveGame.id,
                    userTeamId: coachSaveGameTeamId,
                    userTeamName: userTeam.name,
                    divisionPreview: divisionPreview,
                });
                return [3 /*break*/, 17];
            case 16:
                e_2 = _h.sent();
                console.error('❌ Save game creation failed:', e_2.message, e_2.stack);
                res.status(500).json({ error: e_2.message });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// POST load from save (into active memory only)
router.post("/load", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, save, coachTeam, existing, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.body.id;
                if (!id)
                    return [2 /*return*/, res.status(400).json({ error: "Missing save game ID" })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, prisma_1.default.saveGame.findUnique({
                        where: { id: id },
                        include: { teams: true },
                    })];
            case 2:
                save = _a.sent();
                if (!save)
                    return [2 /*return*/, res.status(404).json({ error: "SaveGame not found" })];
                coachTeam = save.teams.find(function (SaveGameTeams) { return SaveGameTeams.division === 'D4'; });
                if (!coachTeam) {
                    return [2 /*return*/, res.status(500).json({ error: 'Could not determine coach team from save.' })];
                }
                return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
            case 3:
                existing = _a.sent();
                if (!existing) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma_1.default.gameState.delete({ where: { id: existing.id } })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [4 /*yield*/, prisma_1.default.gameState.create({
                    data: {
                        currentSaveGameId: save.id,
                        coachTeamId: coachTeam.id,
                        gameStage: client_1.GameStage.ACTION,
                        currentMatchday: 1,
                        matchdayType: client_1.MatchdayType.LEAGUE,
                    },
                })];
            case 6:
                _a.sent();
                res.status(200).json({
                    message: "Game state loaded from save",
                    coachTeamId: coachTeam.id,
                });
                return [3 /*break*/, 8];
            case 7:
                e_3 = _a.sent();
                console.error('❌ Failed to load save game:', e_3.message, e_3.stack);
                res.status(500).json({ error: "Failed to load save game" });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

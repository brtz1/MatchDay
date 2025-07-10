"use strict";
// src/services/createSaveGame.ts
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
exports.createSaveGame = createSaveGame;
var prisma_1 = require("../utils/prisma");
function createSaveGame(name, coachName) {
    return __awaiter(this, void 0, void 0, function () {
        var teams, matches, saveGame, saveTeamMap, _i, teams_1, team, saveTeam, _a, teams_2, team, saveTeamId, _b, _c, p, _d, matches_1, match;
        var _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, prisma_1.default.team.findMany({
                        include: {
                            players: true,
                            coach: true,
                            division: true,
                        },
                    })];
                case 1:
                    teams = _j.sent();
                    return [4 /*yield*/, prisma_1.default.match.findMany()];
                case 2:
                    matches = _j.sent();
                    return [4 /*yield*/, prisma_1.default.saveGame.create({
                            data: {
                                name: name,
                                coachName: coachName,
                            },
                        })];
                case 3:
                    saveGame = _j.sent();
                    saveTeamMap = new Map();
                    _i = 0, teams_1 = teams;
                    _j.label = 4;
                case 4:
                    if (!(_i < teams_1.length)) return [3 /*break*/, 7];
                    team = teams_1[_i];
                    return [4 /*yield*/, prisma_1.default.saveGameTeam.create({
                            data: {
                                saveGameId: saveGame.id,
                                baseTeamId: team.id, // from baseTeam originally
                                name: team.name,
                                division: ("D".concat(((_e = team.division) === null || _e === void 0 ? void 0 : _e.level) || 4)),
                                morale: (_g = (_f = team.coach) === null || _f === void 0 ? void 0 : _f.morale) !== null && _g !== void 0 ? _g : 75,
                                currentSeason: 1,
                            },
                        })];
                case 5:
                    saveTeam = _j.sent();
                    saveTeamMap.set(team.id, saveTeam.id);
                    _j.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    _a = 0, teams_2 = teams;
                    _j.label = 8;
                case 8:
                    if (!(_a < teams_2.length)) return [3 /*break*/, 13];
                    team = teams_2[_a];
                    saveTeamId = saveTeamMap.get(team.id);
                    if (!saveTeamId)
                        return [3 /*break*/, 12];
                    _b = 0, _c = team.players;
                    _j.label = 9;
                case 9:
                    if (!(_b < _c.length)) return [3 /*break*/, 12];
                    p = _c[_b];
                    return [4 /*yield*/, prisma_1.default.saveGamePlayer.create({
                            data: {
                                saveGameId: saveGame.id,
                                basePlayerId: p.id,
                                name: p.name,
                                position: p.position,
                                rating: p.rating,
                                salary: p.salary,
                                behavior: p.behavior,
                                contractUntil: (_h = p.contractUntil) !== null && _h !== void 0 ? _h : 1,
                                teamId: saveTeamId,
                            },
                        })];
                case 10:
                    _j.sent();
                    _j.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12:
                    _a++;
                    return [3 /*break*/, 8];
                case 13:
                    _d = 0, matches_1 = matches;
                    _j.label = 14;
                case 14:
                    if (!(_d < matches_1.length)) return [3 /*break*/, 17];
                    match = matches_1[_d];
                    return [4 /*yield*/, prisma_1.default.saveGameMatch.create({
                            data: {
                                saveGameId: saveGame.id,
                                homeTeamId: match.homeTeamId,
                                awayTeamId: match.awayTeamId,
                                matchDate: match.matchDate,
                                played: match.isPlayed,
                            },
                        })];
                case 15:
                    _j.sent();
                    _j.label = 16;
                case 16:
                    _d++;
                    return [3 /*break*/, 14];
                case 17: return [2 /*return*/, saveGame.id];
            }
        });
    });
}

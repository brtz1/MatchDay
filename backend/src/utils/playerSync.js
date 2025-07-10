"use strict";
// src/utils/playerSync.ts
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
exports.syncPlayersWithNewTeamRating = syncPlayersWithNewTeamRating;
var prisma_1 = require("../utils/prisma");
/**
 * Sync all players from base teams with ratings and salaries into SaveGamePlayers
 */
function syncPlayersWithNewTeamRating(saveGameId, baseTeams, divisionMap) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, _b, division, baseTeamList, _loop_1, _c, baseTeamList_1, baseTeam;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _i = 0, _a = Object.entries(divisionMap);
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    _b = _a[_i], division = _b[0], baseTeamList = _b[1];
                    _loop_1 = function (baseTeam) {
                        var teamId, matchingBase, playerCount, teamAvgRating, ratings, i, basePlayer, rating, salary;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    teamId = baseTeam.id;
                                    matchingBase = baseTeams.find(function (bt) { return bt.id === teamId; });
                                    if (!matchingBase)
                                        return [2 /*return*/, "continue"];
                                    playerCount = matchingBase.players.length;
                                    teamAvgRating = getDivisionBaseRating(division);
                                    ratings = generatePlayerRatingsForTeam(teamAvgRating, playerCount);
                                    i = 0;
                                    _e.label = 1;
                                case 1:
                                    if (!(i < playerCount)) return [3 /*break*/, 4];
                                    basePlayer = matchingBase.players[i];
                                    rating = ratings[i];
                                    salary = calculateSalary(rating, basePlayer.behavior);
                                    return [4 /*yield*/, prisma_1.default.saveGamePlayer.updateMany({
                                            where: {
                                                saveGameId: saveGameId,
                                                basePlayerId: basePlayer.id,
                                                teamId: teamId,
                                            },
                                            data: {
                                                rating: rating,
                                                salary: salary,
                                            },
                                        })];
                                case 2:
                                    _e.sent();
                                    _e.label = 3;
                                case 3:
                                    i++;
                                    return [3 /*break*/, 1];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _c = 0, baseTeamList_1 = baseTeamList;
                    _d.label = 2;
                case 2:
                    if (!(_c < baseTeamList_1.length)) return [3 /*break*/, 5];
                    baseTeam = baseTeamList_1[_c];
                    return [5 /*yield**/, _loop_1(baseTeam)];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    _c++;
                    return [3 /*break*/, 2];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getDivisionBaseRating(division) {
    switch (division) {
        case 'D1': return 85;
        case 'D2': return 75;
        case 'D3': return 65;
        case 'D4': return 55;
        default: return 60;
    }
}
function generatePlayerRatingsForTeam(teamRating, count) {
    var ratings = [];
    for (var i = 0; i < count; i++) {
        var variance = Math.floor(Math.random() * 11) - 5;
        ratings.push(clamp(teamRating + variance));
    }
    return ratings;
}
function calculateSalary(rating, behavior) {
    var base = rating * 50;
    var behaviorFactor = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
    return Math.round(base * behaviorFactor);
}
function clamp(value) {
    return Math.max(30, Math.min(99, value));
}

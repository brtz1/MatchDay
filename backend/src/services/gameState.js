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
exports.getGameState = getGameState;
exports.getCurrentSaveGameId = getCurrentSaveGameId;
exports.setGameStage = setGameStage;
exports.setMatchdayType = setMatchdayType;
exports.getMatchdayType = getMatchdayType;
exports.advanceToNextMatchday = advanceToNextMatchday;
exports.setCurrentSaveGame = setCurrentSaveGame;
exports.setCoachTeam = setCoachTeam;
exports.initializeGameState = initializeGameState;
var prisma_1 = require("../utils/prisma");
var client_1 = require("@prisma/client");
/**
 * Get the full current game state (with coach team)
 */
function getGameState() {
    return __awaiter(this, void 0, void 0, function () {
        var state;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst({
                        include: {
                            coachTeam: true,
                        },
                    })];
                case 1:
                    state = _a.sent();
                    if (!state)
                        throw new Error('GameState not initialized');
                    return [2 /*return*/, state];
            }
        });
    });
}
/**
 * Get just the current SaveGame ID
 */
function getCurrentSaveGameId() {
    return __awaiter(this, void 0, void 0, function () {
        var state;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    state = _a.sent();
                    if (!(state === null || state === void 0 ? void 0 : state.currentSaveGameId))
                        throw new Error('No active save game');
                    return [2 /*return*/, state.currentSaveGameId];
            }
        });
    });
}
/**
 * Set the current game stage
 */
function setGameStage(stage) {
    return __awaiter(this, void 0, void 0, function () {
        var current, enumStage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    current = _a.sent();
                    if (!current)
                        throw new Error('GameState not initialized');
                    if (typeof stage === 'string') {
                        if (stage in client_1.GameStage) {
                            enumStage = client_1.GameStage[stage];
                        }
                        else {
                            throw new Error("Invalid GameStage string: ".concat(stage));
                        }
                    }
                    else {
                        enumStage = stage;
                    }
                    return [2 /*return*/, prisma_1.default.gameState.update({
                            where: { id: current.id },
                            data: {
                                gameStage: { set: enumStage }
                            },
                        })];
            }
        });
    });
}
/**
 * Set the current matchday type (LEAGUE or CUP)
 */
function setMatchdayType(type) {
    return __awaiter(this, void 0, void 0, function () {
        var current, enumType;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    current = _a.sent();
                    if (!current)
                        throw new Error('GameState not initialized');
                    if (typeof type === 'string') {
                        if (type in client_1.MatchdayType) {
                            enumType = client_1.MatchdayType[type];
                        }
                        else {
                            throw new Error("Invalid MatchdayType string: ".concat(type));
                        }
                    }
                    else {
                        enumType = type;
                    }
                    return [2 /*return*/, prisma_1.default.gameState.update({
                            where: { id: current.id },
                            data: {
                                matchdayType: { set: enumType }
                            },
                        })];
            }
        });
    });
}
/**
 * Get the current matchday type
 */
function getMatchdayType() {
    return __awaiter(this, void 0, void 0, function () {
        var current;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    current = _a.sent();
                    if (!(current === null || current === void 0 ? void 0 : current.matchdayType))
                        throw new Error('GameState not initialized');
                    return [2 /*return*/, current.matchdayType];
            }
        });
    });
}
/**
 * Advance matchday and reset stage
 */
function advanceToNextMatchday() {
    return __awaiter(this, void 0, void 0, function () {
        var current;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    current = _a.sent();
                    if (!current)
                        throw new Error('GameState not found');
                    return [2 /*return*/, prisma_1.default.gameState.update({
                            where: { id: current.id },
                            data: {
                                currentMatchday: current.currentMatchday + 1,
                                gameStage: { set: client_1.GameStage.ACTION },
                            },
                        })];
            }
        });
    });
}
/**
 * Set active save game
 */
function setCurrentSaveGame(saveGameId) {
    return __awaiter(this, void 0, void 0, function () {
        var current;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    current = _a.sent();
                    if (!current)
                        throw new Error('GameState not initialized');
                    return [2 /*return*/, prisma_1.default.gameState.update({
                            where: { id: current.id },
                            data: { currentSaveGameId: saveGameId },
                        })];
            }
        });
    });
}
/**
 * Set coached team
 */
function setCoachTeam(coachTeamId) {
    return __awaiter(this, void 0, void 0, function () {
        var current;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    current = _a.sent();
                    if (!current)
                        throw new Error('GameState not initialized');
                    return [2 /*return*/, prisma_1.default.gameState.update({
                            where: { id: current.id },
                            data: { coachTeamId: coachTeamId },
                        })];
            }
        });
    });
}
/**
 * Initialize game state from scratch (used for fresh boots or resets)
 */
function initializeGameState() {
    return __awaiter(this, void 0, void 0, function () {
        var exists;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.default.gameState.findFirst()];
                case 1:
                    exists = _a.sent();
                    if (exists) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma_1.default.gameState.create({
                            data: {
                                currentSaveGameId: 0,
                                coachTeamId: 0,
                                gameStage: client_1.GameStage.ACTION,
                                matchdayType: client_1.MatchdayType.LEAGUE,
                                currentMatchday: 1,
                            },
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}

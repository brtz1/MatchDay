"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
var express_1 = require("express");
var router = (0, express_1.Router)();
router.get('/health', function (req, res) {
    res.json({ status: 'ok' });
});
exports.default = router;

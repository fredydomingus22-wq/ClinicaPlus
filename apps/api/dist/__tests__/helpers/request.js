"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
exports.authHeader = authHeader;
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../server");
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createTestApp() {
    return (0, supertest_1.default)(server_1.app);
}
function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt_1 = __importDefault(require("bcrypt"));
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var prisma = new client_1.PrismaClient();
function testAuthLogin() {
    return __awaiter(this, void 0, void 0, function () {
        var email, clinicaSlug, password, JWT_SECRET, clinica, user, valid, accessToken, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    email = "geral@nutrimacho.com";
                    clinicaSlug = "nutrimacho";
                    password = "password123";
                    JWT_SECRET = "test_secret_for_local_script_only_must_be_long_enough_for_zod_to_pass";
                    console.log("Testing auth for ".concat(email, " at ").concat(clinicaSlug));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 8]);
                    return [4 /*yield*/, prisma.clinica.findUnique({ where: { slug: clinicaSlug } })];
                case 2:
                    clinica = _a.sent();
                    if (!clinica) {
                        console.log('Clinica not found');
                        return [2 /*return*/];
                    }
                    console.log('Clinica found:', clinica.id);
                    return [4 /*yield*/, prisma.utilizador.findUnique({
                            where: { clinicaId_email: { clinicaId: clinica.id, email: email } },
                            include: {
                                paciente: true,
                                medico: { include: { especialidade: true } },
                            }
                        })];
                case 3:
                    user = _a.sent();
                    if (!user) {
                        console.log('User not found');
                        return [2 /*return*/];
                    }
                    console.log('User found:', user.id);
                    return [4 /*yield*/, bcrypt_1.default.compare(password, user.passwordHash)];
                case 4:
                    valid = _a.sent();
                    console.log('Password valid:', valid);
                    accessToken = jsonwebtoken_1.default.sign({ sub: user.id, clinicaId: user.clinicaId, papel: user.papel }, JWT_SECRET, { expiresIn: '15m' });
                    console.log('JWT generated successfully');
                    return [3 /*break*/, 8];
                case 5:
                    e_1 = _a.sent();
                    console.error("Auth test failed:", e_1);
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, prisma.$disconnect()];
                case 7:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
testAuthLogin();

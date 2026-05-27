"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const AppError_1 = require("../lib/AppError");
const roleGuard_1 = require("../middleware/roleGuard");
const anamneseTemplate_service_1 = require("../services/anamneseTemplate.service");
const router = express_1.default.Router();
const questaoSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    ordem: zod_1.z.number().int().positive(),
    pergunta: zod_1.z.string().trim().min(1, 'Pergunta e obrigatoria'),
    tipoResposta: zod_1.z.enum(['text', 'boolean', 'date', 'select']),
    options: zod_1.z
        .array(zod_1.z.object({
        valor: zod_1.z.string().trim().min(1),
        label: zod_1.z.string().trim().min(1),
    }))
        .optional(),
});
const createTemplateSchema = zod_1.z.object({
    especialidadeId: zod_1.z.string().uuid('especialidadeId invalido'),
    titulo: zod_1.z.string().trim().min(1, 'Titulo e obrigatorio'),
    questoes: zod_1.z.array(questaoSchema).min(1, 'Pelo menos uma questao e obrigatoria'),
});
const updateTemplateSchema = zod_1.z.object({
    titulo: zod_1.z.string().trim().min(1).optional(),
    questoes: zod_1.z.array(questaoSchema).min(1).optional(),
});
const withClinica = (req, _res, next) => {
    if (!req.clinica?.id)
        return next(new AppError_1.AppError('Clinica nao informada', 400));
    next();
};
router.use(withClinica);
router.use(roleGuard_1.withRoleGuard);
router.get('/especialidade/:especialidadeId', async (req, res, next) => {
    const { especialidadeId } = req.params;
    if (!especialidadeId)
        return next(new AppError_1.AppError('especialidadeId e obrigatorio', 400));
    try {
        const template = await anamneseTemplate_service_1.anamneseTemplateService.getByEspecialidade(req.clinica.id, especialidadeId);
        res.json(template);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    const user = req.user;
    if (user?.papel !== 'ADMIN') {
        return next(new AppError_1.AppError('Acesso negado: apenas administradores podem criar templates', 403));
    }
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
        return next(new AppError_1.AppError(`Payload invalido: ${parsed.error.issues[0]?.message ?? 'dados invalidos'}`, 400));
    }
    try {
        const { especialidadeId, titulo, questoes } = parsed.data;
        const created = await anamneseTemplate_service_1.anamneseTemplateService.create(req.clinica.id, especialidadeId, titulo, questoes);
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:templateId', async (req, res, next) => {
    const { templateId } = req.params;
    if (!templateId)
        return next(new AppError_1.AppError('templateId e obrigatorio', 400));
    const user = req.user;
    if (user?.papel !== 'ADMIN') {
        return next(new AppError_1.AppError('Acesso negado: apenas administradores podem atualizar templates', 403));
    }
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
        return next(new AppError_1.AppError(`Payload invalido: ${parsed.error.issues[0]?.message ?? 'dados invalidos'}`, 400));
    }
    if (!parsed.data.questoes)
        return next(new AppError_1.AppError('questoes e obrigatorio para atualizacao', 400));
    try {
        const updated = await anamneseTemplate_service_1.anamneseTemplateService.update(req.clinica.id, templateId, parsed.data.questoes);
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:templateId', async (req, res, next) => {
    const { templateId } = req.params;
    if (!templateId)
        return next(new AppError_1.AppError('templateId e obrigatorio', 400));
    const user = req.user;
    if (user?.papel !== 'ADMIN') {
        return next(new AppError_1.AppError('Acesso negado: apenas administradores podem remover templates', 403));
    }
    try {
        await anamneseTemplate_service_1.anamneseTemplateService.delete(req.clinica.id, templateId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;

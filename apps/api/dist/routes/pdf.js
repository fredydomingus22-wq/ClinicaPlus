"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const tenant_1 = require("../middleware/tenant");
const pdf_service_1 = require("../services/pdf.service");
const router = (0, express_1.Router)();
/**
 * GET /pdf/consulta/:agendamentoId
 * Gera PDF completo da consulta (anamnese + odontograma)
 */
router.get('/consulta/:agendamentoId', authenticate_1.authenticate, tenant_1.tenantMiddleware, async (req, res, next) => {
    try {
        const { agendamentoId } = req.params;
        const clinicaId = req.user.clinicaId;
        if (!clinicaId) {
            throw new Error('ClinicaId não encontrado no token');
        }
        // @ts-expect-error - clinicaId is guaranteed to be string after null check, but TS strict mode doesn't infer correctly
        const pdfBuffer = await pdf_service_1.pdfService.generateConsultaReport(agendamentoId, clinicaId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="consulta-${agendamentoId}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /pdf/resumo/:agendamentoId
 * Gera PDF de resumo da consulta
 */
router.get('/resumo/:agendamentoId', authenticate_1.authenticate, tenant_1.tenantMiddleware, async (req, res, next) => {
    try {
        const { agendamentoId } = req.params;
        const clinicaId = req.user.clinicaId;
        if (!clinicaId) {
            throw new Error('ClinicaId não encontrado no token');
        }
        // @ts-expect-error - clinicaId is guaranteed to be string after null check, but TS strict mode doesn't infer correctly
        const pdfBuffer = await pdf_service_1.pdfService.generateResumoReport(agendamentoId, clinicaId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="resumo-${agendamentoId}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;

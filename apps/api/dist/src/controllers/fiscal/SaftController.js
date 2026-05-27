"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saftController = void 0;
const SaftService_1 = require("../../services/fiscal/SaftService");
const logger_1 = require("../../lib/logger");
const date_fns_1 = require("date-fns");
exports.saftController = {
    /**
     * Exporta o ficheiro SAF-T AO para o período solicitado
     */
    async export(req, res) {
        const { id: clinicaId } = req.clinica;
        const { inicio, fim } = req.query;
        if (!inicio || !fim) {
            return res.status(400).json({ success: false, message: 'Datas de início e fim são obrigatórias' });
        }
        try {
            const dataInicio = new Date(inicio);
            const dataFim = new Date(fim);
            const xml = await SaftService_1.saftService.generateXML({
                clinicaId,
                dataInicio,
                dataFim
            });
            const filename = `SAFT_AO_${clinicaId}_${(0, date_fns_1.format)(dataInicio, 'yyyyMMdd')}_${(0, date_fns_1.format)(dataFim, 'yyyyMMdd')}.xml`;
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(xml);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Erro ao exportar SAF-T AO');
            return res.status(500).json({ success: false, message: 'Falha ao gerar ficheiro SAF-T' });
        }
    }
};

import { Request, Response } from 'express';
import { saftService } from '../../services/fiscal/SaftService';
import { logger } from '../../lib/logger';
import { format } from 'date-fns';

export const saftController = {
  /**
   * Exporta o ficheiro SAF-T AO para o período solicitado
   */
  async export(req: Request, res: Response) {
    const { id: clinicaId } = req.clinica;
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({ success: false, message: 'Datas de início e fim são obrigatórias' });
    }

    try {
      const dataInicio = new Date(inicio as string);
      const dataFim = new Date(fim as string);

      const xml = await saftService.generateXML({
        clinicaId,
        dataInicio,
        dataFim
      });

      const filename = `SAFT_AO_${clinicaId}_${format(dataInicio, 'yyyyMMdd')}_${format(dataFim, 'yyyyMMdd')}.xml`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send(xml);
    } catch (error) {
      logger.error({ error }, 'Erro ao exportar SAF-T AO');
      return res.status(500).json({ success: false, message: 'Falha ao gerar ficheiro SAF-T' });
    }
  }
};

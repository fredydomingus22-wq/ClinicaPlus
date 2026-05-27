import React, { forwardRef } from 'react';
import { formatDate, formatKwanza } from '@clinicaplus/utils';
import type { FaturaDTO, ClinicaDTO } from '@clinicaplus/types';

interface Props {
  relatorio: {
    inicio: string;
    fim: string;
    faturas: FaturaDTO[];
    totalFaturado: number;
    totalIva: number;
    totalDescontos: number;
  };
  clinica: ClinicaDTO;
}

export const RelatorioVendasPrint = forwardRef<HTMLDivElement, Props>(({ relatorio, clinica }, ref) => {
  const safeFormatDate = (val?: string | Date | null) => {
    if (!val) return '---';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '---';
    return formatDate(d);
  };

  return (
    <div ref={ref} className="relatorio-print-wrapper p-8 text-xs font-sans bg-white min-h-screen">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .relatorio-print-wrapper, .relatorio-print-wrapper * { visibility: visible; }
          .relatorio-print-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 10mm;
          }
          @page { size: A4 landscape; margin: 0; }
        }
        .relatorio-print-wrapper { display: none; }
        @media print { .relatorio-print-wrapper { display: block; } }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          {clinica.logotipoUrl && (
            <img src={clinica.logotipoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
          )}
          <div>
            <h1 className="text-xl font-black uppercase">{clinica.nome}</h1>
            <p className="mt-1">NIF: {clinica.nif}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold uppercase">Mapa de Faturação e Vendas</h2>
          <p>Período: {safeFormatDate(relatorio.inicio)} a {safeFormatDate(relatorio.fim)}</p>
          <p className="text-[8px] text-gray-500 uppercase mt-1">Gerado em {new Date().toLocaleString('pt-AO')}</p>
        </div>
      </div>

      {/* Summary Table */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <SummaryBox label="Documentos" value={relatorio?.faturas?.length || 0} />
        <SummaryBox label="Total Ilíquido" value={formatKwanza(relatorio.totalFaturado + relatorio.totalDescontos)} />
        <SummaryBox label="Total Descontos" value={`-${formatKwanza(relatorio.totalDescontos)}`} color="text-red-600" />
        <SummaryBox label="Total Líquido (AOA)" value={formatKwanza(relatorio.totalFaturado)} isBold />
      </div>

      {/* Details Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 uppercase text-[8px] font-bold text-gray-600">
            <th className="p-2 border border-gray-300 text-left">Data</th>
            <th className="p-2 border border-gray-300 text-left">Número</th>
            <th className="p-2 border border-gray-300 text-left">Tipo</th>
            <th className="p-2 border border-gray-300 text-left">NIF Cliente</th>
            <th className="p-2 border border-gray-300 text-left">Cliente</th>
            <th className="p-2 border border-gray-300 text-left">Hash Control</th>
            <th className="p-2 border border-gray-300 text-right">Incidência</th>
            <th className="p-2 border border-gray-300 text-right">IVA</th>
            <th className="p-2 border border-gray-300 text-right">Total</th>
            <th className="p-2 border border-gray-300 text-center">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(relatorio?.faturas) ? relatorio.faturas : []).map((f, i) => (
            <tr key={i} className="text-[9px] hover:bg-gray-50">
              <td className="p-2 border border-gray-200">{safeFormatDate(f.dataEmissao || f.criadoEm)}</td>
              <td className="p-2 border border-gray-200 font-bold">{f.numeroFatura || '---'}</td>
              <td className="p-2 border border-gray-200">{f.tipoDocFiscal || 'FT'}</td>
              <td className="p-2 border border-gray-200">{f.paciente?.nif || '999999999'}</td>
              <td className="p-2 border border-gray-200 truncate max-w-[150px]">{f.paciente?.nome}</td>
              <td className="p-2 border border-gray-200 font-mono text-[7px]">{f.fiscalHash?.substring(0, 4)}-</td>
              <td className="p-2 border border-gray-200 text-right">{formatKwanza(f.subtotal)}</td>
              <td className="p-2 border border-gray-200 text-right">{formatKwanza(f.totalIva || 0)}</td>
              <td className="p-2 border border-gray-200 text-right font-bold">{formatKwanza(f.total)}</td>
              <td className="p-2 border border-gray-200 text-center uppercase font-bold text-[7px]">
                <span className={f.estado === 'ANULADA' ? 'text-red-500' : 'text-green-600'}>{f.estado}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Legal */}
      <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between items-end">
        <div className="text-[7px] text-gray-500 uppercase leading-relaxed">
          <p>Processado por programa validado nº 0/AGT/2026 - ClinicaPlus</p>
          <p>Mapa de Vendas em conformidade com as regras de auditoria fiscal.</p>
        </div>
        <div className="flex gap-12">
          <div className="text-center">
            <div className="w-48 border-b border-black mb-1"></div>
            <p className="text-[7px] uppercase">O Contabilista Certificado</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-black mb-1"></div>
            <p className="text-[7px] uppercase">A Gerência / Direção</p>
          </div>
        </div>
      </div>
    </div>
  );
});

function SummaryBox({ label, value, color = 'text-black', isBold = false }: { label: string; value: string | number; color?: string; isBold?: boolean }) {
  return (
    <div className="p-3 border border-gray-200 rounded bg-gray-50/50">
      <p className="text-[7px] font-bold uppercase text-gray-400 mb-1">{label}</p>
      <p className={`text-md ${isBold ? 'font-black' : 'font-bold'} ${color} font-mono`}>{value}</p>
    </div>
  );
}

RelatorioVendasPrint.displayName = 'RelatorioVendasPrint';

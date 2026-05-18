import React, { forwardRef, useEffect, useState } from 'react';
import { formatDate, formatKwanza, numberToWords } from '@clinicaplus/utils';
import type { FaturaDTO, ClinicaDTO, ItemFaturaDTO } from '@clinicaplus/types';
import QRCode from 'qrcode';

interface Props {
  fatura: FaturaDTO;
  clinica: ClinicaDTO;
  isPreview?: boolean;
}

export const FaturaPrint = forwardRef<HTMLDivElement, Props>(({ fatura, clinica }, ref) => {
  const [qrCodeData, setQrCodeData] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        // Formato AGT: https://quiosqueagt.minfin.gov.ao/facturacao-eletronica/consultar-fe?emissor=NIF&document=NUMERO
        const docNo = (fatura.numeroFatura || '').replace(/ /g, '%20');
        const url = `https://quiosqueagt.minfin.gov.ao/facturacao-eletronica/consultar-fe?emissor=${clinica.nif}&document=${docNo}`;
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 120,
          errorCorrectionLevel: 'M'
        });
        setQrCodeData(dataUrl);
      } catch {
        // Silently fail or handle error without console statement in production
      }
    };

    if (fatura.numeroFatura) {
      generateQR();
    }
  }, [fatura.numeroFatura, clinica.nif]);

  const hashControl = fatura.fiscalHash ? `${fatura.fiscalHash.substring(0, 4)}-` : '';
  const isCanceled = fatura.estado === 'ANULADA';
  const isDraft = !fatura.numeroFatura;

  return (
    <div ref={ref} className="fatura-print-wrapper relative overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .fatura-print-wrapper, .fatura-print-wrapper * { visibility: visible; }
          .fatura-print-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 10mm;
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #000;
            background: white;
          }
          @page {
            size: A4;
            margin: 0;
          }
          .no-print { display: none !important; }
        }
        .fatura-print-wrapper {
          display: none;
        }
        @media print {
          .fatura-print-wrapper {
            display: block;
          }
        }
        .table-print {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .table-print th, .table-print td {
          border-bottom: 0.5px solid #eee;
          padding: 8px 4px;
          text-align: left;
        }
        .table-print th {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8pt;
          color: #666;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80pt;
          font-weight: 900;
          color: rgba(0,0,0,0.05);
          z-index: 0;
          pointer-events: none;
          text-transform: uppercase;
        }
      `}</style>

      {isCanceled && <div className="watermark">ANULADA</div>}
      {isDraft && <div className="watermark">RASCUNHO</div>}

      <div className="relative z-10">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="w-2/3">
            <h1 className="text-xl font-black uppercase tracking-tighter">{clinica.razaoSocial || clinica.nome}</h1>
            <div className="text-xs space-y-0.5 mt-2">
              <p>NIF: <span className="font-bold">{clinica.nif}</span></p>
              <p>{clinica.endereco}</p>
              <p>{clinica.cidade}, {clinica.provincia}, Angola</p>
              <p>Tel: {clinica.telefone} | Email: {clinica.email}</p>
              {clinica.configuracao?.alvara && <p>Alvará Sanitário nº {clinica.configuracao.alvara}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="bg-black text-white px-3 py-1 inline-block mb-2 font-bold text-sm">
              {fatura.tipoDocFiscal || 'FATURA'}
            </div>
            <h2 className="text-lg font-bold">{fatura.numeroFatura || 'PROVISÓRIO'}</h2>
            <p className="text-xs">Data: {formatDate(fatura.dataEmissao || fatura.criadoEm)}</p>
            <p className="text-xs">Hora: {new Date(fatura.criadoEm).toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded">
            <h3 className="text-[8pt] font-bold uppercase text-gray-400 mb-2 border-b border-gray-200">Exmo.(s) Senhor(es)</h3>
            <p className="font-bold text-sm uppercase">{fatura.paciente?.nome || 'CONSUMIDOR FINAL'}</p>
            <p className="text-xs mt-1">NIF: {fatura.paciente?.nif || '999999999'}</p>
            <p className="text-xs">{fatura.paciente?.endereco}</p>
            <p className="text-xs">{fatura.paciente?.cidade}</p>
          </div>
          <div className="text-right text-xs space-y-1 self-end">
            <p>Moeda: <span className="font-bold">AOA (Kwanza)</span></p>
            <p>Vencimento: <span className="font-bold">{formatDate(fatura.dataVencimento || fatura.criadoEm)}</span></p>
            <p>Regime Fiscal: <span className="font-bold">{clinica.regimeFiscal || 'GERAL'}</span></p>
          </div>
        </div>

        {/* Tabela de Itens */}
        <table className="table-print text-xs">
          <thead>
            <tr>
              <th className="w-12">Cód.</th>
              <th>Descrição</th>
              <th className="text-center w-16">Qtd</th>
              <th className="text-right w-24">Preço Unit.</th>
              <th className="text-center w-16">Taxa %</th>
              <th className="text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {(fatura.itens || []).map((item: ItemFaturaDTO, index: number) => (
              <tr key={index}>
                <td className="text-gray-400">00{index + 1}</td>
                <td className="font-medium">{item.descricao}</td>
                <td className="text-center">{item.quantidade}</td>
                <td className="text-right">{formatKwanza(item.precoUnit)}</td>
                <td className="text-center">{item.taxaIva > 0 ? `${item.taxaIva}%` : (item.codigoIva || 'ISE')}</td>
                <td className="text-right font-bold">{formatKwanza(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Resumo de Impostos */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-[7pt] font-bold uppercase text-gray-400 mb-1">Quadro de Impostos</h4>
            <table className="w-full text-[8pt] border border-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-1 px-2 border-b">Taxa/Cód.</th>
                  <th className="p-1 px-2 border-b text-right">Incidência</th>
                  <th className="p-1 px-2 border-b text-right">Val. Imposto</th>
                  <th className="p-1 px-2 border-b text-center">Motivo Isenção</th>
                </tr>
              </thead>
              <tbody>
                {/* Agrupar por taxa */}
                <tr className="border-b border-gray-50">
                  <td className="p-1 px-2">IVA 14%</td>
                  <td className="p-1 px-2 text-right">{formatKwanza(fatura.subtotal)}</td>
                  <td className="p-1 px-2 text-right">0,00</td>
                  <td className="p-1 px-2 text-[6pt] text-gray-500 italic">Isento nos termos do n.º 2 do Artigo 12.º do CIVA</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="w-full max-w-[200px] space-y-1.5 border-b-2 border-black pb-2 mb-2">
              <div className="flex justify-between text-xs">
                <span>Subtotal:</span>
                <span className="font-bold">{formatKwanza(fatura.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Total Imposto:</span>
                <span className="font-bold">{formatKwanza(fatura.totalIva || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-600">
                <span>Desconto:</span>
                <span className="font-bold">-{formatKwanza(fatura.desconto)}</span>
              </div>
            </div>
            <div className="flex justify-between w-full max-w-[200px] text-lg font-black italic">
              <span>TOTAL:</span>
              <span>{formatKwanza(fatura.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-4">
          <p className="text-[8pt]"><span className="font-bold text-gray-400 uppercase">Valor por Extenso:</span> {fatura.total > 0 ? numberToWords(fatura.total) : 'Zero Kwanzas'}</p>
        </div>

        {/* Rodapé Fiscal */}
        <div className="mt-12 flex justify-between items-end border-t border-black pt-4">
          <div className="w-2/3 space-y-4">
            <div className="text-[7pt] text-gray-600 space-y-1 leading-relaxed">
              <p className="font-bold">{hashControl}Processado por programa validado nº 0/AGT/2026 - ClinicaPlus SaaS 1.0.0</p>
              <p>Os bens/serviços foram colocados à disposição do adquirente na data e local do documento.</p>
              {clinica.regimeFiscal === 'SIMPLIFICADO' && (
                <p>IVA - Regime Simplificado (Artigo 24.º do CIVA).</p>
              )}
              {clinica.regimeFiscal === 'EXUSA' && (
                <p>Isento nos termos do Regime de Exclusão (Artigo 21.º do CIVA).</p>
              )}
              {clinica.regimeFiscal === 'GERAL' && (
                <p>Regime Geral de Tributação - Isento de IVA nos termos do n.º 2 do Artigo 12.º do CIVA.</p>
              )}
              {fatura.notas && <p className="mt-2"><span className="font-bold">Observações:</span> {fatura.notas}</p>}
            </div>
            <div className="text-[6pt] text-gray-400 uppercase">
              Obrigado pela preferência. Documento gerado em {new Date().toLocaleString('pt-AO')}
            </div>
          </div>
          <div className="flex flex-col items-center">
            {qrCodeData && (
              <img src={qrCodeData} alt="QR Code AGT" className="w-24 h-24 mb-1" />
            )}
            <span className="text-[6pt] font-mono text-gray-400 uppercase">Autenticidade AGT</span>
          </div>
        </div>
      </div>
    </div>
  );
});

FaturaPrint.displayName = 'FaturaPrint';

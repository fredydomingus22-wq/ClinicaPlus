import React, { forwardRef, useEffect, useState } from 'react';
import { formatDate, formatKwanza, numberToWords, calcularFatura } from '@clinicaplus/utils';
import type { ItemCalculado } from '@clinicaplus/utils';
import type { FaturaDTO, ClinicaDTO, PagamentoDTO } from '@clinicaplus/types';
import QRCode from 'qrcode';

interface Props {
  fatura: FaturaDTO;
  clinica: ClinicaDTO;
  pagamento?: PagamentoDTO;
  isPreview?: boolean;
}

export const FaturaPrint = forwardRef<HTMLDivElement, Props>(({ fatura, clinica, pagamento, isPreview }, ref) => {
  const [qrCodeData, setQrCodeData] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const docNo = encodeURIComponent(pagamento?.numeroRecibo || fatura.numeroFatura || '').replace(/%2F/g, '/');
        const url = `https://quiosqueagt.minfin.gov.ao/facturacao-eletronica/consultar-fe?emissor=${clinica.nif}&document=${docNo}`;
        
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, url, {
          margin: 4,
          width: 350,
          errorCorrectionLevel: 'M',
          version: 4
        });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = '/logoagt.png';
          await new Promise((resolve) => {
            img.onload = resolve;
          });

          // Calcular tamanho do logo (máximo 20% da área)
          // 20% da largura/altura total garante que a área seja <= 20% (na verdade 4%)
          // Vamos usar ~18% da largura para segurança
          const logoSize = canvas.width * 0.18;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;

          // Desenhar fundo branco para o logo
          ctx.fillStyle = 'white';
          ctx.fillRect(x - 2, y - 2, logoSize + 4, logoSize + 4);
          
          ctx.drawImage(img, x, y, logoSize, logoSize);
        }

        setQrCodeData(canvas.toDataURL('image/png'));
      } catch {
        // Fallback para QR simples se falhar o canvas
      }
    };

    if (fatura.numeroFatura || pagamento?.numeroRecibo) {
      generateQR();
    }
  }, [fatura.numeroFatura, pagamento?.numeroRecibo, clinica.nif]);

  const fiscalHash = (pagamento?.fiscalHash || fatura.fiscalHash) || '';
  const hashControl = fatura.hashControl || '1';
  const fiscalHashTruncado =
    fiscalHash && fiscalHash.length > 16 ? `${fiscalHash.slice(0, 8)}…${fiscalHash.slice(-8)}` : fiscalHash;
  // Não inventar prefixos derivados do hash. `hashControl` é o valor oficial.
  const hashControlPrefix = hashControl ? `${hashControl} ` : '';
  const isCanceled = fatura.estado === 'ANULADA';
  const isDraft = !fatura.numeroFatura && !pagamento?.numeroRecibo;

  const { itensCalculados, impostosAgrupados, totalImpostoCalculado, retencaoFonteCalculada } = React.useMemo(() => {
    const { itensCalculados, totalIva } = calcularFatura(
      (fatura.itens || []).map(i => ({
        precoUnit: i.precoUnit,
        quantidade: i.quantidade,
        desconto: i.desconto,
        taxaIva: i.taxaIva,
        codigoIva: i.codigoIva,
        motivoIsencao: i.motivoIsencao
      })),
      clinica.regimeFiscal as 'GERAL' | 'SIMPLIFICADO' | 'EXUSA' || 'GERAL'
    );

    // Agrupar impostos
    const map = new Map<string, { taxaIva: number; codigoIva: string; incidencia: number; valorImposto: number }>();
    itensCalculados.forEach((item: ItemCalculado) => {
      const key = `${item.taxaIva}-${item.codigoIva}`;
      if (!map.has(key)) {
        map.set(key, { taxaIva: item.taxaIva, codigoIva: item.codigoIva || 'ISE', incidencia: 0, valorImposto: 0 });
      }
      const entry = map.get(key)!;
      entry.incidencia += item.base;
      entry.valorImposto += item.iva;
    });

    // Retenção na fonte (6.5% se aplicável)
    // Regra simplificada: Se a fatura tem retencaoFonte > 0 ou se o paciente for empresa (NIF starts with 5)
    const taxaRetencao = 6.5;
    const temRetencao = fatura.retencaoFonte > 0 || (fatura.paciente?.nif?.startsWith('5') && fatura.total > 0);
    const retencao = temRetencao ? Math.round(itensCalculados.reduce((acc: number, i: ItemCalculado) => acc + i.base, 0) * (taxaRetencao / 100)) : 0;

    return {
      itensCalculados,
      impostosAgrupados: Array.from(map.values()),
      totalImpostoCalculado: totalIva,
      retencaoFonteCalculada: fatura.retencaoFonte || retencao
    };
  }, [fatura.itens, fatura.retencaoFonte, fatura.paciente?.nif, clinica.regimeFiscal]);

  return (
    <div ref={ref} className="fatura-print-wrapper relative">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");

        @media print {
          body > *:not(.fatura-print-portal) {
            display: none !important;
          }
          #root {
            display: none !important;
          }
          .fatura-print-portal {
            display: block !important;
            visibility: visible !important;
          }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .fatura-print-wrapper, .fatura-print-wrapper * { 
            visibility: visible !important; 
          }
          .fatura-print-wrapper {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
          .no-print { display: none !important; }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
        }

        .fatura-print-wrapper {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 8.5pt;
          line-height: 1.4;
          color: #000;
          background: white;
          position: relative;
          ${isPreview ? `
          display: block;
          padding: 10mm;
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          box-shadow: none;
          border: 1px solid #000;
          min-height: 280mm;
          ` : `
          display: none;
          `}
        }

        .agt-header-bg {
          position: absolute;
          top: -10mm;
          right: -10mm;
          width: 60%;
          height: 80px;
          background: #f3f4f6;
          clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
          z-index: 0;
        }

        .agt-border-box {
          border: 1px solid #000;
          border-radius: 0;
          padding: 8px 12px;
        }

        .table-agt {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .table-agt th {
          background: #e5e7eb;
          color: #374151;
          font-weight: 600;
          height: 28px;
          border: 0.5px solid #d1d5db;
          font-size: 7.5pt;
          text-align: center;
        }
        .table-agt td {
          border: 0.5px solid #e5e7eb;
          padding: 5px 4px;
          height: 24px;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80pt;
          font-weight: 900;
          color: rgba(0,0,0,0.04);
          z-index: 0;
          pointer-events: none;
          text-transform: uppercase;
        }

        .doc-title {
          font-size: 42pt;
          font-weight: 800;
          letter-spacing: -2px;
          color: #000;
          text-transform: uppercase;
        }
      `}</style>

      {isCanceled && <div className="watermark">ANULADA</div>}
      {isDraft && <div className="watermark">RASCUNHO</div>}

      <div className="relative z-10 w-full">
        {/* Top Header Section: Reverted to Professional 2-Column Layout */}
        <div className="grid grid-cols-[1fr,auto] gap-4 mb-4 items-end border-b-2 border-neutral-900 pb-2 avoid-break">
          <div className="flex items-center gap-4">
            {clinica.logotipoUrl ? (
              <img src={clinica.logotipoUrl} alt="Logo" className="w-20 h-20 object-contain" />
            ) : (
              <div className="w-20 h-20 bg-neutral-100 flex items-center justify-center border border-neutral-200">
                <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-tighter">Logo</span>
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-[12pt] font-black text-neutral-900 uppercase tracking-tight leading-none mb-1">{clinica.razaoSocial || clinica.nome}</h1>
              <p className="text-[8.5pt] font-medium text-neutral-600 line-clamp-2 max-w-[300px]">{clinica.endereco}</p>
              <p className="text-[8.5pt] text-neutral-500">{clinica.cidade}, Angola</p>
              <div className="flex gap-4 mt-1">
                <p className="text-[8.5pt]"><span className="font-bold text-neutral-900">NIF:</span> {clinica.nif}</p>
                <p className="text-[8.5pt]"><span className="font-bold text-neutral-900">Tel:</span> {clinica.telefone}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="doc-title leading-none pb-1">
              {pagamento ? (pagamento.numeroRecibo?.startsWith('RE') ? 'RECIBO DE ESTORNO' : 'RECIBO') : (fatura.tipoDocFiscal || 'FACTURA')}
            </h1>
            <div className="flex flex-col items-end gap-1 mt-2">
              <span className="bg-neutral-900 text-white px-2 py-0.5 text-[9pt] font-bold">Original</span>
              <span className="text-[8pt] font-mono font-bold text-neutral-400">SÉRIE: {fatura.serieDocFiscal || clinica.serieDocFiscal || '2026'}</span>
            </div>
          </div>
        </div>

        {/* Info Boxes: Left (Clinic regime) vs Right (Client details) */}
        <div className="grid grid-cols-2 gap-4 mb-4 items-start avoid-break">
          <div className="agt-border-box">
             <h3 className="text-[7.5pt] font-bold uppercase text-neutral-400 mb-2 tracking-widest border-b border-neutral-100 pb-1">Dados da Entidade</h3>
             <p className="text-[8.5pt]"><span className="font-bold">Regime Fiscal:</span> {clinica.regimeFiscal || 'GERAL'}</p>
             <p className="text-[8.5pt]"><span className="font-bold">Email:</span> {clinica.email}</p>
             {clinica.agtSoftwareCert && <p className="text-[8pt] text-neutral-500 mt-1 italic">Software Certificado nº {clinica.agtSoftwareCert}</p>}
          </div>
          
          <div className="agt-border-box bg-neutral-50/50">
            <h3 className="text-[7.5pt] font-bold uppercase text-neutral-400 mb-2 tracking-widest border-b border-neutral-100 pb-1">Exmo.(a) Senhor(a)</h3>
            <div className="space-y-1">
              <p className="text-[10pt] font-bold text-neutral-900 uppercase">{fatura.paciente?.nome || 'CONSUMIDOR FINAL'}</p>
              <p className="text-[8.5pt]"><span className="font-bold">NIF:</span> {fatura.paciente?.nif || '999999999'}</p>
              <div className="flex gap-4">
                <p className="text-[8pt] text-neutral-500"><span className="font-semibold text-neutral-400">Cód. Cliente:</span> {fatura.paciente?.numeroPaciente || '---'}</p>
                <p className="text-[8pt] text-neutral-500"><span className="font-semibold text-neutral-400">ID Doc:</span> {fatura.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Numero and Data */}
        <div className="mb-4 flex justify-between items-end bg-neutral-900 p-3 text-white avoid-break">
          <div>
            <h2 className="text-[12pt] font-black uppercase tracking-tighter">
              {pagamento ? (pagamento.numeroRecibo?.startsWith('RE') ? 'Recibo de Estorno' : 'Recibo') : (fatura.tipoDocFiscal || 'Factura')} nº {pagamento?.numeroRecibo || fatura.numeroFatura || '000AB.2026/0000001'}
            </h2>
            <p className="text-[8.5pt] font-medium opacity-80">
              Data e Hora de Emissão: {formatDate(pagamento?.criadoEm || fatura.dataEmissao || fatura.criadoEm)} às {new Date(pagamento?.criadoEm || fatura.criadoEm).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}
            </p>
          </div>
          {fatura.dataVencimento && !pagamento && (
            <div className="text-right">
              <p className="text-[7.5pt] uppercase font-bold opacity-60">Data Vencimento</p>
              <p className="text-[10pt] font-black">{formatDate(fatura.dataVencimento)}</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          {/* Se for Recibo, mostrar detalhes do pagamento */}
          {pagamento ? (
            <div className="agt-border-box mb-6 bg-blue-50/30 border-blue-100">
              <h3 className="text-[9pt] font-bold mb-2 uppercase text-blue-900 border-b border-blue-100 pb-1">Liquidação de Documento</h3>
              <div className="grid grid-cols-2 gap-4 text-[8.5pt]">
                <div>
                  <p><span className="font-bold">Documento:</span> {fatura.numeroFatura}</p>
                  <p><span className="font-bold">Data Fatura:</span> {formatDate(fatura.dataEmissao || '')}</p>
                  <p><span className="font-bold">Valor Total Fatura:</span> {formatKwanza(fatura.total)}</p>
                </div>
                <div>
                  <p><span className="font-bold">Método de Pagamento:</span> {pagamento.metodo}</p>
                  <p><span className="font-bold">Valor Pago:</span> {formatKwanza(pagamento.valor)}</p>
                  {pagamento.referencia && <p><span className="font-bold">Referência/ID:</span> {pagamento.referencia}</p>}
                </div>
              </div>
            </div>
          ) : (
            <table className="table-agt">
              <thead>
                <tr>
                  <th className="w-10">Tipo</th>
                  <th className="w-16">Código</th>
                  <th>Descrição</th>
                  <th className="w-10">Qt</th>
                  <th className="w-20">Preço Unit</th>
                  <th className="w-16">Desconto</th>
                  <th className="w-20">Valor</th>
                  <th className="w-28" colSpan={3}>Impostos (IVA)</th>
                  <th className="w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {itensCalculados.map((item: ItemCalculado, index: number) => (
                  <tr key={index} className="text-center text-[7.5pt]">
                    <td className="text-gray-400">S</td>
                    <td>{item.codigoIva || 'ISE'}</td>
                    <td className="text-left px-2 font-medium">{item.descricao}</td>
                    <td>{item.quantidade}</td>
                    <td className="text-right px-1">{formatKwanza(item.precoUnit).replace('Kz', '')}</td>
                    <td className="text-right px-1">{item.desconto ? formatKwanza(item.desconto).replace('Kz', '') : '0,00'}</td>
                    <td className="text-right px-1">{formatKwanza(item.base).replace('Kz', '')}</td>
                    <td className="w-8 border-r-0"></td>
                    <td className="w-12 border-x-0 bg-gray-50">{item.taxaIva}%</td>
                    <td className="w-8 border-l-0"></td>
                    <td className="text-right px-1 font-bold">{formatKwanza(item.total).replace('Kz', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Blocos d        <div className="grid grid-cols-[1.2fr,1fr] gap-6 mt-4 items-start avoid-break">
          <div className="space-y-4">
            <div>
              <h3 className="text-[7.5pt] font-bold mb-1">Totais retidos na fonte ou cativados pelo adquirente</h3>
              <p className="text-[6.5pt] text-gray-500 mb-1">(valores informativos não integrados no total do documento)</p>
              <table className="table-agt !mt-0 table-fixed">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Imposto</th>
                    <th>Taxa</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {retencaoFonteCalculada > 0 ? (
                    <tr className="text-[7.5pt]">
                      <td className="text-center">Retenção</td>
                      <td className="text-center">II / IRT</td>
                      <td className="text-center">6.50%</td>
                      <td className="text-right px-2 font-mono">{formatKwanza(retencaoFonteCalculada).replace('Kz', '')}</td>
                    </tr>
                  ) : (
                    <tr className="text-[7.5pt] text-gray-400 text-center">
                      <td colSpan={4} className="py-1">Nenhuma retenção aplicada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-[8pt] font-bold bg-gray-100 p-1 mb-1">Totais do documento <span className="font-normal text-[7pt]">(valores em kwanzas)</span></h4>
              <table className="table-agt !mt-0">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th className="w-32">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {impostosAgrupados.map((grupo, idx) => (
                    <tr key={idx} className="text-[7.5pt]">
                      <td className="text-left px-2">IVA {grupo.taxaIva}%</td>
                      <td className="text-right px-2 font-mono">{formatKwanza(grupo.valorImposto).replace('Kz', '')}</td>
                    </tr>
                  ))}
                  {impostosAgrupados.length === 0 && (
                    <tr className="text-[7.5pt] text-gray-400 text-center">
                      <td colSpan={2} className="py-1">Isento de IVA</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 flex flex-col items-end">
            <div className="text-right space-y-1 w-full">
              <h4 className="text-[8.5pt] font-bold uppercase tracking-tight mb-2 border-b-2 border-neutral-900 pb-1">Valores em Kwanzas</h4>
              <div className="flex justify-between items-end border-b border-gray-100 py-1">
                <span className="text-gray-600 text-[8pt]">Totais sem impostos</span>
                <span className="font-mono text-[8.5pt]">{formatKwanza(fatura.subtotal).replace('Kz', '')}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-100 py-1">
                <span className="text-gray-600 text-[8pt]">Valor de impostos</span>
                <span className="font-mono text-[8.5pt]">{formatKwanza(totalImpostoCalculado).replace('Kz', '')}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-100 py-1">
                <span className="text-gray-600 text-[8pt]">Valor de descontos</span>
                <span className="font-mono text-[8.5pt]">{formatKwanza(fatura.desconto).replace('Kz', '')}</span>
              </div>
              <div className="flex justify-between items-end bg-gray-100 p-2 mt-2">
                <span className="font-bold text-[8.5pt]">Valor total a pagar</span>
                <span className="font-bold font-mono text-[10pt]">{formatKwanza(fatura.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-2 avoid-break">
          <p className="text-[7.5pt]"><span className="font-bold text-gray-400 uppercase tracking-wide">Valor por Extenso:</span> {fatura.total > 0 ? numberToWords(fatura.total) : 'Zero Kwanzas'}</p>
        </div>

        {/* Rodapé e Frases Legais */}
        <div className="mt-6 text-[7pt] text-gray-700 leading-relaxed space-y-0.5 avoid-break">
          {fiscalHash && (
            <p className="font-mono text-[7pt] text-gray-600">
              Hash ({hashControl}): {fiscalHashTruncado}
            </p>
          )}
          <p className="font-semibold text-gray-800">
            {hashControlPrefix}Processado por programa validado nº {clinica.agtSoftwareCert || '0/AGT/2026'} - ClinicaPlus SaaS
          </p>
          {pagamento && (
            <p className="font-medium text-gray-600">Este recibo não serve de fatura. Quita a fatura {fatura.numeroFatura} no valor de {formatKwanza(pagamento.valor)}.</p>
          )}
          <p className="text-gray-400">Os bens/serviços foram colocados à disposição do adquirente na data e local deste documento.</p>
          
          <div className="mt-4 flex justify-between items-end border-t border-gray-200 pt-2">
            <div className="max-w-[500px]">
              {fatura.notas && <p className="mb-1"><span className="font-bold">Observações:</span> {fatura.notas}</p>}
              <p className="text-[6.5pt] text-gray-400 uppercase tracking-tight">DOCUMENTO EMITIDO PELO PORTAL DO CONTRIBUINTE - ClinicaPlus</p>
              <p className="text-[6.5pt] text-gray-400 uppercase tracking-widest">EM {new Date().toLocaleString('pt-AO')}</p>
            </div>
            {/* QR CODE SECTION */}
            {qrCodeData && (
              <div className="flex flex-col items-center ml-4 shrink-0">
                <div className="border border-gray-200 p-0.5 bg-white">
                  <img src={qrCodeData} alt="QR Code AGT" className="w-20 h-20" />
                </div>
                <span className="text-[5pt] text-gray-400 mt-0.5 uppercase font-mono tracking-widest">Verificar Doc. AGT</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

FaturaPrint.displayName = 'FaturaPrint';

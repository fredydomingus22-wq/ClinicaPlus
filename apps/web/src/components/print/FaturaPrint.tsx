import React, { forwardRef } from 'react';
import { formatDate, formatKwanza } from '@clinicaplus/utils';
import type { FaturaDTO, ClinicaDTO } from '@clinicaplus/types';

interface Props {
  fatura: FaturaDTO;
  clinica: ClinicaDTO;
}

export const FaturaPrint = forwardRef<HTMLDivElement, Props>(({ fatura, clinica }, ref) => {
  return (
    <div ref={ref} className="fatura-print-wrapper">
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
            padding: 0;
            margin: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: white;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
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
          margin: 20px 0;
          page-break-inside: auto;
        }
        .table-print tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .table-print th, .table-print td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        .table-print th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }
        .info-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          gap: 20px;
        }
        .info-col {
          flex: 1;
        }
      `}</style>

      {/* Cabeçalho */}
      <div className="header-section">
        <div>
          <h1 style={{ fontSize: '20pt', margin: 0 }}>{clinica.nome}</h1>
          <p style={{ margin: '5px 0' }}>{clinica.endereco || 'Endereço não especificado'}</p>
          <p style={{ margin: '2px 0' }}>{clinica.cidade}, {clinica.provincia}</p>
          <p style={{ margin: '2px 0' }}>Tel: {clinica.telefone || '---'} | Email: {clinica.email}</p>
        </div>
        <div className="text-right">
          <h2 style={{ fontSize: '16pt', margin: 0 }}>FATURA</h2>
          <p className="font-bold" style={{ fontSize: '12pt' }}>№ {fatura.numeroFatura || '(Rascunho)'}</p>
          <p>Data: {fatura.dataEmissao ? formatDate(fatura.dataEmissao) : formatDate(fatura.criadoEm)}</p>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-col">
          <p className="font-bold" style={{ textTransform: 'uppercase', fontSize: '9pt', color: '#666', borderBottom: '1px solid #ddd', marginBottom: '5px' }}>Dados do Paciente</p>
          <p style={{ margin: '5px 0 2px' }}><strong>Nome:</strong> {fatura.paciente?.nome || '---'}</p>
          <p style={{ margin: '2px 0' }}><strong>Nº Processo:</strong> {fatura.paciente?.numeroPaciente || '---'}</p>
          {fatura.paciente?.endereco && <p style={{ margin: '2px 0' }}><strong>Endereço:</strong> {fatura.paciente.endereco}</p>}
        </div>
        <div className="info-col text-right">
          <p className="font-bold" style={{ textTransform: 'uppercase', fontSize: '9pt', color: '#666', borderBottom: '1px solid #ddd', marginBottom: '5px' }}>Dados do Documento</p>
          <p style={{ margin: '5px 0 2px' }}><strong>Estado:</strong> {fatura.estado}</p>
          <p style={{ margin: '2px 0' }}><strong>Tipo:</strong> {fatura.tipo}</p>
          <p style={{ margin: '2px 0' }}><strong>Vencimento:</strong> {fatura.dataVencimento ? formatDate(fatura.dataVencimento) : '---'}</p>
        </div>
      </div>

      {/* Tabela de Itens */}
      <table className="table-print">
        <thead>
          <tr>
            <th>Descrição</th>
            <th className="text-center">Qtd</th>
            <th className="text-right">Preço Unit.</th>
            <th className="text-right">Desconto</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(fatura.itens || []).map((item, index) => (
            <tr key={index}>
              <td>{item.descricao}</td>
              <td className="text-center">{item.quantidade}</td>
              <td className="text-right">{formatKwanza(item.precoUnit)}</td>
              <td className="text-right">{item.desconto > 0 ? formatKwanza(item.desconto) : '---'}</td>
              <td className="text-right font-bold">{formatKwanza(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totais */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
            <span>Subtotal:</span>
            <span>{formatKwanza(fatura.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee', color: fatura.desconto > 0 ? 'red' : 'inherit' }}>
            <span>Desconto Global:</span>
            <span>-{formatKwanza(fatura.desconto)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13pt', fontWeight: 'bold' }}>
            <span>TOTAL:</span>
            <span>{formatKwanza(fatura.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {fatura.notas && (
        <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#f9f9f9', borderLeft: '3px solid #000' }}>
          <p className="font-bold" style={{ margin: '0 0 5px', fontSize: '9pt', textTransform: 'uppercase' }}>Observações:</p>
          <p style={{ margin: 0, fontSize: '10pt' }}>{fatura.notas}</p>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ marginTop: '50px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px', fontSize: '9pt', color: '#777', pageBreakInside: 'avoid' }}>
        <p style={{ margin: '0 0 5px' }}>Obrigado pela sua preferência. Este documento serve como comprovativo de faturação.</p>
        <p style={{ margin: 0 }}>Gerado por ClinicaPlus em {new Date().toLocaleString('pt-AO')}</p>
      </div>
    </div>
  );
});

FaturaPrint.displayName = 'FaturaPrint';

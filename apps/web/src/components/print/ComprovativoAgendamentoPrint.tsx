import React, { forwardRef } from 'react';
import { formatDate } from '@clinicaplus/utils';

interface Props {
  clinicaNome: string;
  clinicaEndereco?: string;
  clinicaTelefone?: string;
  pacienteNome: string;
  pacienteNumero: string | number;
  medicoNome: string;
  especialidade: string | null;
  dataHora: string;
  tipoAgendamento: string;
}

export const ComprovativoAgendamentoPrint = forwardRef<HTMLDivElement, Props>(
  (
    {
      clinicaNome,
      clinicaEndereco,
      clinicaTelefone,
      pacienteNome,
      pacienteNumero,
      medicoNome,
      especialidade,
      dataHora,
      tipoAgendamento,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="agendamento-print-wrapper">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .agendamento-print-wrapper,
            .agendamento-print-wrapper * { visibility: visible; }
            .agendamento-print-wrapper {
              position: fixed;
              top: 0; left: 0;
              width: 100%;
              padding: 15mm;
              font-family: 'IBM Plex Sans', sans-serif;
              font-size: 10pt;
              color: #000;
              background: white;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
            .industrial-label {
              font-family: 'IBM Plex Mono', monospace;
              font-size: 8pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #666;
            }
          }
          .agendamento-print-wrapper {
            display: none;
          }
          @media print {
            .agendamento-print-wrapper {
              display: block;
            }
          }
        `}</style>

        {/* Cabeçalho da clínica */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>{clinicaNome}</h1>
          {clinicaEndereco && <p style={{ margin: '4px 0 0', fontSize: '10pt', color: '#444' }}>{clinicaEndereco}</p>}
          {clinicaTelefone && <p style={{ margin: '2px 0 0', fontSize: '10pt', color: '#444' }}>Tel: {clinicaTelefone}</p>}
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.05em', margin: 0, textTransform: 'uppercase' }}>
            Comprovativo de Agendamento
          </h2>
        </div>

        {/* Dados do Agendamento */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px', fontSize: '12pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Paciente</strong>
                {pacienteNome}
              </td>
              <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Nº Processo</strong>
                {pacienteNumero}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Médico(a)</strong>
                {medicoNome}
              </td>
              <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Especialidade</strong>
                {especialidade || 'Não especificada'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Data / Hora</strong>
                {formatDate(dataHora)} às {new Date(dataHora).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Tipo de Serviço</strong>
                {tipoAgendamento}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Observações de Chegada */}
        <div style={{ marginBottom: '32px', backgroundColor: '#f9f9f9', padding: '16px', borderLeft: '4px solid #000' }}>
          <p style={{ margin: 0, fontSize: '10pt', fontStyle: 'italic' }}>
            <strong>Nota:</strong> Solicitamos que compareça à clínica com 15 minutos de antecedência. 
            Em caso de impossibilidade, por favor contacte-nos para reagendar. O pagamento é efectuado no local.
          </p>
        </div>

        {/* Rodapé e Assinaturas */}
        <div style={{ marginTop: '60px', opacity: 0.8 }}>
          <p style={{ margin: 0, fontSize: '9pt', textAlign: 'center' }}>
            Comprovativo gerado em {new Date().toLocaleDateString('pt-AO')} às {new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }
);

ComprovativoAgendamentoPrint.displayName = 'ComprovativoAgendamentoPrint';

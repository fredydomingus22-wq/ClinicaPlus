import { forwardRef } from 'react';
import { formatDate } from '@clinicaplus/utils';
import type { ReceitaDTO } from '@clinicaplus/types';

interface Props {
  receita: ReceitaDTO;
  clinicaNome: string;
  clinicaEndereco?: string | null;
  clinicaTelefone?: string | null;
  clinicaEmail?: string | null;
}

export const ReceitaPrint = forwardRef<HTMLDivElement, Props>(
  ({ receita, clinicaNome, clinicaEndereco, clinicaTelefone, clinicaEmail }, ref) => {
    const paciente = receita.paciente;
    const medico = receita.medico;

    if (!paciente || !medico) {
      return null;
    }

    return (
      <div ref={ref} className="receita-print-wrapper">
        {/* CSS de impressão via style tag inline */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .receita-print-wrapper,
            .receita-print-wrapper * { visibility: visible; }
            .receita-print-wrapper {
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
          .receita-print-wrapper {
            display: none;
          }
          @media print {
            .receita-print-wrapper {
              display: block;
            }
          }
        `}</style>

        {/* Cabeçalho da clínica */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0 0 8px' }}>{clinicaNome}</h1>
          <div style={{ fontSize: '10pt', color: '#333', lineHeight: '1.4' }}>
            {clinicaEndereco && <p style={{ margin: 0 }}>{clinicaEndereco}</p>}
            <div style={{ display: 'flex', gap: '15px' }}>
              {clinicaTelefone && <p style={{ margin: 0 }}>Tel: {clinicaTelefone}</p>}
              {clinicaEmail && <p style={{ margin: 0 }}>Email: {clinicaEmail}</p>}
            </div>
          </div>
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>
            Receita Médica
          </h2>
        </div>

        {/* Dados do paciente e médico */}
        <div style={{ border: '1px solid #ddd', padding: '12px', marginBottom: '24px', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '60%', padding: '6px 0' }}>
                  <strong>Paciente:</strong> {paciente.nome}
                </td>
                <td style={{ padding: '6px 0' }}>
                  <strong>Procedimento Nº:</strong> {paciente.numeroPaciente}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0' }}>
                  <strong>Médico:</strong> {medico.nome}
                </td>
                <td style={{ padding: '6px 0' }}>
                  <strong>Especialidade:</strong> {medico.especialidade?.nome}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0' }}>
                  <strong>Data de Emissão:</strong> {formatDate(receita.dataEmissao)}
                </td>
                <td style={{ padding: '6px 0' }}>
                  <strong>Válida até:</strong> {formatDate(receita.dataValidade)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Diagnóstico */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '11pt' }}>Diagnóstico:</p>
          <p style={{ padding: '10px 15px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #000', margin: 0, minHeight: '40px' }}>
            {receita.diagnostico}
          </p>
        </div>

        {/* Medicamentos — símbolo Rx */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '18pt', marginBottom: '16px', color: '#000' }}>℞</p>
          <div style={{ paddingLeft: '10px' }}>
            {receita.medicamentos.map((med, i) => (
              <div key={i} style={{ marginBottom: '16px', breakInside: 'avoid' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: '11.5pt' }}>
                  {i + 1}. {med.nome}
                </p>
                <div style={{ paddingLeft: '20px', lineHeight: '1.5' }}>
                  <p style={{ margin: '0 0 2px' }}>
                    <strong>Posologia:</strong> {med.dosagem} — {med.frequencia} — durante {med.duracao}
                  </p>
                  {med.instrucoes && (
                    <p style={{ margin: 0, fontStyle: 'italic', color: '#333' }}>
                      <strong>Instruções:</strong> {med.instrucoes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        {receita.observacoes && (
          <div style={{ marginBottom: '32px', breakInside: 'avoid' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Observações:</p>
            <p style={{ paddingLeft: '15px', color: '#444', margin: 0, fontSize: '10.5pt' }}>{receita.observacoes}</p>
          </div>
        )}

        {/* Assinatura e Carimbo */}
        <div style={{ marginTop: 'auto', paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', breakInside: 'avoid' }}>
          <div style={{ borderTop: '1px solid #000', width: '300px', textAlign: 'center', paddingTop: '8px' }}>
            <p style={{ margin: '0 0 2px', fontWeight: 'bold', fontSize: '11pt' }}>{medico.nome}</p>
            <p style={{ margin: '0 0 2px', fontSize: '9pt', color: '#444' }}>{medico.especialidade?.nome}</p>
            {medico.ordem && (
              <p style={{ margin: 0, fontSize: '9pt', color: '#444' }}>Nº Ordem: {medico.ordem}</p>
            )}
          </div>
          <div style={{ marginTop: '20px', fontSize: '8pt', color: '#888' }}>
            Documento gerado digitalmente por ClinicaPlus em {formatDate(new Date())}
          </div>
        </div>
      </div>
    );
  }
);

ReceitaPrint.displayName = 'ReceitaPrint';

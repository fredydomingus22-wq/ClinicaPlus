import React, { forwardRef } from 'react';
import { formatDate } from '@clinicaplus/utils';
import type { 
  PacienteDTO, 
  AgendamentoDTO, 
  ReceitaDTO, 
  ClinicaDTO 
} from '@clinicaplus/types';

interface Props {
  paciente: PacienteDTO;
  agendamentos: AgendamentoDTO[];
  receitas: ReceitaDTO[];
  clinica: ClinicaDTO;
}

export const DossierClinicoPrint = forwardRef<HTMLDivElement, Props>(
  ({ paciente, agendamentos, receitas, clinica }, ref) => {
    const today = new Date();

    return (
      <div ref={ref} className="dossier-print-wrapper">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            html, body {
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              visibility: hidden !important; 
              background: white !important;
            }
            .dossier-print-wrapper {
              visibility: visible !important;
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              font-family: 'IBM Plex Sans', sans-serif;
              font-size: 10pt;
              color: #000;
              line-height: 1.4;
            }
            .dossier-print-wrapper * { 
              visibility: visible !important; 
            }
            
            /* Multi-page support */
            .print-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 25px !important;
              display: block !important;
              width: 100% !important;
              border: 1px solid #000 !important;
              padding: 15px !important;
            }
            
            h1, h2, h3 { color: #000 !important; margin-bottom: 8px !important; font-family: 'IBM Plex Sans', sans-serif; font-weight: bold; }
            .section-title { 
              border-bottom: 2px solid #000 !important; 
              padding-bottom: 4px !important; 
              margin-bottom: 12px !important;
              text-transform: uppercase;
              font-size: 10pt;
              font-weight: bold;
              font-family: 'IBM Plex Mono', monospace;
              letter-spacing: 0.1em;
            }
            
            table { 
              width: 100% !important; 
              border-collapse: collapse !important; 
              margin-bottom: 10px !important;
            }
            th, td { 
              border: 1px solid #000 !important; 
              padding: 6px !important; 
              text-align: left !important;
              vertical-align: top !important;
              font-size: 9pt;
            }
            th { 
              background-color: #f5f5f5 !important; 
              font-weight: bold !important;
              font-family: 'IBM Plex Mono', monospace;
              text-transform: uppercase;
              font-size: 8pt;
              -webkit-print-color-adjust: exact;
            }
            
            .no-print { display: none !important; }
            
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
          .dossier-print-wrapper {
            display: none;
          }
        `}</style>

        {/* Cabeçalho da Clínica */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #000', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '22pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{clinica.nome}</h1>
            <p style={{ margin: '5px 0', fontSize: '11pt' }}>{clinica.endereco || 'Endereço não disponível'}</p>
            <p style={{ margin: '0', fontSize: '11pt' }}>
              <strong>Tel:</strong> {clinica.telefone || '---'} | <strong>Email:</strong> {clinica.email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '16pt', margin: '0', letterSpacing: '1px' }}>DOSSIER CLÍNICO</h2>
            <p style={{ margin: '5px 0', fontSize: '10pt', color: '#333', fontStyle: 'italic' }}>Confidencial - Histórico Completo</p>
          </div>
        </div>

        {/* Identificação do Paciente */}
        <div className="print-section">
          <div className="section-title">Dados do Paciente</div>
          <table style={{ border: 'none' }}>
            <tbody style={{ border: 'none' }}>
              <tr style={{ border: 'none' }}>
                <td style={{ border: 'none', width: '50%' }}>
                  <strong>Nome:</strong> {paciente.nome}
                </td>
                <td style={{ border: 'none', width: '50%' }}>
                  <strong>Nº Processo:</strong> {paciente.numeroPaciente}
                </td>
              </tr>
              <tr style={{ border: 'none' }}>
                <td style={{ border: 'none' }}>
                  <strong>Data de Nascimento:</strong> {formatDate(new Date(paciente.dataNascimento))}
                </td>
                <td style={{ border: 'none' }}>
                  <strong>Género:</strong> {paciente.genero === 'M' ? 'Masculino' : paciente.genero === 'F' ? 'Feminino' : 'Outro'}
                </td>
              </tr>
              <tr style={{ border: 'none' }}>
                <td style={{ border: 'none' }}>
                  <strong>Telefone:</strong> {paciente.telefone || '---'}
                </td>
                <td style={{ border: 'none' }}>
                  <strong>Grupo Sanguíneo:</strong> {paciente.tipoSangue || 'Não Registado'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Alergias */}
        <div className="print-section">
          <div className="section-title">Alergias e Restrições Clínicas</div>
          <div style={{ padding: '12px', backgroundColor: '#fdf2f2', border: '1px solid #f8d7da', borderRadius: '4px' }}>
            {paciente.alergias && paciente.alergias.length > 0 ? (
              <p style={{ margin: 0, color: '#721c24', fontWeight: 'bold' }}>
                ALERTA: {paciente.alergias.join(', ')}
              </p>
            ) : (
              <p style={{ margin: 0, fontStyle: 'italic', color: '#666' }}>O paciente não possui alergias declaradas ou registadas no sistema.</p>
            )}
          </div>
        </div>

        {/* Histórico de Agendamentos */}
        <div className="print-section">
          <div className="section-title">Histórico de Consultas e Atendimentos</div>
          {agendamentos.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Data</th>
                  <th style={{ width: '15%' }}>Hora</th>
                  <th style={{ width: '20%' }}>Tipo</th>
                  <th style={{ width: '30%' }}>Médico Responsável</th>
                  <th style={{ width: '20%' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.dataHora).toLocaleDateString('pt-AO')}</td>
                    <td>{new Date(a.dataHora).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.tipo.toLowerCase()}</td>
                    <td>Dr(a). {a.medico.nome}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.estado.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>Nenhum registo de consulta encontrado.</p>
          )}
        </div>

        {/* Histórico de Receitas */}
        <div className="print-section">
          <div className="section-title">Histórico de Prescrições Médicas</div>
          {receitas.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {receitas.map((r) => (
                <div key={r.id} style={{ border: '1px solid #000', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                    <strong>Emissão: {new Date(r.criadoEm).toLocaleDateString('pt-AO')}</strong>
                    <strong>Médico: Dr(a). {r.medico?.nome}</strong>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '10pt' }}><strong>Diagnóstico:</strong> {r.diagnostico}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Medicamento</th>
                        <th>Dosagem</th>
                        <th>Frequência</th>
                        <th>Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.medicamentos.map((m, idx) => (
                        <tr key={idx}>
                          <td>{m.nome}</td>
                          <td>{m.dosagem}</td>
                          <td>{m.frequencia}</td>
                          <td>{m.duracao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {r.observacoes && <p style={{ margin: '8px 0 0', fontSize: '9pt', fontStyle: 'italic' }}><strong>Obs:</strong> {r.observacoes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>Não existem registos de prescrições médicas.</p>
          )}
        </div>

        {/* Rodapé de Validade */}
        <div style={{ marginTop: '50px', paddingTop: '15px', borderTop: '1px solid #000', fontSize: '9pt', color: '#444', textAlign: 'center' }}>
          <p style={{ marginBottom: '5px' }}>
            Documento gerado eletronicamente em {today.toLocaleString('pt-AO')} por <strong>ClinicaPlus v3.0</strong>
          </p>
          <p style={{ fontStyle: 'italic', fontSize: '8pt' }}>
            A validade legal deste dossier depende da aposição de carimbo e assinatura original da direção clínica da {clinica.nome}.
          </p>
        </div>
      </div>
    );
  }
);

DossierClinicoPrint.displayName = 'DossierClinicoPrint';

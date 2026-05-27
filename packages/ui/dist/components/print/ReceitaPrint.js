"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceitaPrint = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const utils_1 = require("@clinicaplus/utils");
exports.ReceitaPrint = (0, react_1.forwardRef)(({ receita, clinicaNome, clinicaEndereco, clinicaTelefone, clinicaEmail }, ref) => {
    const paciente = receita.paciente;
    const medico = receita.medico;
    if (!paciente || !medico) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("div", { ref: ref, className: "receita-print-wrapper", children: [(0, jsx_runtime_1.jsx)("style", { children: `
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
        ` }), (0, jsx_runtime_1.jsxs)("div", { style: { borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { fontSize: '18pt', fontWeight: 'bold', margin: '0 0 8px' }, children: clinicaNome }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '10pt', color: '#333', lineHeight: '1.4' }, children: [clinicaEndereco && (0, jsx_runtime_1.jsx)("p", { style: { margin: 0 }, children: clinicaEndereco }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '15px' }, children: [clinicaTelefone && (0, jsx_runtime_1.jsxs)("p", { style: { margin: 0 }, children: ["Tel: ", clinicaTelefone] }), clinicaEmail && (0, jsx_runtime_1.jsxs)("p", { style: { margin: 0 }, children: ["Email: ", clinicaEmail] })] })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'center', marginBottom: '24px' }, children: (0, jsx_runtime_1.jsx)("h2", { style: { fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }, children: "Receita M\u00E9dica" }) }), (0, jsx_runtime_1.jsx)("div", { style: { border: '1px solid #ddd', padding: '12px', marginBottom: '24px', borderRadius: '4px' }, children: (0, jsx_runtime_1.jsx)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }, children: (0, jsx_runtime_1.jsxs)("tbody", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { style: { width: '60%', padding: '6px 0' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Paciente:" }), " ", paciente.nome] }), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '6px 0' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Procedimento N\u00BA:" }), " ", paciente.numeroPaciente] })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { style: { padding: '6px 0' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "M\u00E9dico:" }), " ", medico.nome] }), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '6px 0' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Especialidade:" }), " ", medico.especialidade?.nome] })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { style: { padding: '6px 0' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Data de Emiss\u00E3o:" }), " ", (0, utils_1.formatDate)(receita.dataEmissao)] }), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '6px 0' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "V\u00E1lida at\u00E9:" }), " ", (0, utils_1.formatDate)(receita.dataValidade)] })] })] }) }) }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '24px' }, children: [(0, jsx_runtime_1.jsx)("p", { style: { fontWeight: 'bold', marginBottom: '6px', fontSize: '11pt' }, children: "Diagn\u00F3stico:" }), (0, jsx_runtime_1.jsx)("p", { style: { padding: '10px 15px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #000', margin: 0, minHeight: '40px' }, children: receita.diagnostico })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '32px' }, children: [(0, jsx_runtime_1.jsx)("p", { style: { fontWeight: 'bold', fontSize: '18pt', marginBottom: '16px', color: '#000' }, children: "\u211E" }), (0, jsx_runtime_1.jsx)("div", { style: { paddingLeft: '10px' }, children: receita.medicamentos.map((med, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '16px', breakInside: 'avoid' }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { fontWeight: 'bold', margin: '0 0 4px', fontSize: '11.5pt' }, children: [i + 1, ". ", med.nome] }), (0, jsx_runtime_1.jsxs)("div", { style: { paddingLeft: '20px', lineHeight: '1.5' }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { margin: '0 0 2px' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Posologia:" }), " ", med.dosagem, " \u2014 ", med.frequencia, " \u2014 durante ", med.duracao] }), med.instrucoes && ((0, jsx_runtime_1.jsxs)("p", { style: { margin: 0, fontStyle: 'italic', color: '#333' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Instru\u00E7\u00F5es:" }), " ", med.instrucoes] }))] })] }, i))) })] }), receita.observacoes && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '32px', breakInside: 'avoid' }, children: [(0, jsx_runtime_1.jsx)("p", { style: { fontWeight: 'bold', marginBottom: '6px' }, children: "Observa\u00E7\u00F5es:" }), (0, jsx_runtime_1.jsx)("p", { style: { paddingLeft: '15px', color: '#444', margin: 0, fontSize: '10.5pt' }, children: receita.observacoes })] })), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 'auto', paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', breakInside: 'avoid' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { borderTop: '1px solid #000', width: '300px', textAlign: 'center', paddingTop: '8px' }, children: [(0, jsx_runtime_1.jsx)("p", { style: { margin: '0 0 2px', fontWeight: 'bold', fontSize: '11pt' }, children: medico.nome }), (0, jsx_runtime_1.jsx)("p", { style: { margin: '0 0 2px', fontSize: '9pt', color: '#444' }, children: medico.especialidade?.nome }), medico.ordem && ((0, jsx_runtime_1.jsxs)("p", { style: { margin: 0, fontSize: '9pt', color: '#444' }, children: ["N\u00BA Ordem: ", medico.ordem] }))] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '20px', fontSize: '8pt', color: '#888' }, children: ["Documento gerado digitalmente por ClinicaPlus em ", (0, utils_1.formatDate)(new Date())] })] })] }));
});
exports.ReceitaPrint.displayName = 'ReceitaPrint';
//# sourceMappingURL=ReceitaPrint.js.map
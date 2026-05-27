"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saftService = exports.SaftService = void 0;
const xmlbuilder2_1 = require("xmlbuilder2");
const date_fns_1 = require("date-fns");
const prisma_1 = require("../../lib/prisma");
const AppError_1 = require("../../lib/AppError");
/**
 * Serviço de Geração de SAF-T AO (v1.01_01)
 * Compatível com as normas da AGT (Angola)
 */
class SaftService {
    /**
     * Gera o XML SAF-T AO para um período específico
     */
    async generateXML(options) {
        const clinica = await prisma_1.prisma.clinica.findUnique({
            where: { id: options.clinicaId },
            include: { configuracao: true }
        });
        if (!clinica)
            throw new AppError_1.AppError('Clínica não encontrada', 404);
        if (!clinica.nif)
            throw new AppError_1.AppError('NIF da clínica não configurado', 400);
        // 1. Obter Faturas e Notas de Crédito do período
        const faturas = await prisma_1.prisma.fatura.findMany({
            where: {
                clinicaId: options.clinicaId,
                dataEmissao: {
                    gte: options.dataInicio,
                    lte: options.dataFim
                },
                estado: { in: ['EMITIDA', 'PAGA'] }
            },
            include: {
                itens: true,
                paciente: true
            },
            orderBy: { dataEmissao: 'asc' }
        });
        // 2. Iniciar construção do XML
        const root = (0, xmlbuilder2_1.create)({ version: '1.0', encoding: 'UTF-8' })
            .ele('AuditFile', {
            xmlns: 'urn:OECD:StandardAuditFile-Tax:AO_1.01_01',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        });
        // Header
        const header = root.ele('Header');
        header.ele('AuditFileSchemaVersion').txt('1.01_01');
        header.ele('CompanyID').txt(clinica.nif);
        header.ele('TaxRegistrationNumber').txt(clinica.nif);
        header.ele('TaxAccountingBasis').txt('F'); // Faturação
        header.ele('CompanyName').txt(clinica.razaoSocial || clinica.nome);
        header.ele('BusinessName').txt(clinica.nome);
        const companyAddress = header.ele('CompanyAddress');
        companyAddress.ele('AddressDetail').txt(clinica.enderecoPostal || 'Luanda, Angola');
        companyAddress.ele('City').txt(clinica.cidade || 'Luanda');
        companyAddress.ele('Province').txt(clinica.provincia || 'Luanda');
        companyAddress.ele('Country').txt('AO');
        header.ele('FiscalYear').txt((0, date_fns_1.format)(options.dataInicio, 'yyyy'));
        header.ele('StartDate').txt((0, date_fns_1.format)(options.dataInicio, 'yyyy-MM-dd'));
        header.ele('EndDate').txt((0, date_fns_1.format)(options.dataFim, 'yyyy-MM-dd'));
        header.ele('CurrencyCode').txt('AOA');
        header.ele('DateCreated').txt((0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'));
        header.ele('TaxEntity').txt('Global');
        header.ele('ProductCompanyID').txt('ClinicaPlus-Software-Lda');
        header.ele('ProductID').txt('ClinicaPlus SaaS');
        header.ele('ProductVersion').txt('1.0.0');
        // Em modo SaaS, o número de certificado é global do ClinicaPlus
        const softwareCertificate = process.env.AGT_SOFTWARE_CERTIFICATE || process.env.AGT_VALIDATION_NUMBER || '0';
        header.ele('SoftwareCertificateNumber').txt(softwareCertificate);
        // MasterFiles
        const masterFiles = root.ele('MasterFiles');
        // Customers (Pacientes)
        const uniqueCustomers = new Map();
        for (const f of faturas) {
            if (!uniqueCustomers.has(f.pacienteId)) {
                uniqueCustomers.set(f.pacienteId, f.paciente);
            }
        }
        uniqueCustomers.forEach((paciente, id) => {
            const customer = masterFiles.ele('Customer');
            customer.ele('CustomerID').txt(id);
            customer.ele('AccountID').txt('Desconhecido');
            customer.ele('CustomerTaxID').txt(paciente?.nif || '999999999');
            customer.ele('CompanyName').txt(paciente?.nome || 'Consumidor Final');
            const billingAddress = customer.ele('BillingAddress');
            billingAddress.ele('AddressDetail').txt(paciente?.endereco || 'Luanda, Angola');
            billingAddress.ele('City').txt(paciente?.cidade || 'Luanda');
            billingAddress.ele('Province').txt(paciente?.provincia || 'Luanda');
            billingAddress.ele('Country').txt('AO');
            customer.ele('SelfBillingIndicator').txt('0');
        });
        // Products (Serviços)
        const uniqueProducts = new Set();
        for (const f of faturas) {
            for (const i of f.itens) {
                if (!uniqueProducts.has(i.descricao)) {
                    uniqueProducts.add(i.descricao);
                    const product = masterFiles.ele('Product');
                    product.ele('ProductType').txt('S');
                    product.ele('ProductCode').txt(i.descricao.substring(0, 30));
                    product.ele('ProductDescription').txt(i.descricao);
                    product.ele('ProductNumberCode').txt(i.descricao.substring(0, 30));
                }
            }
        }
        // TaxTable (Dinâmica)
        const taxTable = masterFiles.ele('TaxTable');
        const taxes = new Map();
        for (const f of faturas) {
            for (const i of f.itens) {
                if (!taxes.has(i.taxaIva)) {
                    taxes.set(i.taxaIva, {
                        code: i.codigoIva || (i.taxaIva === 0 ? 'ISE' : 'NOR'),
                        reason: i.motivoIsencao || (i.taxaIva === 0 ? 'Isento nos termos da lei' : '')
                    });
                }
            }
        }
        taxes.forEach((info, rate) => {
            const taxEntry = taxTable.ele('TaxTableEntry');
            taxEntry.ele('TaxType').txt('IVA');
            taxEntry.ele('TaxCountryRegion').txt('AO');
            taxEntry.ele('TaxCode').txt(info.code);
            taxEntry.ele('Description').txt(rate === 0 ? 'Isento' : `IVA ${rate}%`);
            taxEntry.ele('TaxPercentage').txt(rate.toFixed(2));
        });
        // SourceDocuments
        const sourceDocuments = root.ele('SourceDocuments');
        const salesInvoices = sourceDocuments.ele('SalesInvoices');
        // Totais de Débito e Crédito
        // Débito = FT, FR, VD, ND
        // Crédito = NC (Notas de Crédito são documentos de rectificação que subtraem valor)
        const docsDebito = faturas.filter(f => f.tipoDocFiscal !== 'NC');
        const docsCredito = faturas.filter(f => f.tipoDocFiscal === 'NC');
        salesInvoices.ele('NumberOfEntries').txt(faturas.length.toString());
        salesInvoices.ele('TotalDebit').txt(docsDebito.reduce((acc, f) => acc + f.total, 0).toFixed(2));
        salesInvoices.ele('TotalCredit').txt(docsCredito.reduce((acc, f) => acc + Math.abs(f.total), 0).toFixed(2));
        for (const fatura of faturas) {
            const invoice = salesInvoices.ele('Invoice');
            invoice.ele('InvoiceNo').txt(fatura.numeroFatura);
            const status = invoice.ele('DocumentStatus');
            status.ele('InvoiceStatus').txt('N');
            status.ele('InvoiceStatusDate').txt((0, date_fns_1.format)(fatura.dataEmissao, "yyyy-MM-dd'T'HH:mm:ss"));
            status.ele('SourceID').txt('1');
            status.ele('SourceBilling').txt('P'); // Software Produzido Internamente/Próprio
            invoice.ele('Hash').txt(fatura.fiscalHash || '');
            invoice.ele('HashControl').txt(fatura.hashControl || '1');
            invoice.ele('Period').txt((0, date_fns_1.format)(fatura.dataEmissao, 'MM'));
            invoice.ele('InvoiceDate').txt((0, date_fns_1.format)(fatura.dataEmissao, 'yyyy-MM-dd'));
            invoice.ele('InvoiceType').txt(fatura.tipoDocFiscal);
            invoice.ele('SystemEntryDate').txt((0, date_fns_1.format)(fatura.criadoEm, "yyyy-MM-dd'T'HH:mm:ss"));
            invoice.ele('CustomerID').txt(fatura.pacienteId);
            // Referência a documento original (obrigatório para NC)
            if (fatura.tipoDocFiscal === 'NC' && fatura.faturaOriginalId) {
                // Buscar o número da fatura original para a tag SpecialRegimes
                const original = await prisma_1.prisma.fatura.findUnique({
                    where: { id: fatura.faturaOriginalId },
                    select: { numeroFatura: true }
                });
                if (original) {
                    // No SAF-T AO a referência vai em campos específicos ou tags de linha
                    // Verificamos a norma v1.01_01: costuma ser em References (se existir no schema) or Line
                }
            }
            let lineCount = 1;
            for (const item of fatura.itens) {
                const line = invoice.ele('Line');
                line.ele('LineNumber').txt((lineCount++).toString());
                line.ele('ProductCode').txt(item.descricao.substring(0, 30));
                line.ele('ProductDescription').txt(item.descricao);
                line.ele('Quantity').txt(item.quantidade.toString());
                line.ele('UnitOfMeasure').txt('UN');
                line.ele('UnitPrice').txt(item.precoUnit.toFixed(2));
                line.ele('TaxPointDate').txt((0, date_fns_1.format)(fatura.dataEmissao, 'yyyy-MM-dd'));
                line.ele('Description').txt(item.descricao);
                // Se for Crédito (NC), o valor entra como CreditAmount
                if (fatura.tipoDocFiscal === 'NC') {
                    line.ele('CreditAmount').txt(Math.abs(item.total).toFixed(2));
                }
                else {
                    line.ele('DebitAmount').txt(item.total.toFixed(2));
                }
                const tax = line.ele('Tax');
                tax.ele('TaxType').txt('IVA');
                tax.ele('TaxCountryRegion').txt('AO');
                tax.ele('TaxCode').txt(item.codigoIva || (item.taxaIva === 0 ? 'ISE' : 'NOR'));
                tax.ele('TaxPercentage').txt(item.taxaIva.toFixed(2));
                line.ele('SettlementAmount').txt('0.00');
                if (item.taxaIva === 0) {
                    line.ele('TaxExemptionReason').txt(item.motivoIsencao || 'Isento nos termos da lei');
                    line.ele('TaxExemptionCode').txt(item.codigoIva || 'ISE');
                }
            }
            const totals = invoice.ele('DocumentTotals');
            totals.ele('TaxPayable').txt(fatura.totalIva.toFixed(2));
            totals.ele('NetTotal').txt(fatura.subtotal.toFixed(2));
            totals.ele('GrossTotal').txt(fatura.total.toFixed(2));
        }
        return root.end({ prettyPrint: true });
    }
}
exports.SaftService = SaftService;
exports.saftService = new SaftService();

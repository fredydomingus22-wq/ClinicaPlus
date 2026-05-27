import { create } from 'xmlbuilder2';
import { format } from 'date-fns';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';

export interface SaftExportOptions {
  clinicaId: string;
  dataInicio: Date;
  dataFim: Date;
}

/**
 * Serviço de Geração de SAF-T AO (v1.01_01)
 * Compatível com as normas da AGT (Angola)
 */
export class SaftService {
  /**
   * Gera o XML SAF-T AO para um período específico
   */
  public async generateXML(options: SaftExportOptions): Promise<string> {
    const clinica = await prisma.clinica.findUnique({
      where: { id: options.clinicaId },
      include: { configuracao: true }
    });

    if (!clinica) throw new AppError('Clínica não encontrada', 404);
    if (!clinica.nif) throw new AppError('NIF da clínica não configurado', 400);

    // 1. Obter Faturas e Notas de Crédito do período
    const faturas = await prisma.fatura.findMany({
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
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('AuditFile', { 
        xmlns: 'urn:OECD:StandardAuditFile-Tax:AO_1.01_01',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
      });

    // Header - ordem conforme schema oficial SAF-T AO v1.01_01
    const header = root.ele('Header');
    header.ele('AuditFileVersion').txt('1.01_01');
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

    header.ele('FiscalYear').txt(format(options.dataInicio, 'yyyy'));
    header.ele('StartDate').txt(format(options.dataInicio, 'yyyy-MM-dd'));
    header.ele('EndDate').txt(format(options.dataFim, 'yyyy-MM-dd'));
    header.ele('CurrencyCode').txt('AOA');
    header.ele('DateCreated').txt(format(new Date(), 'yyyy-MM-dd'));
    header.ele('TaxEntity').txt('Global');
    header.ele('ProductCompanyTaxID').txt(process.env.AGT_PRODUCT_COMPANY_TAX_ID || clinica.configuracao?.agtProductCompanyTaxId || '');
    header.ele('SoftwareValidationNumber').txt(process.env.AGT_VALIDATION_NUMBER || clinica.configuracao?.agtSoftwareValidationNumber || '0/AGT/2020');
    header.ele('ProductID').txt(process.env.AGT_PRODUCT_ID || clinica.configuracao?.agtProductId || 'ClinicaPlus/ClinicaPlus-Software-Lda');
    header.ele('ProductVersion').txt(process.env.AGT_PRODUCT_VERSION || clinica.configuracao?.agtProductVersion || '1.0.0');

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
      // CustomerTaxID deve ter 10-15 dígitos (SAFAOAngolaVatNumber)
      const nif = paciente?.nif || '9999999999';
      customer.ele('CustomerTaxID').txt(nif.substring(0, Math.min(15, Math.max(10, nif.length))));
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
    const taxes = new Map<number, { code: string, reason: string }>();
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
      
      // DocumentStatus - PRIMEIRO conforme schema XSD
      const status = invoice.ele('DocumentStatus');
      status.ele('InvoiceStatus').txt('N'); 
      status.ele('InvoiceStatusDate').txt(format(fatura.dataEmissao!, "yyyy-MM-dd'T'HH:mm:ss"));
      status.ele('SourceID').txt('1'); // SourceID obrigatório dentro de DocumentStatus
      status.ele('SourceBilling').txt('P'); // Software Produzido Internamente/Próprio
      
      // Hash para SAF-T: usar os primeiros 8 caracteres do hash fiscal (formato esperado pelo validador AGT)
      const hashValue = fatura.fiscalHash || '';
      invoice.ele('Hash').txt(hashValue.substring(0, 8));
      invoice.ele('HashControl').txt(fatura.hashControl || '1');
      invoice.ele('Period').txt(format(fatura.dataEmissao!, 'MM'));
      invoice.ele('InvoiceDate').txt(format(fatura.dataEmissao!, 'yyyy-MM-dd'));
      invoice.ele('InvoiceType').txt(fatura.tipoDocFiscal);
      
      // SpecialRegimes - type SpecialRegimes conforme schema
      const specialRegimes = invoice.ele('SpecialRegimes');
      specialRegimes.ele('SpecialRegime').txt('0'); // 0 = Sem regime especial
      specialRegimes.ele('SelfBillingIndicator').txt('0'); // 0 = Não é autofaturação
      specialRegimes.ele('CashVATSchemeIndicator').txt('0'); // 0 = Não está no regime de caixa
      specialRegimes.ele('ThirdPartiesBillingIndicator').txt('0'); // 0 = Não é faturação por terceiros
      
      // SourceID no nível da Invoice (DEPOIS de SpecialRegimes)
      invoice.ele('SourceID').txt('1');
      
      invoice.ele('SystemEntryDate').txt(format(fatura.criadoEm, "yyyy-MM-dd'T'HH:mm:ss"));
      invoice.ele('CustomerID').txt(fatura.pacienteId);

      // Referência a documento original (obrigatório para NC)
      if (fatura.tipoDocFiscal === 'NC' && fatura.faturaOriginalId) {
        // Buscar o número da fatura original para a tag SpecialRegimes
        const original = await prisma.fatura.findUnique({
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
        line.ele('TaxPointDate').txt(format(fatura.dataEmissao!, 'yyyy-MM-dd'));
        line.ele('Description').txt(item.descricao);
        
        // Para SAF-T AO, sempre usar DebitAmount para valores positivos
        // Notas de crédito devem ter CreditAmount para indicar valor negativo
        if (fatura.tipoDocFiscal === 'NC') {
          line.ele('CreditAmount').txt(Math.abs(item.total).toFixed(2));
          line.ele('DebitAmount').txt('0.00');
        } else {
          line.ele('DebitAmount').txt(item.total.toFixed(2));
          line.ele('CreditAmount').txt('0.00');
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

      // Calcular totais a partir das linhas (para garantir consistência)
      const calculatedNetTotal = fatura.itens.reduce((sum, item) => sum + item.total, 0);
      const calculatedTaxPayable = fatura.itens.reduce((sum, item) => {
        return sum + (item.total * (item.taxaIva / 100));
      }, 0);
      const calculatedGrossTotal = calculatedNetTotal + calculatedTaxPayable;
      
      const totals = invoice.ele('DocumentTotals');
      totals.ele('TaxPayable').txt(calculatedTaxPayable.toFixed(2));
      totals.ele('NetTotal').txt(calculatedNetTotal.toFixed(2));
      totals.ele('GrossTotal').txt(calculatedGrossTotal.toFixed(2));
    }

    return root.end({ prettyPrint: true });
  }
}

export const saftService = new SaftService();

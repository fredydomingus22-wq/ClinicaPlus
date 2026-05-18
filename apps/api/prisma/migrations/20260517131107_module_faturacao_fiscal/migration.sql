-- AlterTable
ALTER TABLE "clinicas" ADD COLUMN     "agtApiToken" TEXT,
ADD COLUMN     "serieDocFiscal" TEXT NOT NULL DEFAULT 'CPLS';

-- AlterTable
ALTER TABLE "faturas" ADD COLUMN     "faturaOriginalId" TEXT,
ADD COLUMN     "motivoAnulacao" TEXT;

-- CreateTable
CREATE TABLE "sequencia_doc_fiscal" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "tipoDoc" "TipoDocumentoFiscal" NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'CPLS',
    "anoFiscal" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequencia_doc_fiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatura_snapshots" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT NOT NULL,
    "emitenteNif" TEXT NOT NULL,
    "emitenteNome" TEXT NOT NULL,
    "emitenteEndereco" TEXT NOT NULL,
    "emitenteCidade" TEXT,
    "emitenteProvincia" TEXT,
    "clienteNome" TEXT NOT NULL,
    "clienteNif" TEXT NOT NULL DEFAULT '999999990',
    "clienteEndereco" TEXT,
    "regimeFiscal" "RegimeFiscal" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fatura_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sequencia_doc_fiscal_clinicaId_tipoDoc_serie_anoFiscal_key" ON "sequencia_doc_fiscal"("clinicaId", "tipoDoc", "serie", "anoFiscal");

-- CreateIndex
CREATE UNIQUE INDEX "fatura_snapshots_faturaId_key" ON "fatura_snapshots"("faturaId");

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_faturaOriginalId_fkey" FOREIGN KEY ("faturaOriginalId") REFERENCES "faturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequencia_doc_fiscal" ADD CONSTRAINT "sequencia_doc_fiscal_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatura_snapshots" ADD CONSTRAINT "fatura_snapshots_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "subscricoes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "plano" "Plano" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "proximoFaturamento" TIMESTAMP(3) NOT NULL,
    "canceladoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'Kz',
    "status" TEXT NOT NULL DEFAULT 'PAGO',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "urlPdf" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscricoes_clinicaId_key" ON "subscricoes"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_numero_key" ON "faturas"("numero");

-- CreateIndex
CREATE INDEX "faturas_clinicaId_idx" ON "faturas"("clinicaId");

-- AddForeignKey
ALTER TABLE "subscricoes" ADD CONSTRAINT "subscricoes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

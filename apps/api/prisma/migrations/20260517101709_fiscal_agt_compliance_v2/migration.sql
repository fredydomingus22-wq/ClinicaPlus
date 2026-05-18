-- CreateEnum
CREATE TYPE "TipoDocumentoFiscal" AS ENUM ('FT', 'FR', 'VD', 'NC', 'ND');

-- CreateEnum
CREATE TYPE "RegimeFiscal" AS ENUM ('GERAL', 'SIMPLIFICADO', 'EXUSA');

-- AlterTable
ALTER TABLE "clinicas" ADD COLUMN     "agtSoftwareCert" TEXT,
ADD COLUMN     "enderecoPostal" TEXT,
ADD COLUMN     "nif" TEXT,
ADD COLUMN     "razaoSocial" TEXT,
ADD COLUMN     "regimeFiscal" "RegimeFiscal" NOT NULL DEFAULT 'GERAL';

-- AlterTable
ALTER TABLE "faturas" ADD COLUMN     "agtRequestID" TEXT,
ADD COLUMN     "documentoChave" TEXT,
ADD COLUMN     "fiscalHash" TEXT,
ADD COLUMN     "hashControl" TEXT DEFAULT '1',
ADD COLUMN     "moeda" TEXT NOT NULL DEFAULT 'AOA',
ADD COLUMN     "retencaoFonte" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "statusEnvio" TEXT NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "tipoDocFiscal" "TipoDocumentoFiscal" NOT NULL DEFAULT 'FT',
ADD COLUMN     "valorExtenso" TEXT,
ADD COLUMN     "valorPago" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN     "codigoIva" TEXT NOT NULL DEFAULT 'ISE',
ADD COLUMN     "motivoIsencao" TEXT,
ADD COLUMN     "taxaIva" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "nif" TEXT DEFAULT '999999999';

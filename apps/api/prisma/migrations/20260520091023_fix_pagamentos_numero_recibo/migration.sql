/*
  Warnings:

  - The values [VD] on the enum `TipoDocumentoFiscal` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoDocumentoFiscal_new" AS ENUM ('FA', 'FT', 'FR', 'FG', 'GF', 'AC', 'AR', 'TV', 'RC', 'RG', 'RE', 'ND', 'NC', 'AF', 'RP', 'RA', 'CS', 'LD');
ALTER TABLE "faturas" ALTER COLUMN "tipoDocFiscal" DROP DEFAULT;
ALTER TABLE "faturas" ALTER COLUMN "tipoDocFiscal" TYPE "TipoDocumentoFiscal_new" USING ("tipoDocFiscal"::text::"TipoDocumentoFiscal_new");
ALTER TABLE "sequencia_doc_fiscal" ALTER COLUMN "tipoDoc" TYPE "TipoDocumentoFiscal_new" USING ("tipoDoc"::text::"TipoDocumentoFiscal_new");
ALTER TYPE "TipoDocumentoFiscal" RENAME TO "TipoDocumentoFiscal_old";
ALTER TYPE "TipoDocumentoFiscal_new" RENAME TO "TipoDocumentoFiscal";
DROP TYPE "TipoDocumentoFiscal_old";
ALTER TABLE "faturas" ALTER COLUMN "tipoDocFiscal" SET DEFAULT 'FT';
COMMIT;

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN     "documentoChave" TEXT,
ADD COLUMN     "fiscalHash" TEXT,
ADD COLUMN     "numeroRecibo" TEXT;

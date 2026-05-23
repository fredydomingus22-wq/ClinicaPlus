-- Corrective migration: remove VD from TipoDocumentoFiscal safely
BEGIN;

-- 1) Merge potential VD -> FT collisions in unique key before replacing enum value
UPDATE "sequencia_doc_fiscal" ft
SET
  "ultimoNumero" = GREATEST(ft."ultimoNumero", vd."ultimoNumero"),
  "isContingency" = (ft."isContingency" OR vd."isContingency"),
  "startTS" = COALESCE(ft."startTS", vd."startTS"),
  "endTS" = COALESCE(ft."endTS", vd."endTS"),
  "isRegistered" = (ft."isRegistered" OR vd."isRegistered")
FROM "sequencia_doc_fiscal" vd
WHERE vd."tipoDoc"::text = 'VD'
  AND ft."tipoDoc"::text = 'FT'
  AND ft."clinicaId" = vd."clinicaId"
  AND ft."serie" = vd."serie"
  AND ft."anoFiscal" = vd."anoFiscal";

DELETE FROM "sequencia_doc_fiscal" vd
WHERE vd."tipoDoc"::text = 'VD'
  AND EXISTS (
    SELECT 1
    FROM "sequencia_doc_fiscal" ft
    WHERE ft."tipoDoc"::text = 'FT'
      AND ft."clinicaId" = vd."clinicaId"
      AND ft."serie" = vd."serie"
      AND ft."anoFiscal" = vd."anoFiscal"
  );

-- 2) Normalize remaining rows that still use VD
UPDATE "sequencia_doc_fiscal"
SET "tipoDoc" = 'FT'
WHERE "tipoDoc"::text = 'VD';

UPDATE "faturas"
SET "tipoDocFiscal" = 'FT'
WHERE "tipoDocFiscal"::text = 'VD';

-- 3) Recreate enum without VD
CREATE TYPE "TipoDocumentoFiscal_new" AS ENUM (
  'FA', 'FT', 'FR', 'FG', 'GF', 'AC', 'AR', 'TV', 'RC', 'RG', 'RE', 'ND', 'NC', 'AF', 'RP', 'RA', 'CS', 'LD'
);

ALTER TABLE "faturas" ALTER COLUMN "tipoDocFiscal" DROP DEFAULT;
ALTER TABLE "faturas"
  ALTER COLUMN "tipoDocFiscal"
  TYPE "TipoDocumentoFiscal_new"
  USING ("tipoDocFiscal"::text::"TipoDocumentoFiscal_new");

ALTER TABLE "sequencia_doc_fiscal"
  ALTER COLUMN "tipoDoc"
  TYPE "TipoDocumentoFiscal_new"
  USING ("tipoDoc"::text::"TipoDocumentoFiscal_new");

ALTER TYPE "TipoDocumentoFiscal" RENAME TO "TipoDocumentoFiscal_old";
ALTER TYPE "TipoDocumentoFiscal_new" RENAME TO "TipoDocumentoFiscal";
DROP TYPE "TipoDocumentoFiscal_old";

ALTER TABLE "faturas" ALTER COLUMN "tipoDocFiscal" SET DEFAULT 'FT';

COMMIT;

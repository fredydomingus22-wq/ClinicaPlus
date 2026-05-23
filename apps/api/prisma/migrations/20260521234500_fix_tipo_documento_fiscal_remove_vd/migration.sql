-- Idempotent: remove VD from TipoDocumentoFiscal (safe if 20260520091023 already ran).
-- No explicit BEGIN/COMMIT — Prisma wraps each migration in a transaction.

-- Cleanup orphan types from a previously failed attempt
DROP TYPE IF EXISTS "TipoDocumentoFiscal_old";
DROP TYPE IF EXISTS "TipoDocumentoFiscal_new";

-- Normalize invoice rows (no-op when VD already absent)
UPDATE "faturas"
SET "tipoDocFiscal" = 'FT'
WHERE "tipoDocFiscal"::text = 'VD';

-- Merge VD sequencias into existing FT rows (same clinica/serie/ano)
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

-- Drop VD rows that would collide with FT on unique (clinicaId, tipoDoc, serie, anoFiscal)
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

-- Remaining isolated VD rows can become FT without unique conflict
UPDATE "sequencia_doc_fiscal" s
SET "tipoDoc" = 'FT'
WHERE s."tipoDoc"::text = 'VD'
  AND NOT EXISTS (
    SELECT 1
    FROM "sequencia_doc_fiscal" ft
    WHERE ft."tipoDoc"::text = 'FT'
      AND ft."clinicaId" = s."clinicaId"
      AND ft."serie" = s."serie"
      AND ft."anoFiscal" = s."anoFiscal"
      AND ft."id" <> s."id"
  );

-- Drop any leftover VD sequencias (safety net)
DELETE FROM "sequencia_doc_fiscal"
WHERE "tipoDoc"::text = 'VD';

-- Recreate enum only when VD label still exists
DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TipoDocumentoFiscal'
      AND e.enumlabel = 'VD'
  ) THEN
    RETURN;
  END IF;

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
END $body$;

-- Migration: add missing columns to product_variations
-- Context: The init migration only created: id, product_id, name, description,
--          price_modifier, features, created_at.
--          The schema.prisma evolved to include the fields below, but no migration
--          was created. This migration adds all missing columns safely.
--          All new columns are nullable or have DEFAULT values to avoid breaking
--          existing rows.
-- NOTE: updated_at is intentionally NOT included here — it is added in migration
--       20260424000001_add_variation_updated_at as a separate nullable column,
--       because SQLite does not support NOT NULL DEFAULT CURRENT_TIMESTAMP in
--       ALTER TABLE ADD COLUMN on some host environments.

ALTER TABLE "product_variations" ADD COLUMN "price"             REAL     NOT NULL DEFAULT 0;
ALTER TABLE "product_variations" ADD COLUMN "deadline_days"     INTEGER;
ALTER TABLE "product_variations" ADD COLUMN "scope_description" TEXT;
ALTER TABLE "product_variations" ADD COLUMN "sort_order"        INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE "product_variations" ADD COLUMN "is_active"         BOOLEAN  NOT NULL DEFAULT true;

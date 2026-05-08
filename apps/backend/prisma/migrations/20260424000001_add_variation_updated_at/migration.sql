-- Migration: add updated_at to product_variations (separate from main migration)
-- Reason: SQLite in some cPanel environments does not accept:
--         ALTER TABLE ... ADD COLUMN ... DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
-- Solution: add as NULLABLE (DateTime? in schema). Prisma @updatedAt handles the
--           value on every INSERT/UPDATE automatically. Existing rows will have NULL,
--           which is correct and expected for historical data.

ALTER TABLE "product_variations" ADD COLUMN "updated_at" DATETIME;

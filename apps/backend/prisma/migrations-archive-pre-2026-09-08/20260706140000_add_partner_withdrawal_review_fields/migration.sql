-- AlterTable: campos de revisão/aprovação admin do saque de Partner.
-- Todos NULL-áveis e aditivos — não afeta nenhuma linha existente.
ALTER TABLE `partner_withdrawals`
  ADD COLUMN `notes` LONGTEXT NULL,
  ADD COLUMN `reviewed_by` VARCHAR(191) NULL,
  ADD COLUMN `reviewed_at` DATETIME(3) NULL;

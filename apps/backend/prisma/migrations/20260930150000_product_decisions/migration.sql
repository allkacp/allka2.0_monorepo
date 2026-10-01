-- AlterTable
ALTER TABLE `catalog2_package_items` ADD COLUMN `is_required` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_packages` ADD COLUMN `requirement_mode` VARCHAR(191) NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE `catalog2_pricing_settings` ADD COLUMN `subscription_grace_days` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `subscription_invoice_lead_days` INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `show_executor_name` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_subscriptions` ADD COLUMN `grace_days` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `invoice_lead_days` INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE `catalog2_task_ai` ADD COLUMN `ai_trigger` VARCHAR(191) NOT NULL DEFAULT 'manual';


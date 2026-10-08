-- D-2: cotação travada gerada a partir de um pedido "sob consulta" aprovado.
ALTER TABLE `catalog2_quotes` ADD COLUMN `commercial_request_id` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `catalog2_quotes_commercial_request_id_key` ON `catalog2_quotes`(`commercial_request_id`);

-- P-11: alterações grátis por produto (nulo = regra global) e registro de cada alteração cobrada.
ALTER TABLE `catalog2_products` ADD COLUMN `ai_free_changes` INTEGER NULL;

CREATE TABLE `ai_change_charges` (
  `id` VARCHAR(191) NOT NULL,
  `account_kind` VARCHAR(20) NOT NULL,
  `account_id` VARCHAR(191) NOT NULL,
  `project_product_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `feature` VARCHAR(60) NOT NULL,
  `is_free` BOOLEAN NOT NULL DEFAULT false,
  `amount_brl` DOUBLE NOT NULL DEFAULT 0,
  `ledger_id` VARCHAR(191) NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ai_change_charges_account_kind_account_id_idx`(`account_kind`, `account_id`),
  INDEX `ai_change_charges_project_product_id_idx`(`project_product_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

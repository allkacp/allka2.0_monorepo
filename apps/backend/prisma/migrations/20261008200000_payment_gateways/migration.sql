-- Gateways de pagamento trocáveis + recargas em andamento. Só cria tabelas novas (nada existente é alterado).
CREATE TABLE `payment_gateway_configs` (
  `key` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(191) NOT NULL DEFAULT 'sandbox',
  `is_active` BOOLEAN NOT NULL DEFAULT false,
  `public_json` TEXT NULL,
  `secret_ciphertext` LONGTEXT NULL,
  `fee_note` TEXT NULL,
  `last_test_at` DATETIME(3) NULL,
  `last_test_ok` BOOLEAN NULL,
  `last_test_message` TEXT NULL,
  `updated_by` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_gateway_changes` (
  `id` VARCHAR(191) NOT NULL,
  `from_key` VARCHAR(191) NULL,
  `to_key` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(191) NULL,
  `changed_by` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `payment_gateway_changes_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `wallet_topup_intents` (
  `id` VARCHAR(191) NOT NULL,
  `owner_type` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `method` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `gateway` VARCHAR(191) NOT NULL,
  `external_id` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `pix_copy_paste` TEXT NULL,
  `redirect_url` TEXT NULL,
  `expires_at` DATETIME(3) NULL,
  `paid_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `wallet_topup_intents_owner_type_owner_id_status_idx`(`owner_type`, `owner_id`, `status`),
  INDEX `wallet_topup_intents_gateway_external_id_idx`(`gateway`, `external_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

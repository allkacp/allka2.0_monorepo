-- Migration: add missing schema columns and tables
-- Covers schema changes from commits 0e85aca, ae59c24, aa31e84, 8747181
-- applied to schema.prisma without corresponding migrations.
--
-- Safety strategy:
--   • New tables       → CREATE TABLE IF NOT EXISTS   (idempotente nativamente)
--   • Columns in companies → SET @var + IF() + PREPARE/EXECUTE que verifica
--     information_schema antes de executar o ALTER TABLE.
--     MySQL 8.4 NÃO suporta ADD COLUMN IF NOT EXISTS (recurso exclusivo MariaDB).
--     PREPARE/EXECUTE é SQL padrão suportado pelo MySQL 8.4 e pelo Prisma migrate deploy.
--
-- Ordem de criação respeita dependências FK:
--   company_payment_methods → companies (original)
--   agency_leaderships      → partner_profiles + agencies (originais)
--   agency_reports          → partner_profiles + agencies (originais)
--   wallet_ledger           → wallets (criado na mesma migration, linha acima)
--   squad_configs           → companies (original)
--   squad_cycles            → squad_configs (criado na mesma migration, linha acima)

-- ─── 1. companies — add commercial/financial contact columns ──────────────────
-- Adicionadas no commit 0e85aca. Todas as 16 colunas fazem parte do mesmo commit.
-- Verificamos `use_master_as_financial_fallback` como coluna-proxy: se ela
-- não existir, nenhuma das 16 existe. Se existir, todas já foram aplicadas.

SET @_col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'companies'
      AND COLUMN_NAME  = 'use_master_as_financial_fallback'
);

SET @_alter_companies = IF(
    @_col_exists = 0,
    'ALTER TABLE `companies` ADD COLUMN `commercial_contact_name` VARCHAR(255) NULL, ADD COLUMN `commercial_contact_role` VARCHAR(100) NULL, ADD COLUMN `commercial_contact_email` VARCHAR(255) NULL, ADD COLUMN `commercial_contact_phone` VARCHAR(30) NULL, ADD COLUMN `commercial_contact_whatsapp` VARCHAR(30) NULL, ADD COLUMN `commercial_contact_preferred_channel` VARCHAR(50) NULL, ADD COLUMN `commercial_contact_notes` LONGTEXT NULL, ADD COLUMN `financial_contact_name` VARCHAR(255) NULL, ADD COLUMN `financial_contact_role` VARCHAR(100) NULL, ADD COLUMN `financial_contact_email` VARCHAR(255) NULL, ADD COLUMN `financial_contact_phone` VARCHAR(30) NULL, ADD COLUMN `financial_contact_whatsapp` VARCHAR(30) NULL, ADD COLUMN `financial_contact_preferred_channel` VARCHAR(50) NULL, ADD COLUMN `financial_contact_notes` LONGTEXT NULL, ADD COLUMN `financial_contact_user_id` VARCHAR(191) NULL, ADD COLUMN `use_master_as_financial_fallback` TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1'
);

PREPARE _stmt_companies FROM @_alter_companies;
EXECUTE _stmt_companies;
DEALLOCATE PREPARE _stmt_companies;

-- ─── 2. company_payment_methods ──────────────────────────────────────────────
-- Adicionada no commit ae59c24. FK para companies (tabela original).

CREATE TABLE IF NOT EXISTS `company_payment_methods` (
    `id`             VARCHAR(191) NOT NULL,
    `company_id`     VARCHAR(191) NOT NULL,
    `brand`          VARCHAR(20)  NOT NULL,
    `last_four`      VARCHAR(4)   NOT NULL,
    `expiry`         VARCHAR(7)   NOT NULL,
    `holder_name`    VARCHAR(255) NOT NULL,
    `is_default`     TINYINT(1)   NOT NULL DEFAULT 0,
    `is_client_card` TINYINT(1)   NOT NULL DEFAULT 0,
    `label`          VARCHAR(100) NULL,
    `is_active`      TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`     DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `company_payment_methods_company_id_fkey`(`company_id`),
    CONSTRAINT `company_payment_methods_company_id_fkey`
        FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 3. agency_leaderships ───────────────────────────────────────────────────
-- Adicionada no commit aa31e84. FK para partner_profiles e agencies (tabelas originais).

CREATE TABLE IF NOT EXISTS `agency_leaderships` (
    `id`         VARCHAR(191) NOT NULL,
    `partner_id` VARCHAR(191) NOT NULL,
    `agency_id`  VARCHAR(191) NOT NULL,
    `status`     VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes`      LONGTEXT     NULL,
    `started_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at`   DATETIME(3)  NULL,
    `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `agency_leaderships_partner_id_agency_id_key`(`partner_id`, `agency_id`),
    INDEX `agency_leaderships_partner_id_fkey`(`partner_id`),
    INDEX `agency_leaderships_agency_id_fkey`(`agency_id`),
    CONSTRAINT `agency_leaderships_partner_id_fkey`
        FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `agency_leaderships_agency_id_fkey`
        FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 4. agency_reports ───────────────────────────────────────────────────────
-- Adicionada no commit aa31e84. FK para partner_profiles e agencies (tabelas originais).

CREATE TABLE IF NOT EXISTS `agency_reports` (
    `id`             VARCHAR(191) NOT NULL,
    `partner_id`     VARCHAR(191) NOT NULL,
    `agency_id`      VARCHAR(191) NOT NULL,
    `title`          VARCHAR(255) NOT NULL,
    `content`        LONGTEXT     NOT NULL,
    `period_month`   INT          NOT NULL,
    `period_year`    INT          NOT NULL,
    `rating`         INT          NULL,
    `highlights`     LONGTEXT     NULL,
    `improvements`   LONGTEXT     NULL,
    `mrr`            DOUBLE       NULL,
    `projects_count` INT          NULL,
    `tasks_count`    INT          NULL,
    `status`         VARCHAR(191) NOT NULL DEFAULT 'draft',
    `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`     DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `agency_reports_partner_id_fkey`(`partner_id`),
    INDEX `agency_reports_agency_id_fkey`(`agency_id`),
    CONSTRAINT `agency_reports_partner_id_fkey`
        FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `agency_reports_agency_id_fkey`
        FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 5. expenses ─────────────────────────────────────────────────────────────
-- Adicionada no commit 8747181. Standalone (sem FK externa).

CREATE TABLE IF NOT EXISTS `expenses` (
    `id`               VARCHAR(191) NOT NULL,
    `name`             VARCHAR(191) NOT NULL,
    `description`      LONGTEXT     NULL,
    `category`         VARCHAR(191) NOT NULL DEFAULT 'Outros',
    `amount`           DOUBLE       NOT NULL,
    `type`             VARCHAR(191) NOT NULL DEFAULT 'fixa',
    `recurrence`       VARCHAR(191) NOT NULL DEFAULT 'mensal',
    `status`           VARCHAR(191) NOT NULL DEFAULT 'prevista',
    `due_date`         DATETIME(3)  NULL,
    `paid_at`          DATETIME(3)  NULL,
    `payment_method`   VARCHAR(191) NULL,
    `department`       VARCHAR(191) NULL,
    `competence_month` VARCHAR(191) NULL,
    `notes`            LONGTEXT     NULL,
    `attachment_url`   LONGTEXT     NULL,
    `recurrence_id`    VARCHAR(191) NULL,
    `is_recurring_base` TINYINT(1)  NOT NULL DEFAULT 0,
    `created_by`       VARCHAR(191) NULL,
    `created_at`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`       DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `expenses_status_idx`(`status`),
    INDEX `expenses_category_idx`(`category`),
    INDEX `expenses_competence_month_idx`(`competence_month`),
    INDEX `expenses_recurrence_id_idx`(`recurrence_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 6. wallets ──────────────────────────────────────────────────────────────
-- Adicionada no commit 8747181. Standalone; wallet_ledger depende desta.

CREATE TABLE IF NOT EXISTS `wallets` (
    `id`              VARCHAR(191) NOT NULL,
    `owner_type`      VARCHAR(191) NOT NULL,
    `owner_id`        VARCHAR(191) NOT NULL,
    `balance`         DOUBLE       NOT NULL DEFAULT 0,
    `blocked_balance` DOUBLE       NOT NULL DEFAULT 0,
    `currency`        VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `status`          VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes`           LONGTEXT     NULL,
    `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `wallets_owner_type_owner_id_key`(`owner_type`, `owner_id`),
    INDEX `wallets_owner_type_idx`(`owner_type`),
    INDEX `wallets_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 7. wallet_ledger ────────────────────────────────────────────────────────
-- Adicionada no commit 8747181. FK para wallets (criada acima).

CREATE TABLE IF NOT EXISTS `wallet_ledger` (
    `id`              VARCHAR(191) NOT NULL,
    `wallet_id`       VARCHAR(191) NOT NULL,
    `type`            VARCHAR(191) NOT NULL,
    `direction`       VARCHAR(191) NOT NULL,
    `amount`          DOUBLE       NOT NULL,
    `balance_before`  DOUBLE       NOT NULL,
    `balance_after`   DOUBLE       NOT NULL,
    `description`     VARCHAR(191) NOT NULL,
    `category`        VARCHAR(191) NULL,
    `status`          VARCHAR(191) NOT NULL DEFAULT 'confirmed',
    `reference_type`  VARCHAR(191) NULL,
    `reference_id`    VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `metadata`        JSON         NULL,
    `created_by`      VARCHAR(191) NULL,
    `notes`           LONGTEXT     NULL,
    `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `wallet_ledger_idempotency_key_key`(`idempotency_key`),
    INDEX `wallet_ledger_wallet_id_fkey`(`wallet_id`),
    INDEX `wallet_ledger_type_idx`(`type`),
    INDEX `wallet_ledger_direction_idx`(`direction`),
    INDEX `wallet_ledger_status_idx`(`status`),
    INDEX `wallet_ledger_created_at_idx`(`created_at`),
    INDEX `wallet_ledger_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    CONSTRAINT `wallet_ledger_wallet_id_fkey`
        FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 8. squad_configs ────────────────────────────────────────────────────────
-- Adicionada no commit 8747181. FK para companies (original); squad_cycles depende desta.

CREATE TABLE IF NOT EXISTS `squad_configs` (
    `id`              VARCHAR(191) NOT NULL,
    `company_id`      VARCHAR(191) NOT NULL,
    `credit_limit`    DOUBLE       NOT NULL DEFAULT 10000,
    `monthly_minimum` DOUBLE       NOT NULL DEFAULT 0,
    `billing_day`     INT          NOT NULL DEFAULT 10,
    `payment_terms`   INT          NOT NULL DEFAULT 10,
    `status`          VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes`           LONGTEXT     NULL,
    `consultant_id`   VARCHAR(191) NULL,
    `started_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at`        DATETIME(3)  NULL,
    `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `squad_configs_company_id_key`(`company_id`),
    CONSTRAINT `squad_configs_company_id_fkey`
        FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 9. squad_cycles ─────────────────────────────────────────────────────────
-- Adicionada no commit 8747181. FK para squad_configs (criada acima).

CREATE TABLE IF NOT EXISTS `squad_cycles` (
    `id`                 VARCHAR(191) NOT NULL,
    `squad_config_id`    VARCHAR(191) NOT NULL,
    `company_id`         VARCHAR(191) NOT NULL,
    `started_at`         DATETIME(3)  NOT NULL,
    `closed_at`          DATETIME(3)  NULL,
    `due_at`             DATETIME(3)  NULL,
    `status`             VARCHAR(191) NOT NULL DEFAULT 'open',
    `total_consumed`     DOUBLE       NOT NULL DEFAULT 0,
    `minimum_adjustment` DOUBLE       NOT NULL DEFAULT 0,
    `total_invoiced`     DOUBLE       NOT NULL DEFAULT 0,
    `invoice_id`         VARCHAR(191) NULL,
    `notes`              LONGTEXT     NULL,
    `created_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`         DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `squad_cycles_invoice_id_key`(`invoice_id`),
    INDEX `squad_cycles_company_id_idx`(`company_id`),
    INDEX `squad_cycles_status_idx`(`status`),
    INDEX `squad_cycles_squad_config_id_idx`(`squad_config_id`),
    CONSTRAINT `squad_cycles_squad_config_id_fkey`
        FOREIGN KEY (`squad_config_id`) REFERENCES `squad_configs` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

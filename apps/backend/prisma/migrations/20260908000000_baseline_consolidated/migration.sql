-- BASELINE CONSOLIDADO — 2026-09-08 (preparação pré-deploy QA).
--
-- Esta é a ÚNICA migration necessária para criar o banco OPERACIONAL do
-- zero. Ela substitui a reexecução das 85 migrations históricas anteriores
-- (arquivadas, não apagadas, em prisma/migrations-archive-pre-2026-09-08/) —
-- ver docs/migrations-baseline-2026-09.md para o procedimento completo,
-- por que isso foi necessário e como aplicar em banco novo vs. existente.
--
-- Gerada por: npx prisma migrate diff --from-empty --to-schema-datamodel
--             prisma/schema.prisma --script
-- A partir do schema.prisma no commit deste lote (branch
-- fix/pre-deploy-products-profiles-baseline). Representa o schema EXATO e
-- completo em vigor nesse momento — validada aplicando em banco MySQL
-- vazio e comparando com `prisma migrate diff` (resultado: sem diferença).
--
-- NÃO editar este arquivo manualmente depois de aplicado em qualquer
-- ambiente (mesma regra de qualquer outra migration). Mudanças de schema
-- daqui pra frente são sempre migrations NOVAS e aditivas por cima desta.

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `user_code` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'company_user',
    `account_type` VARCHAR(191) NOT NULL DEFAULT 'empresas',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `avatar` LONGTEXT NULL,
    `phone` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `admin_profile_id` VARCHAR(191) NULL,
    `company_id` VARCHAR(191) NULL,
    `agency_id` VARCHAR(191) NULL,
    `last_login` DATETIME(3) NULL,
    `inactivity_paused_accessed_at` DATETIME(3) NULL,
    `inactivity_paused_access_count` INTEGER NOT NULL DEFAULT 0,
    `reactivation_review_required` BOOLEAN NOT NULL DEFAULT false,
    `must_set_password` BOOLEAN NOT NULL DEFAULT false,
    `password_setup_token` VARCHAR(64) NULL,
    `password_setup_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `users_user_code_key`(`user_code`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_password_setup_token_key`(`password_setup_token`),
    UNIQUE INDEX `users_legacy_id_key`(`legacy_id`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_account_type_idx`(`account_type`),
    INDEX `users_company_id_idx`(`company_id`),
    INDEX `users_agency_id_idx`(`agency_id`),
    INDEX `users_admin_profile_id_idx`(`admin_profile_id`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_is_active_idx`(`is_active`),
    INDEX `users_account_type_is_active_idx`(`account_type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `social_name` VARCHAR(191) NULL,
    `birth_date` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `rg` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `phone_secondary` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `complement` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL DEFAULT 'Brasil',
    `admin_notes` LONGTEXT NULL,
    `internal_notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lider_areas` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `area_nome` VARCHAR(191) NOT NULL,
    `categorias_permitidas` LONGTEXT NULL,
    `produtos_permitidos` LONGTEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `cnpj` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lider_areas_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'empresa',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `segment` VARCHAR(191) NULL,
    `address` LONGTEXT NULL,
    `number` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `pix_key` VARCHAR(191) NULL,
    `pix_key_type` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `logo` LONGTEXT NULL,
    `website` VARCHAR(191) NULL,
    `observations` LONGTEXT NULL,
    `commercial_contact_name` VARCHAR(255) NULL,
    `commercial_contact_role` VARCHAR(100) NULL,
    `commercial_contact_email` VARCHAR(255) NULL,
    `commercial_contact_phone` VARCHAR(30) NULL,
    `commercial_contact_whatsapp` VARCHAR(30) NULL,
    `commercial_contact_preferred_channel` VARCHAR(50) NULL,
    `commercial_contact_notes` LONGTEXT NULL,
    `financial_contact_name` VARCHAR(255) NULL,
    `financial_contact_role` VARCHAR(100) NULL,
    `financial_contact_email` VARCHAR(255) NULL,
    `financial_contact_phone` VARCHAR(30) NULL,
    `financial_contact_whatsapp` VARCHAR(30) NULL,
    `financial_contact_preferred_channel` VARCHAR(50) NULL,
    `financial_contact_notes` LONGTEXT NULL,
    `financial_contact_user_id` VARCHAR(191) NULL,
    `use_master_as_financial_fallback` BOOLEAN NOT NULL DEFAULT true,
    `referred_by_partner_id` VARCHAR(191) NULL,
    `owner_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `companies_sequence_number_key`(`sequence_number`),
    UNIQUE INDEX `companies_cnpj_key`(`cnpj`),
    UNIQUE INDEX `companies_owner_user_id_key`(`owner_user_id`),
    UNIQUE INDEX `companies_legacy_id_key`(`legacy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_archives` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NOT NULL,
    `original_company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `snapshot` LONGTEXT NOT NULL,
    `users_snapshot` LONGTEXT NOT NULL,
    `projects_count` INTEGER NOT NULL DEFAULT 0,
    `invoices_count` INTEGER NOT NULL DEFAULT 0,
    `deleted_by_user_id` VARCHAR(191) NULL,
    `deleted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `company_archives_sequence_number_idx`(`sequence_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_freed_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NOT NULL,
    `freed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `company_freed_sequences_sequence_number_key`(`sequence_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_payment_methods` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(20) NOT NULL,
    `last_four` VARCHAR(4) NOT NULL,
    `expiry` VARCHAR(7) NOT NULL,
    `holder_name` VARCHAR(255) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_client_card` BOOLEAN NOT NULL DEFAULT false,
    `label` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'pj',
    `document` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `segment` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `address` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `avatar` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `description` LONGTEXT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `clients_sequence_number_key`(`sequence_number`),
    UNIQUE INDEX `clients_document_key`(`document`),
    UNIQUE INDEX `clients_legacy_id_key`(`legacy_id`),
    INDEX `clients_name_idx`(`name`),
    INDEX `clients_email_idx`(`email`),
    INDEX `clients_status_idx`(`status`),
    INDEX `clients_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_links` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NULL,
    `company_id` VARCHAR(191) NULL,
    `partner_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_links_client_id_idx`(`client_id`),
    INDEX `client_links_agency_id_idx`(`agency_id`),
    INDEX `client_links_company_id_idx`(`company_id`),
    INDEX `client_links_partner_id_idx`(`partner_id`),
    UNIQUE INDEX `client_links_client_id_agency_id_key`(`client_id`, `agency_id`),
    UNIQUE INDEX `client_links_client_id_company_id_key`(`client_id`, `company_id`),
    UNIQUE INDEX `client_links_client_id_partner_id_key`(`client_id`, `partner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agencies` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `partner_level` VARCHAR(191) NOT NULL DEFAULT 'bronze',
    `wallet_balance` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `address` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `pix_key` VARCHAR(191) NULL,
    `pix_key_type` VARCHAR(191) NULL,
    `segment` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `logo` LONGTEXT NULL,
    `website` VARCHAR(191) NULL,
    `observations` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `agencies_user_id_key`(`user_id`),
    UNIQUE INDEX `agencies_sequence_number_key`(`sequence_number`),
    UNIQUE INDEX `agencies_cnpj_key`(`cnpj`),
    UNIQUE INDEX `agencies_legacy_id_key`(`legacy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomades` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NULL,
    `avatar` LONGTEXT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'bronze',
    `status` VARCHAR(191) NOT NULL DEFAULT 'aguardando_aprovacao',
    `address` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `pix_key` VARCHAR(191) NULL,
    `pix_key_type` VARCHAR(191) NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `tasks_completed_quarter` INTEGER NOT NULL DEFAULT 0,
    `tasks_completed_total` INTEGER NOT NULL DEFAULT 0,
    `areas_of_interest` LONGTEXT NULL,
    `registration_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_access` DATETIME(3) NULL,
    `terms_accepted` BOOLEAN NOT NULL DEFAULT false,
    `is_leader` BOOLEAN NOT NULL DEFAULT false,
    `leader_id` VARCHAR(191) NULL,
    `min_monthly_goal` DOUBLE NULL,
    `performance_avg_rating` DOUBLE NOT NULL DEFAULT 0,
    `performance_on_time` DOUBLE NOT NULL DEFAULT 0,
    `performance_rejection_rate` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `nomades_user_id_key`(`user_id`),
    UNIQUE INDEX `nomades_email_key`(`email`),
    UNIQUE INDEX `nomades_cnpj_key`(`cnpj`),
    UNIQUE INDEX `nomades_legacy_id_key`(`legacy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomade_habilidades` (
    `id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(30) NOT NULL,
    `area` VARCHAR(50) NOT NULL,
    `categoria_produto` VARCHAR(100) NULL,
    `produto_id` VARCHAR(30) NULL,
    `modelo_tarefa_id` VARCHAR(30) NULL,
    `nota_media` DOUBLE NOT NULL DEFAULT 0,
    `disponibilidade` VARCHAR(191) NOT NULL DEFAULT 'disponivel',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nomade_habilidades_nomade_id_area_categoria_produto_produto__key`(`nomade_id`, `area`, `categoria_produto`, `produto_id`, `modelo_tarefa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomade_levels` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `min_score` INTEGER NOT NULL,
    `max_score` INTEGER NULL,
    `color` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `benefits` LONGTEXT NULL,
    `requirements` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nomade_levels_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_levels` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `icon` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `gradient` VARCHAR(191) NULL,
    `min_mrr` INTEGER NOT NULL DEFAULT 0,
    `max_mrr` INTEGER NULL,
    `led_agencies_min` INTEGER NOT NULL DEFAULT 0,
    `led_agencies_mrr_min` INTEGER NOT NULL DEFAULT 0,
    `premium_project_limit` INTEGER NULL,
    `commission_rate` DOUBLE NOT NULL DEFAULT 0,
    `extra_discount` DOUBLE NOT NULL DEFAULT 0,
    `receives_leads_premium` BOOLEAN NOT NULL DEFAULT false,
    `requires_partner` BOOLEAN NOT NULL DEFAULT false,
    `level_up_bonus_credits` INTEGER NOT NULL DEFAULT 0,
    `benefits` LONGTEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_levels_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualifications` (
    `id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `task` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'teste_pendente',
    `certification_date` DATETIME(3) NULL,
    `paused_date` DATETIME(3) NULL,
    `test_required` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `description` LONGTEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receipt` LONGTEXT NULL,
    `justification` LONGTEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NOT NULL,
    `bank` VARCHAR(191) NOT NULL,
    `agency` VARCHAR(191) NOT NULL,
    `account` VARCHAR(191) NOT NULL,
    `account_type` VARCHAR(191) NOT NULL DEFAULT 'corrente',
    `cnpj` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_accounts_nomade_id_key`(`nomade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `client_id` VARCHAR(191) NULL,
    `agency_id` VARCHAR(191) NULL,
    `company_id` VARCHAR(191) NULL,
    `partner_id` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `project_code` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `lifecycle` VARCHAR(191) NOT NULL DEFAULT 'avulso',
    `type` VARCHAR(191) NULL,
    `value` DOUBLE NOT NULL DEFAULT 0,
    `budget` DOUBLE NOT NULL DEFAULT 0,
    `spent` DOUBLE NOT NULL DEFAULT 0,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `agency` VARCHAR(191) NULL,
    `company_type` VARCHAR(191) NULL,
    `consultant` VARCHAR(191) NULL,
    `consultant_email` VARCHAR(191) NULL,
    `team_size` INTEGER NOT NULL DEFAULT 0,
    `nomades` LONGTEXT NULL,
    `bitrix_sync` BOOLEAN NOT NULL DEFAULT false,
    `portfolio_permission` BOOLEAN NOT NULL DEFAULT false,
    `overdue` BOOLEAN NOT NULL DEFAULT false,
    `from_lead` BOOLEAN NOT NULL DEFAULT false,
    `billing_day` INTEGER NULL,
    `billing_start_date` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `archived_at` DATETIME(3) NULL,
    `archive_reason` TEXT NULL,
    `archived_by_user_id` VARCHAR(191) NULL,
    `admin_responsible_user_id` VARCHAR(191) NULL,
    `catalog2_checkout_client_action_id` VARCHAR(191) NULL,
    `legacy_id` INTEGER NULL,
    `legacy_client_id` INTEGER NULL,

    UNIQUE INDEX `projects_project_code_key`(`project_code`),
    UNIQUE INDEX `projects_catalog2_checkout_client_action_id_key`(`catalog2_checkout_client_action_id`),
    UNIQUE INDEX `projects_legacy_id_key`(`legacy_id`),
    INDEX `projects_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `projects_archived_by_user_id_idx`(`archived_by_user_id`),
    INDEX `projects_archived_at_idx`(`archived_at`),
    INDEX `projects_admin_responsible_user_id_idx`(`admin_responsible_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planner_columns` (
    `id` VARCHAR(191) NOT NULL,
    `owner_user_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT 'bg-slate-500',
    `position` INTEGER NOT NULL DEFAULT 0,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `planner_columns_owner_user_id_idx`(`owner_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planner_cards` (
    `id` VARCHAR(191) NOT NULL,
    `owner_user_id` VARCHAR(191) NOT NULL,
    `column_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `due_date` DATETIME(3) NULL,
    `project_id` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `archived_at` DATETIME(3) NULL,
    `updated_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `planner_cards_owner_user_id_idx`(`owner_user_id`),
    INDEX `planner_cards_column_id_idx`(`column_id`),
    INDEX `planner_cards_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `current_value` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `entity_sequences_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `specialties` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `hourly_rate` DOUBLE NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NOT NULL,
    `required_skills` LONGTEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `specialty_id` VARCHAR(191) NULL,
    `base_price` DOUBLE NOT NULL DEFAULT 0,
    `complexity` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `category` VARCHAR(191) NULL,
    `tags` LONGTEXT NULL,
    `estimated_hours` DOUBLE NOT NULL DEFAULT 1,
    `profit_margin` DOUBLE NOT NULL DEFAULT 30,
    `emergency_multiplier` DOUBLE NOT NULL DEFAULT 1.5,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_executions` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `nomade_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `type` VARCHAR(191) NOT NULL DEFAULT 'standard',
    `due_date` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `rating` DOUBLE NULL,
    `feedback` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `product_code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `short_description` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `tags` LONGTEXT NULL,
    `base_price` DOUBLE NOT NULL DEFAULT 0,
    `complexity` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `visibility` VARCHAR(191) NOT NULL DEFAULT '{"company":true,"agency":true,"partner":false,"inHouse":false}',
    `image` LONGTEXT NULL,
    `demonstrations` LONGTEXT NULL,
    `contract_count` INTEGER NOT NULL DEFAULT 0,
    `average_rating` DOUBLE NOT NULL DEFAULT 0,
    `completion_time` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `exige_aprovacao_cliente` BOOLEAN NOT NULL DEFAULT true,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `products_product_code_key`(`product_code`),
    UNIQUE INDEX `products_legacy_id_key`(`legacy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_versions` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `snapshot` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_versions_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variations` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `price_modifier` DOUBLE NOT NULL DEFAULT 0,
    `deadline_days` INTEGER NULL,
    `scope_description` LONGTEXT NULL,
    `features` LONGTEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_bundles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `category` VARCHAR(191) NULL,
    `agency_id` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_bundles_agency_id_idx`(`agency_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_bundle_items` (
    `id` VARCHAR(191) NOT NULL,
    `bundle_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `variation_id` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `product_bundle_items_bundle_id_idx`(`bundle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iallka_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'gathering',
    `created_project_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `iallka_sessions_created_project_id_key`(`created_project_id`),
    INDEX `iallka_sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iallka_messages` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `structured_payload` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `iallka_messages_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_addons` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategory` VARCHAR(191) NULL,
    `task_type` VARCHAR(191) NOT NULL DEFAULT 'execution',
    `description` LONGTEXT NULL,
    `objective` LONGTEXT NULL,
    `default_deadline_days` INTEGER NULL,
    `default_priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `complexity` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `estimated_hours` DOUBLE NULL,
    `responsible_type` VARCHAR(191) NULL,
    `requires_access` BOOLEAN NOT NULL DEFAULT false,
    `requires_briefing` BOOLEAN NOT NULL DEFAULT false,
    `requires_files` BOOLEAN NOT NULL DEFAULT false,
    `steps` LONGTEXT NULL,
    `checklist` LONGTEXT NULL,
    `briefing_questions` LONGTEXT NULL,
    `required_files` LONGTEXT NULL,
    `execution_rules` LONGTEXT NULL,
    `conclusion_rules` LONGTEXT NULL,
    `internal_guidance` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativa',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `catalog_tasks_code_key`(`code`),
    UNIQUE INDEX `catalog_tasks_legacy_id_key`(`legacy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_catalog_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `catalog_task_id` VARCHAR(191) NOT NULL,
    `variation_id` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT true,
    `phase` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_catalog_tasks_product_id_catalog_task_id_key`(`product_id`, `catalog_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_products` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `variation_id` VARCHAR(191) NULL,
    `catalog2_product_id` VARCHAR(191) NULL,
    `catalog2_version_id` VARCHAR(191) NULL,
    `origin_catalog2_quote_id` VARCHAR(191) NULL,
    `origin_catalog2_change_order_id` VARCHAR(191) NULL,
    `product_name_snapshot` VARCHAR(191) NOT NULL,
    `product_code_snapshot` VARCHAR(191) NULL,
    `product_category_snapshot` VARCHAR(191) NOT NULL,
    `product_price_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `recurrence_snapshot` VARCHAR(191) NULL,
    `preco_final_cliente_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `comissao_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `pagador_snapshot` VARCHAR(191) NOT NULL DEFAULT 'AGENCIA',
    `alteracoes_incluidas_snapshot` INTEGER NOT NULL DEFAULT 3,
    `valor_alteracao_extra_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `taxa_emergencial_reducao_percentual_snapshot` INTEGER NOT NULL DEFAULT 50,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `start_date` DATETIME(3) NULL,
    `expected_end_date` DATETIME(3) NULL,
    `origin` VARCHAR(191) NOT NULL DEFAULT 'VENDA',
    `origin_bundle_purchase_id` VARCHAR(191) NULL,
    `origin_bundle_name_snapshot` VARCHAR(191) NULL,
    `origin_ai_session_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `legacy_id` INTEGER NULL,

    UNIQUE INDEX `project_products_origin_catalog2_quote_id_key`(`origin_catalog2_quote_id`),
    UNIQUE INDEX `project_products_origin_catalog2_change_order_id_key`(`origin_catalog2_change_order_id`),
    UNIQUE INDEX `project_products_legacy_id_key`(`legacy_id`),
    INDEX `project_products_project_id_idx`(`project_id`),
    INDEX `project_products_catalog2_product_id_idx`(`catalog2_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `catalog_task_id` VARCHAR(191) NULL,
    `catalog2_task_id` VARCHAR(191) NULL,
    `catalog2_product_id` VARCHAR(191) NULL,
    `catalog2_version_id` VARCHAR(191) NULL,
    `code_snapshot` VARCHAR(191) NULL,
    `name_snapshot` VARCHAR(191) NOT NULL,
    `category_snapshot` VARCHAR(191) NULL,
    `task_code` VARCHAR(191) NULL,
    `origin_payment_id` VARCHAR(191) NULL,
    `generation_key` VARCHAR(191) NULL,
    `billing_cycle_key` VARCHAR(191) NULL,
    `occurrence_index` INTEGER NOT NULL DEFAULT 0,
    `transferred_from_project_id` VARCHAR(191) NULL,
    `transferred_at` DATETIME(3) NULL,
    `transferred_by_user_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PARA_LANCAMENTO',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `assignee_id` VARCHAR(191) NULL,
    `responsavel_agencia_id` VARCHAR(191) NULL,
    `nomade_responsavel_id` VARCHAR(191) NULL,
    `lider_responsavel_id` VARCHAR(191) NULL,
    `due_date` DATETIME(3) NULL,
    `start_date` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `data_lancamento` DATETIME(3) NULL,
    `data_liberacao_execucao` DATETIME(3) NULL,
    `data_inicio_execucao` DATETIME(3) NULL,
    `data_conclusao` DATETIME(3) NULL,
    `lancamento_expires_at` DATETIME(3) NULL,
    `aprovado_agencia_em` DATETIME(3) NULL,
    `aprovado_agencia_por` VARCHAR(191) NULL,
    `aprovado_cliente_em` DATETIME(3) NULL,
    `aprovado_cliente_por` VARCHAR(191) NULL,
    `reprovado_em` DATETIME(3) NULL,
    `reprovado_por` VARCHAR(191) NULL,
    `reprovacao_motivo` LONGTEXT NULL,
    `reprovacao_nivel` VARCHAR(191) NULL,
    `reprovacoes` INTEGER NOT NULL DEFAULT 0,
    `exige_aprovacao_cliente` BOOLEAN NOT NULL DEFAULT true,
    `alteracoes_extras_pagas` INTEGER NOT NULL DEFAULT 0,
    `pending_fee_invoice_id` VARCHAR(191) NULL,
    `emergencial_solicitada_em` DATETIME(3) NULL,
    `emergencial_solicitada_por` VARCHAR(191) NULL,
    `emergencial_reducao_percentual` INTEGER NULL,
    `emergencial_invoice_id` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `fase` VARCHAR(191) NULL,
    `phase` VARCHAR(191) NULL,
    `checklist_snapshot` LONGTEXT NULL,
    `steps_snapshot` LONGTEXT NULL,
    `briefing_snapshot` LONGTEXT NULL,
    `observations` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `rotation_episode_key` VARCHAR(191) NULL,
    `legacy_id` INTEGER NULL,
    `legacy_model` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `project_tasks_task_code_key`(`task_code`),
    UNIQUE INDEX `project_tasks_generation_key_key`(`generation_key`),
    UNIQUE INDEX `project_tasks_legacy_id_key`(`legacy_id`),
    INDEX `project_tasks_origin_payment_id_idx`(`origin_payment_id`),
    INDEX `project_tasks_project_id_idx`(`project_id`),
    INDEX `project_tasks_status_idx`(`status`),
    INDEX `project_tasks_assignee_id_idx`(`assignee_id`),
    INDEX `project_tasks_nomade_responsavel_id_idx`(`nomade_responsavel_id`),
    INDEX `project_tasks_responsavel_agencia_id_idx`(`responsavel_agencia_id`),
    INDEX `project_tasks_lider_responsavel_id_idx`(`lider_responsavel_id`),
    INDEX `project_tasks_catalog2_task_id_idx`(`catalog2_task_id`),
    INDEX `project_tasks_status_due_date_idx`(`status`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_stages` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `catalog_step_ref` VARCHAR(191) NULL,
    `source_key` VARCHAR(191) NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` LONGTEXT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `obrigatoria` BOOLEAN NOT NULL DEFAULT true,
    `depende_da_etapa_anterior` BOOLEAN NOT NULL DEFAULT true,
    `briefing_necessario` BOOLEAN NOT NULL DEFAULT false,
    `executor_type` VARCHAR(191) NOT NULL DEFAULT 'nomad',
    `nomade_id` VARCHAR(191) NULL,
    `lider_id` VARCHAR(191) NULL,
    `categoria` VARCHAR(191) NULL,
    `manter_mesmo_nomade` BOOLEAN NOT NULL DEFAULT false,
    `prazo_execucao` DATETIME(3) NULL,
    `prazo_aprovacao` DATETIME(3) NULL,
    `horas_execucao` DOUBLE NULL,
    `valor_nomade` DOUBLE NULL,
    `oculta_no_prazo` BOOLEAN NOT NULL DEFAULT false,
    `conta_no_prazo` BOOLEAN NOT NULL DEFAULT true,
    `exige_anexo` BOOLEAN NOT NULL DEFAULT false,
    `config_snapshot` LONGTEXT NULL,
    `iniciada_em` DATETIME(3) NULL,
    `concluida_em` DATETIME(3) NULL,
    `concluida_por` VARCHAR(191) NULL,
    `checklist_snapshot` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_task_stages_project_task_id_source_key_key`(`project_task_id`, `source_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_briefing_answers` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `question_key` VARCHAR(191) NOT NULL,
    `question_text` LONGTEXT NOT NULL,
    `answer` LONGTEXT NULL,
    `files` LONGTEXT NULL,
    `links` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `task_briefing_answers_project_task_id_question_key_key`(`project_task_id`, `question_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'file',
    `name` VARCHAR(191) NOT NULL,
    `url` LONGTEXT NOT NULL,
    `size` INTEGER NULL,
    `mime_type` LONGTEXT NULL,
    `observations` LONGTEXT NULL,
    `uploaded_by` VARCHAR(191) NULL,
    `project_task_stage_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_attachments_project_task_stage_id_idx`(`project_task_stage_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `uploaded_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_attachments_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_knowledge_categories` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_knowledge_categories_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_knowledge_documents` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `uploaded_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_knowledge_documents_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_service_configs` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `monthly_budget_usd` DOUBLE NULL,
    `alert_threshold_pct` INTEGER NOT NULL DEFAULT 80,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_service_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_model_pricing` (
    `id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `pricing_unit` VARCHAR(191) NOT NULL DEFAULT 'tokens',
    `input_price_per_million` DOUBLE NULL,
    `output_price_per_million` DOUBLE NULL,
    `unit_price` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_model_pricing_service_id_model_key`(`service_id`, `model`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(191) NOT NULL,
    `prompt_tokens` INTEGER NOT NULL DEFAULT 0,
    `completion_tokens` INTEGER NOT NULL DEFAULT 0,
    `total_tokens` INTEGER NOT NULL DEFAULT 0,
    `units` INTEGER NOT NULL DEFAULT 0,
    `estimated_cost_usd` DOUBLE NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_service_id_idx`(`service_id`),
    INDEX `ai_usage_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_assignment_history` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NULL,
    `criterio` VARCHAR(191) NOT NULL,
    `nota_nomade` DOUBLE NULL,
    `automatico` BOOLEAN NOT NULL DEFAULT true,
    `resultado` VARCHAR(191) NOT NULL,
    `detalhes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_presence` (
    `user_id` VARCHAR(191) NOT NULL,
    `last_seen_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_presence_last_seen_at_idx`(`last_seen_at`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_offers` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NOT NULL,
    `nomade_user_id` VARCHAR(191) NULL,
    `episode_key` VARCHAR(191) NOT NULL,
    `rotation_order` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `offered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `responded_at` DATETIME(3) NULL,
    `responded_by_user_id` VARCHAR(191) NULL,
    `decline_reason` TEXT NULL,
    `close_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_offers_project_task_id_status_idx`(`project_task_id`, `status`),
    INDEX `task_offers_nomade_id_status_idx`(`nomade_id`, `status`),
    INDEX `task_offers_status_expires_at_idx`(`status`, `expires_at`),
    INDEX `task_offers_episode_key_idx`(`episode_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alert_standards` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `default_severity` VARCHAR(191) NOT NULL DEFAULT 'warning',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `allowed_variables_json` LONGTEXT NOT NULL,
    `image_file_name` VARCHAR(191) NULL,
    `image_alt` VARCHAR(191) NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `mandatory_min_severity` VARCHAR(191) NULL,
    `platform_channel_locked` BOOLEAN NOT NULL DEFAULT true,
    `additional_channels_json` LONGTEXT NULL,
    `personal_prefs_allowed` BOOLEAN NOT NULL DEFAULT true,
    `governed_event_types_json` LONGTEXT NULL,
    `mandatory_set_by_id` VARCHAR(191) NULL,
    `mandatory_set_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `updated_by_id` VARCHAR(191) NULL,

    UNIQUE INDEX `alert_standards_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alert_rules` (
    `id` VARCHAR(191) NOT NULL,
    `standard_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `trigger_type` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `lead_time_minutes` INTEGER NULL,
    `severity_override` VARCHAR(191) NULL,
    `config_json` LONGTEXT NULL,
    `recipient_roles_json` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `updated_by_id` VARCHAR(191) NULL,

    INDEX `alert_rules_standard_id_idx`(`standard_id`),
    INDEX `alert_rules_trigger_type_idx`(`trigger_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'warning',
    `category` VARCHAR(191) NOT NULL DEFAULT 'notificacao',
    `entity_type` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `entity_parent_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `action_url` VARCHAR(191) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notification_message_id` VARCHAR(191) NULL,
    `standard_id` VARCHAR(191) NULL,
    `rule_id` VARCHAR(191) NULL,
    `dedupe_key` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NULL,
    `resolution_reason` VARCHAR(191) NULL,
    `image_file_name` VARCHAR(191) NULL,
    `image_alt` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `schedule_id` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `manual_resolved_at` DATETIME(3) NULL,
    `resolved_by_user_id` VARCHAR(191) NULL,
    `resolution_action` VARCHAR(191) NULL,
    `resolution_description` TEXT NULL,
    `resolution_client_action_id` VARCHAR(191) NULL,
    `automatic_resolved_at` DATETIME(3) NULL,
    `automatic_resolution_reason` VARCHAR(191) NULL,
    `automatic_resolution_message` TEXT NULL,
    `condition_cleared_at` DATETIME(3) NULL,

    UNIQUE INDEX `system_alerts_dedupe_key_key`(`dedupe_key`),
    UNIQUE INDEX `system_alerts_resolution_client_action_id_key`(`resolution_client_action_id`),
    INDEX `system_alerts_user_id_is_read_idx`(`user_id`, `is_read`),
    INDEX `system_alerts_user_id_is_archived_idx`(`user_id`, `is_archived`),
    INDEX `system_alerts_user_id_category_is_read_idx`(`user_id`, `category`, `is_read`),
    INDEX `system_alerts_notification_message_id_idx`(`notification_message_id`),
    INDEX `system_alerts_rule_id_idx`(`rule_id`),
    INDEX `system_alerts_standard_id_idx`(`standard_id`),
    INDEX `system_alerts_schedule_id_idx`(`schedule_id`),
    INDEX `system_alerts_expires_at_idx`(`expires_at`),
    INDEX `system_alerts_automatic_resolved_at_idx`(`automatic_resolved_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_alert_events` (
    `id` VARCHAR(191) NOT NULL,
    `alert_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `metadata_json` TEXT NULL,
    `client_event_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_alert_events_client_event_id_key`(`client_event_id`),
    INDEX `system_alert_events_alert_id_created_at_idx`(`alert_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alert_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'warning',
    `image_file_name` VARCHAR(191) NULL,
    `image_alt` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `recurrence_type` VARCHAR(191) NOT NULL,
    `weekdays_json` LONGTEXT NULL,
    `time_of_day` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/Sao_Paulo',
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NULL,
    `occurrence_expires_minutes` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `archived_at` DATETIME(3) NULL,
    `last_run_at` DATETIME(3) NULL,
    `next_run_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `updated_by_id` VARCHAR(191) NULL,

    INDEX `alert_schedules_is_active_next_run_at_idx`(`is_active`, `next_run_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_messages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_messages_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_rules` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `target_account_types` JSON NULL,
    `target_roles` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_rules_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_preferences_user_id_idx`(`user_id`),
    UNIQUE INDEX `notification_preferences_user_id_event_type_channel_key`(`user_id`, `event_type`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_groups` (
    `id` VARCHAR(191) NOT NULL,
    `owner_user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `purpose` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `requested_by_id` VARCHAR(191) NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejected_by_id` VARCHAR(191) NULL,
    `rejected_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `archived_by_id` VARCHAR(191) NULL,
    `archived_at` DATETIME(3) NULL,
    `conversation_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_groups_conversation_id_key`(`conversation_id`),
    INDEX `notification_groups_owner_user_id_idx`(`owner_user_id`),
    INDEX `notification_groups_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_group_members` (
    `id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_group_members_user_id_idx`(`user_id`),
    UNIQUE INDEX `notification_group_members_group_id_user_id_key`(`group_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NULL,
    `project_id` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `due_date` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `description` LONGTEXT NULL,
    `invoice_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawal_requests` (
    `id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'aguardando_analise',
    `pix_key` VARCHAR(191) NULL,
    `pix_key_type` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `scheduled_for` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terms` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `acceptance_level` VARCHAR(191) NOT NULL DEFAULT 'usuario',
    `target_account_types` LONGTEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `term_acceptances` (
    `id` VARCHAR(191) NOT NULL,
    `term_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(191) NULL,

    UNIQUE INDEX `term_acceptances_term_id_user_id_key`(`term_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'direct',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `archived_at` DATETIME(3) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `conversations_type_status_idx`(`type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participants` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_read_at` DATETIME(3) NULL,
    `left_at` DATETIME(3) NULL,

    INDEX `chat_participants_user_id_idx`(`user_id`),
    UNIQUE INDEX `chat_participants_conversation_id_user_id_key`(`conversation_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `client_message_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `chat_messages_client_message_id_key`(`client_message_id`),
    INDEX `chat_messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `thumbnail` LONGTEXT NULL,
    `duration` INTEGER NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `is_free` BOOLEAN NOT NULL DEFAULT true,
    `audience_profiles` VARCHAR(191) NOT NULL DEFAULT 'all',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_modules` (
    `id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessons` (
    `id` VARCHAR(191) NOT NULL,
    `module_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content_type` VARCHAR(191) NOT NULL DEFAULT 'video',
    `content_url` LONGTEXT NULL,
    `duration` INTEGER NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `enrolled_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `course_enrollments_course_id_user_id_key`(`course_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `is_master` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_profiles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_permissions_profile_id_module_action_key`(`profile_id`, `module`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `total_earned` DOUBLE NOT NULL DEFAULT 0,
    `total_withdrawn` DOUBLE NOT NULL DEFAULT 0,
    `referral_link` VARCHAR(191) NULL,
    `referral_code` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'invited',
    `invited_at` DATETIME(3) NULL,
    `responded_at` DATETIME(3) NULL,
    `pix_key` VARCHAR(191) NULL,
    `pix_key_type` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `linked_campaign_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_profiles_agency_id_key`(`agency_id`),
    UNIQUE INDEX `partner_profiles_referral_code_key`(`referral_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_withdrawals` (
    `id` VARCHAR(191) NOT NULL,
    `partner_profile_id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `pix_key` VARCHAR(191) NOT NULL,
    `pix_key_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `notes` LONGTEXT NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `partner_withdrawals_partner_profile_id_idx`(`partner_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'coupon',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `commission_type` VARCHAR(191) NOT NULL DEFAULT 'percentage',
    `commission_value` DOUBLE NOT NULL DEFAULT 10,
    `coupon_code` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `campaigns_coupon_code_key`(`coupon_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `coupon_type` VARCHAR(191) NOT NULL DEFAULT 'discount',
    `discount_type` VARCHAR(191) NOT NULL DEFAULT 'percentage',
    `discount_value` DOUBLE NOT NULL DEFAULT 0,
    `credit_bonus` DOUBLE NOT NULL DEFAULT 0,
    `usage_limit` INTEGER NOT NULL DEFAULT 0,
    `usage_limit_per_company` VARCHAR(191) NOT NULL DEFAULT 'unlimited',
    `max_uses_per_company` INTEGER NOT NULL DEFAULT 0,
    `valid_from` DATETIME(3) NULL,
    `valid_until` DATETIME(3) NULL,
    `applicable_products` LONGTEXT NULL,
    `allowed_account_types` LONGTEXT NULL,
    `allowed_company_ids` LONGTEXT NULL,
    `allowed_user_ids` LONGTEXT NULL,
    `linked_user_id` VARCHAR(191) NULL,
    `linked_user_commission_type` VARCHAR(191) NULL,
    `linked_user_commission_value` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_usages` (
    `id` VARCHAR(191) NOT NULL,
    `coupon_id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NULL,
    `used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_commissions` (
    `id` VARCHAR(191) NOT NULL,
    `partner_id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `company_name` VARCHAR(191) NULL,
    `project_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agency_leaderships` (
    `id` VARCHAR(191) NOT NULL,
    `partner_id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes` LONGTEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `agency_leaderships_partner_id_agency_id_key`(`partner_id`, `agency_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agency_reports` (
    `id` VARCHAR(191) NOT NULL,
    `partner_id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `period_month` INTEGER NOT NULL,
    `period_year` INTEGER NOT NULL,
    `rating` INTEGER NULL,
    `highlights` LONGTEXT NULL,
    `improvements` LONGTEXT NULL,
    `mrr` DOUBLE NULL,
    `projects_count` INTEGER NULL,
    `tasks_count` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match_queue_entries` (
    `id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NOT NULL,
    `tier` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `score` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `position` INTEGER NOT NULL DEFAULT 0,
    `joined_queue` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `match_queue_entries_agency_id_key`(`agency_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'CARTAO_TESTE',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `gateway` VARCHAR(191) NOT NULL DEFAULT 'FAKE_SANDBOX',
    `fake_transaction_id` VARCHAR(191) NULL,
    `card_last_digits` VARCHAR(191) NULL,
    `card_holder` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `paid_at` DATETIME(3) NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `billing_cycle_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_idempotency_key_key`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_items` (
    `id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `product_name_snapshot` VARCHAR(191) NOT NULL,
    `unit_price_snapshot` DOUBLE NOT NULL,
    `quantity_snapshot` INTEGER NOT NULL DEFAULT 1,
    `total_snapshot` DOUBLE NOT NULL,
    `recurrence_snapshot` VARCHAR(191) NULL,
    `billing_cycle_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_items_payment_id_idx`(`payment_id`),
    INDEX `payment_items_project_product_id_idx`(`project_product_id`),
    UNIQUE INDEX `payment_items_payment_id_project_product_id_key`(`payment_id`, `project_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'Outros',
    `amount` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'fixa',
    `recurrence` VARCHAR(191) NOT NULL DEFAULT 'mensal',
    `status` VARCHAR(191) NOT NULL DEFAULT 'prevista',
    `due_date` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `payment_method` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `competence_month` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `attachment_url` LONGTEXT NULL,
    `recurrence_id` VARCHAR(191) NULL,
    `is_recurring_base` BOOLEAN NOT NULL DEFAULT false,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_status_idx`(`status`),
    INDEX `expenses_category_idx`(`category`),
    INDEX `expenses_competence_month_idx`(`competence_month`),
    INDEX `expenses_recurrence_id_idx`(`recurrence_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `id` VARCHAR(191) NOT NULL,
    `owner_type` VARCHAR(191) NOT NULL,
    `owner_id` VARCHAR(191) NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `blocked_balance` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `wallets_owner_type_idx`(`owner_type`),
    INDEX `wallets_status_idx`(`status`),
    UNIQUE INDEX `wallets_owner_type_owner_id_key`(`owner_type`, `owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `wallet_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `balance_before` DOUBLE NOT NULL,
    `balance_after` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'confirmed',
    `reference_type` VARCHAR(191) NULL,
    `reference_id` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_by` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallet_ledger_idempotency_key_key`(`idempotency_key`),
    INDEX `wallet_ledger_wallet_id_idx`(`wallet_id`),
    INDEX `wallet_ledger_type_idx`(`type`),
    INDEX `wallet_ledger_direction_idx`(`direction`),
    INDEX `wallet_ledger_status_idx`(`status`),
    INDEX `wallet_ledger_created_at_idx`(`created_at`),
    INDEX `wallet_ledger_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_configs` (
    `id` VARCHAR(191) NOT NULL,
    `report_key` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `allowed_account_types` LONGTEXT NULL,
    `allowed_roles` LONGTEXT NULL,
    `allowed_user_ids` LONGTEXT NULL,
    `blocked_user_ids` LONGTEXT NULL,
    `data_scope` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    `can_export` BOOLEAN NOT NULL DEFAULT true,
    `can_change_filters` BOOLEAN NOT NULL DEFAULT true,
    `only_related_data` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `report_configs_report_key_key`(`report_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_events` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `account_type` VARCHAR(191) NOT NULL,
    `route` VARCHAR(500) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NULL,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `usage_events_user_id_idx`(`user_id`),
    INDEX `usage_events_account_type_idx`(`account_type`),
    INDEX `usage_events_event_type_idx`(`event_type`),
    INDEX `usage_events_created_at_idx`(`created_at`),
    INDEX `usage_events_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `squad_configs` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `credit_limit` DOUBLE NOT NULL DEFAULT 10000,
    `monthly_minimum` DOUBLE NOT NULL DEFAULT 0,
    `billing_day` INTEGER NOT NULL DEFAULT 10,
    `payment_terms` INTEGER NOT NULL DEFAULT 10,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes` LONGTEXT NULL,
    `consultant_id` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `squad_configs_company_id_key`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `squad_cycles` (
    `id` VARCHAR(191) NOT NULL,
    `squad_config_id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `closed_at` DATETIME(3) NULL,
    `due_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `total_consumed` DOUBLE NOT NULL DEFAULT 0,
    `minimum_adjustment` DOUBLE NOT NULL DEFAULT 0,
    `total_invoiced` DOUBLE NOT NULL DEFAULT 0,
    `invoice_id` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `squad_cycles_invoice_id_key`(`invoice_id`),
    INDEX `squad_cycles_company_id_idx`(`company_id`),
    INDEX `squad_cycles_status_idx`(`status`),
    INDEX `squad_cycles_squad_config_id_idx`(`squad_config_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_credentials` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NULL,
    `project_product_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `password_demo` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'other',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `is_demo` BOOLEAN NOT NULL DEFAULT true,
    `requires_rotation` BOOLEAN NOT NULL DEFAULT false,
    `rotation_reason` VARCHAR(191) NULL,
    `last_rotated_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `shared_until` DATETIME(3) NULL,
    `shared_with_user_id` VARCHAR(191) NULL,
    `shared_with_nomad_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_credentials_project_id_idx`(`project_id`),
    INDEX `project_credentials_project_task_id_idx`(`project_task_id`),
    INDEX `project_credentials_project_product_id_idx`(`project_product_id`),
    INDEX `project_credentials_status_idx`(`status`),
    INDEX `project_credentials_category_idx`(`category`),
    INDEX `project_credentials_shared_with_user_id_idx`(`shared_with_user_id`),
    INDEX `project_credentials_shared_with_nomad_id_idx`(`shared_with_nomad_id`),
    UNIQUE INDEX `project_credentials_project_id_title_key`(`project_id`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_credential_access_logs` (
    `id` VARCHAR(191) NOT NULL,
    `credential_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor_type` VARCHAR(191) NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_nomad_id` VARCHAR(191) NULL,
    `details` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_credential_access_logs_credential_id_idx`(`credential_id`),
    INDEX `project_credential_access_logs_action_idx`(`action`),
    INDEX `project_credential_access_logs_created_at_idx`(`created_at`),
    INDEX `project_credential_access_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `project_credential_access_logs_actor_nomad_id_idx`(`actor_nomad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_connections` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'connected',
    `external_account_id` VARCHAR(191) NOT NULL,
    `external_account_name` VARCHAR(191) NULL,
    `scopes` LONGTEXT NULL,
    `access_token_encrypted` LONGTEXT NOT NULL,
    `token_expires_at` DATETIME(3) NULL,
    `last_synced_at` DATETIME(3) NULL,
    `last_error` LONGTEXT NULL,
    `connected_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_connections_project_id_idx`(`project_id`),
    INDEX `project_connections_provider_idx`(`provider`),
    INDEX `project_connections_status_idx`(`status`),
    INDEX `project_connections_connected_by_user_id_idx`(`connected_by_user_id`),
    UNIQUE INDEX `project_connections_project_id_provider_key`(`project_id`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_connection_metrics_daily` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `impressions` INTEGER NULL,
    `clicks` INTEGER NULL,
    `spend` DOUBLE NULL,
    `reach` INTEGER NULL,
    `ctr` DOUBLE NULL,
    `cpc` DOUBLE NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_connection_metrics_daily_connection_id_idx`(`connection_id`),
    INDEX `project_connection_metrics_daily_date_idx`(`date`),
    UNIQUE INDEX `project_connection_metrics_daily_connection_id_date_key`(`connection_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_records` (
    `id` VARCHAR(191) NOT NULL,
    `origem` VARCHAR(60) NOT NULL,
    `tabela` VARCHAR(80) NOT NULL,
    `legacy_id` INTEGER NULL,
    `projeto_legacy_id` INTEGER NULL,
    `agencia_legacy_id` INTEGER NULL,
    `cliente_legacy_id` INTEGER NULL,
    `nomade_legacy_id` INTEGER NULL,
    `conta_legacy_id` INTEGER NULL,
    `valor` DOUBLE NULL,
    `data` DATETIME(3) NULL,
    `dados` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `legacy_records_origem_idx`(`origem`),
    INDEX `legacy_records_tabela_idx`(`tabela`),
    INDEX `legacy_records_projeto_legacy_id_idx`(`projeto_legacy_id`),
    INDEX `legacy_records_agencia_legacy_id_idx`(`agencia_legacy_id`),
    INDEX `legacy_records_nomade_legacy_id_idx`(`nomade_legacy_id`),
    INDEX `legacy_records_data_idx`(`data`),
    UNIQUE INDEX `legacy_records_tabela_legacy_id_key`(`tabela`, `legacy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_feedback_access_configs` (
    `id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `default_policy` VARCHAR(191) NOT NULL DEFAULT 'ALLOW_ALL_ACTIVE',
    `updated_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_feedback_access_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `effect` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `expires_at` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `archived_at` DATETIME(3) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_feedback_access_groups_active_idx`(`active`),
    INDEX `product_feedback_access_groups_effect_priority_idx`(`effect`, `priority`),
    INDEX `product_feedback_access_groups_archived_at_idx`(`archived_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_feedback_access_group_members` (
    `id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `added_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_feedback_access_group_members_user_id_idx`(`user_id`),
    UNIQUE INDEX `product_feedback_access_group_members_group_id_user_id_key`(`group_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_feedback_user_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `effect` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `expires_at` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `updated_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_feedback_user_overrides_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_feedback_access_audits` (
    `id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `target_user_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `before_json` TEXT NULL,
    `after_json` TEXT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_feedback_access_audits_target_user_id_idx`(`target_user_id`),
    INDEX `product_feedback_access_audits_actor_id_idx`(`actor_id`),
    INDEX `product_feedback_access_audits_action_idx`(`action`),
    INDEX `product_feedback_access_audits_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_feedback_work_item_links` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `protocol` VARCHAR(191) NULL,
    `payload_hash` VARCHAR(191) NOT NULL,
    `correlation_id` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `cached_status` VARCHAR(191) NULL,
    `cached_updated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_feedback_work_item_links_protocol_key`(`protocol`),
    UNIQUE INDEX `product_feedback_work_item_links_idempotency_key_key`(`idempotency_key`),
    INDEX `product_feedback_work_item_links_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `share_links` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NULL,
    `target_id` VARCHAR(191) NOT NULL,
    `target_type` VARCHAR(191) NOT NULL,
    `target_title` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(191) NOT NULL,
    `pin_hash` VARCHAR(191) NULL,
    `profile` VARCHAR(191) NOT NULL,
    `scope_id` VARCHAR(191) NULL,
    `period_type` VARCHAR(191) NULL,
    `period_from` DATETIME(3) NULL,
    `period_to` DATETIME(3) NULL,
    `period_label` VARCHAR(191) NULL,
    `allow_filter_changes` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `share_links_token_key`(`token`),
    UNIQUE INDEX `share_links_slug_key`(`slug`),
    INDEX `share_links_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `share_link_activities` (
    `id` VARCHAR(191) NOT NULL,
    `share_link_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_name` VARCHAR(191) NULL,
    `actor_email` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `share_link_activities_share_link_id_created_at_idx`(`share_link_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `share_comments` (
    `id` VARCHAR(191) NOT NULL,
    `share_link_id` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NULL,
    `content_format` VARCHAR(191) NOT NULL DEFAULT 'plain',
    `color` VARCHAR(191) NOT NULL DEFAULT 'default',
    `author_name` VARCHAR(191) NULL,
    `author_email` VARCHAR(191) NOT NULL,
    `author_whatsapp` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'visible',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `share_comments_share_link_id_idx`(`share_link_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `share_comment_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `comment_id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `storage_key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `share_comment_attachments_comment_id_idx`(`comment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `profile` VARCHAR(191) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `widgets` JSON NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_templates_profile_is_active_idx`(`profile`, `is_active`),
    INDEX `dashboard_templates_profile_is_default_idx`(`profile`, `is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_template_contents` (
    `id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NULL,
    `image_storage_key` VARCHAR(191) NULL,
    `image_mime_type` VARCHAR(191) NULL,
    `link_url` VARCHAR(191) NULL,
    `link_label` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_template_contents_template_id_active_idx`(`template_id`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `origin` VARCHAR(191) NOT NULL,
    `origin_id` VARCHAR(191) NULL,
    `recipient_user_id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `scheduled_for` DATETIME(3) NOT NULL,
    `first_attempt_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `delivered_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `failure_summary` TEXT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `metadata_json` TEXT NULL,
    `preview_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `communication_deliveries_idempotency_key_key`(`idempotency_key`),
    INDEX `communication_deliveries_status_scheduled_for_idx`(`status`, `scheduled_for`),
    INDEX `communication_deliveries_origin_origin_id_idx`(`origin`, `origin_id`),
    INDEX `communication_deliveries_recipient_user_id_idx`(`recipient_user_id`),
    INDEX `communication_deliveries_channel_status_idx`(`channel`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `internal_name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `image_file_name` VARCHAR(191) NULL,
    `image_alt` VARCHAR(191) NULL,
    `link_url` VARCHAR(191) NULL,
    `channels_json` LONGTEXT NOT NULL,
    `audience_json` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `is_reengagement` BOOLEAN NOT NULL DEFAULT false,
    `inactivity_days` INTEGER NULL,
    `scheduled_at` DATETIME(3) NULL,
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `target_environment` VARCHAR(191) NULL,
    `activated_at` DATETIME(3) NULL,
    `activated_by_user_id` VARCHAR(191) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_user_id` VARCHAR(191) NULL,

    INDEX `communication_campaigns_status_scheduled_at_idx`(`status`, `scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_recipient_states` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `recipient_user_id` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `reason` VARCHAR(191) NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaign_recipient_states_campaign_id_state_idx`(`campaign_id`, `state`),
    UNIQUE INDEX `campaign_recipient_states_campaign_id_recipient_user_id_key`(`campaign_id`, `recipient_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mandatory_banners` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `image_file_name` VARCHAR(191) NULL,
    `image_alt` VARCHAR(191) NULL,
    `link_url` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'obrigatorio',
    `ack_button_label` VARCHAR(191) NOT NULL DEFAULT 'Li e estou ciente',
    `version` INTEGER NOT NULL DEFAULT 1,
    `audience_json` LONGTEXT NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_cancelled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_user_id` VARCHAR(191) NULL,

    INDEX `mandatory_banners_is_active_starts_at_idx`(`is_active`, `starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banner_acknowledgements` (
    `id` VARCHAR(191) NOT NULL,
    `banner_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `acknowledged_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `banner_acknowledgements_user_id_idx`(`user_id`),
    UNIQUE INDEX `banner_acknowledgements_banner_id_user_id_version_key`(`banner_id`, `user_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `endpoint_hash` VARCHAR(191) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_used_at` DATETIME(3) NULL,

    UNIQUE INDEX `push_subscriptions_endpoint_hash_key`(`endpoint_hash`),
    INDEX `push_subscriptions_user_id_enabled_idx`(`user_id`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_communication_channel_prefs` (
    `user_id` VARCHAR(191) NOT NULL,
    `platform_enabled` BOOLEAN NOT NULL DEFAULT true,
    `email_enabled` BOOLEAN NOT NULL DEFAULT true,
    `whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false,
    `push_enabled` BOOLEAN NOT NULL DEFAULT false,
    `marketing_opt_in` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_pillars` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_pillars_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_four_f` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_four_f_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_categories` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_categories_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_specialties` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `max_hourly_rate` DOUBLE NULL,
    `hourly_rate_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_specialties_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_products` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `internal_name` VARCHAR(191) NOT NULL,
    `pillar_id` VARCHAR(191) NULL,
    `category_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'em_preparacao',
    `origin` VARCHAR(191) NULL,
    `published_version_id` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `archived_at` DATETIME(3) NULL,
    `archived_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_products_slug_key`(`slug`),
    UNIQUE INDEX `catalog2_products_published_version_id_key`(`published_version_id`),
    INDEX `catalog2_products_status_idx`(`status`),
    INDEX `catalog2_products_pillar_id_idx`(`pillar_id`),
    INDEX `catalog2_products_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_product_four_f` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `four_f_id` VARCHAR(191) NOT NULL,

    INDEX `catalog2_product_four_f_four_f_id_idx`(`four_f_id`),
    UNIQUE INDEX `catalog2_product_four_f_product_id_four_f_id_key`(`product_id`, `four_f_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_product_versions` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `state` VARCHAR(191) NOT NULL DEFAULT 'rascunho',
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `full_description` LONGTEXT NULL,
    `base_commercial_deadline_days` INTEGER NULL,
    `published_at` DATETIME(3) NULL,
    `published_by_user_id` VARCHAR(191) NULL,
    `publish_client_action_id` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `updated_by_user_id` VARCHAR(191) NULL,
    `change_summary` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_product_versions_publish_client_action_id_key`(`publish_client_action_id`),
    INDEX `catalog2_product_versions_state_idx`(`state`),
    UNIQUE INDEX `catalog2_product_versions_product_id_version_number_key`(`product_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_version_events` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_version_events_version_id_created_at_idx`(`version_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_variations` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `selection_type` VARCHAR(191) NOT NULL DEFAULT 'single',
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_variations_version_id_sort_order_idx`(`version_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_variation_options` (
    `id` VARCHAR(191) NOT NULL,
    `variation_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_variation_options_variation_id_sort_order_idx`(`variation_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_option_effects` (
    `id` VARCHAR(191) NOT NULL,
    `variation_option_id` VARCHAR(191) NOT NULL,
    `effect_type` VARCHAR(191) NOT NULL,
    `effect_value` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_option_effects_variation_option_id_sort_order_idx`(`variation_option_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_addons` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_default_selected` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `base_cost` DOUBLE NULL,
    `target_task_id` VARCHAR(191) NULL,
    `target_step_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_addons_version_id_sort_order_idx`(`version_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_addon_effects` (
    `id` VARCHAR(191) NOT NULL,
    `addon_id` VARCHAR(191) NOT NULL,
    `effect_type` VARCHAR(191) NOT NULL,
    `effect_value` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_addon_effects_addon_id_sort_order_idx`(`addon_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `objective` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `specialty_id` VARCHAR(191) NULL,
    `execution_mode` VARCHAR(191) NOT NULL DEFAULT 'humano',
    `estimated_minutes` INTEGER NULL,
    `requires_review` BOOLEAN NOT NULL DEFAULT false,
    `requires_client_approval` BOOLEAN NOT NULL DEFAULT false,
    `is_conditional` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_tasks_version_id_sort_order_idx`(`version_id`, `sort_order`),
    INDEX `catalog2_tasks_specialty_id_idx`(`specialty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_task_dependencies` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `depends_on_task_id` VARCHAR(191) NOT NULL,

    INDEX `catalog2_task_dependencies_depends_on_task_id_idx`(`depends_on_task_id`),
    UNIQUE INDEX `catalog2_task_dependencies_task_id_depends_on_task_id_key`(`task_id`, `depends_on_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_task_steps` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `estimated_minutes` INTEGER NULL,
    `is_conditional` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_task_steps_task_id_sort_order_idx`(`task_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_task_ai` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `est_input_tokens` INTEGER NULL,
    `est_output_tokens` INTEGER NULL,
    `unit_cost_input_per_1k` DOUBLE NULL,
    `unit_cost_output_per_1k` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `est_review_rounds` INTEGER NULL,
    `cost_note` TEXT NULL,
    `human_review_required` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_task_ai_task_id_key`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_conditions` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `trigger_source` VARCHAR(191) NOT NULL,
    `trigger_ref` VARCHAR(191) NULL,
    `operator` VARCHAR(191) NOT NULL,
    `comparison_value` VARCHAR(191) NULL,
    `effect_type` VARCHAR(191) NOT NULL,
    `effect_value` TEXT NOT NULL,
    `explanation` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_conditions_version_id_sort_order_idx`(`version_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_pricing_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `tax_percent` DOUBLE NULL,
    `commission_percent` DOUBLE NULL,
    `operational_fee_percent` DOUBLE NULL,
    `profit_margin_percent` DOUBLE NULL,
    `human_review_percent` DOUBLE NULL,
    `component_order_json` TEXT NULL,
    `component_base_json` TEXT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `notes` TEXT NULL,
    `updated_by_user_id` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_import_batches` (
    `id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `rule_version` VARCHAR(191) NOT NULL,
    `source_main_name` VARCHAR(191) NOT NULL,
    `source_main_checksum` VARCHAR(191) NOT NULL,
    `source_rose_name` VARCHAR(191) NOT NULL,
    `source_rose_checksum` VARCHAR(191) NOT NULL,
    `source_ata_checksum` VARCHAR(191) NULL,
    `row_count_main` INTEGER NOT NULL DEFAULT 0,
    `row_count_rose` INTEGER NOT NULL DEFAULT 0,
    `expected_products` INTEGER NOT NULL DEFAULT 36,
    `created_count` INTEGER NOT NULL DEFAULT 0,
    `updated_count` INTEGER NOT NULL DEFAULT 0,
    `unchanged_count` INTEGER NOT NULL DEFAULT 0,
    `divergence_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'dry_run',
    `report_json` LONGTEXT NULL,
    `notes` TEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    INDEX `catalog2_import_batches_mode_started_at_idx`(`mode`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_import_records` (
    `id` VARCHAR(191) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `source_key` VARCHAR(191) NOT NULL,
    `source_index` INTEGER NOT NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `version_id` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NULL,
    `outcome` VARCHAR(191) NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `fields_from_main_json` LONGTEXT NULL,
    `fields_from_rose_json` LONGTEXT NULL,
    `original_texts_json` LONGTEXT NULL,
    `divergences_json` TEXT NULL,
    `warnings_json` TEXT NULL,
    `errors_json` TEXT NULL,
    `rose_reviewed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_import_records_source_key_idx`(`source_key`),
    UNIQUE INDEX `catalog2_import_records_batch_id_source_key_key`(`batch_id`, `source_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_product_import_origins` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `source_key` VARCHAR(191) NOT NULL,
    `source_index` INTEGER NOT NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `rose_reviewed` BOOLEAN NOT NULL DEFAULT false,
    `area_rose` VARCHAR(191) NULL,
    `review_state` VARCHAR(191) NOT NULL DEFAULT 'importado',
    `pendencies_json` TEXT NULL,
    `last_import_checksum` VARCHAR(191) NOT NULL,
    `last_import_batch_id` VARCHAR(191) NULL,
    `human_edited_at` DATETIME(3) NULL,
    `human_edited_by_user_id` VARCHAR(191) NULL,
    `main_fields_json` LONGTEXT NULL,
    `rose_fields_json` LONGTEXT NULL,
    `original_texts_json` LONGTEXT NULL,
    `divergences_json` TEXT NULL,
    `observations` TEXT NULL,
    `historical_price_min` DOUBLE NULL,
    `historical_price_max` DOUBLE NULL,
    `historical_price_note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_product_import_origins_product_id_key`(`product_id`),
    UNIQUE INDEX `catalog2_product_import_origins_source_key_key`(`source_key`),
    INDEX `catalog2_product_import_origins_review_state_idx`(`review_state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_review_resolutions` (
    `id` VARCHAR(191) NOT NULL,
    `origin_id` VARCHAR(191) NOT NULL,
    `pendency_key` VARCHAR(191) NOT NULL,
    `decision` TEXT NOT NULL,
    `original_divergence_json` TEXT NULL,
    `resolved_by_user_id` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_review_resolutions_origin_id_idx`(`origin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_quotes` (
    `id` VARCHAR(191) NOT NULL,
    `account_kind` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `selection_json` TEXT NOT NULL,
    `deliverables_json` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `commercial_deadline_days` INTEGER NULL,
    `commercial_price` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `config_checksum` VARCHAR(191) NOT NULL,
    `pricing_snapshot_json` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'rascunho',
    `valid_until` DATETIME(3) NULL,
    `is_preview` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_quotes_account_kind_account_id_status_idx`(`account_kind`, `account_id`, `status`),
    INDEX `catalog2_quotes_user_id_idx`(`user_id`),
    UNIQUE INDEX `catalog2_quotes_account_kind_account_id_config_checksum_stat_key`(`account_kind`, `account_id`, `config_checksum`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_cutover_batches` (
    `id` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `operational_products_deactivated` INTEGER NOT NULL,
    `catalog2_products_published` INTEGER NOT NULL,
    `affected_products_checksum` VARCHAR(191) NOT NULL,
    `affected_product_ids_json` LONGTEXT NOT NULL,
    `reversed_at` DATETIME(3) NULL,
    `reversed_by` VARCHAR(191) NULL,
    `reversal_note` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_change_orders` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `original_project_product_id` VARCHAR(191) NULL,
    `quote_id` VARCHAR(191) NOT NULL,
    `requested_by_user_id` VARCHAR(191) NOT NULL,
    `request_note` TEXT NULL,
    `change_summary` TEXT NOT NULL,
    `price_impact_snapshot` DOUBLE NULL,
    `deadline_impact_days_snapshot` INTEGER NULL,
    `currency_snapshot` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'solicitado',
    `decided_by_user_id` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_note` TEXT NULL,
    `approval_client_action_id` VARCHAR(191) NULL,
    `materialized_project_product_id` VARCHAR(191) NULL,
    `materialized_payment_id` VARCHAR(191) NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_change_orders_quote_id_key`(`quote_id`),
    UNIQUE INDEX `catalog2_change_orders_approval_client_action_id_key`(`approval_client_action_id`),
    UNIQUE INDEX `catalog2_change_orders_materialized_project_product_id_key`(`materialized_project_product_id`),
    INDEX `catalog2_change_orders_project_id_status_idx`(`project_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_cart_items` (
    `id` VARCHAR(191) NOT NULL,
    `account_kind` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `selection_json` TEXT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `config_checksum` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_cart_items_account_kind_account_id_user_id_idx`(`account_kind`, `account_id`, `user_id`),
    UNIQUE INDEX `catalog2_cart_items_account_kind_account_id_user_id_config_c_key`(`account_kind`, `account_id`, `user_id`, `config_checksum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_admin_profile_id_fkey` FOREIGN KEY (`admin_profile_id`) REFERENCES `admin_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lider_areas` ADD CONSTRAINT `lider_areas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_referred_by_partner_id_fkey` FOREIGN KEY (`referred_by_partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_archives` ADD CONSTRAINT `company_archives_deleted_by_user_id_fkey` FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_payment_methods` ADD CONSTRAINT `company_payment_methods_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agencies` ADD CONSTRAINT `agencies_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nomades` ADD CONSTRAINT `nomades_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nomade_habilidades` ADD CONSTRAINT `nomade_habilidades_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualifications` ADD CONSTRAINT `qualifications_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_archived_by_user_id_fkey` FOREIGN KEY (`archived_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_admin_responsible_user_id_fkey` FOREIGN KEY (`admin_responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planner_columns` ADD CONSTRAINT `planner_columns_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_column_id_fkey` FOREIGN KEY (`column_id`) REFERENCES `planner_columns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_templates` ADD CONSTRAINT `task_templates_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_executions` ADD CONSTRAINT `task_executions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_executions` ADD CONSTRAINT `task_executions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_executions` ADD CONSTRAINT `task_executions_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_versions` ADD CONSTRAINT `product_versions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variations` ADD CONSTRAINT `product_variations_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_bundles` ADD CONSTRAINT `product_bundles_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_bundle_items` ADD CONSTRAINT `product_bundle_items_bundle_id_fkey` FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_bundle_items` ADD CONSTRAINT `product_bundle_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_bundle_items` ADD CONSTRAINT `product_bundle_items_variation_id_fkey` FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iallka_sessions` ADD CONSTRAINT `iallka_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iallka_sessions` ADD CONSTRAINT `iallka_sessions_created_project_id_fkey` FOREIGN KEY (`created_project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iallka_messages` ADD CONSTRAINT `iallka_messages_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `iallka_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_addons` ADD CONSTRAINT `product_addons_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_catalog_tasks` ADD CONSTRAINT `product_catalog_tasks_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_catalog_tasks` ADD CONSTRAINT `product_catalog_tasks_catalog_task_id_fkey` FOREIGN KEY (`catalog_task_id`) REFERENCES `catalog_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_catalog_tasks` ADD CONSTRAINT `product_catalog_tasks_variation_id_fkey` FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_variation_id_fkey` FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_catalog2_product_id_fkey` FOREIGN KEY (`catalog2_product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_catalog2_version_id_fkey` FOREIGN KEY (`catalog2_version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_catalog_task_id_fkey` FOREIGN KEY (`catalog_task_id`) REFERENCES `catalog_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_catalog2_task_id_fkey` FOREIGN KEY (`catalog2_task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_origin_payment_id_fkey` FOREIGN KEY (`origin_payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_pending_fee_invoice_id_fkey` FOREIGN KEY (`pending_fee_invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_emergencial_invoice_id_fkey` FOREIGN KEY (`emergencial_invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_lider_responsavel_id_fkey` FOREIGN KEY (`lider_responsavel_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_stages` ADD CONSTRAINT `project_task_stages_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_briefing_answers` ADD CONSTRAINT `task_briefing_answers_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_project_task_stage_id_fkey` FOREIGN KEY (`project_task_stage_id`) REFERENCES `project_task_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_attachments` ADD CONSTRAINT `project_attachments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_knowledge_documents` ADD CONSTRAINT `ai_knowledge_documents_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ai_knowledge_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_model_pricing` ADD CONSTRAINT `ai_model_pricing_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `ai_service_configs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `ai_service_configs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_assignment_history` ADD CONSTRAINT `task_assignment_history_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_presence` ADD CONSTRAINT `user_presence_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_offers` ADD CONSTRAINT `task_offers_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_standard_id_fkey` FOREIGN KEY (`standard_id`) REFERENCES `alert_standards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_alerts` ADD CONSTRAINT `system_alerts_notification_message_id_fkey` FOREIGN KEY (`notification_message_id`) REFERENCES `notification_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_alerts` ADD CONSTRAINT `system_alerts_standard_id_fkey` FOREIGN KEY (`standard_id`) REFERENCES `alert_standards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_alerts` ADD CONSTRAINT `system_alerts_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `alert_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_alerts` ADD CONSTRAINT `system_alerts_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `alert_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_alert_events` ADD CONSTRAINT `system_alert_events_alert_id_fkey` FOREIGN KEY (`alert_id`) REFERENCES `system_alerts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_rules` ADD CONSTRAINT `notification_rules_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `notification_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_groups` ADD CONSTRAINT `notification_groups_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_groups` ADD CONSTRAINT `notification_groups_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_group_members` ADD CONSTRAINT `notification_group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `notification_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_group_members` ADD CONSTRAINT `notification_group_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `term_acceptances` ADD CONSTRAINT `term_acceptances_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `term_acceptances` ADD CONSTRAINT `term_acceptances_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_modules` ADD CONSTRAINT `course_modules_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `course_modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_permissions` ADD CONSTRAINT `admin_permissions_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `admin_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_profiles` ADD CONSTRAINT `partner_profiles_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_withdrawals` ADD CONSTRAINT `partner_withdrawals_partner_profile_id_fkey` FOREIGN KEY (`partner_profile_id`) REFERENCES `partner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_linked_user_id_fkey` FOREIGN KEY (`linked_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commissions` ADD CONSTRAINT `partner_commissions_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commissions` ADD CONSTRAINT `partner_commissions_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agency_leaderships` ADD CONSTRAINT `agency_leaderships_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agency_leaderships` ADD CONSTRAINT `agency_leaderships_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agency_reports` ADD CONSTRAINT `agency_reports_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agency_reports` ADD CONSTRAINT `agency_reports_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_queue_entries` ADD CONSTRAINT `match_queue_entries_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_ledger` ADD CONSTRAINT `wallet_ledger_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squad_configs` ADD CONSTRAINT `squad_configs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squad_cycles` ADD CONSTRAINT `squad_cycles_squad_config_id_fkey` FOREIGN KEY (`squad_config_id`) REFERENCES `squad_configs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credentials` ADD CONSTRAINT `project_credentials_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credentials` ADD CONSTRAINT `project_credentials_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credentials` ADD CONSTRAINT `project_credentials_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credential_access_logs` ADD CONSTRAINT `project_credential_access_logs_credential_id_fkey` FOREIGN KEY (`credential_id`) REFERENCES `project_credentials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_connections` ADD CONSTRAINT `project_connections_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_connection_metrics_daily` ADD CONSTRAINT `project_connection_metrics_daily_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `project_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_feedback_access_group_members` ADD CONSTRAINT `product_feedback_access_group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `product_feedback_access_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_feedback_access_group_members` ADD CONSTRAINT `product_feedback_access_group_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_feedback_user_overrides` ADD CONSTRAINT `product_feedback_user_overrides_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_feedback_work_item_links` ADD CONSTRAINT `product_feedback_work_item_links_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_links` ADD CONSTRAINT `share_links_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_link_activities` ADD CONSTRAINT `share_link_activities_share_link_id_fkey` FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_comments` ADD CONSTRAINT `share_comments_share_link_id_fkey` FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_comments` ADD CONSTRAINT `share_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_comment_attachments` ADD CONSTRAINT `share_comment_attachments_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `share_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_templates` ADD CONSTRAINT `dashboard_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_template_contents` ADD CONSTRAINT `dashboard_template_contents_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `dashboard_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_deliveries` ADD CONSTRAINT `communication_deliveries_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipient_states` ADD CONSTRAINT `campaign_recipient_states_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `communication_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `banner_acknowledgements` ADD CONSTRAINT `banner_acknowledgements_banner_id_fkey` FOREIGN KEY (`banner_id`) REFERENCES `mandatory_banners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `banner_acknowledgements` ADD CONSTRAINT `banner_acknowledgements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_communication_channel_prefs` ADD CONSTRAINT `user_communication_channel_prefs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_products` ADD CONSTRAINT `catalog2_products_pillar_id_fkey` FOREIGN KEY (`pillar_id`) REFERENCES `catalog2_pillars`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_products` ADD CONSTRAINT `catalog2_products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `catalog2_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_products` ADD CONSTRAINT `catalog2_products_published_version_id_fkey` FOREIGN KEY (`published_version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_product_four_f` ADD CONSTRAINT `catalog2_product_four_f_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_product_four_f` ADD CONSTRAINT `catalog2_product_four_f_four_f_id_fkey` FOREIGN KEY (`four_f_id`) REFERENCES `catalog2_four_f`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_product_versions` ADD CONSTRAINT `catalog2_product_versions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_version_events` ADD CONSTRAINT `catalog2_version_events_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_variations` ADD CONSTRAINT `catalog2_variations_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_variation_options` ADD CONSTRAINT `catalog2_variation_options_variation_id_fkey` FOREIGN KEY (`variation_id`) REFERENCES `catalog2_variations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_option_effects` ADD CONSTRAINT `catalog2_option_effects_variation_option_id_fkey` FOREIGN KEY (`variation_option_id`) REFERENCES `catalog2_variation_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addons` ADD CONSTRAINT `catalog2_addons_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addons` ADD CONSTRAINT `catalog2_addons_target_task_id_fkey` FOREIGN KEY (`target_task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addons` ADD CONSTRAINT `catalog2_addons_target_step_id_fkey` FOREIGN KEY (`target_step_id`) REFERENCES `catalog2_task_steps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addon_effects` ADD CONSTRAINT `catalog2_addon_effects_addon_id_fkey` FOREIGN KEY (`addon_id`) REFERENCES `catalog2_addons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_tasks` ADD CONSTRAINT `catalog2_tasks_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_tasks` ADD CONSTRAINT `catalog2_tasks_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `catalog2_specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_dependencies` ADD CONSTRAINT `catalog2_task_dependencies_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_dependencies` ADD CONSTRAINT `catalog2_task_dependencies_depends_on_task_id_fkey` FOREIGN KEY (`depends_on_task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_steps` ADD CONSTRAINT `catalog2_task_steps_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_ai` ADD CONSTRAINT `catalog2_task_ai_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_conditions` ADD CONSTRAINT `catalog2_conditions_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_import_records` ADD CONSTRAINT `catalog2_import_records_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `catalog2_import_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_product_import_origins` ADD CONSTRAINT `catalog2_product_import_origins_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_review_resolutions` ADD CONSTRAINT `catalog2_review_resolutions_origin_id_fkey` FOREIGN KEY (`origin_id`) REFERENCES `catalog2_product_import_origins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_quotes` ADD CONSTRAINT `catalog2_quotes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_quotes` ADD CONSTRAINT `catalog2_quotes_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_change_orders` ADD CONSTRAINT `catalog2_change_orders_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_change_orders` ADD CONSTRAINT `catalog2_change_orders_original_project_product_id_fkey` FOREIGN KEY (`original_project_product_id`) REFERENCES `project_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_change_orders` ADD CONSTRAINT `catalog2_change_orders_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `catalog2_quotes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_cart_items` ADD CONSTRAINT `catalog2_cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_cart_items` ADD CONSTRAINT `catalog2_cart_items_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Dados estruturais fixos (DML, não capturado por `migrate diff` de
-- schema — precisa ser reproduzido manualmente aqui) ────────────────────────
--
-- As 4 fases 4F do catalog2 (bloco 3, correção 1.2 — nunca há uma 5ª fase,
-- é a própria metodologia; pilares/categorias/especialidades continuam
-- dinâmicos, seed explícito via `npm run catalog2:seed-classifications`).
INSERT INTO `catalog2_four_f` (`id`, `key`, `name`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('c2f-fundacao',   'fundacao',   'F1 — Fundação',   1, NOW(3), NOW(3)),
  ('c2f-fluxo',      'fluxo',      'F2 — Fluxo',      2, NOW(3), NOW(3)),
  ('c2f-forca',      'forca',      'F3 — Força',      3, NOW(3), NOW(3)),
  ('c2f-fidelizacao','fidelizacao','F4 — Fidelização',4, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sort_order` = VALUES(`sort_order`);

-- Linha singleton do módulo de precificação do catalog2 — todos os
-- percentuais NULOS ("aguardando definição comercial"; o cálculo nunca
-- inventa valor).
INSERT INTO `catalog2_pricing_settings` (`id`, `currency`, `updated_at`, `created_at`)
VALUES ('default', 'BRL', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `currency` = `currency`;

-- Nota: a migration histórica `20260711100200_backfill_project_code_and_
-- sequences` (arquivada) fazia backfill de `project_code`/`entity_sequences`
-- para PROJETOS PRÉ-EXISTENTES sem código — é um no-op comprovado em banco
-- vazio (0 linhas afetadas) e não se aplica a nenhum ambiente novo; não foi
-- reproduzida aqui de propósito. Ver docs/migrations-baseline-2026-09.md.


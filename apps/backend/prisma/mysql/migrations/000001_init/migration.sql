-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'company_user',
    `account_type` VARCHAR(191) NOT NULL DEFAULT 'empresas',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `avatar` LONGTEXT NULL,
    `phone` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `admin_profile_id` VARCHAR(191) NULL,
    `company_id` VARCHAR(191) NULL,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `segment` VARCHAR(191) NULL,
    `address` LONGTEXT NULL,
    `description` LONGTEXT NULL,
    `logo` LONGTEXT NULL,
    `website` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agencies` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `partner_level` VARCHAR(191) NOT NULL DEFAULT 'bronze',
    `wallet_balance` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `agencies_user_id_key`(`user_id`),
    UNIQUE INDEX `agencies_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomades` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `avatar` LONGTEXT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'bronze',
    `status` VARCHAR(191) NOT NULL DEFAULT 'aguardando_aprovacao',
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

    UNIQUE INDEX `nomades_user_id_key`(`user_id`),
    UNIQUE INDEX `nomades_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomade_habilidades` (
    `id` VARCHAR(191) NOT NULL,
    `nomade_id` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `categoria_produto` VARCHAR(191) NULL,
    `produto_id` VARCHAR(191) NULL,
    `modelo_tarefa_id` VARCHAR(191) NULL,
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
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `short_description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `tags` LONGTEXT NULL,
    `base_price` DOUBLE NOT NULL DEFAULT 0,
    `complexity` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `visibility` LONGTEXT NOT NULL DEFAULT '{"company":true,"agency":true,"partner":false,"inHouse":false}',
    `image` LONGTEXT NULL,
    `demonstrations` LONGTEXT NULL,
    `contract_count` INTEGER NOT NULL DEFAULT 0,
    `average_rating` DOUBLE NOT NULL DEFAULT 0,
    `completion_time` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

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

    UNIQUE INDEX `catalog_tasks_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_catalog_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `catalog_task_id` VARCHAR(191) NOT NULL,
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
    `product_id` VARCHAR(191) NOT NULL,
    `variation_id` VARCHAR(191) NULL,
    `product_name_snapshot` VARCHAR(191) NOT NULL,
    `product_code_snapshot` VARCHAR(191) NULL,
    `product_category_snapshot` VARCHAR(191) NOT NULL,
    `product_price_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `recurrence_snapshot` VARCHAR(191) NULL,
    `preco_final_cliente_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `comissao_snapshot` DOUBLE NOT NULL DEFAULT 0,
    `pagador_snapshot` VARCHAR(191) NOT NULL DEFAULT 'AGENCIA',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `start_date` DATETIME(3) NULL,
    `expected_end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_products_project_id_product_id_key`(`project_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `catalog_task_id` VARCHAR(191) NULL,
    `code_snapshot` VARCHAR(191) NULL,
    `name_snapshot` VARCHAR(191) NOT NULL,
    `category_snapshot` VARCHAR(191) NULL,
    `task_code` VARCHAR(191) NULL,
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
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `fase` VARCHAR(191) NULL,
    `phase` VARCHAR(191) NULL,
    `checklist_snapshot` LONGTEXT NULL,
    `steps_snapshot` LONGTEXT NULL,
    `briefing_snapshot` LONGTEXT NULL,
    `observations` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_tasks_task_code_key`(`task_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_stages` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `catalog_step_ref` VARCHAR(191) NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` LONGTEXT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `obrigatoria` BOOLEAN NOT NULL DEFAULT true,
    `depende_da_etapa_anterior` BOOLEAN NOT NULL DEFAULT true,
    `briefing_necessario` BOOLEAN NOT NULL DEFAULT false,
    `checklist_snapshot` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
CREATE TABLE `system_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'warning',
    `entity_type` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participants` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
    `user_id` VARCHAR(191) NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `total_earned` DOUBLE NOT NULL DEFAULT 0,
    `total_withdrawn` DOUBLE NOT NULL DEFAULT 0,
    `referral_link` VARCHAR(191) NULL,
    `referral_code` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `pix_key` VARCHAR(191) NULL,
    `pix_key_type` VARCHAR(191) NULL,
    `linked_campaign_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_profiles_user_id_key`(`user_id`),
    UNIQUE INDEX `partner_profiles_referral_code_key`(`referral_code`),
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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lider_areas` ADD CONSTRAINT `lider_areas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `task_templates` ADD CONSTRAINT `task_templates_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_executions` ADD CONSTRAINT `task_executions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_executions` ADD CONSTRAINT `task_executions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_executions` ADD CONSTRAINT `task_executions_nomade_id_fkey` FOREIGN KEY (`nomade_id`) REFERENCES `nomades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variations` ADD CONSTRAINT `product_variations_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_addons` ADD CONSTRAINT `product_addons_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_catalog_tasks` ADD CONSTRAINT `product_catalog_tasks_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_catalog_tasks` ADD CONSTRAINT `product_catalog_tasks_catalog_task_id_fkey` FOREIGN KEY (`catalog_task_id`) REFERENCES `catalog_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_variation_id_fkey` FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_catalog_task_id_fkey` FOREIGN KEY (`catalog_task_id`) REFERENCES `catalog_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_lider_responsavel_id_fkey` FOREIGN KEY (`lider_responsavel_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_stages` ADD CONSTRAINT `project_task_stages_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_briefing_answers` ADD CONSTRAINT `task_briefing_answers_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_assignment_history` ADD CONSTRAINT `task_assignment_history_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `partner_profiles` ADD CONSTRAINT `partner_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commissions` ADD CONSTRAINT `partner_commissions_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commissions` ADD CONSTRAINT `partner_commissions_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_queue_entries` ADD CONSTRAINT `match_queue_entries_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


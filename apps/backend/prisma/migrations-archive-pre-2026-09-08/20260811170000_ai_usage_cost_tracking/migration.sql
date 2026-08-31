-- Controle de custo de IA (admin > Configurações > "Uso e Custos de IA") —
-- ver lib/ai-usage-tracker.ts. Não existe API de billing em tempo real pela
-- chave que usamos hoje: o custo é sempre calculado a partir dos
-- tokens/unidades que cada chamada devolve × o preço configurado aqui
-- (editável). Desenho pensado por serviço desde o início — hoje só o Gemini
-- está plugado, mas outro provedor (imagem, vídeo, outro texto) só precisa
-- de uma linha nova em ai_service_configs/ai_model_pricing, sem migration.
-- pricing_unit = "tokens" usa input/output_price_per_million; qualquer outro
-- valor ("image", "video_second", "request", "minute") usa unit_price.

CREATE TABLE `ai_service_configs` (
  `id`                  VARCHAR(191) NOT NULL,
  `key`                 VARCHAR(191) NOT NULL,
  `name`                VARCHAR(191) NOT NULL,
  `provider`            VARCHAR(191) NULL,
  `monthly_budget_usd`  DOUBLE NULL,
  `alert_threshold_pct` INT NOT NULL DEFAULT 80,
  `is_active`           BOOLEAN NOT NULL DEFAULT true,
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ai_service_configs_key_key` (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_model_pricing` (
  `id`                        VARCHAR(191) NOT NULL,
  `service_id`                VARCHAR(191) NOT NULL,
  `model`                     VARCHAR(191) NOT NULL,
  `pricing_unit`              VARCHAR(191) NOT NULL DEFAULT 'tokens',
  `input_price_per_million`   DOUBLE NULL,
  `output_price_per_million`  DOUBLE NULL,
  `unit_price`                DOUBLE NULL,
  `currency`                  VARCHAR(191) NOT NULL DEFAULT 'USD',
  `created_at`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`                DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ai_model_pricing_service_id_model_key` (`service_id`, `model`),
  CONSTRAINT `ai_model_pricing_service_id_fkey`
    FOREIGN KEY (`service_id`) REFERENCES `ai_service_configs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_usage_logs` (
  `id`                 VARCHAR(191) NOT NULL,
  `service_id`         VARCHAR(191) NOT NULL,
  `model`              VARCHAR(191) NOT NULL,
  `feature`            VARCHAR(191) NOT NULL,
  `prompt_tokens`      INT NOT NULL DEFAULT 0,
  `completion_tokens`  INT NOT NULL DEFAULT 0,
  `total_tokens`       INT NOT NULL DEFAULT 0,
  `units`              INT NOT NULL DEFAULT 0,
  `estimated_cost_usd` DOUBLE NOT NULL DEFAULT 0,
  `user_id`            VARCHAR(191) NULL,
  `created_at`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ai_usage_logs_service_id_idx` (`service_id`),
  INDEX `ai_usage_logs_created_at_idx` (`created_at`),
  CONSTRAINT `ai_usage_logs_service_id_fkey`
    FOREIGN KEY (`service_id`) REFERENCES `ai_service_configs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

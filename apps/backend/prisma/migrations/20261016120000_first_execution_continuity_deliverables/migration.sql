-- Correção de modalidades / primeira execução (2026-10-16). Tudo ADITIVO e retrocompatível: só colunas novas com valor padrão que
-- reproduz o comportamento anterior. Nenhum dado existente é apagado ou reescrito.

-- Continuidade do executor (configuração simples por tarefa)
ALTER TABLE `catalog2_tasks`
  ADD COLUMN `continuity_accept_hours` INT NULL,
  ADD COLUMN `continuity_if_unavailable` VARCHAR(20) NOT NULL DEFAULT 'normal_queue',
  ADD COLUMN `continuity_after_deadline` VARCHAR(20) NOT NULL DEFAULT 'normal_queue',
  ADD COLUMN `reuse_connections_same_project` BOOLEAN NOT NULL DEFAULT false;

-- Entregáveis: cadastro completo
ALTER TABLE `catalog2_task_deliverables`
  ADD COLUMN `format` VARCHAR(80) NULL,
  ADD COLUMN `delivery_moment` VARCHAR(40) NULL,
  ADD COLUMN `template_url` VARCHAR(1000) NULL,
  ADD COLUMN `template_name` VARCHAR(191) NULL,
  ADD COLUMN `evidence_required` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `requires_qualification` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `cycle_scope` VARCHAR(20) NOT NULL DEFAULT 'every_cycle',
  ADD COLUMN `is_conditional` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `condition_json` TEXT NULL;

-- Perguntas do questionário: destino da resposta e condição de exibição
ALTER TABLE `catalog2_questionnaire_questions`
  ADD COLUMN `target_step_key` VARCHAR(60) NULL,
  ADD COLUMN `condition_json` TEXT NULL;

-- Contratação: primeira execução forçada pelo administrador (com justificativa) e marca do que foi decidido
ALTER TABLE `project_products`
  ADD COLUMN `force_first_execution_next` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `force_first_execution_reason` TEXT NULL,
  ADD COLUMN `force_first_execution_by` VARCHAR(191) NULL,
  ADD COLUMN `force_first_execution_at` DATETIME(3) NULL,
  ADD COLUMN `first_execution_in_project` BOOLEAN NULL;

-- Assinatura: crédito de etapas dispensadas (abatido da próxima fatura)
ALTER TABLE `catalog2_subscriptions`
  ADD COLUMN `pending_credit_amount` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `pending_credit_note` TEXT NULL;

-- Pacotes: venda separada continua permitida por padrão (decisão do administrador, na gestão do pacote)
ALTER TABLE `catalog2_packages`
  ADD COLUMN `block_standalone_sale` BOOLEAN NOT NULL DEFAULT false;

-- Cotação feita para um projeto existente (aditivo): define a primeira execução
ALTER TABLE `catalog2_quotes`
  ADD COLUMN `for_project_id` VARCHAR(191) NULL;

-- Entregáveis do projeto: campos copiados do cadastro
ALTER TABLE `project_task_deliverables`
  ADD COLUMN `format` VARCHAR(80) NULL,
  ADD COLUMN `delivery_moment` VARCHAR(40) NULL,
  ADD COLUMN `template_url` VARCHAR(1000) NULL,
  ADD COLUMN `template_name` VARCHAR(191) NULL,
  ADD COLUMN `evidence_required` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `requires_qualification` BOOLEAN NOT NULL DEFAULT false;

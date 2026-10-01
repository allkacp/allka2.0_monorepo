-- ROLLBACK de 20260930160000_universal_structure_v2 (executar manualmente, nesta ordem, num backup/cópia validado)
-- 1) desfaz a correção de acentuação das classificações 4F
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463120C3A2E282ACE2809D2046756E6461C383C2A7C383C2A36F') USING utf8mb4) WHERE `key` = 'fundacao';
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463220C3A2E282ACE2809D20466C75786F') USING utf8mb4) WHERE `key` = 'fluxo';
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463320C3A2E282ACE2809D20466F72C383C2A761') USING utf8mb4) WHERE `key` = 'forca';
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463420C3A2E282ACE2809D20466964656C697A61C383C2A7C383C2A36F') USING utf8mb4) WHERE `key` = 'fidelizacao';
-- 2) remove as chaves estrangeiras e tabelas novas
ALTER TABLE `catalog2_ai_profile_prompt_versions` DROP FOREIGN KEY `catalog2_ai_profile_prompt_versions_profile_id_fkey`;
ALTER TABLE `project_task_deliverable_versions` DROP FOREIGN KEY `project_task_deliverable_versions_deliverable_id_fkey`;
DROP TABLE `catalog2_ai_profile_prompt_versions`;
DROP TABLE `project_task_deliverable_versions`;
-- 3) remove as colunas novas
ALTER TABLE `catalog2_addon_effects` DROP COLUMN `charge_end_cycle`, DROP COLUMN `charge_quantity`, DROP COLUMN `charge_scope`, DROP COLUMN `charge_start_cycle`, DROP COLUMN `source_step_key`, DROP COLUMN `source_task_key`;
ALTER TABLE `catalog2_addons` DROP COLUMN `charge_end_cycle`, DROP COLUMN `charge_quantity`, DROP COLUMN `charge_scope`, DROP COLUMN `charge_start_cycle`, DROP COLUMN `source_step_key`, DROP COLUMN `source_task_key`;
ALTER TABLE `catalog2_ai_profiles` DROP COLUMN `fallback_human`, DROP COLUMN `input_format`, DROP COLUMN `max_runs_per_task`, DROP COLUMN `max_tokens_per_run`, DROP COLUMN `on_failure`, DROP COLUMN `output_format`, DROP COLUMN `prompt_version`, DROP COLUMN `requires_human_review`;
ALTER TABLE `catalog2_conditions` DROP COLUMN `charge_end_cycle`, DROP COLUMN `charge_quantity`, DROP COLUMN `charge_scope`, DROP COLUMN `charge_start_cycle`, DROP COLUMN `source_step_key`, DROP COLUMN `source_task_key`;
ALTER TABLE `catalog2_option_effects` DROP COLUMN `charge_end_cycle`, DROP COLUMN `charge_quantity`, DROP COLUMN `charge_scope`, DROP COLUMN `charge_start_cycle`, DROP COLUMN `source_step_key`, DROP COLUMN `source_task_key`;
ALTER TABLE `catalog2_product_versions` DROP COLUMN `change_policy`, DROP COLUMN `client_info`, DROP COLUMN `client_requirements_json`, DROP COLUMN `commercial_objective`, DROP COLUMN `deliverables_summary_json`, DROP COLUMN `excluded_items_json`, DROP COLUMN `field_visibility_json`, DROP COLUMN `included_items_json`, DROP COLUMN `internal_notes`, DROP COLUMN `results_disclaimer`, DROP COLUMN `scope`, DROP COLUMN `target_audience`;
ALTER TABLE `catalog2_questionnaire_questions` DROP COLUMN `answer_usage`, DROP COLUMN `default_value`, DROP COLUMN `help_text`, DROP COLUMN `options_json`, DROP COLUMN `question_type`, DROP COLUMN `validation_json`, DROP COLUMN `visibility`;
ALTER TABLE `catalog2_quotes` DROP COLUMN `first_charge_price`, DROP COLUMN `implementation_price`, DROP COLUMN `pricing_components_json`, DROP COLUMN `recurring_price`;
ALTER TABLE `catalog2_subscriptions` DROP COLUMN `first_charge_json`, DROP COLUMN `implementation_amount`, DROP COLUMN `implementation_charged_at`, DROP COLUMN `implementation_reason`, DROP COLUMN `renewal_components_json`;
ALTER TABLE `project_dependency_rules` DROP COLUMN `release_reason`, DROP COLUMN `released_by_user_id`, DROP COLUMN `released_manually_at`;
ALTER TABLE `project_products` DROP COLUMN `first_charge_snapshot`, DROP COLUMN `implementation_price_snapshot`, DROP COLUMN `recurring_price_snapshot`;
ALTER TABLE `project_task_deliverables` DROP COLUMN `version`;
-- 4) remover o registro da migração: DELETE FROM `_prisma_migrations` WHERE migration_name = '20260930160000_universal_structure_v2';

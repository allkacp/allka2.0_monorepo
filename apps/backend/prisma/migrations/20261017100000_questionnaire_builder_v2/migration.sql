-- Construtor universal de questionários (aditivo; nada é apagado nem reescrito).
ALTER TABLE `catalog2_questionnaires`
  ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `source_questionnaire_id` VARCHAR(191) NULL,
  ADD COLUMN `sections_json` TEXT NULL,
  ADD COLUMN `is_global_model` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `catalog2_questionnaire_questions`
  ADD COLUMN `settings_json` TEXT NULL;

CREATE TABLE `task_briefing_files` (
  `id` VARCHAR(191) NOT NULL,
  `project_task_id` VARCHAR(191) NOT NULL,
  `question_key` VARCHAR(120) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(120) NOT NULL,
  `mime_type` VARCHAR(120) NOT NULL,
  `detected_kind` VARCHAR(30) NOT NULL,
  `size_bytes` INTEGER NOT NULL,
  `description` TEXT NULL,
  `uploaded_by_user_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `task_briefing_files_project_task_id_question_key_idx`(`project_task_id`, `question_key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

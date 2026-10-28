-- Número sequencial e sem buracos das tarefas do catálogo (Tarefa ID 01, 02, 03…). O id interno continua existindo, mas pula.
ALTER TABLE `catalog2_task_models` ADD COLUMN `number` INTEGER NULL;
UPDATE `catalog2_task_models` t
JOIN (SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS rn FROM `catalog2_task_models`) r ON r.`id` = t.`id`
SET t.`number` = r.rn;
CREATE UNIQUE INDEX `catalog2_task_models_number_key` ON `catalog2_task_models`(`number`);

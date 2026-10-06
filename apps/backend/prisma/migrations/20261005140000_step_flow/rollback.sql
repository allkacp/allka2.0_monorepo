ALTER TABLE `project_task_stages` DROP COLUMN `depende_de_json`, DROP COLUMN `herdar_executor_de`;
ALTER TABLE `catalog2_task_steps` DROP COLUMN `depends_on_json`, DROP COLUMN `executor_policy`, DROP COLUMN `executor_same_as_key`;

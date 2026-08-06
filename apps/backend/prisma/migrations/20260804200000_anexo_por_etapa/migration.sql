-- Anexo vinculado à etapa, não só à tarefa.
--
-- `ProjectTaskStage.exige_anexo` obriga a entrega de arquivo para concluir a
-- etapa, mas a checagem só conseguia contar anexos da TAREFA — numa tarefa de
-- três etapas, o arquivo entregue na primeira satisfazia a exigência da
-- terceira, e a regra virava decorativa.
--
-- Nulo mantém o comportamento atual (anexo da tarefa como um todo: briefing,
-- referências); preenchido, o arquivo é a entrega daquela etapa específica.

ALTER TABLE `task_attachments`
  ADD COLUMN `project_task_stage_id` VARCHAR(191) NULL;

CREATE INDEX `task_attachments_stage_idx` ON `task_attachments`(`project_task_stage_id`);

ALTER TABLE `task_attachments`
  ADD CONSTRAINT `task_attachments_stage_fkey`
  FOREIGN KEY (`project_task_stage_id`) REFERENCES `project_task_stages`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

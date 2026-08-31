-- Alerta endereçado a uma pessoa.
--
-- SystemAlert nasceu como mural global ("nômade não encontrado", "tarefa
-- atrasada") — servia para o Admin olhar, não para avisar alguém. Com o motor
-- de etapas isso passou a fazer falta: quando uma etapa abre, quem vai executar
-- precisa saber, e não existia para quem endereçar.
--
-- `user_id` nulo mantém o comportamento antigo (alerta geral, visível ao
-- Admin); preenchido, o alerta é de uma pessoa só.

ALTER TABLE `system_alerts`
  ADD COLUMN `user_id`    VARCHAR(191) NULL,
  ADD COLUMN `action_url` VARCHAR(500) NULL;

CREATE INDEX `system_alerts_user_id_idx` ON `system_alerts`(`user_id`, `is_read`);

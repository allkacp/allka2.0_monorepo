-- Aprovação em dois níveis: agência aprova, depois o cliente.
--
-- Até aqui a tarefa ia direto de "executor concluiu" para CONCLUIDA — ninguém
-- aprovava nada. A plataforma antiga tinha os dois aceites separados
-- (APROVAÇÃO PENDENTE - AGÊNCIA / - CLIENTE) e é isso que fecha o ciclo de
-- entrega: quem contratou confere antes de a tarefa virar histórico.
--
-- Reprovação devolve a tarefa para execução registrando quem reprovou e por
-- quê — o motivo é o que o executor lê para corrigir.

ALTER TABLE `project_tasks`
  ADD COLUMN `aprovado_agencia_em`   DATETIME(3)  NULL,
  ADD COLUMN `aprovado_agencia_por`  VARCHAR(191) NULL,
  ADD COLUMN `aprovado_cliente_em`   DATETIME(3)  NULL,
  ADD COLUMN `aprovado_cliente_por`  VARCHAR(191) NULL,
  -- Última reprovação: quem, quando, por quê e em qual nível.
  ADD COLUMN `reprovado_em`          DATETIME(3)  NULL,
  ADD COLUMN `reprovado_por`         VARCHAR(191) NULL,
  ADD COLUMN `reprovacao_motivo`     LONGTEXT     NULL,
  ADD COLUMN `reprovacao_nivel`      VARCHAR(20)  NULL,
  -- Quantas voltas a tarefa já deu por reprovação (indicador de qualidade).
  ADD COLUMN `reprovacoes`           INT          NOT NULL DEFAULT 0,
  -- Aprovação do cliente é opcional por produto/contrato; quando falso, o
  -- aceite da agência encerra a tarefa.
  ADD COLUMN `exige_aprovacao_cliente` BOOLEAN    NOT NULL DEFAULT true;

CREATE INDEX `project_tasks_aprovacao_idx` ON `project_tasks`(`aprovado_agencia_em`, `aprovado_cliente_em`);

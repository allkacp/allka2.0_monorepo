-- Resolução AUTOMÁTICA de ocorrências de alerta de TAREFA (ata 2026-08,
-- "resolução automática de alertas de tarefa", bloco 1/2 — só
-- `task.due_soon` / `task.overdue`; etapas ficam pro bloco 2).
--
-- Campos NOVOS e DISTINTOS dos dois pares que já existiam, cuja semântica
-- fica intocada:
--   - `resolved_at` / `resolution_reason`  → motor legado de etapas + EXPIRAÇÃO
--     de ocorrência (Avulso/Programado). Continua sendo o campo da expiração.
--   - `manual_resolved_at` / `resolution_*` → resolução HUMANA formal de alerta
--     crítico (10º lote).
--
-- A resolução automática (a condição real que criou o alerta deixou de
-- existir) nunca preenche `resolved_at`/`resolution_reason`, e a expiração
-- nunca preenche `automatic_resolved_at` — é isso que impede a interface de
-- apresentar expiração como resolução automática.
ALTER TABLE `system_alerts`
  ADD COLUMN `automatic_resolved_at`        DATETIME(3) NULL,
  -- Motivo técnico padronizado (enum fechado no código, nunca texto livre):
  -- task_completed | task_cancelled | task_removed | deadline_changed_not_overdue
  -- | deadline_out_of_window | deadline_changed | superseded_by_overdue
  -- | recipient_changed | rule_disabled.
  ADD COLUMN `automatic_resolution_reason`  VARCHAR(191) NULL,
  -- Mensagem legível (pt-BR) derivada do motivo — gerada no servidor.
  ADD COLUMN `automatic_resolution_message` TEXT NULL,
  -- Fim do EPISÓDIO da condição para a combinação regra+tarefa+destinatário.
  -- O motor grava isto quando confirma que a condição terminou — mesmo que o
  -- alerta já tenha sido resolvido manualmente antes. É o marcador que:
  --   (a) impede o motor de recriar a ocorrência a cada ciclo enquanto a
  --       condição continua verdadeira após uma resolução manual;
  --   (b) libera um episódio novo quando a condição volta a acontecer.
  -- Uma ocorrência ainda "no episódio" tem `dedupe_key` preenchido; ao
  -- encerrar o episódio o motor zera `dedupe_key` e grava `condition_cleared_at`.
  ADD COLUMN `condition_cleared_at`         DATETIME(3) NULL;

CREATE INDEX `system_alerts_automatic_resolved_at_idx` ON `system_alerts`(`automatic_resolved_at`);

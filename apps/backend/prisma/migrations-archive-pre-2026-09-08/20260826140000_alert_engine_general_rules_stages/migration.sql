-- Reparo conceitual (ata 2026-08, 3º lote): regras continuam únicas e
-- gerais (nenhuma tabela nova, nenhuma regra por tarefa/etapa) — este
-- reparo apenas: (1) dá às regras uma lista configurável de categorias de
-- destinatário, em vez do resolvedor fixo do lote anterior; (2) transforma
-- a deduplicação de "checagem só na aplicação" em constraint real de banco
-- (regra+entidade+destinatário+prazo), pra proteger mesmo com mais de uma
-- instância do backend.

ALTER TABLE `alert_rules`
  ADD COLUMN `recipient_roles_json` LONGTEXT NULL;

-- Regras existentes (task.due_soon/task.overdue) mantêm exatamente o
-- comportamento de destinatário que já tinham: a categoria "responsavel"
-- reproduz a mesma cadeia de resolução (nômade → líder → agência →
-- assignee) que o motor já usava antes deste lote.
UPDATE `alert_rules` SET `recipient_roles_json` = '["responsavel"]' WHERE `recipient_roles_json` IS NULL;

ALTER TABLE `alert_rules`
  MODIFY COLUMN `recipient_roles_json` LONGTEXT NOT NULL;

-- Deduplicação vira constraint real de banco. A chave nova embute
-- destinatário e prazo (formato "ruleId:entityType:entityId:userId:data"),
-- então não colide com as chaves antigas (3 partes, sem destinatário/data)
-- de execuções já resolvidas — mas por segurança, zera a chave de tudo que
-- já foi resolvido (não precisa mais de proteção de duplicidade) antes de
-- criar o índice único.
UPDATE `system_alerts` SET `dedupe_key` = NULL WHERE `resolved_at` IS NOT NULL AND `dedupe_key` IS NOT NULL;

DROP INDEX `system_alerts_dedupe_key_idx` ON `system_alerts`;
CREATE UNIQUE INDEX `system_alerts_dedupe_key_key` ON `system_alerts`(`dedupe_key`);

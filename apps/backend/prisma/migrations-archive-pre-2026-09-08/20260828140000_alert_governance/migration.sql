-- Governança do Admin Master sobre os Padrões de Alerta (ata 2026-08,
-- bloco 2/5 — "governança e acompanhamento"). Tudo ADITIVO: colunas novas
-- em `alert_standards`, todas com default seguro, para que nenhum padrão
-- existente mude de comportamento até que o Admin Master marque
-- explicitamente `is_mandatory = 1`.
--
-- Um padrão OBRIGATÓRIO:
--   * não pode ser desativado por ninguém abaixo de Admin Master;
--   * não pode ter a criticidade reduzida abaixo de `mandatory_min_severity`;
--   * mantém o canal "dentro da plataforma" (in_app) travado para os
--     `governed_event_types_json` dele;
--   * só permite habilitar canais adicionais listados em
--     `additional_channels_json`, e apenas quando `personal_prefs_allowed = 1`.
--
-- A proteção real é no servidor (rotas /api/system-alerts/admin/* já são
-- requireAdminMaster; a camada de preferência pessoal reaplica a regra).
ALTER TABLE `alert_standards`
  ADD COLUMN `is_mandatory`               TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN `mandatory_min_severity`     VARCHAR(191) NULL,
  ADD COLUMN `platform_channel_locked`    TINYINT(1)   NOT NULL DEFAULT 1,
  ADD COLUMN `additional_channels_json`   LONGTEXT     NULL,
  ADD COLUMN `personal_prefs_allowed`     TINYINT(1)   NOT NULL DEFAULT 1,
  ADD COLUMN `governed_event_types_json`  LONGTEXT     NULL,
  ADD COLUMN `mandatory_set_by_id`        VARCHAR(191) NULL,
  ADD COLUMN `mandatory_set_at`           DATETIME(3)  NULL;

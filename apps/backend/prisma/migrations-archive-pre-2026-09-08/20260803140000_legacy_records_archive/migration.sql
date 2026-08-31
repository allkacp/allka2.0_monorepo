-- Arquivo histórico da plataforma antiga.
--
-- Tabela deliberadamente ISOLADA: nenhuma foreign key sai daqui para as tabelas
-- da plataforma, e nenhuma tabela da plataforma aponta para cá. Os vínculos são
-- guardados como ids "soltos" (projeto_legacy_id, agencia_legacy_id, ...), que
-- se resolvem por consulta, não por constraint.
--
-- O motivo é poder apagar tudo depois com um TRUNCATE, sem quebrar nada e sem
-- deixar registro órfão em lugar nenhum. É onde entra todo dado histórico que
-- não vira registro operacional da plataforma nova — hoje o financeiro, amanhã
-- o que mais for puxado do dump.
--
-- `dados` guarda a linha original inteira em JSON: o objetivo é consulta
-- histórica, então preservar o registro cru vale mais do que normalizar em
-- colunas que ninguém vai usar.

CREATE TABLE `legacy_records` (
  `id`                 VARCHAR(191) NOT NULL,
  `origem`             VARCHAR(60)  NOT NULL,
  `tabela`             VARCHAR(80)  NOT NULL,
  `legacy_id`          INT          NULL,
  `projeto_legacy_id`  INT          NULL,
  `agencia_legacy_id`  INT          NULL,
  `cliente_legacy_id`  INT          NULL,
  `nomade_legacy_id`   INT          NULL,
  `conta_legacy_id`    INT          NULL,
  `valor`              DOUBLE       NULL,
  `data`               DATETIME(3)  NULL,
  `dados`              LONGTEXT     NOT NULL,
  `created_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `legacy_records_tabela_legacy_id_key` (`tabela`, `legacy_id`),
  INDEX `legacy_records_origem_idx` (`origem`),
  INDEX `legacy_records_tabela_idx` (`tabela`),
  INDEX `legacy_records_projeto_idx` (`projeto_legacy_id`),
  INDEX `legacy_records_agencia_idx` (`agencia_legacy_id`),
  INDEX `legacy_records_nomade_idx` (`nomade_legacy_id`),
  INDEX `legacy_records_data_idx` (`data`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

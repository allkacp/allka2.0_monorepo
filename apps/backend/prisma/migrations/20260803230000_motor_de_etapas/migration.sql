-- Motor de execução por etapa.
--
-- Até aqui ProjectTaskStage era só um checklist: título, ordem e status
-- mudado na mão. Quem executa, até quando, e quanto vale ficava tudo na
-- tarefa-pai, o que impede o comportamento que o negócio já tinha na
-- plataforma antiga: etapa de Design executada por um nômade, a seguinte de
-- Programação por outro, uma terceira interna, com prazo e pagamento próprios.
--
-- Os campos abaixo são a configuração da etapa materializada no momento da
-- geração (a partir de CatalogTask.steps) + o estado de execução dela.
-- Ver docs/motor-tarefas-legado.md e src/lib/stage-engine.ts.

ALTER TABLE `project_task_stages`
  -- quem executa: nomad (marketplace) | leader (líder da área) | internal (time interno)
  ADD COLUMN `executor_type`      VARCHAR(20)  NOT NULL DEFAULT 'nomad',
  ADD COLUMN `nomade_id`          VARCHAR(191) NULL,
  ADD COLUMN `lider_id`           VARCHAR(191) NULL,
  -- especialidade exigida; pode diferir da categoria da tarefa-pai
  ADD COLUMN `categoria`          VARCHAR(120) NULL,
  -- mantém o mesmo nômade na etapa seguinte, sem passar pela fila de seleção
  ADD COLUMN `manter_mesmo_nomade` BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN `prazo_execucao`     DATETIME(3)  NULL,
  ADD COLUMN `prazo_aprovacao`    DATETIME(3)  NULL,
  ADD COLUMN `horas_execucao`     DOUBLE       NULL,
  ADD COLUMN `valor_nomade`       DOUBLE       NULL,
  -- não entra no prazo mostrado ao cliente / não soma no prazo do produto
  ADD COLUMN `oculta_no_prazo`    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN `conta_no_prazo`     BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN `exige_anexo`        BOOLEAN      NOT NULL DEFAULT false,
  -- cópia da configuração de origem, para auditoria do que valia na geração
  ADD COLUMN `config_snapshot`    LONGTEXT     NULL,
  ADD COLUMN `iniciada_em`        DATETIME(3)  NULL,
  ADD COLUMN `concluida_em`       DATETIME(3)  NULL,
  ADD COLUMN `concluida_por`      VARCHAR(191) NULL;

CREATE INDEX `project_task_stages_nomade_id_idx`  ON `project_task_stages`(`nomade_id`);
CREATE INDEX `project_task_stages_lider_id_idx`   ON `project_task_stages`(`lider_id`);
CREATE INDEX `project_task_stages_status_idx`     ON `project_task_stages`(`status`);
CREATE INDEX `project_task_stages_prazo_idx`      ON `project_task_stages`(`prazo_execucao`);

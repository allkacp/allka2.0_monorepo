-- Separa o feed único de SystemAlert em duas categorias — hoje o sino
-- (Notificações) e o triângulo flutuante (Alertas) mostravam exatamente o
-- mesmo dado, sem nenhum campo que os diferenciasse. Ver
-- routes/system-alerts.ts e components/notification-preferences-panel.tsx.
ALTER TABLE `system_alerts` ADD COLUMN `category` VARCHAR(20) NOT NULL DEFAULT 'notificacao';

-- Backfill dos alertas já existentes: os tipos que representam algo que
-- precisa de decisão (aprovação pendente, entrega reprovada) ou ação
-- operacional (líder/nômade não encontrado) viram "alerta"; o resto (etapa
-- atribuída, mensagem de admin) fica "notificacao" (já é o default).
UPDATE `system_alerts` SET `category` = 'alerta'
  WHERE `type` IN ('lider_nao_encontrado', 'nomade_nao_encontrado',
                    'aprovacao_pendente_agencia', 'aprovacao_pendente_cliente',
                    'tarefa_reprovada');

CREATE INDEX `system_alerts_user_id_category_is_read_idx` ON `system_alerts`(`user_id`, `category`, `is_read`);

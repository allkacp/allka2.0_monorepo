-- Item 8 (reuniao 2026-09-14, "Notificacoes dos produtos") -- aditiva:
-- marcadores de intencao/envio do aviso de ativacao (fan-out pra toda a
-- plataforma), gravados na mesma transacao da alteracao real de status e
-- processados por um worker resumivel/idempotente -- ver
-- lib/catalog2-notifications.ts.

-- AlterTable
ALTER TABLE `catalog2_products` ADD COLUMN `activation_notified_at` DATETIME(3) NULL,
    ADD COLUMN `activation_notify_pending_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `catalog2_products_activation_notify_pending_at_idx` ON `catalog2_products`(`activation_notify_pending_at`);

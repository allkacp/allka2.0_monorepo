-- Idempotência server-side de eventos de visualização (ata 2026-08, 9º
-- lote). client_event_id é gerado no frontend por ação intencional (uma
-- abertura do painel, um clique em "Ver origem") e protegido por índice
-- único de verdade — nunca só um useRef do lado do cliente.
ALTER TABLE `system_alert_events` ADD COLUMN `client_event_id` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `system_alert_events_client_event_id_key` ON `system_alert_events`(`client_event_id`);

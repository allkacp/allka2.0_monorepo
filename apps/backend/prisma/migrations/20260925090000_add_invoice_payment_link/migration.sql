-- Liga Invoice a Payment (fatura automática ao confirmar pagamento — ver
-- src/lib/confirm-payment.ts). payment_id nulo = fatura criada manualmente
-- pelo admin (fluxo antigo, continua existindo).
ALTER TABLE `invoices` ADD COLUMN `payment_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `invoices_payment_id_key` ON `invoices`(`payment_id`);

ALTER TABLE `invoices` ADD CONSTRAINT `invoices_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

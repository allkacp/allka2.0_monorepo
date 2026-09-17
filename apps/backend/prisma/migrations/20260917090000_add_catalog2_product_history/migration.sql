-- Item 7 (reuniao 2026-09-14, "Historico de alteracoes do produto") --
-- nova tabela de historico legivel, somada aos mecanismos ja existentes
-- (Catalog2VersionEvent / Catalog2CommercialChangeEvent) -- ver comentario
-- em prisma/schema.prisma e lib/catalog2-product-history.ts.

-- CreateTable
CREATE TABLE `catalog2_product_history_events` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `before_json` LONGTEXT NULL,
    `after_json` LONGTEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_kind` VARCHAR(191) NOT NULL DEFAULT 'user',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_product_history_events_product_id_created_at_idx`(`product_id`, `created_at`),
    INDEX `catalog2_product_history_events_product_id_event_type_idx`(`product_id`, `event_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_product_history_events` ADD CONSTRAINT `catalog2_product_history_events_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_product_history_events` ADD CONSTRAINT `catalog2_product_history_events_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

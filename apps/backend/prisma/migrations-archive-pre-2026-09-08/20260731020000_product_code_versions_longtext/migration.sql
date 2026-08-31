-- Código público sequencial do produto ("prod_1", "prod_2"...), exibido na
-- UI e usado na URL. Nullable porque produtos já existentes são
-- preenchidos depois (ver src/lib/product-code.ts).
ALTER TABLE `products` ADD COLUMN `product_code` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `products_product_code_key` ON `products`(`product_code`);

-- Resumos vindos de bases antigas passam de 500 chars; VarChar(500) ainda
-- estourava no salvamento.
ALTER TABLE `products` MODIFY `short_description` LONGTEXT NULL;

-- Snapshot do produto tirado antes de cada salvamento, para permitir
-- reverter a uma versão anterior.
CREATE TABLE `product_versions` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `snapshot` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_versions_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `product_versions` ADD CONSTRAINT `product_versions_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

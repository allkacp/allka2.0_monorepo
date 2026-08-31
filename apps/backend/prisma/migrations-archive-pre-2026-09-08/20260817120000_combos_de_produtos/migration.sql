-- Combos de produtos: lista nomeada de produtos já existentes que, ao ser
-- contratada, gera uma ProjectProduct por produto componente (nunca uma
-- linha própria pro combo). Combo global (admin) tem agency_id NULL; combo
-- de agência tem agency_id preenchido — primeiro uso desse padrão fora de
-- Project. Ver routes/product-bundles.ts.
CREATE TABLE `product_bundles` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` LONGTEXT NULL,
  `category` VARCHAR(191) NULL,
  `agency_id` VARCHAR(191) NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `product_bundles_agency_id_idx` ON `product_bundles`(`agency_id`);

ALTER TABLE `product_bundles`
  ADD CONSTRAINT `product_bundles_agency_id_fkey`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `product_bundle_items` (
  `id` VARCHAR(191) NOT NULL,
  `bundle_id` VARCHAR(191) NOT NULL,
  `product_id` VARCHAR(191) NOT NULL,
  `variation_id` VARCHAR(191) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `product_bundle_items_bundle_id_idx` ON `product_bundle_items`(`bundle_id`);
CREATE INDEX `product_bundle_items_product_id_idx` ON `product_bundle_items`(`product_id`);
CREATE INDEX `product_bundle_items_variation_id_idx` ON `product_bundle_items`(`variation_id`);

ALTER TABLE `product_bundle_items`
  ADD CONSTRAINT `product_bundle_items_bundle_id_fkey`
    FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_bundle_items_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `product_bundle_items_variation_id_fkey`
    FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Rastreio de proveniência em ProjectProduct: origin ganha o valor "COMBO"
-- (sem mudar o tipo, é String livre já). origin_bundle_purchase_id agrupa
-- as N linhas nascidas da mesma contratação de combo (não é FK pro
-- ProductBundle — é só um id gerado na hora, sobrevive mesmo se o combo
-- for editado/apagado depois, mesmo espírito de snapshot já usado nesta
-- tabela).
ALTER TABLE `project_products`
  ADD COLUMN `origin_bundle_purchase_id` VARCHAR(191) NULL,
  ADD COLUMN `origin_bundle_name_snapshot` VARCHAR(191) NULL;

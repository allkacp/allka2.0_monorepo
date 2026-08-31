-- Admin responsável da Allka por projeto (ata 2026-08: reparo "categoria
-- sem efeito" do motor de alertas) — escolhido explicitamente no projeto,
-- nunca inferido automaticamente. Coluna opcional; projetos existentes
-- ficam nulos (nenhum admin é escolhido pela migration).
ALTER TABLE `projects`
  ADD COLUMN `admin_responsible_user_id` VARCHAR(191) NULL;

CREATE INDEX `projects_admin_responsible_user_id_idx` ON `projects`(`admin_responsible_user_id`);

ALTER TABLE `projects`
  ADD CONSTRAINT `projects_admin_responsible_user_id_fkey`
  FOREIGN KEY (`admin_responsible_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

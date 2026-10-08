-- Alinha o calendário de trabalho com o schema.prisma (CI acusava divergência): a linha única passa a ter o padrão "default" também no banco. Nenhum dado muda.
ALTER TABLE `platform_work_calendar` MODIFY `id` VARCHAR(191) NOT NULL DEFAULT 'default';

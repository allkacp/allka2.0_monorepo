-- Só roda depois que a migration anterior já garantiu que todo projeto tem
-- project_code preenchido — nesta posição da cadeia, é seguro tornar a
-- coluna obrigatória.
ALTER TABLE `projects` MODIFY `project_code` VARCHAR(191) NOT NULL;

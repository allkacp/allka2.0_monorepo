-- Liga o usuário ao seu perfil de acesso.
--
-- A coluna `admin_profile_id` já existia em `users`, mas sem relação no
-- schema do Prisma e sem chave estrangeira — e, mais importante, sem nada que
-- a lesse: nenhuma rota aceitava, devolvia ou consultava esse campo. O
-- sistema de perfis (admin_profiles + admin_permissions) existia inteiro e
-- era inerte.
--
-- Limpa referências órfãs antes de criar a restrição, para o caso de algum
-- registro apontar para um perfil que não existe mais.
UPDATE `users` u
  LEFT JOIN `admin_profiles` p ON p.`id` = u.`admin_profile_id`
  SET u.`admin_profile_id` = NULL
  WHERE u.`admin_profile_id` IS NOT NULL AND p.`id` IS NULL;

CREATE INDEX `users_admin_profile_id_idx` ON `users`(`admin_profile_id`);

-- ON DELETE SET NULL: apagar um perfil não pode apagar usuários; eles apenas
-- voltam a valer só pela role.
ALTER TABLE `users`
  ADD CONSTRAINT `users_admin_profile_id_fkey`
  FOREIGN KEY (`admin_profile_id`) REFERENCES `admin_profiles`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

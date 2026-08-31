-- AddColumn: real classification of the company's commercial relationship
ALTER TABLE `companies` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'empresa';

-- Backfill: companies referred by a Partner become "parceiro"
UPDATE `companies`
SET `type` = 'parceiro'
WHERE `referred_by_partner_id` IS NOT NULL;

-- Backfill: companies with at least one project handled by a named agency
-- become "agencia" (unless already classified as "parceiro" above)
UPDATE `companies` c
SET c.`type` = 'agencia'
WHERE c.`type` = 'empresa'
  AND EXISTS (
    SELECT 1 FROM `projects` p
    WHERE p.`client_id` = c.`id`
      AND p.`agency` IS NOT NULL
      AND p.`agency` <> ''
  );

-- Everyone else keeps the default "empresa" (direct client, no agency or
-- partner referral on record). No company currently has real nomad-serviced
-- data, so no rows are set to "nomade" here.

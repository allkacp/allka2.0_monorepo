-- AddColumn (nullable first, so we can backfill existing rows)
ALTER TABLE `companies` ADD COLUMN `sequence_number` INT NULL;

-- Backfill existing companies with a sequential number ordered by their
-- original registration date, so emp_00001 is the oldest company.
SET @rn := 0;
UPDATE `companies`
JOIN (
  SELECT id, (@rn := @rn + 1) AS rn
  FROM `companies`
  ORDER BY `created_at` ASC
) AS ordered ON ordered.id = `companies`.id
SET `companies`.`sequence_number` = ordered.rn;

-- Make it required, unique, and auto-incrementing so future inserts always
-- get the next number automatically and it can never repeat.
ALTER TABLE `companies` MODIFY COLUMN `sequence_number` INT NOT NULL;
ALTER TABLE `companies` ADD UNIQUE INDEX `companies_sequence_number_key` (`sequence_number`);
ALTER TABLE `companies` MODIFY COLUMN `sequence_number` INT NOT NULL AUTO_INCREMENT;

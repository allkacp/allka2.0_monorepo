-- R21-04/05/11/19 (aditivo; nada é apagado nem reescrito).
ALTER TABLE `catalog2_product_versions`
  ADD COLUMN `emergency_mode` VARCHAR(10) NOT NULL DEFAULT 'step',
  ADD COLUMN `emergency_product_reduction_percent` INTEGER NULL,
  ADD COLUMN `emergency_product_extra_percent` DOUBLE NULL,
  ADD COLUMN `emergency_same_day_limit_time` VARCHAR(5) NULL,
  ADD COLUMN `emergency_min_notice_hours` INTEGER NULL,
  ADD COLUMN `emergency_executor_accept_required` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `emergency_executor_accept_hours` INTEGER NULL;
ALTER TABLE `catalog2_addons`
  ADD COLUMN `contract_phase` VARCHAR(10) NOT NULL DEFAULT 'before';

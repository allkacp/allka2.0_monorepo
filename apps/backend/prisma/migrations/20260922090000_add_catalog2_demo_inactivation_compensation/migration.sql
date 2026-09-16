-- Item 16.1 (reunião 2026-09-14, "Desconto por inativação") — percentual
-- DEMONSTRATIVO de compensação por inativação programada, editável no
-- painel, usado só para simulação. Nunca gera crédito/estorno real — a
-- base definitiva e o tratamento do já entregue continuam sem definição
-- (Item 5).
ALTER TABLE `catalog2_pricing_settings` ADD COLUMN `demo_inactivation_compensation_note` TEXT NULL,
    ADD COLUMN `demo_inactivation_compensation_percent` DOUBLE NULL,
    ADD COLUMN `demo_inactivation_is_provisional` BOOLEAN NOT NULL DEFAULT true;

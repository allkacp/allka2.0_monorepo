-- Custo do qualificador: percentual padrão de 20% sobre o custo da etapa (ainda configurável em Precificação e por tarefa).
-- Só preenche onde estava vazio; qualquer valor já definido é mantido.
UPDATE `catalog2_pricing_settings` SET `human_review_percent` = 20 WHERE `human_review_percent` IS NULL;

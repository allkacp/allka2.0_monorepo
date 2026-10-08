-- P-12 (08/10): sai a camada de dados provisórios. Não existe mais produto do catálogo antigo; o preço vem só da precificação cadastrada.
-- Removidas: pré-visualização provisória, resolução de pendências da importação antiga e configurações de simulação de preço.
-- (Estavam vazias ou só com o registro padrão; backup em backups/p12-remocao-*/tabelas-removidas.sql)
DROP TABLE IF EXISTS `catalog2_provisional_previews`;
DROP TABLE IF EXISTS `catalog2_review_resolutions`;
DROP TABLE IF EXISTS `catalog2_pricing_simulation_settings`;
DROP TABLE IF EXISTS `catalog2_pricing_simulation_specialty_rates`;

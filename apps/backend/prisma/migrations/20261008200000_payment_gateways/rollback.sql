-- Desfaz 20261008200000: apaga as tabelas novas (chaves de gateway e recargas em andamento são perdidas; o saldo das carteiras NÃO muda).
DROP TABLE IF EXISTS `wallet_topup_intents`;
DROP TABLE IF EXISTS `payment_gateway_changes`;
DROP TABLE IF EXISTS `payment_gateway_configs`;

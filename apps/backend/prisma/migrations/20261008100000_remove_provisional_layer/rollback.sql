-- Desfaz 20261008100000: recria as 4 tabelas (estrutura e dados do backup feito antes da remoção).
DROP TABLE IF EXISTS `catalog2_provisional_previews`;
CREATE TABLE `catalog2_provisional_previews` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_provisional` tinyint(1) NOT NULL DEFAULT '1',
  `needs_review` tinyint(1) NOT NULL DEFAULT '1',
  `image_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_source_note` text COLLATE utf8mb4_unicode_ci,
  `price_amount` double DEFAULT NULL,
  `deadline_days` int DEFAULT NULL,
  `modality` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contract_note` text COLLATE utf8mb4_unicode_ci,
  `highlights_json` text COLLATE utf8mb4_unicode_ci,
  `included_items_json` text COLLATE utf8mb4_unicode_ci,
  `options_json` text COLLATE utf8mb4_unicode_ci,
  `portfolio_refs_json` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by_user_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `catalog2_provisional_previews_product_id_key` (`product_id`),
  CONSTRAINT `catalog2_provisional_previews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
LOCK TABLES `catalog2_provisional_previews` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `catalog2_review_resolutions`;
CREATE TABLE `catalog2_review_resolutions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `origin_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pendency_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decision` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_divergence_json` text COLLATE utf8mb4_unicode_ci,
  `resolved_by_user_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolved_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `catalog2_review_resolutions_origin_id_idx` (`origin_id`),
  CONSTRAINT `catalog2_review_resolutions_origin_id_fkey` FOREIGN KEY (`origin_id`) REFERENCES `catalog2_product_import_origins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
LOCK TABLES `catalog2_review_resolutions` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `catalog2_pricing_simulation_settings`;
CREATE TABLE `catalog2_pricing_simulation_settings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default',
  `tax_percent` double DEFAULT NULL,
  `commission_percent` double DEFAULT NULL,
  `operational_fee_percent` double DEFAULT NULL,
  `profit_margin_percent` double DEFAULT NULL,
  `human_review_percent` double DEFAULT NULL,
  `component_order_json` text COLLATE utf8mb4_unicode_ci,
  `is_provisional` tinyint(1) NOT NULL DEFAULT '1',
  `source` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'provisional_simulation_v1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
LOCK TABLES `catalog2_pricing_simulation_settings` WRITE;
INSERT INTO `catalog2_pricing_simulation_settings` VALUES ('default',6,10,5,25,12,'[\"tax\",\"commission\",\"operational\",\"margin\"]',1,'provisional_simulation_v1','Valores PROVISÓRIOS para teste (reunião 10/09) — nunca é configuração comercial aprovada. Impostos/comissão/taxa operacional na mesma ordem de grandeza do singleton real; margem (25%) e revisão humana (12%) deliberadamente diferentes da configuração real (30%/15%) para nunca serem confundidas com ela.','2026-09-12 22:20:08.492','2026-09-12 22:20:08.492');
UNLOCK TABLES;
DROP TABLE IF EXISTS `catalog2_pricing_simulation_specialty_rates`;
CREATE TABLE `catalog2_pricing_simulation_specialty_rates` (
  `specialty_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hourly_rate` double NOT NULL,
  `is_provisional` tinyint(1) NOT NULL DEFAULT '1',
  `source` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'provisional_simulation_v1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`specialty_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
LOCK TABLES `catalog2_pricing_simulation_specialty_rates` WRITE;
INSERT INTO `catalog2_pricing_simulation_specialty_rates` VALUES ('cmtd415l9000e171x591kizme',120,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Gestor de Tráfego; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.500','2026-09-12 22:28:17.500'),('cmtd415lm000f171xaltzcr2d',120,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Desenvolvedor Web; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.511','2026-09-12 22:28:17.511'),('cmtd415lw000g171xveut1g3w',100,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Especialista em SEO/GEO; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.520','2026-09-12 22:28:17.520'),('cmtd415m5000h171xot43110q',70,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Redator; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.528','2026-09-12 22:28:17.528'),('cmtd415mf000i171xc8bncu3w',90,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Designer; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.535','2026-09-12 22:28:17.535'),('cmtd415mo000j171xrrryhl7m',90,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Editor de Vídeo; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.543','2026-09-12 22:28:17.543'),('cmtd415mz000k171xfakk98ns',120,1,'provisional_simulation_v1','Valor/hora PROVISÓRIO para simulação administrativa de Especialista em Automação; nunca é tarifa comercial aprovada.','2026-09-12 22:28:17.550','2026-09-12 22:28:17.550');
UNLOCK TABLES;

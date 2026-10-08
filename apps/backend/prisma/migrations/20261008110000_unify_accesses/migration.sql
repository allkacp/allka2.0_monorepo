-- P-12 (08/10): os acessos do produto passam a ter UM cadastro só (as exigências de conexão do módulo "Conexões e acessos").
-- 1) Preserva o que existir na lista antiga: cada acesso com tipo conhecido vira uma exigência de conexão (obrigatória/opcional) na mesma versão.
INSERT INTO `catalog2_connection_requirements` (`id`, `version_id`, `connection_type_id`, `key`, `label`, `obligation`, `instructions`, `sort_order`, `created_at`, `updated_at`)
SELECT UUID(), a.`version_id`, ct.`id`, CONCAT('legado_', a.`access_type`, '_', a.`sort_order`), a.`label`, IF(a.`is_required`, 'required', 'optional'), a.`notes`, a.`sort_order`, NOW(3), NOW(3)
FROM `catalog2_version_accesses` a
JOIN `connection_types` ct ON ct.`key` = CASE a.`access_type`
  WHEN 'google_ads' THEN 'google_ads'
  WHEN 'meta_business_manager' THEN 'meta_business_manager'
  WHEN 'ad_account' THEN 'meta_ad_account'
  WHEN 'pixel_capi' THEN 'pixel_capi'
  WHEN 'google_analytics' THEN 'google_analytics_4'
  WHEN 'google_tag_manager' THEN 'google_tag_manager'
  WHEN 'crm' THEN 'crm'
  WHEN 'site_landing' THEN 'site_landing'
  WHEN 'other' THEN 'other'
  ELSE NULL END
WHERE NOT EXISTS (SELECT 1 FROM `catalog2_connection_requirements` r WHERE r.`version_id` = a.`version_id` AND r.`connection_type_id` = ct.`id`);
-- 2) Remove a lista antiga.
DROP TABLE IF EXISTS `catalog2_version_accesses`;

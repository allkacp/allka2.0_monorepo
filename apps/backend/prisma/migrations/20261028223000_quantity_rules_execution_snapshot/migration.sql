ALTER TABLE catalog2_product_versions ADD COLUMN quantity_rules_json TEXT NULL;
ALTER TABLE catalog2_quotes ADD COLUMN execution_snapshot_json LONGTEXT NULL;

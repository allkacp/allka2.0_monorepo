# 1. Backup e restauração (antes do módulo de Conexões)
- Arquivo: `backups/conexoes-20261001-1214/allka-local-COMPLETO-antes.sql.gz` — 210.012 bytes — SHA-256 `594715f6419b1975829282fd8c0d87a99c846f231dae9f7d4462a6ab33fecca9` — gerado em 2026-10-01 12:14:12
- Base temporária: `allka_restore_check_conexoes`; restauração 12:14:23 → 12:14:35; 200 tabelas
- Contagem exata linha a linha de todas as 200 tabelas (base principal × restaurada): IDÊNTICAS (`contagens-antes.txt` × `contagens-restaurado.txt`)
- Hashes funcionais dos 36 produtos/V1/modelos/cadastros globais: 27 checagens aprovadas (`antes/integridade-36-produtos.md`)
- Comando: `gunzip -c backups/conexoes-20261001-1214/allka-local-COMPLETO-antes.sql.gz | docker exec -i allka-2026-mysql-1 mysql -uroot -p*** allka_restore_check_conexoes`
- Remoção: `DROP DATABASE allka_restore_check_conexoes`; bases `allka_restore%` restantes: 0

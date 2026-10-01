# 1. Restauração do backup em base descartável
- Arquivo: `backups/estrutura-universal-20260930-1814/allka-local-COMPLETO-antes.sql.gz` — 208.709 bytes — SHA-256 `86b6a809b4f0833c1f6ee8ff84ad81db66c66c325100a42402db48d9db2eeabf` — gerado em 2026-09-30 18:14
- Base temporária: `allka_restore_check_20261001` (mesmo servidor MySQL local, base principal `allka` só lida, nunca escrita)
- Restauração: 2026-10-01 08:27:21 → 2026-10-01 08:27:31; tabelas restauradas: 197
- Contagens por tabela × `contagens-antes.txt`: IDENTICAS (197 tabelas)
- Comando exato: `gunzip -c backups/estrutura-universal-20260930-1814/allka-local-COMPLETO-antes.sql.gz | docker exec -i allka-2026-mysql-1 mysql -uroot -p*** allka_restore_check_20261001`
- Remoção: `DROP DATABASE allka_restore_check_20261001`; bases `allka_restore%` restantes: 0

## Hash funcional (restaurado × principal atual; group_concat_max_len ampliado)
```
task_models n=107 restaurado=19797e6055e1c26b07d35a9df37ce9cf atual=19797e6055e1c26b07d35a9df37ce9cf IGUAL
step_models n=109 restaurado=569757d54ad0e904866870d6b559c373 atual=569757d54ad0e904866870d6b559c373 IGUAL
especialidades n=8 restaurado=a78883803095d77f51af8b9e1115c28d atual=a78883803095d77f51af8b9e1115c28d IGUAL
pilares n=5 restaurado=56acabafde60159e9c8bd674bb9599fc atual=56acabafde60159e9c8bd674bb9599fc IGUAL
categorias n=5 restaurado=355a269bc436dc38a2e814e0db91174c atual=355a269bc436dc38a2e814e0db91174c IGUAL
4F n=4 restaurado=c43de1bb10486ffa8f06c84428ab654f atual=c43de1bb10486ffa8f06c84428ab654f IGUAL
questionarios n=2 restaurado=197b09c7a326b0d62075e480167db6b2 atual=197b09c7a326b0d62075e480167db6b2 IGUAL
precificacao n=1 restaurado=a0302916df2f9433ba4f0e23322736b9 atual=a0302916df2f9433ba4f0e23322736b9 IGUAL
produtos n=36 restaurado=2c421bdf1a4b219a023b46f14db854a8 atual=2c421bdf1a4b219a023b46f14db854a8 IGUAL
v1 n=36 restaurado=ab3150908b2c2eb33275d583a3aba7b8 atual=ab3150908b2c2eb33275d583a3aba7b8 IGUAL
```

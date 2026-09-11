# CLI do Snapshot Histórico do Legado — orquestrador dos 6 domínios

Comando permanente que cobre os 6 domínios do Snapshot Histórico Oficial
(`allka_legacy`): produtos, identidade e organizações, projetos e execução,
financeiro, alertas/notificações/chat, e campanhas/cupons/destinatários.

Antes deste comando, só produtos tinha CLI (`npm run import:legacy-snapshot`,
que **continua funcionando exatamente como antes** — cobre só produtos, sem
`--domain`). Os outros 5 domínios só eram acionáveis por código
(`runImport({ collectors: [...] })`, usado nos testes de integração). Este
comando novo reusa **diretamente** `runImport()` e os 6 coletores reais —
nenhuma lógica de coleta, sanitização, reconciliação, checksum ou selagem foi
duplicada.

Implementação: `apps/backend/src/legacy/snapshot-orchestrator.ts` (lógica) +
`apps/backend/src/scripts/legacy-snapshot.ts` (CLI).

## Sintaxe

```bash
cd apps/backend
npm run legacy:snapshot -- --domain=<dominio|all> [opções]
```

### Domínios aceitos (`--domain=`)

| Valor | Domínio |
|---|---|
| `products` | produtos |
| `identity-organizations` | identidade e organizações |
| `project-execution` | projetos e execução |
| `financial` | financeiro |
| `alerts-notifications-chat` | alertas, notificações e chat |
| `campaigns` | campanhas, cupons e destinatários |
| `orphan-catalog-tasks` | **complementar** — tarefas de catálogo sem vínculo de produto (achado na auditoria pós-snapshot de 2026-09-11) |
| `all` | os 6 canônicos, nesta ordem fixa, sequencial |

Qualquer outro valor é recusado **antes de tocar em qualquer banco**.

### `orphan-catalog-tasks` — domínio complementar, fora de `all`

Achado real: 83 `CatalogTask` (de 335) sem nenhum vínculo em
`product_catalog_tasks` — o coletor de produtos só alcança tarefas de
catálogo via `Product → ProductCatalogTask → CatalogTask`, então essas 83
nunca eram copiadas. Todas têm `legacy_id` preenchido (vieram do import
histórico real) e ao menos uma é referenciada de verdade por
`ProjectTask.catalog_task_id`. Coletor:
`src/legacy/collect-orphan-catalog-tasks.ts` — detecta por filtro
relacional (`product_links: { none: {} }`), nunca por lista fixa de ids;
se uma tarefa ganhar vínculo de produto depois, ela sai do filtro
automaticamente na próxima coleta.

**Deliberadamente fora de `--domain=all`**: é um bloco de correção
pontual, não um 7º domínio operacional permanente — incluí-lo em `all`
mudaria silenciosamente o que "todos os domínios" significa (documentado
em toda a base como "os 6 domínios") e o tempo esperado de toda execução
futura, mesmo nas execuções em que ele não encontra mais nada. Seleção
sempre explícita: `npm run legacy:snapshot -- --domain=orphan-catalog-tasks`.

## Dry-run é o padrão seguro

Sem mais nenhuma flag, o comando **sempre** roda em dry-run — não escreve
nada, nem no operacional nem no Legado:

```bash
npm run legacy:snapshot -- --domain=products
npm run legacy:snapshot -- --domain=all
npm run legacy:snapshot -- --domain=all --json
```

## Modo oficial — exige TUDO isto ao mesmo tempo

Nenhuma flag isolada habilita escrita. Uma grafia errada, flag ausente ou
frase de confirmação incorreta recusa **antes da primeira escrita**:

```bash
npm run legacy:snapshot -- --domain=<dominio|all> \
  --kind=official \
  --confirm-official \
  --confirm-phrase="EU CONFIRMO A GRAVACAO PERMANENTE DO SNAPSHOT HISTORICO OFICIAL" \
  --source-name="Plataforma allka — produção" \
  --source-env=producao \
  --snapshot-at=2026-09-10T00:00:00Z \
  --backup-manifest=/caminho/para/MANIFESTO_xxx.md
```

Condições exigidas juntas:
- `--kind=official`
- `--confirm-official`
- `--confirm-phrase` **exatamente igual** a `EU CONFIRMO A GRAVACAO PERMANENTE DO SNAPSHOT HISTORICO OFICIAL` (comparação exata, sem normalização)
- `--source-env` explícito e diferente de `local`
- `--source-name` explícito
- `--snapshot-at` explícito (ISO 8601) — com `--domain=all`, o **mesmo** valor vale para os 6 domínios (nunca 6 horários diferentes)
- `--backup-manifest=<caminho>` apontando para um manifesto válido (ver abaixo)
- `LEGACY_IMPORT_DATABASE_URL` com credencial de escrita

Antes de escrever, o comando roda uma **pré-verificação** (conexão com
origem e Legado, migrations do Legado em dia, tabelas esperadas presentes,
permissão de escrita confirmada por transação revertida, tamanho atual do
Legado — informativo, não verifica espaço livre em disco do host/volume — e
validação do manifesto de backup). Qualquer problema recusa antes de
escrever.

## Proteção de ambiente

- `--source-env=producao` (ou variações de "produção"/"production") é
  **recusado** se a origem (`DATABASE_URL`) apontar para um host que parece
  local (`localhost`, `127.0.0.1`, `::1`, ou `mysql` — nome do serviço no
  docker-compose local) — a menos que você repita com
  `--acknowledge-environment-mismatch` (ex.: auditoria de um dump de
  produção restaurado localmente). Nunca inferido silenciosamente.
- Origem (`DATABASE_URL`) e destino (`LEGACY_IMPORT_DATABASE_URL`) nunca
  podem apontar para o mesmo host+porta+banco.
- O banco operacional e o Legado nunca podem ter o **mesmo nome**, mesmo em
  hosts diferentes.
- URLs e senhas nunca aparecem na saída — só a forma redigida
  (`mysql://usuario:***@host/banco`).

## Concorrência

Uma trava nomeada do próprio MySQL (`GET_LOCK`/`RELEASE_LOCK`, não um
arquivo local) protege cada par (domínio, nome do lote): só uma execução
**oficial** pode gravar/validar um lote lógico por vez — a segunda é
recusada. Em dry-run, a trava é checada mas **nunca bloqueia** — se detectada
concorrência, o resumo só informa (`concurrency_detected: true`).

## Manifesto de backup

O modo oficial exige `--backup-manifest=<caminho>` apontando para um arquivo
Markdown no mesmo formato gerado pelo processo de backup verificável
(seção "## Arquivo N" com `Nome do arquivo`, `Banco de origem`, `Tamanho`,
`SHA-256`). O comando valida, para cada entrada:
- o arquivo existe e tem tamanho > 0;
- o tamanho bate com o manifesto;
- o SHA-256 recalculado bate com o manifesto.

Um manifesto ausente, adulterado ou com hash/tamanho divergente recusa o
modo oficial. `--backup-dir=<caminho>` pode apontar os dumps para um
diretório diferente do manifesto, se necessário.

## Falha parcial em `--domain=all`

Sequencial, na ordem fixa da tabela acima. Se um domínio falhar:
- os seguintes **não começam**;
- exit code diferente de zero;
- o resumo mostra, para cada domínio, um destes: concluído, falho, ou não
  iniciado.

Lotes já concluídos/selados **não são desfeitos automaticamente**. Para
retomar: rode de novo escolhendo só o domínio pendente (ou `all` — os
domínios já selados apenas validam de forma idempotente, nunca regravam).

## Saída

Legível por padrão; `--json` para auditoria. Nenhuma das duas formas
imprime conteúdo de registro nem segredo — só contadores, status, IDs de
lote e mensagens de erro (redigidas).

## Compatibilidade

`npm run import:legacy-snapshot` continua funcionando exatamente como
antes — cobre só o domínio de produtos, sem `--domain`. Não foi alterado
neste bloco. Para os outros 5 domínios (e para `--domain=all`), use
`npm run legacy:snapshot`.

## Proibições (por desenho, não apenas por documentação)

Este comando **não** implementa:
- limpeza ou desativação de registros;
- cutover;
- qualquer forma de "aplicar tudo de uma vez sem confirmação";
- rollback destrutivo automático de lotes já selados.

Nenhuma dessas operações tem flag — não existe `--cleanup`, `--cutover`,
`--purge` nem equivalente.

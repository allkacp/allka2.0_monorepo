# Importação da plataforma antiga — o que veio, onde está, como apagar

Documento de referência da migração do sistema antigo (dump `Dump20260423.sql`,
2,9 GB, 152 tabelas) para a plataforma nova. Estado em **2026-08-03**.

Tudo descrito aqui está **apenas no ambiente local** — nada foi commitado nem
enviado para produção.

> **Se a pergunta for "como apago isso?"** → vá direto para a seção
> [Como apagar](#como-apagar). O caminho é um script só, com simulação por
> padrão, e o desenho do banco garante que nada quebra.

---

## 1. As duas naturezas do dado importado

Esta é a distinção que explica todo o resto.

### a) Dado **operacional** — virou registro da plataforma

Usuários, agências, empresas, clientes, nômades, produtos, modelos de tarefa,
projetos, tarefas, etapas e briefings entraram nas tabelas normais da
plataforma e funcionam como qualquer registro nativo. Um projeto importado é um
`Project`; uma tarefa importada é uma `ProjectTask`.

O que os distingue do nativo é uma única coluna: **`legacy_id`**, com o id
numérico da linha equivalente no sistema antigo. Nativo tem `legacy_id = NULL`.

### b) Dado **histórico** — vive num arquivo isolado

O financeiro (faturamento, carteira, repasses) **não** virou `Invoice`,
`Payment` nem `WalletTransaction`. Foi para a tabela **`legacy_records`**, que
existe fora do modelo operacional:

- nenhuma foreign key sai dela para as tabelas da plataforma;
- nenhuma tabela da plataforma aponta para ela;
- os vínculos são ids soltos (`projeto_legacy_id`, `agencia_legacy_id`,
  `nomade_legacy_id`, `cliente_legacy_id`, `conta_legacy_id`), resolvidos por
  consulta;
- a linha original do dump fica inteira em `dados` (JSON), mais `valor` e
  `data` em colunas indexadas.

**É de propósito.** Foi desenhada assim para que apagar o histórico seja um
`DELETE` sem consequência — e é o destino de qualquer bloco futuro que a gente
puxe do dump e não queira misturar com a operação.

---

## 2. O que está lá hoje

### Operacional

| Entidade | Total | Importados | Faixa de id antigo |
|---|---|---|---|
| Usuários | 817 | 809 | #1 … #1224 |
| Agências | 100 | 98 | #1 … #411 |
| Empresas | 4 | 3 | #158 … #403 |
| Clientes | 1.236 | 1.233 | #2 … #1268 |
| Nômades | 397 | 396 | #4 … #805 |
| Produtos | 149 | 76 (+73 consolidados do catálogo) | #2 … #1335 |
| Modelos de tarefa | 335 | 330 | — |
| Projetos | 738 | 737 | #15 … #1946 |
| Produtos de projeto | 1.372 | — (ver nota) | — |
| Tarefas | 3.586 | 3.586 | #1 … #22225 |
| Etapas de tarefa | 5.031 | todas | — |
| Respostas de briefing | 38.458 | todas | — |

**71 dos 73 produtos do catálogo ativo são contratáveis.** Os 2 restantes
apontam para modelos que já estavam desativados na base antiga.

**Nota sobre produtos de projeto**: `project_product` é a única tabela do dump
sem id próprio (usa chave composta projeto+produto), então não há número antigo
a guardar. O rastreio dela é pelo par.

**Nota sobre produtos**: os 73 do catálogo ativo são consolidações — 142
produtos antigos viraram 73, cada faixa (5/10/20 páginas) virando uma
`ProductVariation`. Por isso o rastreio deles não é `legacy_id` (que é um só),
e sim `metadata.legacyIds`, que lista **todas** as origens. São 261 ids antigos
mapeados no total.

### Arquivo histórico (`legacy_records`) — 72.908 registros

| Tabela de origem | Linhas |
|---|---|
| billing_item | 17.840 |
| wallet_transaction | 14.242 |
| wallet_balance_release_request_item | 9.126 |
| billing | 7.427 |
| nomad_task_paid_out | 4.770 |
| billing_discount | 3.825 |
| leader_task_paid_out | 3.774 |
| project_invoice | 2.927 |
| payment_notification | 1.932 |
| wallet_transaction_credit_expiration_track | 1.563 |
| wallet_balance_release_request | 1.329 |
| project_billing_schedule | 1.317 |
| wallet_withdraw_request | 1.148 |
| wallet | 946 |
| plan_billing_history | 737 |
| nocharge_reason | 5 |

Conferência: soma de `project_invoice.billingAmount` = **R$ 3.685.129,11**.

---

## 3. Como consultar

Cenário provável: o banco antigo vira só fonte de consulta. Há três caminhos.

**Pela tela** — o número antigo aparece como pílula âmbar "ANTIGA #N" ao lado do
identificador novo em `/admin/produtos`, `/admin/usuarios`, `/admin/tarefas`,
`/admin/clientes`, `/admin/projetos` e `/admin/nomades`. Em produto consolidado
a pílula lista todas as origens.

**Pelo banco** — `legacy_id` é indexado e único em cada tabela:

```sql
SELECT * FROM projects       WHERE legacy_id = 1946;
SELECT * FROM project_tasks  WHERE legacy_id = 22225;
-- financeiro de um projeto antigo, direto no arquivo:
SELECT tabela, valor, data, dados
  FROM legacy_records
 WHERE projeto_legacy_id = 1946
 ORDER BY data;
```

**Auditoria completa**:

```bash
npx tsx src/scripts/auditar-ids-legados.ts
```
Lista, por entidade, quantos registros têm id antigo e a faixa de ids.

---

## 3.1 Acesso das pessoas importadas (primeiro acesso)

Nenhum usuário importado usa senha herdada. Todos definem a própria no primeiro
acesso, por link com token.

**Por quê**: os 809 usuários vieram com o hash bcrypt do sistema antigo, ou
seja, a senha antiga continuava valendo — inclusive para quem já tinha saído da
operação. E 238 dos 396 nômades não tinham usuário nenhum (na base antiga,
`nomad_user` cobria só 507 de 790), então não conseguiam entrar de jeito algum.

**Como funciona**

- `users.must_set_password` bloqueia o login enquanto a senha não for definida.
  A resposta é `403 FIRST_ACCESS_REQUIRED`, distinta de "credenciais inválidas":
  não é erro de quem digita, é uma etapa que falta.
- O hash guardado é um valor inutilizável (`!indisponivel:<aleatório>`), que
  nenhuma senha digitada consegue reproduzir. A senha antiga não vale mais.
- O token do link fica no banco como **hash sha256**, nunca em texto puro —
  quem lê o banco não consegue se passar por outro usuário.
- Link de uso único, validade padrão de 90 dias.

**Gerar os links** (o projeto não envia e-mail; a entrega é pela operação):

```bash
npx tsx src/scripts/preparar-primeiro-acesso.ts --apply [--validade=90] [--refazer]
```

Gera `links-primeiro-acesso-<data-hora>.csv` na raiz do repo, com
`user_code;nome;email;papel;link;expira_em`. **Um arquivo por execução** — o
nome tem carimbo de tempo de propósito: sobrescrever um nome fixo apagaria os
links dos outros usuários, e token entregue não se recupera, só se emite outro.
Os arquivos estão fora do versionamento (`links-primeiro-acesso*.csv`) e devem
ser tratados como senha.

`--refazer` emite tokens novos para todo mundo, invalidando os anteriores.

**Estado atual**: 1.044 usuários aguardando definir senha (809 importados + 235
nômades criados agora), 8 contas nativas com senha ativa e intactas.

O fluxo foi testado ponta a ponta: login bloqueado → link validado → senha
definida (com sessão já iniciada) → link recusado na segunda tentativa → login
com a senha nova.

## 4. Como apagar

Um script, dois escopos independentes, **simulação por padrão**:

```bash
cd apps/backend

# ver o que sairia (não apaga nada)
npx tsx src/scripts/remover-dados-legados.ts --arquivo
npx tsx src/scripts/remover-dados-legados.ts --operacao

# executar
npx tsx src/scripts/remover-dados-legados.ts --arquivo  --apply
npx tsx src/scripts/remover-dados-legados.ts --operacao --apply
```

### `--arquivo` — o histórico isolado

Esvazia `legacy_records` (hoje, o financeiro). **É a operação segura**: nenhuma
outra tabela depende desses registros, então não há ordem a respeitar nem
possibilidade de órfão. Pode ser feita a qualquer momento, inclusive em
produção, sem impacto em nada.

### `--operacao` — o que virou registro da plataforma

Remove tudo com `legacy_id` preenchido, na ordem de dependência (briefings →
etapas → tarefas → produtos de projeto → projetos → modelos → produtos →
vínculos → clientes → nômades → agências → empresas → usuários).

Três proteções embutidas:

1. **Conta nativa nunca é tocada.** O filtro é sempre `legacy_id != null`, e a
   importação foi ajustada para nunca gravar `legacy_id` em conta nativa —
   justamente porque isso já causou estrago uma vez (ver Armadilhas).
2. **Projeto importado que já recebeu pagamento ou fatura NOVOS é preservado** e
   reportado. Sem isso, apagar o legado arrastaria dado novo junto.
3. **Simulação por padrão.** Sem `--apply`, só imprime.

### Reverter a remoção

Todos os scripts de importação são idempotentes: rodar de novo, na ordem da
seção 5, reconstrói tudo a partir dos JSONs extraídos. O que **não** volta é
edição manual feita depois da importação.

---

## 5. Como refazer do zero

Ordem obrigatória (cada passo depende do anterior):

```bash
# ── extração: lê o dump de 2,9 GB, ~7 min cada, gera JSON em "../allka antigo/"
node scripts/extract-legacy-people.js       # cadastros-legado.json      (10 MB)
node scripts/extract-legacy-operations.js   # operacao-tarefas-legado.json (174 MB)
node scripts/extract-legacy-finance.js      # financeiro-legado.json     (34 MB)
# produtos-modelos-questionarios.json (35 MB) já existia

# ── importação (dry-run por padrão; --apply grava)
cd apps/backend
npx tsx src/scripts/import-legacy-products.ts      --apply  # catálogo 142 → 73
npx tsx src/scripts/generate-product-images.ts     --apply  # 272 SVGs de capa/portfólio
npx tsx src/scripts/import-legacy-platform.ts      --apply  # 9 fases: pessoas → projetos → tarefas
npx tsx src/scripts/consolidate-legacy-products.ts --apply  # une famílias e duplicatas
npx tsx src/scripts/migrar-agencias-para-empresas.ts --apply
npx tsx src/scripts/import-legacy-task-catalog.ts  --apply  # modelos de tarefa + vínculos
npx tsx src/scripts/import-legacy-platform.ts      --apply --fase=9  # religa tarefas aos modelos
npx tsx src/scripts/import-legacy-briefings.ts     --apply
npx tsx src/scripts/import-legacy-finance.ts       --apply  # → arquivo isolado
```

Os JSONs extraídos ficam **fora do versionamento** (`.gitignore`) — são grandes
e derivam do dump.

Migrations criadas: `20260802120000_add_legacy_tracking`,
`20260803090000_catalog_task_legacy_id`, `20260803140000_legacy_records_archive`.

---

## 6. O que ficou de fora, e por quê

| Item | Motivo |
|---|---|
| Relatórios (`*_report`, `report_queue`, dashboards) | Não funcionavam na plataforma antiga — orientação do dono do produto |
| `credit_card`, `bank_information` | Dado sensível de pagamento; cópia num arquivo histórico é risco sem contrapartida |
| Logs de integração (Bitrix24 1,4 GB, e-mail 839 MB, notificações 232 MB) | 86% do peso do dump é log descartável |
| 12.064 tarefas EXPIRADAS | 73% da operação antiga morria sem ser lançada; encheria a base de lixo. `--incluir-expiradas` traz |
| `contract*` | Veio vazia no dump — a funcionalidade nunca foi usada |
| `task_delivered_itens` (21.838) | Itens entregues não têm equivalente no modelo novo; só amostra foi extraída |
| 27.424 respostas de briefing | São de tarefas fora do escopo importado (projetos inativos/expiradas) |

---

## 6.1 O que o teste ponta a ponta encontrou (2026-08-03)

O fluxo real foi exercitado pela API — lançar uma tarefa importada e contratar
um produto importado do zero. Três defeitos apareceram, todos corrigidos:

**Prazo de lançamento herdado vencido.** As tarefas vinham com
`lancamento_expires_at` copiado do `startDeadline` antigo, que está todo no
passado (dump de 23/04). Na primeira tentativa de lançar, a tarefa era
**cancelada automaticamente**. Hoje a tarefa ainda por lançar ganha janela nova
de 30 dias na importação; as 68 existentes foram renovadas.

**Contratar uma variação gerava as tarefas de todas.** Consequência da
consolidação: "Análise de UX até 5/10/20/50 páginas" eram 4 produtos com 4
modelos de tarefa; viraram 1 produto com 4 variações, e os 4 modelos ficaram
pendurados no mesmo produto. Contratar uma faixa gerava 4 tarefas. Afetava 26
dos 73 produtos. Corrigido com `product_catalog_tasks.variation_id` (migration
`20260803210000`) + filtro em `src/lib/generate-tasks.ts`: modelo amarrado a uma
variação só nasce para aquela variação; `variation_id` nulo continua valendo
para todas, que é o certo para pacote de verdade. 110 dos 328 vínculos ficaram
amarrados a uma faixa.

**Reimportar desfazia decisão operacional.** `import-legacy-task-catalog.ts`
sobrescrevia `is_active`/`status` com o valor da base antiga, desativando de
volta os modelos que a operação tinha ativado. Agora esses dois campos são
gravados só na criação.

Depois das correções: **73 de 73 produtos contratáveis**, contratar uma variação
gera exatamente uma tarefa, e a tarefa importada percorre
`PARA_LANCAMENTO → EM_LANCAMENTO → LANCAMENTO_ENVIADO_PARA_ANALISE` com as 20
respostas de briefing gravadas.

## 6.2 Incidente: perda das tarefas em teste (2026-08-03)

Durante os testes do motor de etapas, **3.586 tarefas, 5.031 etapas e 38.458
briefings foram apagados** por um script de limpeza descartável. A causa:

```ts
await prisma.projectTask.deleteMany({ where: { project_id: projetoId } });
```

com `projetoId` **`undefined`**, porque a criação do projeto de teste tinha
falhado (409, nome repetido) e o script seguiu adiante. No Prisma, `undefined`
num filtro significa "sem filtro" — o `deleteMany` virou "apague tudo". A mesma
armadilha vale para `findFirst`, que passa a devolver um registro qualquer da
tabela em vez de nada.

**Recuperação**: total, em ~4 minutos, rodando os importadores de novo. Foi
exatamente para isso que eles são idempotentes e reproduzem tudo a partir dos
JSONs extraídos. Nada de nativo foi perdido (projetos, usuários, clientes,
produtos e o arquivo financeiro nem foram tocados).

**Como evitar** (vale para qualquer script deste repo):

- nunca passar variável possivelmente indefinida direto num `where` de
  `deleteMany`/`updateMany` — validar antes e abortar;
- em limpeza de teste, filtrar por algo que só exista no dado de teste
  (`legacy_id: null` + título), nunca só por um id capturado de resposta HTTP;
- checar o status HTTP de cada passo antes de seguir para o próximo.

**Efeito colateral do restauro**: a reimportação recriou como Agency as três
organizações que tinham virado Company (Sebrae/Brivia/Able). O importador
recebeu uma guarda: agência que já existe como empresa é pulada.

## 7. Armadilhas conhecidas

**Campo de estado de conta não é dado cadastral.** Copiar `password_hash` e
`last_login` do sistema antigo quebrou o acesso do admin duas vezes: a senha foi
sobrescrita numa reimportação, e o `last_login` antigo (dump de 23/04) disparou
a pausa por inatividade de 90 dias, cuja flag é "grudenta". Hoje o importador
trata os três como intocáveis: senha e e-mail são **create-only**, `last_login`
**nunca** é importado (fica nulo = "nunca acessou esta plataforma"), e conta
nativa que casa por e-mail não é tocada de forma alguma.

**`prisma migrate dev` não funciona neste repo.** O arquivo
`prisma/migrations/0_baseline/migration.sql` começa com BOM e o shadow database
rejeita. Corrigir o BOM invalidaria o checksum de uma migration já aplicada, e o
custo seria maior que o benefício. **Toda migration nova vai pela rota manual**:

```bash
npx prisma db execute --file prisma/migrations/<nome>/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied <nome>
npx prisma generate   # exige matar o node antes: taskkill //F //IM node.exe //T
```

**`tsx watch` não recarrega de forma confiável.** Depois de editar backend,
mate o node e suba de novo, senão a API continua servindo o código velho.

**Campo novo some em silêncio no frontend.** `product-adapter.ts` e
`project-adapter.ts` são whitelists: campo que não está nos dois sentidos é
descartado sem erro. `toClientDTO` em `routes/client-records.ts` e o `safeSelect`
em `routes/users.ts` fazem o mesmo no backend. Foi o que fez o `legacy_id` não
aparecer na tela mesmo estando gravado no banco.

**`ProjectTask.project_product_id` é cascade.** Apagar um `ProjectProduct` apaga
as tarefas dele sem avisar. Qualquer consolidação de produto precisa mover as
tarefas **antes** de remover o vínculo.

---

## 7.1 Motor de execução por etapa (implementado em 2026-08-03)

`src/lib/stage-engine.ts` executa a configuração que veio da base antiga.
Migration `20260803230000_motor_de_etapas` estendeu `ProjectTaskStage` com
executor (`nomad`/`leader`/`internal`), nômade/líder, categoria, prazos, horas,
valor, flags de prazo do produto e `config_snapshot`.

Ciclo: `BLOQUEADA → PENDENTE → AGUARDANDO_EXECUTOR → EM_ANDAMENTO → CONCLUIDA`.
Liberar a tarefa abre a primeira etapa; concluir uma etapa abre a seguinte
(herdando o nômade quando `manter_mesmo_nomade`); quando não sobra etapa
obrigatória, a tarefa vai a CONCLUIDA. Tarefa sem etapas mantém o fluxo antigo
de seleção de nômade no nível da tarefa.

Dois defeitos corrigidos no teste: as etapas nasciam todas com `ordem = 1`
(a base antiga repete o número da etapa), o que travava a sequência — a ordem
agora vem da posição no array e o motor busca "a seguinte na lista", não "a de
ordem maior"; e contratar produto consolidado sem escolher variação gerava zero
tarefas — agora assume a variação padrão e avisa.

A interface vive na aba **Etapas** de `components/tarefa-detail-drawer.tsx`:
trilha das etapas com executor (Nômade / Líder da área / Interno Allka),
continuidade de nômade (`↻ mantém nômade`), categoria, prazo, horas e valor por
etapa; concluir uma etapa mostra o que o motor fez em seguida (qual etapa
abriu, se herdou o nômade, se a tarefa encerrou).

`backfill-config-etapas.ts` preencheu a configuração nas **604 etapas em aberto**
das tarefas importadas — elas nasceram do `task_stage` antigo, sem executor nem
prazo. Casamento por posição contra o `CatalogTask.steps`; tarefa cuja contagem
de etapas não bate com o modelo é pulada (47 casos), porque preencher com a
etapa errada é pior que não preencher. Etapa concluída não é tocada: histórico
fica como foi executado.

## 7.2 Aprovação em dois níveis (2026-08-04)

Antes, o executor concluir a última etapa encerrava a tarefa — ninguém conferia
nada. Agora a entrega passa por dois aceites, como na plataforma antiga:

```
última etapa concluída → EM_APROVACAO
   ├─ agência aprova  → APROVACAO_PENDENTE_CLIENTE
   │     └─ cliente aprova → CONCLUIDA
   └─ reprova (motivo) → EM_EXECUCAO + reabre a última etapa concluída
```

Migration `20260804090000_aprovacao_dois_niveis`. Endpoints
`PATCH /api/project-tasks/:id/aprovar` e `/reprovar` (motivo obrigatório).
`exige_aprovacao_cliente = false` faz o aceite da agência encerrar a tarefa —
para produto que não tem aprovação do cliente final. Reprovar zera os aceites
anteriores (o trabalho mudou, tudo é conferido de novo) e conta em
`reprovacoes`, que é indicador de qualidade.

Interface na aba **Itens p/ Aprovação** do drawer de tarefa: quem já aceitou,
histórico de devoluções com motivo, e os botões de aprovar/devolver.

Etapa de líder deixou de travar: quando o motor abre uma etapa `leader` sem
ninguém definido, aciona `atribuirLiderParaTarefa` (a mesma atribuição por área
já usada no fluxo de tarefa).

**Testado ponta a ponta**: 3 etapas em sequência → EM_APROVACAO → reprovação
(status volta a EM_EXECUCAO, última etapa reaberta, contador em 1) → aceite da
agência → aceite do cliente → CONCLUIDA.

## 7.3 Unificação do caminho do líder (2026-08-04)

`routes/lider.ts` tinha a **própria implementação** do avanço de etapa, escrita
antes do motor e divergente dele: procurava a próxima etapa por "ordem maior"
(quebra com a ordem repetida da base antiga), ignorava a continuidade de nômade
e concluía a tarefa direto, pulando a aprovação. O líder aprovar uma etapa
produzia um resultado diferente de qualquer outro caminho. Agora chama
`concluirEtapa`.

Outros dois defeitos na mesma rota: `/reject` gravava o status
`REPROVADA_PELO_LIDER`, que **não existe** em `TASK_STATUSES` (a tarefa ficava
num estado que nenhuma tela sabia ler) — passou a usar `MELHORIAS_FINAIS`; e
`/reject` e `/return` **sobrescreviam** `observations`, apagando o histórico —
agora acrescentam com data.

**Correção de semântica no motor**: `manter_mesmo_nomade` vem de
`keepNomadOnNextStage` — a flag está na etapa que fecha e diz que a *próxima*
herda o executor. O motor lia a flag da etapa sendo aberta, o que invertia o
significado e trocava de nômade exatamente onde a continuidade era pedida.

## 7.4 Ponta final: o executor enxerga o próprio trabalho (2026-08-04)

O motor atribuía trabalho por etapa, mas quem executa não via nada disso.

**Tela do nômade** (`/nomades/minhastarefas`) rodava numa lista fixa dentro do
próprio arquivo — zero chamadas à API. Agora consome
`GET /api/nomades/me/tarefas`, que existe porque o nômade não tem acesso a
`/api/project-tasks` (o escopo nega "nomades" de propósito) e porque o trabalho
dele pode estar na etapa, não na tarefa: buscar só por `nomade_responsavel_id`
esconderia metade. Cada tarefa vem com `minhas_etapas`, `etapa_atual` e o valor
somado só das etapas dele.

`PATCH /api/nomades/me/etapas/:stageId/concluir` é como ele entrega — passa pelo
mesmo motor do admin e do líder, valida que a etapa é dele (senão qualquer
nômade concluiria a de qualquer outro) e respeita `exige_anexo`.

**Notificação**: `SystemAlert` era um mural global, sem destinatário — servia ao
Admin, não para avisar alguém. Migration `20260804160000_alerta_com_destinatario`
adicionou `user_id` e `action_url`; agora, quando uma etapa abre com executor
definido, a pessoa recebe o aviso com prazo e link. Falha ao notificar nunca
derruba a transição da etapa: o aviso é acessório, o avanço não é.

**Tela do líder** já usa o `TarefaDetailDrawer` compartilhado, que ganhou o
painel de etapas e a aba de aprovação — não precisou de tela nova.

**Regressão encontrada e corrigida**: a fase 4 do importador gravava
`user_id: null` nos nômades quando não achava o par no dump, desfazendo os 238
vínculos criados por `preparar-primeiro-acesso.ts`. Eles ficaram sem login sem
ninguém perceber. O campo saiu do `update` quando não há usuário para vincular,
e os 238 foram religados por e-mail.

## 7.5 Notificação endereçada e entrega da etapa (2026-08-04)

**Alertas passaram a respeitar o destinatário.** Todas as rotas de
`system-alerts` tratavam alerta como mural público: qualquer usuário lia, marcava
como lido e apagava o alerta de qualquer outro — e o `read-all` marcava o mural
inteiro da plataforma. Um helper de escopo entrou em todas elas: Admin vê os
gerais (`user_id` nulo) + os seus; os demais, só os seus. Nas mutações,
`findFirst` com escopo em vez de `findUnique`, para alerta alheio responder
"não encontrado" em vez de ser alterado.

**Entrega da etapa.** `exige_anexo` bloqueava a conclusão, mas o nômade não
tinha por onde anexar — beco sem saída. Rotas novas em `nomades.ts`
(`GET/POST/DELETE /me/etapas/:stageId/entregas`) e a interface na tela dele. A
plataforma não guarda binário: a entrega é registrada como link (Drive, Figma,
WeTransfer), mesmo padrão do resto do sistema.

**Defeito corrigido junto**: a checagem de `exige_anexo` contava anexos da
TAREFA, então numa tarefa de três etapas o arquivo entregue na primeira liberava
a terceira. Migration `20260804200000_anexo_por_etapa` adicionou
`task_attachments.project_task_stage_id`, e a contagem passou a ser por etapa.

## 8. O que ainda não foi feito
- **3.529 tarefas com flag "modelo antigo"** — corretas assim, foram executadas
  no fluxo antigo. As 53 que ainda não tinham sido lançadas foram adaptadas.
- **68 produtos com imagem de preenchimento** (SVG gerado), aguardando material
  real. Marcados com `metadata._imagesPlaceholder` para troca em lote.
- **7 produtos "squad"** inativos, aguardando decisão de exclusão. Seguram 1.145
  tarefas.
- **Agências não têm tela em `/admin`**, então o id antigo delas não aparece na
  interface (está no banco e na API).

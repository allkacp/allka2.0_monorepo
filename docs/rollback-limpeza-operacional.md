# Plano de rollback da futura limpeza operacional

Documento operacional. **Não contém nenhum comando destrutivo pronto para
execução** — a limpeza em si ainda não foi construída nem autorizada. Este
plano cobre o QUE fazer antes, durante e em caso de reversão, para quando a
limpeza for autorizada separadamente.

Ver também `docs/legacy-snapshot-cli.md` (mecanismo de snapshot, já
implementado e testado) — este documento cobre a etapa POSTERIOR (a
limpeza do operacional em si), que ainda não existe como ferramenta.

## Antes da limpeza (checklist obrigatório)

1. **Confirmar todos os backups existentes** — recalcular SHA-256 de cada
   dump (`allka_...sql`, `allka_legacy_...sql`, `allka_legacy_post_snapshot_...sql`)
   e comparar com o manifesto correspondente. Qualquer divergência para
   tudo antes de continuar.
2. **Criar um novo backup operacional imediatamente anterior à limpeza** —
   dump completo de `allka` (estrutura+dados+triggers/routines/events se
   existirem, `--single-transaction`, `utf8mb4`), nome com data/hora/
   identificador único, manifesto próprio (mesmo formato já usado).
3. **Hash e restore obrigatórios** — recalcular SHA-256 do novo backup e
   **restaurá-lo de fato** num banco descartável (`allka_restore_test_*`)
   antes de seguir, exatamente como já feito para os backups anteriores
   nesta sessão. Comparar contagens/tabelas/FKs/índices origem×restaurado.
4. **Janela de manutenção** — parar o backend local (ou o serviço
   equivalente no ambiente de destino), manter o banco ativo, confirmar
   que nenhum processo de escrita (seed, worker, cron) continua rodando.
5. **Bloqueio de escritas** — nenhuma escrita operacional durante a
   captura de contagens e durante a limpeza em si.
6. **Contagens completas** — `SELECT COUNT(*)` de TODAS as tabelas
   afetadas, antes de qualquer remoção (usar `snapshotAllTableCounts`-like,
   já existente em `test-support/cutover-fixtures.ts`, como referência de
   como enumerar todas as tabelas do schema atual).
7. **Manifesto dos registros retidos** — lista explícita dos IDs das 4
   contas retidas e de todas as linhas estruturais mínimas ligadas a elas
   (perfis, agências, vínculos), gerada pelo simulador
   (`buildRetentionManifest`).
8. **Validar as 4 contas** — login de teste (ou verificação equivalente)
   de `cp@lamego.com.vc`, `gabriel@lamego.com.vc`, `valderio@lamego.com.vc`,
   `nomad@allka.com.vc` ANTES de tocar em qualquer dado.
9. **Validar os 36 produtos catalog2** — contagem exata
   (`internal_name NOT LIKE '[TESTE LOCAL]%'`) e uma consulta de leitura a
   pelo menos um produto real, confirmando que a estrutura (versões,
   categorias, pilares, especialidades, 4F, variações, addons, pricing)
   está intacta.

## Durante a limpeza futura (quando construída e autorizada)

- **Execução transacional quando possível** — cada domínio/tabela removido
  dentro de uma transação própria; nunca uma transação única cobrindo o
  banco inteiro (tempo de lock inaceitável em tabelas grandes, ex.:
  `project_tasks` com 15.659 linhas).
- **Checkpoints por domínio** — registrar, a cada domínio concluído,
  contagem antes/depois e confirmação de que a contagem do Legacy
  correspondente não mudou (prova de que a cópia não foi tocada).
- **Ordem por FK** — sempre filhos antes de pais (ver tabela de
  dependências do relatório da sessão; 92 dependências reais mapeadas,
  20 delas com `ON DELETE RESTRICT` nas tabelas-núcleo). Nunca remover uma
  tabela referenciada por FK `RESTRICT` antes de remover quem a referencia.
- **Interrupção na primeira divergência** — se uma contagem não bater com
  o esperado (ex.: uma linha que deveria estar coberta no Legacy não
  aparece lá), parar imediatamente, não continuar para o próximo domínio.
- **Logs sem dados sensíveis** — só IDs/contagens/status, nunca conteúdo
  de registro (mesmo padrão já usado pelo orquestrador de snapshot).
- **Nenhuma limpeza automática adicional** — a ferramenta de limpeza,
  quando construída, não deve encadear outra limpeza (ex.: não remover
  bancos de teste órfãos automaticamente durante a execução).
- **Confirmação humana entre fases de alto risco** — pelo menos entre:
  (a) identidade/organizações, (b) projetos/execução (maior volume), (c)
  financeiro, (d) catálogo antigo (produtos + tarefas de catálogo,
  **só depois** do lote complementar de órfãs estar selado).

## Rollback

### Estratégia 1 — rollback transacional (antes do commit de qualquer fase)

- Toda remoção roda dentro de uma transação por domínio (ver acima).
- Se qualquer verificação dentro da fase falhar, `ROLLBACK` da transação
  em andamento — nenhuma linha da fase atual é perdida, fases anteriores
  já commitadas continuam como estavam.
- Critério de acionamento: qualquer contagem pós-remoção que não bata com
  o esperado, qualquer erro de FK, qualquer resultado inesperado de uma
  consulta de verificação.
- Responsável: quem executa a limpeza (nunca automático/sem supervisão).
- Tempo máximo aceitável antes de decidir entre corrigir e continuar ou
  abortar a fase: a ser definido pelo responsável no momento da execução
  real (fora do escopo deste plano, que é preparatório).

### Estratégia 2 — restauração integral do backup (se uma fase JÁ foi commitada)

Só se aplica depois que uma transação de fase já foi confirmada (commit) e
um problema é descoberto DEPOIS disso — a Estratégia 1 já não resolve.

1. **Como restaurar em banco paralelo primeiro** — NUNCA restaurar
   diretamente sobre `allka` real. Restaurar o backup operacional
   pré-limpeza num banco descartável/paralelo (`allka_rollback_test_*` ou
   nome de produção paralela, conforme o ambiente real), validado antes
   (host, marcador, nome ≠ do banco real).
2. **Como validar a restauração** — mesmo checklist já usado nesta sessão:
   tabelas, migrations, FKs, índices, contagens por domínio, uma consulta
   funcional por área (usuário, produto, projeto, financeiro, alerta,
   campanha).
3. **Como trocar de volta com segurança** — só depois da validação
   completa do banco paralelo: (a) parar o backend, (b) renomear/apontar a
   string de conexão para o banco restaurado (ou, se preferir manter o
   mesmo nome de banco, um `RENAME`/troca de schema cuidadosa, nunca um
   `DROP` do banco com problema antes de confirmar que o restaurado está
   correto), (c) reiniciar o backend apontando para o banco restaurado,
   (d) só então considerar remover o banco com problema (nunca antes).
4. **Como verificar login, as 4 contas e o catalog2** — mesmo checklist do
   item "antes da limpeza", agora repetido DEPOIS do rollback.
5. **Como preservar os snapshots Legacy durante o rollback** — o rollback
   é **exclusivamente sobre o banco `allka` (operacional)**. `allka_legacy`
   nunca é tocado por este procedimento — os 7 lotes (1 preview + 6
   oficiais selados, e o eventual complementar de tarefas órfãs) continuam
   intactos independentemente do que acontecer no operacional. **Nunca
   restaurar o dump operacional sobre o banco Legacy** — são bancos, dumps
   e credenciais completamente distintos; um dump de `allka` não tem
   nenhuma tabela em comum com `allka_legacy` (schemas totalmente
   diferentes), então essa troca nem faria sentido tecnicamente — mas a
   proibição fica explícita aqui para nunca ser tentada por engano de
   digitação de caminho/variável de ambiente.
6. **Como evitar que o backup antigo sobrescreva os seis lotes oficiais** —
   como o rollback nunca toca `allka_legacy`, os lotes oficiais nunca
   correm risco por este procedimento. O único jeito de um backup antigo
   afetar o Legacy seria um operador restaurar manualmente um dump ANTIGO
   de `allka_legacy` por engano — por isso todo comando de restore usado
   nesta sessão sempre validou o nome do banco de destino antes de
   restaurar (nunca resolver automaticamente "o backup mais recente" sem
   confirmar o banco de destino).

## Critério de irreversibilidade

Nenhuma limpeza será considerada CONCLUÍDA até que TODOS os itens abaixo
sejam confirmados, na ordem:

1. **Login das 4 contas** (`cp@lamego.com.vc`, `gabriel@lamego.com.vc`,
   `valderio@lamego.com.vc`, `nomad@allka.com.vc`) funcionando.
2. **Consulta Legacy** — as 8 rotas de consulta (`/summary`, `/products`,
   `/identities`, `/project-execution`, `/financial`,
   `/alerts-notifications-chat`, `/campaigns`, `/records/:id`) respondendo
   200, sem erro, com os lotes oficiais corretamente identificados.
3. **Catálogo2** — 36 produtos reais intactos, estrutura completa, nenhuma
   publicação/alteração acidental.
4. **Frontend/backend** — `/api/health` 200, frontend 200, sem erro 500 em
   nenhuma rota crítica.
5. **Integridade referencial** — nenhuma FK órfã (nenhuma linha
   remanescente apontando para um id que foi removido).
6. **Contagens** — cada tabela limpa bate exatamente com o número
   planejado de remoção (nem mais, nem menos).
7. **Ausência de registros inesperados** — nenhuma linha nova/estranha
   surgida durante o processo (comparar com a contagem do checkpoint
   anterior à limpeza).
8. **Teste de restauração pós-limpeza** — um backup do estado FINAL
   (pós-limpeza) é criado e restaurado com sucesso num banco descartável,
   provando que o resultado final também é recuperável.

Só depois de todos os 8 itens confirmados a limpeza é considerada
irreversivelmente concluída — antes disso, qualquer reversão pela
Estratégia 2 continua sendo uma opção real e viável.

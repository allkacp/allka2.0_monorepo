# Contas de teste do QA (fixture `seed:qa-demo`)

Todas criadas por `npm run seed:qa-demo` (nunca em produção — o script recusa
sem `SEED_QA_ENVIRONMENT=local|qa` explícito). Removê-las: `npm run seed:qa-demo -- --remove`.

**Senha:** definida por quem roda o seed via a variável de ambiente secreta
`SEED_QA_PASSWORD` — nunca fica hardcoded no código, nunca é impressa no
console/log, e não está neste documento. Peça a senha combinada de QA a
quem rodou o seed no ambiente que você está testando (cada ambiente pode
ter uma senha diferente).

| E-mail | Papel | Portal | O que essa conta deve conseguir fazer |
|---|---|---|---|
| `qa-admin-master@allka-qa.test` | Admin Master | `/admin/*` | Tudo — usuários, empresas, produtos atuais, Legacy, novo catálogo (incl. preview de rascunho), aprovar/rejeitar aditivos, permissões, configurações |
| `qa-admin@allka-qa.test` | Admin comum | `/admin/*` | Telas operacionais de admin, mas **sem** Legacy nem configurações exclusivas de Master |
| `qa-company@allka-qa.test` | Empresa | `/company/*` | Catálogo atual + novo catálogo, configurar/cotar/comprar o produto `[TESTE QA]`, acompanhar o pedido/projeto de teste, solicitar aditivo |
| `qa-agency@allka-qa.test` | Agência | `/agency/*` | Mesma coisa que Empresa, do lado da Agência — isolada da Empresa acima |
| `qa-partner@allka-qa.test` | Partner (upgrade de Agência) | `/partner/*` (mesma base de Agência) | Vê os dados da própria agência-partner; ações extras de Partner conforme já implementado |
| `qa-nomad@allka-qa.test` | Nômade | `/nomades/*` | Ver tarefas atribuíveis, tentar liberar a 2ª tarefa do pedido de teste (deve aparecer bloqueada pela dependência até a 1ª ser concluída), **não** deve enxergar o catálogo de contratação |
| `qa-leader@allka-qa.test` | Líder | `/leader/*` | Ver catálogo (sem contratar), acompanhar tarefas/projetos, tem 1 área de atuação (`[TESTE QA] Design`) cadastrada |

## Dados de apoio já semeados

- Empresa `[TESTE QA] Empresa` e Agência `[TESTE QA] Agência` (mais uma
  2ª agência exclusiva do Partner, `[TESTE QA] Agência Partner`).
- Produto `[TESTE QA] Serviço Completo` — publicado, com variação
  obrigatória de formato, variação obrigatória "Uso de IA na produção",
  1 adicional, 2 tarefas (a 2ª depende da 1ª), preço e prazo comercial
  completos. Nunca é um dos 36 produtos importados.
- 1 pedido/projeto já pago (`proj_...`, veja o código exato impresso pelo
  seed) com as duas tarefas em `EM_LANCAMENTO` — prontas para o teste de
  dependência (ver roteiro).
- 1 aditivo em status "solicitado" — pronto para o Admin aprovar e a
  Empresa pagar durante o teste.
- 1 alerta e 1 notificação de demonstração vinculados a esse pedido.

## Nunca faça isso com estas contas

- Não reutilizar estes e-mails/IDs para dado real.
- Não alterar a senha de produção usando o mesmo valor de `SEED_QA_PASSWORD`.
- Não deixar rodando em ambiente de produção — o seed já recusa, mas a
  disciplina operacional continua sendo não tentar.

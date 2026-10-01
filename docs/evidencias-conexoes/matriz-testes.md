# Matriz de testes — Conexões e acessos necessários

Arquivo: `apps/backend/src/routes/connections.integration.test.ts` (38 testes, execução final). Integridade dos 36 produtos e dos modelos globais: `scripts/verify-product-integrity.ts` (checagens P1–P18, G1–G9, C1–C5 — `depois/integridade-36-produtos.md`).

| Requisito | Teste | Resultado |
|---|---|---|
| módulo desativado | C01. módulo desativado: não aparece ao cliente, não entra no checklist, não bloqueia publicação, contratação nem tarefas e não muda preço/prazo | ✅ |
| módulo ativado | C02. módulo ativado: aparece no checklist, exige configuração coerente para publicar e passa a valer na contratação | ✅ |
| produto sem conexões | C03. produto sem conexões (nunca configurou o módulo): fluxo idêntico ao anterior, sem nenhuma estrutura de conexão | ✅ |
| produto com conexão opcional | C04. conexão opcional: aparece, mas nunca bloqueia tarefa nem contratação | ✅ |
| conexão obrigatória | C05. conexão obrigatória: bloqueia só a tarefa dependente e a independente continua | ✅ |
| salvar contratação como rascunho | C06. contratação: salvar como rascunho, fazer depois, indicar responsável — nada é bloqueado e a escolha chega ao projeto | ✅ |
| contratar com conexão pendente | C07. contratar com conexão pendente é permitido (padrão): só a tarefa dependente espera | ✅ |
| bloquear a conclusão da contratação (opcional) | C08. 'bloquear a conclusão da contratação': só então o checkout exige o envio — e senha nunca é aceita | ✅ |
| bloquear tarefa dependente / não bloquear independente | C05. conexão obrigatória: bloqueia só a tarefa dependente e a independente continua | ✅ |
| validação manual | C09. validação manual: só a equipe valida, com evidência; válida libera a tarefa dependente | ✅ |
| validação automática | C10. validação automática (WordPress): o conector confirma; em 'automática com confirmação humana' falta a pessoa | ✅ |
| correção | C11. correção: conexão inválida mostra o problema e a correção; o cliente corrige e a equipe revalida | ✅ |
| expiração | C12. expiração: conexão vencida pausa só a atividade em andamento que dependia dela | ✅ |
| revogação | C13. revogação: apaga o segredo, encerra as autorizações e bloqueia/pausa só as atividades afetadas | ✅ |
| pausa e retomada | C14. pausa e retomada: registra tudo, retoma ao revalidar e devolve o status anterior | ✅ |
| recálculo de prazo | C15. prazo: o SLA é suspenso; o prazo original é preservado e o novo é calculado pelo tempo bloqueado (caminho obrigatório) | ✅ |
| fora do caminho obrigatório | C16. fora do caminho obrigatório: informativa pausa nada e opcional não altera o prazo geral | ✅ |
| não penalização do nômade | C17. não penaliza o nômade: tarefa pausada por dependência externa não conta como atrasada nem gera alerta de atraso | ✅ |
| conexão por tarefa | C18. conexão só para uma tarefa: libera apenas aquela e as demais continuam esperando autorização | ✅ |
| conexão por tarefas selecionadas | C19. conexão para tarefas selecionadas: libera só as escolhidas | ✅ |
| conexão pelo projeto | C20. conexão para o projeto inteiro: todas as tarefas do projeto; reutilização automática dentro do mesmo projeto | ✅ |
| uso em outro projeto/empresa | C21. outro projeto e outra empresa: a conexão não é reaproveitada sem nova autorização | ✅ |
| troca de executor | C22. troca de executor: revoga o acesso do anterior, exige autorização do novo e bloqueia só a tarefa afetada | ✅ |
| continuidade | C23. continuidade (mesmo executor, ciclo seguinte): reaproveita a conexão válida, dispensa a validação completa e registra; conferência leve quando configurada | ✅ |
| segredo não exposto | C24. segredo nunca exposto: nem em API, eventos, histórico, notificações, pendências, orientação ou erros; e em repouso só cifrado | ✅ |
| OAuth cancelado / expirado | C25. OAuth: não configurado não simula; cancelado e expirado são tratados; sem conexão fantasma | ✅ |
| provedor indisponível | C26. provedor indisponível: a validação automática não conclui, o estado não muda e nada de sucesso é simulado; conector sem configuração cai em validação manual | ✅ |
| Google Ads (vínculo) | C27. Google Ads: solicitação de vínculo da conta gerenciadora com estados pendente, ativo, recusado e removido | ✅ |
| IA sem autonomia | C28. IA sem autonomia: orienta (explica, resume, sugere, prepara lembrete) mas não valida, libera, revoga nem encerra nada | ✅ |
| dispensa | C29. dispensa: opcional o cliente dispensa; obrigatória só a equipe, com justificativa registrada; tarefa libera | ✅ |
| condicional e liberação manual | C30. condicional: só passa a bloquear quando a condição ocorre; liberação manual exige justificativa e fica registrada | ✅ |
| pendências por visão | C31. pendências acionáveis por visão: cliente, executor, líder e administrador enxergam só o que lhes cabe — cada uma com ação direta | ✅ |
| lembretes e escalonamento | C32. lembretes: intervalo configurável, limite, escalonamento ao líder/administrador, histórico e interrupção automática ao resolver | ✅ |
| etapa e conclusão | C33. por etapa e por conclusão: a etapa só abre (ou conclui) com a conexão; o restante da tarefa não é bloqueado antes | ✅ |
| catálogo global e validações | C34. catálogo global: 21 tipos reutilizáveis sem duplicar; produto só referencia o tipo; IDs e edições preservados; métodos/permissões validados | ✅ |
| versões | C35. nova versão copia o módulo e as exigências; versão publicada é imutável | ✅ |
| rollback | C36. rollback: o rollback.sql de cada migração remove exatamente o que ela criou (conferência estática; execução comprovada em cópia) | ✅ |
| executor neutro | C37. troca de executor sem dependência de pessoa mantém a conexão (só registra) — e conexão por OAuth não depende do executor | ✅ |
| agência | C38. agência: projeto comprado por agência (sem empresa) tem a conexão da própria agência; outra agência e empresas não veem | ✅ |
| integridade dos 36 produtos | verify-product-integrity.ts (P1–P18) | ✅ |
| integridade dos modelos globais | verify-product-integrity.ts (G1–G9) | ✅ |

**Todos os requisitos cobertos e aprovados.**

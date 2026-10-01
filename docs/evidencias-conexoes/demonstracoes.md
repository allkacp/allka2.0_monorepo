# Demonstrações descartáveis — Conexões e acessos necessários

Executadas em 01/10/2026, 16:56:57 na base descartável `allka_conn_demo` (cópia da base local), com o backend real em :3011 e **provedor de IA simulado de QA** (sem custo e sem enviar dados). Nada foi publicado nem enviado para fora; a base é removida ao final.

**Resultado geral: TODAS AS DEMONSTRAÇÕES APROVADAS** (15/15)

Produtos usados (criados só nesta base): Gestão de Tráfego Pago, Site ou Landing Page, Produto sem conexão e Gestão de Redes Sociais.

## D1 — Produto sem conexão não sofre impacto ✅

- ✔ nenhuma pendência de conexão criada
- ✔ tarefas seguem o fluxo normal (liberada (para lançamento); liberada (para lançamento))
- ✔ nada aparece nas pendências do cliente

## D2 — Contratação salva como rascunho (Gestão de Tráfego Pago) ✅

- • Mensagem ao cliente: “Você não precisa compartilhar suas senhas. Utilize uma conexão oficial, convite ou autorização segura.”
- ✔ a contratação mostra 5 conexões: Google Ads, Google Analytics 4, Google Tag Manager, Meta Business Manager, Pixel / Conversions API
- ✔ cada conexão mostra motivo, momento, permissão e atividade afetada (Google Ads: Rotina de campanhas — necessária para continuar; Configurar contas de anúncio — necessária para iniciar)
- ✔ rascunho e escolhas ('fazer depois') salvos na cotação
- ✔ a contratação foi concluída (não bloqueou) e o rascunho/responsável chegou ao projeto

## D3 — Conexão feita depois da contratação ✅

- ✔ o cliente conectou depois (conexão Enviado) usando conta gerenciadora — sem senha
- ✔ nenhum segredo foi necessário/guardado

## D4 — Tarefa dependente fica bloqueada ✅

- ✔ “Configurar contas de anúncio” → aguardando conexão (bloqueada) (enviada, ainda não validada)
- ✔ “Relatório mensal” → aguardando conexão (bloqueada) (falta o GA4)

## D5 — Tarefa independente continua ✅

- ✔ “Reunião de alinhamento” → liberada (para lançamento) (não depende de conexão)

## D6 — Validação libera a tarefa ✅

- ✔ verificação automática: “Integração com Google Ads ainda não configurada neste ambiente (faltam: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_MANAGER_CUSTOMER_ID): a validação precisa ser manual.” — nada de sucesso simulado; a validação segue manual
- ✔ o cliente não pode validar a própria conexão
- ✔ “Configurar contas de anúncio” → liberada (para lançamento)
- ✔ “Rotina de campanhas” → liberada (para lançamento)
- ✔ “Relatório mensal” continua aguardando o GA4 (bloqueio só da atividade dependente)

## D7 — Conexão inválida apresenta a correção ✅

- ✔ OAuth do Google ainda não configurado neste ambiente → “A integração com este provedor ainda não está configurada neste ambiente.” (faltam GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET); nenhuma conexão simulada
- ✔ o cliente vê o problema (“A propriedade 987654 não está acessível por esta autorização.”) e a correção (“Conceda acesso de leitura à propriedade GA4 correta ou informe o ID certo.”) com o botão “Corrigir a conexão”
- ✔ o cliente corrigiu o identificador → volta para validação
- ✔ “Relatório mensal” → liberada (para lançamento)

## D8 — Conexão expirada pausa a tarefa ✅

- ✔ a manutenção expirou 1 conexão(ões) vencida(s)
- ✔ “Rotina de campanhas” → PAUSADA por dependência externa
- ✔ as tarefas paralelas seguem funcionando

## D9 — SLA suspenso, sem penalizar o nômade, prazo original preservado ✅

- ✔ tarefa pausada não conta como atrasada (atrasadas: 0 → 0)
- ✔ bloqueio registrado: motivo “"Google Ads": Expirado — A conexão expirou.”, responsável: cliente, detectado por system
- ✔ retomada → em execução
- ✔ prazo original preservado (07/10/2026, 16:55:51); tempo bloqueado 90 min
- ✔ novo prazo recalculado = original + tempo bloqueado (07/10/2026, 18:25:51) — atividade no caminho obrigatório

## D10 — Reutilização por tarefa (escopo: somente uma tarefa) ✅

- ✔ só a tarefa autorizada liberou — Briefing do site: aguardando conexão (bloqueada) | Construir as páginas: liberada (para lançamento) | Ajustes e revisão: aguardando conexão (bloqueada)

## D11 — Reutilização por tarefas selecionadas ✅

- ✔ liberou apenas as duas tarefas escolhidas; “Ajustes e revisão” segue aguardando

## D12 — Reutilização no projeto inteiro ✅

- ✔ todas as tarefas que dependem do WordPress foram liberadas (escopo: projeto inteiro); “Publicar o site” ainda aguarda o domínio

## D13 — Outro projeto exige nova autorização ✅

- ✔ mesmo cliente, outro projeto: a conexão NÃO é herdada — tarefa continua bloqueada
- ✔ o sistema procura conexão compatível e pergunta se deseja reutilizar (“WordPress da empresa”, válida)
- ✔ após a nova autorização explícita, a tarefa foi liberada
- ✔ nenhuma credencial foi copiada: os projetos referenciam a mesma conexão segura

## D14 — Troca de executor provoca reavaliação ✅

- ✔ executor 1 autorizado → em execução
- ✔ troca para o executor 2 → PAUSADA por dependência externa: o novo executor ainda não foi autorizado
- ✔ o acesso do executor anterior foi revogado
- ✔ apenas a tarefa afetada foi bloqueada
- ✔ executor 2 autorizado → em execução (histórico completo preservado)

## D15 — A IA orienta sem liberar nada ✅

- ✔ a resposta declara que a IA não decide nada
- ✔ a redação veio do adaptador SIMULADO de QA (sem provedor real, sem custo, sem enviar dados)
- • Próximo passo: Conecte agora ou escolha uma conexão existente.
- • Falta: A conexão ainda não foi criada/enviada.
- • Texto da IA (simulada): Resumo em linguagem simples (orientação simulada de QA): Google Tag Manager: Aguardando envio. 1 atividade(s) bloqueada(s).. Falta: A conexão ainda não foi criada/enviada. Próximo passo sugerido: Conecte agora ou escolha uma conexão existente.. Eu não valido a conexão nem libero a atividade — isso depende de uma pessoa autorizada.
- ✔ nada mudou depois da orientação (tarefa: liberada (para lançamento); conexão: awaiting_submission)
- ✔ o perfil de IA de QA é de sistema, exige revisão humana e não está vinculado a nenhum produto

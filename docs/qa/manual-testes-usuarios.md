# Manual de Testes Allka por Perfil

*Homologação visual e operacional — Memória, IA de Lançamento e Onboarding guiado*

**Versão 2 — rascunho para revisão interna** — NÃO enviar aos usuários antes da revisão do responsável.

Data: 2026-09-02

---

## O que é este documento

Este manual existe para organizar a homologação visual e operacional dos recursos que acabaram de entrar no ar: Memória, IA de Lançamento e o Onboarding guiado (tours da plataforma).

A parte técnica já foi validada — publicação, permissões, persistência de dados e isolamento entre contas foram confirmados diretamente contra o ambiente em produção antes deste documento ser criado. O que falta agora é a parte que só uma pessoa olhando a tela consegue confirmar: se está claro, se está bonito, se navega bem, se faz sentido no dia a dia de cada perfil.

Não é uma caça a defeito. É a etapa normal de homologação antes de considerar um recurso pronto para o uso real.

Cada teste deste manual foi escrito para ser executado por alguém que nunca usou a Allka antes — pré-condição, caminho, passos e resultado esperado ficam todos explícitos, sem exigir conhecimento prévio do sistema.

## Validado tecnicamente (não precisa ser testado de novo)

- Publicação em produção do frontend, backend e banco de dados — concluída e saudável (health check público, containers sem reinício, certificados válidos).
- As migrations novas foram só aditivas (nenhuma tabela ou coluna existente foi removida ou alterada de forma destrutiva).
- As contas de teste de cada perfil autenticam e mantêm sessão normalmente.
- A distinção entre Admin Master e Admin comum funciona corretamente no nível de permissão (confirmado tanto nos testes automatizados quanto direto em produção).
- O progresso do Onboarding é salvo no servidor — funciona mesmo trocando de navegador ou aparelho, não é um recurso só do computador de quem testou primeiro.
- A Memória permite leitura e edição de acordo com a permissão de quem acessa.
- O isolamento entre contas de Empresa e Agência foi confirmado — uma conta nunca enxerga projeto, memória ou aditivo da outra.
- O catálogo respeita o perfil de quem acessa (quem não contrata, não vê a opção de contratar).
- Uma sessão de IA de Lançamento foi criada, recebeu uma mensagem e manteve o conteúdo numa releitura — e foi cancelada ao final do teste, sem gerar nenhuma tarefa real.
- Nenhuma proposta foi materializada, nenhum produto foi publicado, nenhum pagamento foi executado durante a validação técnica.

## A validar pelos usuários (homologação visual e operacional)

- Layout: a tela parece certa, nada quebrado ou fora do lugar, em desktop e celular.
- Textos: estão claros, em português correto, sem termo técnico interno, sem frase confusa.
- Botões: têm nome completo, fazem o que dizem, nunca ficam cortados.
- Filtros e busca: retornam o que a pessoa esperava.
- Modais e painéis: abrem e fecham sem travar, sem esconder informação importante.
- Tours guiados: o balão de explicação nunca fica cortado, o destaque aparece no elemento certo, o texto faz sentido pra quem nunca usou aquilo antes.
- Celular: tudo funciona por toque, nada depende de passar o mouse por cima (hover).
- Persistência depois de F5 (recarregar a página): o que estava em andamento continua de onde parou.
- Diferenças entre perfis: o que já foi confirmado no banco de dados também faz sentido NA TELA — um Admin comum não vê a mesma coisa que um Admin Master, uma Agência não vê o que é da Empresa, e assim por diante.
- Ações que aparecem ou desaparecem: cada perfil só vê o botão de uma ação que ele realmente pode fazer.

## Observação sobre o primeiro acesso do Onboarding

> Observação importante: a oferta de "primeiro acesso" do Onboarding só aparece uma vez por conta. Se a conta de teste que você recebeu já iniciou o tour antes (por exemplo, em outro teste), você não vai ver a oferta automática de novo — isso é o comportamento correto, não um defeito. Nesse caso, abra a Central de Ajuda (ícone "Ajuda") e use o botão "Continuar" (se o tour ficou pela metade) ou "Refazer" (se já foi concluído ou dispensado) para testar o mesmo fluxo.

## Trilha rápida x trilha completa

A trilha rápida seleciona os pontos mais críticos de cada perfil, para uma primeira passada de cerca de 15 a 20 minutos. Um teste rápido também faz parte da trilha completa — não é um teste diferente, só uma prioridade maior. A trilha completa cobre todos os testes do perfil.

## Regras de segurança do teste

- As contas de teste abaixo são identificadas por perfil, mas a senha NUNCA está neste documento — ela será enviada separadamente, por um canal seguro (nunca e-mail aberto ou mensagem sem criptografia).
- Nunca use dado real ou conta real da plataforma para este teste — use só as contas de teste fornecidas.
- Se for necessário criar algum registro durante o teste (um pedido, um projeto, uma solicitação), identifique-o sempre com o prefixo [TESTE USUÁRIO] no título ou descrição — nunca deixe um registro de teste sem essa marcação.
- Ações "vermelhas" (excluir, cancelar em definitivo, rejeitar, resolver um alerta crítico) só devem ser realizadas em registros marcados [TESTE USUÁRIO] — nunca em dado real, e evite realizá-las sem necessidade nos registros de fixture [TESTE QA] já existentes.
- Não crie nem remova contas de usuário.
- Não é necessário (nem recomendado) alterar o progresso do Onboarding além do que o próprio roteiro pede — evite clicar em "Não quero ver" sem necessidade, já que essa decisão fica salva.
- Se algo parecer estranho, registre na planilha de resultados em vez de tentar consertar sozinho.
- Não execute (nem peça a terceiros): novo deploy, seed, publicação dos 36 produtos do novo catálogo, cutover, materialização de plano, pagamento real ou simulado além do já testado tecnicamente.

## Contas de teste

As credenciais (senha) serão enviadas separadamente, por canal seguro — nunca estão neste documento.

| Perfil | Portal | O que essa conta consegue fazer |
|---|---|---|
| Admin Master | `/admin/*` | Tudo: usuários, empresas, produtos, Legacy, novo catálogo, aprovar/rejeitar aditivos, permissões, configurações. |
| Admin comum | `/admin/*` | Telas operacionais de admin, mas sem Legacy nem configurações exclusivas de Master. |
| Empresa (Company) | `/company/*` | Catálogo, configurar/cotar/comprar o produto de teste, acompanhar o pedido/projeto, solicitar aditivo. |
| Agência (Agency) | `/agency/*` | Mesma coisa que Empresa, do lado da Agência — isolada da Empresa. |
| Partner (upgrade de Agência) | `/partner/*` | Vê os dados da própria agência-partner; ações extras de Partner, disponível só quando a agência tem status de Partner aceito. |
| Nômade | `/nomades/*` | Ver tarefas atribuíveis; não deve enxergar o catálogo de contratação. |
| Líder | `/leader/*` | Ver catálogo (sem contratar), acompanhar tarefas/projetos. |

## Códigos da trilha rápida, por perfil

| Perfil | Códigos do teste rápido (~15-20 min) |
|---|---|
| Admin Master | AM-001, AM-005, AM-006, AM-007, AM-010, AM-012, AM-013, AM-016, AM-018, AM-019 |
| Admin comum | AC-001, AC-005, AC-006, AC-007, AC-010, AC-012, AC-013, AC-016, AC-018, AC-020 |
| Company (Empresa) | CO-001, CO-005, CO-006, CO-007, CO-010, CO-012, CO-013, CO-016 |
| Agency (Agência) | AG-001, AG-005, AG-006, AG-007, AG-010, AG-012, AG-013, AG-016, AG-019 |
| Partner | PA-001, PA-005, PA-006, PA-007, PA-010, PA-012, PA-013, PA-016, PA-018 |
| Leader | LE-001, LE-005, LE-006, LE-007, LE-010, LE-012, LE-013, LE-016, LE-018 |
| Nomad | NO-001, NO-005, NO-006, NO-007, NO-010, NO-012, NO-013, NO-016, NO-018 |
| Celular | CE-001, CE-002, CE-005, CE-010 |

## Roteiro por perfil

### Admin Master

Contas usadas: Admin Master.

_Recomendado testar lado a lado com Admin comum (seção seguinte) para comparar diretamente o que cada um vê._

#### AM-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/admin/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-018 — Legacy · _(Rápido)_

- **Objetivo:** Confirmar que a consulta da plataforma anterior (Legacy) está acessível e é somente leitura.
- **Pré-condição:** Logado como Admin Master.
- **Caminho:** Menu administrativo → Legacy.
- **Passos:**
  1. Abra o item de menu "Legacy".
  2. Abra a aba de Resumo e depois a de Produtos.
  3. Abra um registro qualquer da lista.
- **Resultado esperado:** A tela abre normalmente, mostra dados da plataforma anterior, e nenhuma ação de editar/excluir aparece — é só consulta.
- **Impacto nos dados:** Nenhum — tela somente leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-019 — Administração de Alertas e Regras · _(Rápido)_

- **Objetivo:** Confirmar que a aba "Gerenciar" do painel de Alertas (Padrões, Regras, Programados, Avulsos) está acessível.
- **Pré-condição:** Logado como Admin Master.
- **Caminho:** Ícone de Alertas → aba "Gerenciar".
- **Passos:**
  1. Abra o painel de Alertas.
  2. Clique na aba "Gerenciar".
  3. Confirme que Padrões, Regras, Programados e Avulsos aparecem.
- **Resultado esperado:** A aba "Gerenciar" aparece e mostra as quatro seções administrativas.
- **Impacto nos dados:** Nenhum, desde que nenhuma regra/padrão seja criado ou apagado sem marcação [TESTE USUÁRIO].
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AM-020 — Aditivos — aprovação · _(Completo)_

- **Objetivo:** Confirmar que o Admin Master consegue abrir a tela de aprovação de um aditivo solicitado.
- **Pré-condição:** Existe um aditivo em status "solicitado" (o fixture de teste já inclui um).
- **Caminho:** Detalhe do projeto de teste → aba Aditivos → aditivo solicitado.
- **Passos:**
  1. Abra o projeto de teste.
  2. Vá até a aba Aditivos.
  3. Abra o aditivo em status "solicitado".
  4. Observe as opções de Aprovar/Rejeitar (sem clicar, salvo se o item estiver marcado [TESTE USUÁRIO]).
- **Resultado esperado:** A tela mostra claramente as opções de aprovar ou rejeitar, com o valor e prazo do aditivo revisados.
- **Impacto nos dados:** Só clique em Aprovar/Rejeitar se o aditivo estiver marcado [TESTE USUÁRIO] — isso muda o status permanentemente.
- **Nível de cuidado:** Alto se for de fato aprovar/rejeitar; Baixo se for só visualizar.
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Admin comum

Contas usadas: Admin comum.

_Esta seção prova especialmente a FRONTEIRA de permissão — o que este perfil NÃO pode ver, além do que pode._

#### AC-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/admin/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-018 — Fronteira de permissão — Legacy ausente · _(Rápido)_

- **Objetivo:** Provar que o item de menu "Legacy" NÃO aparece para Admin comum — é exclusivo do Admin Master.
- **Pré-condição:** Logado como Admin comum (não Master).
- **Caminho:** Menu administrativo completo.
- **Passos:**
  1. Percorra todo o menu administrativo.
  2. Procure por um item chamado "Legacy" ou "Consulta da plataforma anterior".
- **Resultado esperado:** O item "Legacy" não aparece em nenhum lugar do menu para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-019 — Fronteira de permissão — Legacy bloqueado por URL · _(Completo)_

- **Objetivo:** Provar que, mesmo tentando acessar a URL de Legacy diretamente, o Admin comum é bloqueado.
- **Pré-condição:** Logado como Admin comum.
- **Caminho:** Barra de endereço do navegador → digitar a URL de Legacy diretamente (ex.: .../admin/legacy).
- **Passos:**
  1. Com a sessão de Admin comum ativa, digite a URL de Legacy diretamente na barra de endereço.
  2. Pressione Enter.
- **Resultado esperado:** O acesso é negado ou redirecionado — a tela de Legacy nunca chega a ser exibida com dados reais.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-020 — Fronteira de permissão — Administração de Alertas ausente · _(Rápido)_

- **Objetivo:** Provar que a aba "Gerenciar" do painel de Alertas (Padrões/Regras/Programados/Avulsos) não aparece para Admin comum.
- **Pré-condição:** Logado como Admin comum.
- **Caminho:** Ícone de Alertas.
- **Passos:**
  1. Abra o painel de Alertas.
  2. Procure por uma aba "Gerenciar".
- **Resultado esperado:** A aba "Gerenciar" não aparece — só as abas normais (Ativos, Resolvidos, Arquivados) estão visíveis.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AC-021 — O que É acessível ao Admin comum · _(Completo)_

- **Objetivo:** Confirmar positivamente quais telas operacionais de admin SÃO acessíveis a esta conta (não é só uma lista de proibições).
- **Pré-condição:** Logado como Admin comum.
- **Caminho:** Menu administrativo completo.
- **Passos:**
  1. Percorra o menu administrativo.
  2. Abra pelo menos 3 telas operacionais comuns (ex.: acompanhamento de projetos, tarefas, clientes).
  3. Confirme que cada uma carrega e mostra dado real (do fixture de teste).
- **Resultado esperado:** As telas operacionais de admin (fora de Legacy e configurações exclusivas de Master) abrem normalmente e mostram dado.
- **Impacto nos dados:** Nenhum — teste de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Company (Empresa)

Contas usadas: Empresa (Company).

_O pedido/projeto de teste já vem pronto na conta._

#### CO-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/company/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-018 — Catálogo — configurar e cotar · _(Completo)_

- **Objetivo:** Confirmar que é possível abrir o produto de teste do catálogo, configurar uma variação e ver o preço recalculado.
- **Pré-condição:** Logado como Company; produto de teste "[TESTE QA] Serviço Completo" publicado no catálogo.
- **Caminho:** Catálogo → abrir o produto de teste → configurador.
- **Passos:**
  1. Abra o Catálogo.
  2. Localize e abra "[TESTE QA] Serviço Completo".
  3. Altere uma variação/opção de configuração.
  4. Observe o preço e prazo recalculados.
- **Resultado esperado:** O preço e prazo mudam de acordo com a escolha, sempre calculados pelo sistema (nunca uma conta feita só na tela).
- **Impacto nos dados:** Nenhum — configurar não gera cobrança nem pedido ainda.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-019 — Pedido de teste — projeto e memória · _(Completo)_

- **Objetivo:** Confirmar que o pedido/projeto de teste já existente é visível, junto com sua Memória.
- **Pré-condição:** Existe um pedido/projeto de teste pago associado a esta conta (fixture já inclui um).
- **Caminho:** Lista de projetos → projeto de teste → aba Memória.
- **Passos:**
  1. Abra a lista de projetos.
  2. Localize e abra o projeto de teste.
  3. Vá até a aba Memória.
  4. Leia o conteúdo (pode estar vazio, o que é normal se ninguém escreveu nada ainda).
- **Resultado esperado:** O projeto de teste aparece na lista, abre normalmente, e a aba Memória permite leitura (e edição, se aplicável).
- **Impacto nos dados:** Nenhum, a menos que você edite o texto da Memória — nesse caso, deixe claro que é um teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CO-020 — Solicitar aditivo · _(Completo)_

- **Objetivo:** Confirmar que é possível abrir a tela de solicitação de aditivo a partir do projeto de teste.
- **Pré-condição:** Projeto de teste aberto.
- **Caminho:** Detalhe do projeto de teste → aba Aditivos → Solicitar alteração.
- **Passos:**
  1. Na aba Aditivos do projeto de teste, clique em "Solicitar alteração adicional" (ou nome equivalente).
  2. Observe o configurador de aditivo abrir.
  3. Não é necessário concluir a solicitação — só confirmar que a tela abre corretamente.
- **Resultado esperado:** O configurador de aditivo abre normalmente, reaproveitando o mesmo padrão visual do catálogo.
- **Impacto nos dados:** Nenhum, se você não confirmar o envio da solicitação. Se enviar, identifique como [TESTE USUÁRIO].
- **Nível de cuidado:** Médio se a solicitação for enviada até o fim.
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Agency (Agência)

Contas usadas: Agência (Agency).

_Confirme sempre o isolamento em relação à conta Empresa._

#### AG-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/agency/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-018 — Catálogo — configurar e cotar · _(Completo)_

- **Objetivo:** Confirmar que é possível abrir o produto de teste do catálogo do lado da Agência, configurar uma variação e ver o preço recalculado.
- **Pré-condição:** Logado como Agency; produto de teste publicado no catálogo.
- **Caminho:** Catálogo → abrir o produto de teste → configurador.
- **Passos:**
  1. Abra o Catálogo.
  2. Localize e abra o produto de teste.
  3. Altere uma variação/opção de configuração.
  4. Observe o preço e prazo recalculados.
- **Resultado esperado:** O preço e prazo mudam de acordo com a escolha, sempre calculados pelo sistema.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-019 — Isolamento — nunca ver dado da Empresa · _(Rápido)_

- **Objetivo:** Confirmar visualmente que esta conta nunca mostra o pedido/projeto de teste da Empresa (isso já foi confirmado por chamada direta à API antes deste documento).
- **Pré-condição:** Logado como Agency.
- **Caminho:** Lista de projetos da Agência.
- **Passos:**
  1. Abra a lista de projetos desta conta.
  2. Confirme que o projeto de teste da Empresa ("[TESTE QA] Pedido — [TESTE QA] Serviço Completo") NÃO aparece nesta lista.
- **Resultado esperado:** Nenhum projeto, memória ou aditivo da conta Empresa aparece para a conta Agência.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### AG-020 — Solicitar aditivo · _(Completo)_

- **Objetivo:** Confirmar que é possível abrir a tela de solicitação de aditivo a partir de um projeto próprio da Agência, se existir.
- **Pré-condição:** Um projeto próprio da Agência (de teste) aberto — se não existir nenhum, use a observação sobre tela sem dados do bloco genérico como resultado válido.
- **Caminho:** Detalhe do projeto → aba Aditivos → Solicitar alteração.
- **Passos:**
  1. Se houver um projeto de teste próprio da Agência, abra a aba Aditivos e clique em "Solicitar alteração adicional".
  2. Se não houver nenhum projeto, confirme que a tela explica a ausência de dado em vez de travar.
- **Resultado esperado:** O configurador de aditivo abre normalmente quando há projeto; quando não há, a tela explica a situação.
- **Impacto nos dados:** Nenhum, se a solicitação não for enviada.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Partner

Contas usadas: Partner (upgrade de Agência).

_Partner não é um quarto tipo principal de empresa. É uma condição e um perfil vinculado a uma Agência. Usuários autorizados podem acessar a experiência Partner conforme seu vínculo e suas permissões._

#### PA-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/partner/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-018 — Acesso condicionado ao status de Partner · _(Rápido)_

- **Objetivo:** Confirmar que o portal /partner/* só é acessível porque a agência-partner de teste já tem o status de Partner aceito — Partner não é um quarto tipo principal de empresa; é uma condição e um perfil vinculado a uma Agência, e usuários autorizados acessam a experiência Partner conforme seu vínculo e suas permissões.
- **Pré-condição:** Conta vinculada a uma agência com status de Partner já aceito (fixture de teste já configurado assim).
- **Caminho:** Login → tela inicial do portal Partner.
- **Passos:**
  1. Faça login com a conta de teste de Partner.
  2. Confirme que a tela inicial do portal Partner abre normalmente, sem pedir nenhuma aprovação pendente.
- **Resultado esperado:** O portal Partner abre diretamente, sem bloqueio, porque o status já está aceito.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-019 — Dados da própria agência-partner · _(Completo)_

- **Objetivo:** Confirmar que os dados exibidos no portal Partner são sempre os da própria agência-partner de teste, nunca de outra agência.
- **Pré-condição:** Logado como Partner.
- **Caminho:** Telas principais do portal Partner (projetos, catálogo, dashboard).
- **Passos:**
  1. Percorra as telas principais do portal Partner.
  2. Confirme que qualquer projeto, cliente ou dado exibido pertence à agência-partner de teste, nunca a outra agência.
- **Resultado esperado:** Nenhum dado de outra agência aparece no portal Partner.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### PA-020 — Ações extras exclusivas de Partner · _(Completo)_

- **Objetivo:** Identificar e confirmar que existem ações ou telas extras disponíveis só para Partner, que não aparecem numa Agência comum.
- **Pré-condição:** Logado como Partner; idealmente com acesso de comparação a uma conta de Agency comum.
- **Caminho:** Menu e telas principais do portal Partner.
- **Passos:**
  1. Percorra o menu do portal Partner e anote qualquer item que pareça exclusivo (ex.: relatório extra, indicador diferente).
  2. Se possível, compare com o menu da conta de Agency comum para confirmar a diferença.
- **Resultado esperado:** Pelo menos as diferenças documentadas de Partner (visão consolidada da agência-partner) aparecem; nada de Empresa ou de outra Agência vaza para cá.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Leader

Contas usadas: Líder.

_Testado separadamente do Nomad — visões diferentes de catálogo e tarefas._

#### LE-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/leader/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-018 — Catálogo — ver sem contratar · _(Rápido)_

- **Objetivo:** Confirmar que o Líder vê o catálogo de produtos, mas nunca a opção de contratar/comprar.
- **Pré-condição:** Logado como Líder.
- **Caminho:** Catálogo.
- **Passos:**
  1. Abra o Catálogo.
  2. Abra o produto de teste.
  3. Procure por um botão de "Adicionar à cesta" ou "Contratar".
- **Resultado esperado:** O catálogo e o detalhe do produto aparecem normalmente, mas nenhuma opção de contratação/compra é exibida.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### LE-019 — Acompanhar tarefas/projetos da área de atuação · _(Completo)_

- **Objetivo:** Confirmar que o Líder acompanha tarefas e projetos ligados à sua área de atuação cadastrada (ex.: [TESTE QA] Design).
- **Pré-condição:** Logado como Líder; conta com pelo menos uma área de atuação cadastrada.
- **Caminho:** Tela de tarefas ou projetos do portal Líder.
- **Passos:**
  1. Abra a tela de tarefas ou projetos.
  2. Confirme que aparecem itens ligados à área de atuação cadastrada da conta.
- **Resultado esperado:** As tarefas/projetos exibidos correspondem à área de atuação da conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Nomad

Contas usadas: Nômade.

_Testado separadamente do Leader._

#### NO-001 — Layout geral · _(Rápido)_

- **Objetivo:** Confirmar que a tela inicial do perfil carrega sem elementos quebrados, cortados ou fora do lugar.
- **Pré-condição:** Conta de teste recebida; ainda não logado.
- **Caminho:** Tela de login → tela inicial (/nomades/*).
- **Passos:**
  1. Acesse a tela de login da Allka.
  2. Informe o e-mail da conta e a senha recebida separadamente por canal seguro.
  3. Clique em Entrar.
  4. Aguarde o carregamento completo da tela inicial.
- **Resultado esperado:** A tela inicial carrega por completo, com menu, cabeçalho e conteúdo principal visíveis, sem sobreposição nem elemento cortado.
- **Impacto nos dados:** Nenhum — teste só de leitura.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-002 — Textos e clareza · _(Completo)_

- **Objetivo:** Confirmar que os textos da tela estão em português correto, sem termo técnico interno nem frase confusa.
- **Pré-condição:** Já logado (teste de Layout geral concluído).
- **Caminho:** Tela inicial do perfil e os 2-3 primeiros itens de menu.
- **Passos:**
  1. Percorra visualmente os textos da tela inicial.
  2. Abra 2-3 itens do menu principal e leia os textos de cada um.
  3. Preste atenção a acentuação, ortografia e clareza.
- **Resultado esperado:** Nenhum texto usa jargão técnico (nome de tabela, código interno) nem parece corrompido ou confuso.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-003 — Botões · _(Completo)_

- **Objetivo:** Confirmar que os botões têm nome completo, são clicáveis e fazem o que dizem.
- **Pré-condição:** Já logado.
- **Caminho:** Tela inicial e uma tela secundária qualquer do perfil.
- **Passos:**
  1. Observe 5 a 10 botões diferentes nas telas percorridas.
  2. Confirme que nenhum está cortado ou sem texto.
  3. Clique em um botão neutro (que não altera dado, ex.: abrir um filtro) e confirme que ele responde.
- **Resultado esperado:** Todos os botões observados têm nome completo, visível, e respondem ao clique.
- **Impacto nos dados:** Nenhum, desde que o botão clicado não altere dado (ex.: só abre um filtro ou painel).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-004 — Filtros e busca · _(Completo)_

- **Objetivo:** Confirmar que os filtros e a busca (quando existirem na tela) retornam um resultado coerente.
- **Pré-condição:** Já logado, numa tela com lista e filtro/busca (ex.: uma tabela de registros).
- **Caminho:** Qualquer tela do perfil que tenha uma lista com filtro ou campo de busca.
- **Passos:**
  1. Abra uma tela com lista (ex.: catálogo, tarefas, projetos).
  2. Use o campo de busca ou um filtro disponível.
  3. Confirme que o resultado mudou de acordo com o filtro aplicado.
- **Resultado esperado:** O filtro/busca retorna um resultado coerente com o que foi digitado ou selecionado.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-005 — Modais e painéis · _(Rápido)_

- **Objetivo:** Confirmar que modais e painéis abrem e fecham sem travar a tela, sem sobrepor conteúdo indevido.
- **Pré-condição:** Já logado.
- **Caminho:** Qualquer modal ou painel lateral do perfil (ex.: painel de Alertas ou Notificações).
- **Passos:**
  1. Abra um modal ou painel lateral (ex.: clique no ícone de Alertas ou Notificações).
  2. Confirme que ele abre por cima do conteúdo, sem cortar nada essencial.
  3. Feche o modal/painel (botão de fechar ou Escape) e confirme que a tela volta ao normal.
- **Resultado esperado:** O modal/painel abre e fecha normalmente, sem travar a tela nem deixar resíduo visual.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-006 — Onboarding — oferta no primeiro acesso · _(Rápido)_

- **Objetivo:** Confirmar que o tour de boas-vindas é oferecido automaticamente no primeiro acesso da conta.
- **Pré-condição:** Conta ainda sem nenhum progresso de Onboarding salvo. Se a conta já iniciou o tour antes, ver a observação sobre usar Continuar/Refazer pela Central de Ajuda em vez deste passo.
- **Caminho:** Primeiro carregamento da tela inicial após o login.
- **Passos:**
  1. Faça login com a conta.
  2. Aguarde alguns segundos na tela inicial sem clicar em nada.
- **Resultado esperado:** Uma janela de boas-vindas oferecendo o tour guiado aparece automaticamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-007 — Onboarding — iniciar · _(Rápido)_

- **Objetivo:** Confirmar que o botão "Começar" realmente inicia o tour guiado.
- **Pré-condição:** Janela de oferta do tour visível (teste anterior) ou tour reaberto pela Central de Ajuda.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Começar".
  2. Observe o primeiro passo do tour (destaque num elemento da tela + balão de explicação).
- **Resultado esperado:** O tour inicia, destacando o primeiro elemento com um balão de texto explicando o que ele é.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-008 — Onboarding — adiar · _(Completo)_

- **Objetivo:** Confirmar que "Agora não" adia a oferta sem marcar o tour como concluído.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Agora não" (ou feche a janela).
  2. Recarregue a página (F5).
  3. Observe se a oferta aparece de novo ou fica em silêncio por um tempo.
- **Resultado esperado:** A janela some sem marcar o tour como concluído — ele continua disponível pela Central de Ajuda como "Novo".
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-009 — Onboarding — dispensar · _(Completo)_

- **Objetivo:** Confirmar que "Não quero ver" dispensa a oferta automática definitivamente, mas nunca impede reabertura manual.
- **Pré-condição:** Janela de oferta do tour visível.
- **Caminho:** Janela de boas-vindas do Onboarding.
- **Passos:**
  1. Clique em "Não quero ver".
  2. Recarregue a página (F5) uma ou duas vezes.
  3. Confirme que a oferta automática não volta a aparecer sozinha.
  4. Abra a Central de Ajuda e confirme que o tour aparece como "Dispensado", com opção de Refazer.
- **Resultado esperado:** A oferta automática nunca mais aparece sozinha para esta conta, mas o tour continua acessível manualmente pela Central de Ajuda.
- **Impacto nos dados:** Grava uma decisão persistente na conta de teste (reversível só rodando o tour de novo, não desfaz o "dispensado" anterior no histórico).
- **Nível de cuidado:** Médio — evite fazer este teste sem necessidade, pois a decisão fica salva no servidor.
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-010 — Onboarding — retomar · _(Rápido)_

- **Objetivo:** Confirmar que um tour interrompido no meio retoma exatamente do passo onde parou.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio (avance 2-3 passos e feche com o X ou Escape).
- **Caminho:** Tour em andamento → fechar no meio → Central de Ajuda → Continuar.
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Feche o tour (X ou Escape) sem concluir.
  3. Abra a Central de Ajuda e clique em "Continuar" no mesmo tour.
- **Resultado esperado:** O tour retoma exatamente do passo em que foi fechado, não do início.
- **Impacto nos dados:** Nenhum além do próprio progresso do tour, que é o objetivo do teste.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-011 — Onboarding — concluir · _(Completo)_

- **Objetivo:** Confirmar que é possível percorrer um tour do início ao fim e ele fica marcado como concluído.
- **Pré-condição:** Um tour disponível (Novo, Em andamento ou já visto antes via Refazer).
- **Caminho:** Central de Ajuda → Começar/Continuar/Refazer → percorrer todos os passos.
- **Passos:**
  1. Inicie (ou continue) o tour.
  2. Use "Próximo" até chegar ao último passo.
  3. Clique em "Concluir".
- **Resultado esperado:** O tour fecha e a Central de Ajuda passa a mostrar esse tour como "Concluído", com opção de Refazer.
- **Impacto nos dados:** Grava a conclusão na conta de teste (não destrutivo, pode ser refeito quantas vezes quiser).
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-012 — Onboarding — refazer · _(Rápido)_

- **Objetivo:** Confirmar que um tour já concluído pode ser refeito pela Central de Ajuda sem perder o histórico.
- **Pré-condição:** Um tour com status "Concluído" ou "Dispensado".
- **Caminho:** Central de Ajuda.
- **Passos:**
  1. Abra a Central de Ajuda (ícone "Ajuda").
  2. Localize um tour concluído ou dispensado.
  3. Clique em "Refazer".
- **Resultado esperado:** O tour reinicia do primeiro passo, sem apagar o registro de quando foi concluído/dispensado antes.
- **Impacto nos dados:** Nenhum destrutivo.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-013 — Permissão — Central de Ajuda · _(Rápido)_

- **Objetivo:** Confirmar que a Central de Ajuda só lista tours que fazem sentido para este perfil.
- **Pré-condição:** Já logado com a conta deste perfil.
- **Caminho:** Central de Ajuda (ícone "Ajuda").
- **Passos:**
  1. Abra a Central de Ajuda.
  2. Percorra a lista completa de tours disponíveis (use a busca e as categorias, se houver).
  3. Confirme que nenhum tour claramente administrativo ou fora do escopo deste perfil aparece.
- **Resultado esperado:** A lista mostra só tours cabíveis a este perfil — nenhum tour administrativo restrito aparece para conta não administrativa, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-014 — Onboarding — painel fechado · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um painel fechado (ex.: Alertas ou Notificações) orienta a abrir o painel em vez de travar ou pular o passo.
- **Pré-condição:** Um tour com passo dentro de um painel fechado por padrão (ex.: Alertas e Notificações), painel ainda fechado.
- **Caminho:** Tour em andamento chegando a um passo que fica dentro de um painel fechado.
- **Passos:**
  1. Inicie um tour que tenha um passo dentro do painel de Alertas ou Notificações.
  2. Avance até esse passo sem abrir o painel manualmente antes.
  3. Observe a mensagem exibida.
  4. Abra o painel indicado clicando no botão certo.
  5. Confirme que o tour continua para o passo seguinte.
- **Resultado esperado:** O tour destaca o botão que abre o painel e explica que é preciso abri-lo para continuar — nunca abre o painel sozinho, nunca trava a tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-015 — Onboarding — sem dados abertos · _(Completo)_

- **Objetivo:** Confirmar que um tour que depende de um projeto/registro aberto explica a situação quando não há nenhum aberto, em vez de travar ou ensinar uma ação impossível.
- **Pré-condição:** Nenhum projeto/registro do tipo esperado aberto no momento (ex.: iniciar o tour de Memória ou IA de Lançamento fora de um projeto).
- **Caminho:** Central de Ajuda → iniciar um tour ligado a projeto (ex.: Memória, IA de Lançamento) fora de qualquer projeto aberto.
- **Passos:**
  1. Sem abrir nenhum projeto antes, abra a Central de Ajuda.
  2. Inicie um tour que dependa de projeto (Memória, IA de Lançamento, Aditivos, Plano tático ou Materialização).
  3. Observe a mensagem exibida.
- **Resultado esperado:** Uma explicação clara aparece dizendo que é preciso abrir um projeto para ver aquele conteúdo — o tour nunca trava nem finge que existe um passo que não existe.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-016 — Persistência após F5 · _(Rápido)_

- **Objetivo:** Confirmar que um tour em andamento retoma do mesmo passo depois de recarregar a página.
- **Pré-condição:** Um tour em andamento, parado em algum passo do meio.
- **Caminho:** Tour em andamento → F5 (recarregar).
- **Passos:**
  1. Inicie um tour e avance 2-3 passos.
  2. Recarregue a página inteira (tecla F5 ou botão de recarregar do navegador).
  3. Observe se o tour retoma.
- **Resultado esperado:** O tour retoma do mesmo passo (ou pelo menos oferece "Continuar" pela Central de Ajuda no mesmo passo), nunca reinicia do zero silenciosamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-017 — Permissão — ações visíveis · _(Completo)_

- **Objetivo:** Confirmar que os botões e ações visíveis na tela fazem sentido para este perfil — nada que essa conta não pode fazer aparece.
- **Pré-condição:** Já logado, com acesso à lista de contas de outros perfis (ver seção Testes cruzados) para comparação, se possível.
- **Caminho:** Telas principais do perfil (dashboard, listas, detalhe de um registro).
- **Passos:**
  1. Percorra as telas principais do perfil.
  2. Observe os botões de ação disponíveis em cada tela.
  3. Compare mentalmente com o que este perfil deveria poder fazer, segundo a tabela de Contas de teste deste manual.
- **Resultado esperado:** Nenhum botão de uma ação exclusiva de outro perfil aparece para esta conta.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-018 — Catálogo de contratação ausente · _(Rápido)_

- **Objetivo:** Confirmar que o Nômade NÃO enxerga o catálogo de contratação em nenhum lugar do menu.
- **Pré-condição:** Logado como Nômade.
- **Caminho:** Menu completo do portal Nômade.
- **Passos:**
  1. Percorra todo o menu do portal Nômade.
  2. Procure por qualquer item de "Catálogo" ou "Contratar".
- **Resultado esperado:** Nenhum item de catálogo de contratação aparece no menu do Nômade.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-019 — Tarefas atribuíveis · _(Completo)_

- **Objetivo:** Confirmar que o Nômade vê as tarefas que pode assumir.
- **Pré-condição:** Logado como Nômade; existem tarefas atribuíveis no fixture de teste.
- **Caminho:** Tela de tarefas do portal Nômade.
- **Passos:**
  1. Abra a tela de tarefas.
  2. Confirme que aparecem tarefas disponíveis para atribuição.
- **Resultado esperado:** A lista de tarefas atribuíveis aparece normalmente.
- **Impacto nos dados:** Nenhum, desde que nenhuma tarefa seja assumida de fato sem necessidade.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### NO-020 — Dependência entre tarefas · _(Completo)_

- **Objetivo:** Confirmar que a 2ª tarefa do pedido de teste aparece bloqueada ("Pendente de liberação") até a 1ª ser concluída e aprovada.
- **Pré-condição:** O pedido de teste tem duas tarefas, a 2ª dependente da 1ª (fixture já configurado assim).
- **Caminho:** Tela de tarefas → tarefas do pedido de teste.
- **Passos:**
  1. Localize as duas tarefas do pedido de teste.
  2. Confirme que a 2ª aparece como bloqueada/pendente de liberação, sem poder ser iniciada ainda.
- **Resultado esperado:** A 2ª tarefa aparece claramente bloqueada, explicando que depende da conclusão da 1ª.
- **Impacto nos dados:** Nenhum — teste de leitura. Não conclua a 1ª tarefa de verdade, isso alteraria dado do fixture compartilhado.
- **Nível de cuidado:** Médio — não avance a tarefa real, só confirme visualmente o bloqueio.
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Celular

Repita a navegação básica de qualquer um dos perfis acima (preferencialmente Company ou Agency) num celular real ou com a janela do navegador estreita.

#### CE-001 — Mobile — Menu no celular · _(Rápido)_

- **Objetivo:** Confirmar que o menu de navegação principal abre e fecha corretamente no celular.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Acesse a plataforma num celular real ou com a janela do navegador estreita.
  2. Abra o menu de navegação principal (geralmente um ícone de "hambúrguer").
  3. Feche o menu.
- **Resultado esperado:** O menu abre e fecha sem travar, cobrindo a tela corretamente.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-002 — Mobile — Nada cortado · _(Rápido)_

- **Objetivo:** Confirmar que nenhum elemento fica cortado nas telas principais do perfil usado.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Percorra as 2-3 telas principais do perfil.
  2. Observe bordas, cards e textos.
- **Resultado esperado:** Nenhum elemento aparece cortado ou fora da tela.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-003 — Mobile — Botões tocáveis · _(Completo)_

- **Objetivo:** Confirmar que os botões são grandes o bastante para tocar, sem exigir precisão de mouse.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Toque em 5 botões diferentes nas telas percorridas.
- **Resultado esperado:** Todos os botões respondem ao toque sem precisar de precisão excessiva.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-004 — Mobile — Modais no celular · _(Completo)_

- **Objetivo:** Confirmar que modais e painéis ocupam a tela corretamente, sem cortar topo ou rodapé.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Abra um modal ou painel (ex.: Alertas).
  2. Observe se o topo e o rodapé do conteúdo ficam visíveis.
- **Resultado esperado:** O modal/painel se ajusta à tela do celular sem cortar conteúdo essencial.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-005 — Mobile — Tour no celular · _(Rápido)_

- **Objetivo:** Confirmar que o balão de explicação do tour guiado nunca fica cortado no celular.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Inicie um tour qualquer no celular.
  2. Avance por 3-4 passos observando o balão de texto.
- **Resultado esperado:** O balão de explicação aparece sempre dentro da tela, nunca cortado, com os botões visíveis.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-006 — Mobile — Sem depender de hover · _(Completo)_

- **Objetivo:** Confirmar que nenhuma ação do tour ou da tela depende de passar o mouse por cima (hover).
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Percorra as telas principais e o tour sem usar mouse, só toque.
- **Resultado esperado:** Tudo funciona por toque — nada exige hover para aparecer ou funcionar.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-007 — Mobile — F5 no celular · _(Completo)_

- **Objetivo:** Confirmar que um F5 (recarregar) no celular também retoma o tour do mesmo passo.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Com um tour em andamento, recarregue a página no celular.
- **Resultado esperado:** O tour retoma do mesmo passo, igual ao comportamento no desktop.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-008 — Mobile — Ícones flutuantes · _(Completo)_

- **Objetivo:** Confirmar que os ícones flutuantes (Ajuda, Alertas, Notificações) não se sobrepõem uns aos outros.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Observe a área onde ficam os ícones flutuantes no celular.
- **Resultado esperado:** Os ícones aparecem organizados, sem sobreposição.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-009 — Mobile — Rolagem · _(Completo)_

- **Objetivo:** Confirmar que a rolagem da página funciona normalmente, sem duas barras de rolagem brigando.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Role a tela para cima e para baixo em 2-3 telas diferentes.
- **Resultado esperado:** A rolagem é suave, sem duas barras de rolagem visíveis ao mesmo tempo.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CE-010 — Mobile — Login e carregamento no celular · _(Rápido)_

- **Objetivo:** Confirmar que login e carregamento básico funcionam normalmente no celular.
- **Pré-condição:** Qualquer conta de teste (preferencialmente Company ou Agency), acessando por um celular real ou janela estreita.
- **Caminho:** Navegação básica do perfil escolhido, num celular.
- **Passos:**
  1. Faça login no celular.
  2. Aguarde o carregamento da tela inicial.
- **Resultado esperado:** Login e carregamento funcionam normalmente, igual ao desktop.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

### Testes cruzados (diferenças entre perfis)

Estas comparações já foram confirmadas por chamada direta à API antes deste documento — o teste aqui é confirmar que a INTERFACE reflete o mesmo comportamento.

#### CR-001 — Comparação — Admin Master x Admin comum · _(Completo)_

- **Objetivo:** Confirmar visualmente que Legacy e Administração de Alertas e Regras só aparecem para o Master. (já confirmado por chamada direta à API antes deste documento — este teste confirma o reflexo na INTERFACE).
- **Pré-condição:** Acesso às duas contas envolvidas (pode ser em abas anônimas separadas do navegador).
- **Caminho:** Duas sessões de login simultâneas, uma para cada conta.
- **Passos:**
  1. Logue como Admin Master e anote os itens de menu exclusivos.
  2. Logue como Admin comum (outra aba ou sessão) e confirme que esses itens não aparecem.
- **Resultado esperado:** A comparação confirma a diferença de menu entre as duas contas.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CR-002 — Comparação — Empresa x Agência · _(Completo)_

- **Objetivo:** Confirmar visualmente que uma conta nunca mostra dado da outra (projeto, memória, aditivo). (já confirmado por chamada direta à API antes deste documento — este teste confirma o reflexo na INTERFACE).
- **Pré-condição:** Acesso às duas contas envolvidas (pode ser em abas anônimas separadas do navegador).
- **Caminho:** Duas sessões de login simultâneas, uma para cada conta.
- **Passos:**
  1. Logue como Empresa e anote o projeto de teste visível.
  2. Logue como Agência e confirme que esse projeto não aparece.
- **Resultado esperado:** Nenhum dado da Empresa aparece na Agência, e vice-versa.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

#### CR-003 — Comparação — Nômade x Líder · _(Completo)_

- **Objetivo:** Confirmar que o Nômade não vê o catálogo de contratação, e o Líder vê mas sem poder contratar. (já confirmado por chamada direta à API antes deste documento — este teste confirma o reflexo na INTERFACE).
- **Pré-condição:** Acesso às duas contas envolvidas (pode ser em abas anônimas separadas do navegador).
- **Caminho:** Duas sessões de login simultâneas, uma para cada conta.
- **Passos:**
  1. Logue como Nômade e confirme a ausência do catálogo.
  2. Logue como Líder e confirme que o catálogo aparece, mas sem opção de contratar.
- **Resultado esperado:** As duas contas mostram exatamente a diferença esperada de catálogo.
- **Impacto nos dados:** Nenhum.
- **Nível de cuidado:** Baixo
- **Resultado obtido:** ______________________  **Observações:** ______________________

## Como registrar o resultado

Cada teste da planilha "Registro_de_Resultados_Allka.xlsx" tem uma coluna "Status" com lista suspensa: Funcionou, Não funcionou, Não se aplica ou Não consegui testar. A célula muda de cor sozinha conforme a escolha (verde/vermelho/cinza/amarelo). A aba "Resumo" soma automaticamente quantos testes de cada situação existem por perfil e por trilha.

## Dúvidas e problemas

Dúvidas durante o teste, ou qualquer coisa que pareça um problema de verdade (não só uma opinião sobre o visual): registre na planilha e avise diretamente quem coordenou este teste, antes de qualquer decisão sobre liberar o recurso para todos os usuários.

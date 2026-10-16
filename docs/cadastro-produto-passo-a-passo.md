# Cadastro de produto na Allka 2.0 — passo a passo, item por item

> **Atualizado em 2026-10-16** (correção de modalidades, primeira execução, continuidade, questionário e entregáveis — LOCAL; ainda **não** publicado no QA).
> Leitura para qualquer pessoa ou IA (Claude, ChatGPT, Codex) que precise **entender como o produto é cadastrado** e **montar o cadastro de um produto novo** antes de digitá-lo na tela.
> Este documento descreve a tela **como ela é hoje** (editor de produto do módulo `catalog2`). O modelo antigo (`Product`/metadata) em [produtos.md](./produtos.md) é legado.
> **O que mudou em 16/10:** só existem as modalidades Avulso e Assinatura mensal; a implantação nasce das etapas "Só na primeira execução" (não entra na renovação); a continuidade do executor tem cartão próprio; questionário e entregáveis têm tela completa; produto individual não tem dependência entre tarefas; "somente em pacote" é decidido em Pacotes e Dependências; cobrança mensal e nova entrega mensal são conceitos diferentes.

---

## 0. Onde fica e como abrir

| O quê | Onde |
| --- | --- |
| Tela (admin master) | Admin → **Cadastro de Produtos** → escolher o produto → **Continuar configuração** → **Editar** (`/admin/cadastro-produtos/<id>`; local: `http://localhost:8082/admin/cadastro-produtos/1`) |
| Código da tela | `apps/frontend/app/admin/produtos/novo-catalogo/product-editor.tsx` (+ arquivos vizinhos: `field-help.ts` = texto do ícone "i" de cada campo; `step-details-summary.tsx`; `option-step-adjust-ui.tsx`; `catalog2-*-ui.tsx`) |
| API | `apps/backend/src/routes/catalog2-admin.ts` (montada em `/api/admin/catalog2`) |
| Regras de publicação | `apps/backend/src/lib/catalog2-service.ts` (lista `issues.push(...)` da validação) |
| Preço e prazo | `apps/backend/src/lib/catalog2-pricing.ts`, `catalog2-effort.ts` — **sempre calculados no servidor**, a tela nunca calcula |
| Etapas em execução (projeto) | `apps/backend/src/lib/stage-engine.ts`, `generate-tasks-catalog2.ts`, `qualifier-pool.ts`, `routes/qualificacoes.ts` |
| Campos comerciais (textos e listas) | `apps/backend/src/lib/catalog2-commercial-fields.ts` |
| Relatórios e evidências | [relatorio-pedido3-cadastro-universal.md](./relatorio-pedido3-cadastro-universal.md), [relatorio-estrutura-universal-v2.md](./relatorio-estrutura-universal-v2.md), [relatorio-36-produtos-catalogo2.md](./relatorio-36-produtos-catalogo2.md) |
| Histórico das decisões | [../documentos/Registro de Continuidade Produtos Allka.md](../documentos/Registro%20de%20Continuidade%20Produtos%20Allka.md) |
| **Exemplo real completo** (modelo de profundidade, 15 seções) | [../entregas/produtos/gestao-trafego-pago/Produto ID 1 - texto extraido.md](../entregas/produtos/gestao-trafego-pago/Produto%20ID%201%20-%20texto%20extraido.md) (o Word oficial está na mesma pasta; foi escrito em 02/10 — em conflito vale este guia) |
| Prompt para a IA montar um cadastro | [prompt-codex-cadastro-produto.md](./prompt-codex-cadastro-produto.md) |

Para **ler um produto já cadastrado** (ex.: o produto 1, que é o primeiro preenchido por inteiro): `GET /api/admin/catalog2/products/<id>` (admin autenticado) ou abrir a tela no modo leitura. Há também `GET /api/admin/catalog2/products/by-number/<n>`.

---

## 1. Como a tela funciona (vale para todos os passos)

1. **Versões.** Todo produto tem versões. Uma versão **publicada é imutável**; para mudar algo cria-se uma **nova versão (rascunho)** a partir dela. O seletor de versão fica no cabeçalho. Publicar **não ativa** o produto (o status do produto é outra coisa).
2. **Modo leitura x edição.** A tela abre travada. O botão **Editar** libera a edição; **Travar edição** volta para leitura (se houver algo não salvo, aparece um diálogo: salvar, descartar ou continuar editando).
3. **Salvar.** Cada bloco tem seu próprio salvar (ex.: **Salvar etapa**); **Salvar rascunho** (rodapé) grava tudo que ainda está pendente em todos os blocos abertos (informações, classificação, tarefa, etapas). Trocar de passo e publicar também gravam o que estiver pendente. O estado da tela (passo, sub-aba, blocos abertos, rolagem) é lembrado ao apertar F5.
4. **5 passos** no topo (com bolinha verde/amarela/vermelha de situação) e botões **Passo anterior / próximo** no rodapé:
   1. Informações do produto
   2. Entrega: tarefas, etapas e prazos
   3. Classificação e opções
   4. Custos e preço
   5. Revisão e publicação
5. **Painel "Checklist do produto"** (topo da página): mostra o que precisa de atenção, o que está pronto e o que é opcional; o botão **Resolver pendência** leva ao campo exato.
6. **Ícone "i"** em todo campo e título: texto explicando o que o campo é (fonte: `field-help.ts`). **Regra do usuário:** todo campo novo precisa ter o "i" detalhado.
7. **Botões de IA** (estrelinha roxa) em vários campos de texto: geram/aprimoram o texto. **Preencher o produto com IA** (Passo 1) conversa e preenche o produto inteiro a partir de uma explicação.
8. **Visualizar como cliente** (modo "Somente visualização"): mostra a página do produto como o cliente vê, sem gerar cotação.
9. **Aviso de preço:** os valores mostrados na tela vêm do servidor. Hora de especialidade, taxas e margem ficam em **Precificação** (tela global), não no produto.

---

## 2. Conceitos-chave (glossário que a IA precisa dominar)

- **Produto individual x combo.** Produto individual tem **UMA tarefa principal**; todo o resto são **etapas**. Várias tarefas só existem em **combos**, montados na **tela de Combos** juntando produtos prontos (não por botão no cadastro). A publicação recusa produto individual com mais de uma tarefa principal.
- **Tarefa.** O trabalho principal. **A tarefa não tem tempo próprio**: ela soma as horas das etapas e mostra o custo estimado (horas × valor/hora, sem taxas e margem).
- **Etapa.** Passo do trabalho dentro da tarefa. Tem nome, descrição, finalidade, quem executa, especialidade, horas, quem recebe, critério de conclusão, checklist, orientações, evidência, acessos e (opcionalmente) qualificação/aprovação. **O checklist da tarefa é a lista das suas etapas.**
- **Executor:** **Humano**, **IA** ou **Humano ou IA** (híbrido: quem contrata escolhe; cada opção tem especialidade e tempo próprios e o cliente vê o preço de cada).
- **Quem recebe a etapa:** nômade (oferta/rodízio na especialidade), líder da área (o com menos tarefas abertas ou um líder específico) ou equipe interna.
- **Especialidade.** Define o valor/hora e quem pode executar. Cadastrada na tela global de **Precificação**.
- **Qualificação x aprovação.** *Qualificação* = alguém **da Allka** (líder, pessoa específica, líder + pessoa, ou **nômade qualificador**) **confere** a entrega antes de seguir. *Aprovação* = o **cliente** aprova. Etapa feita por IA **sempre** é qualificada. Etapa só humana pode não ter qualificação.
- **Execução por etapa.** Chave **"Esta tarefa executa por etapa"** (no bloco 3 de qualquer etapa; vale para todas): cada etapa passa por entrega → qualificação → aprovação antes de liberar a próxima. Desligada, a qualificação/aprovação acontece só no fim da tarefa. (O controle "Pagamento do nômade" não existe mais na tela; a regra de pagamento fica nas etapas.)
- **Etapa interna.** Só da equipe: o cliente não vê nem aprova (ex.: validar briefing/acessos).
- **Nômade qualificador.** Nômade marcado como `is_qualifier` no cadastro da empresa/nômade; recebe conferências em **rodízio** (menos pendentes primeiro, depois a qualificação mais antiga), **só na área em que está habilitado**, nunca o próprio executor; se ninguém couber, **o líder da área qualifica**. A tela única **"Etapas para qualificar"** (`/nomades/qualificacoes`, `/leader/qualificacoes`, `/admin/qualificacoes`; API `/api/qualificacoes`) serve nômade, líder e admin. O qualificador **custa 20%** do custo humano da etapa (configurável em Precificação).
- **Checklist (3 tipos por etapa):** *Execução*, *Aprovação*, *Qualificação (conferência)* — os três quadros aparecem sempre; a qualificação só vale com a qualificação ligada.
- **Evidência.** A PROVA da entrega (arquivo/link/print…). Diferente do checklist (o que conferir) e das orientações (como fazer).
- **Variação / opção.** Escolha que o cliente faz ao contratar (ex.: "Número de campanhas" → "2", "4", "8"). **A opção PADRÃO é a que o produto ORIGINAL já inclui**: não soma custo nem horas. Uma variação pode ser marcada como **incluída no produto original** (`base_included`) ou ser um extra novo (que não existe no original). Só as opções **não padrão** somam **horas extras** (por etapa ou na tarefa inteira, opcionalmente com **especialidade própria**), prazo, valor e outros efeitos.
- **Adicional.** Item extra opcional com preço, custo, prazo e esforço próprios.
- **Condição.** Regra "se o cliente fizer tal escolha → tal efeito" (altera prazo, preço, tarefas, etapas, entregáveis ou exige informação).
- **Efeito (de opção/adicional/condição):** adicionar dias ao prazo; adicionar valor fixo; adicionar percentual; incluir tarefa condicional; remover tarefa; incluir etapa condicional; exigir informação do cliente; adicionar entregável; adicionar horas/minutos de esforço.
- **Modalidades de contratação:** só **Avulso** (um ciclo, sem renovação) e **Assinatura mensal** (novo ciclo a cada mês); pelo menos uma marcada. A **implantação não é modalidade**: nasce das etapas "Só na primeira execução". "Somente em pacote" também não é modalidade: é decisão do administrador em Pacotes e Dependências (um produto em pacote continua vendido separadamente, salvo "Impedir venda separada").
- **Primeira execução / implantação.** Etapa marcada "Só na primeira execução" roda e é cobrada **só no primeiro ciclo daquele produto naquele projeto**. Soma dessas etapas = **implantação**. Projeto novo do mesmo cliente = nova primeira execução; recontratar no mesmo projeto e simples revalidação **não** repetem; o administrador pode forçar (por API, com justificativa).
- **Primeira cobrança × renovação.** Primeira cobrança = implantação + 1º ciclo recorrente + variações/adicionais aplicáveis. Renovação = só etapas/variações/adicionais **recorrentes** + custos de IA e qualificação do ciclo (nunca a implantação). Compra avulsa = implantação + 1 ciclo, sem renovação. Os valores são diferentes de verdade em simulador, memória de cálculo, cotação, cesta, checkout, contrato, projeto e relatórios.
- **Cobrança mensal × nova entrega mensal.** São conceitos diferentes: *assinatura mensal* é como o cliente paga; *"gera uma nova entrega todo mês"* (Passo 4) é se cada mês pago abre um novo ciclo de tarefas. Serviço recorrente precisa das duas.
- **Continuidade do executor.** Configuração da tarefa: não permitida / permitida / recomendada / obrigatória, com prazo de aceite, regra se indisponível e depois do prazo, e reaproveitamento de conexões só no mesmo projeto. Etapa "dispensável com o mesmo executor" é dispensada (sem cobrança, com histórico) quando ele continua.
- **Ciclos.** Produtos mensais têm ciclos; a primeira execução vale só no 1º ciclo do produto no projeto.
- **Entrega emergencial.** O cliente paga a mais para receber antes; **cada etapa** define quantas horas reduz e quanto cobra a mais.
- **Acessos.** O cliente libera contas/ferramentas (Google Ads, Meta, site…). Cadastram-se **dentro da etapa**; a tela mostra um resumo geral. **Nunca se guarda senha** (a plataforma rejeita segredos).
- **Prazo.** Prazo comercial base em **horas** (24 h = 1 dia); o sistema guarda dias inteiros arredondados para cima (mínimo 1). Variações, adicionais e condições somam a ele.

---

## 3. Passo 1 — Informações do produto

Ordem dos blocos na tela:

1. **Contadores do produto** (só leitura): tarefas-base e condicionais (e quantas são possíveis) e etapas-base e condicionais; só as ativadas pelo cenário do cliente entram na execução e no preço.
2. **Quem pode ver este produto** (público). Marque **Todos** *ou* escolha entre: **Company**, **Agency (sem partner)**, **Agency Partner**, **Somente equipe interna**. Vale para lista, detalhe, cotação, cesta e IA. **Níveis de agência**: limita a certos níveis (os de Administração → Níveis Agências); "Todos os níveis" = sem restrição; só vale para agências.
3. **Alterações por IA grátis** (somatório, só leitura): soma das cotas definidas em cada etapa; depois das grátis, cada alteração é cobrada da carteira do cliente. Para mudar, edite na etapa.
4. **Dados principais** *(obrigatórios)*:
   - **Título comercial** (até 200 caracteres) — nome que o cliente vê; é também o nome do produto (não existe mais "nome interno").
   - **Descrição curta** (até 500) — aparece no card/lista.
5. **Descrição completa** *(obrigatória, até 4000)* — texto principal da página do produto: o que é, como funciona, benefícios, diferenciais.
6. **Informações comerciais** (cada campo tem seletor de **quem pode ver**: todos / cliente / equipe interna; observações internas são sempre internas):
   - Textos: **Público-alvo** (1000) · **Objetivo / promessa** (1000) · **Escopo** (4000) · **Aviso de resultados não garantidos** (1000) · **Política de alterações** (2000) · **Informações que o cliente precisa fornecer** (4000) · **Observações internas** (4000).
   - Listas (um item por linha, até 50 itens de 300 caracteres): **Itens incluídos** · **Itens não incluídos** · **Requisitos do cliente** · **Resumo dos entregáveis** (aceita arquivo-modelo do entregável).
7. **Resumo da mudança** (até 500; a IA preenche sozinha ao salvar versões novas se ficar em branco).
8. Botão **Preencher o produto com IA** e "Última atualização".

**Para publicar, é obrigatório:** título, descrição completa. (Pilar/categoria/4F estão no Passo 3.)

---

## 4. Passo 2 — Entrega: tarefas, etapas e prazos

### 4.1 Entrega comercial (cartão recolhível no topo)
- **Prazo comercial base** (em horas; mostra o reflexo em dias).
- **Preço desta versão:** calculado pelas tarefas (custo + taxas), preço fixo informado (vale como avulso, primeira cobrança e renovação) ou sob consulta.
- **Modalidade de contratação — só duas, e podem estar as duas marcadas:**
  - **Avulso** — compra de **um único ciclo, sem renovação automática**. Atividades exclusivas da primeira execução podem ser cobradas quando aplicáveis.
  - **Assinatura mensal** — abre **um novo ciclo a cada mês**. Atividades exclusivas da primeira execução **não são cobradas novamente** nas renovações.
  - Ao marcar a assinatura sem a entrega mensal definida, a tela pergunta, no mesmo fluxo, "Este produto gera uma nova entrega todo mês?" (botão **Sim** liga a entrega e o período mensal; **Decidir no Passo 4** leva ao campo).
  - Não existe mais "Implementação inicial" nem "Só em pacote" aqui (ver seção 2).
- **Cobrança estimada** (valores estimados, recalculados automaticamente conforme tarefas, etapas, tempo, especialidades, humano/IA, qualificação, adicionais e regras de preço; calculados pelo servidor com a seleção padrão): **Implementação** (*pagamento único*: etapas só na primeira entrega), **Recorrente** e **Renovação mensal** (*por ciclo*), **Primeira cobrança** (implementação + 1º ciclo recorrente) e **Compra avulsa** (uma única entrega, sem renovação; só aparece se o produto é vendido avulso). Um bloco expansível mostra quais etapas compõem cada valor.
- **Modalidades por período** (descontos por período — detalhe no Passo 4).
- **Prontidão da entrega** (%): confere se a **estrutura para executar** o produto está configurada — *Estrutura comercial* (modalidades, recorrência e demais configurações comerciais), *Tarefas e etapas* (fluxo operacional, responsáveis, duração e regras de execução) e *Acessos e conexões* (requisitos de acesso, quando houver). **Não significa que o produto está publicado**: a publicação depende das demais validações (Passo 5).

### 4.2 Tarefa
A tarefa **não tem mais o painel antigo de configurações** (especialidade padrão, ciclo, repetição, execução por etapa, pagamento do nômade, guia, dependências, "atualizar modelo global"). Quem lê uma versão antiga deste guia deve ignorar esses itens: tudo o que vale para a produção é configurado **nas etapas**. Na tarefa ficam, nesta ordem:

- **Resumo da tarefa** (nome, selos e métricas): número de etapas, **horas somadas das etapas**, prazo pelas etapas, **custo total estimado** (horas × valor/hora, sem taxas e margem; "a definir" se faltar especialidade ou valor/hora) e o questionário vinculado. **A tarefa não tem tempo próprio.** Em produto individual não há reordenar nem duplicar; em combos há mover e **Duplicar esta tarefa**. **Limpar tarefa** (com dupla confirmação e restauração) — a tarefa nunca é excluída.
- **Continuidade do executor nos próximos ciclos** (cartão, **salva na hora**; cada campo tem o "i"):
  - **Continuidade**: *Não permitida* (todo ciclo vai para a distribuição normal) · *Permitida* (cliente ou líder pode escolher manter o mesmo executor) · *Recomendada* (o sistema sugere manter; se mantido, o executor recebe a oferta primeiro e tem prazo para aceitar) · *Obrigatória* (vai direto ao mesmo executor, salvo indisponibilidade).
  - **Prazo de aceite do executor preferido (horas)** — padrão sugerido 2 h ao escolher Recomendada/Permitida. Sem resposta no prazo vale a opção seguinte.
  - **Se o executor estiver indisponível** (inativo, bloqueado ou sem a qualificação): *usar a distribuição normal* (e avisar o líder) ou *pedir decisão do líder*.
  - **Depois do prazo, usar a distribuição normal** (ligado = fila normal; desligado = o líder decide).
  - **Reutilizar conexões só no mesmo projeto** (ligado por padrão em tarefa nova; acessos já validados e etapas dispensáveis só são reaproveitados quando a execução anterior foi no mesmo projeto).
  - **Revalidação dos acessos antes do novo ciclo**: só na primeira execução (padrão) · quando o cliente avisar mudança · quando o executor mudar · a cada X dias · antes de todo ciclo · conferência leve · não exigir enquanto válidos.
  - Nunca atribui sem o aceite: a tarefa é **oferecida** ao executor preferido (oferta de 1ª rodada) e só então muda de mão.
- **Questionário de contratação** (construtor universal, bloco em **largura total**; o bloco **Entregáveis** fica **logo abaixo**, também em largura total). Três caminhos: **Selecionar questionário existente**, **Criar novo questionário** e **Gerar questionário com IA** (a IA usa os mesmos tipos e configurações do construtor manual e você revisa antes de criar).
  - **Lista compacta:** cada pergunta aparece recolhida numa linha (número, texto, tipo, obrigatória/opcional, inativa, condicional, anexo, seção) e expande para editar; há ordenar (setas), **duplicar**, excluir e **ativar/desativar sem apagar**. "Expandir todas / Recolher todas". Funciona em celular, tablet e computador.
  - **22 tipos de resposta:** texto curto, texto longo, número, moeda, data, hora, data e hora, sim ou não, seleção única, seleção múltipla, lista suspensa, escala ou nota, telefone, e-mail, URL, endereço, anexo de arquivo, imagem, vídeo, áudio, documento e aceite/confirmação (mais o antigo "acesso ou ativo do cliente").
  - **Por pergunta:** **ID próprio e permanente** (gerado ao salvar; não muda ao editar, reordenar ou duplicar o questionário), texto, ajuda/orientação, tipo, obrigatória ou opcional, ativa ou inativa, visibilidade (cliente, equipe interna, cliente e equipe, só interno), uso da resposta (pessoa/IA), texto de exemplo (placeholder), resposta padrão, mínimo/máximo (caracteres ou números), seção e etapa de destino.
  - **Opções** (seleção única/múltipla/lista): cadastrar, editar, excluir, **ordenar**, marcar **padrão** (única = só uma), permitir **"Outro"** com texto e mínimo/máximo de escolhas (múltipla).
  - **Anexos:** qualquer pergunta pode **permitir anexos junto da resposta** (opcional ou obrigatório); nos tipos de arquivo/imagem/vídeo/áudio/documento o arquivo **é** a resposta. Define-se tipos permitidos (extensões), quantidade máxima, tamanho máximo por arquivo e se cada arquivo exige descrição. **O servidor confere extensão, tipo real (pelo conteúdo) e tamanho**; executáveis e páginas ativas (.exe, .js, .html, .svg…) nunca entram; o arquivo fica guardado com nome aleatório (nenhum caminho interno aparece) e registra **quem enviou, quando e a qual pergunta**. Só quem tem acesso ao projeto baixa; anexos usados por uma contratação nunca são apagados por editar o modelo.
  - **Lógica condicional sem código:** mostrar a pergunta conforme a **resposta de outra pergunta** (é igual a, é diferente de, contém, está selecionado/respondido, não está selecionado, é maior que, é menor que, foi anexado arquivo, não foi anexado arquivo), ou conforme variação/adicional escolhidos. Pergunta oculta não é exigida nem validada.
  - **Seções:** nome, descrição e ordem; cada pergunta pode pertencer a uma seção (aparece como título no questionário do cliente).
  - **Reutilização:** buscar questionário por **ID, nome, texto de pergunta, produto, categoria ou especialidade** e vincular de duas formas: **"Vincular mantendo sincronizado"** (usa o modelo) ou **"Criar uma cópia independente"** (IDs novos). Buscar **pergunta** existente por nome ou ID e reutilizar (cópia com ID novo). **Duplicar questionário** e **Salvar como modelo global** (aparece na biblioteca).
  - **Edição protegida:** se o questionário é usado por mais de uma tarefa, ao salvar a tela pergunta: **criar uma cópia independente** (recomendado) ou **editar o modelo global** (exige confirmar; bloqueado se alguma versão publicada o usa). Nada muda em silêncio nos outros produtos. Cada edição sobe a **versão** do questionário.
  - **Visualizar como cliente:** prévia com o mesmo campo que o cliente usa (seções, obrigatórias, condições ao vivo, pendências). Nada é salvo.
  - **No contrato:** o briefing é **congelado** na tarefa (com ID e versão do questionário e de cada pergunta); editar o modelo depois **não altera** contratações anteriores nem respostas. O cliente pode **salvar como rascunho**; as obrigatórias só bloqueiam o **envio final**; o servidor valida tudo de novo. Pergunta inativa não vai para o contrato. Não duplica o módulo de **Conexões e acessos**.
- **Entregáveis**: nome, descrição, **ID permanente**, tipo, **formato**, **etapa responsável** (ou a tarefa toda), **momento da entrega** (ao concluir a etapa, no fim do ciclo, antes da aprovação do cliente, sob demanda), **quem envia**, **arquivo-modelo** (envio e download), **exige evidência**, **passa por qualificação interna**, **exige aprovação do cliente**, **visibilidade**, **recorrência** (*todo ciclo* ou *só na primeira execução*) e **condição** (texto de orientação para quem executa; condição estruturada por variação/adicional só via API). Dá para **reutilizar** um entregável de outro produto pela biblioteca. Na contratação o entregável vira um **registro da tarefa/etapa do projeto** (visto por cada perfil conforme a visibilidade; trava a conclusão se for obrigatório do executor e não foi enviado; passa por qualificação e aprovação quando marcado) e fica no histórico. O que o cliente vê na página do produto é o texto do **Resumo dos entregáveis** (Passo 1). Entregável de etapa "só na 1ª execução" some junto com ela nos ciclos seguintes.
- **Configuração de IA** (só se a tarefa usa IA/híbrido): perfil de IA ativo, instruções, revisão humana, custo por tokens.
- **Etapas da tarefa** (seção 4.3) e **Fluxo das etapas**.
- **Não existe dependência entre tarefas em produto individual** (a API recusa). A ordem entre **etapas** fica em "Fluxo das etapas"; dependência de um **produto** em relação a outro é cadastrada em **Combos / Pacotes e Dependências**. Dependências antigas já gravadas são preservadas.

### 4.3 Etapa — a ficha e o formulário (o centro do cadastro)
A ficha de leitura mostra selos (executor, qualificação, evidência, "só na 1ª execução", "dispensável c/ mesmo executor", "interna", "aceite do executor"…), o resumo em 3 colunas e as ações. **Editar** a etapa abre o formulário em **5 blocos empilhados**:

**Bloco 1 · O que é esta etapa**
- **Nome da etapa** · **Descrição (o que acontece nesta etapa)** (até 8000; com IA).

**Bloco 2 · Quem faz e quanto tempo leva**
- **Finalidade** (para que serve a etapa) · **Quem executa**: *Humano*, *IA* ou *Humano ou IA*.
- Humano/IA: **Especialidade** · **Horas estimadas** (de 0,25 em 0,25).
- *Humano ou IA*: dois quadros — **Opção humano** (especialidade + horas) e **Opção IA** (especialidade + horas), cada um mostra o **custo**. O cliente escolhe na contratação.
- **Quem recebe a etapa:** *Nômade da plataforma (oferta e rodízio)* · *Líder* (e **Qual líder**: "qualquer líder da área (o com menos tarefas abertas)" ou "Sempre <nome>") · *Equipe interna*.

**Bloco 3 · Quando a etapa termina**
- **Critério de conclusão** (o que precisa ser verdade para dar como pronta; com IA).
- **Só na primeira execução** — é o que forma a **IMPLANTAÇÃO** do produto: a etapa só roda no **primeiro ciclo deste produto neste projeto** e entra **só na primeira cobrança** (nunca na renovação). Projeto novo = nova primeira execução; recontratar no mesmo projeto não repete. O administrador pode forçar a repetição por API, com justificativa e histórico.
- **Dispensável quando o mesmo executor continua** — vale quando a continuidade do executor (cartão "Continuidade do executor") não é "Não permitida". Se o mesmo executor assumir o novo ciclo, a etapa é dispensada, **não é cobrada** (vira crédito na próxima fatura da assinatura), o motivo fica no histórico do projeto e o administrador pode exigi-la mesmo assim (com justificativa). Só dispensa se a execução anterior foi **no mesmo projeto** (quando "Reutilizar conexões só no mesmo projeto" está ligado) e se não houve mudança que exija revalidar. Etapa "só na primeira execução" não entra aqui (ela já não se repete).
- **Qualificação:** chave **"Esta etapa precisa de qualificação"** (desligada por padrão; IA sempre qualifica). Ligada: **Quem qualifica** = *Líder da área* / *Pessoa específica* / *Líder e depois uma pessoa específica* / *Nômades qualificadores*; **Pessoa que qualifica** (líder, administrador ou nômade ativo; obrigatória se escolher pessoa).
  - Etapa **Humano ou IA** tem **duas configurações**: "Se um humano executar" (liga/desliga + quem) e **"Se a IA executar: sempre é qualificada"** (só escolhe quem).
  - **"Esta tarefa executa por etapa"** (vale para todas as etapas da tarefa). Com ela ligada aparecem: **Etapa interna (o cliente não vê nem aprova)**, **Prazo de aprovação do cliente (h úteis)**, **Prazo de refação (h úteis)**, **Alterações por IA grátis (cota da etapa)** e, quando a etapa prefere o mesmo executor de outra, **Prazo de aceite do preferido (h)** (padrão 2 h).

**Bloco 4 · Checklist, orientações e evidência**
- **Gerenciar checklist** (3 quadros: Execução, Aprovação, Qualificação).
- **Orientações para execução** (o passo a passo de COMO fazer; até 8000; serve para nômade, líder e IA).
- **Prompt da IA** (só se a etapa usa IA/híbrido; o que produzir, tom, formato, o que nunca fazer; nunca aparece ao cliente; vai para a etapa do projeto e para a execução da IA).
- **Evidência obrigatória** (chave): ligada, a etapa só conclui com prova anexada. Aparecem **Que tipo de evidência** (Print da tela, Arquivo anexo, PDF, Relatório, Link, Texto/descrição — vazio = qualquer prova), **Responsável pela evidência** (Executor da etapa / Líder / Cliente) e **Exemplo de evidência**.
  - *Pendência conhecida:* o bloqueio automático de conclusão sem evidência (no projeto) ainda é fase futura; hoje a configuração é registrada e orienta.

**Bloco 5 · Conexões e acessos desta etapa**
- Chave "esta etapa precisa de acesso" → lista de acessos da etapa (**Adicionar acesso**) e acessos de outras etapas que podem ser reutilizados aqui. Para cada acesso (catálogo de tipos de acesso): **Tipo de acesso**, **Como será liberado**, **Permissão necessária**, **Obrigatoriedade** (obrigatório/opcional/condicional), **Quando será necessária**, **Comportamento quando pendente** (bloqueia/avisa/segue), **Escopo de uso sugerido**, **Modo de validação**, **Regra de revalidação** (+ dias), **Lembrete a cada (horas)**, **Limite de lembretes**, **Escalonar após (lembretes)**, **Motivo (mostrado ao cliente)**, **Instruções específicas deste produto**, **Conferência leve ao reaproveitar**, **Visível para o cliente**, e quais tarefas/etapas dependem dele. Tudo isso fica em "Detalhes avançados" quando é pouco usado.

**Fluxo das etapas** (visão geral da tarefa): define **Quando começa** (depois da anterior / junto com o início da tarefa / depois de etapas específicas — permite etapas **em paralelo**), a **política de executor** (ex.: preferir o mesmo executor de outra etapa) e se **libera a próxima etapa automaticamente** depois de aprovada (desligado: o líder libera). Também há "Executor aciona"/"Líder aciona" para execução por IA e "um humano assume se a IA não conseguir".

**Salvar etapa** grava a etapa; nada vale para o projeto até a versão ser publicada.

### 4.4 Acessos necessários (resumo)
Cartão recolhível **depois** das tarefas: lista só-leitura de todos os acessos pedidos no produto (onde foi cadastrado, quais etapas usam, se está disponível para outras). Para pedir um acesso, abra a etapa.

**Obrigatório para publicar:** pelo menos 1 tarefa; cada tarefa com pelo menos 1 etapa; **cada etapa com especialidade e horas**; fluxo de etapas sem erro/ciclo; líder específico existente e ativo; qualificação por pessoa exige a pessoa escolhida; tarefa de IA com perfil ativo/instruções/custo calculável.

---

## 5. Passo 3 — Classificação e opções (4 sub-abas)

### 5.1 Classificação
- **Pilar** (grande área) · **Categoria** (subgrupo; alimenta o rodízio de nômades por área) · **Classificações 4F** (Fundação, Fluxo, Força, Fidelização — até 4; marque quantas se aplicam). Sem botão salvar: grava com "Salvar rascunho".
- **Obrigatório para publicar:** pilar, categoria e ao menos uma 4F.

### 5.2 Variações
- **Nova variação:** nome (ex.: "Número de campanhas simultâneas") + pergunta "essa variação já está incluída no produto original?" (define `base_included`). Se a variação **não existe no produto original**, nenhuma opção pode ser padrão: todas somam custo.
- **Em cada variação:** **Editar nome** (ícone de lápis; Enter salva, Esc cancela), **Excluir variação** (pede confirmação), reordenar, **Ativa**, **Obrigatória**, **Tipo de escolha** (*Uma opção* / *Várias opções* / *Quantidade*) e **Ajuda para o cliente** (texto curto que explica como escolher).
- **Cada opção** (linha): imagem ou ícone (PNG/JPG/WEBP até 1 MB, ou ícone pelo menu ⋮) · **Título da opção** · **Editar nome** · **Excluir** (pede confirmação) · **Disponibilidade** (*Contratação automática*, *Exige revisão comercial*, *Orçamento personalizado* — com "Mensagem ao cliente (opcional)" —, *Só com atendimento*, *Indisponível*) · **Impactos** (chips de preço/prazo/tarefas/entregáveis/horas) com o botão **Configurar impactos** · **Padrão** (marque se o produto original **já inclui** esta opção: ela vira o ponto de partida e **não soma custo nem horas**; as outras somam em cima; não existe em variação por *Quantidade*) · **Ativa** · menu ⋮ (ícone, remover).
- **Detalhes da opção** (ao abrir "Configurar impactos"), em duas colunas:
  - **Para o cliente:** descrição curta, links de exemplo (só aceita link com http) e **arquivo-modelo** (anexar, remover, baixar; o cliente vê "Baixar modelo").
  - **Impactos da opção:** resumo (Preço, Prazo, Tarefas, Entregáveis, Horas extras) e dois acordeões: **Horas extras** (por **etapa** ou **tarefa inteira**; **especialidade própria** opcional — se vazia, vale a da etapa; mostra o custo ≈ horas × valor/hora; **não aparece na opção padrão**) e **Prazo e outros impactos desta opção** (efeitos: dias de prazo, valor fixo, percentual, incluir/remover tarefa ou etapa, exigir informação, entregável).
  - Variação por **Quantidade** guarda o efeito por unidade e precisa de ≥ 1 opção ativa.
- **Para publicar:** variação obrigatória precisa de ≥ 1 opção ativa; cada opção com efeitos válidos. *Pendente:* a regra "padrão x extra" será validada com o Gabriel; "Duplicar opção" não existe ainda.

### 5.3 Adicionais
Nome · **Nome que o cliente verá** · **Texto de ajuda ao cliente** · **Tipo de seleção** (*Seleção simples*, *Escolha única*, *Várias escolhas*, *Quantidade*) · **Forma de cobrança** (*Uma única vez*, *Por ciclo*, *Por quantidade*) · **Preço adicional (R$)** · **Custo base (opcional)** · **Vincular à tarefa / à etapa** · mídia (imagem) · efeitos (como nas opções).

### 5.4 Prazos e condições
- **Entrega emergencial:** liga "Oferecer entrega emergencial"; **cada etapa** define **Horas a reduzir** (não passa do tempo da etapa) e **Adicional** (valor fixo em R$ ou %). Ligada sem nenhuma etapa configurada → **bloqueia a publicação**.
- **Condições** ("Nova condição"): **Nome**, **Chave**, **Gatilho** (*Opção de variação*, *Adicional selecionado*, *Quantidade*, *Resposta do cliente*, *Atributo da contratação*), **Referência (chave)**, **Operador** (igual, diferente, ≥, ≤, contém, está/não está selecionado), **Valor de comparação**, **Efeito** (lista de efeitos acima), **Valor do efeito**.
- **Aprovações gerais** ("portões de aprovação": antes de iniciar uma etapa, depois dela ou antes de publicar) e **Prazos estruturados (SLA)** + **motivos de pausa do relógio** (aguardando cliente, acesso pendente…). A aprovação e o prazo de **cada etapa** ficam dentro da própria etapa.
- **Para publicar:** condição válida; tarefa condicional precisa ser incluída por algum efeito.

---

## 6. Passo 4 — Custos e preço

Tudo é **calculado no servidor**. Blocos:
- **Composição do preço** (Custos, taxas e margem): resumo do preço final + custos das tarefas, taxas, impostos, comissão, margem; **Memória de cálculo** (passo a passo para auditoria) e **Diagnóstico de precificação** (o que falta para calcular).
- **Simular cenário:** escolha variações/adicionais/quantidades e veja preço e prazo, sem criar cotação.
- **Cobrança estimada** (também no cartão "Entrega comercial" do Passo 2): **Implantação / primeira execução**, **Ciclo recorrente**, **Primeira cobrança** (= implantação + 1º ciclo recorrente + variações/adicionais aplicáveis), **Renovação mensal** (só o recorrente, sem implantação) e **Compra avulsa** (implantação + 1 ciclo, sem renovação), cada um com as etapas que o formam. A **Memória de cálculo** separa "Implantação/primeira execução" de "Ciclo recorrente". Produto sem etapa de primeira execução mostra: "Este produto não possui atividades exclusivas da primeira execução."
- **Modalidades por período** (entrega recorrente): descontos/condições por período (mensal, trimestral, semestral, anual…; hoje só o mensal é contratável) e a chave **"Este produto gera uma nova entrega todo mês"** — é a decisão de **entrega**, diferente de **cobrança** (assinatura mensal, Passo 2). Marque quando cada mês pago deve abrir um novo ciclo de tarefas. No Passo 2, ao marcar "Assinatura mensal" a tela pergunta isso no mesmo fluxo; o checklist de publicação leva direto a este campo.
- **Regras comerciais** (Margem e impostos): configuração **global** de precificação (imposto, comissão, taxa operacional, margem, reserva % de revisão humana) e **valor/hora das especialidades**. Mudar aqui afeta **todos** os produtos. O **custo do qualificador** (% do custo da etapa; padrão **20%**) é configurado na tela global **Admin → Precificação**.
- **Referência histórica de preço:** só comparação; **nunca é usada para cobrar**.
- **Para publicar:** o preço precisa ser calculável (especialidade com valor/hora, horas, custo de IA); pendências aparecem em "Diagnóstico".

---

## 7. Passo 5 — Revisão e publicação (3 sub-abas)

- **Conferência final — "Pronto para publicar?"**: lista objetiva do que ainda impede (precificação, modalidades, regras comerciais…) com **Ver detalhes dos bloqueios** e o **Resumo da versão**.
- **Publicação e versões:** **Versão atual** (publicada / não publicada), **Resumo das alterações** e **Tipo de alteração**, **Criar nova versão** (opção **Copiar dados do rascunho**), **Versões anteriores**, botão **Publicar versão** (confirma: "a versão ficará imutável e o produto NÃO é ativado").
- **Histórico:** quem mudou o quê, em cada versão (com antes/depois).

### Lista completa do que bloqueia a publicação (backend)
Título; descrição completa; pilar; categoria; ≥ 1 classificação 4F; ≥ 1 tarefa; produto individual com só 1 tarefa principal; cada tarefa com ≥ 1 etapa; cada etapa com especialidade e horas; dados provisórios/de teste revisados; fluxo de etapas válido (sem dependência circular); líder específico válido; especialista exigido preenchido; tarefa de IA com perfil ativo, instruções e custo calculável (e revisão humana se o perfil exigir); modelos de tarefa/etapa **inativos** não podem ser usados; variações obrigatórias com opções ativas; efeitos/condições/adicionais válidos; cobrança apontando para tarefa que existe; entrega emergencial configurada; dependências entre tarefas sem ciclo; acessos/conexões válidos; regras da estrutura universal v2; **modalidades coerentes (ao menos uma; assinatura mensal exige "gera nova entrega todo mês")**; preço calculável. A mensagem exata aparece na tela com o motivo em português.

**Não bloqueiam a publicação** (e não aparecem na tela): os campos comerciais antigos `has_initial_implementation`, `implementation_rule`, `implementation_blocks_operation`, `sell_mode` e `sale_modes_enforced`. Ficam guardados para contratos e versões antigas, não mudam preço nem tarefas, e nada os altera em silêncio. Auditoria somente leitura: `npx tsx src/scripts/catalog2-legacy-fields-audit.ts`.

---

## 8. Regras de ouro ao montar um cadastro novo

1. **Nunca inventar** preço, hora, prazo, especialidade ou promessa. Se a informação não veio do usuário, marque **"PENDENTE — preciso do usuário"**.
2. **Uma tarefa principal** por produto individual; o resto são etapas.
3. **Hora só nas etapas.** Especialidade e valor/hora vêm da Precificação; se a especialidade não existe, peça para cadastrar lá.
4. **Padrão = produto original.** Só o que é **extra** ganha custo/horas/prazo.
5. **Qualificação só onde faz sentido**; IA sempre qualifica; escolha o tipo de qualificador (líder, pessoa, líder + pessoa, nômades qualificadores).
6. **Evidência e checklist são coisas diferentes**; cada etapa deve dizer o "como fazer" (orientações), o "o que conferir" (checklist) e a "prova" (evidência) quando houver.
7. **Acessos** só os necessários, dentro da etapa que os usa; nunca pedir senha.
8. **Escrever para o cliente** nos campos que o cliente vê (sem jargão interno); notas internas só em "Observações internas".
9. **Português** na tela e nos textos; **todo campo novo com "i" detalhado**.
10. **Não mexer em dado do servidor**: o computador local é a fonte da verdade; o QA (`allka.store`) só recebe espelho por ordem do usuário (README → "Operação e deploy").
11. **Implantação = etapas "Só na primeira execução".** Não existe botão "implementação inicial": marque a etapa e o sistema cobra só na primeira cobrança e executa só no primeiro ciclo do produto no projeto.
12. **Cobrança mensal ≠ nova entrega mensal.** Assinatura mensal (Passo 2) é como o cliente paga; "Este produto gera uma nova entrega todo mês" (Passo 4) é se cada mês pago abre um novo ciclo de tarefas. Serviço recorrente precisa das duas.
13. **Produto individual não tem dependência entre tarefas** (tem uma só). A ordem entre etapas fica em "Fluxo das etapas"; dependência entre produtos fica em **Combos / Pacotes e Dependências**.
14. **"Somente em pacote" não é campo do produto.** O produto em pacote continua vendido separadamente; para impedir isso use "Impedir venda separada" na gestão do pacote.
15. **Etapa com horas precisa de especialidade**, senão o preço fica "a definir" (e a publicação é bloqueada).

---

## 9. Pendências conhecidas (16/10) — não tratar como erro de cadastro

- Item "prompt da IA por etapa" foi **reprovado** pelo usuário na conferência; **falta o motivo** (aguardando).
- Variações: regra "padrão x extra" e "Duplicar opção" — validar com o Gabriel.
- Nômade qualificador: grupo cadastrado e testado em automático; teste visual do usuário pendente.
- **Fase 2 "Humano ou IA" na contratação** (o cliente escolher e ver preço de cada), **bloqueio de conclusão sem evidência**, **etapas sem qualificação nem aprovação** em todo o fluxo do projeto: previstos, ainda não completos.
- **Primeira execução forçada pelo administrador** e **exigir uma etapa dispensada**: funcionam por API (com justificativa e histórico); ainda **não há botão** na tela do projeto.
- **Condição do entregável** é texto de orientação para quem executa; só a condição estruturada (variação/adicional, via API) filtra o entregável sozinha.
- Etapa marcada ao mesmo tempo como "só na primeira execução" e "dispensável com o mesmo executor" é redundante (a 1ª execução já não se repete); a tela não avisa isso ainda.
- Layout de todas as telas: revisão geral combinada para depois.

---

# Anexo A — Ficha de cadastro (modelo em branco para a IA preencher)

> Preencha **na ordem da tela**. Onde não houver informação confiável escreva `PENDENTE — perguntar ao usuário`. Não invente números.

```
PRODUTO: <nome comercial>
TIPO: individual (1 tarefa) | combo (várias tarefas — montar na tela de Combos)

PASSO 1 — INFORMAÇÕES
Quem pode ver: [ ] Todos [ ] Company [ ] Agency (sem partner) [ ] Agency Partner [ ] Só equipe interna
Níveis de agência: todos | <quais>
Título comercial (≤200):
Descrição curta (≤500):
Descrição completa (≤4000):
Público-alvo (≤1000):            Visível para: todos | cliente | interno
Objetivo / promessa (≤1000):     Visível para:
Escopo (≤4000):                  Visível para:
Aviso de resultados não garantidos (≤1000):
Política de alterações (≤2000):
Informações que o cliente precisa fornecer (≤4000):
Observações internas (≤4000):  (sempre interno)
Itens incluídos: - ...
Itens não incluídos: - ...
Requisitos do cliente: - ...
Resumo dos entregáveis: - ...

PASSO 2 — ENTREGA
Prazo comercial base (horas):
Tipo de preço: calculado pelas tarefas | fixo (R$) | sob consulta
Modalidades: [ ] Avulso (um único ciclo, sem renovação)  [ ] Assinatura mensal (novo ciclo a cada mês → marcar também "gera nova entrega todo mês" no Passo 4)
(NÃO existe "Implementação inicial" nem "Só em pacote" aqui: a implantação vem das etapas marcadas "Só na primeira execução"; "só em pacote" é decidido em Pacotes e Dependências.)
TAREFA: <nome>
  Especialidade padrão:
  Condicional? Aprovação do cliente? Revisão obrigatória (revisor/min/especialidade)? Qualificação obrigatória?
  Executa por etapa? (sim/não)   Pagamento do nômade: a cada etapa | só no fim
  Continuidade do executor: não permitida | permitida | recomendada | obrigatória → prazo de aceite (h) | se indisponível: distribuição normal | líder decide | depois do prazo: fila normal | líder decide | reutilizar conexões só no mesmo projeto | revalidação dos acessos (primeira vez | mudança do cliente | troca de executor | a cada X dias | todo ciclo)
  Guia da tarefa (descrição, objetivo, instruções, entradas, saída, critério de aceite, riscos + quem vê):
  Entregáveis da tarefa:
  Questionário do cliente (perguntas, tipo, obrigatória, ajuda, quem vê):
  ETAPA 1:
    1 · Nome / Descrição:
    2 · Finalidade | Quem executa (Humano/IA/Humano ou IA) | Especialidade (+ IA) | Horas (+ horas IA) | Quem recebe (nômade/líder[qual]/interna)
    3 · Critério de conclusão | Só na 1ª execução? | Dispensável c/ mesmo executor?
        Qualificação: não | sim → quem (líder | pessoa | líder+pessoa | nômades qualificadores) [+ se IA executar: quem]
        (se executa por etapa) Etapa interna? | Prazo aprovação (h úteis) | Prazo refação (h úteis) | Alterações por IA grátis | Aceite do preferido (h)
    4 · Orientações de execução (passo a passo) | Prompt da IA (se IA) |
        Checklist — Execução: ... | Aprovação: ... | Qualificação: ...
        Evidência obrigatória? sim/não → tipos | responsável | exemplo
    5 · Acessos: nenhum | [tipo, como liberar, permissão, obrigatoriedade, quando, se pendente, validação, motivo ao cliente, instruções]
    Fluxo: começa (depois da anterior | junto | depois de <etapas>) | libera a próxima sozinha? | política de executor
  ETAPA 2: (repetir)

PASSO 3 — CLASSIFICAÇÃO E OPÇÕES
Pilar / Categoria / 4F:
VARIAÇÃO <nome> (incluída no produto original? sim/não) — tipo: uma | várias | quantidade — obrigatória? — ajuda ao cliente:
  Opção PADRÃO (= produto original): <rótulo>
  Opção <rótulo>: disponibilidade (automática | revisão comercial | orçamento personalizado | só atendimento | indisponível) | descrição curta | links de exemplo | arquivo-modelo
                  preço +R$ | prazo +dias | horas extras (etapa → h, especialidade própria?) | outros efeitos
ADICIONAL <nome>: nome ao cliente | ajuda | seleção | cobrança | preço | custo | vínculo | efeitos
CONDIÇÃO <nome>: gatilho | referência | operador | valor | efeito | valor do efeito
ENTREGA EMERGENCIAL: sim/não → por etapa: horas a reduzir | adicional (R$ ou %)
APROVAÇÕES GERAIS / SLA / PAUSAS: ...

PASSO 4 — CUSTOS E PREÇO
Especialidades usadas e valor/hora (conferir na Precificação):
Modalidades por período (descontos):
Preço esperado / faixa (apenas conferência — o sistema calcula): ...

PASSO 5 — PUBLICAÇÃO
Resumo da mudança:
Pendências antes de publicar (da lista da seção 7):
```

# Anexo B — Exemplo ilustrativo de formato (NÃO é produto real)

```
ETAPA 2 — "Criar campanhas"
 1 · Nome: Criar campanhas · Descrição: Montar as campanhas conforme o briefing aprovado.
 2 · Finalidade: Execução · Quem executa: Humano · Especialidade: Gestor de tráfego · Horas: 3 · Quem recebe: Nômade (rodízio)
 3 · Critério de conclusão: campanhas ativas e conferidas no painel. · Só na 1ª execução: não · Dispensável c/ mesmo executor: não
     Qualificação: sim → Nômades qualificadores. (Etapa executa por etapa: sim · Prazo de aprovação: 24 h úteis · Refação: 8 h úteis)
 4 · Orientações: 1) abrir o gerenciador; 2) duplicar a campanha modelo; 3) trocar público e orçamento; 4) conferir o rastreamento.
     Checklist — Execução: [ ] público conferido [ ] orçamento aplicado · Qualificação: [ ] estrutura de campanha correta
     Evidência obrigatória: sim → Print da tela · Responsável: Executor · Exemplo: print das campanhas com status Ativa
 5 · Acessos: Google Ads (convite por e-mail, permissão Padrão, obrigatório antes de iniciar, bloqueia se pendente)
VARIAÇÃO "Número de campanhas" (incluída no original: sim) — uma opção — obrigatória
 Padrão: 2 campanhas (produto original) · "4 campanhas": +2 h em "Criar campanhas" (especialidade da própria etapa), +1 dia de prazo
```

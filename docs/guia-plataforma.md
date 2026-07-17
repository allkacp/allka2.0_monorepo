# Guia da Plataforma Allka — o que cada botão faz

Guia funcional (não técnico) da plataforma, perfil por perfil, página por página, explicando o que cada botão, filtro e ação faz na tela — para quem usa o sistema no dia a dia. Para o mapa técnico de arquivos/componentes, ver [`telas-e-funcionalidades.md`](./telas-e-funcionalidades.md).

## Status desta documentação (⚠️ trabalho em andamento)

Este guia foi gerado por leitura direta do código-fonte de cada página, em 2026-07-14, e ficou pausado no meio para economizar créditos. **Cobertura atual:**

- ✅ **Admin** — completo, exceto `/admin/produtos` (CRUD de produtos do catálogo, ~9.000 linhas — não documentado ainda).
- ✅ **Líder** — completo (10/10 páginas).
- ✅ **Nômade** — completo (9/9 páginas).
- ✅ **Parceiro** — completo (5 páginas em `/parceiro` + `Usuários` em `/partner/usuarios`).
- ⚠️ **Agência** — parcial: Catálogo, Projetos e Tarefas prontos. **Faltam:** Dashboard, Clientes, Financeiro, Usuários.
- ⚠️ **Empresa** — parcial: Dashboard, Projetos, Faturas, Catálogo, Relatórios e Tarefas prontos. **Faltam:** Clientes, Usuários.

Para retomar: pedir para completar as páginas faltantes listadas acima (e `/admin/produtos`), seguindo o mesmo formato usado neste arquivo.

---

## Admin (rota `/admin/...`)

### Dashboard (/admin/dashboard)

Página inicial do perfil Admin, com uma visão geral em tempo real da plataforma: cards de indicadores (KPIs) e widgets configuráveis (gráficos, listas e atividades recentes).

- Seletor de **Período** (pílula "Período" no topo): abre um painel com opções rápidas (hoje, últimos 7/30/90 dias, este mês, mês passado, etc.) e também um intervalo personalizado ("De" / "Até" + botão "Aplicar"); o período escolhido é aplicado globalmente a todos os widgets do dashboard.
- Seletor de **Dashboard** (pílula com ícone de grade): lista os dashboards salvos, permite trocar entre eles, marcar um como padrão (estrela), excluir um dashboard existente ou criar um novo através de "Criar novo dashboard".
- Botão **Exportar** (ícone de download no cabeçalho): abre menu com as opções "Exportar como PDF" e "Exportar como PNG", gerando um arquivo com o conteúdo atual do dashboard (métricas + widgets).
- Botão **Histórico** (ícone de relógio): abre um painel de dados históricos por mês, onde é possível registrar, editar ou excluir valores manuais para períodos passados (contador mostra quantos meses têm dados manuais preenchidos).
- Botão **Compartilhar** (ícone de compartilhamento): abre o painel de compartilhamento público do dashboard, com abas "Permissão" (visualizar/comentar), "PIN" (proteção por senha) e "Expiração" (validade do link), além de botão para copiar o link gerado.
- Botão **Editar**: abre o painel de edição do dashboard, onde é possível reordenar widgets por arraste, alternar entre os modos "Remover" (excluir widgets do painel) e "Adicionar" (incluir novos widgets da biblioteca disponível), renomear o dashboard e salvar ou cancelar as alterações.
- Cada **widget individual** tem seus próprios controles no cabeçalho: seletor de período específico do widget (ou usar o período global), botão "Ver detalhes" (abre modal com dados ampliados do widget), botão "Compartilhar widget" (gera link específico daquele widget) e botão "Exportar" (PNG ou PDF apenas daquele widget).
- Widgets de listas (ex.: Atividades Recentes) trazem um link **"Ver todas"** que navega para a página completa correspondente (ex.: `/admin/activity`); outros widgets semelhantes linkam para `/admin/permissoes` e `/admin/nomades`.
- Os **cards de KPI** (usuários, empresas, projetos, faturamento, avaliação média, pagamentos pendentes, produtos, etc.) são clicáveis: cada clique navega para a página de gestão relacionada (ex.: card de Empresas leva a `/admin/empresas`, card de Financeiro/Faturamento leva a `/admin/financeiro`, card de Projetos leva a `/admin/projetos`).

### Configuração de Dashboard (/admin/dashboard-config)

Tela para configurar quais widgets aparecem no dashboard de cada tipo de conta da plataforma (Empresas, Agências, Nômades, Administradores); atualmente opera sobre dados de exemplo carregados localmente, sem persistir em backend real.

- As abas "Empresas", "Agências", "Nômades" e "Administradores" alternam qual layout de widgets é exibido e editado.
- O botão "Novo Widget" abre um formulário para criar um widget: título, tipo (Estatísticas, Gráfico, Tabela, Atividades, Progresso ou Métrica), posição X/Y, largura/altura e um interruptor "Widget visível por padrão"; o botão "Criar Widget" adiciona o novo widget à lista do layout selecionado.
- Em cada widget listado, o ícone de olho alterna sua visibilidade (widgets ocultos aparecem esmaecidos na lista).
- Em cada widget listado, o ícone de lixeira remove o widget do layout selecionado.
- Em cada widget listado, o ícone de lápis seleciona o widget para edição.
- O botão "Configurações Globais" no cabeçalho é apenas informativo (sem ação associada no momento).

### Usuários (/admin/usuarios)

Lista central de todos os usuários da plataforma (admins, empresas, agências, parceiros, líderes), permitindo consultar, filtrar, criar, bloquear/desbloquear, excluir e ver detalhes completos de cada conta.

- Botão "Novo Usuário" abre um painel lateral para cadastrar um novo usuário na plataforma.
- Campo de busca ("Nome, e-mail ou telefone...") filtra a lista em tempo real e exibe sugestões clicáveis com avatar, nome e e-mail do usuário.
- Botões de status "Ativos" / "Inativos" / "Todos" alternam o filtro principal da listagem.
- Botão "Filtros" abre o painel de Filtros Avançados (identificação, tipo e função, vínculo de perfil, datas de cadastro/acesso/atualização, métricas de score/nível/avaliação, dados complementares como empresa vinculada, carteira e plano), com opções para salvar o conjunto de filtros com nome, atualizar um filtro salvo, salvar como novo, reordenar filtros salvos por arraste, e aplicar ou cancelar os filtros.
- Botão "Configurar colunas" abre um painel para marcar/desmarcar quais colunas da tabela ficam visíveis.
- Cabeçalhos de colunas (código, contato, tipo/função, etc.) são clicáveis para ordenar a tabela.
- Seletor de itens por página e paginação numerada controlam a quantidade e navegação de resultados exibidos.
- Botão "Exportar" (ícone no cabeçalho da página) exporta os dados da página atual.
- Cada linha da tabela tem um conjunto de ações fixas à esquerda: um botão "+" e o ícone de olho ("Ver Detalhes") abrem, respectivamente, um modal resumido com as informações do usuário ou o painel completo de detalhes (dados da conta, permissões, redefinição de senha, autenticação em duas etapas, sessões ativas e dispositivos); um ícone de bloquear/desbloquear alterna o acesso do usuário à plataforma mediante confirmação; e um ícone de excluir (desabilitado quando não permitido) remove o usuário após confirmação com motivo obrigatório de exclusão (mínimo de 10 caracteres).
- Na coluna de contato, ícones de telefone e WhatsApp abrem, respectivamente, o discador do telefone e o WhatsApp com o número do usuário.
- No modal de detalhes resumido ("+"), o link "Alterar vínculo" (disponível apenas para usuários do tipo Empresa) abre um painel para vincular ou alterar a empresa associada ao usuário; clicar no avatar do usuário abre uma visualização ampliada da foto.

### Usuários Internos (/admin/usuarios-internos)

Tela de gestão dos usuários internos (equipe/colaboradores) da plataforma Allka, com indicadores de equipe, busca/filtro por departamento e cadastro de novos usuários; atualmente exibe dados de exemplo fixos, sem integração com backend real.

- Os 4 cartões de indicadores (Total de Usuários, Usuários Ativos, Departamentos, Média de Acesso) são apenas informativos, sem interação de clique.
- O botão "Novo Usuário" abre um formulário para cadastrar um usuário interno: nome completo, e-mail, telefone, cargo, departamento (Operações, Tecnologia, Financeiro, Marketing ou Recursos Humanos) e permissões (Administrador, Gerente ou Usuário); o botão "Adicionar Usuário" confirma o cadastro e "Cancelar" fecha o formulário sem salvar.
- O campo de busca filtra a lista de usuários por texto digitado.
- O seletor "Departamento" filtra a lista de usuários pelo departamento selecionado (ou "Todos os Departamentos").
- Cada usuário listado exibe avatar, nome, status (Ativo/Inativo/Férias), cargo, departamento, e-mail, telefone, último acesso e badges das permissões atribuídas.
- Em cada usuário listado, os botões de editar e excluir estão presentes na interface para ações de edição e remoção do usuário.

### Empresas (/admin/empresas)

Lista e gerencia todas as empresas cadastradas na plataforma, com busca, filtros avançados, configuração de colunas e cadastro/edição/exclusão de registros.

- O botão "Nova Empresa" abre um formulário que cria a empresa junto com seu usuário principal (administrador), em uma única operação, pedindo nome da empresa, nome, e-mail, senha e telefone (opcional) do responsável.
- O botão de exportação (`ExportButton`) gera uma exportação da tabela exibida na página.
- O campo de busca filtra por nome, ID, e-mail, CNPJ ou telefone e mostra sugestões de autocompletar conforme o usuário digita; clicar em uma sugestão preenche a busca com o nome da empresa selecionada.
- O botão de filtro ("Filtros avançados") abre um painel deslizante com campos como nome, CNPJ, e-mail, telefone/WhatsApp, cidade/estado, tipo de conta, status, plano, nível de parceiro, faixa de usuários/projetos, data de cadastro e IDs de integração (Bitrix/Asaas); permite escolher quais campos ficam visíveis no painel, salvar/atualizar/renomear/excluir filtros salvos (reordenáveis por arraste), limpar todos os filtros e aplicar ou cancelar as alterações.
- O botão "Configurar colunas" abre um painel para marcar/desmarcar quais colunas da tabela ficam visíveis, com opções para restaurar o padrão ou mostrar todas as colunas.
- O seletor de itens por página e a paginação (anterior/próxima, ir para página específica) controlam quantas empresas são exibidas por vez.
- Em cada linha da tabela, os ícones de ação permitem: abrir um painel "Mais informações" com resumo de projetos (por status) e usuários da empresa; "Ver detalhes" (abre o painel de visualização da empresa); e "Editar empresa" (abre o painel de edição). O badge "Sem DPO" exibido quando a empresa não tem Encarregado de Proteção de Dados cadastrado também é clicável e leva direto para a edição da empresa.
- Dentro do painel "Mais informações" há botões para "Editar empresa" e "Excluir empresa" (este último abre uma confirmação antes de excluir definitivamente o registro).

### Gestão de Agências (/admin/agencias)

Lista todas as agências parceiras cadastradas na plataforma, permitindo cadastrar novas agências (já com o usuário administrador vinculado) e editar os dados das existentes.

- Botão "Nova Agência" abre um formulário que cria, na mesma operação, a agência e o usuário principal (sempre com papel de administrador da agência), pedindo nome da agência, nome e e-mail do responsável, senha de acesso (mínimo 6 caracteres) e telefone opcional.
- Campo de busca filtra a lista por nome, e-mail ou telefone da agência.
- Seletor de status filtra entre Todas, Ativas, Inativas e Pendentes.
- Cada card de agência exibe status, nível de parceria (Bronze a Diamond), e-mail, telefone e o administrador responsável; o botão de editar (ícone de lápis) abre um formulário para alterar nome, e-mail, telefone, status e nível da agência.
- Dois cartões de estatística no topo mostram o total de agências cadastradas e o total de agências ativas (com o percentual sobre o total).

### Clientes (/admin/clientes)

Tabela com todos os clientes reais da plataforma (entidade própria, independente de "Company"), mostrando a qual Agency, Company ou Partner cada um está vinculado, com opção de cadastro, edição e configuração de exibição.

- Botão "Criar novo cliente" abre um painel lateral com formulário completo (nome/razão social, tipo PJ/PF, documento, e-mail, telefone, segmento, website, status, endereço completo, observações) e uma seção de "Vínculo" para associar o cliente a uma Agency, Company, Partner ou deixá-lo sem vínculo.
- Botão de editar (ícone de lápis) em cada linha abre o mesmo painel pré-preenchido para alterar os dados e o vínculo do cliente.
- Botão "+" em cada linha abre um painel de informações detalhadas somente leitura do cliente (contato, documento, status, vínculo, endereço, data de cadastro e observações).
- Campo de busca com sugestões (autocomplete) filtra por nome, e-mail, documento ou código sequencial (ex: cli_00001), clicável para aplicar a busca direto.
- Botão de filtros (ícone de funil) abre painel lateral para filtrar a lista por status (Ativo, Inativo, Prospecto).
- Botão de configurar colunas (ícone de engrenagem) abre painel para exibir/ocultar colunas da tabela (Cliente, Segmento, Contato, Tipo, Vínculo, Status, Cadastro).
- Cabeçalhos de coluna permitem ordenar e aplicar filtro por coluna (ordenação clicável e filtro em colunas como Status).
- Botão de exportação ("ExportButton") gera exportação da página atual da tabela.
- Controles de paginação (anterior/próxima, números de página, campo "Ir para página") e seletor de itens por página no topo e no rodapé da tabela.
- Quatro cartões de estatística no topo mostram total de clientes, total de Pessoa Jurídica, total de Pessoa Física e total de clientes ativos.

### Gestão de Nômades (/admin/nomades)

Página (sem entrada no menu lateral principal) para o Admin visualizar e gerenciar os "Nômades" (freelancers/especialistas) cadastrados na plataforma, com busca, filtros avançados e ações de contato, visualização e edição por nômade.

- Campo de busca filtra nômades por nome ou e-mail.
- Seletor de nível filtra por Bronze, Silver, Gold, Platinum, Diamond ou Leader.
- Seletor de status filtra por Cadastrado, Teste Pendente, Ativo, Atenção, Sem Tarefas, Inativo ou Reprovado.
- Botão "Filtros Avançados" expande um painel com: filtro de status online (Online/Offline/Ocupado/Ausente), filtro por intervalo de data de cadastro, filtro por intervalo de data de último acesso, e filtros multi-seleção por Produtos, Categorias e Tipos de Tarefa (badges clicáveis); botão "Limpar Filtros" reseta todos esses filtros avançados de uma vez.
- Em cada nômade da lista: botão de telefone liga (abre discador via `tel:`), botão de WhatsApp abre conversa (`wa.me`) e botão de e-mail abre o cliente de e-mail padrão (`mailto:`).
- Botão de visualizar (ícone de olho) abre modal com o perfil detalhado do nômade, de onde também é possível enviar um convite ao nômade ou seguir direto para a edição.
- Botão de editar (ícone de lápis) abre modal para atualizar os dados do nômade e salvar as alterações.
- Bloco de widgets de métricas ("NomadMetricsWidgets") exibe indicadores agregados sobre os nômades no topo da página.

### Projetos (/admin/projetos)

Central de gestão de todos os projetos da plataforma, com indicadores gerais, lista/kanban/planejador de acompanhamento e ações completas de criação, edição, pagamento, duplicação e cancelamento de projetos.

- O botão "Novo Projeto" abre o wizard completo de criação de projeto (seleção de cliente/produtos e checkout).
- O botão de exportação ("ExportButton") permite exportar os dados da página em CSV, Excel ou PDF.
- Os cards de estatísticas no topo mostram Total de Projetos, Em Andamento, Concluídos e MRR; o acordeon "Estatísticas e Métricas" expande KPIs adicionais com filtro de período e origem (lead).
- O banner "X projetos pendentes" lista rascunhos, projetos aguardando aprovação ou pagamento; o botão "Ver todos" abre um painel lateral com busca por nome/cliente e ações rápidas "Continuar", "Aprovar" ou "Pagar Agora" para cada projeto.
- Os botões "Lista", "Kanban" e "Planejador" alternam o modo de visualização da tabela de projetos.
- O campo de busca filtra projetos por nome ou cliente em tempo real.
- O botão de filtro (ícone) abre o modal "Filtros Avançados", com filtros por status, tipo (MRR/Avulso), origem (lead/outros), status de pagamento (em dia/inadimplente), faixa de valor (R$) e volume de tarefas; permite salvar, aplicar, reordenar (arrastar) e excluir filtros salvos, além de escolher quais campos de filtro ficam visíveis e limpar todos os filtros.
- O botão "Configurar colunas" abre um painel para escolher quais colunas aparecem na tabela.
- Clicar em uma linha da tabela abre o detalhe do projeto (modal com abas, ex.: dashboard); as ações por linha variam conforme o status do projeto: rascunhos têm "Continuar rascunho" e "Descartar"; projetos aguardando pagamento têm "Ir para Pagamento", "Visualizar" e "Cancelar"; os demais têm "Visualizar", "Duplicar" e "Cancelar".
- O ícone de vínculo (visível apenas para Admin) na coluna "Conta responsável" abre o painel "Alterar vínculo", permitindo associar o projeto a uma Agency, Company, Partner ou remover o vínculo.
- A ação "Duplicar" abre o painel "Duplicar Projeto", onde é possível nomear a cópia e escolher o que incluir (equipe/usuários, produtos, cofre de acessos, orçamento); o botão "Abrir para Editar" cria a cópia e leva para a tela de criação para revisão.
- A ação "Cancelar" abre um wizard de cancelamento em 3 etapas (confirmação com motivo opcional, alerta de alternativas como pausar/ajustar orçamento, e confirmação final), finalizando com o botão que marca o projeto como cancelado.
- No modo Kanban, é possível arrastar projetos entre colunas de status, criar uma nova coluna ("Nova Coluna"), e editar ou excluir colunas existentes.
- No modo Planejador, é possível criar uma nova coluna ("Nova Coluna") e criar/editar cartões de tarefa (título, descrição, prioridade, data limite, coluna e vínculo opcional a um projeto), com opção de excluir o cartão.
- A paginação no rodapé da tabela permite navegar entre páginas ou pular diretamente para uma página específica.

### Tarefas (/admin/tarefas)

Tela central de acompanhamento de todas as tarefas operacionais da plataforma (geradas automaticamente quando produtos são vinculados a projetos), reunindo indicadores, tabela detalhada, filtros avançados e ações de fluxo como lançamento, atribuição de nômade e mudança de status.

- O botão de atualizar no cabeçalho ("Atualizar") recarrega a lista de tarefas a partir do servidor.
- Os 8 cartões de indicadores (Total, Para lançamento, Em lançamento, Em execução, Em aprovação, Atrasadas, Concluídas, Aguardando nômade) funcionam como atalhos: clicar em um deles aplica automaticamente o filtro correspondente na tabela e limpa a busca de texto.
- O campo de busca filtra em tempo real por tarefa, projeto, cliente, produto, código, nômade ou agência responsável, com botão para limpar a busca.
- O botão "Filtros" abre um painel lateral com filtros avançados: ID/código/nome da tarefa, status/grupo/prioridade, projeto/empresa/produto/nômade/agência/líder/categoria, faixas de data (início, prazo, execução, criação, conclusão) e sinalizadores de alerta (atrasada, emergencial, desqualificada, prestes a vencer lançamento/aprovação/prazo, execução/aprovação/qualificação/revisão atrasada); o próprio botão mostra quantos filtros estão ativos.
- O botão "Configurar colunas" abre um painel lateral para marcar/desmarcar quais colunas aparecem na tabela (Ações, ID, Código, Tarefa, Projeto, Cliente, Resp. Agência, Produto, Status, Nômade, Líder, Prazo entrega, Prazo execução, Atraso, Prioridade), com atalho "Mostrar todas".
- Os cabeçalhos de coluna permitem ordenar a tabela por código, tarefa, projeto, cliente, produto, status, nômade, agência, prazo, execução, prioridade ou atraso.
- O seletor de itens por página e a paginação numerada (incluindo campo "ir para página") controlam a navegação pela lista de tarefas.
- Em cada linha, o ícone de olho ("Ver detalhes") — assim como clicar no título da tarefa — abre um painel lateral com os detalhes completos da tarefa.
- O menu de ações (três pontos) de cada linha reúne: "Ver detalhes"; "Lançar tarefa" (abre o fluxo de lançamento — só disponível quando o status é Para lançamento, Em lançamento, Aguardando informações ou Aguardando etapa); "Atribuir nômade" (abre diálogo de busca e seleção de nômade); "Pausar tarefa"/"Retomar tarefa" (alterna conforme o status atual); "Devolver tarefa" (retorna o status para "Para lançamento"); submenu "Alterar status" com todos os status possíveis do fluxo; e "Abrir projeto" (abre painel lateral com os dados do projeto vinculado).
- Quando a tarefa não tem nômade atribuído, a coluna Nômade mostra um link "Atribuir" que abre o mesmo diálogo de atribuição de nômade.
- No diálogo de atribuição, é possível buscar nômades ativos por nome ou e-mail e confirmar a atribuição de um deles à tarefa.
- As colunas de prazo e atraso destacam visualmente (cor vermelha/âmbar) tarefas atrasadas ou próximas do vencimento.

### Modelos de Tarefas (/admin/modelos-tarefas)

Gerencia os modelos reutilizáveis de tarefas que podem ser vinculados aos produtos do catálogo da plataforma.

- Botão de atualizar (ícone de recarregar) busca novamente a lista de modelos; botão "Novo Modelo" abre um painel lateral para cadastrar um modelo do zero.
- Os 4 cartões de estatística no topo ("Total de modelos", "Modelos ativos", "Vinculados a produtos", "Total de vínculos com produtos") funcionam como atalhos de filtro: clicar neles limpa os filtros atuais e, quando aplicável, já aplica o filtro de status "ativo" ou de vinculação a produtos.
- Campo de busca filtra por código, nome, categoria ou produto, com botão para limpar o texto digitado.
- Ícone "Filtros" abre um painel lateral com filtros de Status, Tipo, Categoria e Vinculação, além de filtros avançados (período de criação, período de atualização, quantidade mínima de produtos vinculados, subcategoria e complexidade), com opção de "Limpar todos os filtros".
- Ícone "Configurar colunas" abre um painel para marcar/desmarcar quais colunas da tabela ficam visíveis, com botões "Restaurar padrão" e "Mostrar todas".
- Seletor de itens por página e paginação numerada (setas anterior/próxima e ir para página) controlam a navegação da tabela, replicados no topo e no rodapé da lista.
- Em cada linha da tabela: o botão "+" abre um painel lateral somente leitura com mais informações do modelo; o ícone de olho (ou clicar no nome do modelo / no link de produtos vinculados) abre um painel de detalhes completo (drawer) com abas "Visão Geral", "Etapas & Checklist", "Briefing" e "Produtos"; o menu de mais ações (três pontos) permite "Duplicar modelo" (cria uma cópia com status "em revisão"), "Marcar como ativo", "Marcar como inativo" e "Enviar p/ revisão"; a coluna Status também tem um seletor inline para trocar o status diretamente na tabela.
- No rodapé do painel de detalhes é possível "Fechar" o painel, "Duplicar" o modelo, alternar entre "Ativar"/"Inativar" (oculto quando o modelo já está em revisão) e enviar o modelo para "Revisar" (oculto quando já está em revisão).
- No painel "Novo Modelo", o cadastro é dividido em três abas: "Informações" (nome, categoria, subcategoria, tipo de tarefa, prioridade e complexidade padrão, entre outros campos), "Etapas & Checklist" (adicionar/remover itens de etapas e de checklist) e "Briefing & Regras" (adicionar/remover perguntas de briefing, arquivos exigidos, regras de execução e regras de conclusão); o rodapé tem os botões "Cancelar" e "Criar modelo" (habilitado somente após preencher nome e categoria).

### Financeiro (/admin/financeiro)

Central financeira da plataforma: acompanha faturas, saques, despesas, carteiras (saldos), o plano Squad e a conciliação bancária, com indicadores (KPIs) e um DRE por período.

- Botão "Exportar" (ExportButton) no topo gera a exportação da página atual (financeiro) para arquivo.
- Botão "Nova Fatura" (ou "Nova Despesa" quando a aba Despesas está ativa) abre o painel lateral de criação correspondente.
- Accordion "Relatório por Período": permite escolher um intervalo de datas (AdvancedDateFilter) e exibe o DRE (Receita Bruta, Custos Diretos, Lucro Bruto, Despesas Operacionais por categoria, Lucro Operacional) e o total de faturas por status no período selecionado.
- Seletor de abas no topo da tabela alterna entre "Faturas", "Saques", "Despesas", "Carteiras", "Squad" e "Conciliação" (cada uma com contador de itens/pendências no ícone da aba).
- Barra de busca, seletor de itens por página e botão "Filtros" (com contador de filtros ativos) são compartilhados entre as abas Faturas, Saques, Despesas e Carteiras.
- Botão "Configurar colunas" (aba Faturas) abre painel para marcar/desmarcar colunas visíveis da tabela, com ações "Restaurar padrão" e "Mostrar todas".
- Botão de engrenagem (Ações rápidas) oferece atalhos contextuais por aba: "Atualizar dados", "Limpar filtros", "Nova fatura"/"Nova despesa" e "Atualizar carteiras".
- **Aba Faturas**: tabela lista faturas com ações por linha para marcar como pago, marcar em atraso, editar (abre painel de edição) e cancelar/excluir (excluir some com confirmação em diálogo); há paginação e ordenação por colunas.
- **Aba Saques**: dividida em duas sub-abas, "Nômades" e "Partners", cada uma com chips de status clicáveis para filtrar (Aguardando, Agendado/Aprovado, Pago, Reprovado, Cancelado). Por linha é possível aprovar, reprovar (com campo de motivo) e, na sub-aba Partners, também marcar como pago.
- **Aba Despesas**: cartões de KPI (Total Geral, Pagas, Pendentes, Atrasadas, Fixas, Variáveis) e chips de status filtráveis; por linha é possível marcar como paga, editar e excluir (com confirmação).
- **Aba Carteiras**: filtro de período para os widgets, cartões de saldo (Total, Bloqueado, Ativas, Líquido), blocos clicáveis de Créditos e Débitos por categoria (Bônus, Crédito adicional, Plano, Projetos recorrentes, Comissões, Saques etc.) que abrem o extrato consolidado (razão global) filtrado por tipo, seletor de horizonte de projeção (7/30/60/90 dias) com cartões "Créditos futuros" e "Débitos futuros" que abrem o painel de projeções, chips de filtro por perfil do titular, e tabela de carteiras com ação "Extrato" (abre o razão da carteira) e "Lançar ajuste" (abre modal de crédito/débito manual).
- **Aba Squad**: cartões com estatísticas do plano (clientes ativos, limite total, crédito utilizado/disponível, mínimo mensal, faturas abertas/vencidas, ciclos abertos); botão "Adicionar empresa" abre painel para incluir uma empresa no plano Squad; por linha há ações "Ciclo" (abre detalhe do ciclo vigente, com botão "Fechar ciclo e gerar fatura") e "Editar Squad" (reabre o mesmo painel preenchido para edição).
- **Aba Conciliação**: aviso explicando o escopo (só movimentações com entrada/saída real de dinheiro); filtros de período, impacto (Todas/Entradas/Saídas), origem e perfil do titular; cartões de resumo (entradas, saídas, saldo líquido real, total de transações); tabela de movimentações com ação "Carteira" por linha, que abre o extrato da carteira correspondente.
- Modal "Filtros Avançados" (compartilhado): permite salvar/aplicar filtros nomeados, alternar entre seções por aba e aplicar ("Aplicar Filtros") ou limpar todos os filtros.

### Precificação (/admin/precificacao)

Central de configuração das regras de precificação da plataforma: comissões, taxas, impostos e visualização dos custos por hora das especialidades, organizados em abas.

- Aba "Taxas e Comissões" lista os componentes de precificação em três seções (Comissões, Taxas, Impostos), cada uma com botão "Adicionar Comissão" / "Adicionar Taxa" / "Adicionar Imposto" que abre um painel lateral de formulário.
- No formulário de componente: campos de nome, valor (percentual ou fixo) e descrição; para comissões, seleção do tipo de empresa (Agências Partners ou Nômades, que determina os níveis disponíveis) e da "Base de Aplicação" (Valor Final, Valor sem Taxas e Impostos, Valor sem Impostos ou Valor do Especialista); seleção dos níveis aos quais o componente se aplica (via checkboxes); alternância de "Status Ativo"; botões "Cancelar" e "Adicionar"/"Atualizar" para salvar.
- Em cada card de componente: um switch liga/desliga o componente diretamente na lista, botão de editar (ícone de lápis) reabre o formulário preenchido, e botão de excluir (ícone de lixeira) abre um diálogo de confirmação antes de remover o componente definitivamente.
- Aba "Especialidades" mostra uma tabela somente leitura com o custo por hora de cada especialidade por nível (Iniciante, Júnior, Pleno, Sênior) e o número de nômades ativos; botão "Gerenciar" leva para a página `/admin/especialidades`, onde a edição de fato acontece.
- Bloco expansível "Estatísticas e Métricas" no topo mostra contadores de comissões ativas, taxas ativas, impostos ativos e total de componentes cadastrados.

### Gestão de Comissionamentos (/admin/comissionamentos)

Página para configurar a remuneração dos líderes de categoria: salário fixo, taxa de comissão e regras globais que limitam esses valores. Todos os dados exibidos (categorias, valores, líderes) são fixos/mockados no código — não há chamadas reais de API, então nenhuma ação de salvar persiste dados de fato.

- O botão "Configurações Globais" no cabeçalho abre um modal para editar os parâmetros gerais: salário mínimo/máximo, faixa de comissão mínima/máxima, threshold e taxa de bônus do líder; "Salvar Configurações" ou "Cancelar" fecham o modal.
- A aba "Categorias e Líderes" lista cada categoria (Design Gráfico, Copywriting, Social Media, etc.) em um cartão com líder atual, salário fixo, comissão, número de nômades ativos e receita mensal.
- Para categorias sem líder atribuído ("Pendente"), o botão "Atribuir Líder" abre um modal para selecionar um nômade qualificado em um dropdown e definir salário fixo e taxa de comissão (respeitando a faixa das configurações globais), confirmando com "Confirmar Atribuição".
- Para categorias já com líder, o botão "Editar" abre um modal para ajustar o salário fixo e a taxa de comissão do líder atual, com "Salvar Alterações" ou "Cancelar".
- A aba "Performance e Relatórios" mostra cartões-resumo (total pago em salários, total em comissões, líderes ativos, receita total) e uma tabela detalhada por líder com colunas ordenáveis (Líder, Categoria, Salário Fixo, Comissão, Total Ganho, Receita Gerada, ROI) e filtro por categoria na coluna "Categoria".

### Relatórios (/admin/relatorios)

Central de relatórios administrativos organizada em um catálogo de 23 relatórios pré-definidos, agrupados em seis categorias (Financeiro, Operações, Usuários e Clientes, Gamificação, Marketing, Sistema), além de uma biblioteca de indicadores e uma área de configuração de permissões por relatório. KPIs do topo e dados de resumo vêm de chamadas reais à API (`getDashboardStats`, `getReportSummary`).

- O botão de atualizar (ícone circular no cabeçalho) recarrega as estatísticas e o resumo dos relatórios.
- A faixa de KPIs no topo mostra contagens reais de Empresas, Projetos, Nômades, Tarefas, Faturas e Receita Paga.
- A aba "Visão Geral" exibe um painel de resumo (Top Nômades, Tarefas por status, Projetos por status) e as seções de categorias de relatórios; cada categoria pode ser recolhida/expandida clicando no cabeçalho.
- Dentro de "Visão Geral", é possível buscar relatórios por nome/descrição, filtrar por categoria e por período (7/30/90 dias, 1 ano) e limpar os filtros com o botão "Limpar".
- Cada cartão de relatório tem os botões "Visualizar" e "Baixar" (ícone de download, gera o primeiro formato disponível do relatório) e um botão de engrenagem ("Configurar permissões") que abre um modal para definir quem pode acessar aquele relatório.
- A aba "Indicadores" abre a Biblioteca de Indicadores, com busca por nome/descrição, filtro por categoria e por disponibilidade de dados (Disponível/Parcial/Indisponível), exibindo os indicadores agrupados por categoria.
- A aba "Configurações" lista as configurações de acesso já criadas para os relatórios (uma tabela com colunas Relatório, Status, Escopo, Perfis com acesso e Permissões); nela é possível buscar, filtrar por status e escopo, ativar/desativar cada configuração pelo switch de Status, editar permissões (ícone de engrenagem) ou remover a configuração (ícone de lixeira, com confirmação).
- Ainda na aba "Configurações", o botão "Nova configuração" (no cabeçalho, exclusivo dessa aba) e o botão "Nova configuração" na tela vazia abrem o painel de criação/edição de configuração de relatório; quando não há nenhuma configuração cadastrada, o botão "Importar catálogo (23 relatórios)" cria automaticamente uma configuração padrão para todos os relatórios do catálogo.

### Sistema (/admin/sistema)

Painel de monitoramento e administração técnica da plataforma: métricas de performance, status de serviços, logs, conectores de integração externa (com trilha de conformidade LGPD) e configurações operacionais. A maior parte dos dados (métricas de CPU/memória/disco, serviços, logs, conectores) é simulada/mockada no código, exceto os cartões de topo (Nômades, Empresas, Projetos Ativos), que vêm de `getDashboardStats`.

- O botão de atualizar no cabeçalho recarrega as métricas de performance (CPU, memória, disco, tempo de resposta) com valores simulados.
- Aba "Performance": exibe medidores (gauge) de uso de CPU, memória e disco, e o tempo médio de resposta da API; sem ações além da leitura.
- Aba "Serviços": tabela com o status de cada serviço (API, Banco de Dados, Prisma, E-mail, Armazenamento, WebSocket/Chat), com colunas ordenáveis (Serviço, Reiniciado, Uptime, Status).
- Aba "Logs": tabela de logs do sistema com colunas ordenáveis (Nível, Mensagem, Quando) e filtro por nível de severidade (Todos/Info/Aviso/Erro).
- Aba "Conectores": lista os conectores de integração (OpenAI, Google Workspace, WhatsApp Business, Stripe, SendGrid, Slack, Redrive CRM, Bitrix24) em cartões, com busca por nome/categoria e filtro por status (Todos/Conectado/Em teste/Desconectado/Não configurado); cada cartão pode expandir para mostrar a lista de capacidades do conector, e tem os botões "Editar" (abre modal para editar nome, URL base, chave de API, finalidade, base legal LGPD, retenção, status de DPA e país de transferência), "Testar" (simula um teste de conectividade), "Desconectar" (com confirmação, marca o conector como desconectado) e "Excluir" (com confirmação irreversível, remove o conector da lista).
- Ainda na aba "Conectores", a seção "Registro de atividade" mostra cartões de estatística (Total de Registros, Sucesso, Erros, Conectores Únicos) e uma tabela paginada e ordenável dos eventos de cada conector, com busca por conector/usuário/resultado, filtro lateral por conector e por tipo de ação, seletor de itens por página, navegação de páginas e um botão de "Ver detalhes" (ícone de olho) que abre um painel lateral com os dados completos do registro selecionado.
- Também na aba "Conectores", a seção "Conformidade LGPD" mostra um score geral de conformidade, indicadores de base legal/finalidade/DPA/transferência internacional documentados, e um checklist de requisitos para participação no programa Conecta Sebrae — apenas leitura, sem ações.
- Aba "Configurações": possui dois switches em "Operação" — "Modo de Manutenção" (desabilita acesso temporariamente) e "Modo Debug" (ativa logs detalhados) — e três botões em "Ações do Sistema": "Backup Manual" (gera snapshot do banco), "Limpar Cache" (remove dados em cache) e "Exportar Logs" (baixa logs das últimas 24h); todas essas ações apenas disparam uma notificação (toast) simulada, sem efeito real no backend.

### Catálogo de Produtos (/admin/catalogo-produtos)

Página que exibe o catálogo de produtos ativos da mesma forma que os clientes o veem, permitindo ao admin navegar, filtrar e simular a montagem de um carrinho/cesta de projeto. O conteúdo principal vem do componente compartilhado `ProductCatalogView` (`components/product-catalog-view.tsx`), usado em modo `page`.

- Campo de busca ("Buscar produtos, tags...") — filtra produtos por nome, descrição ou tags; botão "x" limpa a busca.
- Dropdown "Ordenar" — reordena a lista por: Mais relevantes, Mais vendidos, Melhor avaliados, Menor preço, Maior preço, Nome (A-Z/Z-A).
- Botão "Filtros" — abre um painel lateral (SlidePanel) de Filtros Avançados, com contador de filtros ativos.
- Seletor de modo de exibição (2/3/4/5 colunas ou Lista) — alterna o layout de grade dos cards de produto.
- Chips rápidos de atalho — "Mais vendidos", "Melhor avaliados", "Menor preço", "Maior preço", "Avulso", "Mensal", "Com mais opções" — aplicam/alternam ordenação ou filtro de recorrência/variações com um clique; botão "Redefinir" limpa esses atalhos.
- Pílulas de categoria (Todos + cada categoria) — filtram os produtos pela categoria selecionada, mostrando a contagem de itens.
- Dropdown "Tipo" (Recorrência) — filtra por Todos os tipos / Mensal / Avulso-Único.
- Dropdown "Variações" — filtra por Qualquer / Com variações / Sem variações.
- Botão "Limpar filtros" — reseta busca, categoria, ordenação e filtros de recorrência/variações de uma vez.
- Card/linha de produto — botão "Ver detalhes"/"Detalhes" abre a ficha completa do produto (`ProductDetailSheet`); botão "Escolher"/"Escolher opção" adiciona o produto à cesta (ou abre a ficha para escolher variação, quando aplicável); quando o produto já está selecionado, aparecem controles "-"/"+" de quantidade e "Remover"/"X" para tirar da cesta. Produtos sem tarefas operacionais vinculadas ficam desabilitados ("Escolher" cinza) com tooltip explicando o motivo.
- Barra fixa inferior do carrinho (quando há itens na cesta) — mostra total e permite continuar comprando, limpar a cesta, ajustar quantidades/remover itens e seguir para o próximo passo (associar a um projeto ou abrir a cesta).
- Painel "Filtros Avançados" (SlidePanel) — lista de filtros salvos (arrastar para reordenar, editar nome, excluir); botão "Salvar filtro" grava a combinação atual de categoria/recorrência/variações/ordenação com um nome; botões "Limpar filtros", "Cancelar" e "Aplicar Filtros" no rodapé.

> ⚠️ **Pendente:** `/admin/produtos` (CRUD real do catálogo de produtos, distinto da vitrine acima) ainda não foi documentado — arquivo grande (~9.000 linhas).

### Especialidades (/admin/especialidades)

Cadastro central de especialidades usadas na plataforma, com valor por hora e, opcionalmente, uma integração de IA vinculada para execução automática de tarefas.

- Cabeçalho: botão "Atualizar" (recarrega a lista via API), botão de exportar (ExportButton, gera exportação da página) e botão "Nova Especialidade" (abre painel lateral em modo de criação).
- 4 cards de estatísticas no topo: Total, Ativas, Categorias (contagem de categorias distintas) e Média R$/h (calculada sobre todas as especialidades).
- Barra de busca com autocomplete: busca por nome, categoria ou descrição, com debounce de 300ms; ao focar exibe até 6 sugestões clicáveis que preenchem a busca ao serem clicadas.
- Botão "Filtros" abre painel lateral com filtro único de Status: Ativas, Inativas ou Com IA (filtro exclusivo, seleciona um por vez).
- Botão "Configurar colunas" abre painel lateral com checkboxes para mostrar/ocultar colunas da tabela (Especialidade, Categoria, Descrição, R$/h, IA, Status, Criado em); colunas visíveis por padrão excluem "Criado em".
- Cabeçalhos de coluna são ordenáveis (clique ordena asc/desc) e têm tooltip explicativo (ícone "ⓘ").
- Seletor de itens por página (topo e rodapé da tabela) e paginação numerada com botões anterior/próxima, além de campo para "ir direto" a uma página.
- Cada linha da tabela tem três ações: "Ver detalhes" (olho, abre painel em modo somente leitura), "Editar especialidade" (lápis, abre painel em modo edição) e "Remover especialidade" (lixeira, abre diálogo de confirmação antes de excluir).
- Painel de criação/edição/visualização tem 3 seções: (1) Dados da Especialidade — nome, categoria, valor por hora, descrição, habilidades necessárias (separadas por vírgula); (2) Integração com IA — switch para habilitar, seleção de provedor (OpenAI, Anthropic Claude, Google Gemini, Groq ou API Personalizada), seleção/campo de modelo (lista de modelos do provedor ou campo livre para "custom"), campo de instruções para a IA que serão enviadas como contexto em cada tarefa; (3) Configurações — switch "Especialidade Ativa" que controla se aparece em filtros e formulários da plataforma.
- No modo visualização, o botão de rodapé vira "Editar" (troca para modo edição sem fechar o painel); no modo edição/criação, botão salva via API (criar ou atualizar) e recarrega a lista.
- Exclusão passa por diálogo de confirmação ("Remover Especialidade") antes de chamar a API de delete.

### Níveis Agências (/admin/niveis)

Configura os 5 níveis do Programa Allka Partners (Bronze a Diamond), definindo critérios de progressão por MRR/agências lideradas, comissões, descontos e benefícios exibidos aos parceiros.

- Cabeçalho com botão "Novo Nível", que abre painel lateral em branco (com valores padrão) para criar um nível.
- Lista de cards, um por nível, cada um mostrando: ícone/cor do nível, ordem, badges condicionais ("Requer Partner" e "Leads Premium"), critérios de progressão (faixa de MRR de consumo, agências lideradas mínimas ativas, MRR das lideradas, limite de projeto premium), badges de vantagem (percentual de comissão sobre MRR das lideradas, desconto adicional nas contratações, créditos bônus ao subir de nível) e lista de benefícios desbloqueados.
- Cada card tem dois botões de ação: "Editar" (lápis, abre o painel preenchido com os dados do nível) e "Excluir" (lixeira, abre diálogo de confirmação antes de remover).
- Painel lateral de criação/edição (LevelForm) contém: preview ao vivo do nível (ícone, nome, descrição, badges de comissão/leads premium, cor); seção Identidade com nome, ícone (campo livre + sugestões de emoji clicáveis) e cor (seletor de cor + presets predefinidos); campo Descrição; seção Critérios de Progressão com MRR consumo mínimo/máximo (máximo vazio = sem limite/nível máximo), agências lideradas mínimas ativas, MRR mínimo das lideradas e limite de projeto premium (vazio = acima do nível anterior); seção Regras e Benefícios com comissão sobre MRR das lideradas (%), desconto adicional nas contratações (%), créditos bônus ao atingir o nível, e dois switches — "Recebe Leads Premium" e "Requer Status Partner" (acesso mediante convite formal); lista de Benefícios com campo de texto livre, adicionados via Enter ou botão "Adicionar", cada item removível individualmente.
- Rodapé do formulário: botão "Criar nível"/"Salvar alterações" (valida nome obrigatório, MRR mínimo não-negativo, comissão e desconto entre 0–100 antes de salvar) e "Cancelar" (fecha sem salvar).
- Exclusão exige confirmação em diálogo modal destrutivo antes de remover o nível.

### Níveis Nômades (/admin/niveis-nomades)

Configura os níveis de gamificação dos nômades (freelancers) por critérios de performance (tarefas, avaliação, prazo, rejeição) e conduz a revisão trimestral de promoções/rebaixamentos.

- Duas abas no topo: "Configuração de Níveis" e "Revisão Trimestral"; o botão "Novo Nível" do cabeçalho só aparece na aba de Configuração.
- Aba Configuração de Níveis: lista de cards por nível (Bronze, Silver, Gold, Platinum, Diamond, Leader), cada um exibindo ícone/cor, badges condicionais ("Liderança" e "+X% bônus"), badge "Nível base" quando não há tarefas mínimas exigidas e não é nível de liderança, critérios de performance (tarefas mínimas por trimestre, avaliação mínima, entrega no prazo mínima, taxa de rejeição máxima), badges de recompensa (percentual de bônus nas tarefas, créditos bônus ao atingir o nível) e benefícios desbloqueados. Cada card tem botões "Editar" (abre painel preenchido) e "Excluir" (abre confirmação antes de remover).
- Painel lateral de criação/edição (LevelForm) contém: preview ao vivo; seção Identidade (nome, ícone com sugestões de emoji, cor com presets); Descrição; seção Critérios de Performance (tarefas mínimas por trimestre, avaliação mínima 0–5, entrega no prazo mínima %, taxa de rejeição máxima %); seção Recompensas (bônus nas tarefas %, créditos bônus ao atingir o nível, switch "Nível de Liderança" — nômade lidera e coordena equipe); lista de Benefícios com adição via Enter/botão "Adicionar" e remoção individual. Botões de rodapé "Criar nível"/"Salvar alterações" (com validações de nome, avaliação 0–5, rejeição e prazo 0–100, bônus 0–100) e "Cancelar".
- Aba Revisão Trimestral: 4 cards de estatísticas (Elegíveis para Promoção, Em Risco de Rebaixamento, Convites Platinum Pendentes, Última Revisão) — o card de Última Revisão tem botão "Iniciar Nova Revisão" que atualiza a data exibida para hoje.
- Filtro por nível (badges clicáveis: Todos, Bronze, Silver, Gold, Platinum, Diamond, Leader) que filtra a lista de nômades abaixo.
- Cada linha de nômade mostra identidade (avatar/iniciais, nome, badge do nível atual), métricas com barra de progresso (tarefas/90 dias, nota média, % no prazo) comparadas aos critérios mínimos de manutenção do nível, e uma badge de elegibilidade (Elegível para Promoção, Manter, Critérios não atendidos, ou Atenção necessária).
- Botões de ação por nômade (contextuais ao nível e elegibilidade, desaparecem após uma ação ser tomada): "Convidar Platinum" (nômades Gold elegíveis), "Convidar Líder" (nômades Platinum elegíveis), "Promover" (Bronze/Silver elegíveis para o próximo nível), "Rebaixar" (nômades em risco/atenção) e "Manter" (marca como mantido no nível atual). Após a ação, o card exibe uma badge de status ("Promovido", "Rebaixado" ou "Convite Enviado").
- Bloco "Pacote de Comunicação" com 4 templates de mensagem prontos (Conquista de Nível, Regresso de Nível, Convite Platinum, Convite Líder); cada template tem botão "Copiar template" que copia o texto para a área de transferência e mostra confirmação "Copiado!" por 2 segundos.

### Disponibilidade (/admin/disponibilidade)

Monitoramento em tempo real da disponibilidade de nômades por especialidade e das tarefas aguardando atendimento, usando um sistema de farol (vermelho/amarelo/verde) para sinalizar situações críticas de capacidade.

- Botão "Atualizar" (ícone de refresh no cabeçalho): recarrega nômades, especialidades e tarefas via API (spinner animado enquanto recarrega).
- Botão de exportação (ExportButton, filename "disponibilidade"): exporta a página atual.
- 6 cards KPI (gradiente, somente leitura): Nômades (total), Disponíveis, Crítico, Atenção, OK, Aguardando (tarefas na fila).
- Faixa de legenda explicando os limites do farol (verde ≥5 disponíveis, amarelo 2–4, vermelho <2).
- Duas abas: "Por Especialidade" e "Por Tarefa" — trocam a tabela exibida e resetam busca/filtro de farol ao alternar.
- Campo de busca: filtra por nome da especialidade/tarefa ou categoria.
- Pílulas de filtro por farol: Todos / Crítico / Atenção / OK — filtram as linhas pelo status calculado.
- Cabeçalhos de coluna ordenáveis (Status, Especialidade/Tarefa, Categoria, Total, Disponíveis/Aguardando Nômade, R$/h ou Aguardando há) — clique alterna ordenação asc/desc.
- Seletor de itens por página (replicado no topo e no rodapé da tabela) e barra de rolagem horizontal espelhada quando a tabela transborda.
- Controles de paginação (anterior/próxima, números de página, campo "ir para página").
- Botão "+" (Ações) em cada linha: abre painel lateral (slide panel) com a lista real dos nômades daquela especialidade (nome, e-mail, badge Disponível/Em atividade) ou das tarefas daquele grupo (projeto, cliente, nômade responsável, status).
- Rodapé da tabela com contagem total e resumo por farol (quantos itens em vermelho/amarelo/verde) — somente informativo.

### Permissões (/admin/permissoes)

Gestão de perfis de acesso (papéis) com matriz de permissões por módulo e ação, definindo o escopo de cada perfil (nenhum/próprios/todos) por módulo da plataforma. Toda a tela roda sobre dados mock fixos no código — não existe endpoint de backend para perfis de permissão ainda.

- Botão de exportação (ExportButton, filename "permissoes").
- Botão "Novo Perfil": abre o painel lateral `PermissionProfileSlidePanel` em modo criação (sem perfil selecionado).
- Acordeão colapsável "Estatísticas e Métricas": ao expandir, mostra 3 cards (Total de Perfis, Usuários com Perfil, Módulos Configuráveis).
- Campo de busca: filtra os perfis por nome, aplicado nas duas abas.
- Duas abas: "Perfis de Acesso" (grade de cards) e "Matriz de Permissões" (tabela detalhada por perfil).
- Aba "Perfis de Acesso": cada card de perfil traz botão Editar (abre o painel lateral pré-preenchido com o perfil) e botão Excluir (ícone lixeira presente visualmente, porém sem handler associado — não executa nenhuma ação); mostra também contagem de usuários, badges de escopo (Todos/Próprios) e badges dos módulos ativos — só leitura.
- Aba "Matriz de Permissões": para cada perfil, tabela somente-leitura agrupada por categoria de módulo (Visão Geral, Gestão, Operações, Financeiro, Administração), com célula de escopo (Próprios/Todos/vazio) por ação (Visualizar/Criar/Editar/Excluir); cabeçalho do perfil tem botão Editar que abre o mesmo painel lateral.
- Painel lateral de criação/edição (`PermissionProfileSlidePanel`): ao salvar (`handleSaveProfile`) apenas fecha o painel — não persiste os dados (mock).

### Configurações (/admin/configuracoes)

Central de configurações administrativas da plataforma, organizada em 8 abas independentes; a maior parte dos dados é local/mock (os botões "Salvar" apenas disparam um toast de confirmação, sem persistência real no backend), exceto a aba Notificações, que direciona para a página real `/admin/notifications`.

- **Geral**: campos Nome da Plataforma e Descrição (botão "Salvar" no card); toggles "Permitir Novos Cadastros" e "Modo de Manutenção" (aplicam e mostram toast imediatamente ao alternar).
- **Emails**: cards de estatística (Caixas Ativas / Total de Caixas); tabela "Caixas de E-mail" com botão "Adicionar" (formulário inline: label, e-mail, descrição), botões Editar/Excluir por linha, switch de ativar/desativar por linha; card "Configurações SMTP" (servidor, porta, usuário, senha com botão de mostrar/ocultar) com "Testar Configuração" (toast simulado) e "Salvar".
- **WhatsApp**: cards de estatística (Conectados / Desconectados); busca por número/label e filtro por status; botão "Adicionar" (label, número, tipo Business API/Pessoal); ações por linha: Testar (toast simulado), Desconectar (só se conectado), Excluir.
- **Equipe**: cards de estatística (Áreas / Usuários Atribuídos / Áreas Sem Responsável); grade de cards por área administrativa (Suporte, Financeiro, Comercial, Técnico, Marketing, Onboarding) com botão de remover usuário (X) por linha e botão "Atribuir usuário" por área (formulário inline nome/e-mail).
- **Integrações**: tabela "Redes Sociais" (Instagram, LinkedIn, Facebook, YouTube) com botão Conectar/Desconectar por linha (OAuth simulado); tabela "Webhooks" com busca, botão "Adicionar" (nome, evento, URL, método, toggle Ativo), ações Testar/Editar/Excluir por linha e switch de ativar/desativar.
- **Notificações**: 4 tiles somente leitura (mock); card "Central de Notificações" com botão "Abrir" e 3 sub-cards (Pré-configurações, Automações, Modelos) que navegam para a página real `/admin/notifications`.
- **Segurança**: "Autenticação e Acesso" (toggle Verificação de Email Obrigatória, Tamanho Máximo de Arquivo, Timeout de Sessão, botão Salvar); "Políticas de Senha" (slider de comprimento mínimo, toggles de complexidade, botão Salvar).
- **Aparência**: "Cores da Plataforma" (seletor de cor + hex para Primária/Secundária, botão "Restaurar Padrão", botão "Salvar"); "Logo da Plataforma" (upload/drag-and-drop puramente decorativo, sem handler implementado).

### Campanhas (/admin/campanhas-indicacao)

Página "Campanhas e Promoções": gerencia, numa única tabela unificada, as campanhas de indicação/influencer e os cupons de desconto/bônus/afiliado, com criação, edição, ativação/desativação, exclusão, relatório de desempenho e criação de acesso ao portal do parceiro.

- **Cabeçalho**: exportação padrão da página; botão **Relatório** (abre painel de relatório de campanhas/cupons/influencers); botão **Novo Cupom**; botão **Nova Campanha**.
- **Cards de estatística** (topo, somente leitura): Campanhas Ativas, Indicações Ativas, Usos de Cupons, Total Investido.
- **Tabela unificada de Campanhas + Cupons**: busca por nome/código; botão **Filtros** (Tipo Campanha/Cupom, Status); botão **Configurar colunas**; paginação e cabeçalhos ordenáveis com tooltip.
- Ações por linha: **switch de status** (com confirmação, desabilitado para campanhas encerradas), **Editar** (abre painel preenchido), **Criar acesso do influencer** (só em campanhas Influencer/Afiliado, abre drawer "Criar Acesso Parceiro") e **Excluir** (sem confirmação).
- **Painel "Nova/Editar Campanha"**: tipo (Indicação ou Influencer/Afiliado), nome, usuário vinculado (se Influencer), tipo/valor de comissão, mín./máx. de indicações, datas de início/término, cupom de desconto vinculado (opcional).
- **Painel "Novo/Editar Cupom"**: tipo (Desconto / Bônus Crédito / Afiliado), código, valor/limite de uso, aplicabilidade (planos ou produtos/escopo), uso por empresa, restrição de acesso (sem restrição / por empresa / por usuário, com combobox de busca), vigência, e para Afiliado uma seção de comissão por venda.
- **Drawer "Criar Acesso Parceiro"**: nome, e-mail, senha temporária, tipo e chave PIX; botão **Criar Acesso** gera credenciais para o portal `/parceiro` (simulado).
- **Painel "Relatório"**: filtros de período/tipo/status/conta/destaque de métrica; cards-resumo (Cliques, Conversões, Abandono, Taxa, Receita, Comissão); tabela detalhada; exportação em **CSV**, **DOC**, **PDF** e **PNG**.

### Programa Partner (/admin/programa-partner)

Tela para gerenciar o Programa Partner de agências: envio e acompanhamento de convites para agências virarem "Partner", e gestão dos partners já ativos. Todos os dados são mockados (state local, sem chamada de API).

- Botão "Novo Convite" abre um painel lateral com o formulário de convite.
- Cartões de estatísticas (somente leitura): Convites Enviados, Pendentes, Aceitos, Recusados, Partners Ativos.
- Abas "Convites" (com contador de pendentes) e "Partners Ativos" (com contador de partners).
- Aba Convites: busca por agência/e-mail; filtro de Status (Todos, Pendente, Aceito, Recusado, Expirado); menu de ações por linha (⋯): "Ver detalhes", "Reenviar convite" (só Recusado/Expirado, reabre como Pendente por 30 dias) e "Cancelar convite" (só Pendente, marca como Expirado após confirmação).
- Aba Partners Ativos: busca por partner; cada linha tem botão "Revogar" (confirmação, remove o partner e expira o convite original).
- Painel "Novo Convite Partner": seleção de agência elegível, mensagem editável, prazo de resposta (15/30/60/90 dias), botão "Enviar convite" e "Cancelar".

### Allkademy (/admin/allkademy)

Tela de gestão dos cursos da plataforma de treinamento Allkademy: listagem, criação/edição de cursos e organização de módulos e aulas. Consome API real, com paginação, ordenação, filtros e configuração de colunas.

- Botões "Atualizar" e "Novo Curso" (abre painel de criação).
- Cartões de estatísticas: Cursos, Publicados, Inscrições, Módulos.
- Busca por título/categoria (sugestões clicáveis); botão "Filtros" (Status, Categoria); botão "Configurar colunas".
- Seletor de itens por página e paginação numerada; cabeçalhos ordenáveis com tooltip.
- Cada linha tem 4 ações: "Ver módulos e aulas" (painel de detalhe), alternar Publicar/Despublicar, "Editar curso" e "Excluir curso" (confirmação).
- Painel de detalhe: módulos expansíveis com aulas (vídeo/texto/quiz); botão "Módulo" adiciona um novo módulo com título inline.
- Painel de criar/editar curso: Título, Descrição, Categoria, Duração, URL da Thumbnail, Público-alvo (checkboxes, "Todos" exclusivo), "Curso gratuito" e "Publicar agora".
- Estado vazio oferece atalho "Criar primeiro curso".

### Alertas (/admin/alertas)

Central de Atenções do Admin: reúne "atenções" do sistema (tarefas atrasadas, financeiro, mensagens, projetos, sistema) organizadas por prioridade e status, com fluxo de resolução, adiamento e cancelamento com comprovantes anexados. Página fora do menu lateral, acessível diretamente pela rota.

- **Cabeçalho**: contagem de itens abertos; menu "Ordenar por" (Prioridade ↓/↑, Data recente/antiga, Vencimento próximo/distante).
- **Abas de status** (com contador): Abertos, Todos, Aguardando (aprovação), Resolvidos, Adiados, Cancelados.
- Cada card de alerta traz botões **Resolvido** (nota obrigatória + anexos opcionais), **Adiar** (motivo + nova data obrigatórios + anexos opcionais) e **Cancelar** (motivo obrigatório + anexos opcionais); chips de "Comprovantes" abrem o visualizador de anexos (zoom, rotação, navegação entre múltiplos arquivos, download).

### Onboarding (/admin/onboarding)

Gestão dos circuitos de onboarding (boas-vindas) exibidos a novos usuários por tipo de conta (Admin, Empresa, Agência, Nômade): criar, editar, ativar/desativar, preview, testes de avaliação e analytics de engajamento.

- Botões "Exportar" e "Novo Circuito" no cabeçalho.
- Abas por tipo de conta (Todos, Admin, Empresas, Agências, Nômades); busca e filtro de status (Todos/Ativos/Inativos).
- Cada card de circuito: botão **Analytics** (visualizações, funil, progresso por usuário), **Preview** (visão do usuário final), **Editar**, **Ativar/Desativar** (toggle direto) e **Excluir** (confirmação); seção "Elementos do circuito" com **Adicionar** (Slide/Vídeo/Texto/Teste) e controles de mover/remover etapa.
- Painel de criação/edição: dados do circuito, tipos de conta com acesso, toggle "Circuito Ativo", e as mesmas etapas com **Construtor de Teste/Quiz** dedicado (perguntas, 4 opções, resposta correta, nota mínima).

### Notificações (/admin/notifications)

Central de notificações do admin (fora do menu lateral): pré-configurações por tipo de usuário, modelos de mensagem, automações de disparo e análises de desempenho. Dados mockados.

- Botões "Histórico" e "Novo Modelo" no cabeçalho.
- Quatro abas: **Pré-configurações** (por tipo de usuário, toggle de canais E-mail/WhatsApp/In-App/Push por evento), **Modelos** (criar/editar/enviar teste/excluir), **Automações** (regras com toggle Ativa/Pausada, editar/excluir) e **Análises** (gráficos de performance por canal, somente leitura).

---

## Agência (rota `/agencia/...`)

> Nota: existe uma pasta paralela `apps/frontend/app/agency/` (rotas em inglês) com apenas `dashboard` e `relatorios` — são aliases/duplicatas, sem conteúdo distinto do `/agencia`.

### Catálogo (/agencia/catalogo)

Vitrine de produtos que a agência pode contratar para montar uma proposta de projeto. Os itens escolhidos vão se acumulando numa cesta fixa na parte inferior da tela, que leva à criação/revisão do projeto.

- **Buscar produtos, tags...**: filtra por nome, descrição ou tags do produto.
- **Ordenar** / **Modo de exibição** (2–5 colunas ou Lista) / chips rápidos (Mais vendidos, Melhor avaliados, Menor/Maior preço, Avulso, Mensal, Com mais opções) / pílulas de categoria / dropdowns Tipo e Variações — mesmo conjunto de filtros e atalhos do catálogo do Admin.
- **Botão Filtros**: painel "Filtros Avançados" com filtros salvos (nomear, renomear, reordenar, excluir, aplicar).
- Cada card: **Detalhes** (abre painel de detalhes com abas Detalhes/Portfólio, produtos complementares, FAQ, variações clicáveis) e **Escolher**/**Escolher opção** (abre o detalhe para confirmar a variação e adicionar à cesta); produto já na cesta mostra **−/+** e **Remover**.
- **Cesta fixa no rodapé**: **Ver itens**, **Limpar**, **Continuar**, e botão principal **"Criar Projeto com Estes Itens"** (ou "Ver Projeto" se já vinculada a um projeto em andamento).

### Projetos (/agencia/projetos)

Reaproveita o componente de Gestão de Projetos do Admin em modo agência: dados já filtrados pela agência logada; o botão "Alterar vínculo" (ligar projeto a outra Empresa/Agência/Partner) fica oculto — exclusivo do Admin.

- **Novo Projeto** (agência já pré-selecionada) / **Exportar** (CSV/Excel/PDF) / cards de estatísticas com acordeão de KPIs adicionais.
- Banner **"Projetos pendentes"** com ações rápidas (Continuar rascunho, Aprovar, Pagar Agora).
- Alternador **Lista / Kanban / Planejador**; busca; **Filtros Avançados** (Empresa/Cliente, Agência, Responsável, Status, Tipo, Origem, Pagamento, faixa de valor/tarefas, com filtros salvos); **Configurar colunas**.
- Ações por linha conforme status: Rascunho → Continuar/Descartar; Aguardando pagamento → Ir para Pagamento/Visualizar/Cancelar; demais → Visualizar/Duplicar/Cancelar.
- **Duplicar projeto** (escolher o que clonar) e **Cancelar projeto** (wizard de 3 etapas).
- **Kanban**: criar/editar/excluir colunas de status, arrastar projetos entre colunas. **Planejador**: colunas e cartões livres (título, descrição, prioridade, prazo, vínculo opcional a projeto).

### Tarefas (/agencia/tarefas)

Reaproveita a tela de Tarefas do Admin (mesmo componente): filtros, colunas e ações idênticas, escopadas às tarefas da agência.

- **Atualizar**; 8 cards de indicadores clicáveis (filtro rápido); busca por tarefa/projeto/cliente/produto/código/nômade/agência.
- **Filtros avançados** (identificação, status/prioridade, relacionamentos, datas, alertas de atraso); **Configurar colunas**; ordenação por coluna; paginação.
- **Menu de ações por linha** (⋯): Ver detalhes, Lançar tarefa, Atribuir nômade, Pausar/Retomar, Devolver tarefa, Alterar status (submenu), Abrir projeto.
- **Painel de detalhes da tarefa** (abas Dados Gerais, Questionário, Etapas, Comentários, Itens p/ Aprovação, Históricos, Acessos, Anexos) com edição inline; **formulário de lançamento** com preenchimento assistido a partir de briefing colado.

> ⚠️ **Pendente:** Dashboard, Clientes, Financeiro e Usuários (`/agencia/dashboard`, `/agencia/clientes`, `/agencia/financeiro`, `/agencia/usuarios` — esta última é a tela de sub-usuários do épico multiusuário) ainda não foram documentados.

---

## Empresa (rota `/company/...`)

### Dashboard (/company/dashboard)

Tela inicial do perfil Empresa: resumo em tempo real de projetos, tarefas, aprovações e financeiro, com cards de métricas, "Pontos de atenção" e widgets configuráveis.

- Seletor de **Período** global; seletor de **Dashboard** (trocar/marcar padrão/excluir/criar); **Exportar** (PDF/PNG); **Histórico** (dados manuais mensais que sobrepõem os automáticos); **Compartilhar** (link com permissão, PIN e expiração); **Editar** (reordenar, adicionar/remover widgets da biblioteca).
- 8 **cards de métricas**: Projetos Ativos, Tarefas para Lançar, Tarefas em Andamento, Aprovações Pendentes, Propostas Aguardando Cliente, Valor Contratado no Mês, Margem Estimada, Pagamentos Pendentes.
- **"Pontos de atenção"**: cartões clicáveis que levam direto às telas relacionadas (projetos atrasados, tarefas aguardando lançamento, pagamentos pendentes, propostas aguardando resposta).
- Cada widget: período próprio ou global, **Ver detalhes**, **Compartilhar widget**, **Exportar widget**.
- Widget **Ações Rápidas**: atalhos para Projetos, Aprovações, Aprovar Entrega, Propostas, Financeiro.

### Projetos (/company/projetos)

Acompanhamento de todos os projetos contratados pela empresa: status, progresso, orçamento; lista, kanban ou planejador; contratação de novos projetos/produtos.

- **Contratar Projetos** (abre painel de contratação; também usado para retomar rascunho ou finalizar pagamento pendente); **Exportar** (CSV/Excel/PDF).
- Cards de estatísticas + acordeão "Estatísticas e Métricas" (com filtro de período e origem).
- Banner **"Projetos pendentes"** (Continuar / Pagar).
- Alternador **Lista / Kanban / Planejador**; busca; **Filtros Avançados** (com filtros salvos); **Configurar colunas**.
- Linha da tabela → painel de detalhe **somente leitura** (Visão Geral, Produtos, Tarefas, Financeiro, Equipe, Nômades, Logs).
- **Kanban** e **Planejador** com as mesmas mecânicas de arrastar/criar coluna do perfil Agência.
- *Nota:* handlers de Duplicar/Cancelar projeto existem no código mas não têm botão associado nesta tela — não estão acessíveis ao usuário Empresa.

### Faturas (/company/faturas)

Histórico financeiro da empresa — somente consulta, sem edição.

- Cards de resumo (Pendentes, Pagas, Total Geral); botões de filtro por status; cabeçalhos ordenáveis; filtro por coluna em "Status".

### Catálogo de Produtos (/company/produtos)

Explorar o catálogo, montar cesta e iniciar contratação — mesmo padrão do catálogo de Agência/Admin (busca, ordenar, chips, categorias, Tipo/Variações, Filtros Avançados com filtros salvos, seletor de layout).

- Cada produto: **Ver detalhes** / **Escolher**; **Carrinho** (gaveta lateral) e barra fixa inferior com quantidade/remoção.
- Painel **"Contratar Serviços"**: nome/imagem/descrição do projeto, lista de produtos editável, **Salvar Rascunho**, **Exportar** (PDF de apresentação), **Pagar via** (Agência ou Cliente), **Confirmar e ir ao Checkout**.

### Relatórios (/company/relatorios)

Visão analítica de projetos/tarefas/faturas + central de relatórios exportáveis por categoria.

- Seletor de período (com Custom); **Atualizar**; faixa de KPIs; alerta de faturas em atraso (**Ver faturas**).
- Aba **Visão Geral**: distribuição por status, busca/filtro de relatórios por categoria, seções recolhíveis, botões **Visualizar** e **Baixar** (PDF/XLSX) por relatório.
- Aba **Indicadores**: cards e painéis ao vivo (Projetos, Tarefas, Financeiro), somente leitura.

### Tarefas (/company/tarefas)

Tarefas de todos os projetos da empresa — somente leitura.

- Cards de resumo por status; busca; botões de filtro por status; cabeçalhos ordenáveis; filtro por coluna em "Status". Sem menu de ações por linha.

> ⚠️ **Pendente:** Clientes e Usuários (`/company/clientes`, `/company/usuarios` — esta última é a tela de sub-usuários do épico multiusuário) ainda não foram documentados.

---

## Parceiro (rotas `/parceiro/...` e `/partner/...`)

> O menu lateral principal aponta para as rotas em inglês (`/partner/...`). A pasta `/parceiro/...` tem layout/sidebar próprios e replica a mesma lógica de negócio, mas cobre só Dashboard, Agências, Comissões, Projetos e Saques — sem página de Usuários. "Usuários" só aparece no menu para quem tem papel `partner_admin`.

### Dashboard (/parceiro/dashboard)

Painel inicial com widgets configuráveis: perfil, comissões (indicadores e pendentes), atividade recente, saques, agências lideradas.

- **Exportar PNG**; **Personalizar** (reordenar/renomear/redimensionar/remover/adicionar widgets, restaurar padrão); **Copiar** link de indicação no widget "Meu Perfil".

### Agências (/parceiro/agencias)

Agências sob a liderança do parceiro, com métricas de MRR/projetos/comissão e relatórios de acompanhamento.

- Busca; filtros de status (Todos, Ativa, Onboarding, Em risco, Inativa); clique no card abre painel de detalhes com **Novo relatório** (título, mês/ano, avaliação, análise, MRR, projetos, tarefas, destaques, pontos de melhoria, status Rascunho/Publicado), editar/excluir relatórios existentes.

### Comissões (/parceiro/comissoes)

Histórico de comissões geradas — busca, filtro de status (Pendentes/Confirmadas/Pagas), ordenação por coluna, paginação.

### Projetos (/parceiro/projetos)

Duas seções: **Meus Projetos** (criar projeto próprio — título, tipo, valor, descrição) e **Projetos Indicados** (comissão sobre projetos de empresas indicadas) — com busca, filtros de status e ordenação.

### Saques (/parceiro/saques)

Solicitar saque do saldo de comissões via PIX (com confirmação da chave PIX) e consultar histórico de saques.

- **Solicitar Saque** (valida valor, saldo e chave PIX); histórico ordenável e filtrável por status.

### Usuários (/partner/usuarios)

Exclusiva de `/partner` — parte do épico multiusuário: o `partner_admin` gerencia os sub-usuários (`partner_user`) com acesso ao seu perfil.

- Busca; **Novo usuário** (nome, e-mail, senha temporária); **Editar** por linha (nome, nova senha opcional); **Bloquear/Desbloquear** (indisponível para o usuário principal, marcado com selo "Principal").

---

## Líder (rota `/lider/...`)

> O Líder é o "gestor de nômades": qualifica briefings, acompanha execução, trata devoluções e consulta histórico de uma área (categoria de produto). Existe uma pasta paralela `/leader/` (dashboard e relatórios em inglês) que é apenas um alias.

### Dashboard (/lider/dashboard)

Indicadores e listas resumidas das tarefas da área, em widgets reordenáveis/customizáveis.

- **Atualizar**; **Exportar PNG**; **Personalizar** (reordenar, renomear, alternar largura, remover/adicionar widgets, salvar em localStorage); link **"Ver todas"** por widget leva para `/lider/tarefas`.

### Catálogo (/lider/catalogo)

Vitrine somente leitura (modo `readOnly` — sem contratação): busca, filtro por categoria, ordenar, **Ver detalhes**.

### Clientes (/lider/clientes)

Lista somente leitura de todos os clientes da plataforma: busca com sugestões, **Exportar**, **Filtros** (status), **Configurar colunas**, ordenação, botão **"+"** (mais informações) por linha. Sem criar/editar/vincular.

### Devolvidas (/lider/devolvidas)

Tarefas que o próprio Líder devolveu para a agência corrigir — **Atualizar**, busca, paginação; tabela somente leitura (código, tarefa, motivo, data).

### Histórico (/lider/historico)

Todas as tarefas já tratadas pela área (ou só aprovadas, via parâmetro `?aprovacoes`) — paginação; tabela somente leitura.

### Nômades (/lider/nomades)

Nômades ativos vinculados à área do Líder — paginação; tabela somente leitura (nível, status, score, tarefas concluídas, avaliação).

### Perfil (/lider/perfil)

Dados pessoais do Líder e áreas de atuação atribuídas — somente leitura, sem botões de ação.

### Projetos (/lider/projetos)

Visão geral somente leitura de todos os projetos da plataforma — **Exportar**, busca, paginação, cards de estatística agregados.

### Qualificação (/lider/qualificacao)

Fila de tarefas aguardando qualificação (briefing) — **Atualizar**, busca; ações por linha: **Aprovar** (libera a tarefa no fluxo) e **Devolver** (com motivo obrigatório, retorna para a agência relançar).

### Em Execução (/lider/tarefas)

Tarefas em andamento na área (e, via `?filter=`, variações: `briefings`, `entregas`, `atrasadas`) — **Atualizar**, busca, **Ver detalhes** (drawer com possibilidade de alterar status conforme o estágio).

---

## Nômade (rota `/nomades/...`)

> Prestadores de serviço/freelancers da plataforma. O item "Dashboard" do menu aponta para o alias `/nomad/dashboard`, mas o conteúdo real e completo está em `/nomades/dashboard`.

### Dashboard (/nomades/dashboard)

Indicadores de tarefas, ganhos e nível em widgets configuráveis.

- **Atualizar**; **Exportar PNG**; **Personalizar** (reordenar, editar título, alternar largura, mover, remover/adicionar, restaurar padrão).
- Cards de KPI clicáveis (Tarefas Concluídas, Em Execução, Disponíveis, Total Ganho) navegam para as páginas relacionadas; widgets de Nível/Progressão e Desempenho são somente leitura.

### Tarefas Disponíveis (/nomades/tarefasdisponiveis)

Vitrine de tarefas abertas para candidatura (dados mockados).

- Busca; filtro por categoria; **marcador (bookmark)** de favoritas; **Ver detalhes**; **Candidatar-se** → painel de confirmação → **Confirmar candidatura** (simulada).

### Minhas Tarefas (/nomades/minhastarefas)

Tarefas atribuídas ao nômade, abas Ativas/Concluídas (dados mockados).

- **Detalhes** (painel com checklist de etapas, e feedback/avaliação se concluída); **Enviar entrega** (visual, sem envio real implementado).

### Habilitações (/nomades/habilitacoes)

Certificações do nômade por tipo de tarefa/categoria (dados mockados).

- Busca; abas por status; **"Iniciar Teste de Habilitação"** (modal de pré-requisitos); botão **Allkademy**/**"Ir para Allkademy"** para cursos e recertificação.

### Histórico (/nomades/historico)

Tarefas já concluídas, com estatísticas e filtro por mês (dados mockados) — cabeçalhos ordenáveis, botão de expandir por linha (detalhe da entrega/avaliação).

### Programa (/nomades/programa)

Explica os níveis (Bronze a Diamond + Leader) — acordeão por nível com critérios e benefícios; níveis por convite (Platinum, Diamond, Leader) mostram aviso específico.

### Ganhos (/nomades/ganhos)

Histórico financeiro do nômade (dados mockados) — cabeçalhos ordenáveis/filtráveis, paginação.

### Perfil (/nomades/perfil)

Dados pessoais, habilidades, preferências e segurança (dados mockados, sem persistência real).

- **Editar perfil** → **Salvar**/**Cancelar**; abas Dados pessoais / Habilidades / Preferências / Segurança (troca de senha; **"Solicitar exclusão de conta"** com confirmação destrutiva, sem envio real ao backend).

### Relatórios (/nomades/relatorios)

Componente compartilhado `ReportListPage` (`profileType="nomades"`) com indicadores reais via API — **Atualizar**, busca, filtro por categoria/período, **Visualizar**/**Baixar** por relatório.

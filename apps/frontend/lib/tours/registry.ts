import { canManageAlertsAdmin } from "@/lib/admin-permissions";
import type { TourDefinition } from "./types";

// ─── Registro central de tours (blocos 1-2/3) ───────────────────────────────
// Bloco 1: só o tour piloto. Bloco 2: tours curtos e contextuais pra recursos
// REALMENTE disponíveis na interface dos três sprints anteriores — nunca um
// botão/rota/comportamento inventado. Auditoria completa (matriz recurso ×
// rota × componente × perfil × permissão × estado) no relatório de
// fechamento do bloco; recursos só de API ou ainda incompletos (Monitoramento
// e presença — sem nenhuma tela hoje; `/admin/alertas` — mockado e
// desconectado do sistema real; aba "Pré-configurações" de
// /admin/notifications — mock local) foram deliberadamente excluídos daqui.

// Mesma regra de "Admin Master" já usada em Legacy, Novo Catálogo Admin e na
// Central de Alertas (evaluateAdminMasterAccess no backend) — reaproveitada
// tal como está, apesar do nome vir do primeiro uso dela (Alertas). Nunca uma
// segunda implementação da mesma regra.
const isAdminMaster: NonNullable<TourDefinition["isEligible"]> = (ctx) => canManageAlertsAdmin(ctx.accountType, ctx.adminProfile as any);

export const TOURS: TourDefinition[] = [
  {
    key: "primeiros-passos",
    version: 1,
    title: "Primeiros passos na Allka",
    description: "Um tour rápido pelos principais recursos disponíveis para o seu perfil.",
    category: "primeiros-passos",
    // Sem allowedAccountTypes: disponível pra todo perfil — cada passo se
    // auto-filtra pela existência real do elemento (ver optional abaixo).
    // Sem rota específica: é o tour de primeiro acesso, oferecido em
    // qualquer tela (nunca contextual a uma rota).
    routes: [],
    steps: [
      {
        id: "main-navigation",
        target: "main-navigation",
        title: "Navegação principal",
        description: "Aqui ficam os principais menus e telas do seu perfil.",
        placement: "right",
      },
      {
        id: "global-search",
        target: "global-search",
        title: "Busca",
        description: "Use a busca para encontrar rapidamente o que precisa.",
        placement: "bottom",
        optional: true, // nem todo portal tem busca global hoje
      },
      {
        id: "notifications-button",
        target: "notifications-button",
        title: "Notificações",
        description: "Avisos informativos sobre o que aconteceu — como uma tarefa ter sido liberada para execução.",
        placement: "bottom",
      },
      {
        id: "alerts-button",
        target: "alerts-button",
        title: "Alertas",
        description: "Diferente das Notificações: aqui ficam os itens que pedem atenção ou uma decisão sua.",
        placement: "bottom",
      },
      {
        id: "user-profile-menu",
        target: "user-profile-menu",
        title: "Seu perfil",
        description: "Acesse seus dados, configurações e opções da conta.",
        placement: "bottom",
      },
      {
        id: "help-button",
        target: "help-button",
        title: "Ajuda",
        description: "Volte aqui sempre que quiser repetir este ou outros tours da plataforma.",
        placement: "left",
      },
    ],
  },

  // ─── Parte A — Governança, comunicação e acompanhamento ──────────────────
  {
    key: "alertas-notificacoes",
    version: 1,
    title: "Alertas e Notificações",
    description: "Entenda a diferença entre o que é só um aviso e o que pede sua atenção.",
    category: "alertas-comunicacao",
    routes: [], // ícones globais, presentes em toda tela — nunca uma rota específica
    steps: [
      { id: "notifications-button", target: "notifications-button", title: "Notificações", description: "Aqui ficam os avisos sobre o que já aconteceu — informativo, sem exigir uma decisão sua.", placement: "bottom" },
      { id: "notifications-explain", target: null, title: "O que uma Notificação avisa", description: "Ex.: uma tarefa foi liberada para execução, ou alguém te adicionou a um grupo. Nunca pede uma ação sua." },
      { id: "alerts-button", target: "alerts-button", title: "Alertas", description: "Diferente das Notificações: aqui ficam itens que pedem atenção ou uma decisão — abrem um painel próprio.", placement: "bottom" },
      { id: "alerts-colors", target: null, title: "Verde, amarelo e vermelho", description: "Verde é informativo, amarelo pede atenção em breve, vermelho é crítico e pode exigir uma resolução real." },
      { id: "alerts-actions", target: null, title: "Dispensar, arquivar e resolver", description: "Dispensar só marca como lido. Arquivar tira da lista ativa. Resolver é um registro administrativo, só para alertas críticos que não se corrigem sozinhos." },
      { id: "alerts-resolve-honesty", target: null, title: "Resolver não conserta a causa", description: "Um alerta vermelho pode continuar exigindo que a tarefa ou situação real seja corrigida — clicar em Resolver só fecha o registro do alerta." },
      { id: "alerts-origin", target: null, title: "Ver origem e detalhes", description: "Cada alerta pode abrir de onde ele veio (a tarefa, o projeto) e um histórico completo do que aconteceu com ele." },
    ],
  },
  {
    key: "administracao-alertas-regras",
    version: 1,
    title: "Administração de Alertas e Regras",
    description: "Como configurar padrões, regras e programações de alerta — só para Admin Master.",
    category: "alertas-comunicacao",
    allowedAccountTypes: ["admin"],
    isEligible: isAdminMaster,
    routes: [], // vive numa aba dentro do painel global de Alertas, não numa rota própria
    steps: [
      { id: "alerts-button", target: "alerts-button", title: "Abra o painel de Alertas", description: "A administração fica dentro do próprio painel de Alertas, na aba \"Gerenciar\".", placement: "bottom" },
      { id: "alerts-manage-tab", target: "alerts-manage-tab", title: "Aba Gerenciar", description: "Só visível para Admin Master — reúne Padrões, Regras, Programados e Avulsos.", placement: "bottom", optional: true },
      { id: "standards", target: null, title: "Padrões", description: "Condições automáticas (ex.: tarefa atrasada) que o sistema já reconhece e pode transformar em alerta." },
      { id: "rules", target: null, title: "Regras", description: "Reaproveitam um padrão definindo destinatários e criticidade — a mesma regra pode valer para vários casos." },
      { id: "schedules", target: null, title: "Programados", description: "Alertas/banners agendados, com data de expiração e imagem opcional." },
      { id: "adhoc", target: null, title: "Avulsos", description: "Um alerta único, criado manualmente, fora do motor automático — com histórico de quem criou." },
      { id: "monitoring", target: null, title: "Monitoramento", description: "Uma visão separada, só de leitura, para acompanhar alertas de toda a operação sem poder resolver o de outra pessoa." },
    ],
  },
  {
    key: "grupos-comunicacao",
    version: 1,
    title: "Grupos e comunicação",
    description: "Grupos de notificação, aprovação e a conversa interna da plataforma.",
    category: "alertas-comunicacao",
    routes: [],
    steps: [
      { id: "groups-tab", target: "notifications-groups-tab", title: "Grupos", description: "Uma lista de pessoas do seu time que recebem os mesmos avisos — dentro do painel de Notificações.", placement: "bottom" },
      { id: "participants", target: null, title: "Participantes", description: "Cada grupo tem membros reais da plataforma — nunca um contato externo avulso." },
      { id: "approval", target: null, title: "Aprovação", description: "Um líder solicita a criação de um grupo; só o Admin Master aprova ou rejeita, sempre com justificativa quando rejeita." },
      { id: "chat", target: "chat-widget-button", title: "Conversa interna", description: "Um grupo aprovado ganha uma sala de conversa própria, dentro da plataforma.", placement: "bottom" },
      { id: "group-vs-permission", target: null, title: "Grupo não é permissão", description: "Um grupo só define quem é avisado e participa da conversa — nunca dá acesso a telas ou dados. Isso é configurado separadamente." },
      { id: "chat-honesty", target: null, title: "Situação atual do chat", description: "Esta conversa é interna da plataforma. Ainda não existe integração real com WhatsApp ou outro aplicativo externo." },
    ],
  },
  {
    key: "canais",
    version: 1,
    title: "Canais",
    description: "Onde escolher por qual canal você quer ser avisado — e o que já funciona de verdade hoje.",
    category: "alertas-comunicacao",
    routes: [],
    steps: [
      { id: "prefs-tab", target: "notifications-prefs-tab", title: "Canal interno da plataforma", description: "O único canal que já entrega avisos de verdade hoje — sempre dentro da própria Allka.", placement: "bottom" },
      { id: "external-channels", target: null, title: "Canais externos", description: "E-mail, WhatsApp e notificação push aparecem aqui como preferência, mas ainda não enviam de verdade neste ambiente." },
      { id: "channel-honesty", target: null, title: "Nada é prometido sem estar pronto", description: "Se um canal aparece como \"não configurado\", nenhum envio real acontece por ele ainda — só fica guardada a sua preferência." },
      { id: "prefs-location", target: "notifications-prefs-tab", title: "Onde escolher", description: "Suas preferências por tipo de aviso e canal ficam nesta mesma aba.", placement: "bottom" },
    ],
  },

  // ─── Parte B — Produtos e catálogo ────────────────────────────────────────
  {
    key: "legacy",
    version: 1,
    title: "Legacy",
    description: "Consulta somente leitura dos dados da plataforma anterior — só para Admin Master.",
    category: "produtos-catalogo",
    allowedAccountTypes: ["admin"],
    isEligible: isAdminMaster,
    routes: ["/admin/legacy", "/admin/consulta-legado"],
    initialRoute: "/admin/legacy",
    steps: [
      { id: "header", target: "legacy-header", title: "Consulta da plataforma anterior", description: "Legacy guarda os dados da plataforma anterior só para consulta — nada aqui altera a Allka atual.", placement: "bottom" },
      { id: "tabs", target: "legacy-tabs", title: "Resumo e Produtos", description: "Hoje só essas duas abas têm dados reais — as demais aguardam uma importação histórica futura.", placement: "bottom" },
      { id: "filters", target: null, title: "Filtros e busca", description: "Dentro de Produtos, use busca, status e categoria para encontrar um registro específico." },
      { id: "detail", target: null, title: "Abrir um registro", description: "Clique em um item da lista para ver o detalhe completo — descrição, variações, tarefas e datas originais." },
      { id: "readonly", target: null, title: "Nunca altera o registro antigo", description: "Nenhuma ação aqui edita ou apaga os dados antigos — é sempre consulta." },
    ],
  },
  {
    key: "novo-catalogo-admin",
    version: 1,
    title: "Novo catálogo — Administração",
    description: "Como um produto nasce em rascunho até estar pronto para publicação — só para Admin Master.",
    category: "produtos-catalogo",
    allowedAccountTypes: ["admin"],
    isEligible: isAdminMaster,
    routes: ["/admin/produtos/novo-catalogo"],
    steps: [
      { id: "header", target: "catalog2-admin-header", title: "Novo catálogo", description: "Um construtor separado do catálogo operacional atual — preço e prazo são sempre calculados no servidor.", placement: "bottom" },
      { id: "create", target: "catalog2-admin-create", title: "Criar produto", description: "Cria um novo produto em preparação, com uma versão rascunho — nunca visível ao cliente ainda.", placement: "bottom" },
      { id: "editor-tabs", target: "catalog2-editor-tabs", title: "Conteúdo, tarefas, preço e histórico", description: "Ao abrir um produto: revisão de conteúdo, versões, especialidades e tarefas, e preço/prazo — cada um em sua aba.", placement: "bottom", optional: true },
      { id: "draft-vs-publish", target: null, title: "Rascunho x publicar", description: "Uma versão rascunho pode ser editada livremente. Publicar a torna definitiva e visível ao cliente — versões publicadas não voltam a ser editáveis." },
      { id: "business-note", target: null, title: "Situação comercial atual", description: "Os produtos deste novo catálogo ainda dependem de uma decisão comercial e de conteúdo antes de qualquer publicação real." },
    ],
  },
  {
    key: "catalogo-cliente-configurador",
    version: 1,
    title: "Catálogo do cliente e configurador",
    description: "Como buscar, configurar e adicionar um produto à cesta.",
    category: "produtos-catalogo",
    allowedAccountTypes: ["empresas", "agencias"],
    routes: ["/company/catalog2", "/agency/catalog2"],
    steps: [
      { id: "filters", target: "catalog2-client-filters", title: "Busca e filtros", description: "Encontre um produto por nome, pilar ou categoria.", placement: "bottom" },
      { id: "detail", target: null, title: "Abrir um produto", description: "Veja a descrição completa e as opções disponíveis para configurar." },
      { id: "choices", target: null, title: "Escolhas e variações", description: "Cada escolha pode mudar o preço e o prazo final — sempre recalculado ao vivo." },
      { id: "server-price", target: null, title: "Preço calculado pelo servidor", description: "O valor mostrado nunca é uma conta feita no seu navegador — vem sempre confirmado pelo servidor." },
      { id: "deadline", target: null, title: "Prazo", description: "O prazo estimado aparece junto do preço, e muda conforme suas escolhas." },
      { id: "cart", target: "catalog2-cart-button", title: "Cesta", description: "Adicione o produto configurado à cesta quando estiver pronto — nada é adicionado sozinho.", placement: "bottom" },
    ],
  },
  {
    key: "cesta-checkout",
    version: 1,
    title: "Cesta e checkout",
    description: "Da cesta até a confirmação do pedido.",
    category: "produtos-catalogo",
    allowedAccountTypes: ["empresas", "agencias"],
    routes: ["/company/catalog2", "/agency/catalog2", "/company/catalog2/checkout", "/agency/catalog2/checkout"],
    steps: [
      { id: "cart", target: "catalog2-cart-button", title: "Itens da cesta", description: "Sua cesta é isolada por conta — nunca compartilhada com outra empresa ou agência.", placement: "bottom", optional: true },
      { id: "clear", target: null, title: "Limpar a cesta", description: "É possível remover um item ou esvaziar a cesta inteira, sempre com confirmação antes." },
      { id: "checkout-header", target: "catalog2-checkout-header", title: "Gerar cotação", description: "Ao finalizar a compra, uma cotação real é gerada para cada item — com preço e prazo travados por um tempo.", placement: "bottom", optional: true },
      { id: "quote-deadline", target: null, title: "Prazo da cotação", description: "Uma cotação expira depois de um tempo — passado esse prazo, é preciso gerar uma nova." },
      { id: "terms", target: null, title: "Revisão e termos", description: "Antes de confirmar, você revê os valores totais e aceita os termos do pedido." },
      { id: "confirm", target: null, title: "Confirmação do pedido", description: "Aqui o pagamento é simulado (sandbox) — nenhuma cobrança real acontece neste passo." },
    ],
  },
  {
    key: "pedido-projeto-tarefas",
    version: 1,
    title: "Pedido, projeto e tarefas",
    description: "O que muda quando um pedido vira um projeto de execução.",
    category: "produtos-catalogo",
    allowedAccountTypes: ["empresas", "agencias", "admin"],
    routes: ["/company/catalog2/checkout", "/agency/catalog2/checkout"],
    steps: [
      { id: "checkout-header", target: "catalog2-checkout-header", title: "Antes do pagamento: Pedido", description: "Enquanto o pagamento simulado não é confirmado, o que existe é um Pedido — ainda não um projeto de execução.", placement: "bottom", optional: true },
      { id: "becomes-project", target: null, title: "Depois da confirmação: Projeto", description: "Assim que o pagamento (simulado) é confirmado, o pedido vira um Projeto real, com número de acompanhamento próprio." },
      { id: "tasks-generated", target: null, title: "Tarefas da versão contratada", description: "As tarefas são geradas a partir da versão do produto que foi realmente contratada — nunca de uma versão mais nova publicada depois." },
      { id: "dependencies", target: null, title: "Dependências entre tarefas", description: "Algumas tarefas só começam depois que outra tarefa anterior for concluída e aprovada." },
      { id: "blocked-released", target: null, title: "Bloqueada e liberada", description: "Uma tarefa dependente fica \"Pendente de liberação\" até a anterior ser aprovada — depois libera sozinha, sem precisar refazer nada manualmente." },
      { id: "same-tasks-screen", target: null, title: "Onde ver", description: "Essas tarefas aparecem na mesma tela de Tarefas usada para todo o resto do projeto." },
    ],
  },
  {
    key: "aditivos",
    version: 1,
    title: "Aditivos",
    description: "Como pedir, aprovar e pagar uma alteração adicional em um projeto já contratado.",
    category: "produtos-catalogo",
    allowedAccountTypes: ["empresas", "agencias", "admin"],
    routes: [], // aba dentro do painel de detalhe do projeto, sem rota própria
    steps: [
      { id: "history", target: "catalog2-additives-history", title: "Histórico de aditivos", description: "Toda solicitação de aditivo deste projeto fica registrada aqui, com seu status atual.", placement: "bottom" },
      { id: "request", target: null, title: "Solicitar alteração adicional", description: "A configuração do aditivo usa o mesmo configurador do catálogo — depois volte aqui para vincular a cotação gerada." },
      { id: "choose-quote", target: null, title: "Escolher a cotação", description: "A cotação recém-gerada precisa ser vinculada explicitamente à solicitação do aditivo." },
      { id: "approval", target: null, title: "Aprovação ou rejeição", description: "Só o Admin decide — Company e Agency nunca aprovam o próprio aditivo. O preço é reconferido nesse momento." },
      { id: "payment", target: null, title: "Pagamento separado", description: "Um aditivo aprovado tem seu próprio pagamento simulado, independente do pedido original." },
      { id: "impact", target: null, title: "Impacto em preço e prazo", description: "Cada aditivo aprovado mostra o quanto mudou no preço e no prazo total do projeto." },
    ],
  },

  // ─── Parte C — Memória e IA de lançamento ─────────────────────────────────
  {
    key: "memoria",
    version: 1,
    title: "Memória",
    description: "O contexto guardado sobre um projeto, uma empresa ou uma agência.",
    category: "memoria-lancamento",
    allowedAccountTypes: ["admin", "empresas", "agencias"],
    routes: [],
    steps: [
      { id: "summary", target: "memory-section-summary", title: "Resumo", description: "Um resumo consolidado, para qualquer pessoa nova entender o contexto rapidamente.", placement: "bottom" },
      { id: "positive", target: "memory-section-positive_instructions", title: "O que a IA deve fazer", description: "Instruções positivas — orientações que devem sempre ser seguidas.", placement: "bottom" },
      { id: "negative", target: "memory-section-negative_instructions", title: "O que a IA deve evitar", description: "Instruções negativas — o que nunca deve acontecer.", placement: "bottom" },
      { id: "approved", target: "memory-approved-facts", title: "Fatos aprovados", description: "Aprendizados registrados automaticamente quando uma tarefa é aprovada de verdade.", placement: "bottom" },
      { id: "history", target: "memory-history", title: "Histórico", description: "Toda alteração de memória fica registrada aqui, com autor e data.", placement: "bottom" },
      { id: "preview", target: "memory-context-preview-button", title: "Como a IA usa este contexto", description: "É possível visualizar exatamente o que seria enviado à IA antes de qualquer geração.", placement: "bottom", optional: true },
      { id: "no-invention", target: null, title: "Nunca inventa informação", description: "A memória só guarda o que foi escrito ou aprovado de verdade — ela nunca deve conter algo inventado." },
    ],
  },
  {
    key: "ia-lancamento",
    version: 1,
    title: "IA de Lançamento",
    description: "Como conversar com a IA para montar um plano tático de lançamento.",
    category: "memoria-lancamento",
    allowedAccountTypes: ["admin", "empresas", "agencias"],
    routes: [],
    steps: [
      { id: "start", target: "launch-start-button", title: "Iniciar sessão", description: "Começa uma conversa persistente dentro do projeto — pode ser retomada depois.", placement: "bottom", optional: true },
      { id: "context", target: "launch-session-status", title: "Contexto utilizado", description: "A IA usa a Memória do projeto (e da empresa/agência) como parte do que ela já sabe.", placement: "bottom", optional: true },
      { id: "generate", target: "launch-generate-button", title: "Gerar proposta", description: "Pede à IA um plano tático estruturado com base na conversa.", placement: "bottom", optional: true },
      { id: "missing-info", target: null, title: "Avisos de informação ausente", description: "Se faltar algo importante (cliente, responsável, data, orçamento), a IA pergunta em vez de inventar." },
      { id: "suggestion-vs-confirmed", target: null, title: "Sugestão x dado confirmado", description: "Uma especialidade ou responsável sugerido pela IA só vira um dado confirmado depois de alguém escolher a opção real." },
      { id: "human-review", target: null, title: "Revisão humana obrigatória", description: "Nenhuma proposta vira tarefa real sem revisão e aprovação de uma pessoa." },
    ],
  },
  {
    key: "plano-tatico",
    version: 1,
    title: "Plano tático",
    description: "Como revisar e ajustar o plano proposto antes de aprová-lo.",
    category: "memoria-lancamento",
    allowedAccountTypes: ["admin", "empresas", "agencias"],
    routes: [],
    steps: [
      { id: "editor", target: "launch-plan-editor", title: "Etapas e tarefas", description: "Cada tarefa proposta tem etapas, um objetivo e um critério de aprovação.", placement: "bottom", optional: true },
      { id: "specialty", target: null, title: "Especialidade", description: "Cada tarefa indica qual especialidade real deve executá-la." },
      { id: "responsible", target: null, title: "Responsável", description: "Um responsável pode ser confirmado agora ou ficar para a atribuição normal depois." },
      { id: "dependencies", target: null, title: "Dependências", description: "Uma tarefa pode depender de outra do mesmo plano ser concluída antes." },
      { id: "human-edit", target: null, title: "Edição humana", description: "Qualquer campo pode ser corrigido antes da aprovação." },
      { id: "save-version", target: null, title: "Salvar nova versão", description: "Cada edição gera uma nova versão — a anterior nunca é sobrescrita." },
      { id: "approve-draft", target: null, title: "Aprovação como rascunho", description: "Aprovar aqui só marca o plano como revisado — nenhuma tarefa real é criada ainda." },
      { id: "block-materialization", target: null, title: "O que bloqueia a materialização", description: "Uma especialidade ou responsável mencionado mas não confirmado impede que o plano vire tarefas reais até ser resolvido." },
    ],
  },
  {
    key: "materializacao-execucao",
    version: 1,
    title: "Materialização e execução",
    description: "Como um plano aprovado vira tarefas reais — e o que libera cada uma delas.",
    category: "memoria-lancamento",
    allowedAccountTypes: ["admin", "empresas", "agencias"],
    routes: [],
    steps: [
      { id: "materialize-button", target: "launch-materialize-button", title: "Aprovar não é materializar", description: "Aprovar o plano só marca como revisado. Materializar é o passo que realmente cria as tarefas.", placement: "bottom", optional: true },
      { id: "draft-vs-execution", target: null, title: "Rascunho operacional x enviar para execução", description: "Rascunho cria as tarefas sem liberar nenhuma. Enviar para execução já libera as que não têm bloqueio." },
      { id: "released", target: null, title: "Tarefa liberada", description: "Uma tarefa sem bloqueio pendente já nasce pronta para começar." },
      { id: "blockers", target: "task-release-blockers-panel", title: "Pendente de liberação", description: "Uma tarefa com dependência ou outro bloqueador fica esperando — o painel mostra exatamente o que falta.", placement: "bottom", optional: true },
      { id: "auto-release", target: null, title: "Liberação automática", description: "Assim que a tarefa anterior é concluída e aprovada de verdade, a dependente libera sozinha." },
      { id: "admin-exception", target: null, title: "Exceção administrativa", description: "Só um Admin pode liberar ignorando um bloqueador pendente — sempre com motivo registrado e auditado." },
      { id: "never-automatic", target: null, title: "Nada acontece sozinho por aqui", description: "Este tour nunca materializa nem libera uma tarefa de verdade — é só uma explicação." },
    ],
  },
];

export function findTour(key: string): TourDefinition | undefined {
  return TOURS.find((t) => t.key === key);
}

export function toursForAccountType(accountType: string): TourDefinition[] {
  return TOURS.filter((t) => !t.allowedAccountTypes || t.allowedAccountTypes.includes(accountType as any));
}

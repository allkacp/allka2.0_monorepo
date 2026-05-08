/**
 * migrate-tasks.ts
 * Migra as tarefas embutidas nos produtos para o módulo CatalogTask.
 *
 * Uso:
 *   cd apps/backend && npx tsx migrate-tasks.ts
 *
 * O script é idempotente: usa upsert com base no `code` da tarefa.
 * Nenhum dado de produto existente é alterado.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function j(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// ─── Task catalog data ────────────────────────────────────────────────────────
// Fonte: dev-mocks/data/products.ts — leitura manual de cada produto
// Estrutura: { productId, tasks[] }

const CATALOG: {
  productId: string;
  tasks: {
    code: string;
    name: string;
    category: string;
    subcategory?: string;
    task_type: string;
    description: string;
    objective?: string;
    estimated_hours?: number;
    default_deadline_days?: number;
    default_priority?: string;
    complexity?: string;
    requires_access: boolean;
    execution_rules?: string[];
    conclusion_rules?: string;
    internal_guidance?: string;
    briefing_questions?: object[];
    steps?: object[];
    requires_briefing?: boolean;
    sort_order: number;
    phase?: string;
  }[];
}[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PA0001 — Gestão de Tráfego
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "PA0001",
    tasks: [
      {
        code: "PA0001-T01",
        name: "Gestão de Tráfego",
        category: "Performance e Anúncios Patrocinados",
        task_type: "execution",
        description:
          "Gerenciamento completo de campanhas pagas por ciclo mensal: verificação de briefing e acessos pelo líder, execução semanal pelo nômade habilitado, relatório final consolidado e remoção de acessos.",
        objective:
          "Entregar um ciclo mensal completo de gestão de tráfego, com campanhas otimizadas semana a semana, relatório de performance ao final e encerramento seguro de todos os acessos compartilhados.",
        estimated_hours: 13,
        default_deadline_days: 35,
        default_priority: "high",
        complexity: "advanced",
        requires_access: true,
        requires_briefing: true,
        briefing_questions: [
          { key: "objetivo", label: "Objetivo principal das campanhas", type: "select", options: ["Conversão", "Geração de leads", "Tráfego para o site", "Awareness", "Outro"] },
          { key: "plataformas", label: "Plataformas de veiculação", type: "multiselect", options: ["Meta Ads (Facebook/Instagram)", "Google Ads (Pesquisa)", "Google Ads (Display)", "TikTok Ads", "LinkedIn Ads", "Outra"] },
          { key: "verba_mensal", label: "Verba mensal de mídia (R$)", type: "text" },
          { key: "url_destino", label: "URL do site ou landing page de destino", type: "text" },
          { key: "pixel_instalado", label: "Pixel / tags de rastreamento já instalados?", type: "select", options: ["Sim, todos instalados", "Parcialmente instalado", "Não instalado", "Não sei"] },
          { key: "acesso_bm", label: "Acesso ao gerenciador (BM / Google Ads) já compartilhado?", type: "select", options: ["Sim", "Não — será compartilhado na etapa 1", "Não sei"] },
          { key: "publico_alvo", label: "Descrição do público-alvo (localidade, perfil, segmento)", type: "textarea" },
          { key: "historico", label: "Conta nova ou com histórico de campanhas?", type: "select", options: ["Conta nova", "Conta com histórico", "Não sei"] },
          { key: "criativos", label: "Criativos (imagens/vídeos) serão fornecidos pela agência?", type: "select", options: ["Sim", "Não — nômade cria", "Mix dos dois"] },
          { key: "observacoes", label: "Observações adicionais", type: "textarea" },
        ],
        execution_rules: [
          "A tarefa é executada em ciclo mensal com 7 etapas internas sequenciais",
          "Etapa 1 é de responsabilidade exclusiva do Líder de Performance — não iniciar as demais sem aprovação",
          "Etapas semanais (2–5) têm duração de 7 dias cada; a próxima semana pode ser liberada após o envio da semana atual",
          "Líder qualifica internamente as entregas semanais — cliente/agência vê apenas 'Em execução'",
          "Se o líder reprovar uma semana, o nômade corrige na mesma etapa; não volta ao passado",
          "Relatório final (etapa 6) é aprovado pelo líder antes de ir para agência/cliente",
          "Remoção de acessos (etapa 7) encerra o ciclo — registrar justificativa se o mesmo nômade continuar",
        ],
        steps: [
          {
            id: "PA0001-E01",
            name: "Verificação de briefing e acessos",
            description: "Líder de Performance confere o briefing preenchido pela agência, verifica os acessos compartilhados e decide aprovar (liberar etapa 2) ou devolver para a agência corrigir.",
            order: 1,
            estimatedHours: 0.5,
            responsibleType: "leader",
            requiresLeaderApproval: true,
            canReturnToAgency: true,
            internalGuidance: "Verificar: objetivo, verba, plataformas, URL de destino, pixel instalado, acessos ao gerenciador. Se briefing incompleto ou acessos não compartilhados → devolver com comentário obrigatório.",
          },
          {
            id: "PA0001-E02",
            name: "Feedback 1 / Semana 1",
            description: "Nômade executa a primeira semana: configura/ajusta campanhas, monitora métricas e entrega resumo. Líder qualifica internamente antes de liberar semana 2.",
            order: 2,
            estimatedHours: 2,
            durationDays: 7,
            responsibleType: "nomad",
            requiresLeaderApproval: true,
            allowNextOnSubmit: true,
            visibilityForClient: "EM_EXECUCAO",
            internalGuidance: "Nômade entrega resumo semanal (CTR, CPC, CPA, ROAS, investimento). Líder qualifica. Aprovado → libera semana 2. Reprovado → nômade ajusta. Para agência/cliente: status permanece Em execução.",
          },
          {
            id: "PA0001-E03",
            name: "Feedback 2 / Semana 2",
            description: "Segunda semana: otimizações com base nos dados da semana 1. Nômade entrega resumo. Líder qualifica.",
            order: 3,
            estimatedHours: 2,
            durationDays: 7,
            responsibleType: "nomad",
            requiresLeaderApproval: true,
            allowNextOnSubmit: true,
            visibilityForClient: "EM_EXECUCAO",
            internalGuidance: "Comparar com semana 1. Se agência pediu correção da semana anterior, absorver como ajuste na semana atual — não voltar etapas.",
          },
          {
            id: "PA0001-E04",
            name: "Feedback 3 / Semana 3",
            description: "Terceira semana: otimizações avançadas, testes A/B. Nômade entrega resumo. Líder qualifica.",
            order: 4,
            estimatedHours: 2,
            durationDays: 7,
            responsibleType: "nomad",
            requiresLeaderApproval: true,
            allowNextOnSubmit: true,
            visibilityForClient: "EM_EXECUCAO",
            internalGuidance: "Identificar padrões nas 3 semanas. Consolidar aprendizados para o relatório final.",
          },
          {
            id: "PA0001-E05",
            name: "Feedback 4 / Semana 4",
            description: "Quarta semana: finalização do ciclo, ajustes finais e coleta de dados. Nômade entrega resumo. Líder qualifica.",
            order: 5,
            estimatedHours: 2,
            durationDays: 7,
            responsibleType: "nomad",
            requiresLeaderApproval: true,
            allowNextOnSubmit: false,
            visibilityForClient: "EM_EXECUCAO",
            internalGuidance: "Após aprovação, liberar etapa 6 (Relatório final). Exportar todos os dados das plataformas.",
          },
          {
            id: "PA0001-E06",
            name: "Relatório final",
            description: "Nômade compila relatório mensal completo com dados de todas as semanas. Líder qualifica antes do envio para agência/cliente aprovar.",
            order: 6,
            estimatedHours: 2,
            responsibleType: "nomad",
            requiresLeaderApproval: true,
            requiresClientApproval: true,
            internalGuidance: "Relatório: investimento total, impressões, cliques, CTR, conversões, CPA, ROAS, evolução semanal, recomendações. Líder aprova → agência/cliente aprova → libera etapa 7.",
          },
          {
            id: "PA0001-E07",
            name: "Remoção de acessos",
            description: "Remover todos os acessos compartilhados. Se o mesmo nômade continua no próximo ciclo, registrar justificativa.",
            order: 7,
            estimatedHours: 0.5,
            responsibleType: "nomad",
            requiresLeaderApproval: false,
            internalGuidance: "Remover: gerenciador de anúncios (BM, Google Ads), pixels, acessos compartilhados. Se ciclo continua: documentar manutenção do acesso no campo observações. Remoção encerra a tarefa.",
          },
        ],
        sort_order: 1,
        phase: "PA0001-E01",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PA0002 — SEO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "PA0002",
    tasks: [
      {
        code: "PA0002-T01",
        name: "Auditoria Técnica de SEO",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "SEO",
        task_type: "execution",
        description:
          "Análise completa da saúde técnica do site: velocidade, indexação, mobile-friendliness, estrutura de URLs, erros 404, sitemaps e robots.txt.",
        objective:
          "Identificar e documentar todos os problemas técnicos que impedem o bom posicionamento orgânico do site.",
        estimated_hours: 3,
        default_deadline_days: 3,
        default_priority: "high",
        complexity: "advanced",
        requires_access: true,
        execution_rules: [
          "Usar ferramentas: Google Search Console, PageSpeed Insights, Screaming Frog ou similar",
          "Documentar todos os erros encontrados com URL, tipo de erro e impacto estimado",
          "Verificar: sitemap.xml, robots.txt, canonical tags, estrutura de headings",
          "Checar Core Web Vitals no Search Console",
          "Entregar relatório de auditoria com prioridade de correção para cada problema",
        ],
        sort_order: 1,
        phase: "PA0002-E01",
      },
      {
        code: "PA0002-T02",
        name: "Estratégia de Palavras-chave",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "SEO",
        task_type: "execution",
        description:
          "Pesquisa e seleção de palavras-chave relevantes para o negócio do cliente, com análise de volume de busca, dificuldade e intenção de busca.",
        objective:
          "Definir o mapa de palavras-chave estratégico que guiará a otimização on-page e a produção de conteúdo.",
        estimated_hours: 2,
        default_deadline_days: 2,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Usar ferramentas: Google Keyword Planner, Ubersuggest, Semrush ou Ahrefs",
          "Mapear palavras-chave por intenção: informacional, navegacional, transacional",
          "Priorizar palavras com equilíbrio entre volume e dificuldade (KD < 40 para sites novos)",
          "Agrupar por tópico/página para orientar a otimização on-page",
          "Entregar planilha com: palavra-chave, volume mensal, dificuldade, intenção e página sugerida",
        ],
        sort_order: 2,
        phase: "PA0002-E01",
      },
      {
        code: "PA0002-T03",
        name: "Otimização On-Page",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "SEO",
        task_type: "execution",
        description:
          "Otimização dos elementos on-page das páginas prioritárias: title tags, meta descriptions, headings, conteúdo, imagens (alt text) e links internos.",
        objective:
          "Ter as páginas prioritárias otimizadas para as palavras-chave definidas na estratégia, com todos os elementos on-page corretos.",
        estimated_hours: 4,
        default_deadline_days: 5,
        default_priority: "high",
        complexity: "advanced",
        requires_access: true,
        execution_rules: [
          "Otimizar title tag: palavra-chave principal + nome da marca, máximo 60 caracteres",
          "Otimizar meta description: CTA + palavra-chave, máximo 155 caracteres",
          "Verificar estrutura de headings: H1 único por página, H2/H3 com palavras secundárias",
          "Adicionar ou otimizar alt text em todas as imagens",
          "Revisar e fortalecer links internos entre páginas relacionadas",
          "Não alterar conteúdo editorial sem aprovação do cliente",
        ],
        sort_order: 3,
        phase: "PA0002-E02",
      },
      {
        code: "PA0002-T04",
        name: "Link Building",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "SEO",
        task_type: "execution",
        description:
          "Prospecção e obtenção de backlinks de qualidade para aumentar a autoridade de domínio do site do cliente.",
        objective:
          "Obter backlinks relevantes que aumentem a autoridade do domínio e melhorem o posicionamento nas buscas orgânicas.",
        estimated_hours: 2,
        default_deadline_days: 7,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Prospectar sites relevantes do mesmo nicho com DA > 20",
          "Documentar cada backlink obtido com URL, DA do domínio e anchor text",
          "Não usar práticas de link building em massa ou spam — apenas links editoriais legítimos",
          "Priorizar menções de marca e diretórios relevantes do setor",
        ],
        sort_order: 4,
        phase: "PA0002-E02",
      },
      {
        code: "PA0002-T05",
        name: "Relatório Mensal de SEO",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "SEO",
        task_type: "execution",
        description:
          "Compilação dos resultados orgânicos do mês: posições das palavras-chave, tráfego orgânico, impressões, cliques e evolução mês a mês.",
        objective:
          "Entregar relatório mensal de SEO com métricas de performance orgânica e recomendações para o próximo período.",
        estimated_hours: 1.5,
        default_deadline_days: 2,
        default_priority: "medium",
        complexity: "basic",
        requires_access: false,
        execution_rules: [
          "Extrair dados do Google Search Console: impressões, cliques, CTR, posição média",
          "Comparar com período anterior",
          "Listar as 10 palavras-chave com melhor performance no período",
          "Incluir recomendações baseadas nos dados",
          "Não entregar relatório sem análise interpretativa",
        ],
        sort_order: 5,
        phase: "PA0002-E03",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PA0003 — Configuração de Google Negócios
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "PA0003",
    tasks: [
      {
        code: "PA0003-T01",
        name: "Verificação de Acessos e Análise do Briefing — Google Negócios",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "Google Negócios",
        task_type: "execution",
        description:
          "Análise completa do briefing, verificação do acesso compartilhado ao Google Meu Negócio e captação de informações no site e links úteis do cliente.",
        objective:
          "Garantir que todos os acessos necessários estejam disponíveis e que as informações do briefing sejam suficientes para iniciar a configuração.",
        estimated_hours: 0.5,
        default_deadline_days: 1,
        default_priority: "high",
        complexity: "basic",
        requires_access: true,
        execution_rules: [
          "Verificar se o acesso mktperformance2023@gmail.com foi compartilhado como proprietário",
          "Analisar o briefing completo (todos os 11 campos) antes de qualquer acesso ao perfil",
          "Acessar o site e os links úteis informados para captar informações complementares",
          "Se o acesso não estiver disponível, notificar o cliente e aguardar antes de avançar",
          "Se o briefing estiver incompleto, solicitar complementação antes de avançar para T02",
        ],
        steps: [
          {
            id: "PA0003-T01-S01",
            name: "Análise do Briefing",
            description:
              "Ler o briefing preenchido pelo cliente, identificar informações faltantes e confirmar recebimento de fotos e materiais.",
            order: 1,
            estimatedHours: 0.25,
            internalGuidance:
              "Verificar os 11 campos do briefing: conta Google, dados do negócio, endereço, site, descrição, telefone, modelos de resposta, observações e materiais.",
          },
          {
            id: "PA0003-T01-S02",
            name: "Verificação de Acesso e Captação no Site",
            description:
              "Confirmar acesso ao Google Meu Negócio via mktperformance2023@gmail.com e captar informações complementares no site e links enviados.",
            order: 2,
            estimatedHours: 0.25,
            internalGuidance:
              "Sem acesso confirmado, não avançar. Registrar URL do site visitado e informações captadas para uso na configuração.",
          },
        ],
        sort_order: 1,
        phase: "PA0003-E01",
      },
      {
        code: "PA0003-T02",
        name: "Configuração Completa do Google Negócios",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "Google Negócios",
        task_type: "execution",
        description:
          "Cadastro e configuração completa do perfil Google Meu Negócio: dados da empresa, horários, meios de contato, fotos, categoria, atributos, cardápio/catálogo, posts e respostas a avaliações. Preenchimento do documento de entrega com prints.",
        objective:
          "Ter o perfil Google Meu Negócio 100% configurado, com posts publicados e avaliações respondidas, pronto para entrega ao cliente.",
        estimated_hours: 2.25,
        default_deadline_days: 4,
        default_priority: "high",
        complexity: "intermediate",
        requires_access: true,
        execution_rules: [
          "Usar o nome exato do negócio — sem palavras-chave extras (viola políticas do Google)",
          "Cadastrar endereço, telefone e site exatamente como informados no briefing",
          "Configurar todos os horários de funcionamento, incluindo dias especiais se informados",
          "Preencher meios de contato: telefone, site, WhatsApp (se disponível)",
          "Fazer upload de todas as fotos enviadas pelo cliente (mínimo: capa e perfil)",
          "Configurar cardápio, catálogo ou lista de serviços quando enviados pelo cliente",
          "Publicar até 10 posts com base nos materiais e informações do briefing",
          "Responder até 20 avaliações usando os modelos de resposta fornecidos no briefing",
          "Preencher o documento de entrega (PA0003-DOC-ENTREGA) com print de cada seção configurada",
          "Solicitar carta de verificação Google quando o perfil ainda não estiver verificado",
          "Não fechar a tarefa com erros de cadastro — dado errado é retrabalho antes de entregar",
        ],
        steps: [
          {
            id: "PA0003-T02-S01",
            name: "Cadastro de Dados, Horários e Contatos",
            order: 1,
            estimatedHours: 0.75,
            internalGuidance:
              "Confirmar que o endereço está exato (incluindo CEP). Horários devem cobrir todos os dias informados. Telefone deve ter DDD.",
          },
          {
            id: "PA0003-T02-S02",
            name: "Categoria, Atributos, Fotos e Catálogo",
            order: 2,
            estimatedHours: 0.75,
            internalGuidance:
              "A categoria principal é o fator mais relevante para ranqueamento local. Usar categorias secundárias coerentes.",
          },
          {
            id: "PA0003-T02-S03",
            name: "Posts e Respostas a Avaliações",
            order: 3,
            estimatedHours: 0.5,
            internalGuidance:
              "Posts: variar entre novidade, oferta e evento. Respostas: usar os modelos do briefing, personalizando para cada avaliação.",
          },
          {
            id: "PA0003-T02-S04",
            name: "Documento de Entrega com Prints",
            order: 4,
            estimatedHours: 0.25,
            internalGuidance:
              "Prints obrigatórios: dados da empresa, horários, contatos, fotos carregadas, posts publicados e avaliações respondidas.",
          },
        ],
        sort_order: 2,
        phase: "PA0003-E02",
      },
      {
        code: "PA0003-T03",
        name: "Remoção de Acessos e Encerramento — Google Negócios",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "Google Negócios",
        task_type: "execution",
        description:
          "Após aprovação da entrega pelo cliente, remover o acesso mktperformance2023@gmail.com do perfil Google Meu Negócio e registrar o encerramento do projeto.",
        objective:
          "Garantir que o acesso temporário seja removido após a entrega aprovada, mantendo a segurança da conta do cliente.",
        estimated_hours: 0.25,
        default_deadline_days: 1,
        default_priority: "medium",
        complexity: "basic",
        requires_access: true,
        execution_rules: [
          "Somente remover o acesso após aprovação explícita da entrega pelo cliente",
          "Remover o e-mail mktperformance2023@gmail.com da lista de proprietários",
          "Confirmar por print que o acesso foi removido",
          "Notificar o cliente no chat que o acesso foi removido",
          "Registrar no histórico do projeto a data e hora da remoção",
        ],
        sort_order: 3,
        phase: "PA0003-E03",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PA0004 — Configuração de Data Analytics
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "PA0004",
    tasks: [
      {
        code: "PA0004-T01",
        name: "Verificação de Acessos e Análise do Briefing — Data Analytics",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "Data Analytics",
        task_type: "execution",
        description:
          "Leitura do briefing, identificação de todos os acessos necessários e confirmação da plataforma do site para definir o fluxo de instalação correto.",
        objective:
          "Garantir que todos os acessos, informações do site e lista de implantações estão confirmados antes de iniciar a instalação.",
        estimated_hours: 0.5,
        default_deadline_days: 1,
        default_priority: "high",
        complexity: "basic",
        requires_access: false,
        execution_rules: [
          "Identificar a plataforma do site (WordPress, GTM já instalado, outra plataforma)",
          "Confirmar quais tags/pixels foram solicitados no briefing",
          "Verificar se todos os acessos necessários foram compartilhados — se não, solicitar ao cliente antes de avançar",
          "Para WordPress: confirmar acesso de administrador ao painel WP",
          "Para outras plataformas: já preparar os códigos para entrega na E02",
        ],
        sort_order: 1,
        phase: "PA0004-E01",
      },
      {
        code: "PA0004-T02",
        name: "Configuração de Data Analytics e Entrega",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "Data Analytics",
        task_type: "execution",
        description:
          "Instalação do Google Tag Manager, configuração do Analytics, instalação dos pixels e tags de anúncios das plataformas solicitadas, configuração de eventos e conversões, testes de validação e entrega do documento DTAN-DOC-ENTREGA.",
        objective:
          "Instalar e configurar todas as tags e pixels solicitados, validar o disparo de cada implantação e entregar o documento comprobatório DTAN-DOC-ENTREGA.",
        estimated_hours: 4.75,
        default_deadline_days: 6,
        default_priority: "high",
        complexity: "advanced",
        requires_access: true,
        execution_rules: [
          "Analisar o briefing e verificar se o GTM já está instalado antes de iniciar",
          "Instalar e configurar o GTM no WordPress via plugin oficial — não editar o código do tema",
          "Instalar e configurar o Analytics, a tag do Google Ads e os pixels das plataformas solicitadas",
          "Elaborar documento com instruções de implantação quando a plataforma não for WordPress",
          "Não entregar com erros de instalação identificados ou sem a configuração dos eventos",
          "Elaborar o documento DTAN-DOC-ENTREGA com prints e confirmações de cada implantação",
        ],
        steps: [
          {
            id: "PA0004-T02-S01",
            name: "Google Tag Manager e Google Analytics 4",
            order: 1,
            estimatedHours: 1,
            internalGuidance:
              "Verificar se já existe contêiner GTM antes de criar um novo. GA4: usar tag de configuração + evento page_view.",
          },
          {
            id: "PA0004-T02-S02",
            name: "Pixel do Facebook Ads / Meta",
            order: 2,
            estimatedHours: 0.75,
            internalGuidance:
              "Usar o template oficial do Meta no GTM. Verificar com o Pixel Helper antes de publicar.",
          },
          {
            id: "PA0004-T02-S03",
            name: "Pixels TikTok, LinkedIn e Tags Google Ads",
            order: 3,
            estimatedHours: 1,
            internalGuidance:
              "Verificar se as contas estão ativas antes de instalar. Registrar no documento se conta não existir.",
          },
          {
            id: "PA0004-T02-S04",
            name: "Eventos, Conversões, Search Console e Testes",
            order: 4,
            estimatedHours: 1,
            internalGuidance:
              "Testar cada tag com Tag Assistant e Pixel Helper antes de avançar para S05.",
          },
          {
            id: "PA0004-T02-S05",
            name: "Documento de Entrega (DTAN-DOC-ENTREGA)",
            order: 5,
            estimatedHours: 1,
            internalGuidance:
              "Documento obrigatório. Uma seção por plataforma instalada. Documento sem prints não é aceito.",
          },
        ],
        sort_order: 2,
        phase: "PA0004-E02",
      },
      {
        code: "PA0004-T03",
        name: "Remoção de Acessos e Encerramento — Data Analytics",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "Data Analytics",
        task_type: "execution",
        description:
          "Remoção do e-mail mktperformance2023@gmail.com de todas as plataformas compartilhadas durante a execução da tarefa e encerramento formal.",
        objective:
          "Garantir que todos os acessos compartilhados pelo cliente sejam revogados ao final da tarefa.",
        estimated_hours: 0.5,
        default_deadline_days: 1,
        default_priority: "medium",
        complexity: "basic",
        requires_access: true,
        execution_rules: [
          "Remover mktperformance2023@gmail.com de todas as plataformas em que foi adicionado",
          "Verificar: Google Tag Manager, Analytics, Google Ads, Meta Business Manager, TikTok, LinkedIn",
          "Se o acesso ao site (WordPress Admin) foi fornecido, orientar o cliente a trocar a senha",
          "Registrar a remoção de cada acesso — não encerrar sem confirmar todas as remoções",
        ],
        sort_order: 3,
        phase: "PA0004-E03",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PA0005 — Análise de Usabilidade UX
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "PA0005",
    tasks: [
      {
        code: "PA0005-T01",
        name: "Análise de Usabilidade UX",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "UX",
        task_type: "execution",
        description:
          "Análise completa das páginas indicadas no briefing: velocidade (PageSpeed Insights), navegação e fluidez, verificação funcional de botões e links, e diagnóstico de tagueamento.",
        objective:
          "Identificar e documentar todos os problemas de usabilidade, performance e tagueamento nas páginas analisadas, com evidências visuais para cada problema encontrado.",
        estimated_hours: 1.5,
        default_deadline_days: 4,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Analisar exatamente as páginas listadas no briefing",
          "Executar Google PageSpeed Insights em versão desktop E mobile para cada página",
          "Testar todos os botões e links de cada página: clicar em cada elemento e registrar o status",
          "Verificar tagueamento com Tag Assistant do Google",
          "Cada problema identificado deve ter print de evidência e descrição do impacto",
          "Se o site estiver fora do ar durante a análise, notificar o líder imediatamente",
        ],
        steps: [
          {
            id: "UXAN-T01-S01",
            name: "Análise de Velocidade e Performance",
            order: 1,
            estimatedHours: 0.5,
            internalGuidance:
              "Usar pagespeed.web.dev. Print da aba 'Performance' com pontuação visível. Registrar as 3 maiores oportunidades.",
          },
          {
            id: "UXAN-T01-S02",
            name: "Análise de Navegação, Botões e Links",
            order: 2,
            estimatedHours: 0.75,
            internalGuidance:
              "Criar tabela: página → elemento → status (OK/quebrado/redirecionamento errado). Testar desktop e mobile.",
          },
          {
            id: "UXAN-T01-S03",
            name: "Verificação de Tagueamento",
            order: 3,
            estimatedHours: 0.25,
            internalGuidance:
              "Usar Tag Assistant e Meta Pixel Helper. Registrar cada tag encontrada: nome, status, page_view confirmado.",
          },
        ],
        sort_order: 1,
        phase: "PA0005-E01",
      },
      {
        code: "PA0005-T02",
        name: "Relatório de Usabilidade e Entrega",
        category: "Performance e Anúncios Patrocinados",
        subcategory: "UX",
        task_type: "execution",
        description:
          "Compilação de todos os dados coletados durante a análise, preenchimento completo do relatório PA0005-REL-UX com evidências e lista priorizada de recomendações, e envio ao cliente.",
        objective:
          "Entregar o relatório PA0005-REL-UX completo com evidências de todos os problemas encontrados e recomendações priorizadas por impacto.",
        estimated_hours: 0.5,
        default_deadline_days: 1,
        default_priority: "high",
        complexity: "basic",
        requires_access: false,
        execution_rules: [
          "Preencher todas as seções obrigatórias do relatório PA0005-REL-UX",
          "Cada problema deve ter print de evidência, descrição e classificação de impacto (crítico/moderado/leve)",
          "A lista de recomendações deve ser priorizada da mais impactante para a menos urgente",
          "Não entregar relatório com seções em branco ou sem evidências visuais",
          "Anexar o relatório na etapa E02 antes de marcá-la como concluída",
        ],
        sort_order: 2,
        phase: "PA0005-E02",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC0001 — Layout de Redes Sociais
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "DC0001",
    tasks: [
      {
        code: "DC0001-T01",
        name: "Criação de Layout para Redes Sociais",
        category: "Design e Criação",
        subcategory: "Redes Sociais",
        task_type: "execution",
        description:
          "Desenvolvimento completo do layout de perfil e capa para as redes sociais selecionadas, coerente com a identidade visual da marca.",
        objective:
          "Entregar o layout de redes sociais (capa + perfil) em alta definição com mockups, dentro do prazo de 2 dias úteis.",
        estimated_hours: 2,
        default_deadline_days: 2,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Analisar o briefing e pesquisar sobre o tema; acessar as redes do cliente antes de iniciar.",
          "Enviar os arquivos em PDF e os arquivos em PNG junto com os mockups ao concluir.",
          "O executor pode utilizar Canva, Photoshop ou ferramentas de IA.",
          "Criar arquivo .ZIP com o modelo de entrega nomeado como 'Projeto_nº da tarefa'.",
          "Não entregar com erros gramaticais, fora do tema ou em desacordo com a identidade visual.",
          "Não entregar com trechos copiados ou qualquer forma de plágio.",
        ],
        conclusion_rules:
          "A tarefa poderá ser aprovada ou reprovada pelo cliente. Em caso de reprovação, o nômade deverá realizar as correções solicitadas até o próximo dia útil.",
        steps: [
          {
            id: "DC0001-T01-S01",
            name: "Análise do briefing e pesquisa",
            order: 1,
            estimatedMinutes: 30,
            internalGuidance:
              "Verificar paleta de cores, logotipo, tipografia e referências enviadas. Anotar insights antes de abrir o editor.",
          },
          {
            id: "DC0001-T01-S02",
            name: "Criação do layout",
            order: 2,
            estimatedMinutes: 60,
            internalGuidance:
              "Usar Canva, Photoshop ou IA. Criar versões para cada rede social nas dimensões corretas.",
          },
          {
            id: "DC0001-T01-S03",
            name: "Geração de mockups e exportação",
            order: 3,
            estimatedMinutes: 20,
            internalGuidance:
              "Exportar PDF com mockups e arquivos PNG em alta resolução, organizados por rede social.",
          },
          {
            id: "DC0001-T01-S04",
            name: "Empacotamento e entrega",
            order: 4,
            estimatedMinutes: 10,
            internalGuidance:
              "Nome: Projeto_[número da tarefa]_[rede social]_[tipo].png. Verificar se todos estão presentes antes de fechar o ZIP.",
          },
        ],
        sort_order: 1,
        phase: "DC0001-E01",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC0002 — Criativos Mídia Display Estático
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "DC0002",
    tasks: [
      {
        code: "DC0002-T01",
        name: "Conteúdo e Legenda para Criativos",
        category: "Design e Criação",
        subcategory: "Mídias e Conteúdo",
        task_type: "execution",
        description:
          "Criação de conteúdo e legenda para os criativos que serão elaborados, com versão adaptada para veiculação em anúncios patrocinados.",
        objective:
          "Criação de conteúdo e legenda para os criativos que serão elaborados.",
        estimated_hours: 1.5,
        default_deadline_days: 1,
        default_priority: "medium",
        complexity: "basic",
        requires_access: false,
        execution_rules: [
          "Analisar o briefing detalhadamente e criar o conteúdo do criativo e a legenda com a CTA desejada.",
          "Enviar em documento padronizado o texto para a legenda (até 200 palavras) para até 3 redes sociais.",
          "Criar uma versão da legenda para anúncios patrocinados (texto primário ≤ 150 chars, título ≤ 50 chars).",
          "Não entregar com erros gramaticais, fora do tema ou em desacordo com a comunicação visual.",
          "Não entregar com trechos copiados/plágio.",
        ],
        conclusion_rules:
          "A tarefa poderá ser aprovada ou reprovada. Em caso de reprovação, o nômade deverá realizar as correções até o próximo dia útil.",
        sort_order: 1,
        phase: "DC0002-E01",
      },
      {
        code: "DC0002-T02",
        name: "Layout de Criativos Mídia Display Estático",
        category: "Design e Criação",
        subcategory: "Mídias e Conteúdo",
        task_type: "execution",
        description:
          "Criação do layout do banner estático para mídia display, em todas as medidas solicitadas, com entrega em .zip contendo arquivos .png e .psd.",
        objective: "Criação de Banner Digital para mídia display.",
        estimated_hours: 6,
        default_deadline_days: 2,
        default_priority: "high",
        complexity: "advanced",
        requires_access: false,
        execution_rules: [
          "Analisar toda a solicitação e a identidade visual do cliente.",
          "Pegar o conteúdo já elaborado e aprovado na etapa anterior.",
          "Entregar em todas as medidas obedecendo às margens de segurança de cada criativo.",
          "Enviar as opções em arquivo fechado .png e arquivo aberto .psd, separados em duas pastas dentro de um .zip.",
          "Inserir o link das imagens utilizadas comprovando a liberação do direito de uso.",
          "No caso de erro de diagramação ou digitação, retornar para alteração sem alterar o prazo.",
        ],
        conclusion_rules:
          "A tarefa poderá ser aprovada ou reprovada. Em caso de reprovação, o nômade deverá realizar as correções até o próximo dia útil.",
        sort_order: 2,
        phase: "DC0002-E02",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC0003 — Tratamento de até 10 Imagens
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "DC0003",
    tasks: [
      {
        code: "DC0003-T01",
        name: "Tratamento e Edição de até 10 Imagens",
        category: "Design e Criação",
        subcategory: "Tratamento de Imagens",
        task_type: "execution",
        description:
          "Tratamento e edição completa das imagens enviadas: limpeza, recorte, correção de contraste, saturação, sombras e pele, conforme briefing, com entrega de antes e depois no documento padronizado.",
        objective: "Tratamento e Edição de até 10 Imagens",
        estimated_hours: 4,
        default_deadline_days: 3,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Enviar todas as imagens solicitadas em PNG ou JPEG, apresentando a original e a editada lado a lado no documento padronizado.",
          "Realizar verificação da qualidade, ajustando contraste, saturação, sombras e corrigindo a pele.",
          "Após o tratamento, enviar todas em um arquivo .zip com o documento padronizado de antes e depois.",
          "É recomendado relatar no documento as melhorias realizadas.",
          "Não entregar com erros de edição e tratamento.",
          "Em caso de problema, a tarefa será devolvida para correção sem alteração do prazo inicial.",
        ],
        conclusion_rules:
          "A tarefa poderá ser aprovada ou reprovada. Em caso de reprovação, o nômade deverá realizar as correções até o próximo dia útil.",
        sort_order: 1,
        phase: "DC0003-E01",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC0004 — Papelaria (3 unidades)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "DC0004",
    tasks: [
      {
        code: "DC0004-T01",
        name: "Criação das Peças de Papelaria",
        category: "Design e Criação",
        subcategory: "Papelaria",
        task_type: "execution",
        description:
          "Pesquisar, criar e entregar até 3 peças de papelaria em .PNG com mockup, respeitando a identidade visual da marca do cliente.",
        objective:
          "Entregar até 3 peças de papelaria em .PNG com mockup para aprovação, com design coerente com a identidade visual da marca.",
        estimated_hours: 4,
        default_deadline_days: 3,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Ler o briefing completo e fazer pesquisa sobre o tema antes de iniciar qualquer criação",
          "Acessar as redes sociais do cliente para entender o tom de voz e o estilo visual",
          "Aplicar a identidade visual da marca: logotipo, paleta de cores, tipografia",
          "Criar cada peça no formato e dimensão corretos para impressão",
          "Incluir sangria (bleed) de 3mm e área de segurança nas peças com corte",
          "Enviar todos os materiais em .PNG com mockups para aprovação do cliente",
          "Não entregar com erros gramaticais, fora do tema ou em desacordo com a comunicação visual",
          "Não entregar com trechos copiados ou plágio",
        ],
        conclusion_rules:
          "A tarefa poderá ser aprovada ou reprovada pelo cliente; se reprovada, retornar para correção até o próximo dia útil.",
        steps: [
          {
            id: "DC0004-T01-S01",
            name: "Análise do Briefing e Identidade Visual",
            order: 1,
            estimatedHours: 0.5,
          },
          {
            id: "DC0004-T01-S02",
            name: "Criação das Peças (até 3 peças)",
            order: 2,
            estimatedHours: 3.5,
          },
        ],
        sort_order: 1,
        phase: "DC0004-E01",
      },
      {
        code: "DC0004-T02",
        name: "Entrega Final — ZIP, PDF e Arquivo AI (Papelaria)",
        category: "Design e Criação",
        subcategory: "Papelaria",
        task_type: "execution",
        description:
          "Compilar e entregar o arquivo .ZIP com PDF em alta resolução, criativos em .png e arquivo AI editável com fontes incorporadas.",
        objective:
          "Entregar ao cliente o arquivo .ZIP completo com PDF e criativos em .png nomeados corretamente, mais o arquivo AI editável.",
        estimated_hours: 1.5,
        default_deadline_days: 1,
        default_priority: "medium",
        complexity: "basic",
        requires_access: false,
        execution_rules: [
          "Criar mockup realista de cada peça",
          "Exportar PDF (CMYK, 300dpi) e AI editável com camadas organizadas",
          "Nomear arquivos no padrão: 'nº da tarefa - projeto - papelaria'",
          "Verificar se todas as peças estão presentes antes de fechar o ZIP",
        ],
        sort_order: 2,
        phase: "DC0004-E02",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC0005 — Layout de Website
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "DC0005",
    tasks: [
      {
        code: "DC0005-T01",
        name: "Criação do Layout de Website",
        category: "Design e Criação",
        subcategory: "Web Design",
        task_type: "execution",
        description:
          "Criação do layout de website com identidade visual da marca aplicada, nos formatos e quantidade de páginas da variação contratada. Entrega em PDF para aprovação antes dos arquivos finais.",
        objective:
          "Criar o layout de website conforme briefing, aplicando identidade visual, e apresentar para aprovação em PDF antes da entrega dos arquivos abertos.",
        estimated_hours: 18,
        default_deadline_days: 7,
        default_priority: "high",
        complexity: "advanced",
        requires_access: false,
        execution_rules: [
          "Ler o briefing completo e pesquisar o nicho do cliente antes de iniciar qualquer criação",
          "Acessar as redes sociais e o site atual do cliente (se existir) para entender o tom e estilo visual",
          "Aplicar identidade visual da marca: logotipo, paleta de cores, tipografia e demais elementos",
          "Respeitar o formato padrão 1920×1080px, salvo outro formato informado no briefing",
          "Criar o número de páginas contratado na variação — não entregar menos do que o escopo",
          "Criar a versão mobile adaptada para todas as páginas criadas",
          "Entregar o PDF de todas as páginas (desktop e mobile) para aprovação antes de avançar para E02",
          "Não entregar com erros gramaticais, fora do tema ou em desacordo com a identidade visual",
          "Não utilizar elementos com direitos autorais de terceiros sem autorização",
        ],
        steps: [
          {
            id: "DC0005-T01-S01",
            name: "Análise do Briefing e Planejamento",
            order: 1,
            estimatedHours: 2,
            internalGuidance:
              "Verificar: logotipo em vetor, paleta de cores com hex, tipografias. Planejar estrutura antes de criar.",
          },
          {
            id: "DC0005-T01-S02",
            name: "Criação das Páginas (desktop)",
            order: 2,
            estimatedHours: 12,
            internalGuidance:
              "Grid consistente. Hierarquia visual clara. Criar todas as páginas antes da versão mobile.",
          },
          {
            id: "DC0005-T01-S03",
            name: "Adaptação Mobile",
            order: 3,
            estimatedHours: 4,
            internalGuidance:
              "Formato mobile: 390×844px. Botões com área mínima de 44px. Menus adaptados.",
          },
        ],
        sort_order: 1,
        phase: "DC0005-E01",
      },
      {
        code: "DC0005-T02",
        name: "Entrega dos Arquivos Finais — Website",
        category: "Design e Criação",
        subcategory: "Web Design",
        task_type: "execution",
        description:
          "Entrega do arquivo aberto (PSD ou Figma) com todas as páginas, imagens e fontes incluídas, após aprovação do PDF pelo cliente.",
        objective:
          "Entregar ao cliente os arquivos abertos organizados para uso e edições futuras.",
        estimated_hours: 1,
        default_deadline_days: 1,
        default_priority: "medium",
        complexity: "basic",
        requires_access: false,
        execution_rules: [
          "Compilar arquivo .ZIP com: PDF de todas as páginas (desktop e mobile), arquivo PSD ou Figma, imagens e fontes",
          "PSD: camadas organizadas e nomeadas por página/seção, fontes incorporadas",
          "Figma: arquivo organizado por frames/páginas, com todos os componentes disponíveis",
          "Verificar se todas as páginas da variação contratada estão no arquivo antes de entregar",
          "Não entregar arquivo com camadas desorganizadas, fontes faltando ou páginas faltantes",
        ],
        sort_order: 2,
        phase: "DC0005-E02",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC0006 — Template para Criativos (5 unidades)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    productId: "DC0006",
    tasks: [
      {
        code: "DC0006-T01",
        name: "Template para Criativos (5 unidades)",
        category: "Design e Criação",
        subcategory: "Templates Criativos",
        task_type: "execution",
        description:
          "Criação de até 5 templates criativos em Canva, Photoshop ou Illustrator, em até 3 formatos/dimensões solicitados, com design profissional e identidade visual alinhada à marca. Entrega em arquivo aberto e arquivos finais em .png em .zip.",
        objective: "Template para Criativos (5 unidades)",
        estimated_hours: 5,
        default_deadline_days: 4,
        default_priority: "medium",
        complexity: "intermediate",
        requires_access: false,
        execution_rules: [
          "Analisar o briefing detalhadamente — verificar objetivo, público-alvo, formatos e identidade visual.",
          "Pesquisar a identidade visual do cliente: redes sociais, site, manual de marca ou referências enviadas.",
          "Desenvolver os 5 templates conforme as ideias e dimensões descritas, mantendo consistência visual.",
          "Se o cliente enviar bases ou referências visuais prontas, utilizá-las como ponto de partida.",
          "Não entregar materiais com erros gramaticais, fora do tema ou com conteúdo plagiário.",
          "Photoshop: .psd (abertos, incorporados) + .png final. Illustrator: .ai (abertos) + .png final. Canva: link editável + .png exportado. Todos organizados em .zip.",
          "Se a entrega for pelo Canva, o link editável deve permanecer ativo por no mínimo 10 dias.",
          "Em caso de reprovação, a tarefa será devolvida para correção sem alterar o prazo original.",
        ],
        conclusion_rules:
          "A tarefa poderá ser aprovada ou reprovada. Em caso de reprovação, retornar para correção no próximo dia útil.",
        sort_order: 1,
        phase: "DC0006-E01",
      },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const product of CATALOG) {
    console.log(`\n▶ Produto ${product.productId}`);

    for (const task of product.tasks) {
      // Upsert CatalogTask by code
      const existing = await prisma.catalogTask.findUnique({
        where: { code: task.code },
      });

      let catalogTaskId: string;

      if (existing) {
        console.log(`  ⏭  ${task.code} — já existe, pulando criação`);
        catalogTaskId = existing.id;
        skipped++;
      } else {
        const created_task = await prisma.catalogTask.create({
          data: {
            code: task.code,
            name: task.name,
            category: task.category,
            subcategory: task.subcategory ?? null,
            task_type: task.task_type,
            description: task.description ?? null,
            objective: task.objective ?? null,
            estimated_hours: task.estimated_hours ?? null,
            default_deadline_days: task.default_deadline_days ?? null,
            default_priority: task.default_priority ?? "medium",
            complexity: task.complexity ?? "basic",
            requires_access: task.requires_access ?? false,
            requires_briefing: task.requires_briefing ?? false,
            requires_files: false,
            briefing_questions: j(task.briefing_questions),
            execution_rules: j(task.execution_rules),
            conclusion_rules: task.conclusion_rules ?? null,
            internal_guidance: task.internal_guidance ?? null,
            steps: j(task.steps),
            status: "ativa",
            is_active: true,
          },
        });
        console.log(`  ✅ ${task.code} — criado (id: ${created_task.id})`);
        catalogTaskId = created_task.id;
        created++;
      }

      // Upsert ProductCatalogTask link
      await prisma.productCatalogTask.upsert({
        where: {
          product_id_catalog_task_id: {
            product_id: product.productId,
            catalog_task_id: catalogTaskId,
          },
        },
        update: {
          sort_order: task.sort_order,
          phase: task.phase ?? null,
        },
        create: {
          product_id: product.productId,
          catalog_task_id: catalogTaskId,
          sort_order: task.sort_order,
          is_mandatory: true,
          phase: task.phase ?? null,
        },
      });
      console.log(
        `  🔗 Link ${product.productId} ↔ ${task.code} (fase: ${task.phase ?? "—"})`,
      );
      linked++;
    }
  }

  console.log("\n═══════════════════════════════");
  console.log(`✅ Tarefas criadas:  ${created}`);
  console.log(`⏭  Tarefas puladas: ${skipped}`);
  console.log(`🔗 Links criados:   ${linked}`);
  console.log("═══════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro na migração:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

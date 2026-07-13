/**
 * seed-demo-partner-projects.ts
 * Cria infraestrutura completa do portal parceiro (usuário, empresas, 15 projetos)
 * e popula completamente seed-partner-proj-02 com produtos, tarefas, etapas,
 * briefing e anexos.
 *
 * IDEMPOTENTE: usa upsert com IDs fixos; pode rodar N vezes.
 * NÃO apaga dados. NÃO usa db reset, db push, db migrate.
 * Senhas sempre contêm "DEMO". URLs sempre terminam em .test
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-partner-projects -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-partner-projects
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { withProjectCode } from "../src/lib/create-project";
import { confirmPaymentAndGenerateProjectTasks, withIdempotentRetry } from "../src/lib/confirm-payment";
import { ensureTaskStages } from "../src/lib/generate-tasks-from-spec";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Constantes de identidade ──────────────────────────────────────────────────
const PARTNER_EMAIL = "partner@allka.test";
const PARTNER_NAME  = "Partner Conta Teste";
const PARTNER_PWD   = "DEMO-Partner2026!";

// 3 empresas exclusivas do parceiro (IDs fixos)
const PARTNER_COMPANIES = [
  { id: "seed-partner-company-A", name: "Cliente Partner Alpha Ltda", cnpj: "30100100000101", segment: "Tecnologia", email: "contato@alpha.com.br", phone: "(11) 97777-7777" },
  { id: "seed-partner-company-B", name: "Cliente Partner Beta Ltda",  cnpj: "30200200000102", segment: "Marketing",  email: "contato@beta.com.br",  phone: "(11) 98888-8888" },
  { id: "seed-partner-company-C", name: "Cliente Partner Gamma Ltda", cnpj: "30300300000103", segment: "Design",     email: "contato@gamma.com.br", phone: "(11) 99999-9999" },
];

// IDs de clientes da agência para os 5 projetos extras
const AGENCY_EXTRA_PROJECTS = [
  { id: "seed-ag-proj-11", title: "Estratégia de Growth Hacking",     client_id: "seed-ag-client-nubank",   type: "Marketing Digital",    status: "in-progress", progress: 55, budget: 18000, value: 18000, start_date: new Date("2026-04-01"), end_date: new Date("2026-07-31"), created_at: new Date("2026-03-20T09:00:00Z") },
  { id: "seed-ag-proj-12", title: "Campanha de Lançamento Produto",   client_id: "seed-ag-client-natura",   type: "Campanha",             status: "planning",    progress: 10, budget: 42000, value: 42000, start_date: new Date("2026-06-01"), end_date: new Date("2026-09-30"), created_at: new Date("2026-05-10T14:00:00Z") },
  { id: "seed-ag-proj-13", title: "SEO & Performance Mensal",         client_id: "seed-ag-client-tesla",    type: "SEO",                  status: "in-progress", progress: 70, budget: 7200,  value: 7200,  start_date: new Date("2026-01-01"), end_date: new Date("2026-12-31"), created_at: new Date("2025-12-10T10:00:00Z") },
  { id: "seed-ag-proj-14", title: "Webinar de Automação Industrial",  client_id: "seed-ag-client-ambev",    type: "Evento Digital",       status: "draft",       progress: 0,  budget: 22000, value: 22000, start_date: new Date("2026-08-15"), end_date: new Date("2026-08-15"), created_at: new Date("2026-06-01T08:00:00Z") },
  { id: "seed-ag-proj-15", title: "Dashboard Analítico BI",           client_id: "seed-ag-client-embraer",  type: "Desenvolvimento Web",  status: "negotiation", progress: 5,  budget: 58000, value: 58000, start_date: new Date("2026-07-01"), end_date: new Date("2026-12-31"), created_at: new Date("2026-05-28T11:00:00Z") },
];

// 15 projetos do parceiro (IDs fixos, client_id → empresa do parceiro)
const PARTNER_PROJECTS = [
  // Cliente Partner Alpha Ltda
  { id: "seed-partner-proj-01", title: "Identidade Visual Verão 2027",         client_id: "seed-partner-company-A", type: "Branding",            status: "in-progress",    progress: 45, budget: 32000, value: 32000, start_date: new Date("2026-05-01"), end_date: new Date("2026-08-31"), created_at: new Date("2026-04-15T10:00:00Z") },
  { id: "seed-partner-proj-02", title: "Campanha Digital Copa",                client_id: "seed-partner-company-A", type: "Campanha",            status: "planning",       progress: 20, budget: 75000, value: 75000, start_date: new Date("2026-09-01"), end_date: new Date("2026-12-15"), created_at: new Date("2026-07-01T09:00:00Z") },
  { id: "seed-partner-proj-03", title: "E-commerce Drinks Premium",            client_id: "seed-partner-company-A", type: "Desenvolvimento Web", status: "draft",          progress: 0,  budget: 90000, value: 90000, start_date: new Date("2026-10-01"), end_date: new Date("2027-02-28"), created_at: new Date("2026-06-20T14:00:00Z") },
  { id: "seed-partner-proj-04", title: "Influencer Hub Micro",                 client_id: "seed-partner-company-A", type: "Social Media",        status: "in-progress",    progress: 60, budget: 15000, value: 15000, start_date: new Date("2026-04-01"), end_date: new Date("2026-09-30"), created_at: new Date("2026-03-28T11:00:00Z") },
  { id: "seed-partner-proj-05", title: "App Loyalty Refresh",                  client_id: "seed-partner-company-A", type: "UX/UI",               status: "completed",      progress: 100, budget: 48000, value: 48000, start_date: new Date("2025-11-01"), end_date: new Date("2026-02-28"), created_at: new Date("2025-10-15T08:00:00Z") },
  // Cliente Partner Beta Ltda
  { id: "seed-partner-proj-06", title: "Menu Digital Interativo",              client_id: "seed-partner-company-B", type: "UX/UI",               status: "in-progress",    progress: 35, budget: 24000, value: 24000, start_date: new Date("2026-05-15"), end_date: new Date("2026-08-15"), created_at: new Date("2026-05-01T10:00:00Z") },
  { id: "seed-partner-proj-07", title: "Campanha Sazonalidade",                client_id: "seed-partner-company-B", type: "Social Media",        status: "planning",       progress: 15, budget: 19000, value: 19000, start_date: new Date("2026-08-01"), end_date: new Date("2026-11-30"), created_at: new Date("2026-06-10T14:00:00Z") },
  { id: "seed-partner-proj-08", title: "Treinamento Digital Baristas",         client_id: "seed-partner-company-B", type: "E-learning",          status: "awaiting-payment", progress: 0, budget: 38000, value: 38000, start_date: new Date("2026-09-01"), end_date: new Date("2026-12-31"), created_at: new Date("2026-05-25T09:00:00Z") },
  { id: "seed-partner-proj-09", title: "Email Marketing Mensal 2026",          client_id: "seed-partner-company-B", type: "E-mail Marketing",    status: "in-progress",    progress: 80, budget: 6000,  value: 6000,  start_date: new Date("2026-01-01"), end_date: new Date("2026-12-31"), created_at: new Date("2025-12-20T11:00:00Z") },
  { id: "seed-partner-proj-10", title: "Podcast Café com Cultura",             client_id: "seed-partner-company-B", type: "Conteúdo",            status: "draft",          progress: 0,  budget: 12000, value: 12000, start_date: new Date("2026-10-01"), end_date: new Date("2026-12-31"), created_at: new Date("2026-06-15T08:00:00Z") },
  // Cliente Partner Gamma Ltda
  { id: "seed-partner-proj-11", title: "Portfólio de Casos de Sucesso",        client_id: "seed-partner-company-C", type: "Content",             status: "in-progress",    progress: 50, budget: 28000, value: 28000, start_date: new Date("2026-04-01"), end_date: new Date("2026-09-30"), created_at: new Date("2026-03-20T10:00:00Z") },
  { id: "seed-partner-proj-12", title: "Ads Performance Max Q3",               client_id: "seed-partner-company-C", type: "Marketing Digital",   status: "planning",       progress: 5,  budget: 55000, value: 55000, start_date: new Date("2026-07-01"), end_date: new Date("2026-09-30"), created_at: new Date("2026-05-30T14:00:00Z") },
  { id: "seed-partner-proj-13", title: "Site Corporativo Responsive",          client_id: "seed-partner-company-C", type: "Desenvolvimento Web", status: "completed",      progress: 100, budget: 40000, value: 40000, start_date: new Date("2025-10-01"), end_date: new Date("2026-01-31"), created_at: new Date("2025-09-15T08:00:00Z") },
  { id: "seed-partner-proj-14", title: "Workshop IA para Times",               client_id: "seed-partner-company-C", type: "Consultoria",         status: "draft",          progress: 0,  budget: 18000, value: 18000, start_date: new Date("2026-09-15"), end_date: new Date("2026-09-15"), created_at: new Date("2026-06-01T11:00:00Z") },
  { id: "seed-partner-proj-15", title: "Relatório de Benchmarking Anual",      client_id: "seed-partner-company-C", type: "Consultoria",         status: "in-progress",    progress: 30, budget: 22000, value: 22000, start_date: new Date("2026-06-01"), end_date: new Date("2026-08-31"), created_at: new Date("2026-05-20T09:00:00Z") },
];

// ── IDs fixos para seed-partner-proj-02 ──────────────────────────────────────
const PROJ02 = "seed-partner-proj-02";
const PP_DC0001_ID = "spp02-pp-dc0001";
const PP_DC0002_ID = "spp02-pp-dc0002";
const TASK_LAYOUT_ID   = "spp02-task-layout";
const TASK_CONTENT_ID  = "spp02-task-content";

// Etapas do layout (DC0001-T01: 4 etapas)
const LAYOUT_STAGES = [
  { id: "spp02-layout-s1", titulo: "Receber e analisar briefing visual",         descricao: "Verificar referências, cores, fontes e formatos solicitados.", ordem: 1, briefing_necessario: true  },
  { id: "spp02-layout-s2", titulo: "Criar layouts no Figma/Photoshop/Canva",     descricao: "Desenvolver peças conforme formatos acordados.",               ordem: 2, briefing_necessario: false },
  { id: "spp02-layout-s3", titulo: "Enviar para revisão interna",                descricao: "Verificar identidade visual e qualidade antes de apresentar.", ordem: 3, briefing_necessario: false },
  { id: "spp02-layout-s4", titulo: "Apresentar ao cliente e coletar feedback",   descricao: "Enviar PDF ou link de visualização para aprovação.",            ordem: 4, briefing_necessario: false },
];

// Etapas do conteúdo (DC0002-T01 3 + DC0002-T02 4 = 7 etapas)
const CONTENT_STAGES = [
  { id: "spp02-content-s1", titulo: "Coletar briefing de conteúdo e objetivo",        descricao: "Objetivo da campanha, público, CTA e mensagem-chave.",               ordem: 1, briefing_necessario: true  },
  { id: "spp02-content-s2", titulo: "Criar copies e legendas iniciais",               descricao: "Textos para headline, descrição e CTA.",                              ordem: 2, briefing_necessario: false },
  { id: "spp02-content-s3", titulo: "Validar copies com a agência",                   descricao: "Aprovação interna dos textos antes da produção.",                     ordem: 3, briefing_necessario: false },
  { id: "spp02-content-s4", titulo: "Criar criativos nos formatos solicitados",       descricao: "Ex: 300×250, 728×90, 160×600, 320×50.",                               ordem: 4, briefing_necessario: false },
  { id: "spp02-content-s5", titulo: "Revisar visualmente todos os formatos",          descricao: "Verificar alinhamento, legibilidade e CTA em cada formato.",          ordem: 5, briefing_necessario: false },
  { id: "spp02-content-s6", titulo: "Exportar em PNG/JPG e organizar arquivos",       descricao: "Nomenclatura padrão e compactação em ZIP.",                           ordem: 6, briefing_necessario: false },
  { id: "spp02-content-s7", titulo: "Entregar e registrar aprovação",                 descricao: "Enviar ao cliente e coletar aprovação final.",                        ordem: 7, briefing_necessario: false },
];

// ── Briefing para layout (Criação de Layout para Redes Sociais) ───────────────
const LAYOUT_BRIEFING_QUESTIONS = [
  { question_key: "q_objetivo",     question_text: "Qual é o objetivo do layout?",            type: "text_long",  required: true,  options: [] },
  { question_key: "q_formato",      question_text: "Qual é o formato da peça?",               type: "text_short", required: true,  options: [] },
  { question_key: "q_referencias",  question_text: "Há referências visuais para seguir?",     type: "text_long",  required: false, options: [] },
  { question_key: "q_cores",        question_text: "Quais as cores da marca?",                type: "text_short", required: true,  options: [] },
  { question_key: "q_texto",        question_text: "Qual o texto/mensagem principal?",        type: "text_long",  required: true,  options: [] },
  { question_key: "q_cta",          question_text: "Qual o CTA (chamada para ação)?",         type: "text_short", required: true,  options: [] },
  { question_key: "q_restricoes",   question_text: "Há restrições de marca ou conteúdo?",    type: "text_long",  required: false, options: [] },
];

const LAYOUT_BRIEFING_ANSWERS = [
  { question_key: "q_objetivo",    answer: "Gerar engajamento e reconhecimento de marca da Campanha Digital Copa 2026 nos canais sociais da empresa." },
  { question_key: "q_formato",     answer: "Post quadrado 1080×1080px (Instagram feed), Story 1080×1920px e banner horizontal 1200×628px (LinkedIn/Facebook)." },
  { question_key: "q_referencias", answer: "Sim. Referências no Google Drive: paleta vibrante, elementos esportivos, logo Copa em destaque. Estilo dinâmico e moderno." },
  { question_key: "q_cores",       answer: "Vermelho #D62020, dourado #F5A623 e branco #FFFFFF — cores da campanha Copa. Logotipo no canto superior esquerdo sempre." },
  { question_key: "q_texto",       answer: "Seja parte da Copa com a gente! Headline curta e impactante relacionada ao espírito de time e vitória." },
  { question_key: "q_cta",         answer: "Acesse o site e confira as promoções. Link na bio." },
  { question_key: "q_restricoes",  answer: "Não usar imagens de atletas reais sem autorização. Evitar referências diretas a marcas concorrentes de bebidas." },
];

// ── Briefing para conteúdo (Conteúdo e Legenda para Criativos) ───────────────
const CONTENT_BRIEFING_QUESTIONS = [
  { question_key: "q_produto",    question_text: "Qual produto/serviço será destacado?",       type: "text_short", required: true,  options: [] },
  { question_key: "q_tom",        question_text: "Qual o tom de voz da marca?",                type: "text_short", required: true,  options: [] },
  { question_key: "q_publico",    question_text: "Quem é o público-alvo?",                     type: "text_long",  required: true,  options: [] },
  { question_key: "q_ctas",       question_text: "Quais CTAs (chamadas para ação) deseja?",    type: "text_long",  required: true,  options: [] },
  { question_key: "q_objetivo",   question_text: "Qual é o objetivo da peça?",                 type: "text_long",  required: true,  options: [] },
  { question_key: "q_formatos",   question_text: "Quais formatos de mídia são necessários?",   type: "text_short", required: true,  options: [] },
  { question_key: "q_restricoes", question_text: "Há restrições ou observações importantes?",  type: "text_long",  required: false, options: [] },
];

const CONTENT_BRIEFING_ANSWERS = [
  { question_key: "q_produto",    answer: "Criativos estáticos para a Campanha Digital Copa — banners promocionais e displays para mídia programática." },
  { question_key: "q_tom",        answer: "Empolgante, energético e motivacional. Sensação de time, pertencimento e vitória. Sem ser formal." },
  { question_key: "q_publico",    answer: "Adultos de 18 a 45 anos, apaixonados por futebol, consumidores ativos nas redes sociais durante a Copa." },
  { question_key: "q_ctas",       answer: "1) 'Jogue junto com a gente!' 2) 'Confira as promoções da Copa' 3) 'Acesse agora e ganhe' — variação por formato." },
  { question_key: "q_objetivo",   answer: "Aumentar o reconhecimento da marca durante o período da Copa e direcionar tráfego para a landing page da campanha." },
  { question_key: "q_formatos",   answer: "Display estático: 300×250px, 728×90px, 160×600px, 320×50px. Total de 4 formatos por creative set." },
  { question_key: "q_restricoes", answer: "Não usar a palavra Copa sem aspas (restrição legal). Cor vermelha obrigatória em pelo menos 40% do layout." },
];

// ── Attachments de referência ─────────────────────────────────────────────────
const LAYOUT_ATTACHMENTS = [
  { name: "guia-de-marca-copa.pdf",     type: "reference" as const, mime_type: "application/pdf", size: 2_450_000, url: `https://files.allka.test/demo/projects/${PROJ02}/tasks/layout/guia-de-marca-copa.pdf` },
  { name: "referencias-visuais.zip",    type: "reference" as const, mime_type: "application/zip", size: 8_120_000, url: `https://files.allka.test/demo/projects/${PROJ02}/tasks/layout/referencias-visuais.zip` },
];

const CONTENT_ATTACHMENTS = [
  { name: "briefing-conteudo-copa.pdf", type: "reference" as const, mime_type: "application/pdf", size: 1_240_000, url: `https://files.allka.test/demo/projects/${PROJ02}/tasks/content/briefing-conteudo-copa.pdf` },
  { name: "exemplos-copies.pdf",        type: "reference" as const, mime_type: "application/pdf", size: 980_000,   url: `https://files.allka.test/demo/projects/${PROJ02}/tasks/content/exemplos-copies.pdf` },
];

// ── Logger helpers ────────────────────────────────────────────────────────────
function log(msg: string) { console.log(msg); }
function section(title: string) { console.log(`\n── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`); }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`\n${"═".repeat(65)}`);
  log(`  SEED: Partner Projects + seed-partner-proj-02 (${DRY_RUN ? "DRY-RUN" : "APPLY"})`);
  log(`${"═".repeat(65)}\n`);

  const counts = { users: 0, companies: 0, agProjects: 0, partnerProjects: 0, products: 0, tasks: 0, stages: 0, briefingQ: 0, briefingA: 0, attachments: 0 };

  // ── 1. Partner user + profile ────────────────────────────────────────────────
  section("1. Partner user");
  const passwordHash = await bcrypt.hash(PARTNER_PWD, 10);

  if (DRY_RUN) {
    log(`  [DRY] upsert user → ${PARTNER_EMAIL}`);
    log(`  [DRY] upsert PartnerProfile → ${PARTNER_EMAIL}`);
  } else {
    await prisma.user.upsert({
      where: { email: PARTNER_EMAIL },
      update: { name: PARTNER_NAME },
      create: {
        email: PARTNER_EMAIL,
        password_hash: passwordHash,
        name: PARTNER_NAME,
        role: "partner",
        account_type: "parceiro",
        is_active: true,
      },
    });
    const partnerUser = await prisma.user.findUnique({ where: { email: PARTNER_EMAIL } });
    if (!partnerUser) throw new Error(`Usuário ${PARTNER_EMAIL} não encontrado após upsert.`);

    await prisma.partnerProfile.upsert({
      where: { user_id: partnerUser.id },
      update: { status: "active" },
      create: {
        user_id: partnerUser.id,
        status: "active",
        referral_code: "PARTNERTEST",
        referral_link: "https://allka.com.br/ref/partnertest",
        balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      },
    });
    log(`  ✓ Usuário + PartnerProfile → ${PARTNER_EMAIL}`);
  }
  counts.users++;

  // Buscar perfil para vincular empresas
  let partnerProfileId: string | null = null;
  if (!DRY_RUN) {
    const pu = await prisma.user.findUnique({ where: { email: PARTNER_EMAIL } });
    const pp = pu ? await prisma.partnerProfile.findUnique({ where: { user_id: pu.id } }) : null;
    partnerProfileId = pp?.id ?? null;
  }

  // ── 2. Empresas do parceiro ──────────────────────────────────────────────────
  section("2. Empresas do parceiro");
  for (const c of PARTNER_COMPANIES) {
    if (DRY_RUN) {
      log(`  [DRY] upsert company → ${c.id} | ${c.name}`);
    } else {
      await prisma.company.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          ...(partnerProfileId ? { referred_by_partner_id: partnerProfileId } : {}),
        },
        create: {
          id: c.id,
          name: c.name,
          cnpj: c.cnpj,
          segment: c.segment,
          status: "ativo",
          email: c.email,
          phone: c.phone,
          type: "parceiro",
          ...(partnerProfileId ? { referred_by_partner_id: partnerProfileId } : {}),
        },
      });
      log(`  ✓ ${c.name} (${c.id})`);
    }
    counts.companies++;
  }

  // ── 3. 5 projetos extras da agência ─────────────────────────────────────────
  section("3. Projetos extras da agência");
  let agencyName = "Agency Conta Teste";
  if (!DRY_RUN) {
    const agUser = await prisma.user.findUnique({
      where: { email: "agencia@allka.test" },
      include: { agency: true },
    });
    if (agUser?.agency?.name) agencyName = agUser.agency.name;
  }
  log(`  Usando agency name: "${agencyName}"`);

  for (const p of AGENCY_EXTRA_PROJECTS) {
    // Verificar se cliente da agência existe
    const clientExists = DRY_RUN || !!(await prisma.company.findUnique({ where: { id: p.client_id } }));
    if (!clientExists) {
      log(`  ⚠  Empresa ${p.client_id} não encontrada — pulando ${p.id}`);
      continue;
    }

    if (DRY_RUN) {
      log(`  [DRY] upsert project → ${p.id} | ${p.title} [${p.status}]`);
    } else {
      const { created_at, ...rest } = p;
      await withProjectCode(prisma, (tx, projectCode) =>
        tx.project.upsert({
          where: { id: p.id },
          update: { title: p.title, status: p.status, progress: p.progress, agency: agencyName },
          create: { ...rest, agency: agencyName, company_type: "company", lifecycle: "avulso", created_at, project_code: projectCode },
        }),
      );
      log(`  ✓ [${p.status.padEnd(17)}] ${p.title}`);
    }
    counts.agProjects++;
  }

  // ── 4. 15 projetos do parceiro ───────────────────────────────────────────────
  section("4. Projetos do parceiro (15)");
  for (const p of PARTNER_PROJECTS) {
    if (DRY_RUN) {
      log(`  [DRY] upsert project → ${p.id} | ${p.title} [${p.status}] client=${p.client_id}`);
    } else {
      const { created_at, ...rest } = p;
      await withProjectCode(prisma, (tx, projectCode) =>
        tx.project.upsert({
          where: { id: p.id },
          update: { title: p.title, status: p.status, progress: p.progress, client_id: p.client_id, agency: null },
          create: { ...rest, agency: null, company_type: "company", lifecycle: "avulso", created_at, project_code: projectCode },
        }),
      );
      log(`  ✓ [${p.status.padEnd(17)}] ${p.title}`);
    }
    counts.partnerProjects++;
  }

  // ── 5. Detalhes de seed-partner-proj-02 ─────────────────────────────────────
  section("5. Detalhes do projeto seed-partner-proj-02");
  if (DRY_RUN) {
    log(`  [DRY] update project ${PROJ02} → description, value, budget, consultant, start/end`);
  } else {
    await prisma.project.update({
      where: { id: PROJ02 },
      data: {
        description:
          "Planejamento e execução da Campanha Digital Copa para a temporada 2026. " +
          "O projeto contempla criação de identidade visual temática, produção de criativos estáticos e animados, " +
          "gestão de mídias pagas (Google Ads e Meta Ads), conteúdo orgânico para redes sociais e relatório consolidado de resultados. " +
          "Alinhamento mensal de OKRs e reuniões quinzenais de performance. Meta: alcance de 2M de impressões e ROAS acima de 4x.",
        type: "Campanha",
        lifecycle: "avulso",
        consultant: "Renato Almeida",
        consultant_email: "renato.almeida@allka.test",
        team_size: 4,
        value: 75000,
        budget: 75000,
        spent: 8500,
        progress: 20,
        start_date: new Date("2026-09-01"),
        end_date: new Date("2026-12-15"),
      },
    });
    log(`  ✓ Projeto ${PROJ02} detalhes atualizados`);
  }

  // ── 6. Produtos para seed-partner-proj-02 ───────────────────────────────────
  section("6. Produtos do projeto");

  const dc0001 = DRY_RUN ? null : await prisma.product.findUnique({ where: { id: "DC0001" } });
  const dc0002 = DRY_RUN ? null : await prisma.product.findUnique({ where: { id: "DC0002" } });

  if (!DRY_RUN && !dc0001) { log("  ⚠  Produto DC0001 não encontrado. Rode seed-catalog-tasks.ts primeiro."); }
  if (!DRY_RUN && !dc0002) { log("  ⚠  Produto DC0002 não encontrado. Rode seed-catalog-tasks.ts primeiro."); }

  let ppLayoutId: string | null = null;
  let ppContentId: string | null = null;

  if (DRY_RUN || dc0001) {
    const ppData1 = {
      product_name_snapshot: "Layout de Redes Sociais",
      product_code_snapshot: "DC0001",
      product_category_snapshot: "Design e Criação",
      product_price_snapshot: dc0001?.base_price ?? 90,
      preco_final_cliente_snapshot: 37500,
      comissao_snapshot: 3750,
      recurrence_snapshot: "avulso",
      pagador_snapshot: "AGENCIA",
      status: "PENDENTE",
      start_date: null,
      expected_end_date: null,
    };

    if (DRY_RUN) {
      log(`  [DRY] upsert ProjectProduct → ${PROJ02} × DC0001 | ${ppData1.product_name_snapshot} | PENDENTE`);
    } else {
      const upserted = await prisma.projectProduct.upsert({
        where: { project_id_product_id: { project_id: PROJ02, product_id: "DC0001" } },
        update: ppData1,
        create: { project_id: PROJ02, product_id: "DC0001", ...ppData1 },
      });
      ppLayoutId = upserted.id;
      log(`  ✓ ProductProduct DC0001 "${ppData1.product_name_snapshot}" (id: ${upserted.id})`);
    }
    counts.products++;
  }

  if (DRY_RUN || dc0002) {
    const ppData2 = {
      product_name_snapshot: "Criativos Mídia Display Estático",
      product_code_snapshot: "DC0002",
      product_category_snapshot: "Design e Criação",
      product_price_snapshot: dc0002?.base_price ?? 325,
      preco_final_cliente_snapshot: 37500,
      comissao_snapshot: 3750,
      recurrence_snapshot: "avulso",
      pagador_snapshot: "AGENCIA",
      status: "PENDENTE",
      start_date: null,
      expected_end_date: null,
    };

    if (DRY_RUN) {
      log(`  [DRY] upsert ProjectProduct → ${PROJ02} × DC0002 | ${ppData2.product_name_snapshot} | PENDENTE`);
    } else {
      const upserted = await prisma.projectProduct.upsert({
        where: { project_id_product_id: { project_id: PROJ02, product_id: "DC0002" } },
        update: ppData2,
        create: { project_id: PROJ02, product_id: "DC0002", ...ppData2 },
      });
      ppContentId = upserted.id;
      log(`  ✓ ProjectProduct DC0002 "${ppData2.product_name_snapshot}" (id: ${upserted.id})`);
    }
    counts.products++;
  }

  // Se não dry-run e ppLayoutId/ppContentId ainda nulos, buscar os existentes
  if (!DRY_RUN && !ppLayoutId) {
    const existing = await prisma.projectProduct.findUnique({ where: { project_id_product_id: { project_id: PROJ02, product_id: "DC0001" } } });
    ppLayoutId = existing?.id ?? null;
  }
  if (!DRY_RUN && !ppContentId) {
    const existing = await prisma.projectProduct.findUnique({ where: { project_id_product_id: { project_id: PROJ02, product_id: "DC0002" } } });
    ppContentId = existing?.id ?? null;
  }

  // ── 7. Catalog tasks para referência ────────────────────────────────────────
  let catalogTaskLayoutId: string | null = null;
  let catalogTaskContentId: string | null = null;
  if (!DRY_RUN) {
    const ctLayout  = await prisma.catalogTask.findFirst({ where: { code: "DC0001-T01" } });
    const ctContent = await prisma.catalogTask.findFirst({ where: { code: "DC0002-T01" } });
    catalogTaskLayoutId  = ctLayout?.id  ?? null;
    catalogTaskContentId = ctContent?.id ?? null;
  }

  // ── 8. Briefing snapshot JSON ────────────────────────────────────────────────
  const layoutBriefingSnapshot  = JSON.stringify(LAYOUT_BRIEFING_QUESTIONS);
  const contentBriefingSnapshot = JSON.stringify(CONTENT_BRIEFING_QUESTIONS);

  // ── 9. Confirmar pagamento oficial (Payment PAGO + PaymentItems) ──────────────
  // As tarefas nunca são criadas à mão — confirmPaymentAndGenerateProjectTasks
  // gera as tarefas genéricas a partir dos CatalogTasks reais de DC0001/DC0002;
  // a seção seguinte só CUSTOMIZA o conteúdo (título, briefing, etapas) dessas
  // tarefas oficiais pro roteiro rico deste projeto de demonstração — nunca
  // cria ProjectTask diretamente.
  section("7. Confirmar pagamento (DC0001+DC0002) e gerar tarefas oficiais");
  if (DRY_RUN) {
    log(`  [DRY] confirmar pagamento oficial (DC0001+DC0002) e gerar tarefas`);
  } else {
    const requester = await prisma.user.findFirst({
      where: { account_type: "admin" },
      select: { id: true, account_type: true, role: true },
    });
    if (!requester) throw new Error("Nenhum usuário admin encontrado — necessário para confirmar pagamento.");

    const paymentResult = await withIdempotentRetry(() =>
      prisma.$transaction((tx) =>
        confirmPaymentAndGenerateProjectTasks(tx, {
          projectId: PROJ02,
          requesterUser: requester,
          billingCycleKey: "avulso",
          notes: "Fixture de demo — showcase parceiro (Campanha Digital Copa)",
        }),
      ),
    );
    if (paymentResult.tasksResult) {
      log(`  ✓ Payment confirmado + ${paymentResult.tasksResult.generated} tarefa(s) oficiais geradas`);
    } else if (paymentResult.alreadyProcessed) {
      log(`  → Payment já confirmado anteriormente (idempotente)`);
    }
    // confirmPaymentAndGenerateProjectTasks força status="in-progress" — este
    // projeto de demo é "planning" por design (pago, aguardando início real).
    await prisma.project.update({ where: { id: PROJ02 }, data: { status: "planning" } });
  }

  // ── 10. Tarefas ───────────────────────────────────────────────────────────────
  // Encontra as tarefas OFICIAIS recém-geradas por produto (nunca cria uma
  // nova) e customiza o conteúdo pro roteiro rico deste projeto de demo. Se o
  // catálogo real gerou mais de uma tarefa pro mesmo produto (ex.: DC0002 com
  // 2 CatalogTasks), consolida em uma só — as etapas combinadas (T01+T02) já
  // eram um roteiro manual único antes desta correção.
  section("8. Tarefas do projeto");

  let actualLayoutTaskId: string = TASK_LAYOUT_ID;
  let actualContentTaskId: string = TASK_CONTENT_ID;

  const layoutTaskData = {
    project_id: PROJ02,
    project_product_id: ppLayoutId!,
    product_id: "DC0001",
    catalog_task_id: catalogTaskLayoutId,
    title: "Criação de Layout para Redes Sociais",
    name_snapshot: "Criação de Layout para Redes Sociais",
    code_snapshot: "DC0001-T01",
    category_snapshot: "Design e Criação",
    status: "PARA_LANCAMENTO",
    priority: "medium",
    sort_order: 1,
    due_date: new Date("2026-10-15"),
    briefing_snapshot: layoutBriefingSnapshot,
  };

  const contentTaskData = {
    project_id: PROJ02,
    project_product_id: ppContentId!,
    product_id: "DC0002",
    catalog_task_id: catalogTaskContentId,
    title: "Conteúdo e Legenda para Criativos",
    name_snapshot: "Conteúdo e Legenda para Criativos",
    code_snapshot: "DC0002-T01",
    category_snapshot: "Design e Criação",
    status: "PARA_LANCAMENTO",
    priority: "high",
    sort_order: 2,
    due_date: new Date("2026-10-01"),
    briefing_snapshot: contentBriefingSnapshot,
  };

  if (DRY_RUN) {
    log(`  [DRY] customizar tarefa oficial → "Criação de Layout para Redes Sociais" [PARA_LANCAMENTO]`);
    log(`  [DRY] customizar tarefa oficial → "Conteúdo e Legenda para Criativos" [PARA_LANCAMENTO]`);
  } else {
    // Layout task — sempre gerada pelo serviço oficial acima; nunca criada aqui.
    const officialLayoutTasks = await prisma.projectTask.findMany({
      where: { project_product_id: ppLayoutId!, product_id: "DC0001" },
      orderBy: { created_at: "asc" },
    });
    if (officialLayoutTasks.length === 0) {
      throw new Error(`Nenhuma tarefa oficial encontrada para DC0001 em ${PROJ02} — confirmPaymentAndGenerateProjectTasks deveria ter gerado ao menos uma.`);
    }
    const [layoutTask, ...extraLayoutTasks] = officialLayoutTasks;
    actualLayoutTaskId = layoutTask.id;
    await prisma.projectTask.update({ where: { id: actualLayoutTaskId }, data: { ...layoutTaskData, project_product_id: ppLayoutId! } });
    log(`  ↺ customizada tarefa layout "${layoutTaskData.title}" (${actualLayoutTaskId})`);
    if (extraLayoutTasks.length > 0) {
      await prisma.projectTask.deleteMany({ where: { id: { in: extraLayoutTasks.map((t) => t.id) } } });
      log(`  ✓ consolidadas ${extraLayoutTasks.length} tarefa(s) extra(s) de DC0001 na tarefa única de layout`);
    }

    // Content task — idem; DC0002 pode gerar mais de uma tarefa (T01+T02),
    // consolidadas aqui na única tarefa "conteúdo" com etapas combinadas.
    const officialContentTasks = await prisma.projectTask.findMany({
      where: { project_product_id: ppContentId!, product_id: "DC0002" },
      orderBy: { created_at: "asc" },
    });
    if (officialContentTasks.length === 0) {
      throw new Error(`Nenhuma tarefa oficial encontrada para DC0002 em ${PROJ02} — confirmPaymentAndGenerateProjectTasks deveria ter gerado ao menos uma.`);
    }
    const [contentTask, ...extraContentTasks] = officialContentTasks;
    actualContentTaskId = contentTask.id;
    await prisma.projectTask.update({ where: { id: actualContentTaskId }, data: { ...contentTaskData, project_product_id: ppContentId! } });
    log(`  ↺ customizada tarefa conteúdo "${contentTaskData.title}" (${actualContentTaskId})`);
    if (extraContentTasks.length > 0) {
      await prisma.projectTask.deleteMany({ where: { id: { in: extraContentTasks.map((t) => t.id) } } });
      log(`  ✓ consolidadas ${extraContentTasks.length} tarefa(s) extra(s) de DC0002 na tarefa única de conteúdo`);
    }
  }
  counts.tasks += 2;

  // ── 10. Etapas ────────────────────────────────────────────────────────────────
  // Create-only por source_key (ensureTaskStages, src/lib/generate-tasks-from-spec.ts)
  // — nunca apaga/redefine etapa já existente, só cria o que falta.
  section("8. Etapas das tarefas");

  if (DRY_RUN) {
    for (const s of LAYOUT_STAGES)  log(`  [DRY] stage layout  ordem ${s.ordem} | "${s.titulo}"`);
    log(`  [DRY] total 4 etapas para layout`);
    for (const s of CONTENT_STAGES) log(`  [DRY] stage content ordem ${s.ordem} | "${s.titulo}"`);
    log(`  [DRY] total 7 etapas para conteúdo`);
  } else {
    const layoutStageResult = await ensureTaskStages(
      prisma,
      actualLayoutTaskId,
      `demo:${PROJ02}:layout`,
      LAYOUT_STAGES.map((s) => ({
        code: s.id,
        titulo: s.titulo,
        descricao: s.descricao,
        ordem: s.ordem,
        obrigatoria: true,
        briefingNecessario: s.briefing_necessario,
        status: s.ordem === 1 ? "PENDENTE" : "BLOQUEADA",
      })),
    );
    counts.stages += layoutStageResult.created;
    log(`  ✓ etapas layout: ${layoutStageResult.created} criadas, ${layoutStageResult.reused} reaproveitadas (task: ${actualLayoutTaskId})`);

    const contentStageResult = await ensureTaskStages(
      prisma,
      actualContentTaskId,
      `demo:${PROJ02}:content`,
      CONTENT_STAGES.map((s) => ({
        code: s.id,
        titulo: s.titulo,
        descricao: s.descricao,
        ordem: s.ordem,
        obrigatoria: true,
        briefingNecessario: s.briefing_necessario,
        status: s.ordem === 1 ? "PENDENTE" : "BLOQUEADA",
      })),
    );
    counts.stages += contentStageResult.created;
    log(`  ✓ etapas conteúdo: ${contentStageResult.created} criadas, ${contentStageResult.reused} reaproveitadas (task: ${actualContentTaskId})`);
  }
  if (DRY_RUN) { counts.stages = LAYOUT_STAGES.length + CONTENT_STAGES.length; }

  // ── 11. Briefing answers ─────────────────────────────────────────────────────
  section("9. Briefing answers");

  for (const a of LAYOUT_BRIEFING_ANSWERS) {
    const q = LAYOUT_BRIEFING_QUESTIONS.find((q) => q.question_key === a.question_key)!;
    if (DRY_RUN) {
      log(`  [DRY] upsert briefing layout / ${a.question_key}`);
    } else {
      await prisma.taskBriefingAnswer.upsert({
        where: { project_task_id_question_key: { project_task_id: actualLayoutTaskId, question_key: a.question_key } },
        update: { question_text: q.question_text, answer: a.answer },
        create: { project_task_id: actualLayoutTaskId, question_key: a.question_key, question_text: q.question_text, answer: a.answer },
      });
    }
    counts.briefingA++;
  }
  log(`  ✓ 7 respostas de briefing para tarefa layout`);

  for (const a of CONTENT_BRIEFING_ANSWERS) {
    const q = CONTENT_BRIEFING_QUESTIONS.find((q) => q.question_key === a.question_key)!;
    if (DRY_RUN) {
      log(`  [DRY] upsert briefing content / ${a.question_key}`);
    } else {
      await prisma.taskBriefingAnswer.upsert({
        where: { project_task_id_question_key: { project_task_id: actualContentTaskId, question_key: a.question_key } },
        update: { question_text: q.question_text, answer: a.answer },
        create: { project_task_id: actualContentTaskId, question_key: a.question_key, question_text: q.question_text, answer: a.answer },
      });
    }
    counts.briefingA++;
  }
  log(`  ✓ 7 respostas de briefing para tarefa conteúdo`);

  // ── 12. Attachments ──────────────────────────────────────────────────────────
  section("10. Anexos (referências de briefing)");

  for (const att of LAYOUT_ATTACHMENTS) {
    if (DRY_RUN) {
      log(`  [DRY] create attachment → layout | "${att.name}" [${att.type}]`);
    } else {
      const existing = await prisma.taskAttachment.findFirst({
        where: { project_task_id: actualLayoutTaskId, name: att.name },
      });
      if (!existing) {
        await prisma.taskAttachment.create({
          data: { project_task_id: actualLayoutTaskId, type: att.type, name: att.name, url: att.url, size: att.size, mime_type: att.mime_type, uploaded_by: "seed" },
        });
        log(`  ✓ criado "${att.name}"`);
      } else {
        log(`  ↺ já existe "${att.name}"`);
      }
    }
    counts.attachments++;
  }

  for (const att of CONTENT_ATTACHMENTS) {
    if (DRY_RUN) {
      log(`  [DRY] create attachment → content | "${att.name}" [${att.type}]`);
    } else {
      const existing = await prisma.taskAttachment.findFirst({
        where: { project_task_id: actualContentTaskId, name: att.name },
      });
      if (!existing) {
        await prisma.taskAttachment.create({
          data: { project_task_id: actualContentTaskId, type: att.type, name: att.name, url: att.url, size: att.size, mime_type: att.mime_type, uploaded_by: "seed" },
        });
        log(`  ✓ criado "${att.name}"`);
      } else {
        log(`  ↺ já existe "${att.name}"`);
      }
    }
    counts.attachments++;
  }

  // ── Resumo ────────────────────────────────────────────────────────────────────
  section("Resumo");

  if (!DRY_RUN) {
    // Contar apenas os IDs reais usados (não todas as tasks do projeto)
    const seedTaskIds = [actualLayoutTaskId, actualContentTaskId];
    const [totalProjects, totalPP, totalTasks, totalStages, totalBA, totalAtt] = await Promise.all([
      prisma.project.count(),
      prisma.projectProduct.count({ where: { project_id: PROJ02 } }),
      prisma.projectTask.count({ where: { id: { in: seedTaskIds } } }),
      prisma.projectTaskStage.count({ where: { project_task_id: { in: seedTaskIds } } }),
      prisma.taskBriefingAnswer.count({ where: { project_task_id: { in: seedTaskIds } } }),
      prisma.taskAttachment.count({ where: { project_task_id: { in: seedTaskIds } } }),
    ]);
    const partnerProjCount = await prisma.project.count({ where: { id: { startsWith: "seed-partner-proj" } } });
    const agExtraCount = await prisma.project.count({ where: { id: { startsWith: "seed-ag-proj-1" } } });

    log(`\n  Total projetos no banco:         ${totalProjects}  (esperado 45)`);
    log(`  Projetos partner (seed-partner-proj-*): ${partnerProjCount}/15`);
    log(`  Projetos agência extra (seed-ag-proj-1*): ${agExtraCount}/5`);
    log(`  seed-partner-proj-02 (tasks: ${seedTaskIds.join(", ")}):`);
    log(`    ProjectProducts:   ${totalPP}  (esperado 2)`);
    log(`    ProjectTasks:      ${totalTasks}  (esperado 2)`);
    log(`    ProjectTaskStages: ${totalStages} (esperado 11)`);
    log(`    BriefingAnswers:   ${totalBA} (esperado 14)`);
    log(`    TaskAttachments:   ${totalAtt}  (esperado 4)`);

    const ok = totalPP === 2 && totalTasks === 2 && totalStages === 11 && totalBA === 14 && totalAtt === 4;
    log(`\n  Status: ${ok ? "✅ Tudo ok" : "⚠️  Verificar contagens acima"}`);
  } else {
    log(`\n  Itens que seriam criados/atualizados:`);
    log(`    Usuários:       ${counts.users}`);
    log(`    Empresas:       ${counts.companies}`);
    log(`    Projetos agência extra: ${counts.agProjects}`);
    log(`    Projetos parceiro:      ${counts.partnerProjects}`);
    log(`    Produtos (proj-02):     ${counts.products}`);
    log(`    Tarefas  (proj-02):     ${counts.tasks}`);
    log(`    Etapas   (proj-02):     ${counts.stages}`);
    log(`    Briefing answers:       ${counts.briefingA}`);
    log(`    Attachments:            ${counts.attachments}`);
    log(`\n  ⚠️  DRY-RUN: nenhuma escrita realizada. Remova --dry-run para aplicar.`);
  }

  log(`\n💡 Após rodar este seed, reexecute também:`);
  log(`   npm --workspace apps/backend run db:seed:demo-project-credentials`);
  log(`   npm --workspace apps/backend run db:seed:demo-project-billing`);
  log(`\n✅ Seed concluído.\n`);
}

main()
  .catch((e) => {
    console.error("\n❌  Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * seed-demo-projects-complete.ts — "Fechamento Geral"
 *
 * Garante dados completos em TODAS as abas (Dashboard, Dados, Produtos, Tarefas,
 * Lançamento, Arquivos, Cofre, Faturamento, Log) para TODOS os projetos demo.
 *
 * Idempotente: pode ser rodado múltiplas vezes sem duplicar dados.
 * Suporta --dry-run: nenhuma escrita ocorre, apenas log do que seria feito.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");
const prisma  = new PrismaClient();

// ─── Logging ─────────────────────────────────────────────────────────────────
function log(msg: string) { console.log(msg); }
function section(n: string) { log(`\n── ${n} ${"─".repeat(Math.max(0, 55 - n.length))}`); }
function dry(msg: string)   { if (DRY_RUN) log(`  [DRY] ${msg}`); }

// ─── Product pair catalogue ───────────────────────────────────────────────────
// [product_id, name_snapshot, category_snapshot, base_price]
type ProdTuple = [string, string, string, number];

const PAIRS: Record<string, [ProdTuple, ProdTuple]> = {
  design:    [["DC0001","Layout de Redes Sociais","Design e Criação",90.72],   ["DC0002","Criativos Mídia Display Estático","Design e Criação",325.08]],
  social:    [["DC0001","Layout de Redes Sociais","Design e Criação",90.72],   ["PA0001","Gestão de Tráfego","Performance e Anúncios Patrocinados",1200]],
  web:       [["DC0005","Layout de Website","Design e Criação",453.6],         ["PA0002","SEO","Performance e Anúncios Patrocinados",1500]],
  seo:       [["PA0002","SEO","Performance e Anúncios Patrocinados",1500],     ["PA0004","Configuração de Data Analytics","Performance e Anúncios Patrocinados",272.16]],
  ecommerce: [["DC0005","Layout de Website","Design e Criação",453.6],         ["PA0001","Gestão de Tráfego","Performance e Anúncios Patrocinados",1200]],
  campaign:  [["DC0001","Layout de Redes Sociais","Design e Criação",90.72],   ["PA0001","Gestão de Tráfego","Performance e Anúncios Patrocinados",1200]],
  email:     [["DC0006","Template para Criativos (5 unidades)","Design e Criação",226.8], ["PA0001","Gestão de Tráfego","Performance e Anúncios Patrocinados",1200]],
  video:     [["DC0003","Tratamento de até 10 Imagens","Design e Criação",181.44], ["DC0006","Template para Criativos (5 unidades)","Design e Criação",226.8]],
  app:       [["DC0005","Layout de Website","Design e Criação",453.6],         ["PA0005","Análise de Usabilidade UX","Performance e Anúncios Patrocinados",90.72]],
  content:   [["DC0002","Criativos Mídia Display Estático","Design e Criação",325.08], ["DC0006","Template para Criativos (5 unidades)","Design e Criação",226.8]],
  analytics: [["PA0004","Configuração de Data Analytics","Performance e Anúncios Patrocinados",272.16], ["PA0005","Análise de Usabilidade UX","Performance e Anúncios Patrocinados",90.72]],
  ads:       [["PA0001","Gestão de Tráfego","Performance e Anúncios Patrocinados",1200], ["PA0002","SEO","Performance e Anúncios Patrocinados",1500]],
  default:   [["DC0001","Layout de Redes Sociais","Design e Criação",90.72],   ["PA0001","Gestão de Tráfego","Performance e Anúncios Patrocinados",1200]],
};

function pickPair(title: string): [ProdTuple, ProdTuple] {
  const t = title.toLowerCase();
  if (t.match(/rebranding|identidade|visual|papelaria|logo/)) return PAIRS.design;
  if (t.match(/social|redes sociais|instagram/)) return PAIRS.social;
  if (t.match(/site|web|landing|portal/)) return PAIRS.web;
  if (t.match(/\bseo\b|search engine/)) return PAIRS.seo;
  if (t.match(/e-?commerce|loja/)) return PAIRS.ecommerce;
  if (t.match(/campanha|campaign|copa|black friday|sazonalidade|lançamento|influencer/)) return PAIRS.campaign;
  if (t.match(/email|e-mail|marketing mensal/)) return PAIRS.email;
  if (t.match(/vídeo|video|audiovisual|podcast/)) return PAIRS.video;
  if (t.match(/\bapp\b|mobile|fidelidade|loyalty/)) return PAIRS.app;
  if (t.match(/conteúdo|content|editorial/)) return PAIRS.content;
  if (t.match(/dashboard|analytics|bi\b|dados|benchmarking|relatório/)) return PAIRS.analytics;
  if (t.match(/consultoria|estratégia|workshop|treinamento|webinar/)) return PAIRS.analytics;
  if (t.match(/ads|tráfego|performance|google ads|growth|hacking/)) return PAIRS.ads;
  return PAIRS.default;
}

// ─── Stage templates ──────────────────────────────────────────────────────────
function makeStages(category: string, taskStatus: string) {
  const isDesign = category === "Design e Criação";
  const titles = isDesign
    ? ["Briefing e Alinhamento", "Criação do Conceito Visual", "Revisão e Ajustes", "Entrega Final"]
    : ["Briefing e Análise",     "Configuração e Ativação",   "Monitoramento",       "Relatório de Resultados"];

  return titles.map((titulo, i) => {
    const ordem = i + 1;
    let status = "BLOQUEADA";
    if (["PARA_LANCAMENTO","EM_LANCAMENTO","LIBERADA_PARA_EXECUCAO"].includes(taskStatus)) {
      status = ordem === 1 ? "PENDENTE" : "BLOQUEADA";
    } else if (taskStatus === "EM_EXECUCAO") {
      status = ordem <= 2 ? "CONCLUIDA" : ordem === 3 ? "EM_ANDAMENTO" : "BLOQUEADA";
    } else if (taskStatus === "EM_REVISAO") {
      status = ordem <= 3 ? "CONCLUIDA" : "EM_ANDAMENTO";
    } else if (taskStatus === "EM_APROVACAO") {
      status = ordem < titles.length ? "CONCLUIDA" : "EM_ANDAMENTO";
    } else if (taskStatus === "CONCLUIDA") {
      status = "CONCLUIDA";
    } else {
      status = ordem === 1 ? "PENDENTE" : "BLOQUEADA";
    }
    return { titulo, descricao: `${titulo} — etapa ${ordem} de ${titles.length}.`, ordem, status, briefing_necessario: ordem === 1 };
  });
}

// ─── Briefing templates ───────────────────────────────────────────────────────
const DESIGN_BQ = [
  { key: "q_objetivo",    text: "Qual é o objetivo principal desta peça?" },
  { key: "q_formato",     text: "Quais formatos são necessários?" },
  { key: "q_referencias", text: "Possui referências visuais?" },
  { key: "q_cores",       text: "Quais são as cores da marca?" },
  { key: "q_texto",       text: "Qual é o texto principal (headline)?" },
  { key: "q_cta",         text: "Qual é o CTA desejado?" },
  { key: "q_restricoes",  text: "Existem restrições ou observações?" },
];
const PERF_BQ = [
  { key: "q_produto",     text: "Qual é o produto ou oferta principal?" },
  { key: "q_publico",     text: "Qual é o público-alvo?" },
  { key: "q_objetivo",    text: "Qual é o objetivo da campanha?" },
  { key: "q_tom",         text: "Qual é o tom de voz desejado?" },
  { key: "q_formatos",    text: "Quais formatos são necessários?" },
  { key: "q_cta",         text: "Qual é o CTA desejado?" },
  { key: "q_restricoes",  text: "Existem restrições de mídia?" },
];

function getBQ(category: string) {
  return category === "Design e Criação" ? DESIGN_BQ : PERF_BQ;
}
function bqAnswer(key: string, title: string) {
  const map: Record<string, string> = {
    q_objetivo:    `Objetivo: ${title}. Foco em conversão e reconhecimento de marca.`,
    q_formato:     "Feed 1:1, Stories 9:16, Banner web 1200×628, Post carrossel.",
    q_referencias: "Sim, anexo no briefing. Seguir manual de marca aprovado.",
    q_cores:       "Conforme paleta do manual de marca enviado pelo cliente.",
    q_texto:       `Headline: ${title} — Transforme seu negócio digital.`,
    q_cta:         "Saiba mais / Fale conosco / Acesse agora / Solicitar proposta",
    q_restricoes:  "Seguir manual de marca. Não usar banco de imagens pago.",
    q_produto:     `Serviço/produto: ${title}.`,
    q_publico:     "Adultos 25–45 anos, decisores, interesse em marketing digital.",
    q_tom:         "Profissional, direto, com autoridade e proximidade.",
    q_formatos:    "Search, Display, Social Ads, YouTube Pre-roll.",
  };
  return map[key] ?? "A definir com o cliente no kick-off.";
}

// ─── Credential pool ──────────────────────────────────────────────────────────
const CRED_POOL: { title: string; service: string; url: string; username: string; password_demo: string; category: string }[] = [
  { title: "WordPress Admin",       service: "WordPress",      url: "https://cms.demo.test/wp-admin",   username: "admin_demo",         password_demo: "DEMO-WP-ADM01!",   category: "cms" },
  { title: "Google Analytics 4",    service: "Google GA4",     url: "https://analytics.google.demo.test", username: "analytics@demo.test", password_demo: "DEMO-GA4-001!",  category: "analytics" },
  { title: "Google Ads",            service: "Google Ads",     url: "https://ads.google.demo.test",     username: "ads@demo.test",       password_demo: "DEMO-GADS-001!",   category: "ads" },
  { title: "Meta Business Suite",   service: "Meta",           url: "https://business.meta.demo.test",  username: "meta@demo.test",      password_demo: "DEMO-META-001!",   category: "ads" },
  { title: "Mailchimp",             service: "Mailchimp",      url: "https://mailchimp.demo.test",       username: "email@demo.test",     password_demo: "DEMO-MAIL-001!",   category: "email" },
  { title: "cPanel Hosting",        service: "Hostgator",      url: "https://cpanel.demo.test",          username: "cpanel_demo",         password_demo: "DEMO-HOST-001!",   category: "hosting" },
  { title: "Canva Pro",             service: "Canva",          url: "https://canva.demo.test",           username: "design@demo.test",    password_demo: "DEMO-CANVA-001!",  category: "design" },
  { title: "Instagram Business",    service: "Instagram",      url: "https://instagram.demo.test",       username: "@demo_brand",         password_demo: "DEMO-INST-001!",   category: "social" },
  { title: "Facebook Business",     service: "Facebook",       url: "https://facebook.demo.test",        username: "fb@demo.test",        password_demo: "DEMO-FB-001!",     category: "social" },
  { title: "HubSpot CRM",           service: "HubSpot",        url: "https://hubspot.demo.test",         username: "crm@demo.test",       password_demo: "DEMO-HUB-001!",    category: "crm" },
  { title: "Semrush",               service: "Semrush",        url: "https://semrush.demo.test",         username: "seo@demo.test",       password_demo: "DEMO-SEMR-001!",   category: "analytics" },
  { title: "RD Station",            service: "RD Station",     url: "https://rdstation.demo.test",       username: "rd@demo.test",        password_demo: "DEMO-RD-001!",     category: "email" },
  { title: "Google Tag Manager",    service: "GTM",            url: "https://tagmanager.demo.test",      username: "gtm@demo.test",       password_demo: "DEMO-GTM-001!",    category: "analytics" },
  { title: "Figma",                 service: "Figma",          url: "https://figma.demo.test",           username: "design2@demo.test",   password_demo: "DEMO-FIG-001!",    category: "design" },
  { title: "LinkedIn Ads",          service: "LinkedIn",       url: "https://linkedin.demo.test",        username: "li@demo.test",        password_demo: "DEMO-LI-001!",     category: "ads" },
  { title: "Shopify Admin",         service: "Shopify",        url: "https://shop.myshopify.demo.test",  username: "admin@demo.test",     password_demo: "DEMO-SHOP-001!",   category: "ecommerce" },
  { title: "AWS S3",                service: "Amazon AWS",     url: "https://s3.aws.demo.test",          username: "aws_demo",            password_demo: "DEMO-AWS-001!",    category: "hosting" },
  { title: "YouTube Studio",        service: "YouTube",        url: "https://studio.youtube.demo.test",  username: "yt@demo.test",        password_demo: "DEMO-YT-001!",     category: "social" },
  { title: "Adobe Creative Cloud",  service: "Adobe CC",       url: "https://adobe.demo.test",           username: "creative@demo.test",  password_demo: "DEMO-ADOB-001!",   category: "design" },
  { title: "Hotmart",               service: "Hotmart",        url: "https://hotmart.demo.test",         username: "hotmart@demo.test",   password_demo: "DEMO-HOT-001!",    category: "ecommerce" },
];

function credCount(status: string) {
  return ({ draft: 1, negotiation: 1, "awaiting-payment": 2, planning: 2, "in-progress": 3, paused: 2, completed: 2, cancelled: 1 } as Record<string,number>)[status] ?? 2;
}
function credStatus(projStatus: string, idx: number): string {
  if (projStatus === "completed") return idx === 0 ? "rotation_required" : "archived";
  if (projStatus === "paused")    return idx === 0 ? "rotation_required" : "active";
  if (projStatus === "cancelled") return "archived";
  return "active";
}

// ─── Invoice helpers ──────────────────────────────────────────────────────────
function invCount(status: string) {
  return ({ draft: 1, negotiation: 1, "awaiting-payment": 1, planning: 2, "in-progress": 3, paused: 2, completed: 4, cancelled: 0 } as Record<string,number>)[status] ?? 1;
}
function invStatusFor(projStatus: string, idx: number, total: number): "pending"|"paid"|"overdue" {
  if (projStatus === "completed")         return "paid";
  if (projStatus === "awaiting-payment")  return "pending";
  if (projStatus === "in-progress")       return idx < total - 1 ? "paid" : "pending";
  if (projStatus === "paused")            return idx === 0 ? "paid" : "overdue";
  if (projStatus === "cancelled")         return "cancelled" as any; // skip
  return "pending";
}

// ─── Task status helpers ───────────────────────────────────────────────────────
function ppStatus(projStatus: string, ppIdx: number): string {
  if (projStatus === "completed")  return "CONCLUIDO";
  if (projStatus === "cancelled")  return "CANCELADO";
  if (["draft","negotiation","planning","awaiting-payment"].includes(projStatus)) return "PENDENTE";
  // in-progress, paused
  return ppIdx === 0 ? "EM_EXECUCAO" : "PENDENTE";
}
function taskStatus(projStatus: string, ppIdx: number): string {
  if (projStatus === "completed")  return "CONCLUIDA";
  if (projStatus === "cancelled")  return "CANCELADA";
  if (["draft","negotiation","awaiting-payment"].includes(projStatus)) return "PARA_LANCAMENTO";
  if (projStatus === "planning")   return ppIdx === 0 ? "EM_LANCAMENTO" : "PARA_LANCAMENTO";
  // in-progress, paused
  if (ppIdx === 0) return projStatus === "paused" ? "EM_REVISAO" : "EM_EXECUCAO";
  return "PARA_LANCAMENTO";
}

// ─── Progress by status ───────────────────────────────────────────────────────
function progressFor(status: string, existing: number): number {
  if (existing > 0) return existing;
  const map: Record<string, number> = {
    draft: 8, negotiation: 15, "awaiting-payment": 20, planning: 18,
    "in-progress": 55, paused: 45, completed: 100, cancelled: 10,
  };
  return map[status] ?? 20;
}

// ─── Company definitions ──────────────────────────────────────────────────────
const AG_CLIENTS = [
  { id: "seed-ag-client-coca-cola",       name: "Coca-Cola Brasil",     cnpj: "45997418000153", segment: "Bebidas" },
  { id: "seed-ag-client-starbucks",       name: "Starbucks Coffee",     cnpj: "08883874000162", segment: "Alimentação" },
  { id: "seed-ag-client-google",          name: "Google Brasil",        cnpj: "06990590000123", segment: "Tecnologia" },
  { id: "seed-ag-client-magazine-luiza",  name: "Magazine Luiza",       cnpj: "47960950000121", segment: "Varejo" },
  { id: "seed-ag-client-nubank",          name: "Nubank",               cnpj: "18236120000158", segment: "Fintech" },
  { id: "seed-ag-client-natura",          name: "Natura Cosméticos",    cnpj: "71673990000177", segment: "Cosméticos" },
  { id: "seed-ag-client-tesla",           name: "Tesla Brasil",         cnpj: "33456789000111", segment: "Automotivo" },
  { id: "seed-ag-client-ambev",           name: "Ambev S.A.",           cnpj: "02808708000107", segment: "Bebidas" },
  { id: "seed-ag-client-ifood",           name: "iFood",                cnpj: "14380200000121", segment: "Foodtech" },
  { id: "seed-ag-client-embraer",         name: "Embraer",              cnpj: "07689002000189", segment: "Aeroespacial" },
];

const PARTNER_COS = [
  { id: "seed-partner-company-A", name: "Cliente Partner Alpha Ltda", cnpj: "30100100000101", segment: "Tecnologia" },
  { id: "seed-partner-company-B", name: "Cliente Partner Beta Ltda",  cnpj: "30200200000102", segment: "Marketing" },
  { id: "seed-partner-company-C", name: "Cliente Partner Gamma Ltda", cnpj: "30300300000103", segment: "Design" },
];

// ─── Agency extra project definitions ─────────────────────────────────────────
const AG_EXTRA = [
  { id: "seed-ag-proj-11", title: "Estratégia de Growth Hacking",      status: "in-progress",       client: "seed-ag-client-nubank" },
  { id: "seed-ag-proj-12", title: "Campanha de Lançamento Produto",    status: "planning",           client: "seed-ag-client-natura" },
  { id: "seed-ag-proj-13", title: "SEO & Performance Mensal",          status: "in-progress",        client: "seed-ag-client-tesla" },
  { id: "seed-ag-proj-14", title: "Webinar de Automação Industrial",   status: "draft",              client: "seed-ag-client-ambev" },
  { id: "seed-ag-proj-15", title: "Dashboard Analítico BI",            status: "negotiation",        client: "seed-ag-client-embraer" },
];

// ─── Partner project definitions ───────────────────────────────────────────────
const PARTNER_PROJS = [
  { id: "seed-partner-proj-01", title: "Identidade Visual Verão 2027",       status: "in-progress",       client: "seed-partner-company-A" },
  { id: "seed-partner-proj-02", title: "Campanha Digital Copa",              status: "planning",           client: "seed-partner-company-A" },
  { id: "seed-partner-proj-03", title: "E-commerce Drinks Premium",          status: "draft",              client: "seed-partner-company-A" },
  { id: "seed-partner-proj-04", title: "Influencer Hub Micro",               status: "in-progress",       client: "seed-partner-company-A" },
  { id: "seed-partner-proj-05", title: "App Loyalty Refresh",                status: "completed",          client: "seed-partner-company-A" },
  { id: "seed-partner-proj-06", title: "Menu Digital Interativo",            status: "in-progress",       client: "seed-partner-company-B" },
  { id: "seed-partner-proj-07", title: "Campanha Sazonalidade",              status: "planning",           client: "seed-partner-company-B" },
  { id: "seed-partner-proj-08", title: "Treinamento Digital Baristas",       status: "awaiting-payment",   client: "seed-partner-company-B" },
  { id: "seed-partner-proj-09", title: "Email Marketing Mensal 2026",        status: "in-progress",       client: "seed-partner-company-B" },
  { id: "seed-partner-proj-10", title: "Podcast Café com Cultura",           status: "draft",              client: "seed-partner-company-B" },
  { id: "seed-partner-proj-11", title: "Portfólio de Casos de Sucesso",      status: "in-progress",       client: "seed-partner-company-C" },
  { id: "seed-partner-proj-12", title: "Ads Performance Max Q3",             status: "planning",           client: "seed-partner-company-C" },
  { id: "seed-partner-proj-13", title: "Site Corporativo Responsive",        status: "completed",          client: "seed-partner-company-C" },
  { id: "seed-partner-proj-14", title: "Workshop IA para Times",             status: "draft",              client: "seed-partner-company-C" },
  { id: "seed-partner-proj-15", title: "Relatório de Benchmarking Anual",   status: "in-progress",       client: "seed-partner-company-C" },
];

// ─── Counter ──────────────────────────────────────────────────────────────────
const counts = { cos: 0, projs: 0, pp: 0, tasks: 0, stages: 0, briefing: 0, atts: 0, creds: 0, credLogs: 0, invoices: 0, payments: 0 };
function inc(k: keyof typeof counts) { counts[k]++; }

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  SEED: Demo Projects Complete — ${DRY_RUN ? "DRY-RUN" : "APPLY"}`);
  console.log(`${"═".repeat(65)}\n`);

  // ─── 0. Look-ups ────────────────────────────────────────────────────────────
  section("0. Lookups de infraestrutura");

  const agUser = await prisma.user.findUnique({ where: { email: "agencia@allka.test" }, include: { agency: true } });
  const agencyName = agUser?.agency?.name ?? "Agency Conta Teste";
  log(`  Agency: "${agencyName}"`);

  const empresaUser = await prisma.user.findUnique({ where: { email: "empresa@allka.test" } });
  const companyCotaTesteId: string | null = empresaUser?.company_id ?? null;
  if (companyCotaTesteId) log(`  Company Conta Teste: ${companyCotaTesteId}`);
  else log("  ⚠️  empresa@allka.test não encontrada — projetos seed-co-proj-* podem estar sem cliente.");

  // Partner user
  const partnerUser = await prisma.user.findUnique({ where: { email: "partner@allka.test" } });
  let partnerProfileId: string | null = null;
  if (partnerUser) {
    const pp = await (prisma as any).partnerProfile.findUnique({ where: { user_id: partnerUser.id } });
    partnerProfileId = pp?.id ?? null;
    log(`  Partner: ${partnerUser.email} (profile: ${partnerProfileId ?? "sem perfil"})`);
  } else {
    log("  Partner user não encontrado — será criado.");
  }

  // Catalog task map: product_id → catalog_task_id (first link found)
  const ctLinks = await prisma.productCatalogTask.findMany({ select: { product_id: true, catalog_task_id: true } });
  const ctMap: Record<string, string> = {};
  for (const l of ctLinks) { if (!ctMap[l.product_id]) ctMap[l.product_id] = l.catalog_task_id; }
  log(`  Catalog tasks mapeados: ${Object.keys(ctMap).length} produtos`);

  // ─── 1. Empresas ────────────────────────────────────────────────────────────
  section("1. Garantir empresas (clientes da agência + parceiro)");

  for (const c of [...AG_CLIENTS, ...PARTNER_COS]) {
    if (DRY_RUN) { dry(`upsert company ${c.id} "${c.name}"`); inc("cos"); continue; }
    await prisma.company.upsert({
      where: { id: c.id },
      update: { name: c.name, segment: c.segment },
      create: { id: c.id, name: c.name, cnpj: c.cnpj, segment: c.segment, status: "ativo",
                email: `contato@${c.id.replace(/^seed-/, "").replace(/-/g, "")}.demo.test` },
    });
    inc("cos");
  }
  log(`  ✓ ${counts.cos} empresas garantidas`);

  // ─── 2. Partner user + profile ───────────────────────────────────────────────
  section("2. Garantir parceiro (user + PartnerProfile)");

  if (!partnerUser) {
    if (DRY_RUN) { dry(`create partner@allka.test`); }
    else {
      const hash = await bcrypt.hash("DEMO-Partner2026!", 10);
      const created = await prisma.user.upsert({
        where: { email: "partner@allka.test" },
        update: {},
        create: { email: "partner@allka.test", name: "Partner Conta Teste", password_hash: hash, role: "partner", account_type: "parceiro", is_active: true },
      });
      const prof = await (prisma as any).partnerProfile.upsert({
        where: { user_id: created.id },
        update: {},
        create: { user_id: created.id, referral_code: "PARTNERTEST", referral_link: "https://allka.com.br/ref/partnertest", status: "active" },
      });
      partnerProfileId = prof.id;
      log(`  ✓ partner@allka.test criado`);
    }
  } else {
    log(`  ↺ partner@allka.test já existe`);
    // Ensure referred companies link to partner profile
    if (partnerProfileId) {
      for (const co of PARTNER_COS) {
        if (!DRY_RUN) {
          await prisma.company.update({ where: { id: co.id }, data: { referred_by_partner_id: partnerProfileId } }).catch(() => {});
        }
      }
    }
  }

  // ─── 3. Projetos faltantes ───────────────────────────────────────────────────
  section("3. Garantir projetos (agency extras + parceiro)");

  const allProjectsToEnsure = [...AG_EXTRA, ...PARTNER_PROJS];

  for (const pDef of allProjectsToEnsure) {
    if (DRY_RUN) { dry(`upsert project ${pDef.id} "${pDef.title}"`); inc("projs"); continue; }
    await prisma.project.upsert({
      where: { id: pDef.id },
      update: { title: pDef.title, status: pDef.status, client_id: pDef.client, agency: agencyName },
      create: {
        id: pDef.id, title: pDef.title, status: pDef.status, client_id: pDef.client,
        agency: agencyName, value: 20000, budget: 22000, lifecycle: "avulso",
        type: "Marketing Digital", progress: progressFor(pDef.status, 0),
      },
    });
    inc("projs");
  }
  log(`  ✓ ${PARTNER_PROJS.length + AG_EXTRA.length} projetos garantidos`);

  // ─── 4. Normalizar TODOS os projetos ────────────────────────────────────────
  section("4. Normalizar todos os projetos");

  const projects = await prisma.project.findMany({ orderBy: { id: "asc" } });
  log(`  Total projetos no banco: ${projects.length}`);

  for (const proj of projects) {
    await processProject(proj, agencyName, ctMap);
  }

  // ─── 5. Relatório de cobertura ───────────────────────────────────────────────
  section("5. Relatório de cobertura");

  if (!DRY_RUN) {
    const [ppG, ptG, credG, invG, payG] = await Promise.all([
      prisma.projectProduct.groupBy({ by: ["project_id"], _count: { id: true } }),
      prisma.projectTask.groupBy({ by: ["project_id"], _count: { id: true } }),
      prisma.projectCredential.groupBy({ by: ["project_id"], _count: { id: true } }),
      prisma.invoice.groupBy({ by: ["project_id"], _count: { id: true } }),
      prisma.payment.groupBy({ by: ["project_id"], _count: { id: true } }),
    ]);
    const allTasks2 = await prisma.projectTask.findMany({ include: { _count: { select: { stages: true, briefing_answers: true, attachments: true } } } });
    const stG: Record<string,number> = {}, brG: Record<string,number> = {}, atG: Record<string,number> = {};
    for (const t of allTasks2) {
      stG[t.project_id] = (stG[t.project_id]??0) + t._count.stages;
      brG[t.project_id] = (brG[t.project_id]??0) + t._count.briefing_answers;
      atG[t.project_id] = (atG[t.project_id]??0) + t._count.attachments;
    }
    const credLogs2 = await prisma.projectCredentialAccessLog.findMany({ select: { credential: { select: { project_id: true } } } });
    const clG: Record<string,number> = {};
    for (const cl of credLogs2) { const pid = cl.credential?.project_id; if (pid) clG[pid] = (clG[pid]??0)+1; }

    const ppM = Object.fromEntries(ppG.map(r=>[r.project_id,r._count.id]));
    const ptM = Object.fromEntries(ptG.map(r=>[r.project_id,r._count.id]));
    const crM = Object.fromEntries(credG.map(r=>[r.project_id,r._count.id]));
    const inM = Object.fromEntries(invG.map(r=>[r.project_id,r._count.id]));
    const paM = Object.fromEntries(payG.map(r=>[r.project_id,r._count.id]));

    const total = projects.length;
    const chk = (fn: (id: string)=>boolean) => projects.filter(p=>fn(p.id)).length;
    const r = (n: number) => `${n}/${total} (${Math.round(n/total*100)}%)`;

    console.log(`\n  Total projetos:                           ${total}`);
    console.log(`  Com Produtos ≥1:                          ${r(chk(id=>(ppM[id]??0)>=1))}`);
    console.log(`  Com Tarefas ≥1:                           ${r(chk(id=>(ptM[id]??0)>=1))}`);
    console.log(`  Com Etapas ≥1:                            ${r(chk(id=>(stG[id]??0)>=1))}`);
    console.log(`  Com Briefing ≥1:                          ${r(chk(id=>(brG[id]??0)>=1))}`);
    console.log(`  Com Arquivos ≥1:                          ${r(chk(id=>(atG[id]??0)>=1))}`);
    console.log(`  Com Cofre ≥1:                             ${r(chk(id=>(crM[id]??0)>=1))}`);
    console.log(`  Com Log Credencial ≥1:                    ${r(chk(id=>(clG[id]??0)>=1))}`);
    console.log(`  Com Faturamento ≥1:                       ${r(chk(id=>(inM[id]??0)>=1))}`);
    console.log(`  Com Pagamentos ≥1:                        ${r(chk(id=>(paM[id]??0)>=1))}`);

    const complete = projects.filter(p =>
      (ppM[p.id]??0)>=1 && (ptM[p.id]??0)>=1 && (stG[p.id]??0)>=1 &&
      (brG[p.id]??0)>=1 && (atG[p.id]??0)>=1 && (crM[p.id]??0)>=1 &&
      (clG[p.id]??0)>=1 && (inM[p.id]??0)>=1
    );
    console.log(`\n  Projetos completos em todas as abas:      ${r(complete.length)}`);

    const incomplete = projects.filter(p => !complete.find(c=>c.id===p.id));
    if (incomplete.length > 0) {
      console.log(`\n  ⚠️  Incompletos:`);
      for (const p of incomplete) {
        const issues = [];
        if ((ppM[p.id]??0)===0) issues.push("produtos");
        if ((ptM[p.id]??0)===0) issues.push("tarefas");
        if ((stG[p.id]??0)===0) issues.push("etapas");
        if ((brG[p.id]??0)===0) issues.push("briefing");
        if ((atG[p.id]??0)===0) issues.push("arquivos");
        if ((crM[p.id]??0)===0) issues.push("cofre");
        if ((clG[p.id]??0)===0) issues.push("cred_log");
        if ((inM[p.id]??0)===0) issues.push("faturamento");
        console.log(`    • ${p.id}: faltam ${issues.join(", ")}`);
      }
    } else {
      console.log(`\n  ✅  Objetivo: 100% — ATINGIDO`);
    }
  } else {
    console.log(`\n  [DRY] Nada foi escrito. Remova --dry-run para aplicar.`);
  }

  log(`\n✅ Seed concluído.\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// processProject — garante todos os dados de um projeto individual
// ═══════════════════════════════════════════════════════════════════════════════
async function processProject(
  proj: { id: string; title: string; status: string; value: number; budget: number; progress: number; start_date: Date|null; end_date: Date|null; description: string|null },
  agencyName: string,
  ctMap: Record<string, string>,
) {
  const pid = proj.id;

  // ── 4a. Project details ───────────────────────────────────────────────────
  const now  = new Date();
  const needsDetails = !proj.description || proj.value === 0 || !proj.start_date;
  if (needsDetails) {
    const start = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
    const end   = new Date(now.getTime() + 120 * 24 * 3600 * 1000);
    if (DRY_RUN) { dry(`update details ${pid}`); }
    else {
      await prisma.project.update({ where: { id: pid }, data: {
        description: proj.description || `Projeto demo: ${proj.title}. Dados de demonstração para validação da plataforma.`,
        value:       proj.value || 25000,
        budget:      proj.budget || 27000,
        start_date:  proj.start_date || start,
        end_date:    proj.end_date   || end,
        progress:    progressFor(proj.status, proj.progress),
        lifecycle:   "avulso",
        type:        "Marketing Digital",
        consultant:  "Mariana Costa",
        consultant_email: "mariana.costa@allka.test",
      }});
    }
  }

  // ── 4b. Produtos ──────────────────────────────────────────────────────────
  const existingPPs = await prisma.projectProduct.findMany({ where: { project_id: pid } });
  const existingProdIds = new Set(existingPPs.map((p) => p.product_id));

  const targetPair = pickPair(proj.title);
  const toAdd: ProdTuple[] = [];
  for (const tup of targetPair) {
    if (!existingProdIds.has(tup[0])) toAdd.push(tup);
  }

  const ppIdMap: Record<string, string> = {}; // product_id → projectProduct.id
  for (const ep of existingPPs) ppIdMap[ep.product_id] = ep.id;

  for (const [i, tup] of toAdd.entries()) {
    const [productId, prodName, prodCat, basePrice] = tup;
    const ppIdx  = existingPPs.length + i;
    const ppStat = ppStatus(proj.status, ppIdx);
    const val    = proj.value || 25000;
    const ppVal  = ppIdx === 0 ? Math.round(val * 0.6) : Math.round(val * 0.4);
    if (DRY_RUN) { dry(`upsert PP ${pid}/${productId}`); inc("pp"); continue; }
    const upserted = await prisma.projectProduct.upsert({
      where: { project_id_product_id: { project_id: pid, product_id: productId } },
      update: { status: ppStat, preco_final_cliente_snapshot: ppVal, comissao_snapshot: Math.round(ppVal * 0.1) },
      create: {
        project_id: pid, product_id: productId,
        product_name_snapshot: prodName, product_code_snapshot: productId,
        product_category_snapshot: prodCat, product_price_snapshot: basePrice,
        recurrence_snapshot: "avulso",
        preco_final_cliente_snapshot: ppVal, comissao_snapshot: Math.round(ppVal * 0.1),
        pagador_snapshot: "AGENCIA", status: ppStat,
        start_date: proj.start_date ?? new Date(),
        expected_end_date: proj.end_date ?? new Date(Date.now() + 90 * 24 * 3600 * 1000),
      },
    });
    ppIdMap[productId] = upserted.id;
    inc("pp");
  }

  // Refresh PP list after inserts
  const allPPs = await prisma.projectProduct.findMany({ where: { project_id: pid } });
  for (const ep of allPPs) ppIdMap[ep.product_id] = ep.id;

  // ── 4c. Tarefas ───────────────────────────────────────────────────────────
  const taskIdMap: Record<string, string> = {}; // product_id → task.id

  for (const [ppIdx, pp] of allPPs.entries()) {
    const tStat = taskStatus(proj.status, ppIdx);
    const taskTitle = `Execução: ${pp.product_name_snapshot}`;
    const catalogTaskId = ctMap[pp.product_id];

    // Find existing task for this product
    const existing = await prisma.projectTask.findFirst({
      where: { project_id: pid, product_id: pp.product_id },
      orderBy: { created_at: "asc" },
    });

    if (existing) {
      taskIdMap[pp.product_id] = existing.id;
      // Update status if needed
      if (!DRY_RUN) {
        await prisma.projectTask.update({ where: { id: existing.id }, data: {
          status: tStat, priority: ppIdx === 0 ? "high" : "medium", sort_order: ppIdx + 1,
          briefing_snapshot: JSON.stringify(getBQ(pp.product_category_snapshot)),
        }});
      }
    } else {
      if (DRY_RUN) { dry(`create task for ${pid}/${pp.product_id}`); inc("tasks"); taskIdMap[pp.product_id] = `dry-${pp.product_id}`; continue; }
      const created = await prisma.projectTask.create({ data: {
        project_id: pid, project_product_id: pp.id, product_id: pp.product_id,
        catalog_task_id: catalogTaskId ?? null,
        title: taskTitle, name_snapshot: taskTitle,
        category_snapshot: pp.product_category_snapshot,
        status: tStat, priority: ppIdx === 0 ? "high" : "medium", sort_order: ppIdx + 1,
        due_date: proj.end_date ?? new Date(Date.now() + 60 * 24 * 3600 * 1000),
        briefing_snapshot: JSON.stringify(getBQ(pp.product_category_snapshot)),
      }});
      taskIdMap[pp.product_id] = created.id;
      inc("tasks");
    }
  }

  // ── 4d. Etapas ────────────────────────────────────────────────────────────
  for (const [ppIdx, pp] of allPPs.entries()) {
    const tId   = taskIdMap[pp.product_id];
    if (!tId) continue;
    const tStat = taskStatus(proj.status, ppIdx);
    const existingStages = await prisma.projectTaskStage.count({ where: { project_task_id: tId } });
    if (existingStages > 0) continue; // já tem etapas
    const stages = makeStages(pp.product_category_snapshot, tStat);
    if (DRY_RUN) { stages.forEach(() => inc("stages")); dry(`create ${stages.length} stages for task ${tId}`); continue; }
    for (const s of stages) {
      await prisma.projectTaskStage.create({ data: {
        project_task_id: tId, titulo: s.titulo, descricao: s.descricao,
        ordem: s.ordem, status: s.status, obrigatoria: true,
        depende_da_etapa_anterior: s.ordem > 1, briefing_necessario: s.briefing_necessario,
      }});
      inc("stages");
    }
  }

  // ── 4e. Briefing answers ──────────────────────────────────────────────────
  for (const [ppIdx, pp] of allPPs.entries()) {
    const tId = taskIdMap[pp.product_id];
    if (!tId || tId.startsWith("dry-")) continue;
    const bq = getBQ(pp.product_category_snapshot);
    for (const q of bq) {
      if (DRY_RUN) { dry(`upsert briefing ${tId}/${q.key}`); inc("briefing"); continue; }
      await prisma.taskBriefingAnswer.upsert({
        where: { project_task_id_question_key: { project_task_id: tId, question_key: q.key } },
        update: { question_text: q.text, answer: bqAnswer(q.key, proj.title) },
        create: { project_task_id: tId, question_key: q.key, question_text: q.text, answer: bqAnswer(q.key, proj.title) },
      });
      inc("briefing");
    }
  }

  // ── 4f. Anexos ────────────────────────────────────────────────────────────
  for (const [ppIdx, pp] of allPPs.entries()) {
    const tId = taskIdMap[pp.product_id];
    if (!tId || tId.startsWith("dry-")) continue;
    const existCount = await prisma.taskAttachment.count({ where: { project_task_id: tId } });
    if (existCount > 0) continue;
    const base = `https://files.demo.test/${pid}`;
    const atts = [
      { type: "reference", name: `briefing-${pp.product_id.toLowerCase()}.pdf`, url: `${base}/briefing-${pp.product_id.toLowerCase()}.pdf`, size: 512000, mime: "application/pdf" },
      { type: "file",      name: `referencias-${ppIdx+1}.zip`,                   url: `${base}/referencias-${ppIdx+1}.zip`,                   size: 2048000, mime: "application/zip" },
    ];
    const tStat = taskStatus(proj.status, ppIdx);
    if (["EM_APROVACAO","CONCLUIDA"].includes(tStat)) {
      atts.push({ type: "delivery", name: `entrega-v1-${pp.product_id.toLowerCase()}.pdf`, url: `${base}/entrega-v1-${pp.product_id.toLowerCase()}.pdf`, size: 1024000, mime: "application/pdf" });
    }
    for (const att of atts) {
      if (DRY_RUN) { dry(`create attachment "${att.name}"`); inc("atts"); continue; }
      const exists = await prisma.taskAttachment.findFirst({ where: { project_task_id: tId, name: att.name } });
      if (!exists) {
        await prisma.taskAttachment.create({ data: {
          project_task_id: tId, type: att.type as any, name: att.name, url: att.url,
          size: att.size, mime_type: att.mime, uploaded_by: "seed",
        }});
      }
      inc("atts");
    }
  }

  // ── 4g. Credenciais ───────────────────────────────────────────────────────
  const existingCreds = await prisma.projectCredential.findMany({ where: { project_id: pid } });
  const existingCredTitles = new Set(existingCreds.map((c) => c.title));
  const needCreds = credCount(proj.status);
  const offset = (pid.charCodeAt(pid.length - 1) + pid.charCodeAt(pid.length - 2)) % CRED_POOL.length;

  let created = 0;
  for (let i = 0; i < needCreds && existingCreds.length + created < needCreds; i++) {
    const cTemplate = CRED_POOL[(offset + i) % CRED_POOL.length];
    if (existingCredTitles.has(cTemplate.title)) continue;
    if (DRY_RUN) { dry(`upsert cred "${cTemplate.title}" for ${pid}`); inc("creds"); created++; continue; }
    await prisma.projectCredential.upsert({
      where: { project_id_title: { project_id: pid, title: cTemplate.title } },
      update: {},
      create: {
        project_id: pid, title: cTemplate.title, service: cTemplate.service,
        url: cTemplate.url, username: cTemplate.username, password_demo: cTemplate.password_demo,
        category: cTemplate.category as any, status: credStatus(proj.status, i) as any,
        is_demo: true, created_by: "seed",
      },
    });
    inc("creds"); created++;
  }

  // ── 4h. Credential access logs ────────────────────────────────────────────
  const allCreds = await prisma.projectCredential.findMany({ where: { project_id: pid } });
  for (const cred of allCreds) {
    const logCount = await prisma.projectCredentialAccessLog.count({ where: { credential_id: cred.id } });
    if (logCount > 0) continue;
    if (DRY_RUN) { dry(`create cred_log for ${cred.id}`); inc("credLogs"); continue; }
    await prisma.projectCredentialAccessLog.create({ data: {
      credential_id: cred.id, action: "created", actor_type: "system",
      details: "Credencial criada pelo seed de demonstração.",
    }});
    inc("credLogs");
  }

  // ── 4i. Faturas ───────────────────────────────────────────────────────────
  if (proj.status === "cancelled") return; // cancelled: sem faturas

  const existingInvs = await prisma.invoice.findMany({ where: { project_id: pid }, orderBy: { created_at: "asc" } });
  const targetCount = invCount(proj.status);
  const toCreate    = Math.max(0, targetCount - existingInvs.length);

  for (let i = 0; i < toCreate; i++) {
    const invIdx  = existingInvs.length + i;
    const invStat = invStatusFor(proj.status, invIdx, targetCount);
    if (invStat === ("cancelled" as any)) continue;
    const amount  = Math.round((proj.value || 25000) / targetCount / 100) * 100 || 500;
    const num     = `INV-GDC-${pid.slice(-6).toUpperCase()}-${String(invIdx + 1).padStart(3, "0")}`;
    const dueDate = new Date(Date.now() + (invIdx - 1) * 30 * 24 * 3600 * 1000);
    const paidAt  = invStat === "paid" ? new Date(dueDate.getTime() - 2 * 24 * 3600 * 1000) : null;

    if (DRY_RUN) { dry(`upsert invoice ${num} [${invStat}]`); inc("invoices"); continue; }
    await prisma.invoice.upsert({
      where: { invoice_number: num },
      update: { status: invStat },
      create: {
        project_id: pid, company_id: null, invoice_number: num,
        amount, status: invStat as any, due_date: dueDate, paid_at: paidAt,
        description: `Fatura demo ${invIdx + 1} — ${proj.title}`,
      },
    });
    inc("invoices");

    // ── 4j. Pagamentos para faturas pagas ─────────────────────────────────
    if (invStat === "paid" && paidAt) {
      const inv2 = await prisma.invoice.findUnique({ where: { invoice_number: num } });
      if (inv2) {
        const payCount = await prisma.payment.count({ where: { project_id: pid, notes: num } });
        if (payCount === 0) {
          if (!DRY_RUN) {
            await prisma.payment.create({ data: {
              project_id: pid, amount, payment_method: "CARTAO_TESTE" as any,
              status: "PAGO" as any, gateway: "FAKE_SANDBOX" as any,
              fake_transaction_id: `FAKE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
              paid_at: paidAt, notes: num,
            }});
          }
          inc("payments");
        }
      }
    }
  }

  // Payments for existing paid invoices that have no payment
  for (const inv of existingInvs) {
    if (inv.status !== "paid" || !inv.paid_at) continue;
    const payCount = await prisma.payment.count({ where: { project_id: pid, notes: inv.invoice_number ?? undefined } });
    if (payCount > 0) continue;
    if (DRY_RUN) { dry(`create payment for ${inv.invoice_number}`); inc("payments"); continue; }
    await prisma.payment.create({ data: {
      project_id: pid, amount: inv.amount, payment_method: "CARTAO_TESTE" as any,
      status: "PAGO" as any, gateway: "FAKE_SANDBOX" as any,
      fake_transaction_id: `FAKE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      paid_at: inv.paid_at, notes: inv.invoice_number ?? undefined,
    }});
    inc("payments");
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
main()
  .catch((e) => { console.error("\n❌  Erro:", e.message, "\n", e.stack); process.exit(1); })
  .finally(() => prisma.$disconnect());

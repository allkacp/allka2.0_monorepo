// Seed idempotente da fundação do novo catálogo (sprint de produtos, bloco
// 2/6). Cria só as classificações reutilizáveis (pilares, 4Fs, categorias,
// especialidades) — NUNCA produtos. Idempotente por `key`. Chamado no boot
// (src/index.ts), como os demais ensure*.

import { prisma } from "./prisma";

const PILLARS = [
  { key: "presenca_digital", name: "A. Presença Digital e Conversão", sort_order: 1 },
  { key: "captacao_leads", name: "B. Captação de Leads e Automação", sort_order: 2 },
  { key: "redes_conteudo", name: "C. Redes Sociais e Conteúdo", sort_order: 3 },
  { key: "branding_design", name: "D. Branding e Design", sort_order: 4 },
  { key: "campanhas_offline", name: "E. Campanhas Offline e Impresso", sort_order: 5 },
];

const FOUR_F = [
  { key: "fundacao", name: "F1 — Fundação", sort_order: 1 },
  { key: "fluxo", name: "F2 — Fluxo", sort_order: 2 },
  { key: "forca", name: "F3 — Força", sort_order: 3 },
  { key: "fidelizacao", name: "F4 — Fidelização", sort_order: 4 },
];

const CATEGORIES = [
  { key: "performance", name: "Performance", sort_order: 1 },
  { key: "solucoes_web", name: "Soluções Web", sort_order: 2 },
  { key: "vendas_automacoes", name: "Vendas e Automações", sort_order: 3 },
  { key: "redacao", name: "Redação", sort_order: 4 },
  { key: "design", name: "Design", sort_order: 5 },
];

// Conjunto inicial de especialidades — perfis profissionais que as tarefas
// exigem. Refinável no bloco 3; nasce pequeno e honesto.
const SPECIALTIES = [
  { key: "gestor_trafego", name: "Gestor de Tráfego", sort_order: 1 },
  { key: "desenvolvedor_web", name: "Desenvolvedor Web", sort_order: 2 },
  { key: "especialista_seo_geo", name: "Especialista em SEO/GEO", sort_order: 3 },
  { key: "redator", name: "Redator", sort_order: 4 },
  { key: "designer", name: "Designer", sort_order: 5 },
  { key: "editor_video", name: "Editor de Vídeo", sort_order: 6 },
  { key: "especialista_automacao", name: "Especialista em Automação", sort_order: 7 },
];

export async function ensureCatalog2Foundation(): Promise<void> {
  for (const p of PILLARS) {
    await prisma.catalog2Pillar.upsert({
      where: { key: p.key },
      create: p,
      update: { name: p.name, sort_order: p.sort_order },
    });
  }
  for (const f of FOUR_F) {
    await prisma.catalog2FourF.upsert({
      where: { key: f.key },
      create: f,
      update: { name: f.name, sort_order: f.sort_order },
    });
  }
  for (const c of CATEGORIES) {
    await prisma.catalog2Category.upsert({
      where: { key: c.key },
      create: c,
      update: { name: c.name, sort_order: c.sort_order },
    });
  }
  for (const s of SPECIALTIES) {
    await prisma.catalog2Specialty.upsert({
      where: { key: s.key },
      create: s,
      update: { name: s.name, sort_order: s.sort_order },
    });
  }
}

export const CATALOG2_STATUSES = [
  "em_preparacao",
  "disponivel",
  "temporariamente_inativo",
  "arquivado",
] as const;
export type Catalog2Status = (typeof CATALOG2_STATUSES)[number];

export const CATALOG2_STATUS_MEANING: Record<Catalog2Status, string> = {
  em_preparacao: "Ainda sem versão publicada — não aparece para o cliente.",
  disponivel: "Tem versão publicada e está ofertável.",
  temporariamente_inativo: "Tem versão publicada, mas a oferta está suspensa (volta sem nova versão).",
  arquivado: "Fora do catálogo. Histórico preservado; não é reofertado.",
};

export const CATALOG2_EXECUTION_MODES = ["humano", "ia", "hibrido"] as const;
export type Catalog2ExecutionMode = (typeof CATALOG2_EXECUTION_MODES)[number];

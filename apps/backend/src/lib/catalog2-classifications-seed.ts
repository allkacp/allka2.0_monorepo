// Seed EXPLÍCITO das classificações dinâmicas do novo catálogo (bloco 3/6,
// correção 1.2). NÃO roda no boot — só pelo comando
// `npm run catalog2:seed-classifications` (ver src/scripts). Idempotente por
// `key`. As 4 fases 4Fs são estruturais e vivem na migration (não aqui);
// pilares/categorias/especialidades são dinâmicos (a ata prevê incluir
// novos pilares conforme a demanda) e podem ser editados pela API.

import type { PrismaClient } from "@prisma/client";

export const CATALOG2_PILLARS = [
  { key: "presenca_digital", name: "A. Presença Digital e Conversão", sort_order: 1 },
  { key: "captacao_leads", name: "B. Captação de Leads e Automação", sort_order: 2 },
  { key: "redes_conteudo", name: "C. Redes Sociais e Conteúdo", sort_order: 3 },
  { key: "branding_design", name: "D. Branding e Design", sort_order: 4 },
  { key: "campanhas_offline", name: "E. Campanhas Offline e Impresso", sort_order: 5 },
];

export const CATALOG2_CATEGORIES = [
  { key: "performance", name: "Performance", sort_order: 1 },
  { key: "solucoes_web", name: "Soluções Web", sort_order: 2 },
  { key: "vendas_automacoes", name: "Vendas e Automações", sort_order: 3 },
  { key: "redacao", name: "Redação", sort_order: 4 },
  { key: "design", name: "Design", sort_order: 5 },
];

// As 4 fases 4Fs são estruturais — no ambiente real vêm da MIGRATION. Este
// helper existe só para testes (run-db-tests.ts aplica o schema via
// `prisma db push`, que não roda os INSERT das migrations).
export const CATALOG2_FOUR_F = [
  { key: "fundacao", name: "F1 — Fundação", sort_order: 1 },
  { key: "fluxo", name: "F2 — Fluxo", sort_order: 2 },
  { key: "forca", name: "F3 — Força", sort_order: 3 },
  { key: "fidelizacao", name: "F4 — Fidelização", sort_order: 4 },
];

export const CATALOG2_SPECIALTIES = [
  { key: "gestor_trafego", name: "Gestor de Tráfego", sort_order: 1 },
  { key: "desenvolvedor_web", name: "Desenvolvedor Web", sort_order: 2 },
  { key: "especialista_seo_geo", name: "Especialista em SEO/GEO", sort_order: 3 },
  { key: "redator", name: "Redator", sort_order: 4 },
  { key: "designer", name: "Designer", sort_order: 5 },
  { key: "editor_video", name: "Editor de Vídeo", sort_order: 6 },
  { key: "especialista_automacao", name: "Especialista em Automação", sort_order: 7 },
];

// `upsert` por `key` não é atômico no MySQL: quando várias suítes de teste
// rodam em paralelo contra o MESMO banco (node --test roda arquivos em
// processos concorrentes), dois `create` podem colidir no índice único. O
// seed é idempotente, então tratamos a colisão como "já existe" e seguimos.
async function upsertTolerant(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") return;
    throw err;
  }
}

/** Só para testes: garante as 4 fases 4Fs (no ambiente real vêm da migration). */
export async function seedCatalog2FourFForTests(db: PrismaClient): Promise<void> {
  for (const f of CATALOG2_FOUR_F) {
    await upsertTolerant(() => db.catalog2FourF.upsert({ where: { key: f.key }, create: f, update: { name: f.name, sort_order: f.sort_order } }));
  }
}

export async function seedCatalog2Classifications(db: PrismaClient): Promise<{ pillars: number; categories: number; specialties: number }> {
  for (const p of CATALOG2_PILLARS) {
    await upsertTolerant(() => db.catalog2Pillar.upsert({ where: { key: p.key }, create: p, update: { name: p.name, sort_order: p.sort_order } }));
  }
  for (const c of CATALOG2_CATEGORIES) {
    await upsertTolerant(() => db.catalog2Category.upsert({ where: { key: c.key }, create: c, update: { name: c.name, sort_order: c.sort_order } }));
  }
  for (const s of CATALOG2_SPECIALTIES) {
    await upsertTolerant(() => db.catalog2Specialty.upsert({ where: { key: s.key }, create: s, update: { name: s.name, sort_order: s.sort_order } }));
  }
  return {
    pillars: await db.catalog2Pillar.count(),
    categories: await db.catalog2Category.count(),
    specialties: await db.catalog2Specialty.count(),
  };
}

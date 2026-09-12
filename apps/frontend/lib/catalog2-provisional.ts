// Camada de dados PROVISÓRIOS — reparo 2026-09 ("Cadastro/Catálogo
// visualmente completos com dados provisórios identificados").
//
// Objetivo: permitir que os 36 produtos catalog2 (a maioria sem preço,
// prazo, tarefas ou imagem reais ainda) apareçam visualmente completos nas
// telas administrativas, SEM fingir que esses valores são comerciais
// aprovados.
//
// Regras de ouro (nunca violadas por este arquivo):
//   • 100% cliente/exibição — nada aqui grava no banco, nada entra em
//     computePricing, checkClientVisibility ou qualquer gate de publicação/
//     cotação/checkout do backend.
//   • determinístico — a mesma string de entrada (id do produto) sempre
//     produz o mesmo valor; nunca muda entre renders ou depois de F5.
//   • todo valor gerado aqui é != valor real (o real SEMPRE vence — estas
//     funções só devem ser chamadas quando o campo real for null/ausente).
//   • toda função devolve `is_provisional: true` junto do valor, pra nunca
//     ser confundido com dado real em nenhuma tela.
//   • nunca usado pelo catálogo do cliente comum (só admin/preview).

export interface Provisional<T> {
  value: T;
  is_provisional: true;
  label: string;
}

// Hash determinístico simples (FNV-1a de 32 bits) — mesmo id sempre produz
// o mesmo número, sem depender de Math.random nem de horário.
function hash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(id: string, salt: string, items: readonly T[]): T {
  const idx = hash(id + salt) % items.length;
  return items[idx];
}

function range(id: string, salt: string, min: number, max: number, step = 1): number {
  const span = Math.floor((max - min) / step) + 1;
  const idx = hash(id + salt) % span;
  return min + idx * step;
}

// ── Miniatura provisória ──────────────────────────────────────────────
// Nunca uma foto — sempre um ícone + gradiente determinístico, de uma
// paleta fixa. Reutiliza só o padrão visual já usado nos placeholders
// (mesmo espírito do public/placeholder.svg já existente no repo) — nunca
// baixa nada da internet, nunca reaproveita imagem de produto antigo.
const THUMBNAIL_GRADIENTS = [
  "from-blue-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-purple-500 to-fuchsia-600",
] as const;
const THUMBNAIL_ICON_KEYS = ["Package", "Boxes", "Layers", "Briefcase", "Sparkles", "Target"] as const;
export type ThumbnailIconKey = (typeof THUMBNAIL_ICON_KEYS)[number];

export function provisionalThumbnail(productId: string): Provisional<{ gradient: string; iconKey: ThumbnailIconKey }> {
  return {
    value: {
      gradient: pick(productId, "thumb-grad", THUMBNAIL_GRADIENTS),
      iconKey: pick(productId, "thumb-icon", THUMBNAIL_ICON_KEYS),
    },
    is_provisional: true,
    label: "Imagem provisória — substituir",
  };
}

// ── Preço provisório ──────────────────────────────────────────────────
// Faixa plausível pra demonstração visual (R$ 300 a R$ 4.800, múltiplos
// de 50) — nunca usado em cotação/checkout/publicação (isso é decidido
// inteiramente pelo backend via computePricing/checkClientVisibility, que
// este arquivo nunca chama nem influencia).
export function provisionalPrice(productId: string): Provisional<number> {
  return {
    value: range(productId, "price", 300, 4800, 50),
    is_provisional: true,
    label: "Preço provisório — revisar",
  };
}

// ── Prazo provisório ────────────────────────────────────────────────
export function provisionalDeadlineDays(productId: string): Provisional<number> {
  return {
    value: range(productId, "deadline", 3, 21),
    is_provisional: true,
    label: "Prazo provisório — revisar",
  };
}

// ── Tarefas/etapas provisórias (SÓ DEMONSTRAÇÃO VISUAL) ────────────────
// Nunca materializa Catalog2Task/Catalog2Step de verdade — é só um número
// pra a tela não parecer vazia. A pendência real ("tarefas ainda não
// cadastradas") continua aparecendo ao lado, nunca escondida por este
// número.
export function provisionalTaskCount(productId: string): Provisional<number> {
  return { value: range(productId, "tasks", 2, 6), is_provisional: true, label: "Estrutura provisória — completar" };
}
export function provisionalStepCount(productId: string, taskCount: number): Provisional<number> {
  return { value: taskCount + range(productId, "steps", 1, 4), is_provisional: true, label: "Estrutura provisória — completar" };
}

// ── Badge comercial provisório (reunião 10/09, "cards e interação") ────
// Catalog2Product ganhou campos reais de merchandising (merch_is_new,
// merch_is_launch, merch_is_promotion, merch_is_featured — sempre nulos até
// um Admin Master decidir um). Enquanto nenhum estiver definido, o preview
// administrativo pode mostrar UM badge provisório determinístico — só pra
// avaliação visual do card, nunca visto pelo cliente comum (esta função só
// é chamada no Catálogo administrativo) e nunca usado pra calcular preço.
// ~40% dos ids não recebem nenhum badge (nem todo produto tem destaque).
const MERCH_KINDS = ["novo", "lancamento", "promocao", "destaque"] as const;
export type MerchBadgeKind = (typeof MERCH_KINDS)[number];
export const MERCH_KIND_LABEL: Record<MerchBadgeKind, string> = {
  novo: "Novo", lancamento: "Lançamento", promocao: "Promoção", destaque: "Destaque",
};
export function provisionalMerchandising(productId: string): Provisional<MerchBadgeKind | null> {
  const roll = hash(productId + "merch-roll") % 10;
  const kind = roll < 4 ? null : pick(productId, "merch-kind", MERCH_KINDS);
  return {
    value: kind,
    is_provisional: true,
    label: kind ? `${MERCH_KIND_LABEL[kind]} (provisório) — badge de demonstração, revisar antes de publicar.` : "Sem badge provisório",
  };
}

// ── Resumo por produto: campos reais vs. provisórios vs. ausentes ──────
export type FieldStatus = "real" | "provisorio" | "ausente";
export interface ProvisionalFieldSummary {
  field: string;
  status: FieldStatus;
}
export function summarizeFields(fields: { name: string; real: unknown }[]): ProvisionalFieldSummary[] {
  return fields.map(({ name, real }) => ({
    field: name,
    status: real != null ? "real" : "provisorio",
  }));
}

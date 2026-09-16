// Status do produto catalog2 — fonte única para o frontend (reunião
// 2026-09-14, Item 2 "Status e disponibilidade dos produtos"). Espelha
// apps/backend/src/lib/catalog2-foundation.ts — mesmos 6 literais salvos no
// banco (nenhum produto real muda de status por causa deste arquivo, só o
// RÓTULO em português exibido mudou). Usado por /admin/produtos e
// /admin/catalogo-produtos, que antes duplicavam esses mapas
// independentemente.
//
// Status é um eixo INDEPENDENTE de publicação de versão e de prontidão
// comercial — um não apaga o outro. Ver CATALOG2_CONTRACTABLE_STATUSES: só
// "disponivel" (Ativo) autoriza contratação, e mesmo assim só quando a
// prontidão comercial (preço/prazo completos) permitir — isso continua
// sendo decidido à parte (campo `client_contractable`/`commercial_ready`
// vindo do backend), nunca aqui.

export const CATALOG2_STATUSES = [
  "em_preparacao",
  "pre_lancamento",
  "disponivel",
  "temporariamente_inativo",
  "esgotado_temporariamente",
  "arquivado",
] as const;
export type Catalog2Status = (typeof CATALOG2_STATUSES)[number];

export const CATALOG2_STATUS_LABEL: Record<Catalog2Status, string> = {
  em_preparacao: "Em preparação",
  pre_lancamento: "Pré-lançamento",
  disponivel: "Ativo",
  temporariamente_inativo: "Pausado",
  esgotado_temporariamente: "Esgotado temporariamente",
  arquivado: "Inativo",
};

// Chips sólidos legíveis nos dois temas — mesmo estilo já aprovado para os
// 4 status originais, com 2 tons novos (índigo/laranja) para os status novos.
export const CATALOG2_STATUS_TONE: Record<Catalog2Status, string> = {
  em_preparacao: "bg-muted text-muted-foreground",
  pre_lancamento: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  disponivel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  temporariamente_inativo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  esgotado_temporariamente: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  arquivado: "bg-muted text-muted-foreground",
};

export const CATALOG2_STATUS_MEANING: Record<Catalog2Status, string> = {
  em_preparacao: "Disponível para administração e prévia interna; não aparece no catálogo do cliente nem é contratável.",
  pre_lancamento: "Visível no catálogo do cliente com etiqueta própria; contratação ainda bloqueada nesta etapa.",
  disponivel: "Visível e contratável quando atende às validações comerciais (preço e prazo comerciais completos).",
  temporariamente_inativo: "Continua visível no catálogo, com aviso; contratação temporariamente bloqueada.",
  esgotado_temporariamente: "Continua visível no catálogo, com aviso de indisponibilidade; contratação bloqueada.",
  arquivado: "Fora da listagem comercial comum; consultável pela administração e preservado no histórico.",
};

// Único status que autoriza contratação (sujeito ainda à prontidão
// comercial real, vinda do backend).
export const CATALOG2_CONTRACTABLE_STATUSES: readonly Catalog2Status[] = ["disponivel"];

export function catalog2StatusLabel(status: string): string {
  return CATALOG2_STATUS_LABEL[status as Catalog2Status] ?? status;
}

export function catalog2StatusTone(status: string): string {
  return CATALOG2_STATUS_TONE[status as Catalog2Status] ?? "bg-muted text-muted-foreground";
}

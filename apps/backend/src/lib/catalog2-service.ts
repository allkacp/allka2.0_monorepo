// Serviço do novo catálogo (sprint de produtos, bloco 2/6).
//
// Regras de negócio que o schema sozinho não garante:
//  - versão "publicada" é IMUTÁVEL (a edição direta é recusada — 409);
//  - publicar cria/usa uma versão NOVA e NUNCA apaga a anterior;
//  - o produto sempre sabe qual versão está publicada (published_version_id).
//
// Este lote NÃO traz o editor visual completo (isso é o bloco 3). Só o
// mínimo para provar a arquitetura + os testes.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { CATALOG2_STATUSES, type Catalog2Status } from "./catalog2-foundation";

export class Catalog2Error extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public code?: string,
  ) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient | typeof prisma;

export function assertVersionEditable(version: { state: string }): void {
  if (version.state === "publicada") {
    throw new Catalog2Error(
      "Esta versão está publicada e não pode ser alterada. Crie uma nova versão para mudar o produto.",
      409,
      "version_published_immutable",
    );
  }
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function createProduct(
  input: {
    internal_name: string;
    pillar_id?: string | null;
    category_id?: string | null;
    origin?: string | null;
    four_f_ids?: string[];
    version_title?: string;
  },
  actorUserId: string,
) {
  let base = slugify(input.internal_name) || "produto";
  let slug = base;
  for (let i = 2; await prisma.catalog2Product.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.catalog2Product.create({
      data: {
        slug,
        internal_name: input.internal_name,
        pillar_id: input.pillar_id ?? null,
        category_id: input.category_id ?? null,
        origin: input.origin ?? null,
        status: "em_preparacao",
        created_by_user_id: actorUserId,
        four_f: input.four_f_ids?.length
          ? { create: input.four_f_ids.map((four_f_id) => ({ four_f_id })) }
          : undefined,
      },
    });
    await tx.catalog2ProductVersion.create({
      data: {
        product_id: product.id,
        version_number: 1,
        state: "rascunho",
        title: input.version_title ?? input.internal_name,
        created_by_user_id: actorUserId,
      },
    });
    return product;
  });
}

/** Cria uma nova versão RASCUNHO a partir da última versão do produto. */
export async function newDraftVersion(productId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.catalog2Product.findUnique({
      where: { id: productId },
      include: { versions: { orderBy: { version_number: "desc" }, take: 1 } },
    });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const last = product.versions[0];
    if (last && last.state === "rascunho") {
      throw new Catalog2Error("Já existe uma versão em rascunho para este produto.", 409, "draft_exists");
    }
    const nextNumber = (last?.version_number ?? 0) + 1;
    return tx.catalog2ProductVersion.create({
      data: {
        product_id: productId,
        version_number: nextNumber,
        state: "rascunho",
        // Copia o conteúdo textual da última versão como ponto de partida.
        title: last?.title ?? product.internal_name,
        summary: last?.summary ?? null,
        full_description: last?.full_description ?? null,
        created_by_user_id: actorUserId,
      },
    });
  });
}

/**
 * Publica uma versão RASCUNHO. Nunca apaga a versão publicada anterior — só
 * troca `product.published_version_id` e marca o produto como "disponivel".
 */
export async function publishVersion(versionId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.catalog2ProductVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Catalog2Error("Versão não encontrada.", 404);
    if (version.state === "publicada") {
      throw new Catalog2Error("Esta versão já está publicada.", 409, "already_published");
    }

    const now = new Date();
    const published = await tx.catalog2ProductVersion.update({
      where: { id: versionId },
      data: { state: "publicada", published_at: now, published_by_user_id: actorUserId },
    });

    const product = await tx.catalog2Product.findUnique({ where: { id: version.product_id } });
    await tx.catalog2Product.update({
      where: { id: version.product_id },
      data: {
        published_version_id: published.id,
        // Só sai de "em_preparacao"; respeita "temporariamente_inativo"/"arquivado"
        // se o responsável já os tinha definido.
        status: product?.status === "em_preparacao" ? "disponivel" : product?.status,
      },
    });
    return published;
  });
}

export async function setProductStatus(productId: string, status: string, _db: Tx = prisma) {
  if (!CATALOG2_STATUSES.includes(status as Catalog2Status)) {
    throw new Catalog2Error(`Situação inválida: ${status}`, 400, "invalid_status");
  }
  const product = await prisma.catalog2Product.findUnique({
    where: { id: productId },
    select: { id: true, published_version_id: true },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if ((status === "disponivel" || status === "temporariamente_inativo") && !product.published_version_id) {
    throw new Catalog2Error(
      "O produto precisa de uma versão publicada antes de ficar disponível.",
      409,
      "needs_published_version",
    );
  }
  return prisma.catalog2Product.update({ where: { id: productId }, data: { status } });
}

// ── Serialização ────────────────────────────────────────────────────────
const NEW_LABEL_WINDOW_DAYS = 90; // "Novo por 3 meses" — derivado, nunca manual

export function isNewByPublicationDate(publishedAt: Date | null | undefined, now = new Date()): boolean {
  if (!publishedAt) return false;
  return now.getTime() - publishedAt.getTime() <= NEW_LABEL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export async function getProductDetail(productId: string) {
  const product = await prisma.catalog2Product.findUnique({
    where: { id: productId },
    include: {
      pillar: true,
      category: true,
      four_f: { include: { four_f: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: {
          variations: { orderBy: { sort_order: "asc" }, include: { options: { orderBy: { sort_order: "asc" } } } },
          addons: { orderBy: { sort_order: "asc" } },
          conditions: true,
          tasks: {
            orderBy: { sort_order: "asc" },
            include: { steps: { orderBy: { sort_order: "asc" } }, specialty: true, ai: true },
          },
        },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);

  const publishedVersion = product.versions.find((v) => v.id === product.published_version_id) ?? null;
  return {
    id: product.id,
    slug: product.slug,
    internal_name: product.internal_name,
    status: product.status,
    origin: product.origin,
    pillar: product.pillar ? { key: product.pillar.key, name: product.pillar.name } : null,
    category: product.category ? { key: product.category.key, name: product.category.name } : null,
    four_f: product.four_f.map((l) => ({ key: l.four_f.key, name: l.four_f.name })).sort(),
    published_version_id: product.published_version_id,
    is_new: isNewByPublicationDate(publishedVersion?.published_at),
    published_at: publishedVersion?.published_at ?? null,
    versions: product.versions.map((v) => ({
      id: v.id,
      version_number: v.version_number,
      state: v.state,
      title: v.title,
      summary: v.summary,
      full_description: v.full_description,
      published_at: v.published_at,
      is_published_current: v.id === product.published_version_id,
      variations: v.variations.map((va) => ({
        id: va.id,
        key: va.key,
        name: va.name,
        is_required: va.is_required,
        sort_order: va.sort_order,
        options: va.options.map((o) => ({ id: o.id, key: o.key, label: o.label, sort_order: o.sort_order })),
      })),
      addons: v.addons.map((a) => ({
        id: a.id,
        key: a.key,
        name: a.name,
        description: a.description,
        sort_order: a.sort_order,
        is_default_selected: a.is_default_selected,
      })),
      conditions: v.conditions.map((c) => ({ id: c.id, key: c.key, name: c.name, applies_to: c.applies_to })),
      tasks: v.tasks.map((t) => ({
        id: t.id,
        key: t.key,
        name: t.name,
        objective: t.objective,
        sort_order: t.sort_order,
        execution_mode: t.execution_mode,
        specialty: t.specialty ? { key: t.specialty.key, name: t.specialty.name } : null,
        ai: t.ai
          ? {
              provider: t.ai.provider,
              model: t.ai.model,
              est_input_tokens: t.ai.est_input_tokens,
              est_output_tokens: t.ai.est_output_tokens,
              human_review_required: t.ai.human_review_required,
            }
          : null,
        steps: t.steps.map((s) => ({ id: s.id, key: s.key, name: s.name, sort_order: s.sort_order })),
      })),
    })),
  };
}

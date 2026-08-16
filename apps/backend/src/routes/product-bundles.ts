import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { resolveMyAgencyId } from "../lib/project-scope";
import { assertProductContractable } from "../lib/product-contractability";
import { recalculateProjectValue } from "../lib/project-value";
import { parseProductMetadata } from "../lib/product-metadata";

const router = Router();

// "Combo": lista nomeada de produtos já existentes do catálogo. Ao
// contratar (POST /:id/contract), NUNCA vira uma linha própria de
// ProjectProduct — gera uma linha por produto componente, exatamente como
// se cada um tivesse sido comprado avulso. Ver plano da sessão
// "Combos de produtos (admin + agência)".
//
// Combo global (admin) tem agency_id null; combo de agência tem agency_id
// preenchido — só essa agência (+ admin) vê/edita. `requireRole` não serve
// aqui: "agencias" é account_type, não role (ver nivelPermitido em
// project-tasks.ts para o mesmo padrão de checagem usado nesta rota).

function isAdmin(req: Request): boolean {
  return req.user!.account_type === "admin" || req.user!.role === "admin";
}

async function podeVerOuEditar(req: Request, bundleAgencyId: string | null): Promise<boolean> {
  if (isAdmin(req)) return true;
  if (bundleAgencyId === null) return true; // combo global: qualquer um autenticado vê
  if (req.user!.account_type !== "agencias") return false;
  const minhaAgencia = await resolveMyAgencyId(prisma, req.user!.id);
  return minhaAgencia !== null && minhaAgencia === bundleAgencyId;
}

// Só quem PODE CRIAR/EDITAR de fato (mais restrito que "ver"): admin sempre;
// agência só se o combo for dela mesma (não pode editar um combo global).
async function podeEditar(req: Request, bundleAgencyId: string | null): Promise<boolean> {
  if (isAdmin(req)) return true;
  if (bundleAgencyId === null) return false;
  if (req.user!.account_type !== "agencias") return false;
  const minhaAgencia = await resolveMyAgencyId(prisma, req.user!.id);
  return minhaAgencia !== null && minhaAgencia === bundleAgencyId;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  product_id: z.string().min(1),
  variation_id: z.string().nullable().optional(),
});

const upsertSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  // Combo de 1 item só não faz sentido (é só o produto avulso) — exige 2+.
  items: z.array(itemSchema).min(2),
});

const contractSchema = z.object({
  project_id: z.string().min(1),
  pagador_snapshot: z.enum(["AGENCIA", "CLIENTE"]).optional(),
  recurrence_snapshot: z.enum(["avulso", "mensal"]).optional(),
});

// ── GET /api/product-bundles ──────────────────────────────────────────────────
// Admin vê todos; agência vê os globais + os dela; outros account_types não
// têm acesso (combo é ferramenta de quem monta o projeto, não vitrine do
// cliente final nesta fase).

router.get("/", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let where: Record<string, unknown> = {};
    if (!isAdmin(req)) {
      if (req.user!.account_type !== "agencias") {
        res.json({ data: [] });
        return;
      }
      const minhaAgencia = await resolveMyAgencyId(prisma, req.user!.id);
      where = { OR: [{ agency_id: null }, { agency_id: minhaAgencia }] };
    }

    const bundles = await prisma.productBundle.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { id: true, name: true, base_price: true, category: true } }, variation: true },
          orderBy: { sort_order: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    });
    res.json({ data: bundles });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/product-bundles/:id ──────────────────────────────────────────────

router.get("/:id", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bundle = await prisma.productBundle.findUnique({
      where: { id: req.params.id as string },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, base_price: true, category: true } }, variation: true },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    if (!bundle) {
      res.status(404).json({ error: "Combo não encontrado" });
      return;
    }
    if (!(await podeVerOuEditar(req, bundle.agency_id))) {
      res.status(403).json({ error: "Sem permissão para ver este combo" });
      return;
    }
    res.json(bundle);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/product-bundles ─────────────────────────────────────────────────

router.post("/", verifyToken, validate(upsertSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isAdmin(req) && req.user!.account_type !== "agencias") {
      res.status(403).json({ error: "Só admin ou agência podem criar combos" });
      return;
    }
    const { name, description, category, is_active, items } = req.body as z.infer<typeof upsertSchema>;

    const productIds = [...new Set(items.map((i) => i.product_id))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      res.status(400).json({ error: "Um ou mais produtos do combo não existem" });
      return;
    }
    const inativo = products.find((p) => !p.is_active);
    if (inativo) {
      res.status(400).json({ error: `O produto "${inativo.name}" está inativo e não pode entrar num combo` });
      return;
    }

    const agencyId = isAdmin(req) ? null : await resolveMyAgencyId(prisma, req.user!.id);
    if (!isAdmin(req) && !agencyId) {
      res.status(422).json({ error: "Usuário não está vinculado a nenhuma agência" });
      return;
    }

    const bundle = await prisma.productBundle.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        is_active: is_active ?? true,
        agency_id: agencyId,
        created_by_user_id: req.user!.id,
        items: {
          create: items.map((item, index) => ({
            product_id: item.product_id,
            variation_id: item.variation_id || null,
            sort_order: index,
          })),
        },
      },
      include: { items: { include: { product: true, variation: true } } },
    });
    res.status(201).json(bundle);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/product-bundles/:id ──────────────────────────────────────────────
// Substitui a lista de itens inteira (create-only não faz sentido aqui —
// combo é uma lista curta editada como um todo, não um histórico).

router.put("/:id", verifyToken, validate(upsertSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.productBundle.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ error: "Combo não encontrado" });
      return;
    }
    if (!(await podeEditar(req, existing.agency_id))) {
      res.status(403).json({ error: "Sem permissão para editar este combo" });
      return;
    }

    const { name, description, category, is_active, items } = req.body as z.infer<typeof upsertSchema>;
    const productIds = [...new Set(items.map((i) => i.product_id))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      res.status(400).json({ error: "Um ou mais produtos do combo não existem" });
      return;
    }

    const bundle = await prisma.$transaction(async (tx) => {
      await tx.productBundleItem.deleteMany({ where: { bundle_id: existing.id } });
      return tx.productBundle.update({
        where: { id: existing.id },
        data: {
          name,
          description: description || null,
          category: category || null,
          is_active: is_active ?? existing.is_active,
          items: {
            create: items.map((item, index) => ({
              product_id: item.product_id,
              variation_id: item.variation_id || null,
              sort_order: index,
            })),
          },
        },
        include: { items: { include: { product: true, variation: true } } },
      });
    });
    res.json(bundle);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/product-bundles/:id ───────────────────────────────────────────

router.delete("/:id", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.productBundle.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ error: "Combo não encontrado" });
      return;
    }
    if (!(await podeEditar(req, existing.agency_id))) {
      res.status(403).json({ error: "Sem permissão para excluir este combo" });
      return;
    }
    await prisma.productBundle.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── POST /api/product-bundles/:id/contract ────────────────────────────────────
// Contrata o combo inteiro num projeto: cria uma ProjectProduct por produto
// componente, tudo numa transação — ou vai tudo, ou nada (evita o padrão
// frágil do checkout normal, que faz N requests sequenciais sem transação).

router.post(
  "/:id/contract",
  verifyToken,
  validate(contractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bundle = await prisma.productBundle.findUnique({
        where: { id: req.params.id as string },
        include: { items: { include: { product: true, variation: true }, orderBy: { sort_order: "asc" } } },
      });
      if (!bundle || !bundle.is_active) {
        res.status(404).json({ error: "Combo não encontrado" });
        return;
      }
      if (!(await podeVerOuEditar(req, bundle.agency_id))) {
        res.status(403).json({ error: "Sem permissão para contratar este combo" });
        return;
      }
      if (bundle.items.length === 0) {
        res.status(422).json({ error: "Este combo não tem produtos" });
        return;
      }

      const { project_id, pagador_snapshot, recurrence_snapshot } =
        req.body as z.infer<typeof contractSchema>;

      const project = await prisma.project.findUnique({ where: { id: project_id }, select: { id: true } });
      if (!project) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }

      // Recusa a contratação inteira (nenhum ProjectProduct parcial) se
      // qualquer componente não puder ser contratado agora — mesma regra
      // que já vale pra comprar cada produto avulso.
      for (const item of bundle.items) {
        await assertProductContractable(item.product_id);
      }

      // Id de agrupamento gerado uma vez, antes da transação — todas as N
      // linhas nascidas desta contratação levam o mesmo valor. Não é FK pro
      // ProductBundle (que pode ser editado/apagado depois), é só uma
      // etiqueta, então não precisa vir de nenhuma linha em particular.
      const groupId = randomUUID();

      const projectProducts = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const item of bundle.items) {
          const priceSnapshot =
            item.variation_id && item.variation ? item.variation.price || item.product.base_price : item.product.base_price;
          // Cada componente congela SEU PRÓPRIO limite de alterações/taxa
          // emergencial no momento da contratação — mesma lógica de
          // project-products.ts POST /, não um valor único pro combo.
          const meta = parseProductMetadata(item.product.metadata);
          const pp = await tx.projectProduct.create({
            data: {
              project_id,
              product_id: item.product_id,
              variation_id: item.variation_id,
              product_name_snapshot: item.product.name,
              product_code_snapshot: item.product.id,
              product_category_snapshot: item.product.category,
              product_price_snapshot: priceSnapshot,
              preco_final_cliente_snapshot: priceSnapshot,
              comissao_snapshot: 0,
              pagador_snapshot: pagador_snapshot ?? "AGENCIA",
              recurrence_snapshot: recurrence_snapshot || null,
              alteracoes_incluidas_snapshot: meta.alteracoesIncluidas ?? 3,
              valor_alteracao_extra_snapshot: meta.valorAlteracaoExtra ?? 0,
              taxa_emergencial_reducao_percentual_snapshot:
                meta.taxaEmergencialReducaoPercentual ?? 50,
              origin: "COMBO",
              origin_bundle_purchase_id: groupId,
              origin_bundle_name_snapshot: bundle.name,
              status: "PENDENTE",
            },
          });
          created.push(pp);
        }
        return created;
      });

      await recalculateProjectValue(prisma, project_id);

      res.status(201).json({ project_products: projectProducts, bundle_name: bundle.name });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

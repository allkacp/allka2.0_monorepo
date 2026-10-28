// Ajudantes compartilhados dos testes de "primeira execução / continuidade / questionário / entregáveis" (16/10).
// Cria usuários, empresas, produtos do catálogo com etapas configuráveis, cotação, checkout, pagamento e a limpeza completa.
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { publishVersion } from "../lib/catalog2-service";

export const uid = () => crypto.randomBytes(4).toString("hex");
export const SEL = { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} };
export const r2 = (x: number) => Math.round(x * 100) / 100;

export function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}

export interface StepDef { minutes?: number; first?: boolean; skip?: boolean; name?: string; ops?: unknown }
export interface ProductOpts {
  steps?: StepDef[];
  recurring?: boolean;
  oneTime?: boolean;
  continuity?: string;
  extraTask?: boolean;
  publish?: boolean;
  flags?: Record<string, unknown>;
  taskFlags?: Record<string, unknown>;
  variationsRaw?: unknown[];
}

export class TestWorld {
  baseUrl = "";
  server!: import("node:http").Server;
  users: string[] = [];
  adminProfiles: string[] = [];
  companies: string[] = [];
  catProducts: string[] = [];
  projects: string[] = [];
  questionnaires: string[] = [];
  extra: (() => Promise<void>)[] = [];

  async start(app: { listen: (p: number) => import("node:http").Server }) {
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    this.server = app.listen(0);
    await new Promise<void>((r) => this.server.once("listening", () => r()));
    this.baseUrl = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  async api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }

  async mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
    const id = `fe-${uid()}${uid()}`;
    const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
    this.users.push(u.id);
    return u;
  }
  async mkCompanyUser(tag: string) {
    const c = await prisma.company.create({ data: { name: `[TESTE] FE ${tag} ${uid()}`, status: "ativo" } });
    this.companies.push(c.id);
    const user = await this.mkUser("company_user", "empresas", { company_id: c.id });
    return { user, token: tokenFor(user), companyId: c.id };
  }
  async mkAdmin() {
    const p = await prisma.adminProfile.create({ data: { name: `FE ${uid()}`, is_master: true, is_active: true } });
    this.adminProfiles.push(p.id);
    const user = await this.mkUser("admin", "admin", { admin_profile_id: p.id });
    return { user, token: tokenFor(user) };
  }
  async mkNomad(skillText = "Tarefa") {
    const user = await this.mkUser("nomad", "nomades");
    const nomade = await prisma.nomade.create({ data: { user_id: user.id, name: user.name, email: `${user.id}-n@example.test`, status: "ativo" } });
    const h = await prisma.nomadeHabilidade.create({ data: { nomade_id: nomade.id, area: "Qualquer", categoria_produto: skillText, disponibilidade: "disponivel", ativo: true, nota_media: 4 } });
    this.extra.push(async () => {
      await prisma.taskOffer.deleteMany({ where: { nomade_id: nomade.id } });
      await prisma.taskAssignmentHistory.deleteMany({ where: { nomade_id: nomade.id } });
      await prisma.nomadeHabilidade.deleteMany({ where: { id: h.id } });
      await prisma.nomade.delete({ where: { id: nomade.id } }).catch(() => {});
    });
    return { user, nomade };
  }

  async setPricingSettings() {
    const d = { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) };
    await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...d }, update: d });
  }

  /** Produto individual (uma tarefa "rotina") com as etapas pedidas. Cada etapa vale `minutes` (padrão 60) a R$ 100/h. */
  async mkProduct(name: string, o: ProductOpts = {}) {
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
    await this.setPricingSettings();
    const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
    const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
    const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
    const slug = `fe-${uid()}`;
    const steps = o.steps ?? [{ minutes: 60 }];
    const product = await prisma.catalog2Product.create({
      data: { slug, internal_name: `[TESTE LOCAL] ${name} ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", delivery_recurrence: o.recurring ? "mensal" : null, task_structure: "single", four_f: { create: [{ four_f_id: fourF.id }] } },
    });
    this.catProducts.push(product.id);
    const v = await prisma.catalog2ProductVersion.create({
      data: {
        product_id: product.id, version_number: 1, state: "rascunho", title: name, summary: "resumo", full_description: "descrição do serviço de teste",
        base_commercial_deadline_days: 5, implementation_blocks_operation: false, accepts_recurring: !!o.recurring, accepts_one_time: o.oneTime ?? true, ...(o.flags ?? {}),
        tasks: {
          create: [{
            key: "rotina", name: "Tarefa rotina", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: null, sort_order: 1,
            cycle_type: "recorrente", repeat_rule: "all_cycles", executor_continuity: o.continuity ?? "not_allowed", ...(o.taskFlags ?? {}),
            steps: { create: steps.map((s, k) => ({ key: `s${k + 1}`, name: s.name ?? `Etapa ${k + 1}`, sort_order: k + 1, specialty_id: spec.id, estimated_minutes: s.minutes ?? 60, first_execution_only: !!s.first, skip_when_same_executor: !!s.skip, ...(s.ops ? { ops: s.ops as never } : {}) })) },
          }],
        },
        ...(o.variationsRaw ? { variations: { create: o.variationsRaw as never } } : {}),
      },
    });
    if (o.recurring) await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: { is_active: true } });
    if (o.publish !== false) await publishVersion(v.id, "system", { activate: true, changeSummary: "publicação de teste" });
    return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
  }

  async simulate(adminToken: string, versionId: string, selection: Record<string, unknown> = SEL) {
    const r = await this.api(`/api/admin/catalog2/versions/${versionId}/simulate`, { method: "POST", token: adminToken, body: selection });
    if (r.status !== 200) throw new Error(`simulate ${r.status}: ${JSON.stringify(r.json)}`);
    return r.json.pricing as any;
  }
  async quote(token: string, productId: string, o: { period?: string; selection?: Record<string, unknown> } = {}) {
    return this.api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: o.selection ?? SEL, ...(o.period ? { period: o.period } : {}) } });
  }
  async checkoutAndPay(token: string, quoteIds: string[]) {
    const created = await this.api("/api/projects", { method: "POST", token, body: { title: `[TESTE] Contratação ${crypto.randomUUID()}`, status: "draft" } });
    if (created.status !== 201) throw new Error(`project ${created.status}: ${JSON.stringify(created.json)}`);
    this.projects.push(created.json.id);
    const checkout = await this.api("/api/catalog2/checkout", { method: "POST", token, body: { quote_ids: quoteIds, checkout_client_action_id: crypto.randomUUID(), project_id: created.json.id } });
    if (checkout.status !== 201) throw new Error(`checkout ${checkout.status}: ${JSON.stringify(checkout.json)}`);
    const projectId = checkout.json.project.id as string;
    this.projects.push(projectId);
    const pay = await this.api("/api/payments/fake-checkout", { method: "POST", token, body: { project_id: projectId } });
    if (pay.status !== 201) throw new Error(`pagamento ${pay.status}: ${JSON.stringify(pay.json)}`);
    return { projectId, pps: checkout.json.project_products as { id: string; catalog2_product_id: string }[] };
  }

  async cleanup() {
    await new Promise<void>((res, rej) => this.server.close((e) => (e ? rej(e) : res())));
    for (const id of this.projects.splice(0)) {
      const taskIds = (await prisma.projectTask.findMany({ where: { project_id: id }, select: { id: true } })).map((t) => t.id);
      await prisma.systemAlert.deleteMany({ where: { entity_id: { in: taskIds } } }).catch(() => {});
      await prisma.taskOffer.deleteMany({ where: { project_task_id: { in: taskIds } } }).catch(() => {});
      await prisma.catalog2SubscriptionEvent.deleteMany({ where: { subscription: { project_id: id } } }).catch(() => {});
      await prisma.catalog2Subscription.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectTaskDeliverable.deleteMany({ where: { project_task_id: { in: taskIds } } }).catch(() => {});
      await prisma.taskBriefingAnswer.deleteMany({ where: { project_task_id: { in: taskIds } } }).catch(() => {});
      await prisma.projectTaskOps.deleteMany({ where: { project_task_id: { in: taskIds } } }).catch(() => {});
      await prisma.projectDecisionLog.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.clientAssetLink.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectDependencyRule.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.taskDependency.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product: { project_id: id } } }).catch(() => {});
      await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
      await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.catalog2ChangeOrder.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.project.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of this.catProducts.splice(0)) {
      await prisma.catalog2DependencyRule.deleteMany({ where: { OR: [{ dependent_product_id: id }, { target_product_id: id }] } }).catch(() => {});
      await prisma.catalog2PackageItem.deleteMany({ where: { catalog2_product_id: id } }).catch(() => {});
      await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
      const vids = (await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } })).map((x) => x.id);
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2ProductHistoryEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    if (this.questionnaires.length) await prisma.catalog2Questionnaire.deleteMany({ where: { id: { in: this.questionnaires.splice(0) } } }).catch(() => {});
    for (const fn of this.extra.splice(0).reverse()) await fn().catch(() => {});
    await prisma.catalog2Package.deleteMany({ where: { name: { startsWith: "[TESTE FE]" } } }).catch(() => {});
    await prisma.company.deleteMany({ where: { id: { in: this.companies } } }).catch(() => {});
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: this.users } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: this.users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: this.adminProfiles } } }).catch(() => {});
  }
}

export const tasksOf = (projectId: string, occurrence?: number) =>
  prisma.projectTask.findMany({ where: { project_id: projectId, ...(occurrence != null ? { occurrence_index: occurrence } : {}) }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } }, orderBy: { created_at: "asc" } });

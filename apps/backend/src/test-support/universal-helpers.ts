// Apoio dos testes da estrutura universal v2 (2026-10-02). Só roda em banco descartável (ver require-test-database).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { requireTestDatabaseUrl } from "./require-test-database";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { publishVersion } from "../lib/catalog2-service";

export const uid = () => crypto.randomBytes(4).toString("hex");
export const SEL = { variation_option_keys: [] as string[], addon_keys: [] as string[], quantity: 1, answers: {} as Record<string, string> };

let baseUrl = "";
let server: import("node:http").Server;
export const projects: string[] = [];

export async function startServer() {
  requireTestDatabaseUrl();
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  await seedCatalog2FourFForTests(prisma);
  await seedCatalog2Classifications(prisma);
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
export const getBaseUrl = () => baseUrl;
export async function stopServer() {
  await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
}

export function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
export async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: (await res.json().catch(() => null)) as any };
}

export async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
  const id = `u2-${uid()}${uid()}`;
  return prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
}
export async function mkCompanyUser(tag = "A") {
  const c = await prisma.company.create({ data: { name: `[TESTE] V2 ${tag} ${uid()}`, status: "ativo" } });
  const user = await mkUser("company_user", "empresas", { company_id: c.id });
  return { user, token: tokenFor(user), companyId: c.id };
}
export async function mkAdmin() {
  const p = await prisma.adminProfile.create({ data: { name: `V2 ${uid()}`, is_master: true, is_active: true } });
  const user = await mkUser("admin", "admin", { admin_profile_id: p.id });
  return { user, token: tokenFor(user) };
}
export async function mkLeader() {
  const user = await mkUser("lider", "lider");
  return { user, token: tokenFor(user) };
}

/** Regra de preço real do teste (percentuais e ordem completos). */
export async function setPricingSettings(o: Partial<{ tax_percent: number; commission_percent: number; operational_fee_percent: number; profit_margin_percent: number; human_review_percent: number }> = {}) {
  const d = { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]), component_base_json: JSON.stringify({ tax: "running", commission: "running", operational: "running", margin: "running" }), ...o };
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...d }, update: d });
}
export async function setRate(key: string, rate: number) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: rate } });
  return spec;
}

export interface StepSpec { key: string; minutes?: number; conditional?: boolean; name?: string }
export interface TaskSpec {
  key: string; minutes?: number; conditional?: boolean; cycle?: string; repeat?: string; continuity?: string; mode?: string;
  approval?: boolean; qualification?: boolean; steps?: StepSpec[]; data?: Record<string, unknown>;
}
export interface ProductSpec {
  name: string; tasks: TaskSpec[]; recurring?: boolean; flags?: Record<string, unknown>; deadline?: number; publish?: boolean;
  variations?: unknown[]; addons?: unknown[]; conditions?: unknown[]; rate?: number;
}

/** Cria um produto (rascunho ou publicado/ativo) com estrutura arbitrária. Todas as tarefas: especialidade "designer". */
export async function mkProduct(o: ProductSpec) {
  const spec = await setRate("designer", o.rate ?? 100);
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const slug = `v2-${uid()}`;
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] ${o.name} ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", delivery_recurrence: o.recurring ? "mensal" : null, four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: o.name, summary: "resumo", full_description: "descrição do serviço de teste",
      base_commercial_deadline_days: o.deadline ?? 5, implementation_blocks_operation: false, accepts_recurring: !!o.recurring, accepts_one_time: true, ...(o.flags ?? {}),
      tasks: {
        create: o.tasks.map((t, i) => ({
          key: t.key, name: `Tarefa ${t.key}`, execution_mode: t.mode ?? "humano", specialty_id: spec.id, estimated_minutes: t.minutes ?? 60, sort_order: i + 1,
          cycle_type: t.cycle ?? "recorrente", repeat_rule: t.repeat ?? "all_cycles", executor_continuity: t.continuity ?? "not_allowed", is_conditional: !!t.conditional,
          requires_client_approval: !!t.approval, requires_qualification: !!t.qualification, ...(t.data ?? {}),
          steps: { create: (t.steps ?? [{ key: "s1", minutes: t.minutes ?? 60 }]).map((s, k) => ({ key: s.key, name: s.name ?? `Etapa ${t.key}-${s.key}`, sort_order: k + 1, specialty_id: spec.id, estimated_minutes: s.minutes ?? 60, is_conditional: !!s.conditional })) },
        })),
      },
      ...(o.variations ? { variations: { create: o.variations as never } } : {}),
      ...(o.addons ? { addons: { create: o.addons as never } } : {}),
      ...(o.conditions ? { conditions: { create: o.conditions as never } } : {}),
    },
  });
  if (o.recurring) await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: { is_active: true } });
  if (o.publish) await publishVersion(v.id, "system", { activate: true, changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
}

export const r2 = (x: number) => Math.round(x * 100) / 100;
export const near = (a: unknown, b: unknown, msg = "", tol = 0.03) => assert.ok(typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tol, `${msg} ${a} != ${b}`);

/** Preço de 1 hora do cenário de teste: 100/h → custo 100; revisão 15% → 115; margem/taxas (1,06×1,10×1,05×1,30). */
export const FACTOR = 1.06 * 1.1 * 1.05 * 1.3;
export const priceOfMinutes = (minutes: number, rate = 100, review = 0.15) => r2((minutes / 60) * rate * (1 + review) * FACTOR);

export async function simulate(token: string, versionId: string, selection: Record<string, unknown> = SEL) {
  const r = await api(`/api/admin/catalog2/versions/${versionId}/simulate`, { method: "POST", token, body: selection });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json as { pricing: any; price_summary: any; selection_issues: any[]; quote_requirements: any[] };
}
export async function checkoutAndPay(token: string, quoteIds: string[]) {
  const checkout = await api("/api/catalog2/checkout", { method: "POST", token, body: { quote_ids: quoteIds, checkout_client_action_id: crypto.randomUUID() } });
  assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
  const projectId = checkout.json.project.id as string;
  projects.push(projectId);
  const pay = await api("/api/payments/fake-checkout", { method: "POST", token, body: { project_id: projectId } });
  assert.equal(pay.status, 201, JSON.stringify(pay.json));
  return { projectId, pps: checkout.json.project_products as { id: string; catalog2_product_id: string }[] };
}
export const tasksOf = (projectId: string, occurrence?: number) =>
  prisma.projectTask.findMany({ where: { project_id: projectId, ...(occurrence != null ? { occurrence_index: occurrence } : {}) }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } }, orderBy: { sort_order: "asc" } });
export const byKey = (rows: Awaited<ReturnType<typeof tasksOf>>) => Object.fromEntries(rows.map((r) => [r.catalog2_task?.key ?? r.title, r]));

export { addAccessRequirements } from "./access-helpers";

// Verificação AUTOMATIZADA (somente leitura) da integridade dos 36 produtos e dos cadastros globais.
// Uso: tsx scripts/verify-product-integrity.ts --baseline-url mysql://... --out <pasta> [--api http://localhost:3001]
//  • --baseline-url: base restaurada do backup (estado esperado antes da implementação);
//  • a base principal vem de DATABASE_URL; nada é escrito em nenhuma das duas.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const baselineUrl = arg("baseline-url");
const outDir = arg("out") ?? ".";
const apiBase = arg("api") ?? "http://localhost:3001";
if (!baselineUrl) throw new Error("--baseline-url é obrigatório");

const main = new PrismaClient();
const base = new PrismaClient({ datasources: { db: { url: baselineUrl } } });
const sha = (v: unknown) => crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
type Check = { id: string; description: string; ok: boolean; detail?: unknown };
const checks: Check[] = [];
const check = (id: string, description: string, ok: boolean, detail?: unknown) => checks.push({ id, description, ok, detail });

async function snapshot(db: PrismaClient) {
  const products = await db.catalog2Product.findMany({ orderBy: { id: "asc" }, select: { id: true, sequence_number: true, internal_name: true, status: true, published_version_id: true, pillar_id: true, category_id: true, delivery_recurrence: true, archived_at: true } });
  // Só colunas que já existiam no backup (o backup é anterior às migrações novas).
  const versions = await db.catalog2ProductVersion.findMany({ orderBy: { id: "asc" }, select: { id: true, product_id: true, version_number: true, state: true, title: true, summary: true, full_description: true, base_commercial_deadline_days: true, provisional_commercial_deadline_days: true, accepts_one_time: true, accepts_recurring: true, has_initial_implementation: true, published_at: true } });
  const taskModels = await db.catalog2TaskModel.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, description: true, execution_mode: true, specialty_id: true, estimated_minutes: true, cycle_type: true, repeat_rule: true, executor_continuity: true, asset_rule: true, is_active: true, revision: true, signature: true } });
  const stepModels = await db.catalog2StepModel.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, description: true, purpose: true, execution_mode: true, specialty_id: true, estimated_minutes: true, is_active: true, revision: true, signature: true } });
  const specialties = await db.catalog2Specialty.findMany({ orderBy: { id: "asc" }, select: { id: true, key: true, name: true, max_hourly_rate: true } });
  const pillars = await db.catalog2Pillar.findMany({ orderBy: { id: "asc" }, select: { id: true, key: true, name: true } });
  const categories = await db.catalog2Category.findMany({ orderBy: { id: "asc" }, select: { id: true, key: true, name: true } });
  const fourF = await db.catalog2FourF.findMany({ orderBy: { id: "asc" }, select: { id: true, key: true } });
  const questionnaires = await db.catalog2Questionnaire.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, questions: { orderBy: { id: "asc" }, select: { id: true, key: true, label: true } } } });
  const pricing = await db.catalog2PricingSettings.findMany({ orderBy: { id: "asc" } });
  return {
    products, versions, taskModels, stepModels, specialties, pillars, categories, fourF, questionnaires, pricing,
    counts: {
      tasks: await db.catalog2Task.count(), steps: await db.catalog2TaskStep.count(), periods: await db.catalog2ProductPeriod.count(), productFourF: await db.catalog2ProductFourF.count(),
      addons: await db.catalog2Addon.count(), variations: await db.catalog2Variation.count(), conditions: await db.catalog2Condition.count(), quotes: await db.catalog2Quote.count(),
      aiProfiles: await db.catalog2AIProfile.count(), dependencyRules: await db.catalog2DependencyRule.count(), deliverables: await db.catalog2TaskDeliverable.count(),
    },
  };
}

(async () => {
  const [now, before] = await Promise.all([snapshot(main), snapshot(base)]);
  // colunas novas (só existem na base principal)
  const newCols = await main.catalog2ProductVersion.findMany({ orderBy: { id: "asc" }, select: { id: true, pricing_mode: true, manual_price: true, manual_deadline_days: true, scope: true, target_audience: true, commercial_objective: true, client_info: true, internal_notes: true, included_items_json: true, excluded_items_json: true, client_requirements_json: true, deliverables_summary_json: true, change_policy: true, results_disclaimer: true } });

  check("P1", "existem exatamente 36 produtos", now.products.length === 36, now.products.length);
  check("P2", "cada produto manteve o mesmo ID", sha(now.products.map((p) => p.id)) === sha(before.products.map((p) => p.id)));
  check("P3", "cada produto manteve o mesmo número sequencial e nome", sha(now.products.map((p) => [p.id, p.sequence_number, p.internal_name])) === sha(before.products.map((p) => [p.id, p.sequence_number, p.internal_name])));
  const byProduct = new Map<string, typeof now.versions>();
  for (const v of now.versions) byProduct.set(v.product_id, [...(byProduct.get(v.product_id) ?? []), v]);
  check("P4", "cada produto tem exatamente uma versão, e ela é a V1", now.products.every((p) => (byProduct.get(p.id) ?? []).length === 1 && byProduct.get(p.id)![0].version_number === 1));
  check("P5", "todas as V1 continuam em rascunho", now.versions.every((v) => v.state === "rascunho"));
  check("P6", "todos continuam em em_preparacao", now.products.every((p) => p.status === "em_preparacao"));
  check("P7", "nenhum possui versão publicada", now.products.every((p) => p.published_version_id == null) && now.versions.every((v) => v.published_at == null));
  check("P8", "nenhuma tarefa foi vinculada", now.counts.tasks === 0, now.counts.tasks);
  check("P9", "nenhuma etapa foi vinculada", now.counts.steps === 0, now.counts.steps);
  check("P10", "nenhum preço foi definido (modo calculado, sem preço fixo)", newCols.every((v) => v.pricing_mode === "calculated" && v.manual_price == null));
  check("P11", "nenhum prazo foi definido", now.versions.every((v) => v.base_commercial_deadline_days == null && v.provisional_commercial_deadline_days == null) && newCols.every((v) => v.manual_deadline_days == null));
  check("P12", "nenhuma modalidade foi habilitada (avulso/assinatura/implantação/período)", now.versions.every((v) => !v.accepts_one_time && !v.accepts_recurring && !v.has_initial_implementation) && now.counts.periods === 0);
  check("P13", "nenhuma classificação foi preenchida (pilar, categoria, 4F)", now.products.every((p) => p.pillar_id == null && p.category_id == null) && now.counts.productFourF === 0);
  check("P14", "nenhum campo comercial estruturado preenchido", newCols.every((v) => !v.scope && !v.target_audience && !v.commercial_objective && !v.client_info && !v.internal_notes && !v.included_items_json && !v.excluded_items_json && !v.client_requirements_json && !v.deliverables_summary_json && !v.change_policy && !v.results_disclaimer));
  check("P15", "nenhum adicional, variação, condição, cotação, dependência ou entregável de produto", now.counts.addons + now.counts.variations + now.counts.conditions + now.counts.quotes + now.counts.dependencyRules + now.counts.deliverables === 0);
  check("P16", "V1 idêntica ao backup (título, descrições, prazo, modalidades)", sha(now.versions.map((v) => [v.id, v.product_id, v.version_number, v.state, v.title, v.summary, v.full_description, v.base_commercial_deadline_days, v.accepts_one_time, v.accepts_recurring])) === sha(before.versions.map((v) => [v.id, v.product_id, v.version_number, v.state, v.title, v.summary, v.full_description, v.base_commercial_deadline_days, v.accepts_one_time, v.accepts_recurring])));

  // catálogo do cliente: nenhum dos 36 aparece nem pode ser aberto/contratado
  let apiDetail: unknown = "API local indisponível";
  try {
    const u = await main.user.findFirst({ where: { account_type: "empresas", is_active: true }, select: { id: true, email: true, role: true, account_type: true } });
    const secret = process.env.JWT_SECRET ?? "local-development-secret";
    const token = jwt.sign({ id: u!.id, email: u!.email, role: u!.role, account_type: u!.account_type }, secret, { expiresIn: "10m" });
    const h = { authorization: `Bearer ${token}` };
    const list = await (await fetch(`${apiBase}/api/catalog2/products?limit=500`, { headers: h })).json() as { data?: { id: string }[] } | { id: string }[];
    const rows = Array.isArray(list) ? list : list.data ?? [];
    const ids = new Set(now.products.map((p) => p.id));
    const visible = rows.filter((r) => ids.has(r.id)).length;
    check("P17", "nenhum dos 36 aparece no catálogo do cliente", visible === 0, { visible_entre_os_36: visible, total_no_catalogo: rows.length });
    let opened = 0;
    for (const p of now.products) { const r = await fetch(`${apiBase}/api/catalog2/products/${p.id}`, { headers: h }); if (r.status === 200) opened++; }
    check("P18", "nenhum dos 36 pode ser aberto/contratado pelo cliente (404)", opened === 0, { abertos: opened });
    apiDetail = "ok";
  } catch (e) { check("P17", "catálogo do cliente verificado pela API local", false, String((e as Error).message)); }

  // cadastros globais
  check("G1", "107 modelos de tarefa preservados", now.taskModels.length === 107, now.taskModels.length);
  check("G2", "109 modelos de etapa preservados", now.stepModels.length === 109, now.stepModels.length);
  check("G3", "mesmos IDs de modelos de tarefa e etapa", sha(now.taskModels.map((m) => m.id)) === sha(before.taskModels.map((m) => m.id)) && sha(now.stepModels.map((m) => m.id)) === sha(before.stepModels.map((m) => m.id)));
  const th = sha(now.taskModels), thb = sha(before.taskModels), sh = sha(now.stepModels), shb = sha(before.stepModels);
  check("G4", "mesmos hashes funcionais dos modelos de tarefa", th === thb, { atual: th, backup: thb });
  check("G5", "mesmos hashes funcionais dos modelos de etapa", sh === shb, { atual: sh, backup: shb });
  check("G6", "especialidades, pilares, categorias, 4F e precificação inalterados", sha([now.specialties, now.pillars, now.categories, now.fourF, now.pricing]) === sha([before.specialties, before.pillars, before.categories, before.fourF, before.pricing]));
  check("G7", "questionários e perguntas inalterados (nenhum de teste a mais)", sha(now.questionnaires) === sha(before.questionnaires), { atual: now.questionnaires.length, backup: before.questionnaires.length });
  const nonSystemProfiles = await main.catalog2AIProfile.count({ where: { is_system: false } });
  const nonSystemProfilesBefore = await base.catalog2AIProfile.count() // o backup é anterior à coluna is_system: qualquer perfil nele seria de produto;
  check("G8", "perfis de IA definitivos continuam em zero (nenhum perfil de teste restou; só o perfil de sistema do orientador de conexões pode existir)", nonSystemProfiles === 0 && nonSystemProfilesBefore === 0, nonSystemProfiles);
  const stray = await main.catalog2ModelAction.count({ where: { NOT: { client_action_id: { startsWith: "__lock__" } } } });
  check("G9", "nenhuma criação acidental de modelo (registro de criações de modelo vazio)", stray === 0, stray);

  // ── Módulo "Conexões e acessos necessários" (opcional): nada pode ter sido preenchido nos 36 produtos ──
  const conn = {
    requires: await main.catalog2ProductVersion.count({ where: { requires_connections: true } }),
    requirements: await main.catalog2ConnectionRequirement.count(),
    dependencies: await main.catalog2ConnectionDependency.count(),
    clientConnections: await main.clientConnection.count(),
    secrets: await main.connectionSecret.count(),
    pcr: await main.projectConnectionRequirement.count(),
    rules: await main.projectDependencyRule.count({ where: { target_kind: "connection" } }),
    choices: await main.connectionQuoteChoice.count(),
    types: await main.connectionType.count(),
  };
  check("C1", "o módulo de conexões está disponível mas DESATIVADO em todas as versões dos 36 produtos", conn.requires === 0, conn.requires);
  check("C2", "nenhum dos 36 produtos recebeu exigência de conexão (nem dependência de tarefa/etapa)", conn.requirements === 0 && conn.dependencies === 0, { exigencias: conn.requirements, dependencias: conn.dependencies });
  check("C3", "nenhuma conexão, segredo, exigência de contratação, regra de dependência ou escolha de cotação foi criada automaticamente", conn.clientConnections + conn.secrets + conn.pcr + conn.rules + conn.choices === 0, conn);
  check("C4", "catálogo global de tipos de conexão disponível (21 tipos iniciais)", conn.types >= 21, conn.types);
  const sysProfiles = await main.catalog2AIProfile.findMany({ where: { is_system: true }, select: { id: true, purpose: true, requires_human_review: true } });
  const linked = sysProfiles.length ? await main.catalog2TaskAI.count({ where: { profile_id: { in: sysProfiles.map((p) => p.id) } } }) : 0;
  check("C5", "o perfil de IA de QA (orientador de conexões) existe no máximo uma vez, exige revisão humana e NÃO está vinculado a nenhuma tarefa de produto oficial", sysProfiles.length <= 1 && sysProfiles.every((p) => p.purpose === "connections_orchestration" && p.requires_human_review) && linked === 0, { perfis_de_sistema: sysProfiles.length, vinculos: linked });

  const ok = checks.every((c) => c.ok);
  const result = { generated_at: new Date().toISOString(), baseline: "backup restaurado em base descartável", api: apiDetail, all_ok: ok, checks };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "integridade-36-produtos.json"), JSON.stringify(result, null, 2));
  const md = [`# Integridade dos 36 produtos e dos cadastros globais`, `Gerado em ${result.generated_at} — comparação: base principal × backup restaurado.`, "", `**Resultado geral: ${ok ? "APROVADO" : "REPROVADO"}**`, "", "| ID | Verificação | Resultado |", "|---|---|---|", ...checks.map((c) => `| ${c.id} | ${c.description} | ${c.ok ? "✅" : "❌"} ${c.detail !== undefined && !c.ok ? "`" + JSON.stringify(c.detail) + "`" : ""} |`)].join("\n");
  fs.writeFileSync(path.join(outDir, "integridade-36-produtos.md"), md);
  console.log(md);
  await main.$disconnect(); await base.$disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

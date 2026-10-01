// Semeia uma base DESCARTÁVEL (allka_visual_eval) com dois produtos de demonstração para a validação visual das telas:
//   A) "[VISUAL] Produto publicado e ativo" — para as telas do cliente, do simulador e das tarefas contratadas;
//   B) "[VISUAL] Produto em edição" — rascunho completo, para os diálogos de publicar / publicar e ativar.
// Recusa rodar em qualquer outra base. Nunca toca os 36 produtos reais.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../src/lib/prisma";
import { publishVersion } from "../src/lib/catalog2-service";

if (!String(process.env.DATABASE_URL).includes("allka_visual_eval")) throw new Error("Só roda na base descartável allka_visual_eval.");
const API = process.env.VISUAL_API ?? "http://localhost:3011";
const uid = () => crypto.randomBytes(3).toString("hex");

async function api(path: string, token: string, method = "GET", body?: unknown) {
  const r = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) as any };
}

async function build(name: string, publish: boolean) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  const redator = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "redator" } });
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const profile = await prisma.catalog2AIProfile.findFirst({ where: { name: "[VISUAL] Redator Gemini" } })
    ?? await prisma.catalog2AIProfile.create({ data: { name: "[VISUAL] Redator Gemini", provider: "gemini", model: "gemini-2.5-flash", base_instructions: "Escreva em tom profissional e direto.", unit_cost_input_per_1k: 0.01, unit_cost_output_per_1k: 0.04, input_format: "Texto livre do briefing", output_format: "Até 3 parágrafos" } });
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) }, update: {} });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await prisma.catalog2Specialty.update({ where: { id: redator.id }, data: { max_hourly_rate: 80 } });
  const questionnaire = await prisma.catalog2Questionnaire.create({ data: { name: `[VISUAL] Briefing completo ${uid()}` } });
  const qs: [string, string, string, Record<string, unknown>][] = [
    ["curto", "Nome da marca", "texto_curto", {}], ["longo", "Conte sobre o negócio", "texto_longo", {}], ["num", "Quantos produtos vende?", "numero", { validation_json: JSON.stringify({ min: 1, max: 500 }) }],
    ["valor", "Verba mensal para anúncios", "moeda", { validation_json: JSON.stringify({ min: 100 }) }], ["dia", "Data de lançamento", "data", {}], ["sn", "Já anuncia hoje?", "sim_nao", {}],
    ["unica", "Objetivo principal", "selecao_unica", { options_json: JSON.stringify([{ value: "vendas", label: "Vendas" }, { value: "leads", label: "Leads" }]) }],
    ["varias", "Canais desejados", "selecao_multipla", { options_json: JSON.stringify([{ value: "google", label: "Google" }, { value: "meta", label: "Meta" }]) }],
    ["link", "Site da empresa", "url", {}], ["mail", "E-mail de contato", "email", {}], ["fone", "Telefone com DDD", "telefone", {}],
    ["anexo", "Logotipo e materiais", "arquivo", { validation_json: JSON.stringify({ max_files: 3, max_size_mb: 10 }) }], ["ativo", "Conta de anúncios", "acesso_ativo", {}],
  ];
  let i = 0;
  for (const [key, label, type, extra] of qs) await prisma.catalog2QuestionnaireQuestion.create({ data: { questionnaire_id: questionnaire.id, key, label, is_required: false, sort_order: ++i, question_type: type, help_text: `Ajuda: ${label}`, ...extra } });
  const slug = `visual-${uid()}`;
  const product = await prisma.catalog2Product.create({ data: { slug, internal_name: `[VISUAL] ${name}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", delivery_recurrence: "mensal", four_f: { create: [{ four_f_id: fourF.id }] } } });
  const step = (k: string, n: string, sp: string) => ({ key: k, name: n, sort_order: 1, specialty_id: sp, estimated_minutes: 60 });
  const version = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: name, summary: "Resumo curto do produto de demonstração.", full_description: "Descrição completa do produto de demonstração, usada só para validar as telas.",
      base_commercial_deadline_days: 10, accepts_one_time: true, accepts_recurring: true, has_initial_implementation: true, implementation_rule: "first_only", implementation_blocks_operation: false,
      target_audience: "Pequenas empresas que vendem online", commercial_objective: "Organizar a operação de anúncios", scope: "Configuração e rotina mensal de campanhas.",
      included_items_json: JSON.stringify(["Configuração de contas", "Relatório mensal"]), excluded_items_json: JSON.stringify(["Verba de mídia"]), client_requirements_json: JSON.stringify(["Ter conta de anúncios ativa"]),
      client_info: "Acessos às contas e materiais da marca.", internal_notes: "Observação interna: margem apertada.", results_disclaimer: "Resultados dependem do mercado.", change_policy: "Alterações de escopo geram novo orçamento.",
      tasks: { create: [
        { key: "implantacao", name: "Implantação inicial", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 120, sort_order: 1, cycle_type: "implementacao", requires_client_approval: true, steps: { create: [step("s1", "Configurar contas", spec.id)] } },
        { key: "rotina", name: "Rotina mensal de campanhas", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 2, cycle_type: "recorrente", requires_client_approval: true, questionnaire_id: questionnaire.id, steps: { create: [step("s1", "Ajustar campanhas", spec.id)] } },
        { key: "publicar", name: "Publicar relatório", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 30, sort_order: 3, cycle_type: "recorrente", steps: { create: [step("s1", "Enviar relatório", spec.id)] } },
        { key: "redacao_ia", name: "Texto dos anúncios (IA)", execution_mode: "ia", specialty_id: redator.id, estimated_minutes: 30, sort_order: 4, cycle_type: "recorrente", steps: { create: [step("s1", "Gerar texto", redator.id)] }, ai: { create: { profile_id: profile.id, ai_mode: "rascunho", instructions: "Escreva três variações de anúncio.", human_review_required: true, est_input_tokens: 800, est_output_tokens: 400, est_review_rounds: 1 } } },
      ] },
      addons: { create: [
        { key: "setup", name: "Auditoria inicial", base_cost: 100, charge_scope: "one_time" }, { key: "mensal", name: "Relatório extra", base_cost: 40, charge_scope: "recurring" },
        { key: "janela", name: "Reforço de 2 meses", base_cost: 20, charge_scope: "per_cycle", charge_start_cycle: 1, charge_end_cycle: 2 }, { key: "qtd", name: "Peças extras", base_cost: 10, charge_scope: "per_quantity", charge_quantity: 3 },
      ] },
      variations: { create: [{ key: "porte", name: "Porte da conta", is_required: true, selection_type: "single", options: { create: [
        { key: "basico", label: "Básico", is_default: true },
        { key: "plus", label: "Plus", effects: { create: [{ effect_type: "add_fixed_amount", effect_value: "60", charge_scope: "recurring" }, { effect_type: "add_fixed_amount", effect_value: "30", charge_scope: "one_time" }] } },
      ] } }] },
      conditions: { create: [{ key: "cond_plus", name: "Plus exige verba extra", trigger_source: "variation_option", trigger_ref: "plus", operator: "selected", effect_type: "add_fixed_amount", effect_value: "25", charge_scope: "per_cycle", charge_start_cycle: 0, charge_end_cycle: 3, explanation: "Se escolher Plus, soma R$ 25 nos 4 primeiros ciclos." }] },
    },
    include: { tasks: true },
  });
  const rotina = version.tasks.find((t) => t.key === "rotina")!;
  await prisma.catalog2TaskDeliverable.create({ data: { task_id: rotina.id, key: "arte-final", name: "Relatório aprovado", type: "link", responsible: "executor", is_required: true } });
  await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: {} });
  await prisma.catalog2DependencyRule.create({ data: { dependent_product_id: product.id, dependent_task_key: "publicar", target_kind: "deliverable", target_product_id: product.id, target_task_key: "rotina", target_deliverable_key: "arte-final", behavior: "block_start", note: "O relatório só é publicado depois de aprovado." } });
  if (publish) await publishVersion(version.id, "system", { activate: true, changeSummary: "publicação de demonstração visual" });
  return { product, versionId: version.id };
}

(async () => {
  const A = await build("Produto publicado e ativo", true);
  const B = await build("Produto em edição", false);
  // cliente + compra do produto A (mensal) para as telas de tarefas, dependências e entregáveis
  const company = await prisma.company.create({ data: { name: "[VISUAL] Empresa Demo", status: "ativo" } });
  const cid = `visual-co-${uid()}`;
  const cu = await prisma.user.create({ data: { id: cid, email: `${cid}@example.test`, password_hash: "x", name: "Cliente Visual", role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: company.id } });
  const secret = process.env.JWT_SECRET ?? "local-development-secret";
  const sign = (u: { id: string; email: string; role: string; account_type: string }) => jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, secret, { expiresIn: "6h" });
  const ctoken = sign(cu);
  const sel = { variation_option_keys: ["plus"], addon_keys: ["setup", "mensal"], quantity: 1, answers: {} };
  const q = await api("/api/catalog2/quotes", ctoken, "POST", { product: A.product.id, selection: sel, period: "mensal" });
  if (q.status !== 201) throw new Error("cotação falhou: " + JSON.stringify(q.json));
  const co = await api("/api/catalog2/checkout", ctoken, "POST", { quote_ids: [q.json.id], checkout_client_action_id: crypto.randomUUID() });
  if (co.status !== 201) throw new Error("checkout falhou: " + JSON.stringify(co.json));
  const pay = await api("/api/payments/fake-checkout", ctoken, "POST", { project_id: co.json.project.id });
  if (pay.status !== 201) throw new Error("pagamento falhou: " + JSON.stringify(pay.json));
  const tasks = await prisma.projectTask.findMany({ where: { project_id: co.json.project.id }, select: { id: true, title: true, status: true, catalog2_task: { select: { key: true } } } });
  const admin = await prisma.user.findFirstOrThrow({ where: { email: "cp@lamego.com.vc" } });
  const out = { productA: A.product.id, versionA: A.versionId, productB: B.product.id, versionB: B.versionId, company_user: { id: cu.id, email: cu.email, role: cu.role, account_type: cu.account_type }, admin: { id: admin.id, email: admin.email, role: admin.role, account_type: admin.account_type }, project_id: co.json.project.id, tasks };
  console.log("SEED_OK " + JSON.stringify(out));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

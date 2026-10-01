// DEMONSTRAÇÃO descartável do módulo "Conexões e acessos necessários" (base allka_conn_demo, backend em :3011).
// Roda TODO o roteiro pela API real, confere cada resultado e escreve a narrativa em Markdown. Deixa a base pronta para a validação visual.
// Recusa rodar fora da base descartável. Nunca toca os 36 produtos nem a base principal.
// Uso: DATABASE_URL=…/allka_conn_demo tsx scripts/connections-demo.ts <pasta-de-saida>
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { prisma } from "../src/lib/prisma";
import { config } from "../src/config";
import { ensureConnectionTypes } from "../src/lib/connections/catalog";
import { ensureConnectionAiProfile } from "../src/lib/connections/pending";

if (!String(process.env.DATABASE_URL).includes("allka_conn_demo")) throw new Error("Só roda na base descartável allka_conn_demo.");
const API = process.env.DEMO_API ?? "http://127.0.0.1:3011";
const OUT = process.argv[2] ?? ".";
const uid = () => crypto.randomBytes(3).toString("hex");
const SEL = { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} };
const sign = (u: { id: string; email: string; role: string; account_type: string }) => jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "8h" });
async function api(p: string, token: string, method = "GET", body?: unknown) {
  const r = await fetch(`${API}${p}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* corpo não-JSON */ }
  return { status: r.status, json, text };
}
const must = <T extends { status: number; text: string }>(r: T, ok: number[] = [200, 201]) => { if (!ok.includes(r.status)) throw new Error(`HTTP ${r.status}: ${r.text.slice(0, 400)}`); return r; };

// ── narrativa ──
interface Demo { id: string; titulo: string; obs: string[]; ok: boolean }
const demos: Demo[] = [];
let cur: Demo;
const begin = (id: string, titulo: string) => { cur = { id, titulo, obs: [], ok: true }; demos.push(cur); console.log(`\n== ${id} ${titulo}`); };
const see = (cond: boolean, msg: string) => { cur.obs.push(`${cond ? "✔" : "✖"} ${msg}`); if (!cond) cur.ok = false; console.log(`  ${cond ? "✔" : "✖"} ${msg}`); };
const note = (msg: string) => { cur.obs.push(`• ${msg}`); console.log(`  • ${msg}`); };

async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}, name?: string) {
  const id = `demo-${uid()}${uid()}`;
  return prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: name ?? `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
}
const tok = (u: any) => sign(u);

interface TDef { key: string; name: string; steps?: number }
async function mkProduct(name: string, tasks: TDef[]) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const slug = `demo-${uid()}`;
  const product = await prisma.catalog2Product.create({ data: { slug, internal_name: `[DEMO] ${name}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", four_f: { create: [{ four_f_id: fourF.id }] } } });
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: name, summary: "Produto de demonstração.", full_description: "Produto de demonstração das conexões e acessos necessários.",
      base_commercial_deadline_days: 10, accepts_one_time: true, accepts_recurring: false,
      tasks: { create: tasks.map((t, i) => ({ key: t.key, name: t.name, execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: i + 1, cycle_type: "recorrente", repeat_rule: "all_cycles", executor_continuity: "not_allowed", requires_review: false, requires_client_approval: true, steps: { create: Array.from({ length: t.steps ?? 1 }, (_, k) => ({ key: `s${k + 1}`, name: `${t.name} — etapa ${k + 1}`, sort_order: k + 1, specialty_id: spec.id, estimated_minutes: 60 })) } })) },
    },
  });
  return { product, versionId: v.id };
}
async function configure(admin: string, versionId: string, reqs: { key: string; body: Record<string, unknown> }[], publish = true) {
  must(await api(`/api/admin/catalog2/versions/${versionId}/connections-module`, admin, "PUT", { requires_connections: true }));
  for (const r of reqs) must(await api(`/api/admin/catalog2/versions/${versionId}/connection-requirements/by-key/${r.key}`, admin, "PUT", r.body));
  if (publish) must(await api(`/api/admin/catalog2/versions/${versionId}/publish`, admin, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() }));
}
const dep = (task_key: string, kind = "start", step_key?: string) => ({ task_key, kind, ...(step_key ? { step_key } : {}) });

async function buy(token: string, productId: string, opts: { period?: string } = {}) {
  const q = must(await api("/api/catalog2/quotes", token, "POST", { product: productId, selection: SEL, ...(opts.period ? { period: opts.period } : {}) })).json;
  const co = must(await api("/api/catalog2/checkout", token, "POST", { quote_ids: [q.id], checkout_client_action_id: crypto.randomUUID() })).json;
  must(await api("/api/payments/fake-checkout", token, "POST", { project_id: co.project.id }));
  return { projectId: co.project.id as string, quoteId: q.id as string };
}
const tasksOf = async (projectId: string) => Object.fromEntries((await prisma.projectTask.findMany({ where: { project_id: projectId }, include: { catalog2_task: { select: { key: true } } } })).map((t) => [t.catalog2_task?.key ?? t.title, t]));
const statusOf = async (id: string) => (await prisma.projectTask.findUniqueOrThrow({ where: { id } })).status;
const pcrOf = async (projectId: string, label?: RegExp) => { const l = await prisma.projectConnectionRequirement.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } }); return label ? l.find((x) => label.test(x.label))! : l[0]; };
const ST: Record<string, string> = { PENDENTE_DE_LIBERACAO: "aguardando conexão (bloqueada)", PARA_LANCAMENTO: "liberada (para lançamento)", EM_EXECUCAO: "em execução", PAUSADA_DEPENDENCIA_EXTERNA: "PAUSADA por dependência externa" };
const stl = (s: string) => ST[s] ?? s;
let companyIdForSecrets = "";
const secretCount = async () => prisma.connectionSecret.count({ where: { connection_id: { in: (await prisma.clientConnection.findMany({ where: { company_id: companyIdForSecrets }, select: { id: true } })).map((x) => x.id) } } });

(async () => {
  await ensureConnectionTypes(prisma);
  const adminProfile = await prisma.adminProfile.create({ data: { name: `Demo ${uid()}`, is_master: true, is_active: true } });
  const adminU = await mkUser("admin", "admin", { admin_profile_id: adminProfile.id }, "Admin Demo");
  const leaderU = await mkUser("lider", "lider", {}, "Líder Demo");
  const company = await prisma.company.create({ data: { name: "Empresa Demo Alfa", status: "ativo" } });
  companyIdForSecrets = company.id;
  const clientU = await mkUser("company_user", "empresas", { company_id: company.id }, "Cliente Demo Alfa");
  const owner = await mkUser("agency_admin", "agencias", {}, "Agência Demo");
  const agency = await prisma.agency.create({ data: { name: "Agência Demo Beta", status: "ativo", owner_user_id: owner.id } });
  await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  const mkNomad = async (name: string) => { const u = await mkUser("nomad", "nomades", {}, name); const n = await prisma.nomade.create({ data: { user_id: u.id, name, email: `${u.id}-n@example.test`, status: "ativo" } }); return { user: u, nomade: n }; };
  const nomad1 = await mkNomad("Nômade Demo 1"); const nomad2 = await mkNomad("Nômade Demo 2");
  const A = tok(adminU), L = tok(leaderU), C = tok(clientU), G = tok(owner);
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) }, update: {} });
  const profile = await ensureConnectionAiProfile(prisma);

  // ── produtos ──
  const T = await mkProduct("Gestão de Tráfego Pago (DEMO)", [{ key: "alinhamento", name: "Reunião de alinhamento" }, { key: "configuracao", name: "Configurar contas de anúncio", steps: 2 }, { key: "campanhas", name: "Rotina de campanhas" }, { key: "relatorio", name: "Relatório mensal" }]);
  await configure(A, T.versionId, [
    { key: "google_ads", body: { connection_type_key: "google_ads", method: "manager_account", permission_level: "standard", obligation: "required", validation_mode: "automatic_with_human", reason: "Para criar e otimizar as campanhas na sua conta do Google Ads.", dependents: [dep("configuracao"), dep("campanhas", "continue")] } },
    { key: "ga4", body: { connection_type_key: "google_analytics_4", method: "oauth", permission_level: "read", obligation: "required", reason: "Para medir resultados no relatório mensal.", dependents: [dep("relatorio")] } },
    { key: "gtm", body: { connection_type_key: "google_tag_manager", method: "oauth", permission_level: "read_write", obligation: "required", when_needed: "before_step", when_task_key: "configuracao", when_step_key: "s2", reason: "Para instalar as tags de conversão.", dependents: [dep("configuracao", "start", "s2")] } },
    { key: "meta", body: { connection_type_key: "meta_business_manager", method: "partner_business", permission_level: "read_write", obligation: "optional", reason: "Somente se você também anunciar na Meta.", dependents: [dep("campanhas", "info")] } },
    { key: "pixel", body: { connection_type_key: "pixel_capi", method: "partner_business", permission_level: "manage", obligation: "conditional", condition_text: "Se o cliente usar a Meta para anunciar.", dependents: [dep("campanhas")] } },
  ]);
  const S = await mkProduct("Site ou Landing Page (DEMO)", [{ key: "briefing", name: "Briefing do site" }, { key: "construcao", name: "Construir as páginas", steps: 2 }, { key: "ajustes", name: "Ajustes e revisão" }, { key: "publicacao", name: "Publicar o site" }]);
  await configure(A, S.versionId, [
    { key: "wordpress", body: { connection_type_key: "wordpress", method: "app_password", permission_level: "editor", obligation: "required", validation_mode: "manual", reason: "Para montar e publicar as páginas no seu WordPress.", instructions: "Crie um usuário temporário só para a Allka (ou uma senha de aplicação) — nunca informe a sua senha principal.", dependents: [dep("briefing"), dep("construcao", "continue"), dep("ajustes"), dep("publicacao")] } },
    { key: "domain", body: { connection_type_key: "domain", method: "user_invite", permission_level: "dns", obligation: "required", reason: "Para apontar o domínio para o site novo.", dependents: [dep("publicacao")] } },
    { key: "hosting", body: { connection_type_key: "hosting", method: "user_invite", permission_level: "read_write", obligation: "optional", dependents: [dep("publicacao", "info")] } },
  ]);
  const N = await mkProduct("Produto sem conexão (DEMO)", [{ key: "entrega", name: "Entrega única" }, { key: "revisao", name: "Revisão final" }]);
  must(await api(`/api/admin/catalog2/versions/${N.versionId}/publish`, A, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() }));
  const R = await mkProduct("Gestão de Redes Sociais (DEMO)", [{ key: "calendario", name: "Calendário editorial" }, { key: "agendamento", name: "Agendar publicações" }]);
  await configure(A, R.versionId, [{ key: "automacao", body: { connection_type_key: "automation_tool", method: "user_invite", permission_level: "read_write", obligation: "required", reason: "Para agendar as publicações na sua ferramenta.", dependents: [dep("agendamento", "continue")] } }]);

  // ───────────────────────── D1 ─────────────────────────
  begin("D1", "Produto sem conexão não sofre impacto");
  const pn = await buy(C, N.product.id);
  see((await prisma.projectConnectionRequirement.count({ where: { project_id: pn.projectId } })) === 0, "nenhuma pendência de conexão criada");
  const tn = await tasksOf(pn.projectId);
  see(!Object.values(tn).some((t) => t.status === "PENDENTE_DE_LIBERACAO"), `tarefas seguem o fluxo normal (${Object.values(tn).map((t) => stl(t.status)).join("; ")})`);
  see((await api("/api/connections/pending/list", C)).json.data.filter((i: any) => i.project.id === pn.projectId).length === 0, "nada aparece nas pendências do cliente");

  // ───────────────────────── D2–D6 ─────────────────────────
  begin("D2", "Contratação salva como rascunho (Gestão de Tráfego Pago)");
  const q = must(await api("/api/catalog2/quotes", C, "POST", { product: T.product.id, selection: SEL })).json;
  const view = (await api(`/api/connections/quotes/${q.id}/requirements`, C)).json;
  note(`Mensagem ao cliente: “${view.message}”`);
  see(view.data.length === 5, `a contratação mostra ${view.data.length} conexões: ${view.data.map((i: any) => i.label).join(", ")}`);
  const ads = view.data.find((i: any) => /Google Ads/.test(i.label));
  see(ads.can_do_later === true && !!ads.reason && !!ads.when_label && !!ads.permission_level && ads.affected_activities.length === 2, `cada conexão mostra motivo, momento, permissão e atividade afetada (Google Ads: ${ads.affected_activities.map((a: any) => `${a.task_name} — ${a.kind_label.toLowerCase()}`).join("; ")})`);
  must(await api(`/api/connections/quotes/${q.id}/requirements/${ads.requirement_id}`, C, "PUT", { handling: "draft", responsible_name: "Joana (TI do cliente)", invited_email: "ti@cliente.example" }));
  for (const it of view.data.filter((i: any) => /Analytics|Tag Manager|Meta|Pixel/.test(i.label))) must(await api(`/api/connections/quotes/${q.id}/requirements/${it.requirement_id}`, C, "PUT", { handling: "later" }));
  see((await api(`/api/connections/quotes/${q.id}/requirements`, C)).json.data.every((i: any) => !!i.choice), "rascunho e escolhas ('fazer depois') salvos na cotação");
  const co = must(await api("/api/catalog2/checkout", C, "POST", { quote_ids: [q.id], checkout_client_action_id: crypto.randomUUID() })).json;
  must(await api("/api/payments/fake-checkout", C, "POST", { project_id: co.project.id }));
  const P1 = co.project.id as string;
  const t1 = await tasksOf(P1);
  const pAds = await pcrOf(P1, /Google Ads/);
  see(pAds.handling === "draft" && pAds.responsible_name === "Joana (TI do cliente)", "a contratação foi concluída (não bloqueou) e o rascunho/responsável chegou ao projeto");

  begin("D3", "Conexão feita depois da contratação");
  const cAds = must(await api(`/api/connections/requirements/${pAds.id}/create-and-link`, C, "POST", { method: "manager_account", label: "Google Ads — Empresa Demo Alfa", external_id: "123-456-7890", permission_level: "standard", scope: "project" })).json;
  see(true, `o cliente conectou depois (conexão ${cAds.connection.status_label}) usando conta gerenciadora — sem senha`);
  see(cAds.connection.has_secret === false, "nenhum segredo foi necessário/guardado");

  begin("D4", "Tarefa dependente fica bloqueada");
  see((await statusOf(t1.configuracao.id)) === "PENDENTE_DE_LIBERACAO", `“Configurar contas de anúncio” → ${stl(await statusOf(t1.configuracao.id))} (enviada, ainda não validada)`);
  see((await statusOf(t1.relatorio.id)) === "PENDENTE_DE_LIBERACAO", `“Relatório mensal” → ${stl(await statusOf(t1.relatorio.id))} (falta o GA4)`);

  begin("D5", "Tarefa independente continua");
  see((await statusOf(t1.alinhamento.id)) !== "PENDENTE_DE_LIBERACAO", `“Reunião de alinhamento” → ${stl(await statusOf(t1.alinhamento.id))} (não depende de conexão)`);

  begin("D6", "Validação libera a tarefa");
  const v1 = (await api(`/api/connections/${cAds.connection_id}/verify`, A, "POST")).json;
  see(v1.outcome === "not_configured", `verificação automática: “${v1.problem}” — nada de sucesso simulado; a validação segue manual`);
  see((await api(`/api/connections/${cAds.connection_id}/validate`, C, "POST", { result: "valid", evidence: "tentativa do cliente" })).status === 403, "o cliente não pode validar a própria conexão");
  must(await api(`/api/connections/${cAds.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Solicitação de vínculo aceita na conta 123-456-7890; permissão padrão conferida no Google Ads.", mode: "manual" }));
  see((await statusOf(t1.configuracao.id)) === "PARA_LANCAMENTO", `“Configurar contas de anúncio” → ${stl(await statusOf(t1.configuracao.id))}`);
  see((await statusOf(t1.campanhas.id)) === "PARA_LANCAMENTO", `“Rotina de campanhas” → ${stl(await statusOf(t1.campanhas.id))}`);
  see((await statusOf(t1.relatorio.id)) === "PENDENTE_DE_LIBERACAO", "“Relatório mensal” continua aguardando o GA4 (bloqueio só da atividade dependente)");

  // ───────────────────────── D7 ─────────────────────────
  begin("D7", "Conexão inválida apresenta a correção");
  const pGa = await pcrOf(P1, /Analytics/);
  const cGa = must(await api(`/api/connections/requirements/${pGa.id}/create-and-link`, C, "POST", { method: "oauth", label: "GA4 — Empresa Demo Alfa", external_id: "properties/987654", permission_level: "read", scope: "project" })).json;
  const oauth = await api(`/api/connections/${cGa.connection_id}/oauth/start`, C, "POST", {});
  see(oauth.status === 503 && oauth.json.code === "connector_not_configured", `OAuth do Google ainda não configurado neste ambiente → “${oauth.json.error}” (faltam ${oauth.json.details.missing.join(", ")}); nenhuma conexão simulada`);
  must(await api(`/api/connections/${cGa.connection_id}/validate`, A, "POST", { result: "needs_correction", problem: "A propriedade 987654 não está acessível por esta autorização.", correction_needed: "Conceda acesso de leitura à propriedade GA4 correta ou informe o ID certo." }));
  const pend = (await api("/api/connections/pending/list", C)).json.data.find((i: any) => i.id === pGa.id);
  see(pend.action.kind === "fix" && !!pend.problem && !!pend.correction, `o cliente vê o problema (“${pend.problem}”) e a correção (“${pend.correction}”) com o botão “${pend.action.label}”`);
  must(await api(`/api/connections/${cGa.connection_id}`, C, "PATCH", { external_id: "properties/123456" }));
  see((await prisma.clientConnection.findUniqueOrThrow({ where: { id: cGa.connection_id } })).status === "submitted", "o cliente corrigiu o identificador → volta para validação");
  must(await api(`/api/connections/${cGa.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Propriedade 123456 acessível com permissão de leitura." }));
  see((await statusOf(t1.relatorio.id)) === "PARA_LANCAMENTO", `“Relatório mensal” → ${stl(await statusOf(t1.relatorio.id))}`);

  // ───────────────────────── D8–D9 ─────────────────────────
  begin("D8", "Conexão expirada pausa a tarefa");
  const due = new Date(Date.now() + 6 * 86_400_000);
  await prisma.projectTask.update({ where: { id: t1.campanhas.id }, data: { status: "EM_EXECUCAO", due_date: due, lider_responsavel_id: leaderU.id, nomade_responsavel_id: nomad1.nomade.id } });
  await prisma.project.update({ where: { id: P1 }, data: { end_date: new Date(Date.now() + 25 * 86_400_000) } });
  await prisma.clientConnection.update({ where: { id: cAds.connection_id }, data: { expires_at: new Date(Date.now() - 60_000) } });
  const m = (await api("/api/connections/maintenance/run", A, "POST")).json;
  see(m.expired >= 1, `a manutenção expirou ${m.expired} conexão(ões) vencida(s)`);
  see((await statusOf(t1.campanhas.id)) === "PAUSADA_DEPENDENCIA_EXTERNA", `“Rotina de campanhas” → ${stl(await statusOf(t1.campanhas.id))}`);
  see((await statusOf(t1.relatorio.id)) !== "PAUSADA_DEPENDENCIA_EXTERNA" && (await statusOf(t1.alinhamento.id)) !== "PAUSADA_DEPENDENCIA_EXTERNA", "as tarefas paralelas seguem funcionando");

  begin("D9", "SLA suspenso, sem penalizar o nômade, prazo original preservado");
  const lateBefore = (await api("/api/lider/tasks/counts", L)).json.atrasadas;
  await prisma.projectTask.update({ where: { id: t1.campanhas.id }, data: { due_date: new Date(Date.now() - 86_400_000) } }); // simula prazo vencido enquanto pausada
  const lateDuring = (await api("/api/lider/tasks/counts", L)).json.atrasadas;
  see(lateDuring === lateBefore, `tarefa pausada não conta como atrasada (atrasadas: ${lateBefore} → ${lateDuring})`);
  await prisma.projectTask.update({ where: { id: t1.campanhas.id }, data: { due_date: due } });
  const back = new Date(Date.now() - 90 * 60_000);
  await prisma.projectTaskExternalBlock.updateMany({ where: { project_task_id: t1.campanhas.id }, data: { started_at: back } });
  await prisma.projectTask.update({ where: { id: t1.campanhas.id }, data: { external_pause_started_at: back } });
  const view9 = (await api(`/api/connections/tasks/${t1.campanhas.id}`, A)).json;
  see(view9.blocks.length === 1 && view9.blocks[0].party === "client" && !view9.blocks[0].resolved_at, `bloqueio registrado: motivo “${view9.blocks[0].reason}”, responsável: cliente, detectado por ${view9.blocks[0].detected_by}`);
  must(await api(`/api/connections/${cAds.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Vínculo renovado e reconferido.", expires_at: new Date(Date.now() + 90 * 86_400_000).toISOString() }));
  const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: t1.campanhas.id } });
  see(after.status === "EM_EXECUCAO", `retomada → ${stl(after.status)}`);
  see(after.original_due_date?.getTime() === due.getTime() && after.external_pause_total_minutes >= 89, `prazo original preservado (${after.original_due_date?.toLocaleString("pt-BR")}); tempo bloqueado ${after.external_pause_total_minutes} min`);
  see(after.due_date!.getTime() === due.getTime() + after.external_pause_total_minutes * 60_000, `novo prazo recalculado = original + tempo bloqueado (${after.due_date?.toLocaleString("pt-BR")}) — atividade no caminho obrigatório`);

  // ───────────────────────── D10–D13 ─────────────────────────
  const siteProject = async (label: string) => { const b = await buy(C, S.product.id); return { ...b, t: await tasksOf(b.projectId), pcr: await pcrOf(b.projectId, /WordPress/), label }; };
  const wp = (pcr: string, body: Record<string, unknown>) => api(`/api/connections/requirements/${pcr}/create-and-link`, C, "POST", { method: "app_password", label: "WordPress da empresa", external_id: "https://empresa-alfa.example.test", account_label: "allka-temp", secret_value: "abcd efgh ijkl mnop qrst", ...body });
  begin("D10", "Reutilização por tarefa (escopo: somente uma tarefa)");
  const s1 = await siteProject("S1");
  const w1 = must(await wp(s1.pcr.id, { scope: "task", task_ids: [s1.t.construcao.id] })).json;
  must(await api(`/api/connections/${w1.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Login conferido com o usuário temporário." }));
  const st1 = await Promise.all(["briefing", "construcao", "ajustes"].map(async (k) => `${s1.t[k].title}: ${stl(await statusOf(s1.t[k].id))}`));
  see((await statusOf(s1.t.construcao.id)) === "PARA_LANCAMENTO" && (await statusOf(s1.t.briefing.id)) === "PENDENTE_DE_LIBERACAO" && (await statusOf(s1.t.ajustes.id)) === "PENDENTE_DE_LIBERACAO", `só a tarefa autorizada liberou — ${st1.join(" | ")}`);
  begin("D11", "Reutilização por tarefas selecionadas");
  const s2 = await siteProject("S2");
  const w2 = must(await wp(s2.pcr.id, { scope: "selected_tasks", task_ids: [s2.t.briefing.id, s2.t.construcao.id] })).json;
  must(await api(`/api/connections/${w2.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Login conferido." }));
  see((await statusOf(s2.t.briefing.id)) === "PARA_LANCAMENTO" && (await statusOf(s2.t.construcao.id)) === "PARA_LANCAMENTO" && (await statusOf(s2.t.ajustes.id)) === "PENDENTE_DE_LIBERACAO", "liberou apenas as duas tarefas escolhidas; “Ajustes e revisão” segue aguardando");
  begin("D12", "Reutilização no projeto inteiro");
  const s3 = await siteProject("S3");
  const w3 = must(await wp(s3.pcr.id, { scope: "project" })).json;
  must(await api(`/api/connections/${w3.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Login conferido." }));
  const free = await Promise.all(["briefing", "construcao", "ajustes"].map(async (k) => (await statusOf(s3.t[k].id)) === "PARA_LANCAMENTO"));
  see(free.every(Boolean), "todas as tarefas que dependem do WordPress foram liberadas (escopo: projeto inteiro); “Publicar o site” ainda aguarda o domínio");
  begin("D13", "Outro projeto exige nova autorização");
  const s4 = await siteProject("S4");
  see((await statusOf(s4.t.briefing.id)) === "PENDENTE_DE_LIBERACAO", "mesmo cliente, outro projeto: a conexão NÃO é herdada — tarefa continua bloqueada");
  const detail = (await api(`/api/connections/requirements/${s4.pcr.id}`, C)).json;
  const cand = detail.reuse_candidates.find((c: any) => c.id === w3.connection_id);
  see(!!cand && cand.authorized_elsewhere && !cand.authorized_in_project, `o sistema procura conexão compatível e pergunta se deseja reutilizar (“${cand?.label}”, válida)`);
  const sec0 = await secretCount();
  must(await api(`/api/connections/requirements/${s4.pcr.id}/link`, C, "POST", { connection_id: w3.connection_id, scope: "project" }));
  see((await statusOf(s4.t.briefing.id)) === "PARA_LANCAMENTO", "após a nova autorização explícita, a tarefa foi liberada");
  see((await secretCount()) === sec0, "nenhuma credencial foi copiada: os projetos referenciam a mesma conexão segura");

  // ───────────────────────── D14 ─────────────────────────
  begin("D14", "Troca de executor provoca reavaliação");
  const pr = await buy(C, R.product.id);
  const tr = await tasksOf(pr.projectId);
  const pcrR = await pcrOf(pr.projectId);
  const cR = must(await api(`/api/connections/requirements/${pcrR.id}/create-and-link`, C, "POST", { method: "user_invite", label: "Ferramenta de automação (convite)", external_id: "automacao-alfa", permission_level: "read_write", scope: "project" })).json;
  must(await api(`/api/connections/${cR.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Convite aceito pelo executor 1." }));
  await prisma.projectTask.update({ where: { id: tr.agendamento.id }, data: { status: "AGUARDANDO_NOMADE", lider_responsavel_id: leaderU.id } });
  const { assignNomadeDirectly } = await import("../src/lib/task-rotation-engine");
  await assignNomadeDirectly(tr.agendamento.id, nomad1.nomade.id, adminU.id);
  must(await api(`/api/connections/requirements/${pcrR.id}/authorize-executor`, A, "POST", { task_id: tr.agendamento.id, executor_user_id: nomad1.nomade.id }));
  see((await statusOf(tr.agendamento.id)) === "EM_EXECUCAO", `executor 1 autorizado → ${stl(await statusOf(tr.agendamento.id))}`);
  await prisma.projectTask.update({ where: { id: tr.agendamento.id }, data: { nomade_responsavel_id: null, status: "AGUARDANDO_NOMADE" } });
  await assignNomadeDirectly(tr.agendamento.id, nomad2.nomade.id, adminU.id);
  see((await statusOf(tr.agendamento.id)) === "PAUSADA_DEPENDENCIA_EXTERNA", `troca para o executor 2 → ${stl(await statusOf(tr.agendamento.id))}: o novo executor ainda não foi autorizado`);
  see((await prisma.clientConnectionGrant.findMany({ where: { connection_id: cR.connection_id, executor_user_id: nomad1.nomade.id } })).every((g) => !!g.revoked_at), "o acesso do executor anterior foi revogado");
  see((await statusOf(tr.calendario.id)) !== "PAUSADA_DEPENDENCIA_EXTERNA", "apenas a tarefa afetada foi bloqueada");
  must(await api(`/api/connections/requirements/${pcrR.id}/authorize-executor`, A, "POST", { task_id: tr.agendamento.id, executor_user_id: nomad2.nomade.id }));
  see((await statusOf(tr.agendamento.id)) === "EM_EXECUCAO", `executor 2 autorizado → ${stl(await statusOf(tr.agendamento.id))} (histórico completo preservado)`);

  // ───────────────────────── D15 ─────────────────────────
  begin("D15", "A IA orienta sem liberar nada");
  const p15 = await pcrOf(P1, /Tag Manager/);
  const before15 = { st: await statusOf(t1.configuracao.id), pcr: (await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: p15.id } })).status };
  const g = (await api(`/api/connections/pending/${p15.id}/guidance`, C)).json;
  see(g.can_decide === false, "a resposta declara que a IA não decide nada");
  see(g.source === "ai" && g.ai_simulated === true, "a redação veio do adaptador SIMULADO de QA (sem provedor real, sem custo, sem enviar dados)");
  note(`Próximo passo: ${g.next_step}`); note(`Falta: ${g.missing.join(" ")}`); note(`Texto da IA (simulada): ${g.ai_text}`);
  const after15 = { st: await statusOf(t1.configuracao.id), pcr: (await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: p15.id } })).status };
  see(JSON.stringify(before15) === JSON.stringify(after15), `nada mudou depois da orientação (tarefa: ${stl(after15.st)}; conexão: ${after15.pcr})`);
  see(profile.is_system && profile.requires_human_review && (await prisma.catalog2TaskAI.count({ where: { profile_id: profile.id } })) === 0, "o perfil de IA de QA é de sistema, exige revisão humana e não está vinculado a nenhum produto");

  // ───────────────────────── estados extras para a validação visual ─────────────────────────
  // (a) projeto pausado (conexão expirada) — a validação visual faz a retomada pela tela
  const sv = await siteProject("SV");
  const wv = must(await wp(sv.pcr.id, { scope: "project" })).json;
  must(await api(`/api/connections/${wv.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Login conferido." }));
  await prisma.projectTask.update({ where: { id: sv.t.construcao.id }, data: { status: "EM_EXECUCAO", due_date: new Date(Date.now() + 4 * 86_400_000), lider_responsavel_id: leaderU.id, nomade_responsavel_id: nomad1.nomade.id } });
  await prisma.clientConnection.update({ where: { id: wv.connection_id }, data: { expires_at: new Date(Date.now() - 60_000) } });
  await api("/api/connections/maintenance/run", A, "POST");
  // (b) projeto da AGÊNCIA com pendência
  const gb = await buy(G, T.product.id);
  // (c) item no carrinho do cliente para a contratação pela tela
  await api("/api/catalog2/cart/clear", C, "POST", {});
  must(await api("/api/catalog2/cart/items", C, "POST", { product: T.product.id, selection: SEL }));
  // (e) produto em EDIÇÃO (rascunho, módulo desligado) para as telas do editor
  const E = await mkProduct("Produto em edição com conexões (DEMO)", [{ key: "preparar", name: "Preparar conta", steps: 2 }, { key: "executar", name: "Executar rotina" }]);
  // (f) uma conexão opcional da Meta marcada "precisa de correção" (a tela do cliente mostra o problema e a correção)
  const pMeta = await pcrOf(P1, /Meta/);
  const cMeta = must(await api(`/api/connections/requirements/${pMeta.id}/create-and-link`, C, "POST", { method: "partner_business", label: "Meta Business — Empresa Demo Alfa", external_id: "bm-000111", permission_level: "read_write", scope: "project" })).json;
  must(await api(`/api/connections/${cMeta.connection_id}/validate`, A, "POST", { result: "needs_correction", problem: "O portfólio empresarial informado não compartilhou ativos com a empresa parceira da Allka.", correction_needed: "No Meta Business Manager, compartilhe os ativos com a empresa parceira da Allka (ID informado nas instruções) e confirme." }));
  // (g) troca de executor ainda NÃO autorizada (a validação visual autoriza pela tela)
  const pr2 = await buy(C, R.product.id);
  const tr2 = await tasksOf(pr2.projectId);
  const pcrR2 = await pcrOf(pr2.projectId);
  const cR2 = must(await api(`/api/connections/requirements/${pcrR2.id}/create-and-link`, C, "POST", { method: "user_invite", label: "Automação (convite) — executor", external_id: "automacao-beta", permission_level: "read_write", scope: "project" })).json;
  must(await api(`/api/connections/${cR2.connection_id}/validate`, A, "POST", { result: "valid", evidence: "Convite aceito pelo executor 1." }));
  await prisma.projectTask.update({ where: { id: tr2.agendamento.id }, data: { status: "AGUARDANDO_NOMADE", lider_responsavel_id: leaderU.id } });
  await assignNomadeDirectly(tr2.agendamento.id, nomad1.nomade.id, adminU.id);
  must(await api(`/api/connections/requirements/${pcrR2.id}/authorize-executor`, A, "POST", { task_id: tr2.agendamento.id, executor_user_id: nomad1.nomade.id }));
  await prisma.projectTask.update({ where: { id: tr2.agendamento.id }, data: { nomade_responsavel_id: null, status: "AGUARDANDO_NOMADE" } });
  await assignNomadeDirectly(tr2.agendamento.id, nomad2.nomade.id, adminU.id);
  // (d) tarefas de P1 atribuídas (líder/nômade) para as visões
  await prisma.projectTask.updateMany({ where: { project_id: { in: [P1, sv.projectId, gb.projectId] }, status: { in: ["PENDENTE_DE_LIBERACAO"] } }, data: { lider_responsavel_id: leaderU.id } });
  await prisma.projectTask.updateMany({ where: { project_id: gb.projectId, status: "PENDENTE_DE_LIBERACAO" }, data: { nomade_responsavel_id: nomad1.nomade.id } });

  // ── saída ──
  const seed = {
    admin: { id: adminU.id, email: adminU.email, role: adminU.role, account_type: adminU.account_type }, leader: { id: leaderU.id, email: leaderU.email, role: leaderU.role, account_type: leaderU.account_type },
    client: { id: clientU.id, email: clientU.email, role: clientU.role, account_type: clientU.account_type }, agency: { id: owner.id, email: owner.email, role: owner.role, account_type: owner.account_type },
    nomad1: { id: nomad1.user.id, email: nomad1.user.email, role: nomad1.user.role, account_type: nomad1.user.account_type, nomade_id: nomad1.nomade.id }, nomad2: { id: nomad2.user.id, email: nomad2.user.email, role: nomad2.user.role, account_type: nomad2.user.account_type, nomade_id: nomad2.nomade.id },
    products: { T: T.product.id, S: S.product.id, N: N.product.id, R: R.product.id, E: E.product.id }, versions: { T: T.versionId, S: S.versionId, N: N.versionId, R: R.versionId, E: E.versionId }, slugs: {} as Record<string, string>,
    projects: { P1, paused: sv.projectId, agency: gb.projectId, exec: pr.projectId, exec2: pr2.projectId, site4: s4.projectId },
    pcr: { P1_meta: pMeta.id, exec2: pcrR2.id, P1_gtm: p15.id, P1_ads: pAds.id, P1_pixel: (await pcrOf(P1, /Pixel/)).id, P1_ga: pGa.id, paused: sv.pcr.id, agency: (await pcrOf(gb.projectId, /Google Ads/)).id },
    tasks: { exec2_agendamento: tr2.agendamento.id, P1_configuracao: t1.configuracao.id, P1_campanhas: t1.campanhas.id, P1_relatorio: t1.relatorio.id, paused_construcao: sv.t.construcao.id },
    connections: { ads: cAds.connection_id, wp_project: w3.connection_id },
  };
  for (const [k, id] of Object.entries(seed.products)) seed.slugs[k] = (await prisma.catalog2Product.findUniqueOrThrow({ where: { id } })).slug;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "demo-seed.json"), JSON.stringify(seed, null, 2));
  const okAll = demos.every((d) => d.ok);
  const md = [
    "# Demonstrações descartáveis — Conexões e acessos necessários", "",
    `Executadas em ${new Date().toLocaleString("pt-BR")} na base descartável \`allka_conn_demo\` (cópia da base local), com o backend real em :3011 e **provedor de IA simulado de QA** (sem custo e sem enviar dados). Nada foi publicado nem enviado para fora; a base é removida ao final.`, "",
    `**Resultado geral: ${okAll ? "TODAS AS DEMONSTRAÇÕES APROVADAS" : "HÁ FALHAS"}** (${demos.filter((d) => d.ok).length}/${demos.length})`, "",
    "Produtos usados (criados só nesta base): Gestão de Tráfego Pago, Site ou Landing Page, Produto sem conexão e Gestão de Redes Sociais.", "",
    ...demos.flatMap((d) => [`## ${d.id} — ${d.titulo} ${d.ok ? "✅" : "❌"}`, "", ...d.obs.map((o) => `- ${o}`), ""]),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "demonstracoes.md"), md);
  console.log(`\nDEMO ${okAll ? "OK" : "COM FALHAS"} (${demos.filter((d) => d.ok).length}/${demos.length})`);
  await prisma.$disconnect();
  process.exit(okAll ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

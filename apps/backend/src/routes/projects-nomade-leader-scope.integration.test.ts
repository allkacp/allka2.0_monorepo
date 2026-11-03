import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Fechamento de 02/11 nas rotas /api/projects, em banco DESCARTÁVEL (nunca o allka real).
// Antes o escopo do Nômade e do Líder era "open": o Nômade listava, abria, alterava e apagava projeto de
// qualquer conta, e o Líder apagava (o PUT já o barrava). Regra do usuário: o Nômade não vê projeto, só a
// tarefa liberada para ele. Cada cenário prova o "depois" pela rota HTTP real: duas agências, uma empresa,
// dois nômades (o 1º responde pela tarefa do projeto A e só por uma etapa no B), um nômade sem perfil, um
// Líder, um Líder no formato da importação antiga (account_type "nomades") e um admin.

let baseUrl = "";
let server: import("node:http").Server;
const userIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const projectIds: string[] = [];
const nomadeIds: string[] = [];
const uid = () => crypto.randomBytes(5).toString("hex");

type U = { id: string; email: string; role: string; account_type: string };
function tokenFor(u: U) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(path: string, opts: { method?: string; as?: U; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.as ? { authorization: `Bearer ${tokenFor(opts.as)}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
// Só os projetos criados aqui, em ordem — a lista pode trazer outros do banco descartável.
async function listed(as: U) {
  const res = await api("/api/projects?limit=500", { as });
  assert.equal(res.status, 200);
  return (res.json.data as { id: string }[]).map((p) => p.id).filter((id) => projectIds.includes(id)).sort();
}

async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
  const id = `pnl-${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
  userIds.push(u.id);
  return u;
}
// Agency exige um owner_user_id real; quem age nos testes é o usuário MEMBRO (User.agency_id), como em produção.
async function mkAgency() {
  const owner = await mkUser("agency_admin", "agencias");
  const agency = await prisma.agency.create({ data: { owner_user_id: owner.id, name: `Agência PNL ${uid()}` } });
  agencyIds.push(agency.id);
  const member = await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  return { agency, member };
}
async function mkNomade(user: U) {
  const n = await prisma.nomade.create({ data: { name: `Nômade ${user.id}`, email: `${user.id}-n@example.test`, user_id: user.id } });
  nomadeIds.push(n.id);
  return n;
}
// Vínculo legado (agency/client_id) E novo (agency_id/company_id), como os projetos criados pela tela.
async function mkProject(owner: { agency?: string; agency_id?: string; client_id?: string; company_id?: string }) {
  const code = uid();
  const p = await prisma.project.create({ data: { title: `Projeto PNL ${code}`, project_code: code, ...owner } });
  projectIds.push(p.id);
  return p;
}
async function mkTask(projectId: string, ex: Record<string, unknown> = {}) {
  const pp = await prisma.projectProduct.create({ data: { project_id: projectId, product_name_snapshot: "Produto PNL", product_category_snapshot: "Teste", status: "PENDENTE", preco_final_cliente_snapshot: 500 } });
  return prisma.projectTask.create({ data: { project_id: projectId, project_product_id: pp.id, name_snapshot: "Tarefa PNL", title: "Tarefa PNL", status: "EM_EXECUCAO", category_snapshot: "Outra", ...ex } });
}

let A: Awaited<ReturnType<typeof mkAgency>>;
let B: Awaited<ReturnType<typeof mkAgency>>;
let empresa: U, n1: U, n2: U, nomadeSemPerfil: U, lider: U, liderLegado: U, admin: U;
let pA: { id: string; title: string }, pB: { id: string }, pC: { id: string; title: string };
let pA2: { id: string }, pAdmin: { id: string };
let n1Profile: { id: string };
let tA: { id: string }, tB: { id: string }, tC: { id: string };
let docA: { id: string }, credA: { id: string; title: string };

describe("Fechamento do escopo de projeto — Nômade e DELETE do Líder (02/11)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;

    A = await mkAgency();
    B = await mkAgency();
    const company = await prisma.company.create({ data: { name: `Empresa PNL ${uid()}` } });
    companyIds.push(company.id);
    empresa = await mkUser("company_admin", "empresas", { company_id: company.id });
    n1 = await mkUser("nomad_admin", "nomades");
    n1Profile = await mkNomade(n1);
    n2 = await mkUser("nomad_admin", "nomades");
    await mkNomade(n2);
    nomadeSemPerfil = await mkUser("nomad", "nomades");
    lider = await mkUser("lider", "lider");
    await prisma.liderArea.create({ data: { user_id: lider.id, area_nome: "Área PNL", categorias_permitidas: JSON.stringify([]), ativo: true } });
    // Formato da importação da plataforma antiga (scripts/import-legacy-platform.ts): role "lider", account_type "nomades".
    liderLegado = await mkUser("lider", "nomades");
    await mkNomade(liderLegado);
    admin = await mkUser("admin", "admin");

    pA = await mkProject({ agency: A.agency.name, agency_id: A.agency.id });
    pB = await mkProject({ agency: B.agency.name, agency_id: B.agency.id });
    pC = await mkProject({ client_id: company.id, company_id: company.id });
    pA2 = await mkProject({ agency: A.agency.name, agency_id: A.agency.id });
    pAdmin = await mkProject({ agency: B.agency.name, agency_id: B.agency.id });
    tA = await mkTask(pA.id, { nomade_responsavel_id: n1Profile.id }); // n1 responde pela tarefa inteira
    tB = await mkTask(pB.id); // em B, n1 só tem uma etapa
    await prisma.projectTaskStage.create({ data: { project_task_id: tB.id, titulo: "Etapa PNL", status: "EM_ANDAMENTO", nomade_id: n1Profile.id } });
    tC = await mkTask(pC.id);
    docA = await prisma.projectAttachment.create({ data: { project_id: pA.id, name: "contexto.pdf", file_name: `pnl-${uid()}.pdf` } });
    credA = await prisma.projectCredential.create({ data: { project_id: pA.id, title: "Acesso PNL" } });
  });

  after(async () => {
    await prisma.projectTask.deleteMany({ where: { project_id: { in: projectIds } } }); // etapas saem junto (cascade)
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } }); // documentos e credenciais saem junto
    await prisma.nomade.deleteMany({ where: { id: { in: nomadeIds } } });
    await prisma.liderArea.deleteMany({ where: { user_id: { in: userIds } } });
    // Agency <-> User se referenciam nos dois sentidos: desfaz o vínculo de membro antes de apagar a Agency.
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { agency_id: null } });
    await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  // ── Nômade ─────────────────────────────────────────────────────────────────
  describe("Nômade", () => {
    it("não lista projeto nenhum — nem os em que tem tarefa ou etapa; outro nômade e nômade sem perfil, idem", async () => {
      for (const who of [n1, n2, nomadeSemPerfil]) assert.deepEqual(await listed(who), []);
      // filtro por cliente na query não abre nada
      const porCliente = await api(`/api/projects?limit=500&client_id=${companyIds[0]}`, { as: n1 });
      assert.deepEqual([porCliente.status, porCliente.json.total], [200, 0]);
    });

    it("não abre projeto nem nenhuma aba dele, nem onde tem tarefa: 403", async () => {
      for (const p of [pA, pB, pC]) {
        assert.equal((await api(`/api/projects/${p.id}`, { as: n1 })).status, 403, `projeto ${p.id}`);
        for (const sub of ["files", "documents", "tasks", "billing", "dashboard", "log", "credentials"]) {
          assert.equal((await api(`/api/projects/${p.id}/${sub}`, { as: n1 })).status, 403, `${sub} de ${p.id}`);
        }
      }
      assert.equal((await api(`/api/projects/${pA.id}/documents/${docA.id}/download`, { as: n1 })).status, 403);
      assert.equal((await api(`/api/projects/${pA.id}`, { as: n2 })).status, 403);
      assert.equal((await api(`/api/projects/${pA.id}`, { as: nomadeSemPerfil })).status, 403);
    });

    it("continua vendo só a tarefa liberada para ele (Minhas tarefas): a que responde inteira e a da etapa dele", async () => {
      const minhas = await api("/api/nomades/me/tarefas", { as: n1 });
      assert.equal(minhas.status, 200);
      const ids = (minhas.json.data as { id: string }[]).map((t) => t.id);
      assert.deepEqual(ids.filter((id) => [tA.id, tB.id, tC.id].includes(id)).sort(), [tA.id, tB.id].sort());
      const deOutro = await api("/api/nomades/me/tarefas", { as: n2 });
      assert.equal((deOutro.json.data as { id: string }[]).some((t) => [tA.id, tB.id, tC.id].includes(t.id)), false);
    });

    it("não cria, não altera, não arquiva e não apaga — nem no projeto em que trabalha; nada muda no banco", async () => {
      const titulo = `Projeto criado por nômade ${uid()}`;
      assert.equal((await api(`/api/projects/check-name?title=${encodeURIComponent(pC.title)}`, { as: n1 })).status, 403);
      assert.equal((await api("/api/projects", { method: "POST", as: n1, body: { title: titulo, agency: A.agency.name } })).status, 403);
      assert.equal(await prisma.project.count({ where: { title: titulo } }), 0);

      assert.equal((await api(`/api/projects/${pA.id}`, { method: "PUT", as: n1, body: { title: "Alterado pelo nômade" } })).status, 403);
      assert.equal((await api(`/api/projects/${pC.id}`, { method: "PUT", as: n2, body: { title: "Alterado pelo nômade" } })).status, 403);
      assert.equal((await api(`/api/projects/${pA.id}/archive`, { method: "PATCH", as: n1, body: { reason: "tentativa do nômade" } })).status, 403);
      assert.equal((await api(`/api/projects/${pA.id}`, { method: "DELETE", as: n1 })).status, 403);
      assert.equal((await api(`/api/projects/${pC.id}`, { method: "DELETE", as: n1 })).status, 403);

      const credBase = `/api/projects/${pA.id}/credentials`;
      assert.equal((await api(credBase, { method: "POST", as: n1, body: { title: "Nova pelo nômade" } })).status, 403);
      assert.equal((await api(`${credBase}/${credA.id}`, { method: "PATCH", as: n1, body: { title: "Alterada" } })).status, 403);
      assert.equal((await api(`${credBase}/${credA.id}/share`, { method: "POST", as: n1, body: { shared_with_nomad_id: n1Profile.id } })).status, 403);
      assert.equal((await api(`${credBase}/${credA.id}/revoke`, { method: "POST", as: n1 })).status, 403);
      assert.equal((await api(`${credBase}/${credA.id}`, { method: "DELETE", as: n1 })).status, 403);

      assert.equal((await api(`/api/projects/${pA.id}/documents`, { method: "POST", as: n1 })).status, 403);
      assert.equal((await api(`/api/projects/${pA.id}/documents/${docA.id}`, { method: "DELETE", as: n1 })).status, 403);

      const [a, c] = await Promise.all([prisma.project.findUnique({ where: { id: pA.id } }), prisma.project.findUnique({ where: { id: pC.id } })]);
      assert.ok(a && c, "projetos continuam existindo");
      assert.deepEqual([a.title, a.archived_at, c.title], [pA.title, null, pC.title]);
      const cred = await prisma.projectCredential.findUniqueOrThrow({ where: { id: credA.id } });
      assert.deepEqual([cred.title, cred.status, cred.shared_with_nomad_id], [credA.title, "active", null]);
      assert.equal(await prisma.projectCredential.count({ where: { project_id: pA.id } }), 1);
      assert.ok(await prisma.projectAttachment.findUnique({ where: { id: docA.id } }), "documento continua");
    });
  });

  // ── Líder ──────────────────────────────────────────────────────────────────
  describe("Líder", () => {
    it("continua lendo todos os projetos, lista e detalhe — inclusive o Líder da importação antiga", async () => {
      for (const who of [lider, liderLegado]) {
        const all = await listed(who);
        for (const p of [pA, pB, pC]) assert.ok(all.includes(p.id), `${who.account_type}/${who.role} lista ${p.id}`);
        assert.equal((await api(`/api/projects/${pC.id}`, { as: who })).status, 200);
      }
    });

    it("não apaga projeto (novo) e continua sem alterar; o projeto fica", async () => {
      for (const who of [lider, liderLegado]) {
        assert.equal((await api(`/api/projects/${pC.id}`, { method: "DELETE", as: who })).status, 403);
        assert.equal((await api(`/api/projects/${pC.id}`, { method: "PUT", as: who, body: { title: "Alterado pelo líder" } })).status, 403);
      }
      const c = await prisma.project.findUnique({ where: { id: pC.id } });
      assert.equal(c?.title, pC.title);
    });
  });

  // ── Admin, agência e empresa: nada muda ────────────────────────────────────
  describe("admin, agência e empresa — comportamento igual", () => {
    it("cada conta lista e abre só o que é dela; admin vê tudo", async () => {
      assert.deepEqual(await listed(A.member), [pA.id, pA2.id].sort());
      assert.deepEqual(await listed(empresa), [pC.id]);
      const all = await listed(admin);
      for (const p of [pA, pB, pC, pA2, pAdmin]) assert.ok(all.includes(p.id));
      assert.equal((await api(`/api/projects/${pA.id}`, { as: A.member })).status, 200);
      assert.equal((await api(`/api/projects/${pB.id}`, { as: A.member })).status, 403);
      assert.equal((await api(`/api/projects/${pC.id}`, { as: empresa })).status, 200);
      assert.equal((await api(`/api/projects/${pA.id}`, { as: empresa })).status, 403);
      assert.equal((await api(`/api/projects/${pB.id}`, { as: admin })).status, 200);
      const nome = await api(`/api/projects/check-name?title=${encodeURIComponent(pA.title)}`, { as: A.member });
      assert.deepEqual([nome.status, nome.json?.exists], [200, true], "checagem de nome ao criar continua");
    });

    it("a agência dona continua vendo faturamento, painel, histórico, credenciais, arquivos e tarefas", async () => {
      for (const sub of ["billing", "dashboard", "log", "credentials", "files", "documents", "tasks"]) {
        assert.equal((await api(`/api/projects/${pA.id}/${sub}`, { as: A.member })).status, 200, sub);
      }
    });

    it("a agência altera e apaga o próprio projeto; o admin apaga qualquer um", async () => {
      const put = await api(`/api/projects/${pA2.id}`, { method: "PUT", as: A.member, body: { title: `Renomeado ${uid()}` } });
      assert.equal(put.status, 200);
      assert.match(put.json.title, /^Renomeado /);
      assert.equal((await api(`/api/projects/${pA2.id}`, { method: "DELETE", as: A.member })).status, 204);
      assert.equal(await prisma.project.findUnique({ where: { id: pA2.id } }), null);
      assert.equal((await api(`/api/projects/${pAdmin.id}`, { method: "DELETE", as: A.member })).status, 403, "agência não apaga o de outra");
      assert.equal((await api(`/api/projects/${pAdmin.id}`, { method: "DELETE", as: admin })).status, 204);
    });
  });
});

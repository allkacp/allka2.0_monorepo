import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Fechamento de 02/11 em /api/wallets e /api/project-products, em banco DESCARTÁVEL (nunca o allka real).
// Antes, qualquer sessão válida lia todas as carteiras, criava carteira com saldo, creditava qualquer uma e
// listava/vinculava/alterava/apagava produtos e lia tarefas de qualquer projeto. Cada cenário prova o "depois"
// pela rota HTTP real, com duas agências (a B é Partner ativa), uma empresa, um nômade, um Líder e dois admins.

let baseUrl = "";
let server: import("node:http").Server;
const userIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const projectIds: string[] = [];
const walletIds: string[] = [];
const nomadeIds: string[] = [];
const profileIds: string[] = [];
const legacyProductIds: string[] = [];
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
const ids = (res: { json: any }) => (res.json?.data ?? []).map((x: { id: string }) => x.id).sort();

async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
  const id = `wpa-${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
  userIds.push(u.id);
  return u;
}
// Agency exige um owner_user_id real; quem age nos testes é o usuário MEMBRO (User.agency_id), como em produção.
async function mkAgency() {
  const owner = await mkUser("agency_admin", "agencias");
  const agency = await prisma.agency.create({ data: { owner_user_id: owner.id, name: `Agência WPA ${uid()}` } });
  agencyIds.push(agency.id);
  const member = await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  return { agency, member };
}
async function mkWallet(owner_type: string, owner_id: string, balance: number) {
  const w = await prisma.wallet.create({ data: { owner_type, owner_id, balance } });
  walletIds.push(w.id);
  return w;
}
async function mkProject(owner: { agency_id?: string; company_id?: string }) {
  const code = uid();
  const p = await prisma.project.create({ data: { title: `Projeto WPA ${code}`, project_code: code, ...owner } });
  projectIds.push(p.id);
  return p;
}
async function mkLink(projectId: string) {
  return prisma.projectProduct.create({ data: { project_id: projectId, product_name_snapshot: "Produto WPA", product_category_snapshot: "Teste", status: "PENDENTE", preco_final_cliente_snapshot: 500 } });
}
async function mkTask(projectId: string, projectProductId: string, ex: Record<string, unknown> = {}) {
  return prisma.projectTask.create({ data: { project_id: projectId, project_product_id: projectProductId, name_snapshot: "Tarefa WPA", title: "Tarefa WPA", status: "PARA_LANCAMENTO", category_snapshot: "Outra", ...ex } });
}
// "Pago" como a confirmação de pagamento deixa: item num Payment com status PAGO.
async function markPaid(projectId: string, projectProductId: string, status = "PAGO") {
  const payment = await prisma.payment.create({ data: { project_id: projectId, amount: 500, status } });
  await prisma.paymentItem.create({ data: { payment_id: payment.id, project_product_id: projectProductId, product_name_snapshot: "Produto WPA", unit_price_snapshot: 500, total_snapshot: 500 } });
}

let A: Awaited<ReturnType<typeof mkAgency>>;
let B: Awaited<ReturnType<typeof mkAgency>>;
let empresa: U, nomade: U, lider: U, admin: U, adminRestrito: U, agenciaSemVinculo: U;
let wA: { id: string }, wB: { id: string }, wBPartner: { id: string }, wC: { id: string }, wN: { id: string };
let pA: { id: string }, pB: { id: string }, pC: { id: string };
let ppA: { id: string }, ppA2: { id: string }, ppB: { id: string }, ppC: { id: string };
let tA: { id: string }, tB: { id: string }, tC: { id: string };

describe("Fechamento de permissões — /api/wallets e /api/project-products (02/11)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;

    A = await mkAgency();
    B = await mkAgency();
    const partnerB = await prisma.partnerProfile.create({ data: { agency_id: B.agency.id, status: "active" } });
    const company = await prisma.company.create({ data: { name: `Empresa WPA ${uid()}` } });
    companyIds.push(company.id);
    empresa = await mkUser("company_admin", "empresas", { company_id: company.id });
    nomade = await mkUser("nomad_admin", "nomades");
    const n = await prisma.nomade.create({ data: { name: "Nômade WPA", email: `${nomade.id}-n@example.test`, user_id: nomade.id } });
    nomadeIds.push(n.id);
    lider = await mkUser("lider", "lider");
    await prisma.liderArea.create({ data: { user_id: lider.id, area_nome: "Área WPA", categorias_permitidas: JSON.stringify(["Categoria do Líder"]), ativo: true } });
    admin = await mkUser("admin", "admin"); // sem perfil de acesso = acesso de admin de antes
    const perfil = await prisma.adminProfile.create({ data: { name: `Só leitura WPA ${uid()}`, is_master: false, is_active: true, permissions: { create: [{ module: "sistema", action: "view" }] } } });
    profileIds.push(perfil.id);
    adminRestrito = await mkUser("admin", "admin", { admin_profile_id: perfil.id });
    agenciaSemVinculo = await mkUser("agency_admin", "agencias");

    wA = await mkWallet("agency", A.agency.id, 100);
    wB = await mkWallet("agency", B.agency.id, 200);
    wBPartner = await mkWallet("partner", partnerB.id, 30);
    wC = await mkWallet("company", company.id, 300);
    wN = await mkWallet("nomad", n.id, 50);

    pA = await mkProject({ agency_id: A.agency.id });
    pB = await mkProject({ agency_id: B.agency.id });
    pC = await mkProject({ company_id: company.id });
    ppA = await mkLink(pA.id);
    ppA2 = await mkLink(pA.id);
    ppB = await mkLink(pB.id);
    ppC = await mkLink(pC.id);
    tA = await mkTask(pA.id, ppA.id);
    tB = await mkTask(pB.id, ppB.id, { lider_responsavel_id: lider.id });
    tC = await mkTask(pC.id, ppC.id);
  });

  after(async () => {
    await prisma.walletLedger.deleteMany({ where: { wallet_id: { in: walletIds } } });
    await prisma.wallet.deleteMany({ where: { id: { in: walletIds } } });
    await prisma.projectTask.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.payment.deleteMany({ where: { project_id: { in: projectIds } } }); // itens saem junto (cascade)
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: legacyProductIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: nomadeIds } } });
    // Agency <-> User se referenciam nos dois sentidos: desfaz o vínculo de membro antes de apagar a Agency.
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { agency_id: null } });
    await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  // ── Carteiras ──────────────────────────────────────────────────────────────
  describe("/api/wallets", () => {
    it("agência só lista a própria carteira, mesmo pedindo outro dono na query", async () => {
      assert.deepEqual(ids(await api("/api/wallets", { as: A.member })), [wA.id]);
      assert.deepEqual(ids(await api(`/api/wallets?owner_type=agency&owner_id=${B.agency.id}`, { as: A.member })), []);
      assert.deepEqual(ids(await api("/api/wallets?owner_type=company", { as: A.member })), []);
    });

    it("agência Partner ativa vê a da agência e a de Partner; empresa e nômade só a sua; sem vínculo, nada", async () => {
      assert.deepEqual(ids(await api("/api/wallets", { as: B.member })), [wB.id, wBPartner.id].sort());
      assert.deepEqual(ids(await api("/api/wallets", { as: empresa })), [wC.id]);
      assert.deepEqual(ids(await api("/api/wallets", { as: nomade })), [wN.id]);
      assert.deepEqual(ids(await api("/api/wallets", { as: lider })), []);
      assert.deepEqual(ids(await api("/api/wallets", { as: agenciaSemVinculo })), []);
    });

    it("carteira de outro dono responde 404 em /:id e /:id/ledger; a própria abre", async () => {
      assert.equal((await api(`/api/wallets/${wB.id}`, { as: A.member })).status, 404);
      assert.equal((await api(`/api/wallets/${wB.id}/ledger`, { as: A.member })).status, 404);
      assert.equal((await api(`/api/wallets/${wC.id}`, { as: nomade })).status, 404);
      const own = await api(`/api/wallets/${wA.id}`, { as: A.member });
      assert.equal(own.status, 200);
      assert.equal(own.json.balance, 100);
      assert.equal((await api(`/api/wallets/${wA.id}/ledger`, { as: A.member })).status, 200);
    });

    it("painéis da plataforma (/stats, /ledger, /projections, /conciliation) são só do admin", async () => {
      for (const path of ["/api/wallets/stats", "/api/wallets/ledger", "/api/wallets/projections", "/api/wallets/conciliation"]) {
        for (const who of [A.member, empresa, nomade, lider]) {
          assert.equal((await api(path, { as: who })).status, 403, `${path} como ${who.account_type}`);
        }
        assert.equal((await api(path, { as: admin })).status, 200, `${path} como admin`);
      }
    });

    it("criar, ajustar e alterar carteira: só admin com perfil 'sistema'; recusa não mexe no saldo", async () => {
      const credito = { direction: "credit", amount: 1000, description: "tentativa" };
      assert.equal((await api(`/api/wallets/${wA.id}/adjustment`, { method: "POST", as: A.member, body: credito })).status, 403);
      assert.equal((await api(`/api/wallets/${wB.id}/adjustment`, { method: "POST", as: A.member, body: credito })).status, 403);
      assert.equal((await api("/api/wallets", { method: "POST", as: A.member, body: { owner_type: "agency", owner_id: `x-${uid()}`, balance: 5000 } })).status, 403);
      assert.equal((await api(`/api/wallets/${wB.id}`, { method: "PUT", as: A.member, body: { status: "suspended" } })).status, 403);
      assert.equal((await api(`/api/wallets/${wA.id}/adjustment`, { method: "POST", as: adminRestrito, body: credito })).status, 403);

      const [a, b] = await Promise.all([prisma.wallet.findUniqueOrThrow({ where: { id: wA.id } }), prisma.wallet.findUniqueOrThrow({ where: { id: wB.id } })]);
      assert.equal(a.balance, 100);
      assert.equal(b.balance, 200);
      assert.equal(b.status, "active");
      assert.equal(await prisma.walletLedger.count({ where: { wallet_id: { in: [wA.id, wB.id] } } }), 0);

      const ok = await api(`/api/wallets/${wN.id}/adjustment`, { method: "POST", as: admin, body: { direction: "credit", amount: 5, description: "ajuste do admin" } });
      assert.equal(ok.status, 201);
      assert.equal((await prisma.wallet.findUniqueOrThrow({ where: { id: wN.id } })).balance, 55);
    });

    it("admin continua vendo todas as carteiras", async () => {
      const all = ids(await api("/api/wallets?limit=100", { as: admin }));
      for (const w of [wA, wB, wBPartner, wC, wN]) assert.ok(all.includes(w.id));
    });
  });

  // ── Produtos do projeto e tarefas ──────────────────────────────────────────
  describe("/api/project-products", () => {
    it("agência/empresa só leem os vínculos dos próprios projetos", async () => {
      assert.deepEqual(ids(await api(`/api/project-products?project_id=${pB.id}`, { as: A.member })), []);
      assert.deepEqual(ids(await api("/api/project-products", { as: A.member })), [ppA.id, ppA2.id].sort());
      assert.deepEqual(ids(await api("/api/project-products", { as: empresa })), [ppC.id]);
      assert.deepEqual(ids(await api(`/api/project-products?project_id=${pB.id}`, { as: B.member })), [ppB.id]);
    });

    it("nômade não lê vínculos; Líder só os que têm tarefa visível para ele; admin vê tudo com os nomes", async () => {
      assert.deepEqual(ids(await api("/api/project-products", { as: nomade })), []);
      assert.deepEqual(ids(await api("/api/project-products", { as: lider })), [ppB.id]);
      const asAdmin = await api(`/api/project-products?project_id=${pB.id}`, { as: admin });
      assert.deepEqual(ids(asAdmin), [ppB.id]);
      assert.equal(asAdmin.json.data[0].tasks[0].lider_responsavel_name, lider.name);
    });

    it("vincular produto em projeto alheio responde 404 e não cria nada; no próprio passa do escopo", async () => {
      const antes = await prisma.projectProduct.count({ where: { project_id: { in: projectIds } } });
      for (const who of [A.member, nomade, lider]) {
        const res = await api("/api/project-products", { method: "POST", as: who, body: { project_id: pB.id, product_id: "qualquer" } });
        assert.equal(res.status, 404, who.account_type);
        assert.equal(res.json.error, "Projeto não encontrado");
      }
      // Dono do projeto passa do escopo e só para no produto (inexistente de propósito: nada é criado).
      const own = await api("/api/project-products", { method: "POST", as: A.member, body: { project_id: pA.id, product_id: "nao-existe" } });
      assert.equal(own.status, 404);
      assert.equal(own.json.error, "Produto não encontrado");
      assert.equal(await prisma.projectProduct.count({ where: { project_id: { in: projectIds } } }), antes);
    });

    it("alterar ou desvincular produto de projeto alheio responde 404 e não muda nada; o dono consegue", async () => {
      for (const who of [A.member, lider, nomade]) {
        assert.equal((await api(`/api/project-products/${ppB.id}`, { method: "PATCH", as: who, body: { status: "CANCELADO", preco_final_cliente_snapshot: 0 } })).status, 404);
        assert.equal((await api(`/api/project-products/${ppB.id}`, { method: "DELETE", as: who })).status, 404);
      }
      const intacto = await prisma.projectProduct.findUniqueOrThrow({ where: { id: ppB.id } });
      assert.equal(intacto.status, "PENDENTE");
      assert.equal(intacto.preco_final_cliente_snapshot, 500);

      assert.equal((await api(`/api/project-products/${ppB.id}`, { method: "PATCH", as: B.member, body: { status: "EM_EXECUCAO" } })).status, 200);
      assert.equal((await api(`/api/project-products/${ppA2.id}`, { method: "DELETE", as: A.member })).status, 204);
      assert.equal(await prisma.projectProduct.count({ where: { id: ppA2.id } }), 0);
    });

    it("/tasks e /tasks/:id seguem o mesmo escopo de /api/project-tasks", async () => {
      assert.deepEqual(ids(await api("/api/project-products/tasks", { as: A.member })), [tA.id]);
      assert.deepEqual(ids(await api(`/api/project-products/tasks?project_id=${pB.id}`, { as: A.member })), []);
      assert.equal((await api(`/api/project-products/tasks/${tB.id}`, { as: A.member })).status, 404);
      assert.equal((await api(`/api/project-products/tasks/${tA.id}`, { as: A.member })).status, 200);
      assert.deepEqual(ids(await api("/api/project-products/tasks", { as: empresa })), [tC.id]);
      assert.deepEqual(ids(await api("/api/project-products/tasks", { as: nomade })), []);
      assert.equal((await api(`/api/project-products/tasks/${tA.id}`, { as: nomade })).status, 404);
      assert.deepEqual(ids(await api("/api/project-products/tasks", { as: lider })), [tB.id]);
      assert.deepEqual(ids(await api(`/api/project-products/tasks?project_id=${pB.id}`, { as: admin })), [tB.id]);
    });
  });

  // ── Produto já pago (decisão do usuário em 02/11) ──────────────────────────
  describe("produto já pago", () => {
    let pago: { id: string };
    let naoPago: { id: string };
    let legado: { id: string };

    before(async () => {
      pago = await mkLink(pA.id);
      await markPaid(pA.id, pago.id);
      naoPago = await mkLink(pA.id);
      await markPaid(pA.id, naoPago.id, "FALHOU"); // tentativa que falhou não conta como pago
      const antigo = await prisma.product.create({ data: { name: "Produto antigo WPA", category: "Teste" } });
      legacyProductIds.push(antigo.id);
      legado = await prisma.projectProduct.create({ data: { project_id: pA.id, product_id: antigo.id, product_name_snapshot: "Produto antigo WPA", product_category_snapshot: "Teste", status: "EM_EXECUCAO", preco_final_cliente_snapshot: 500, comissao_snapshot: 0, pagador_snapshot: "AGENCIA" } });
      await markPaid(pA.id, legado.id);
    });

    it("a dona não muda preço, comissão ou pagador nem cancela; o mesmo valor e as datas continuam passando", async () => {
      for (const body of [{ preco_final_cliente_snapshot: 1 }, { comissao_snapshot: 50 }, { pagador_snapshot: "CLIENTE" }, { status: "CANCELADO" }]) {
        const res = await api(`/api/project-products/${pago.id}`, { method: "PATCH", as: A.member, body });
        assert.equal(res.status, 409, JSON.stringify(body));
        assert.equal(res.json.code, "product_paid_locked");
      }
      const intacto = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pago.id } });
      assert.equal(intacto.preco_final_cliente_snapshot, 500);
      assert.equal(intacto.comissao_snapshot, 0);
      assert.equal(intacto.pagador_snapshot, "AGENCIA");
      assert.equal(intacto.status, "PENDENTE");

      const datas = await api(`/api/project-products/${pago.id}`, { method: "PATCH", as: A.member, body: { preco_final_cliente_snapshot: 500, expected_end_date: "2026-12-31T00:00:00.000Z" } });
      assert.equal(datas.status, 200);
      // Sem pagamento PAGO (só uma tentativa que falhou) nada trava.
      assert.equal((await api(`/api/project-products/${naoPago.id}`, { method: "PATCH", as: A.member, body: { comissao_snapshot: 10 } })).status, 200);
    });

    it("o admin ainda corrige o produto pago", async () => {
      const res = await api(`/api/project-products/${pago.id}`, { method: "PATCH", as: admin, body: { comissao_snapshot: 12 } });
      assert.equal(res.status, 200);
      assert.equal((await prisma.projectProduct.findUniqueOrThrow({ where: { id: pago.id } })).comissao_snapshot, 12);
    });

    it("ninguém remove produto pago (nem o admin): 409 com motivo, e ele continua no projeto", async () => {
      for (const who of [A.member, admin]) {
        const res = await api(`/api/project-products/${pago.id}`, { method: "DELETE", as: who });
        assert.equal(res.status, 409, who.account_type);
        assert.equal(res.json.error, "Este produto já foi pago e não pode ser removido do projeto.");
      }
      assert.equal(await prisma.projectProduct.count({ where: { id: pago.id } }), 1);
    });

    it("catálogo antigo: a tela antiga ainda grava a comissão do checkout depois de pagar, mas não cancela", async () => {
      const res = await api(`/api/project-products/${legado.id}`, { method: "PATCH", as: A.member, body: { preco_final_cliente_snapshot: 550, comissao_snapshot: 10, pagador_snapshot: "CLIENTE" } });
      assert.equal(res.status, 200);
      assert.equal((await api(`/api/project-products/${legado.id}`, { method: "PATCH", as: A.member, body: { status: "CANCELADO" } })).status, 409);
    });
  });
});

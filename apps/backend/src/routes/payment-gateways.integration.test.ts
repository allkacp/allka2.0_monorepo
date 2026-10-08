import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { api, getBaseUrl, mkAdmin, mkCompanyUser, mkUser, startServer, stopServer, tokenFor } from "../test-support/universal-helpers";
import { __setPaymentGatewayForTests, getPaymentGateway, type PaymentGatewayAdapter } from "../lib/payment-gateway";
import { PagBankGateway } from "../lib/payment-gateways/pagbank";

// Troca de gateway pelo Admin Master + recarga em gateway real (Pix) com aviso automático assinado.
let MASTER: Awaited<ReturnType<typeof mkAdmin>>;
let PLAIN: { token: string };
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const SENHA = "senha-master-teste";
const TOKEN_PAGBANK = "tok_teste_pagbank_123456";
const admin = (path: string, opts: { method?: string; body?: unknown; token?: string } = {}) => api(`/api/admin/payment-gateways${path}`, { token: MASTER.token, ...opts });
const saldo = async () => (await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type: "company", owner_id: CO.companyId } } }))?.balance ?? 0;

/** Simula o PagBank real sem rede: devolve um Pix e deixa o aviso ser assinado de verdade. */
function pagbankStub(): PaymentGatewayAdapter {
  const real = new PagBankGateway({ token: TOKEN_PAGBANK, mode: "sandbox", fetchImpl: (async (url: string, init: any) => {
    const body = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: `ORDE_${body.reference_id.slice(-6)}`, qr_codes: [{ text: "000201PIXREAL" }] }), { status: 201 });
  }) as unknown as typeof fetch });
  return real;
}

describe("Troca de gateway de pagamento (Admin Master) e recarga em gateway real", () => {
  before(async () => {
    await startServer();
    MASTER = await mkAdmin();
    await prisma.user.update({ where: { id: MASTER.user.id }, data: { password_hash: await bcrypt.hash(SENHA, 4) } });
    const p = await prisma.adminProfile.create({ data: { name: "Comum", is_master: false, is_active: true } });
    const comum = await mkUser("admin", "admin", { admin_profile_id: p.id });
    PLAIN = { token: tokenFor(comum) };
    CO = await mkCompanyUser("GW");
    await prisma.company.update({ where: { id: CO.companyId }, data: { cnpj: "11222333000181", email: "gw@example.test" } });
  });
  after(async () => {
    __setPaymentGatewayForTests(null);
    await prisma.paymentGatewayConfig.deleteMany({});
    await stopServer();
  });

  it("GW01. só o Admin Master vê e mexe em Pagamentos; o de teste vem ativo por padrão e o PagBank aparece sem chaves", async () => {
    assert.equal((await admin("", { token: PLAIN.token })).status, 403);
    const r = await admin("");
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.active, "fake_sandbox");
    const pb = r.json.gateways.find((g: any) => g.key === "pagbank");
    assert.deepEqual([pb.implemented, pb.configured, pb.is_active], [true, false, false]);
    assert.equal(r.json.gateways.find((g: any) => g.key === "asaas").implemented, false, "Asaas só reservado na lista");
  });

  it("GW02. chaves ficam cifradas e NUNCA voltam; ativar exige teste de conexão aprovado e a senha do Master", async () => {
    const s = await admin("/pagbank", { method: "PUT", body: { mode: "sandbox", secrets: { token: TOKEN_PAGBANK }, values: { public_base_url: "https://api.exemplo.test/" } } });
    assert.equal(s.status, 200, JSON.stringify(s.json));
    assert.equal(JSON.stringify(s.json).includes(TOKEN_PAGBANK), false, "o segredo não pode voltar na resposta");
    const row = await prisma.paymentGatewayConfig.findUniqueOrThrow({ where: { key: "pagbank" } });
    assert.equal(row.secret_ciphertext?.includes(TOKEN_PAGBANK), false, "no banco está cifrado");
    assert.equal(s.json.gateways.find((g: any) => g.key === "pagbank").values.public_base_url, "https://api.exemplo.test", "barra final removida");
    const semTeste = await admin("/pagbank/activate", { method: "POST", body: { password: SENHA } });
    assert.equal(semTeste.status, 422); assert.equal(semTeste.json.code, "not_tested");
    await prisma.paymentGatewayConfig.update({ where: { key: "pagbank" }, data: { last_test_ok: true, last_test_at: new Date() } });
    const errada = await admin("/pagbank/activate", { method: "POST", body: { password: "errada" } });
    assert.equal(errada.status, 403); assert.equal(errada.json.code, "wrong_password");
    assert.equal(getPaymentGateway().name, "FAKE_SANDBOX", "senha errada não troca nada");
    const ok = await admin("/pagbank/activate", { method: "POST", body: { password: SENHA, note: "taxa menor" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(ok.json.active, "pagbank");
    assert.equal(getPaymentGateway().name, "PAGBANK", "a troca vale na hora, sem reiniciar");
    const h = await admin("/history");
    assert.deepEqual([h.json.data[0].from_key, h.json.data[0].to_key, h.json.data[0].note], ["fake_sandbox", "pagbank", "taxa menor"]);
  });

  it("GW03. adaptador não escrito (Asaas) não pode ser ativado", async () => {
    const r = await admin("/asaas/activate", { method: "POST", body: { password: SENHA } });
    assert.ok([404, 422].includes(r.status), JSON.stringify(r.json));
  });

  it("GW04. recarga Pix no gateway real: gera o código, não credita até o aviso ASSINADO; aviso falso é recusado; aviso repetido não duplica", async () => {
    __setPaymentGatewayForTests(pagbankStub());
    const antes = await saldo();
    const sum = await api("/api/wallet-topup/summary", { token: CO.token });
    assert.equal(sum.json.hosted, true);
    const st = await api("/api/wallet-topup/start", { method: "POST", token: CO.token, body: { amount: 40, method: "pix" } });
    assert.equal(st.status, 201, JSON.stringify(st.json));
    assert.equal(st.json.pix_copy_paste, "000201PIXREAL");
    assert.equal(await saldo(), antes, "gerar o Pix não credita");

    const body = { id: "ORDE_x", reference_id: st.json.id, charges: [{ id: "CHAR_1", status: "PAID" }] };
    const raw = JSON.stringify(body);
    // sem assinatura → recusado
    const falso = await fetch(`${getBaseUrl()}/api/payment-webhooks/pagbank`, { method: "POST", headers: { "content-type": "application/json" }, body: raw });
    assert.equal(falso.status, 401, "aviso sem assinatura não credita");
    assert.equal(await saldo(), antes);

    // com assinatura correta → credita uma vez
    const sig = createHash("sha256").update(`${TOKEN_PAGBANK}-${raw}`).digest("hex");
    const baseUrl = getBaseUrl();
    const send = () => fetch(`${baseUrl}/api/payment-webhooks/pagbank`, { method: "POST", headers: { "content-type": "application/json", "x-authenticity-token": sig }, body: raw });
    assert.equal((await send()).status, 200);
    assert.equal((await send()).status, 200);
    assert.equal(await saldo(), antes + 40, "creditou uma vez só");
    const s2 = await api(`/api/wallet-topup/intents/${st.json.id}`, { token: CO.token });
    assert.deepEqual([s2.json.status, s2.json.balance_brl], ["paid", antes + 40]);
  });

  it("GW05. voltar ao gateway de teste desativa o PagBank e registra no histórico", async () => {
    __setPaymentGatewayForTests(null);
    const r = await admin("/fake_sandbox/activate", { method: "POST", body: { password: SENHA } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.active, "fake_sandbox");
    assert.equal(getPaymentGateway().name, "FAKE_SANDBOX");
  });
});

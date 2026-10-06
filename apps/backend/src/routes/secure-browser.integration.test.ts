import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { sweepBrowserSessions } from "../lib/secure-browser";
import { api, mkAdmin, mkCompanyUser, mkUser, startServer, stopServer, tokenFor, uid } from "../test-support/universal-helpers";

// D3 — navegador seguro (plano de controle): consentimento, autorização por tempo, uma sessão por perfil, expiração, derrubar, revogar, auditoria.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const call = (p: string, method = "GET", body?: unknown, token = ADMIN.token) => api(`/api/secure-browser${p}`, { method, token, body });

async function mkNomade() {
  const user = await mkUser("nomad", "nomades");
  return { user, token: tokenFor(user) };
}
async function perfil(co: Awaited<ReturnType<typeof mkCompanyUser>>, extra: Record<string, unknown> = {}) {
  const r = await call("/profiles", "POST", { label: "Instagram da Loja", start_url: "https://www.instagram.com/", consent: true, max_session_minutes: 30, ...extra }, co.token);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.id as string;
}

describe("D3 · Navegador seguro", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  after(async () => { await stopServer(); });

  it("SB01. perfil exige consentimento e endereço válido; só o dono vê; admin vê tudo; nada de segredo na resposta", async () => {
    const co = await mkCompanyUser("SB"), outra = await mkCompanyUser("SB2");
    assert.equal((await call("/profiles", "POST", { label: "x", start_url: "https://a.com", consent: false }, co.token)).status, 400, "sem consentimento");
    assert.equal((await call("/profiles", "POST", { label: "Conta", start_url: "javascript:alert(1)", consent: true }, co.token)).status, 400, "endereço inválido");
    const id = await perfil(co);
    const lista = await call("/profiles", "GET", undefined, co.token);
    assert.equal(lista.json.data.length, 1);
    assert.ok(!("state_ciphertext" in lista.json.data[0]), "estado guardado nunca é devolvido");
    assert.equal((await call("/profiles", "GET", undefined, outra.token)).json.data.length, 0);
    assert.equal((await call(`/profiles/${id}/grants`, "GET", undefined, outra.token)).status, 404, "outra conta não gerencia");
    assert.ok((await call(`/profiles?company_id=${co.companyId}`)).json.data.length >= 1);
    const ev = await call(`/profiles/${id}/events`, "GET", undefined, co.token);
    assert.equal(ev.json.data[0].kind, "profile_created");
  });

  it("SB02. sem autorização não abre; com autorização por tempo abre, tem prazo e uma sessão por perfil; expira e libera", async () => {
    const co = await mkCompanyUser("SB3"), n = await mkNomade();
    const id = await perfil(co);
    const negado = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal(negado.status, 403);
    assert.equal(negado.json.code, "no_grant");
    assert.equal((await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 10, reason: "Gestão de tráfego" }, co.token)).status, 201);
    const ok = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.ok(ok.json.url.includes("/api/secure-browser/demo/"));
    assert.ok(ok.json.session.remaining_seconds > 0 && ok.json.session.remaining_seconds <= 600, "limitada pela autorização (10 min)");
    // o dono não consegue abrir outra ao mesmo tempo
    const ocupado = await call(`/profiles/${id}/sessions`, "POST", {}, co.token);
    assert.equal(ocupado.status, 409);
    assert.equal(ocupado.json.code, "profile_busy");
    // expira e libera
    await prisma.browserSession.update({ where: { id: ok.json.session.id }, data: { expires_at: new Date(Date.now() - 1000) } });
    assert.equal(await sweepBrowserSessions(prisma), 1);
    assert.equal((await prisma.browserSession.findUniqueOrThrow({ where: { id: ok.json.session.id } })).status, "expired");
    assert.equal((await call(`/profiles/${id}/sessions`, "POST", {}, co.token)).status, 201, "liberou para outro uso");
  });

  it("SB03. revogar a autorização derruba a sessão do usuário; dono derruba; revogar o perfil derruba tudo e apaga o guardado", async () => {
    const co = await mkCompanyUser("SB4"), n = await mkNomade();
    const id = await perfil(co);
    const g = await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 60 }, co.token);
    const s1 = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal((await call(`/grants/${g.json.id}`, "DELETE", undefined, co.token)).status, 200);
    assert.equal((await prisma.browserSession.findUniqueOrThrow({ where: { id: s1.json.session.id } })).status, "killed");
    assert.equal((await call(`/profiles/${id}/sessions`, "POST", {}, n.token)).status, 403, "autorização revogada");
    // dono derruba
    const g2 = await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 60 }, co.token);
    assert.equal(g2.status, 201);
    const s2 = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal((await call(`/sessions/${s2.json.session.id}/kill`, "POST", {}, n.token)).status, 403, "usuário não derruba a própria como gestor");
    assert.equal((await call(`/sessions/${s2.json.session.id}/kill`, "POST", {}, co.token)).json.status, "killed");
    // revogar o perfil
    const s3 = await call(`/profiles/${id}/sessions`, "POST", {}, co.token);
    assert.equal(s3.status, 201);
    assert.equal((await call(`/profiles/${id}/revoke`, "POST", {}, co.token)).status, 200);
    assert.equal((await prisma.browserSession.findUniqueOrThrow({ where: { id: s3.json.session.id } })).status, "killed");
    assert.equal((await call(`/profiles/${id}/sessions`, "POST", {}, co.token)).status, 409, "perfil revogado não abre");
    const kinds = (await call(`/profiles/${id}/events`, "GET", undefined, ADMIN.token)).json.data.map((e: any) => e.kind);
    for (const k of ["grant_created", "grant_revoked", "session_started", "session_killed", "profile_revoked", "session_denied"]) assert.ok(kinds.includes(k), `auditoria tem ${k}`);
  });

  it("SB04. autorização só para quem pode (mesma conta, nômade, líder, admin); limite de 14 dias; login inicial é do dono e guarda sem expor", async () => {
    const co = await mkCompanyUser("SB5"), outraEmpresa = await mkCompanyUser("SB6");
    const id = await perfil(co);
    assert.equal((await call(`/profiles/${id}/grants`, "POST", { user_id: outraEmpresa.user.id, minutes: 30 }, co.token)).status, 422, "usuário de outra empresa");
    const n = await mkNomade();
    assert.equal((await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 60 * 24 * 20 }, co.token)).status, 400, "mais de 14 dias");
    assert.equal((await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 60 }, co.token)).status, 201);
    assert.equal((await call(`/profiles/${id}/sessions`, "POST", { mode: "setup" }, n.token)).status, 403, "login inicial só do dono");
    const setup = await call(`/profiles/${id}/sessions`, "POST", { mode: "setup" }, co.token);
    assert.equal(setup.status, 201);
    const salvo = await call(`/sessions/${setup.json.session.id}/save-state`, "POST", {}, co.token);
    if (salvo.status === 503) assert.equal(salvo.json.code, "secret_vault_not_configured", "sem cofre configurado neste ambiente");
    else {
      assert.equal(salvo.status, 200, JSON.stringify(salvo.json));
      const lista = await call("/profiles", "GET", undefined, co.token);
      assert.equal(lista.json.data[0].has_saved_session, true);
      assert.ok(!JSON.stringify(lista.json).includes("ciphertext"));
    }
  });

  it("SB05. a administração cria um navegador da Allka (sem conta dona), abre o login inicial e libera outra pessoa", async () => {
    const n = await mkNomade();
    const r = await call("/profiles", "POST", { label: "Teste Allka", start_url: "https://example.com/", consent: true });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.company_id, null);
    assert.equal((await call(`/profiles/${r.json.id}/sessions`, "POST", { mode: "setup" })).status, 201);
    const g = await call(`/profiles/${r.json.id}/grantable-users`);
    assert.equal(g.status, 200);
    assert.ok(g.json.data.every((u: any) => u.kind !== "Equipe da conta"), "sem equipe de conta: não vaza usuários de outras contas");
    assert.equal((await call(`/profiles/${r.json.id}/grants`, "POST", { user_id: n.user.id, minutes: 15 })).status, 201);
    assert.equal((await call("/profiles", "GET", undefined, n.token)).json.data.some((p: any) => p.id === r.json.id), true, "a pessoa liberada enxerga");
  });

  it("SB06. admin libera para qualquer usuário (até de outra conta) e para um grupo; quem não é admin não libera grupo", async () => {
    const co = await mkCompanyUser("SB7"), outra = await mkCompanyUser("SB8"), n = await mkNomade();
    const r = await call("/profiles", "POST", { label: "Allka geral", start_url: "https://example.com/", consent: true });
    const id = r.json.id as string;
    assert.equal((await call(`/profiles/${id}/grants`, "POST", { user_id: outra.user.id, minutes: 30 })).status, 201, "admin libera usuário de qualquer conta");
    const lista = await call(`/profiles/${id}/grantable-users`);
    assert.ok(lista.json.data.some((u: any) => u.id === co.user.id), "admin enxerga todos para escolher");
    const grp = await call(`/profiles/${id}/grants/group`, "POST", { group: "nomades", minutes: 30 });
    assert.equal(grp.status, 201, JSON.stringify(grp.json));
    assert.ok(grp.json.created >= 1);
    assert.equal((await call("/profiles", "GET", undefined, n.token)).json.data.some((p: any) => p.id === id), true);
    const again = await call(`/profiles/${id}/grants/group`, "POST", { group: "nomades", minutes: 30 });
    assert.equal(again.json.created, 0, "não duplica");
    const dono = await perfil(co);
    assert.equal((await call(`/profiles/${dono}/grants/group`, "POST", { group: "nomades" }, co.token)).status, 403);
  });

  it("SB07. excluir a conta guardada apaga tudo (derruba sessão, autorizações, perfil); sites permitidos têm padrão e podem ser editados; só o dono exclui", async () => {
    const co = await mkCompanyUser("SB9"), outra = await mkCompanyUser("SB10"), n = await mkNomade();
    const id = await perfil(co);
    const lista = (await call("/profiles", "GET", undefined, co.token)).json.data[0];
    assert.deepEqual(lista.allowed_hosts, ["instagram.com", "facebook.com", "fb.com", "meta.com"], "padrão da Meta");
    const up = await call(`/profiles/${id}`, "PATCH", { allowed_hosts: "https://www.Instagram.com/, loja.com.br" }, co.token);
    assert.deepEqual(up.json.allowed_hosts, ["instagram.com", "loja.com.br"]);
    assert.equal(up.json.allowed_hosts_custom, true);
    await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 30 }, co.token);
    const s = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal(s.status, 201);
    assert.equal((await call(`/profiles/${id}`, "DELETE", undefined, outra.token)).status, 404, "outra conta não exclui");
    assert.equal((await call(`/profiles/${id}`, "DELETE", undefined, co.token)).status, 200);
    assert.equal((await call("/profiles", "GET", undefined, co.token)).json.data.length, 0);
    assert.equal((await prisma.browserSession.findMany({ where: { profile_id: id } })).length, 0);
    assert.equal((await prisma.browserAccessGrant.findMany({ where: { profile_id: id } })).length, 0);
    assert.equal((await call("/profiles", "GET", undefined, n.token)).json.data.some((p: any) => p.id === id), false);
    const ev = await prisma.browserSessionEvent.findMany({ where: { profile_id: id } });
    assert.ok(ev.some((e) => e.kind === "profile_deleted"), "auditoria permanece");
  });

  it("SB08. o login guardado vale pelo prazo cadastrado a partir de quando o dono logou: entrar de novo não renova; vencido, só refazendo o login", async () => {
    const co = await mkCompanyUser("SB11"), n = await mkNomade();
    const id = await perfil(co, { max_session_minutes: 60 });
    await call(`/profiles/${id}/grants`, "POST", { user_id: n.user.id, minutes: 600 }, co.token);
    const setup = await call(`/profiles/${id}/sessions`, "POST", { mode: "setup" }, co.token);
    assert.equal((await call(`/sessions/${setup.json.session.id}/save-state`, "POST", {}, co.token)).status, 200);
    // login feito há 40 min: ainda restam ~20 min, e a sessão não passa disso
    await prisma.browserProfile.update({ where: { id }, data: { state_updated_at: new Date(Date.now() - 40 * 60000) } });
    const s1 = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal(s1.status, 201, JSON.stringify(s1.json));
    assert.ok(s1.json.session.remaining_seconds <= 20 * 60 && s1.json.session.remaining_seconds > 18 * 60, "restam ~20 min, não 60: " + s1.json.session.remaining_seconds);
    await call(`/sessions/${s1.json.session.id}/end`, "POST", {}, n.token);
    const s2 = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.ok(s2.json.session.remaining_seconds <= 20 * 60, "entrar de novo não renova");
    await call(`/sessions/${s2.json.session.id}/end`, "POST", {}, n.token);
    // vencido
    await prisma.browserProfile.update({ where: { id }, data: { state_updated_at: new Date(Date.now() - 61 * 60000) } });
    const venc = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal(venc.status, 409);
    assert.equal(venc.json.code, "login_expired");
    assert.equal((await call("/profiles", "GET", undefined, co.token)).json.data[0].login_expired, true);
    // dono refaz o login: volta a valer por 60 min inteiros
    const setup2 = await call(`/profiles/${id}/sessions`, "POST", { mode: "setup" }, co.token);
    await call(`/sessions/${setup2.json.session.id}/save-state`, "POST", {}, co.token);
    const s3 = await call(`/profiles/${id}/sessions`, "POST", {}, n.token);
    assert.equal(s3.status, 201);
    assert.ok(s3.json.session.remaining_seconds > 58 * 60);
  });
});

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { enqueueDelivery, buildIdempotencyKey, processOutboxBatch } from "../lib/comms/delivery-engine";
import { getChannelPref, upsertChannelPref } from "../lib/comms/preferences";
import { estimateAudience, resolveAudienceUserIds } from "../lib/comms/audience";
import { activateCampaign, pauseCampaign, cancelCampaign } from "../lib/comms/campaign-service";
import { activeBannersForUser, acknowledgeBanner, publishNewBannerVersion } from "../lib/comms/banner-service";
import { sendPlatformNotification } from "../lib/comms";

// Canais, campanhas e banners obrigatórios (ata 2026-08, bloco 5/5).

let baseUrl = "";
let server: import("node:http").Server;

const users: string[] = [];
const campaigns: string[] = [];
const banners: string[] = [];
const adminProfiles: string[] = [];

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function mkUser(over: Partial<{ email: string; name: string; role: string; account_type: string; is_active: boolean; phone: string | null; last_login: Date | null }> = {}) {
  const id = `comms-${crypto.randomBytes(6).toString("hex")}`;
  const u = await prisma.user.create({
    data: {
      id,
      email: over.email ?? `${id}@example.test`,
      password_hash: "x",
      name: over.name ?? `User ${id}`,
      role: over.role ?? "company_user",
      account_type: over.account_type ?? "empresas",
      is_active: over.is_active ?? true,
      status: "ativo",
      phone: over.phone === undefined ? null : over.phone,
      last_login: over.last_login === undefined ? new Date() : over.last_login,
    },
  });
  users.push(u.id);
  return u;
}

async function mkAdmin(opts: { withProfileNoPerm?: boolean } = {}) {
  let admin_profile_id: string | undefined;
  if (opts.withProfileNoPerm) {
    const p = await prisma.adminProfile.create({ data: { name: `NoPerm ${crypto.randomBytes(5).toString("hex")}`, is_master: false, is_active: true } });
    adminProfiles.push(p.id);
    admin_profile_id = p.id;
  }
  const id = `comms-admin-${crypto.randomBytes(6).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Admin ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id },
  });
  users.push(u.id);
  return u;
}

async function mkCampaign(over: Partial<{ channels: string[]; audience: unknown; status: string; is_reengagement: boolean; title: string; scheduled_at: Date | null; ends_at: Date | null }> = {}) {
  const c = await prisma.communicationCampaign.create({
    data: {
      internal_name: `camp ${crypto.randomBytes(4).toString("hex")}`,
      title: over.title ?? "Novidade Allka",
      body: "Temos novidades para você.",
      channels_json: JSON.stringify(over.channels ?? ["platform"]),
      audience_json: JSON.stringify(over.audience ?? {}),
      status: over.status ?? "draft",
      is_reengagement: over.is_reengagement ?? false,
      scheduled_at: over.scheduled_at ?? null,
      ends_at: over.ends_at ?? null,
    },
  });
  campaigns.push(c.id);
  return c;
}

async function mkBanner(over: Partial<{ kind: string; version: number; starts_at: Date; ends_at: Date | null; is_active: boolean; is_cancelled: boolean; audience: unknown; title: string }> = {}) {
  const b = await prisma.mandatoryBanner.create({
    data: {
      title: over.title ?? "Aviso importante",
      body: "Leia com atenção.",
      kind: over.kind ?? "obrigatorio",
      version: over.version ?? 1,
      audience_json: JSON.stringify(over.audience ?? {}),
      starts_at: over.starts_at ?? new Date(Date.now() - 60_000),
      ends_at: over.ends_at ?? null,
      is_active: over.is_active ?? true,
      is_cancelled: over.is_cancelled ?? false,
    },
  });
  banners.push(b.id);
  return b;
}

describe("Comunicação: canais, campanhas e banners", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const l = app.listen(0);
    server = l;
    await new Promise<void>((r) => l.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(l.address() as AddressInfo).port}`;
  });
  after(async () => {
    await prisma.communicationDelivery.deleteMany({ where: { recipient_user_id: { in: users } } });
    await prisma.campaignRecipientState.deleteMany({ where: { campaign_id: { in: campaigns } } });
    await prisma.communicationCampaign.deleteMany({ where: { id: { in: campaigns } } });
    await prisma.bannerAcknowledgement.deleteMany({ where: { banner_id: { in: banners } } });
    await prisma.mandatoryBanner.deleteMany({ where: { id: { in: banners } } });
    await prisma.pushSubscription.deleteMany({ where: { user_id: { in: users } } });
    await prisma.userCommunicationChannelPref.deleteMany({ where: { user_id: { in: users } } });
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("entrega interna (platform) é isolada por usuário e cai no painel de Notificações", async () => {
    const a = await mkUser();
    const b = await mkUser();
    await sendPlatformNotification({ recipientUserIds: [a.id], title: "Só para A", body: "oi A", dispatchKey: `iso-${crypto.randomBytes(3).toString("hex")}` });
    await processOutboxBatch();

    const alertsA = await prisma.systemAlert.findMany({ where: { user_id: a.id, type: "comms.notification" } });
    const alertsB = await prisma.systemAlert.findMany({ where: { user_id: b.id, type: "comms.notification" } });
    assert.equal(alertsA.length, 1);
    assert.equal(alertsA[0].category, "notificacao", "nunca vira alerta");
    assert.equal(alertsB.length, 0, "não aparece para outra conta");
  });

  it("idempotência da entrega: retry / job concorrente não cria segunda entrega", async () => {
    const u = await mkUser();
    const key = { origin: "notification" as const, originId: null, recipientUserId: u.id, channel: "platform" as const, dispatchKey: `idem-${crypto.randomBytes(3).toString("hex")}`, scheduledFor: new Date(), render: { title: "t", body: "b" } };
    const r1 = await enqueueDelivery(key);
    const r2 = await enqueueDelivery(key); // retry
    const [r3, r4] = await Promise.all([enqueueDelivery(key), enqueueDelivery(key)]); // corrida
    assert.equal(r1.created, true);
    assert.equal(r2.created, false);
    assert.equal(r3.created, false);
    assert.equal(r4.created, false);
    const count = await prisma.communicationDelivery.count({ where: { idempotency_key: buildIdempotencyKey(key) } });
    assert.equal(count, 1);
  });

  it("preferência por canal: canal desligado → entrega marcada skipped_by_preference (não envia)", async () => {
    const u = await mkUser();
    await upsertChannelPref(u.id, { platform_enabled: false });
    const r = await enqueueDelivery({
      origin: "campaign", originId: null, recipientUserId: u.id, channel: "platform",
      dispatchKey: `pref-${crypto.randomBytes(3).toString("hex")}`, scheduledFor: new Date(), render: { title: "t", body: "b" },
    });
    const row = await prisma.communicationDelivery.findUnique({ where: { id: r.id } });
    assert.equal(row?.status, "skipped_by_preference");
    await processOutboxBatch();
    const alerts = await prisma.systemAlert.count({ where: { user_id: u.id, type: "comms.campaign" } });
    assert.equal(alerts, 0, "nada é entregue pelo canal desligado");
  });

  it("canal não configurado (email/whatsapp/push) NUNCA finge entrega — marca channel_not_configured + preview", async () => {
    const u = await mkUser({ phone: "11999998888", email: "real-nao-usar@example.test" });
    for (const channel of ["email", "whatsapp", "push"] as const) {
      // liga a preferência do canal p/ chegar até o adaptador
      await upsertChannelPref(u.id, { email_enabled: true, whatsapp_enabled: true, push_enabled: true });
      if (channel === "push") {
        await prisma.pushSubscription.create({ data: { user_id: u.id, endpoint: `https://x/${crypto.randomBytes(4).toString("hex")}`, endpoint_hash: crypto.randomBytes(16).toString("hex"), p256dh: "k", auth: "a" } });
      }
      const r = await enqueueDelivery({
        origin: "campaign", originId: null, recipientUserId: u.id, channel,
        dispatchKey: `nc-${channel}-${crypto.randomBytes(3).toString("hex")}`, scheduledFor: new Date(), render: { title: "t", body: "b" },
      });
      await processOutboxBatch();
      const row = await prisma.communicationDelivery.findUnique({ where: { id: r.id } });
      assert.equal(row?.status, "channel_not_configured", `${channel} não finge entrega`);
      assert.notEqual(row?.status, "delivered");
      assert.ok(row?.failure_summary && row.failure_summary.length > 0);
      assert.ok(row?.preview_json, "preview capturado localmente");
    }
  });

  it("público é recalculado no servidor: user_ids no filtro é interseccionado, nunca é a fonte da verdade", async () => {
    const active = await mkUser({ account_type: "nomades" });
    const inactive = await mkUser({ account_type: "nomades", is_active: false });
    // filtro pede os dois ids, mas account_state=active → só o ativo
    const ids = await resolveAudienceUserIds({ principal_types: ["nomades"], account_state: "active", user_ids: [active.id, inactive.id] });
    assert.ok(ids.includes(active.id));
    assert.ok(!ids.includes(inactive.id));
  });

  it("reengajamento por inatividade: só entram usuários sem acesso há N dias", async () => {
    const stale = await mkUser({ account_type: "empresas", last_login: new Date(Date.now() - 40 * 86400000) });
    const fresh = await mkUser({ account_type: "empresas", last_login: new Date() });
    const ids = await resolveAudienceUserIds({ principal_types: ["empresas"], last_access_days: 30, user_ids: [stale.id, fresh.id] });
    assert.ok(ids.includes(stale.id));
    assert.ok(!ids.includes(fresh.id));
  });

  it("consentimento: campanha de reengajamento exige marketing_opt_in", async () => {
    const optIn = await mkUser({ account_type: "empresas", last_login: new Date(Date.now() - 40 * 86400000) });
    const optOut = await mkUser({ account_type: "empresas", last_login: new Date(Date.now() - 40 * 86400000) });
    await upsertChannelPref(optIn.id, { marketing_opt_in: true, platform_enabled: true });
    await upsertChannelPref(optOut.id, { marketing_opt_in: false, platform_enabled: true });

    const c = await mkCampaign({ channels: ["platform"], is_reengagement: true, audience: { principal_types: ["empresas"], last_access_days: 30, user_ids: [optIn.id, optOut.id] } });
    const admin = await mkAdmin();
    await activateCampaign(c.id, admin.id);
    await processOutboxBatch();

    assert.equal(await prisma.systemAlert.count({ where: { user_id: optIn.id, type: "comms.campaign" } }), 1);
    assert.equal(await prisma.systemAlert.count({ where: { user_id: optOut.id, type: "comms.campaign" } }), 0, "sem opt-in não recebe");
    const skipped = await prisma.communicationDelivery.findFirst({ where: { origin: "campaign", origin_id: c.id, recipient_user_id: optOut.id } });
    assert.equal(skipped?.status, "skipped_by_preference");
  });

  it("estimativa do público mostra sem-contato / sem-consentimento / entregas possíveis", async () => {
    const withOptIn = await mkUser({ account_type: "agencias", last_login: new Date(Date.now() - 40 * 86400000) });
    const noOptIn = await mkUser({ account_type: "agencias", last_login: new Date(Date.now() - 40 * 86400000) });
    await upsertChannelPref(withOptIn.id, { marketing_opt_in: true, platform_enabled: true });
    const est = await estimateAudience(
      { principal_types: ["agencias"], last_access_days: 30, user_ids: [withOptIn.id, noOptIn.id] },
      ["platform"],
      { requiresOptIn: true },
    );
    assert.equal(est.estimated, 2);
    assert.equal(est.without_consent, 1);
    assert.equal(est.possible_deliveries, 1);
  });

  it("campanha: rascunho → ativa → concluída; ativação é idempotente (não duplica entregas)", async () => {
    const u1 = await mkUser({ account_type: "empresas" });
    const u2 = await mkUser({ account_type: "empresas" });
    const admin = await mkAdmin();
    const c = await mkCampaign({ channels: ["platform"], audience: { principal_types: ["empresas"], user_ids: [u1.id, u2.id] } });

    const r1 = await activateCampaign(c.id, admin.id);
    assert.equal(r1.queued, 2);
    assert.equal((await prisma.communicationCampaign.findUnique({ where: { id: c.id } }))?.status, "completed");

    // segunda ativação (retry / clique duplo) — reabre p/ processing e não recria entregas
    await prisma.communicationCampaign.update({ where: { id: c.id }, data: { status: "paused" } });
    await activateCampaign(c.id, admin.id);
    const deliveries = await prisma.communicationDelivery.count({ where: { origin: "campaign", origin_id: c.id } });
    assert.equal(deliveries, 2, "idempotente — 1 entrega por (usuário, canal)");
  });

  it("campanha: pausar segura entregas pendentes; cancelar encerra tudo", async () => {
    const u = await mkUser({ account_type: "empresas" });
    const c = await mkCampaign({ channels: ["platform"], status: "scheduled", audience: { principal_types: ["empresas"], user_ids: [u.id] } });
    // cria uma entrega pendente manualmente (agendada p/ o futuro, não processada)
    await enqueueDelivery({ origin: "campaign", originId: c.id, recipientUserId: u.id, channel: "platform", dispatchKey: "future", scheduledFor: new Date(Date.now() + 3600_000), render: { title: "t", body: "b" } });
    const paused = await pauseCampaign(c.id);
    assert.equal(paused.deliveries_held, 1);
    assert.equal((await prisma.communicationCampaign.findUnique({ where: { id: c.id } }))?.status, "paused");
    const cancelled = await cancelCampaign(c.id);
    assert.equal((await prisma.communicationCampaign.findUnique({ where: { id: c.id } }))?.status, "cancelled");
    void cancelled;
  });

  it("banner obrigatório aparece para o público e some após a ciência; nova versão reaparece", async () => {
    const u = await mkUser();
    const b = await mkBanner({ audience: { user_ids: [u.id] } });

    let mine = await activeBannersForUser(u.id);
    assert.ok(mine.find((x) => x.id === b.id), "aparece antes da ciência");

    await acknowledgeBanner(b.id, u.id);
    mine = await activeBannersForUser(u.id);
    assert.ok(!mine.find((x) => x.id === b.id), "some após a ciência da versão atual");

    // clique duplo / retry — idempotente
    await acknowledgeBanner(b.id, u.id);
    assert.equal(await prisma.bannerAcknowledgement.count({ where: { banner_id: b.id, user_id: u.id } }), 1);

    await publishNewBannerVersion(b.id);
    mine = await activeBannersForUser(u.id);
    assert.ok(mine.find((x) => x.id === b.id), "nova versão exige nova ciência");
  });

  it("banner: fora da janela (expirado) ou cancelado não aparece", async () => {
    const u = await mkUser();
    const expired = await mkBanner({ audience: { user_ids: [u.id] }, starts_at: new Date(Date.now() - 86400000), ends_at: new Date(Date.now() - 3600_000) });
    const cancelled = await mkBanner({ audience: { user_ids: [u.id] }, is_cancelled: true });
    const future = await mkBanner({ audience: { user_ids: [u.id] }, starts_at: new Date(Date.now() + 86400000) });
    const mine = await activeBannersForUser(u.id);
    for (const b of [expired, cancelled, future]) {
      assert.ok(!mine.find((x) => x.id === b.id), `${b.id} não deve aparecer`);
    }
  });

  it("ciência por usuário: a de um usuário não conta para outro", async () => {
    const a = await mkUser();
    const bUser = await mkUser();
    const banner = await mkBanner({ audience: { user_ids: [a.id, bUser.id] } });
    await acknowledgeBanner(banner.id, a.id);
    assert.ok(!(await activeBannersForUser(a.id)).find((x) => x.id === banner.id));
    assert.ok((await activeBannersForUser(bUser.id)).find((x) => x.id === banner.id), "B ainda precisa dar ciência");
  });

  it("HTTP: ciência sempre pela sessão — POST /api/comms/banners/:id/ack ignora qualquer user_id no corpo", async () => {
    const a = await mkUser();
    const victim = await mkUser();
    const banner = await mkBanner({ audience: { user_ids: [a.id, victim.id] } });
    const res = await api(`/api/comms/banners/${banner.id}/ack`, { method: "POST", token: tokenFor(a), body: { user_id: victim.id } });
    assert.equal(res.status, 200);
    const forVictim = await prisma.bannerAcknowledgement.count({ where: { banner_id: banner.id, user_id: victim.id } });
    assert.equal(forVictim, 0, "não deu ciência em nome de outro");
    const forA = await prisma.bannerAcknowledgement.count({ where: { banner_id: banner.id, user_id: a.id } });
    assert.equal(forA, 1);
  });

  it("HTTP: sem sessão → 401; usuário comum não cria campanha; admin sem permissão → 403", async () => {
    assert.equal((await api("/api/admin/comms/campaigns")).status, 401);

    const common = await mkUser({ role: "company_user", account_type: "empresas" });
    const r1 = await api("/api/admin/comms/campaigns", { method: "POST", token: tokenFor(common), body: { internal_name: "x", title: "x", body: "x", channels: ["platform"], audience: {} } });
    assert.equal(r1.status, 403);

    const adminNoPerm = await mkAdmin({ withProfileNoPerm: true });
    const r2 = await api("/api/admin/comms/campaigns", { method: "POST", token: tokenFor(adminNoPerm), body: { internal_name: "x", title: "x", body: "x", channels: ["platform"], audience: {} } });
    assert.equal(r2.status, 403, "perfil admin sem permissão 'sistema' não cria campanha");

    const admin = await mkAdmin();
    const r3 = await api("/api/admin/comms/campaigns", { method: "POST", token: tokenFor(admin), body: { internal_name: "x", title: "x", body: "y", channels: ["platform"], audience: {} } });
    assert.equal(r3.status, 201);
    if (r3.json?.id) campaigns.push(r3.json.id);
  });

  it("HTTP: alterar o público por payload de ativação não funciona — servidor recalcula do registro", async () => {
    const inAudience = await mkUser({ account_type: "empresas" });
    const outsider = await mkUser({ account_type: "empresas" });
    const admin = await mkAdmin();
    const c = await mkCampaign({ channels: ["platform"], audience: { principal_types: ["empresas"], user_ids: [inAudience.id] } });
    // tenta injetar o outsider no corpo da ativação
    const res = await api(`/api/admin/comms/campaigns/${c.id}/activate`, { method: "POST", token: tokenFor(admin), body: { audience: { user_ids: [outsider.id] }, user_ids: [outsider.id] } });
    assert.equal(res.status, 200);
    await processOutboxBatch();
    assert.equal(await prisma.systemAlert.count({ where: { user_id: outsider.id, type: "comms.campaign" } }), 0, "corpo da ativação não muda o público");
    assert.equal(await prisma.systemAlert.count({ where: { user_id: inAudience.id, type: "comms.campaign" } }), 1);
  });

  it("concorrência do job: duas varreduras simultâneas nunca entregam a mesma linha duas vezes", async () => {
    const list = await Promise.all(Array.from({ length: 6 }, () => mkUser()));
    for (const u of list) {
      await enqueueDelivery({ origin: "notification", originId: null, recipientUserId: u.id, channel: "platform", dispatchKey: `conc-${crypto.randomBytes(3).toString("hex")}`, scheduledFor: new Date(), render: { title: "t", body: "b" } });
    }
    await Promise.all([processOutboxBatch(), processOutboxBatch(), processOutboxBatch()]);
    for (const u of list) {
      const alerts = await prisma.systemAlert.count({ where: { user_id: u.id, type: "comms.notification" } });
      assert.equal(alerts, 1, "exatamente uma entrega por destinatário");
    }
    const stuck = await prisma.communicationDelivery.count({ where: { recipient_user_id: { in: list.map((u) => u.id) }, status: "processing" } });
    assert.equal(stuck, 0, "nenhuma linha fica presa em processing");
  });

  it("HTTP: preferências e push status do próprio usuário", async () => {
    const u = await mkUser();
    const t = tokenFor(u);
    const get = await api("/api/comms/preferences", { token: t });
    assert.equal(get.status, 200);
    assert.equal(get.json.preferences.platform_enabled, true);
    assert.ok(Array.isArray(get.json.channel_status));

    const put = await api("/api/comms/preferences", { method: "PUT", token: t, body: { marketing_opt_in: true, email_enabled: false } });
    assert.equal(put.status, 200);
    assert.equal(put.json.preferences.marketing_opt_in, true);
    assert.equal(put.json.preferences.email_enabled, false);

    const push = await api("/api/comms/push/status", { token: t });
    assert.equal(push.status, 200);
    assert.equal(push.json.configured, false, "sem VAPID no ambiente de teste");
  });

  it("job agendado ativa campanha 'scheduled' quando chega a hora (não depende de tela aberta)", async () => {
    const u = await mkUser({ account_type: "empresas" });
    const c = await mkCampaign({ channels: ["platform"], status: "scheduled", scheduled_at: new Date(Date.now() - 1000), audience: { principal_types: ["empresas"], user_ids: [u.id] } });
    const { runCommsSchedulerOnce } = await import("../lib/comms");
    await runCommsSchedulerOnce();
    assert.equal((await prisma.communicationCampaign.findUnique({ where: { id: c.id } }))?.status, "completed");
    assert.equal(await prisma.systemAlert.count({ where: { user_id: u.id, type: "comms.campaign" } }), 1);
  });
});

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME, ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION, runImport } from "../legacy/importer";
import { collectAlertsNotificationsChatSnapshot } from "../legacy/collect-alerts-notifications-chat";

// Extensão do Legado para ALERTAS, NOTIFICAÇÕES e CHAT (bloco seguinte ao
// financeiro).
//
// Prova, SÓ em banco descartável (allka_legacy_test_* + TEST_DATABASE_URL):
//  - alerta automático (com padrão/regra) e manual (avulso), com
//    destinatário/eventos/resolução, são preservados com id e relação;
//  - notificação com grupo (+membro+sala de chat), regra e preferência de
//    canal são preservadas;
//  - conversa com participantes, mensagens (com resposta implícita por
//    ordem/tempo — não existe reply-to real no schema) e anexo... (não
//    existe anexo de chat no schema real — documentado, não inventado);
//  - segredo colado em texto livre (alerta/notificação/mensagem) é
//    sanitizado; tokens/webhook secrets nunca são sequer lidos;
//  - paginação real, idempotência, divergência;
//  - coexistência com os 4 lotes anteriores;
//  - API do Legado só lê (nenhum verbo de responder/enviar/resolver/
//    arquivar/marcar como lido/editar/excluir);
//  - nenhum registro operacional muda.

const backendRoot = path.resolve(__dirname, "..", "..");

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-10T00:00:00.000Z");
const OFFICIAL_SOURCE = "Alertas, Notificações e Chat — Allka (teste descartável)";

const userIds: string[] = [];
const adminProfileIds: string[] = [];

const seeded = {
  userAId: "",
  userBId: "",
  standardId: "",
  ruleId: "",
  automaticAlertId: "",
  manualAlertId: "",
  alertEventId: "",
  notificationMessageId: "",
  notificationRuleId: "",
  notificationGroupId: "",
  notificationGroupMemberId: "",
  conversationId: "",
  participantAId: "",
  messageId: "",
  messageWithSecretId: "",
};

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(pathname: string, opts: { token?: string } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, { headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) } });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkMaster() {
  const id = `legcom-tok-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `LegCom ${id}`, is_master: true, is_active: true } });
  adminProfileIds.push(p.id);
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  userIds.push(u.id);
  return u;
}

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

describe("Legado — snapshot de alertas, notificações e chat", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "";
    assert.ok(adminUrl, "TEST_DATABASE_ADMIN_URL necessário");
    const adm = new URL(adminUrl);
    legacyDbName = `allka_legacy_test_${crypto.randomBytes(5).toString("hex")}`;
    assert.ok(legacyDbName.includes("_test_"), "banco legado tem de ser descartável (_test_)");
    legacyUrl = `mysql://${adm.username}:${adm.password}@${adm.hostname}:${adm.port || 3306}/${legacyDbName}`;

    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
      multipleStatements: true,
    });
    await conn.query(`CREATE DATABASE \`${legacyDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${legacyDbName}\`;`);
    for (const m of ["20260901120000_init_legacy_snapshot", "20260910120000_legacy_batch_kind_and_seal"]) {
      const sql = fs.readFileSync(path.join(backendRoot, `prisma/legacy/migrations/${m}/migration.sql`), "utf8");
      await conn.query(sql);
    }
    await conn.end();

    process.env.LEGACY_DATABASE_URL = legacyUrl;
    app = (await import("../app")).default;

    // ── Fixtures mínimas ─────────────────────────────────────────────────
    const userA = await prisma.user.create({
      data: { id: `legcom-a-${crypto.randomBytes(4).toString("hex")}`, email: `a-${crypto.randomBytes(3).toString("hex")}@example.test`, password_hash: "x", name: "Destinatário A", role: "company_user", account_type: "empresas", status: "ativo", is_active: true },
    });
    userIds.push(userA.id);
    seeded.userAId = userA.id;

    const userB = await prisma.user.create({
      data: { id: `legcom-b-${crypto.randomBytes(4).toString("hex")}`, email: `b-${crypto.randomBytes(3).toString("hex")}@example.test`, password_hash: "SEGREDO_DO_USUARIO_B_NUNCA_NO_LEGADO", name: "Autor B", role: "company_admin", account_type: "empresas", status: "ativo", is_active: true },
    });
    userIds.push(userB.id);
    seeded.userBId = userB.id;

    const standard = await prisma.alertStandard.create({
      data: { key: `test.due_soon.${crypto.randomBytes(3).toString("hex")}`, name: "Prazo próximo (teste)", title: "Sua tarefa vence em breve", message: "A tarefa {{tarefa}} vence em {{prazo}}", allowed_variables_json: JSON.stringify(["tarefa", "prazo"]) },
    });
    seeded.standardId = standard.id;

    const rule = await prisma.alertRule.create({
      data: { standard_id: standard.id, name: "Regra de teste", trigger_type: "task.due_soon", recipient_roles_json: JSON.stringify(["responsavel"]) },
    });
    seeded.ruleId = rule.id;

    const automaticAlert = await prisma.systemAlert.create({
      data: {
        type: "tarefa_atrasada",
        title: "Tarefa atrasada (teste)",
        message: "Contém um segredo colado à mão: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        severity: "error",
        category: "alerta",
        user_id: userA.id,
        standard_id: standard.id,
        rule_id: rule.id,
        automatic_resolved_at: new Date(),
        automatic_resolution_reason: "task_completed",
      },
    });
    seeded.automaticAlertId = automaticAlert.id;

    const alertEvent = await prisma.systemAlertEvent.create({
      data: { alert_id: automaticAlert.id, event_type: "created", description: "Alerta criado pelo motor", actor_user_id: null },
    });
    seeded.alertEventId = alertEvent.id;

    const manualAlert = await prisma.systemAlert.create({
      data: { type: "aviso_avulso", title: "Aviso manual (teste)", message: "Mensagem comum, sem segredo", severity: "info", category: "notificacao", user_id: userA.id, created_by_user_id: userB.id },
    });
    seeded.manualAlertId = manualAlert.id;

    const notificationMessage = await prisma.notificationMessage.create({ data: { name: "Msg de teste", title: "Título", content: "Conteúdo da notificação", created_by: userB.id } });
    seeded.notificationMessageId = notificationMessage.id;
    const notificationRule = await prisma.notificationRule.create({ data: { message_id: notificationMessage.id, name: "Regra de notificação de teste" } });
    seeded.notificationRuleId = notificationRule.id;

    const conversation = await prisma.conversation.create({ data: { title: "Grupo de teste", type: "group", created_by_id: userB.id } });
    seeded.conversationId = conversation.id;

    const notificationGroup = await prisma.notificationGroup.create({ data: { owner_user_id: userB.id, name: "Grupo Financeiro (teste)", status: "active", conversation_id: conversation.id } });
    seeded.notificationGroupId = notificationGroup.id;
    const notificationGroupMember = await prisma.notificationGroupMember.create({ data: { group_id: notificationGroup.id, user_id: userA.id } });
    seeded.notificationGroupMemberId = notificationGroupMember.id;

    const participantA = await prisma.chatParticipant.create({ data: { conversation_id: conversation.id, user_id: userA.id, role: "member" } });
    seeded.participantAId = participantA.id;
    await prisma.chatParticipant.create({ data: { conversation_id: conversation.id, user_id: userB.id, role: "owner" } });

    const message = await prisma.chatMessage.create({ data: { conversation_id: conversation.id, sender_id: userB.id, content: "Olá, tudo bem?" } });
    seeded.messageId = message.id;
    const messageWithSecret = await prisma.chatMessage.create({
      data: { conversation_id: conversation.id, sender_id: userA.id, content: "Aqui vai minha chave: " + "a".repeat(64) },
    });
    seeded.messageWithSecretId = messageWithSecret.id;

    await prisma.notificationPreference.create({ data: { user_id: userA.id, event_type: "tarefa_prazo", channel: "in_app", enabled: true } });
    await prisma.userCommunicationChannelPref.upsert({ where: { user_id: userA.id }, create: { user_id: userA.id }, update: {} });

    const banner = await prisma.mandatoryBanner.create({ data: { title: "Aviso obrigatório (teste)", body: "Corpo do aviso", audience_json: "[]", starts_at: new Date(), created_by_user_id: userB.id } });
    await prisma.bannerAcknowledgement.create({ data: { banner_id: banner.id, user_id: userA.id, version: 1 } });

    await prisma.communicationDelivery.create({
      data: { origin: "notification", origin_id: notificationMessage.id, recipient_user_id: userA.id, channel: "platform", status: "delivered", scheduled_for: new Date(), delivered_at: new Date(), idempotency_key: `idem-${crypto.randomBytes(4).toString("hex")}` },
    });
    // Campanha: deve ser IGNORADA pelo coletor (fora de escopo).
    await prisma.communicationDelivery.create({
      data: { origin: "campaign", recipient_user_id: userA.id, channel: "email", status: "delivered", scheduled_for: new Date(), idempotency_key: `idem-camp-${crypto.randomBytes(4).toString("hex")}` },
    });

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.communicationDelivery.deleteMany({ where: { recipient_user_id: { in: [seeded.userAId] } } });
    await prisma.bannerAcknowledgement.deleteMany({ where: { user_id: seeded.userAId } });
    await prisma.mandatoryBanner.deleteMany({ where: { created_by_user_id: seeded.userBId } });
    await prisma.userCommunicationChannelPref.deleteMany({ where: { user_id: seeded.userAId } });
    await prisma.notificationPreference.deleteMany({ where: { user_id: seeded.userAId } });
    await prisma.chatMessage.deleteMany({ where: { conversation_id: seeded.conversationId } });
    await prisma.chatParticipant.deleteMany({ where: { conversation_id: seeded.conversationId } });
    await prisma.notificationGroupMember.deleteMany({ where: { id: seeded.notificationGroupMemberId } });
    await prisma.notificationGroup.deleteMany({ where: { id: seeded.notificationGroupId } });
    await prisma.conversation.deleteMany({ where: { id: seeded.conversationId } });
    await prisma.notificationRule.deleteMany({ where: { id: seeded.notificationRuleId } });
    await prisma.notificationMessage.deleteMany({ where: { id: seeded.notificationMessageId } });
    await prisma.systemAlertEvent.deleteMany({ where: { alert_id: seeded.automaticAlertId } });
    await prisma.systemAlert.deleteMany({ where: { id: { in: [seeded.automaticAlertId, seeded.manualAlertId] } } });
    await prisma.alertRule.deleteMany({ where: { id: seeded.ruleId } });
    await prisma.alertStandard.deleteMany({ where: { id: seeded.standardId } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "legacy_consultation." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfileIds } } });
    await prisma.$disconnect();
    const adm = new URL(adminUrl);
    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${legacyDbName}\`;`);
    await conn.end();
  });

  it("processa em PÁGINAS de verdade (pageSize pequeno não perde nenhum registro)", async () => {
    const full = await collectAlertsNotificationsChatSnapshot(prisma);
    const paginatedSmall = await collectAlertsNotificationsChatSnapshot(prisma, { pageSize: 1 });
    assert.deepEqual(paginatedSmall.sourceCounts, full.sourceCounts);
    assert.ok(full.sourceCounts.system_alert >= 2 && full.sourceCounts.chat_message >= 2);
  });

  it("prévia: preserva alerta automático (+padrão/regra/evento), alerta manual, notificação (+grupo+membro+regra), conversa/participantes/mensagens, banner e preferências — com id e relações", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "preview",
      sourceName: DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME,
      collectors: [(db) => collectAlertsNotificationsChatSnapshot(db)],
      importerVersion: ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "preview");
    assert.equal(res.sealed, false);
    assert.equal(res.status, "completed");
    for (const [entity, r] of Object.entries(res.reconciliation)) assert.equal(r.divergence, 0, `divergência 0 para ${entity}`);

    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME } });
      assert.equal(batch.importer_version, ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION);

      const byId = async (entity_type: string, original_id: string) => legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type, original_id } });

      assert.ok(await byId("alert_standard", seeded.standardId));
      assert.ok(await byId("alert_rule", seeded.ruleId));
      assert.ok(await byId("system_alert", seeded.automaticAlertId));
      assert.ok(await byId("system_alert", seeded.manualAlertId));
      assert.ok(await byId("system_alert_event", seeded.alertEventId));
      assert.ok(await byId("notification_message", seeded.notificationMessageId));
      assert.ok(await byId("notification_rule", seeded.notificationRuleId));
      assert.ok(await byId("notification_group", seeded.notificationGroupId));
      assert.ok(await byId("notification_group_member", seeded.notificationGroupMemberId));
      assert.ok(await byId("conversation", seeded.conversationId));
      assert.ok(await byId("chat_participant", seeded.participantAId));
      assert.ok(await byId("chat_message", seeded.messageId));
      assert.ok(await byId("user_communication_channel_pref", seeded.userAId));

      // Campanha filtrada fora: só 1 communication_delivery (origin=notification).
      const deliveries = await legacy.legacyRecordSnapshot.findMany({ where: { batch_id: batch.id, entity_type: "communication_delivery" } });
      assert.equal(deliveries.length, 1, "delivery de campanha nunca entra neste domínio");

      const rel = async (relation_type: string, to_original_id: string) => legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type, to_original_id } });
      assert.ok(await rel("belongs_to_standard", seeded.standardId));
      assert.ok(await rel("alert_recipient", seeded.userAId));
      assert.ok(await rel("from_standard", seeded.standardId));
      assert.ok(await rel("from_rule", seeded.ruleId));
      assert.ok(await rel("alert_created_by", seeded.userBId));
      assert.ok(await rel("belongs_to_alert", seeded.automaticAlertId));
      assert.ok(await rel("belongs_to_message", seeded.notificationMessageId));
      assert.ok(await rel("group_owner", seeded.userBId));
      assert.ok(await rel("group_conversation", seeded.conversationId));
      assert.ok(await rel("belongs_to_group", seeded.notificationGroupId));
      assert.ok(await rel("belongs_to_conversation", seeded.conversationId));
      assert.ok(await rel("participant_user", seeded.userAId));
      assert.ok(await rel("message_author", seeded.userBId));
    } finally {
      await legacy.$disconnect();
    }
  });

  it("sanitiza segredo colado em texto livre (mensagem de alerta e mensagem de chat) sem excluir o registro", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME } });

      const alertRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, entity_type: "system_alert", original_id: seeded.automaticAlertId } });
      assert.equal(alertRec.sanitized, true, "alerta com JWT colado na mensagem é marcado como sanitizado");
      assert.doesNotMatch(alertRec.content_json, /eyJhbGciOiJIUzI1NiJ9/);

      const msgRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, entity_type: "chat_message", original_id: seeded.messageWithSecretId } });
      assert.equal(msgRec.sanitized, true, "mensagem com chave hex de 64+ é marcada como sanitizada");
      assert.doesNotMatch(msgRec.content_json, /a{64}/);

      // A mensagem comum, sem segredo, continua legível e NÃO marcada.
      const plainMsgRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, entity_type: "chat_message", original_id: seeded.messageId } });
      assert.equal(plainMsgRec.sanitized, false);
      assert.equal(JSON.parse(plainMsgRec.content_json).content, "Olá, tudo bem?");
    } finally {
      await legacy.$disconnect();
    }
  });

  it("NUNCA copia password_hash, credenciais ou payload bruto de entrega", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME } });
      const allRecords = await legacy.legacyRecordSnapshot.findMany({ where: { batch_id: batch.id } });
      assert.ok(allRecords.length > 0);
      for (const rec of allRecords) {
        assert.doesNotMatch(rec.content_json, /SEGREDO_DO_USUARIO_B_NUNCA_NO_LEGADO/);
        const content = JSON.parse(rec.content_json) as Record<string, unknown>;
        for (const forbidden of ["password_hash", "token", "webhook_secret", "endpoint", "p256dh", "auth", "metadata_json", "preview_json", "session"]) {
          assert.ok(!(forbidden in content), `campo "${forbidden}" não deveria existir em ${rec.entity_type}`);
        }
      }
      // PushSubscription nunca é coletada como entity_type — nem por engano.
      assert.equal(await legacy.legacyRecordSnapshot.count({ where: { batch_id: batch.id, source_table: "push_subscriptions" } }), 0);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("snapshot OFICIAL: lote próprio, selado, coexiste com os lotes anteriores", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectAlertsNotificationsChatSnapshot(db)],
      importerVersion: ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "official");
    assert.equal(res.sealed, true);

    const legacy = await openLegacy();
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      assert.ok(official.sealed_at);
      const preview = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME } });
      assert.ok(preview.id !== official.id);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("oficial selado: reexecução idempotente; divergência interrompe e não sela de novo", async () => {
    const idempotent = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectAlertsNotificationsChatSnapshot(db)],
      importerVersion: ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(idempotent.status, "validated_official");
    assert.equal(idempotent.totals.changed, 0);

    await prisma.systemAlert.update({ where: { id: seeded.manualAlertId }, data: { is_read: true } });
    try {
      let err: any;
      await runImport({
        dryRun: false,
        kind: "official",
        sourceName: OFFICIAL_SOURCE,
        sourceEnvironment: "producao",
        snapshotAt: OFFICIAL_SNAPSHOT_AT,
        acknowledgeOfficial: true,
        collectors: [(db) => collectAlertsNotificationsChatSnapshot(db)],
        importerVersion: ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
        legacyImportUrl: legacyUrl,
      }).catch((e) => (err = e));
      assert.ok(err);
      assert.equal(err.code, "official_divergence");
    } finally {
      await prisma.systemAlert.update({ where: { id: seeded.manualAlertId }, data: { is_read: false } });
    }
  });

  it("API do Legado: busca por grupo (alertas/notificacoes/chat), status, relacionado a usuário e período; sem ação de escrita", async () => {
    const t = tokenFor(await mkMaster());

    const alertsOnly = await api(`/api/admin/legacy/alerts-notifications-chat?group=alertas`, { token: t });
    assert.equal(alertsOnly.status, 200);
    assert.ok(alertsOnly.json.data.length >= 2);

    const chatOnly = await api(`/api/admin/legacy/alerts-notifications-chat?group=chat&entity_type=chat_message`, { token: t });
    assert.ok(chatOnly.json.data.length >= 2);

    const byRecipient = await api(`/api/admin/legacy/alerts-notifications-chat?related_to=${seeded.userAId}`, { token: t });
    assert.ok(byRecipient.json.total >= 3, "alerta + participante de chat + preferência ligados ao usuário aparecem");

    const today = new Date().toISOString().slice(0, 10);
    const byPeriod = await api(`/api/admin/legacy/alerts-notifications-chat?entity_type=system_alert&from=2020-01-01&to=${today}`, { token: t });
    assert.ok(byPeriod.json.data.length >= 2);

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = await fetch(`${baseUrl}/api/admin/legacy/alerts-notifications-chat`, { method, headers: { authorization: `Bearer ${t}` } });
      assert.ok([404, 405].includes(res.status), `${method} deveria ser 404/405, foi ${res.status}`);
    }

    assert.doesNotMatch(JSON.stringify(byRecipient.json), /SEGREDO_DO_USUARIO_B_NUNCA_NO_LEGADO|password_hash/);
  });

  it("/records/:id mostra alerta com relações (padrão/regra/destinatário) e conversa com participantes/mensagens de entrada, somente leitura", async () => {
    const t = tokenFor(await mkMaster());
    const alertList = await api(`/api/admin/legacy/alerts-notifications-chat?entity_type=system_alert&q=Tarefa+atrasada`, { token: t });
    const alertRecord = alertList.json.data.find((r: { title: string }) => r.title === "Tarefa atrasada (teste)");
    assert.ok(alertRecord);
    const alertDetail = await api(`/api/admin/legacy/records/${alertRecord.id}`, { token: t });
    assert.ok(alertDetail.json.relations_by_type.from_standard);
    assert.ok(alertDetail.json.relations_by_type.alert_recipient);

    const convList = await api(`/api/admin/legacy/alerts-notifications-chat?entity_type=conversation`, { token: t });
    const convRecord = convList.json.data.find((r: { title: string }) => r.title === "Grupo de teste");
    assert.ok(convRecord);
    const convDetail = await api(`/api/admin/legacy/records/${convRecord.id}`, { token: t });
    assert.ok(convDetail.json.relations_incoming_by_type.belongs_to_conversation, "participantes/mensagens aparecem como relação de entrada da conversa");
    assert.doesNotMatch(JSON.stringify(convDetail.json), /SEGREDO_DO_USUARIO_B_NUNCA_NO_LEGADO|password_hash/);
  });

  it("summary: 'alertas', 'notificacoes' e 'chat' aparecem prontos, sem vazar dado sensível", async () => {
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.json.tabs.alertas.status, "ready");
    assert.equal(r.json.tabs.notificacoes.status, "ready");
    assert.equal(r.json.tabs.chat.status, "ready");
    assert.ok(r.json.tabs.chat.count >= 4);
    assert.doesNotMatch(JSON.stringify(r.json), /SEGREDO_DO_USUARIO_B_NUNCA_NO_LEGADO|password_hash/);
  });

  it("nenhum registro OPERACIONAL foi alterado por rodar o importador", async () => {
    const alert = await prisma.systemAlert.findUniqueOrThrow({ where: { id: seeded.manualAlertId } });
    assert.equal(alert.is_read, false);
    const message = await prisma.chatMessage.findUniqueOrThrow({ where: { id: seeded.messageId } });
    assert.equal(message.content, "Olá, tudo bem?");
    assert.equal(message.is_read, false);
  });
});

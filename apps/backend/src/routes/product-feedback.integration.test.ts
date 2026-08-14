import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

const realFetch = globalThis.fetch;
const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const roadmapCalls: Array<{ url: string; method: string }> = [];
let roadmapMode: "ok" | "error" | "network-down" = "ok";
// Mirrors the real Roadmap's idempotency behavior (same idempotencyKey ->
// same protocol) — a stub that returned a fresh random protocol on every
// call would never actually exercise Allka's own idempotency ledger logic,
// since it relies on the Roadmap being idempotent on its side too.
const protocolByIdempotencyKey = new Map<string, string>();

function installRoadmapStub() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (config.ROADMAP_API_URL && url.startsWith(config.ROADMAP_API_URL)) {
      roadmapCalls.push({ url, method: (init?.method ?? "GET") as string });

      if (roadmapMode === "network-down") {
        throw new Error("simulated network failure");
      }

      if (roadmapMode === "error") {
        return new Response(
          JSON.stringify({ ok: false, code: "RATE_LIMITED", message: "too many requests" }),
          { status: 429, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/work-items") && (init?.method ?? "GET") === "POST") {
        const parsedBody = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        const idempotencyKey: string | undefined = parsedBody.idempotencyKey;
        if (idempotencyKey && protocolByIdempotencyKey.has(idempotencyKey)) {
          return new Response(
            JSON.stringify({ ok: true, protocol: protocolByIdempotencyKey.get(idempotencyKey) }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        const protocol = `ALK-${Math.floor(Math.random() * 1_000_000)}`;
        if (idempotencyKey) protocolByIdempotencyKey.set(idempotencyKey, protocol);
        return new Response(JSON.stringify({ ok: true, protocol }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/work-items") && !url.match(/work-items\/ALK-/) && (init?.method ?? "GET") === "GET") {
        return new Response(JSON.stringify({ ok: true, items: [], nextCursor: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: false, message: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return realFetch(input, init);
  }) as typeof fetch;
}

function uninstallRoadmapStub() {
  globalThis.fetch = realFetch;
}

let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(user: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, account_type: user.account_type },
    config.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

async function api(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const createdUserIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  is_active: boolean;
  status: string;
}> = {}) {
  const id = `pf-test-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `PF Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: overrides.status ?? "ativo",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("product-feedback routes (access decision, work-items, admin)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    installRoadmapStub();

    assert.equal(config.PRODUCT_FEEDBACK_ENABLED, true, "PRODUCT_FEEDBACK_ENABLED must be true in .env for this suite");
  });

  after(async () => {
    uninstallRoadmapStub();
    await prisma.productFeedbackAccessGroupMember.deleteMany({ where: { user_id: { in: createdUserIds } } });
    await prisma.productFeedbackUserOverride.deleteMany({ where: { user_id: { in: createdUserIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { target_user_id: { in: createdUserIds } } });
    await prisma.productFeedbackWorkItemLink.deleteMany({ where: { user_id: { in: createdUserIds } } });
    await prisma.productFeedbackAccessGroup.deleteMany({ where: { name: { contains: suffix } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.productFeedbackAccessConfig.updateMany({
      where: { id: "singleton" },
      data: { enabled: true, default_policy: "ALLOW_ALL_ACTIVE" },
    });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("allows an active user under the default ALLOW_ALL_ACTIVE policy", async () => {
    const user = await createUser();
    const res = await api("/api/product-feedback/access", { token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.canUse, true);
    assert.equal(res.json.enabled, true);
    // Common user response stays minimal ({enabled, canUse} only) — never
    // the internal reason/group/rule details behind the decision.
    assert.deepEqual(Object.keys(res.json).sort(), ["canUse", "enabled"]);
    assert.equal(res.json.reason, undefined);
    assert.equal(res.json.source, undefined);
  });

  it("denies an inactive user even under ALLOW_ALL_ACTIVE", async () => {
    const user = await createUser({ is_active: false });
    const res = await api("/api/product-feedback/access", { token: tokenFor(user) });
    assert.equal(res.json.canUse, false);
  });

  it("denies a suspended/paused user even under ALLOW_ALL_ACTIVE", async () => {
    const suspended = await createUser({ status: "suspenso" });
    const paused = await createUser({ status: "pausado" });
    const suspendedRes = await api("/api/product-feedback/access", { token: tokenFor(suspended) });
    const pausedRes = await api("/api/product-feedback/access", { token: tokenFor(paused) });
    assert.equal(suspendedRes.json.canUse, false);
    assert.equal(pausedRes.json.canUse, false);
  });

  it("denies everyone when the global config is disabled", async () => {
    const user = await createUser();
    await prisma.productFeedbackAccessConfig.upsert({
      where: { id: "singleton" },
      update: { enabled: false },
      create: { id: "singleton", enabled: false, default_policy: "ALLOW_ALL_ACTIVE" },
    });
    try {
      const res = await api("/api/product-feedback/access", { token: tokenFor(user) });
      assert.equal(res.json.canUse, false);
      // The global toggle itself is reported too — not just the per-user
      // outcome — so the frontend widget can tell "product is off" apart
      // from "you specifically are blocked" if it ever needs to.
      assert.equal(res.json.enabled, false);
    } finally {
      await prisma.productFeedbackAccessConfig.update({ where: { id: "singleton" }, data: { enabled: true } });
    }
  });

  it("denies by default under DENY_ALL_EXCEPT_ALLOWED, but an ALLOW group flips it", async () => {
    const user = await createUser();
    await prisma.productFeedbackAccessConfig.update({
      where: { id: "singleton" },
      data: { default_policy: "DENY_ALL_EXCEPT_ALLOWED" },
    });
    try {
      const deniedRes = await api("/api/product-feedback/access", { token: tokenFor(user) });
      assert.equal(deniedRes.json.canUse, false);

      const group = await prisma.productFeedbackAccessGroup.create({
        data: { name: `allow-group-${suffix}`, effect: "ALLOW", priority: 1, active: true },
      });
      await prisma.productFeedbackAccessGroupMember.create({
        data: { group_id: group.id, user_id: user.id },
      });
      const allowedRes = await api("/api/product-feedback/access", { token: tokenFor(user) });
      assert.equal(allowedRes.json.canUse, true);
    } finally {
      await prisma.productFeedbackAccessConfig.update({
        where: { id: "singleton" },
        data: { default_policy: "ALLOW_ALL_ACTIVE" },
      });
    }
  });

  it("an individual DENY override blocks POST and GET, and revalidates rather than trusting the frontend", async () => {
    const user = await createUser();
    const token = tokenFor(user);

    const before = await api("/api/product-feedback/work-items", {
      method: "POST",
      token,
      body: { clientSubmissionId: crypto.randomUUID(), type: "PROBLEM", title: "Algo quebrou", description: "Descrição detalhada do problema", pathname: "/empresas/123" },
    });
    assert.equal(before.status, 201);

    await prisma.productFeedbackUserOverride.create({
      data: { user_id: user.id, effect: "DENY", active: true },
    });

    const blockedPost = await api("/api/product-feedback/work-items", {
      method: "POST",
      token,
      body: { clientSubmissionId: crypto.randomUUID(), type: "PROBLEM", title: "Outro problema", description: "Outra descrição bem detalhada", pathname: "/empresas/123" },
    });
    assert.equal(blockedPost.status, 403);

    const blockedGet = await api("/api/product-feedback/work-items", { token });
    assert.equal(blockedGet.status, 403);

    const blockedAccess = await api("/api/product-feedback/access", { token });
    assert.equal(blockedAccess.json.canUse, false);
  });

  it("an expired override is ignored and falls through to the default policy", async () => {
    const user = await createUser();
    await prisma.productFeedbackUserOverride.create({
      data: { user_id: user.id, effect: "DENY", active: true, expires_at: new Date(Date.now() - 60_000) },
    });
    const res = await api("/api/product-feedback/access", { token: tokenFor(user) });
    assert.equal(res.json.canUse, true);
  });

  it("rejects a pathname with a querystring or fragment (URL sanitization)", async () => {
    const user = await createUser();
    const res = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(user),
      body: {
        clientSubmissionId: crypto.randomUUID(),
        type: "IDEA",
        title: "Ideia válida com título ok",
        description: "Descrição válida com detalhe suficiente",
        pathname: "/empresas/123?token=secret",
      },
    });
    assert.equal(res.status, 400);
  });

  it("rejects a body that tries to supply identity/environment/internal fields directly", async () => {
    const user = await createUser();
    const res = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(user),
      body: {
        clientSubmissionId: crypto.randomUUID(),
        type: "IDEA",
        title: "Ideia válida com título ok",
        description: "Descrição válida com detalhe suficiente",
        pathname: "/empresas/123",
        // None of these are in the strict schema — must be rejected, not
        // silently dropped, proving the server never even parses them into
        // something that could reach the Roadmap call.
        identity: { externalUserId: "someone-else" },
        environment: "production",
        cookie: "session=stolen",
      },
    });
    assert.equal(res.status, 400);
  });

  it("creates a ticket end to end (against the stubbed Roadmap) and records a local link", async () => {
    const user = await createUser();
    const res = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(user),
      body: {
        clientSubmissionId: crypto.randomUUID(),
        type: "IMPROVEMENT",
        title: "Sugestão de melhoria válida",
        description: "Descrição da melhoria com detalhe suficiente",
        pathname: "/dashboard",
      },
    });
    assert.equal(res.status, 201);
    assert.match(res.json.protocol, /^ALK-\d+$/);

    const link = await prisma.productFeedbackWorkItemLink.findFirst({
      where: { user_id: user.id, protocol: res.json.protocol },
    });
    assert.ok(link, "expected a local ProductFeedbackWorkItemLink row");
    assert.equal(link!.type, "IMPROVEMENT");
  });

  it("rejects a POST missing clientSubmissionId (no server-side identity generation to fall back on)", async () => {
    const user = await createUser();
    const res = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(user),
      body: {
        type: "IDEA",
        title: "Chamado sem clientSubmissionId",
        description: "Deveria ser rejeitado por schema",
        pathname: "/dashboard",
      },
    });
    assert.equal(res.status, 400);
  });

  it("retrying with the same clientSubmissionId + same payload returns the same protocol and creates only one local link", async () => {
    const user = await createUser();
    const clientSubmissionId = crypto.randomUUID();
    const body = {
      clientSubmissionId,
      type: "PROBLEM" as const,
      title: "Botão de exportar não funciona",
      description: "Cliquei em exportar e nada acontece",
      pathname: "/relatorios",
    };

    const first = await api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body });
    assert.equal(first.status, 201);

    const retry = await api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.protocol, first.json.protocol);

    const links = await prisma.productFeedbackWorkItemLink.findMany({
      where: { user_id: user.id, idempotency_key: clientSubmissionId },
    });
    assert.equal(links.length, 1);
  });

  it("same clientSubmissionId with a different payload returns 409 without calling the Roadmap again", async () => {
    const user = await createUser();
    const clientSubmissionId = crypto.randomUUID();
    const first = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(user),
      body: {
        clientSubmissionId,
        type: "PROBLEM",
        title: "Título original do chamado",
        description: "Descrição original do chamado enviado",
        pathname: "/relatorios",
      },
    });
    assert.equal(first.status, 201);

    const callsBefore = roadmapCalls.length;
    const conflicting = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(user),
      body: {
        clientSubmissionId,
        type: "PROBLEM",
        title: "Um título completamente diferente do original",
        description: "Descrição original do chamado enviado",
        pathname: "/relatorios",
      },
    });
    assert.equal(conflicting.status, 409);
    // Never even reached the Roadmap — the local payload-hash mismatch is
    // caught before any network call.
    assert.equal(roadmapCalls.length, callsBefore);
  });

  it("resumes correctly when the Roadmap succeeded but the local write is retried afterward (simulated crash-between-steps)", async () => {
    const user = await createUser();
    const clientSubmissionId = crypto.randomUUID();
    const body = {
      clientSubmissionId,
      type: "IDEA" as const,
      title: "Ideia que sobrevive a uma falha local",
      description: "Descrição da ideia enviada pelo usuário",
      pathname: "/dashboard",
    };

    // Simulate "the Roadmap already has this ticket" by priming the stub's
    // idempotency map directly, as if an earlier attempt's HTTP call to the
    // Roadmap succeeded but the process died before the local UPDATE ran —
    // there is deliberately no local link row yet for this key.
    const preExistingProtocol = `ALK-${Math.floor(Math.random() * 1_000_000)}`;
    protocolByIdempotencyKey.set(clientSubmissionId, preExistingProtocol);

    const res = await api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body });
    assert.equal(res.status, 201);
    // Must recover the Roadmap's existing protocol for this key, never a
    // second, different one.
    assert.equal(res.json.protocol, preExistingProtocol);

    const link = await prisma.productFeedbackWorkItemLink.findFirst({
      where: { user_id: user.id, idempotency_key: clientSubmissionId },
    });
    assert.ok(link);
    assert.equal(link!.protocol, preExistingProtocol);
  });

  it("concurrent double-submits with the same clientSubmissionId never create two tickets or two local links", async () => {
    const user = await createUser();
    const clientSubmissionId = crypto.randomUUID();
    const body = {
      clientSubmissionId,
      type: "IMPROVEMENT" as const,
      title: "Chamado enviado em duplo clique",
      description: "Descrição do chamado enviado duas vezes ao mesmo tempo",
      pathname: "/dashboard",
    };

    const [a, b] = await Promise.all([
      api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body }),
      api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body }),
    ]);

    assert.ok([a.status, b.status].every((s) => s === 200 || s === 201));
    assert.equal(a.json.protocol, b.json.protocol);

    const links = await prisma.productFeedbackWorkItemLink.findMany({
      where: { user_id: user.id, idempotency_key: clientSubmissionId },
    });
    assert.equal(links.length, 1);
  });

  it("a network failure calling the Roadmap leaves a resumable pending link (protocol still null), not a broken one", async () => {
    const user = await createUser();
    const clientSubmissionId = crypto.randomUUID();
    const body = {
      clientSubmissionId,
      type: "PROBLEM" as const,
      title: "Chamado que falha na primeira tentativa",
      description: "Descrição do chamado que vai falhar de propósito",
      pathname: "/dashboard",
    };

    roadmapMode = "network-down";
    try {
      const failed = await api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body });
      assert.equal(failed.status, 503);
    } finally {
      roadmapMode = "ok";
    }

    const pendingLink = await prisma.productFeedbackWorkItemLink.findFirst({
      where: { user_id: user.id, idempotency_key: clientSubmissionId },
    });
    assert.ok(pendingLink, "expected a pending local link row even though the Roadmap call failed");
    assert.equal(pendingLink!.protocol, null);

    // Retry, same id — must succeed and complete the pending row, not
    // create a second one.
    const retry = await api("/api/product-feedback/work-items", { method: "POST", token: tokenFor(user), body });
    assert.equal(retry.status, 201);
    assert.match(retry.json.protocol, /^ALK-\d+$/);

    const links = await prisma.productFeedbackWorkItemLink.findMany({
      where: { user_id: user.id, idempotency_key: clientSubmissionId },
    });
    assert.equal(links.length, 1);
    assert.equal(links[0]!.protocol, retry.json.protocol);
  });

  it("never lets user A fetch user B's protocol", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const created = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(userB),
      body: { clientSubmissionId: crypto.randomUUID(), type: "PROBLEM", title: "Problema do usuário B", description: "Descrição detalhada do problema", pathname: "/empresas/1" },
    });
    assert.equal(created.status, 201);

    const res = await api(`/api/product-feedback/work-items/${created.json.protocol}`, { token: tokenFor(userA) });
    assert.equal(res.status, 404);
  });

  it("turns a Roadmap error into a friendly message, never the raw upstream body", async () => {
    const user = await createUser();
    roadmapMode = "error";
    try {
      const res = await api("/api/product-feedback/work-items", {
        method: "POST",
        token: tokenFor(user),
        body: { clientSubmissionId: crypto.randomUUID(), type: "PROBLEM", title: "Vai falhar de propósito", description: "Descrição detalhada do problema", pathname: "/empresas/1" },
      });
      assert.equal(res.status, 429);
      assert.ok(typeof res.json.error === "string" && res.json.error.length > 0);
      assert.equal(res.json.code, undefined);
    } finally {
      roadmapMode = "ok";
    }
  });

  describe("admin endpoints", () => {
    it("rejects an unauthenticated request", async () => {
      const res = await api("/api/admin/product-feedback/config");
      assert.equal(res.status, 401);
    });

    it("rejects a non-admin authenticated user and audits the denied attempt", async () => {
      const user = await createUser({ role: "company_user" });
      const res = await api("/api/admin/product-feedback/config", { token: tokenFor(user) });
      assert.equal(res.status, 403);

      const entry = await prisma.productFeedbackAccessAudit.findFirst({
        where: { actor_id: user.id, action: "admin.access_denied" },
        orderBy: { created_at: "desc" },
      });
      assert.ok(entry, "expected a denied-attempt audit entry for the non-admin user");
    });

    it("refuses to enable the product when the technical config is invalid, and audits the attempt without changing the config", async () => {
      const admin = await createUser({ role: "admin", account_type: "admin" });
      const adminToken = tokenFor(admin);

      const realSecret = config.ROADMAP_HMAC_SECRET;
      // Deliberately corrupting the loaded config for this one test,
      // restored in `finally`.
      config.ROADMAP_HMAC_SECRET = undefined;
      try {
        const before = await api("/api/admin/product-feedback/config", { token: adminToken });
        assert.equal(before.json.technicallyConfigured, false);

        const res = await api("/api/admin/product-feedback/config", {
          method: "PATCH",
          token: adminToken,
          body: { enabled: true },
        });
        assert.equal(res.status, 409);

        const entry = await prisma.productFeedbackAccessAudit.findFirst({
          where: { actor_id: admin.id, action: "config.enable_denied" },
          orderBy: { created_at: "desc" },
        });
        assert.ok(entry, "expected a config.enable_denied audit entry");
      } finally {
        config.ROADMAP_HMAC_SECRET = realSecret;
      }
    });

    it("lets an admin read config and users, and set an override that the audit trail records", async () => {
      const admin = await createUser({ role: "admin", account_type: "admin" });
      const target = await createUser();
      const adminToken = tokenFor(admin);

      const cfgRes = await api("/api/admin/product-feedback/config", { token: adminToken });
      assert.equal(cfgRes.status, 200);
      assert.equal(cfgRes.json.technicallyConfigured, true);

      const overrideRes = await api(`/api/admin/product-feedback/users/${target.id}/override`, {
        method: "PUT",
        token: adminToken,
        body: { effect: "DENY", reason: `teste ${suffix}` },
      });
      assert.equal(overrideRes.status, 200);
      assert.equal(overrideRes.json.effect, "DENY");

      const targetAccess = await api("/api/product-feedback/access", { token: tokenFor(target) });
      assert.equal(targetAccess.json.canUse, false);

      const auditRes = await api(`/api/admin/product-feedback/audit?targetUserId=${target.id}`, { token: adminToken });
      assert.equal(auditRes.status, 200);
      assert.ok(auditRes.json.items.some((entry: any) => entry.action === "override.set"));
    });

    it("paginates a filtered listing correctly — no user lost or duplicated across pages, and total matches the filter", async () => {
      const admin = await createUser({ role: "admin", account_type: "admin" });
      const adminToken = tokenFor(admin);
      const marker = `PgTest-${suffix}`;

      // 3 inactive users (must all show up under filter=inactive) and 2
      // active ones with the same search marker (must never show up under
      // that filter) — enough to span more than one page at limit=2, which
      // is exactly the scenario the previous (paginate-then-filter) code
      // got wrong: it would silently drop matches and report a wrong total.
      const inactiveUsers = await Promise.all(
        [1, 2, 3].map(async (i) => {
          const id = `pf-page-inactive-${i}-${crypto.randomBytes(4).toString("hex")}`;
          const user = await prisma.user.create({
            data: {
              id,
              email: `${id}@example.test`,
              password_hash: "unused-test-hash",
              name: `${marker} Inactive ${i}`,
              role: "company_user",
              account_type: "empresas",
              is_active: false,
              status: "ativo",
            },
          });
          createdUserIds.push(user.id);
          return user;
        }),
      );
      const activeUsers = await Promise.all(
        [1, 2].map(async (i) => {
          const id = `pf-page-active-${i}-${crypto.randomBytes(4).toString("hex")}`;
          const user = await prisma.user.create({
            data: {
              id,
              email: `${id}@example.test`,
              password_hash: "unused-test-hash",
              name: `${marker} Active ${i}`,
              role: "company_user",
              account_type: "empresas",
              is_active: true,
              status: "ativo",
            },
          });
          createdUserIds.push(user.id);
          return user;
        }),
      );

      const page1 = await api(
        `/api/admin/product-feedback/users?search=${encodeURIComponent(marker)}&filter=inactive&page=1&limit=2`,
        { token: adminToken },
      );
      assert.equal(page1.status, 200);
      assert.equal(page1.json.pagination.total, 3);
      assert.equal(page1.json.items.length, 2);

      const page2 = await api(
        `/api/admin/product-feedback/users?search=${encodeURIComponent(marker)}&filter=inactive&page=2&limit=2`,
        { token: adminToken },
      );
      assert.equal(page2.status, 200);
      assert.equal(page2.json.pagination.total, 3);
      assert.equal(page2.json.items.length, 1);

      const seenIds = [...page1.json.items, ...page2.json.items].map((row: any) => row.id);
      assert.equal(new Set(seenIds).size, 3, "no id should repeat across pages");
      assert.deepEqual(
        [...seenIds].sort(),
        inactiveUsers.map((u) => u.id).sort(),
        "the exact 3 inactive users must be the ones returned, none of the active ones",
      );
      for (const activeUser of activeUsers) {
        assert.ok(!seenIds.includes(activeUser.id), "an active user must never appear under filter=inactive");
      }
    });

    it("simulate reflects the same decision as the real access endpoint", async () => {
      const admin = await createUser({ role: "admin", account_type: "admin" });
      const target = await createUser();
      const simRes = await api("/api/admin/product-feedback/simulate", {
        method: "POST",
        token: tokenFor(admin),
        body: { userId: target.id },
      });
      assert.equal(simRes.status, 200);
      assert.equal(simRes.json.canUse, true);
      assert.ok(typeof simRes.json.reason === "string");
    });

    it("audits group create/update/archive, member add/remove, and batch overrides — each with the right before/after", async () => {
      const admin = await createUser({ role: "admin", account_type: "admin" });
      const member = await createUser();
      const adminToken = tokenFor(admin);

      async function lastAudit(action: string, targetUserId?: string) {
        return prisma.productFeedbackAccessAudit.findFirst({
          where: { action, ...(targetUserId ? { target_user_id: targetUserId } : {}) },
          orderBy: { created_at: "desc" },
        });
      }

      const createRes = await api("/api/admin/product-feedback/groups", {
        method: "POST",
        token: adminToken,
        body: { name: `audit-group-${suffix}`, effect: "ALLOW", priority: 3 },
      });
      assert.equal(createRes.status, 201);
      const groupId = createRes.json.id as string;
      const createdEntry = await lastAudit("group.created");
      assert.ok(createdEntry, "expected a group.created audit entry");
      assert.ok(JSON.parse(createdEntry!.after_json!).id === groupId);

      const updateRes = await api(`/api/admin/product-feedback/groups/${groupId}`, {
        method: "PATCH",
        token: adminToken,
        body: { priority: 7 },
      });
      assert.equal(updateRes.status, 200);
      const updatedEntry = await lastAudit("group.updated");
      assert.ok(updatedEntry, "expected a group.updated audit entry");
      assert.equal(JSON.parse(updatedEntry!.before_json!).priority, 3);
      assert.equal(JSON.parse(updatedEntry!.after_json!).priority, 7);

      const addMemberRes = await api(`/api/admin/product-feedback/groups/${groupId}/members`, {
        method: "POST",
        token: adminToken,
        body: { userIds: [member.id] },
      });
      assert.equal(addMemberRes.status, 200);
      const addedEntry = await lastAudit("group.member_added");
      assert.ok(addedEntry, "expected a group.member_added audit entry");
      assert.ok(JSON.parse(addedEntry!.after_json!).userIds.includes(member.id));

      const removeMemberRes = await api(`/api/admin/product-feedback/groups/${groupId}/members/${member.id}`, {
        method: "DELETE",
        token: adminToken,
      });
      assert.equal(removeMemberRes.status, 200);
      const removedEntry = await lastAudit("group.member_removed", member.id);
      assert.ok(removedEntry, "expected a group.member_removed audit entry");

      const archiveRes = await api(`/api/admin/product-feedback/groups/${groupId}`, {
        method: "DELETE",
        token: adminToken,
      });
      assert.equal(archiveRes.status, 200);
      const archivedEntry = await lastAudit("group.archived");
      assert.ok(archivedEntry, "expected a group.archived audit entry");

      const batchRes = await api("/api/admin/product-feedback/users/batch-override", {
        method: "POST",
        token: adminToken,
        body: { userIds: [member.id], effect: "DENY", reason: `lote ${suffix}` },
      });
      assert.equal(batchRes.status, 200);
      const batchEntry = await lastAudit("override.batch_set", member.id);
      assert.ok(batchEntry, "expected an override.batch_set audit entry");
      assert.equal(JSON.parse(batchEntry!.after_json!).effect, "DENY");

      // Common users never see any of this — /audit is admin-only, and this
      // whole router already 403s a non-admin before reaching the handler
      // (see "rejects a non-admin authenticated user" above).
      const commonUserRes = await api("/api/admin/product-feedback/audit", { token: tokenFor(member) });
      assert.equal(commonUserRes.status, 403);
    });
  });
});

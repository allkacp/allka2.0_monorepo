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
let roadmapMode: "ok" | "error" = "ok";

function installRoadmapStub() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (config.ROADMAP_API_URL && url.startsWith(config.ROADMAP_API_URL)) {
      roadmapCalls.push({ url, method: (init?.method ?? "GET") as string });

      if (roadmapMode === "error") {
        return new Response(
          JSON.stringify({ ok: false, code: "RATE_LIMITED", message: "too many requests" }),
          { status: 429, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/work-items") && (init?.method ?? "GET") === "POST") {
        return new Response(
          JSON.stringify({ ok: true, protocol: `ALK-${Math.floor(Math.random() * 1_000_000)}` }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
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
    // Common user response never includes internal reasoning.
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
      body: { type: "PROBLEM", title: "Algo quebrou", description: "Descrição detalhada do problema", pathname: "/empresas/123" },
    });
    assert.equal(before.status, 201);

    await prisma.productFeedbackUserOverride.create({
      data: { user_id: user.id, effect: "DENY", active: true },
    });

    const blockedPost = await api("/api/product-feedback/work-items", {
      method: "POST",
      token,
      body: { type: "PROBLEM", title: "Outro problema", description: "Outra descrição bem detalhada", pathname: "/empresas/123" },
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

  it("never lets user A fetch user B's protocol", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const created = await api("/api/product-feedback/work-items", {
      method: "POST",
      token: tokenFor(userB),
      body: { type: "PROBLEM", title: "Problema do usuário B", description: "Descrição detalhada do problema", pathname: "/empresas/1" },
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
        body: { type: "PROBLEM", title: "Vai falhar de propósito", description: "Descrição detalhada do problema", pathname: "/empresas/1" },
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

    it("rejects a non-admin authenticated user", async () => {
      const user = await createUser({ role: "company_user" });
      const res = await api("/api/admin/product-feedback/config", { token: tokenFor(user) });
      assert.equal(res.status, 403);
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
  });
});

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules } from "../lib/alert-engine";
import { deleteAlertImage } from "../lib/alert-image-storage";

// Reparo "banner visual" (ata 2026-08, pós-4º lote/pós-reparo de
// autorização): todo banner NOVO precisa ser exatamente 1200×400 (3:1) —
// lido do conteúdo real decodificado, nunca confiado ao cliente. Imagens já
// existentes (fora do padrão) nunca são apagadas/migradas — só um upload
// NOVO passa por esta checagem. Este arquivo cobre os itens 1-11 (dimensão)
// e 20 (feed não expõe arquivo físico) da lista de testes da ata.

const FIXTURES_DIR = path.resolve(__dirname, "../test-support/fixtures");
function fixture(name: string): Buffer {
  return fs.readFileSync(path.join(FIXTURES_DIR, name));
}

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
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
    headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function uploadImage(token: string, buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch(`${baseUrl}/api/system-alerts/admin/images`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdImageFileNames: string[] = [];
const createdAlertIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `bannerdim-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id, email: `${id}@example.test`, password_hash: "unused-test-hash", name: `BannerDim Test ${id}`,
      role: overrides.role ?? "company_user", account_type: overrides.account_type ?? "empresas",
      is_active: true, status: "ativo", admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-bannerdim-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

describe("Dimensão exata do banner de Alerta (reparo 'banner visual')", () => {
  let master: Awaited<ReturnType<typeof masterAdmin>>;
  let masterToken: string;

  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    await ensureDefaultAlertStandardsAndRules();
    master = await masterAdmin();
    masterToken = tokenFor(master);
  });

  after(async () => {
    try {
      await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
      await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
      for (const fileName of createdImageFileNames) deleteAlertImage(fileName);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      await prisma.$disconnect();
    }
  });

  it("1. JPEG 1200×400 é aceito", async () => {
    const res = await uploadImage(masterToken, fixture("alert-banner-1200x400.jpg"), "banner.jpg");
    assert.equal(res.status, 201);
    createdImageFileNames.push(res.json.file_name);
  });

  it("2. PNG 1200×400 é aceito", async () => {
    const res = await uploadImage(masterToken, fixture("alert-banner-1200x400.png"), "banner.png");
    assert.equal(res.status, 201);
    createdImageFileNames.push(res.json.file_name);
  });

  it("3. WebP 1200×400 é aceito", async () => {
    const res = await uploadImage(masterToken, fixture("alert-banner-1200x400.webp"), "banner.webp");
    assert.equal(res.status, 201);
    createdImageFileNames.push(res.json.file_name);
  });

  it("4. 1080×1080 é rejeitado", async () => {
    const res = await uploadImage(masterToken, fixture("alert-square-1080x1080.png"), "square.png");
    assert.equal(res.status, 400);
    assert.match(res.json.error, /1080 × 1080/);
  });

  it("5. 400×1200 é rejeitado", async () => {
    const res = await uploadImage(masterToken, fixture("alert-portrait-400x1200.png"), "portrait.png");
    assert.equal(res.status, 400);
    assert.match(res.json.error, /400 × 1200/);
  });

  it("6. 1200×399 é rejeitado", async () => {
    const res = await uploadImage(masterToken, fixture("alert-offbyone-1200x399.png"), "offbyone.png");
    assert.equal(res.status, 400);
    assert.match(res.json.error, /1200 × 399/);
  });

  it("7. 2400×800 é rejeitado (mesma proporção 3:1, mas fora do tamanho exato)", async () => {
    const res = await uploadImage(masterToken, fixture("alert-double-2400x800.jpg"), "double.jpg");
    assert.equal(res.status, 400);
    assert.match(res.json.error, /2400 × 800/);
  });

  it("8. arquivo acima de 5MB é rejeitado", async () => {
    const big = Buffer.concat([fixture("alert-banner-1200x400.png"), Buffer.alloc(6 * 1024 * 1024)]);
    const res = await uploadImage(masterToken, big, "grande.png");
    assert.equal(res.status, 400);
  });

  it("9. arquivo disfarçado (conteúdo não é imagem de verdade) é rejeitado", async () => {
    const fake = Buffer.from("isto nao e uma imagem de verdade, so texto simulando um upload");
    const res = await uploadImage(masterToken, fake, "disfarcado.png");
    assert.equal(res.status, 400);
  });

  it("10. SVG é rejeitado (nunca aceito, independente de dimensão)", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"></svg>');
    const res = await uploadImage(masterToken, svg, "banner.svg");
    assert.equal(res.status, 400);
  });

  it("11. mensagem de erro mostra a dimensão recebida e a esperada", async () => {
    const res = await uploadImage(masterToken, fixture("alert-square-1080x1080.png"), "square2.png");
    assert.equal(res.status, 400);
    assert.equal(res.json.error, "A imagem enviada possui 1080 × 1080 px. O banner precisa ter exatamente 1200 × 400 px.");
  });

  // ── Feed pessoal (item 20) ────────────────────────────────────────────

  it("20. GET /api/system-alerts informa has_image/image_url sem expor o nome físico do arquivo", async () => {
    const uploaded = await uploadImage(masterToken, fixture("alert-banner-1200x400.png"), "banner-feed.png");
    createdImageFileNames.push(uploaded.json.file_name);

    const recipient = await createUser();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta com banner pro feed", message: "Mensagem de teste", severity: "info", user_id: recipient.id, image_file_name: uploaded.json.file_name, image_alt: "Banner de teste" },
    });
    createdAlertIds.push(created.json.id);

    const feed = await api("/api/system-alerts?category=alerta", { token: tokenFor(recipient) });
    assert.equal(feed.status, 200);
    const row = feed.json.data.find((a: any) => a.id === created.json.id);
    assert.ok(row, "a ocorrência aparece no feed pessoal do destinatário");
    assert.equal(row.has_image, true);
    assert.equal(row.image_url, `/api/system-alerts/${created.json.id}/image`);
    assert.equal(row.image_file_name, undefined, "nunca expõe o nome físico do arquivo no feed pessoal");

    // A própria URL devolvida é a rota já autorizada — o destinatário
    // consegue buscar a imagem através dela.
    const imgRes = await fetch(`${baseUrl}${row.image_url}`, { headers: { authorization: `Bearer ${tokenFor(recipient)}` } });
    assert.equal(imgRes.status, 200);
  });

  it("22. alerta sem imagem permanece normal no feed (has_image false, image_url null)", async () => {
    const recipient = await createUser();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta sem banner", message: "Mensagem de teste", severity: "info", user_id: recipient.id },
    });
    createdAlertIds.push(created.json.id);
    const feed = await api("/api/system-alerts?category=alerta", { token: tokenFor(recipient) });
    const row = feed.json.data.find((a: any) => a.id === created.json.id);
    assert.equal(row.has_image, false);
    assert.equal(row.image_url, null);
  });
});

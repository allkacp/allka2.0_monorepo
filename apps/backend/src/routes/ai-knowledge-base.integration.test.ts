import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultKnowledgeCategories, getCategoryKnowledgeText, getCategoryKnowledgeSections } from "../lib/ai-knowledge-base";
import { uploadedFilePath } from "../lib/file-storage";
import { buildAdminKnowledgeText, buildProjectBriefingText } from "../lib/iallka-knowledge";

// Reunião 10/09 ("organização da base de conhecimento administrativa da
// IAllka") — reaproveita AIKnowledgeCategory/AIKnowledgeDocument e as rotas
// já existentes; cobre as seis categorias, acesso exclusivo de Admin
// Master, documento ativo/inativo no contexto, substituição com histórico,
// fontes com categoria+documento, isolamento admin×briefing privado, e
// rejeição de arquivo inválido/vazio.

let baseUrl = "";
let server: import("node:http").Server;

const userIds: string[] = [];
const adminProfileIds: string[] = [];
const categoryIds: string[] = [];
const projectIds: string[] = [];
const testCategoryDirs: string[] = [];

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
async function uploadFile(path: string, token: string | undefined, buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function mkUser(kind: "master" | "common_admin" | "plain") {
  const id = `kb-${crypto.randomBytes(6).toString("hex")}`;
  let admin_profile_id: string | undefined;
  if (kind !== "plain") {
    const p = await prisma.adminProfile.create({ data: { name: `KbProf ${id}`, is_master: kind === "master", is_active: true } });
    adminProfileIds.push(p.id);
    admin_profile_id = p.id;
  }
  const u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `U ${id}`,
      role: kind === "plain" ? "company_user" : "admin",
      account_type: kind === "plain" ? "empresas" : "admin",
      is_active: true,
      status: "ativo",
      admin_profile_id,
    },
  });
  userIds.push(u.id);
  return { ...u, token: tokenFor(u) };
}

async function mkCategory(key: string, name: string) {
  const c = await prisma.aIKnowledgeCategory.create({ data: { key, name } });
  categoryIds.push(c.id);
  testCategoryDirs.push(key);
  return c;
}

const UPLOADS_ROOT = path.join(__dirname, "../../uploads/knowledge-base");

describe("Base de conhecimento administrativa da IAllka (AIKnowledgeCategory/Document)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const key of testCategoryDirs) {
      fs.rmSync(path.join(UPLOADS_ROOT, key), { recursive: true, force: true });
    }
    for (const id of projectIds) await prisma.project.delete({ where: { id } }).catch(() => {});
    await prisma.aIKnowledgeDocument.deleteMany({ where: { category_id: { in: categoryIds } } }).catch(() => {});
    await prisma.aIKnowledgeCategory.deleteMany({ where: { id: { in: categoryIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfileIds } } }).catch(() => {});
  });

  it("1/9. as seis categorias existem, sem duplicar, e a criação/listagem é idempotente", async () => {
    await ensureDefaultKnowledgeCategories();
    await ensureDefaultKnowledgeCategories(); // 2ª chamada — nunca duplica

    const master = await mkUser("master");
    const r = await api("/api/ai-knowledge-base/categories", { token: master.token });
    assert.equal(r.status, 200);
    const byKey: Record<string, number> = {};
    for (const c of r.json.categories) byKey[c.key] = (byKey[c.key] ?? 0) + 1;

    // As seis pedidas nesta reunião — "produtos"/"briefing" já existiam e
    // foram reaproveitadas (nunca uma segunda categoria "produtos_v2" etc.).
    for (const key of ["produtos", "briefing", "quatro_fs", "processos", "politicas", "outros"]) {
      assert.equal(byKey[key], 1, `categoria "${key}" deve existir exatamente uma vez`);
    }
    const names = Object.fromEntries(r.json.categories.map((c: any) => [c.key, c.name]));
    assert.equal(names.quatro_fs, "Quatro Fs");
    assert.equal(names.processos, "Processos");
    assert.equal(names.politicas, "Políticas");
    assert.equal(names.outros, "Outros");
  });

  it("2. acesso exclusivo do Admin Master pras ações de escrita (leitura continua aberta a qualquer admin)", async () => {
    const master = await mkUser("master");
    const commonAdmin = await mkUser("common_admin");
    const plain = await mkUser("plain");
    const cat = await mkCategory(`t9-acesso-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Acesso");

    // leitura: qualquer admin passa
    assert.equal((await api("/api/ai-knowledge-base/categories", { token: commonAdmin.token })).status, 200);
    assert.equal((await api(`/api/ai-knowledge-base/categories/${cat.key}/documents`, { token: commonAdmin.token })).status, 200);
    assert.equal((await api("/api/ai-knowledge-base/categories", { token: plain.token })).status, 403);

    // escrita: só Admin Master
    const createBody = { key: `t9_novacat_${crypto.randomBytes(3).toString("hex")}`, name: "[TESTE] Nova" };
    assert.equal((await api("/api/ai-knowledge-base/categories", { method: "POST", token: commonAdmin.token, body: createBody })).status, 403);
    assert.equal((await api("/api/ai-knowledge-base/categories", { method: "POST", token: master.token, body: createBody })).status, 201);

    const up = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, commonAdmin.token, Buffer.from("conteúdo de teste"), "doc.txt");
    assert.equal(up.status, 403);

    const upMaster = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("conteúdo de teste"), "doc.txt");
    assert.equal(upMaster.status, 201);
    const docId = upMaster.json.id;

    assert.equal((await api(`/api/ai-knowledge-base/documents/${docId}/deactivate`, { method: "POST", token: commonAdmin.token })).status, 403);
    assert.equal((await api(`/api/ai-knowledge-base/documents/${docId}/deactivate`, { method: "POST", token: master.token })).status, 200);
    assert.equal((await api(`/api/ai-knowledge-base/documents/${docId}/activate`, { method: "POST", token: commonAdmin.token })).status, 403);
    assert.equal((await api(`/api/ai-knowledge-base/documents/${docId}/activate`, { method: "POST", token: master.token })).status, 200);

    const replaceCommon = await uploadFile(`/api/ai-knowledge-base/documents/${docId}/replace`, commonAdmin.token, Buffer.from("v2"), "doc.txt");
    assert.equal(replaceCommon.status, 403);

    assert.equal((await api(`/api/ai-knowledge-base/documents/${docId}`, { method: "DELETE", token: commonAdmin.token })).status, 403);
    assert.equal((await api(`/api/ai-knowledge-base/documents/${docId}`, { method: "DELETE", token: master.token })).status, 200);
  });

  it("3/4. documento ATIVO entra no contexto; documento INATIVO fica fora", async () => {
    const master = await mkUser("master");
    const cat = await mkCategory(`t9-ativo-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Ativo/Inativo");
    const marker = `MARCADOR-${crypto.randomBytes(4).toString("hex")}`;

    const up = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from(`Texto real com ${marker} dentro.`), "ativo.txt");
    assert.equal(up.status, 201);
    assert.equal(up.json.is_active, true);

    let text = await getCategoryKnowledgeText(cat.key);
    assert.ok(text.includes(marker), "documento ativo deve entrar no texto da categoria");

    const deact = await api(`/api/ai-knowledge-base/documents/${up.json.id}/deactivate`, { method: "POST", token: master.token });
    assert.equal(deact.status, 200);
    assert.equal(deact.json.is_active, false);

    text = await getCategoryKnowledgeText(cat.key);
    assert.ok(!text.includes(marker), "documento inativo NUNCA deve entrar no texto da categoria");

    const sections = await getCategoryKnowledgeSections(cat.key);
    assert.equal(sections.length, 0);
  });

  it("5. substituir preserva o histórico e mantém só UMA versão ativa por cadeia", async () => {
    const master = await mkUser("master");
    const cat = await mkCategory(`t9-replace-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Substituição");

    const v1 = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo da versão 1."), "politica.txt");
    assert.equal(v1.status, 201);
    assert.equal(v1.json.version, 1);
    assert.equal(v1.json.is_active, true);

    const v2 = await uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo da versão 2, atualizado."), "politica-v2.txt");
    assert.equal(v2.status, 201);
    assert.equal(v2.json.version, 2);
    assert.equal(v2.json.is_active, true);
    assert.equal(v2.json.replaces_document_id, v1.json.id);

    const list = await api(`/api/ai-knowledge-base/categories/${cat.key}/documents`, { token: master.token });
    assert.equal(list.status, 200);
    assert.equal(list.json.documents.length, 2, "histórico preservado — as duas versões continuam existindo");
    const activeOnes = list.json.documents.filter((d: any) => d.is_active);
    assert.equal(activeOnes.length, 1, "só uma versão ativa dentro da cadeia");
    assert.equal(activeOnes[0].id, v2.json.id);
    const oldRow = list.json.documents.find((d: any) => d.id === v1.json.id);
    assert.equal(oldRow.is_active, false);
    assert.equal(oldRow.replaced_by.id, v2.json.id);

    // e o texto que alimenta a IA reflete só a versão vigente
    const text = await getCategoryKnowledgeText(cat.key);
    assert.ok(text.includes("versão 2"));
    assert.ok(!text.includes("versão 1."));
  });

  it("6. as fontes da IAllka informam a categoria e o documento usados", async () => {
    const master = await mkUser("master");
    const cat = await mkCategory(`t9-fontes-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Categoria das Fontes");
    const up = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo real pra fonte."), "fonte-real.txt");
    assert.equal(up.status, 201);

    const { sources, text } = await buildAdminKnowledgeText();
    assert.ok(text.includes("Conteúdo real pra fonte."));
    const match = sources.find((s) => s.name.includes("fonte-real.txt"));
    assert.ok(match, "deve existir uma fonte citando o nome do documento");
    assert.ok(match!.name.includes(cat.name), "o nome da fonte deve citar também a categoria");
    assert.equal(match!.detail, cat.key);
    assert.equal(match!.type, "documento");
  });

  it("7. isolamento total: documento administrativo nunca aparece no briefing de projeto, e vice-versa", async () => {
    const master = await mkUser("master");
    const cat = await mkCategory(`t9-isol-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Isolamento");
    const adminMarker = `ADMIN-${crypto.randomBytes(4).toString("hex")}`;
    const briefingMarker = `BRIEFING-PRIVADO-${crypto.randomBytes(4).toString("hex")}`;

    await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from(`Documento administrativo ${adminMarker}.`), "admin.txt");

    const projectCode = `t9-kb-${crypto.randomBytes(4).toString("hex")}`;
    const project = await prisma.project.create({
      data: { title: `[TESTE] Projeto isolamento ${projectCode}`, project_code: projectCode, status: "in-progress" },
    });
    projectIds.push(project.id);
    const dir = path.join(__dirname, `../../uploads/project-documents/${project.id}`);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.txt`;
    fs.writeFileSync(path.join(dir, fileName), `Briefing privado ${briefingMarker}.`);
    await prisma.projectAttachment.create({
      data: { project_id: project.id, name: "briefing.txt", file_name: fileName, uploaded_by: master.id },
    });

    const admin = await buildAdminKnowledgeText();
    assert.ok(!admin.text.includes(briefingMarker), "briefing privado NUNCA entra na base administrativa compartilhada");

    const briefing = await buildProjectBriefingText(project.id);
    assert.ok(briefing);
    assert.ok(briefing!.text.includes(briefingMarker));
    assert.ok(!briefing!.text.includes(adminMarker), "documento administrativo nunca vaza pro briefing privado do projeto");

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("8. arquivo com formato não suportado e arquivo sem texto extraível são recusados — nenhum documento vazio é salvo", async () => {
    const master = await mkUser("master");
    const cat = await mkCategory(`t9-invalido-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Arquivo inválido");

    const badExt = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("binário qualquer"), "imagem.png");
    assert.equal(badExt.status, 422);

    const empty = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("   \n\t  "), "vazio.txt");
    assert.equal(empty.status, 422);

    const count = await prisma.aIKnowledgeDocument.count({ where: { category_id: cat.id } });
    assert.equal(count, 0, "nenhum documento deve ter sido gravado");
  });

  it("9. reaplicar os padrões (ex.: reinício do servidor) nunca duplica as categorias já existentes", async () => {
    const before1 = await prisma.aIKnowledgeCategory.count({ where: { key: { in: ["produtos", "briefing", "quatro_fs", "processos", "politicas", "outros"] } } });
    await ensureDefaultKnowledgeCategories();
    await ensureDefaultKnowledgeCategories();
    await ensureDefaultKnowledgeCategories();
    const after1 = await prisma.aIKnowledgeCategory.count({ where: { key: { in: ["produtos", "briefing", "quatro_fs", "processos", "politicas", "outros"] } } });
    assert.equal(before1, 6);
    assert.equal(after1, 6);
  });

  // Correção ("preservação do histórico da Base de Conhecimento da
  // IAllka") — documento que faça parte de uma cadeia de versões nunca
  // pode ser apagado fisicamente; só Desativar. Ativar uma versão desativa
  // qualquer outra ativa da mesma cadeia; substituição/ativação
  // concorrentes nunca deixam duas versões ativas.
  describe("preservação do histórico de versões", () => {
    it("1. a versão ANTIGA (substituída) não pode ser excluída", async () => {
      const master = await mkUser("master");
      const cat = await mkCategory(`t9-hist-antiga-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Histórico — antiga");
      const v1 = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo v1."), "doc.txt");
      const v2 = await uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo v2."), "doc-v2.txt");
      assert.equal(v2.status, 201);

      const del = await api(`/api/ai-knowledge-base/documents/${v1.json.id}`, { method: "DELETE", token: master.token });
      assert.equal(del.status, 409);
      assert.match(del.json.error, /histórico de versões/i);
      assert.ok(await prisma.aIKnowledgeDocument.findUnique({ where: { id: v1.json.id } }), "a linha antiga continua existindo");
    });

    it("2. a versão VIGENTE não pode ser excluída quando pertence a uma cadeia (mas um documento sem histórico pode)", async () => {
      const master = await mkUser("master");
      const cat = await mkCategory(`t9-hist-vigente-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Histórico — vigente");
      const v1 = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo v1."), "doc.txt");
      const v2 = await uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo v2."), "doc-v2.txt");

      const delActive = await api(`/api/ai-knowledge-base/documents/${v2.json.id}`, { method: "DELETE", token: master.token });
      assert.equal(delActive.status, 409);
      assert.match(delActive.json.error, /histórico de versões/i);

      // documento SEM histórico (nunca substituiu, nunca foi substituído) — pode ser excluído normalmente.
      const standalone = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo avulso."), "avulso.txt");
      const delStandalone = await api(`/api/ai-knowledge-base/documents/${standalone.json.id}`, { method: "DELETE", token: master.token });
      assert.equal(delStandalone.status, 200);
      assert.equal(await prisma.aIKnowledgeDocument.findUnique({ where: { id: standalone.json.id } }), null);
    });

    it("3. desativar preserva conteúdo, versão, datas e a relação de substituição (nunca apaga)", async () => {
      const master = await mkUser("master");
      const cat = await mkCategory(`t9-hist-desativa-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Histórico — desativar");
      const v1 = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo v1."), "doc.txt");
      const v2 = await uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo v2."), "doc-v2.txt");

      const before = await prisma.aIKnowledgeDocument.findUniqueOrThrow({ where: { id: v2.json.id } });
      const deact = await api(`/api/ai-knowledge-base/documents/${v2.json.id}/deactivate`, { method: "POST", token: master.token });
      assert.equal(deact.status, 200);
      assert.equal(deact.json.is_active, false);

      const after = await prisma.aIKnowledgeDocument.findUniqueOrThrow({ where: { id: v2.json.id } });
      assert.equal(after.name, before.name);
      assert.equal(after.version, before.version);
      assert.equal(after.replaces_document_id, before.replaces_document_id);
      assert.equal(after.created_at.getTime(), before.created_at.getTime());
      assert.equal(after.file_name, before.file_name);
      // o conteúdo em disco continua existindo — nunca apagado
      const filePath = uploadedFilePath(`knowledge-base/${cat.key}`, after.file_name);
      assert.ok(fs.existsSync(filePath));
    });

    it("4. reativar uma versão antiga desativa a outra ativa da mesma cadeia (nunca duas vigentes)", async () => {
      const master = await mkUser("master");
      const cat = await mkCategory(`t9-hist-reativa-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Histórico — reativar");
      const v1 = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo v1."), "doc.txt");
      const v2 = await uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo v2."), "doc-v2.txt");
      // estado inicial: v1 inativa, v2 ativa (substituição já desativou v1)
      assert.equal((await prisma.aIKnowledgeDocument.findUniqueOrThrow({ where: { id: v1.json.id } })).is_active, false);
      assert.equal((await prisma.aIKnowledgeDocument.findUniqueOrThrow({ where: { id: v2.json.id } })).is_active, true);

      const reactivate = await api(`/api/ai-knowledge-base/documents/${v1.json.id}/activate`, { method: "POST", token: master.token });
      assert.equal(reactivate.status, 200);
      assert.equal(reactivate.json.is_active, true);

      const v1After = await prisma.aIKnowledgeDocument.findUniqueOrThrow({ where: { id: v1.json.id } });
      const v2After = await prisma.aIKnowledgeDocument.findUniqueOrThrow({ where: { id: v2.json.id } });
      assert.equal(v1After.is_active, true);
      assert.equal(v2After.is_active, false, "a outra versão da cadeia deve ter sido desativada automaticamente");

      const activeCount = await prisma.aIKnowledgeDocument.count({ where: { id: { in: [v1.json.id, v2.json.id] }, is_active: true } });
      assert.equal(activeCount, 1, "só uma versão ativa na cadeia");
    });

    it("5. ativações/substituições concorrentes nunca deixam duas versões ativas na mesma cadeia", async () => {
      const master = await mkUser("master");
      const cat = await mkCategory(`t9-hist-concorrente-${crypto.randomBytes(3).toString("hex")}`, "[TESTE] Histórico — concorrência");
      const v1 = await uploadFile(`/api/ai-knowledge-base/categories/${cat.key}/documents`, master.token, Buffer.from("Conteúdo v1."), "doc.txt");

      // duas substituições concorrentes da MESMA versão vigente — só uma
      // pode vencer (a outra esbarra na constraint única de
      // replaces_document_id e recebe 409, nunca cria duas "v2").
      const [replaceA, replaceB] = await Promise.all([
        uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo v2 — tentativa A."), "a.txt"),
        uploadFile(`/api/ai-knowledge-base/documents/${v1.json.id}/replace`, master.token, Buffer.from("Conteúdo v2 — tentativa B."), "b.txt"),
      ]);
      const statuses = [replaceA.status, replaceB.status].sort();
      assert.deepEqual(statuses, [201, 409], "uma substituição vence, a outra é recusada — nunca as duas criam versão");

      const chainDocs = await prisma.aIKnowledgeDocument.findMany({
        where: { OR: [{ id: v1.json.id }, { replaces_document_id: v1.json.id }] },
      });
      assert.equal(chainDocs.filter((d) => d.is_active).length, 1, "só uma versão ativa depois da corrida de substituição");

      // agora duas ativações concorrentes de versões DIFERENTES da mesma cadeia.
      const winner = chainDocs.find((d) => d.replaces_document_id === v1.json.id)!;
      await Promise.all([
        api(`/api/ai-knowledge-base/documents/${v1.json.id}/activate`, { method: "POST", token: master.token }),
        api(`/api/ai-knowledge-base/documents/${winner.id}/activate`, { method: "POST", token: master.token }),
      ]);
      const afterRace = await prisma.aIKnowledgeDocument.findMany({
        where: { id: { in: [v1.json.id, winner.id] } },
      });
      assert.equal(afterRace.filter((d) => d.is_active).length, 1, "duas ativações concorrentes nunca deixam duas versões ativas");
    });
  });
});

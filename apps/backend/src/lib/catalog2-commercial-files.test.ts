import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import fs from "fs";
import { buildCommercialUpdate, clientCommercialView, normalizeRichList, readList, readRichList, serializeCommercialFields, CommercialFieldError } from "./catalog2-commercial-fields";
import { storeDeliverableFile, DELIVERABLE_FILES_SUBPATH } from "./catalog2-deliverable-files";
import { uploadedFilePath } from "./file-storage";

const created: string[] = [];
after(() => { for (const id of created) fs.rmSync(uploadedFilePath(DELIVERABLE_FILES_SUBPATH, id), { force: true }); });
const up = (name: string, body = "conteudo") => { const r = storeDeliverableFile(name, Buffer.from(body), "application/octet-stream"); created.push(r.id); return r; };

describe("anexo opcional nos itens do Resumo dos entregáveis", () => {
  it("aceita qualquer tipo comum (pdf, zip, rar, planilha) e bloqueia executável/conteúdo ativo", () => {
    for (const n of ["modelo.pdf", "modelo.zip", "modelo.rar", "modelo.xlsx", "arte.psd", "sem-extensao"]) assert.ok(up(n).id);
    for (const n of ["x.exe", "x.html", "x.svg", "x.js", "x.bat", "X.EXE"]) assert.throws(() => storeDeliverableFile(n, Buffer.from("a"), "x"), /não são aceitos/);
    assert.throws(() => storeDeliverableFile("vazio.pdf", Buffer.alloc(0), "x"), /vazio/);
  });

  it("item sem anexo continua texto puro; com anexo vira { text, file } e volta igual na leitura", () => {
    const f = up("modelo.pdf");
    const items = normalizeRichList("Resumo", ["Relatório mensal", { text: "Planilha de metas", file: f }, "  ", "Relatório mensal"]);
    assert.deepEqual(items, ["Relatório mensal", { text: "Planilha de metas", file: f }]);
    const json = JSON.stringify(items);
    assert.deepEqual(readList(json), ["Relatório mensal", "Planilha de metas"]);
    assert.deepEqual(readRichList(json).map((i) => [i.text, i.file?.name ?? null]), [["Relatório mensal", null], ["Planilha de metas", "modelo.pdf"]]);
  });

  it("recusa referência inventada ou arquivo que não existe no servidor", () => {
    assert.throws(() => normalizeRichList("Resumo", [{ text: "A", file: { id: "../../etc/passwd", name: "x", size: 1, mime: "x" } }]), (e) => e instanceof CommercialFieldError && e.code === "list_item_file_invalid");
    assert.throws(() => normalizeRichList("Resumo", [{ text: "A", file: { id: "11111111-1111-4111-8111-111111111111.pdf", name: "x.pdf", size: 1, mime: "x" } }]), (e) => e instanceof CommercialFieldError && e.code === "list_item_file_missing");
  });

  it("o anexo é gravado na versão, aparece no editor e no cliente só quando o campo é visível", () => {
    const f = up("modelo.zip");
    const upd = buildCommercialUpdate({ deliverables_summary: [{ text: "Pacote de peças", file: f }, "Relatório"] }, {});
    const row: Record<string, unknown> = { ...upd.data };
    assert.ok(upd.changed.includes("Resumo dos entregáveis"));
    const admin = serializeCommercialFields(row) as unknown as { deliverables_summary: string[]; deliverables_summary_items: { text: string; file: { name: string } | null }[] };
    assert.deepEqual(admin.deliverables_summary, ["Pacote de peças", "Relatório"]);
    assert.equal(admin.deliverables_summary_items[0].file?.name, "modelo.zip");
    assert.equal(admin.deliverables_summary_items[1].file, null);
    assert.equal((clientCommercialView(row) as { deliverables_summary_items?: unknown[] }).deliverables_summary_items?.length, 2);
    row.field_visibility_json = JSON.stringify({ deliverables_summary: "internal" });
    assert.equal("deliverables_summary_items" in clientCommercialView(row), false);
  });
});

describe("quem vê cada campo: Todos veem / Cliente vê / Equipe interna vê", () => {
  const base = { target_audience: "Para PMEs", scope: "Escopo X", internal_notes: "segredo" };
  const vis = (v: Record<string, string>) => ({ ...base, field_visibility_json: JSON.stringify(v) });
  it("Todos veem aparece para empresa e para agência", () => {
    const row = vis({ target_audience: "client" });
    assert.equal((clientCommercialView(row, "company") as Record<string, unknown>).target_audience, "Para PMEs");
    assert.equal((clientCommercialView(row, "agency") as Record<string, unknown>).target_audience, "Para PMEs");
  });
  it("Cliente vê aparece para empresa (e na prévia do admin), não para agência", () => {
    const row = vis({ target_audience: "company" });
    assert.equal((clientCommercialView(row, "company") as Record<string, unknown>).target_audience, "Para PMEs");
    assert.equal((clientCommercialView(row, "admin_preview") as Record<string, unknown>).target_audience, "Para PMEs");
    assert.equal("target_audience" in clientCommercialView(row, "agency"), false);
  });
  it("Equipe interna vê (e o antigo 'só equipe') nunca aparece para cliente; observações internas sempre internas", () => {
    for (const v of ["internal", "team"]) {
      const row = vis({ target_audience: v });
      for (const viewer of ["company", "agency", "admin_preview"] as const) assert.equal("target_audience" in clientCommercialView(row, viewer), false);
    }
    assert.equal("internal_notes" in clientCommercialView(vis({ internal_notes: "client" })), false);
  });
  it("aceita o novo valor 'company' na gravação", () => {
    const r = buildCommercialUpdate({ field_visibility: { scope: "company" } }, {});
    assert.equal(JSON.parse(r.data.field_visibility_json as string).scope, "company");
  });
});

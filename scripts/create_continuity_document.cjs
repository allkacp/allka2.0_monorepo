// Gera "documentos/Registro de Continuidade Produtos Allka.docx" (e .md) a partir de documentos/registro-continuidade.json.
// Uso: node scripts/create_continuity_document.cjs   (Claude e ChatGPT atualizam o JSON e rodam este script)
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType } = require("docx");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "documentos");
const data = JSON.parse(fs.readFileSync(path.join(DIR, "registro-continuidade.json"), "utf8"));
const OUT = path.join(DIR, "Registro de Continuidade Produtos Allka.docx");

const h = (text, level = HeadingLevel.HEADING_1) => new Paragraph({ text, heading: level, spacing: { before: 200, after: 80 } });
const bullet = (text) => new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 40 } });
const para = (runs) => new Paragraph({ children: runs, spacing: { after: 60 } });
const FILL = { FEITO: "D9F2D9", "FEITO (interpretação)": "D9F2D9", PARCIAL: "FFF2CC", "NAO VERIFICADO": "FFF2CC", "NAO FEITO": "F8D7DA", ADIADO: "E7E6E6", "AGUARDANDO DOCUMENTO": "DDEBF7" };
const cell = (text, opts = {}) => new TableCell({
  width: { size: opts.w ?? 20, type: WidthType.PERCENTAGE },
  shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
  children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), bold: !!opts.bold, size: 17 })] })],
});

const children = [
  new Paragraph({ text: "Registro de Continuidade Produtos Allka", heading: HeadingLevel.TITLE }),
  para([new TextRun({ text: "Objetivo: ", bold: true }), new TextRun("manter o contexto do cadastro de produtos e permitir que Claude e ChatGPT (Codex) continuem exatamente do mesmo ponto. ")]),
  para([new TextRun({ text: "Atualizado em: ", bold: true }), new TextRun(data.atualizado_em)]),
  h("Como retomar"), ...data.como_retomar.map(bullet),
  h("Estado atual"), ...data.estado_atual.map(bullet),
  h("Decisões confirmadas"),
  ...data.decisoes.map(([t, d]) => para([new TextRun({ text: `${t}: `, bold: true }), new TextRun(d)])),
  h(data.checklist_titulo),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: [cell("#", { w: 5, bold: true, fill: "D9D9D9" }), cell("Item", { w: 35, bold: true, fill: "D9D9D9" }), cell("Situação", { w: 14, bold: true, fill: "D9D9D9" }), cell("Detalhe", { w: 46, bold: true, fill: "D9D9D9" })] }),
      ...data.checklist.map(([id, item, status, det]) => new TableRow({ children: [cell(id, { w: 5, bold: true }), cell(item, { w: 35 }), cell(status, { w: 14, bold: true, fill: FILL[status] }), cell(det, { w: 46 })] })),
    ],
  }),
  h("Validação pendente (teste manual)"), ...data.validacao_pendente.map(bullet),
  h("Próximo passo"), para([new TextRun(data.proximo_passo)]),
  h("Histórico"), ...data.historico.map(([d, t]) => para([new TextRun({ text: `${d}: `, bold: true }), new TextRun(t)])),
];

const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }] });

const md = [
  "# Registro de Continuidade Produtos Allka", `Atualizado em: ${data.atualizado_em}`, "",
  "## Como retomar", ...data.como_retomar.map((x) => `- ${x}`), "",
  "## Estado atual", ...data.estado_atual.map((x) => `- ${x}`), "",
  "## Decisões confirmadas", ...data.decisoes.map(([t, d]) => `- **${t}:** ${d}`), "",
  `## ${data.checklist_titulo}`, "| # | Item | Situação | Detalhe |", "|---|---|---|---|",
  ...data.checklist.map(([i, t, s, d]) => `| ${i} | ${t} | ${s} | ${d} |`), "",
  "## Validação pendente (teste manual)", ...data.validacao_pendente.map((x) => `- ${x}`), "",
  "## Próximo passo", data.proximo_passo, "",
  "## Histórico", ...data.historico.map(([d, t]) => `- **${d}:** ${t}`), "",
].join("\n");

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  fs.writeFileSync(path.join(DIR, "Registro de Continuidade Produtos Allka.md"), md);
  console.log("ok", OUT);
});

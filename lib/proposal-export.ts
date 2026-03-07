// @ts-nocheck
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

// ── Placeholder Schema ──────────────────────────────────────────────────────────

export const PROPOSAL_PLACEHOLDERS = [
  { code: "{PROJETO_NOME}", label: "Nome do Projeto", description: "Nome completo do projeto", example: "Florescer – Site Institucional" },
  { code: "{PROJETO_TIPO}", label: "Tipo do Projeto", description: "Mensal ou Avulso", example: "Avulso" },
  { code: "{PROJETO_STATUS}", label: "Status", description: "Status atual do projeto", example: "Aguardando Pagamento" },
  { code: "{PROJETO_DESCRICAO}", label: "Descrição", description: "Descrição completa do projeto", example: "Desenvolvimento de website..." },
  { code: "{CLIENTE_NOME}", label: "Nome do Cliente", description: "Nome do cliente final", example: "Florescer LTDA" },
  { code: "{EMPRESA_NOME}", label: "Nome da Empresa", description: "Nome da agência/empresa contratante", example: "Lamego Academy" },
  { code: "{CONSULTOR_NOME}", label: "Consultor Responsável", description: "Nome do consultor do projeto", example: "Carlos Lima" },
  { code: "{CONSULTOR_EMAIL}", label: "E-mail do Consultor", description: "E-mail de contato do consultor", example: "carlos@allka.digital" },
  { code: "{DATA_CRIACAO}", label: "Data de Criação", description: "Data em que o projeto foi criado", example: "19/02/2025" },
  { code: "{DATA_ENTREGA}", label: "Data de Entrega", description: "Prazo previsto de entrega", example: "22/03/2025" },
  { code: "{PROPOSTA_DATA}", label: "Data da Proposta", description: "Data de hoje (geração da proposta)", example: "07/03/2026" },
  { code: "{TOTAL_VALOR}", label: "Valor Total", description: "Soma de todos os produtos formatada em R$", example: "R$ 15.000,00" },
]

export const PROPOSAL_LOOP_PLACEHOLDERS = [
  { code: "{#produtos}", label: "Início do Loop de Produtos", description: "Marca o início da repetição — tudo entre aqui e {/produtos} será repetido para cada produto" },
  { code: "{PRODUTO_NOME}", label: "Nome do Produto", description: "Nome/descrição do serviço ou produto (usar dentro do loop)" },
  { code: "{PRODUTO_QTD}", label: "Quantidade", description: "Quantidade contratada (usar dentro do loop)" },
  { code: "{PRODUTO_VALOR_UNIT}", label: "Valor Unitário", description: "Valor por unidade em R$ (usar dentro do loop)" },
  { code: "{PRODUTO_VALOR_TOTAL}", label: "Valor Total do Item", description: "Quantidade × valor unitário formatado (usar dentro do loop)" },
  { code: "{/produtos}", label: "Fim do Loop de Produtos", description: "Marca o encerramento da repetição" },
]

// ── Types ────────────────────────────────────────────────────────────────────────

export interface BrandConfig {
  gradient: string
  logoUrl: string
  agencyName: string
}

export interface ProposalData {
  PROJETO_NOME: string
  PROJETO_TIPO: string
  PROJETO_STATUS: string
  PROJETO_DESCRICAO: string
  CLIENTE_NOME: string
  EMPRESA_NOME: string
  CONSULTOR_NOME: string
  CONSULTOR_EMAIL: string
  DATA_CRIACAO: string
  DATA_ENTREGA: string
  PROPOSTA_DATA: string
  TOTAL_VALOR: string
  produtos: Array<{
    PRODUTO_NOME: string
    PRODUTO_QTD: number | string
    PRODUTO_VALOR_UNIT: string
    PRODUTO_VALOR_TOTAL: string
  }>
}

// ── Helper ───────────────────────────────────────────────────────────────────────

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Extracts a usable CSS background string from sidebarSettings.backgroundColor */
export function parseBrandGradient(backgroundColor: string): string {
  if (backgroundColor?.startsWith("custom-gradient:")) {
    return backgroundColor.replace("custom-gradient:", "")
  }
  return "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)"
}

// ── Data Builder ─────────────────────────────────────────────────────────────────

export function buildProposalData(
  mockData: any,
  dadosProjForm: any,
  project: any
): ProposalData {
  const rawProdutos = mockData?.produtos || project?.products || []

  const produtos = rawProdutos.map((p: any) => {
    const nome = p.nome ?? p.name ?? ""
    const qty = p.quantidade ?? p.qty ?? 1
    const unitVal = p.valorUnitario ?? p.valor ?? p.price ?? 0
    const totalVal = p.valorTotal ?? qty * unitVal ?? 0
    return {
      PRODUTO_NOME: nome,
      PRODUTO_QTD: qty,
      PRODUTO_VALOR_UNIT: fmtCurrency(Number(unitVal)),
      PRODUTO_VALOR_TOTAL: fmtCurrency(Number(totalVal)),
    }
  })

  const total = rawProdutos.reduce((acc: number, p: any) => {
    const qty = p.quantidade ?? p.qty ?? 1
    const unitVal = p.valorUnitario ?? p.valor ?? p.price ?? 0
    return acc + (p.valorTotal ?? qty * unitVal ?? 0)
  }, 0)

  const today = new Date().toLocaleDateString("pt-BR")

  return {
    PROJETO_NOME: dadosProjForm?.nome ?? project?.name ?? mockData?.nome ?? "",
    PROJETO_TIPO: dadosProjForm?.lifecycle ?? project?.type ?? "",
    PROJETO_STATUS: project?.status ?? mockData?.situacao ?? "",
    PROJETO_DESCRICAO: dadosProjForm?.descricao ?? project?.description ?? mockData?.descricao ?? "",
    CLIENTE_NOME: dadosProjForm?.cliente ?? project?.client ?? mockData?.cliente ?? "",
    EMPRESA_NOME: dadosProjForm?.agencia ?? project?.company ?? mockData?.agencia ?? "",
    CONSULTOR_NOME: dadosProjForm?.consultorResponsavel ?? mockData?.consultorResponsavel ?? "",
    CONSULTOR_EMAIL: dadosProjForm?.emailConsultor ?? mockData?.emailConsultor ?? "",
    DATA_CRIACAO: dadosProjForm?.dataCriacao ?? mockData?.dataCriacao ?? "",
    DATA_ENTREGA: dadosProjForm?.dataEntrega ?? project?.deadline ?? "",
    PROPOSTA_DATA: today,
    TOTAL_VALOR: fmtCurrency(Number(total)),
    produtos,
  }
}

// ── HTML Builder for PDF ─────────────────────────────────────────────────────────

function buildProposalHTML(data: ProposalData, brandConfig: BrandConfig): string {
  const productsRows = data.produtos.map(p => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #e2e8f0;">${p.PRODUTO_NOME}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center;border-bottom:1px solid #e2e8f0;">${p.PRODUTO_QTD}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${p.PRODUTO_VALOR_UNIT}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:600;border-bottom:1px solid #e2e8f0;">${p.PRODUTO_VALOR_TOTAL}</td>
    </tr>`).join("")

  return `<div style="width:794px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#1e293b;line-height:1.5;">
  <div style="background:${brandConfig.gradient};padding:40px 48px 32px;color:#fff;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <img src="${brandConfig.logoUrl}" alt="logo" style="height:36px;object-fit:contain;" onerror="this.style.display='none'" />
      <div style="text-align:right;">
        <div style="font-size:10px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;">Proposta Comercial</div>
        <div style="font-size:11px;opacity:0.7;margin-top:2px;">${data.PROPOSTA_DATA}</div>
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:700;margin:0 0 6px;">${data.PROJETO_NOME}</h1>
    <div style="font-size:12px;opacity:0.75;">${brandConfig.agencyName}</div>
  </div>
  <div style="padding:32px 48px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
      <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:8px;font-weight:600;">Cliente</div>
        <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${data.CLIENTE_NOME}</div>
        <div style="font-size:12px;color:#64748b;">${data.EMPRESA_NOME}</div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:8px;font-weight:600;">Consultor</div>
        <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${data.CONSULTOR_NOME}</div>
        <div style="font-size:12px;color:#64748b;">${data.CONSULTOR_EMAIL}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px;">
      <div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0;text-align:center;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;">Criação</div>
        <div style="font-size:13px;font-weight:700;">${data.DATA_CRIACAO}</div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0;text-align:center;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;">Entrega</div>
        <div style="font-size:13px;font-weight:700;">${data.DATA_ENTREGA}</div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0;text-align:center;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;">Tipo</div>
        <div style="font-size:13px;font-weight:700;">${data.PROJETO_TIPO}</div>
      </div>
    </div>
    ${data.PROJETO_DESCRICAO ? `<div style="margin-bottom:24px;">
      <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px;">Descrição</div>
      <p style="font-size:12px;color:#334155;line-height:1.6;margin:0;padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">${data.PROJETO_DESCRICAO}</p>
    </div>` : ""}
    <div>
      <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px;">Produtos &amp; Serviços</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px;font-size:11px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">PRODUTO / SERVIÇO</th>
            <th style="padding:10px 12px;font-size:11px;text-align:center;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">QTD</th>
            <th style="padding:10px 12px;font-size:11px;text-align:right;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">VALOR UNIT.</th>
            <th style="padding:10px 12px;font-size:11px;text-align:right;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${productsRows}</tbody>
        <tfoot>
          <tr style="background:#f8fafc;">
            <td colspan="3" style="padding:12px;font-size:13px;font-weight:700;text-align:right;border-top:2px solid #e2e8f0;">TOTAL GERAL</td>
            <td style="padding:12px;font-size:15px;font-weight:800;text-align:right;border-top:2px solid #e2e8f0;color:#4f46e5;">${data.TOTAL_VALOR}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  <div style="background:#1e293b;color:#94a3b8;padding:18px 48px;font-size:10px;display:flex;justify-content:space-between;">
    <span>${brandConfig.agencyName} — Proposta gerada em ${data.PROPOSTA_DATA}</span>
    <span>Documento Confidencial</span>
  </div>
</div>`
}

// ── PDF Export (html2canvas + jsPDF) ─────────────────────────────────────────────

export async function exportProposalPDF(
  data: ProposalData,
  brandConfig: BrandConfig,
  filename = "proposta.pdf"
): Promise<void> {
  const container = document.createElement("div")
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;pointer-events:none;"
  container.innerHTML = buildProposalHTML(data, brandConfig)
  document.body.appendChild(container)
  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pageWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

// ── Custom Docx Processing (docxtemplater + pizzip) ──────────────────────────────

export async function processCustomDocx(
  file: File,
  data: ProposalData
): Promise<Blob> {
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import("pizzip"),
    import("docxtemplater"),
  ])
  const arrayBuffer = await file.arrayBuffer()
  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })
  doc.render(data)
  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
  return out
}

// ── Custom Docx → PDF (mammoth + html2canvas + jsPDF) ────────────────────────────

export async function customDocxToPDF(
  docxBlob: Blob,
  filename = "proposta-personalizada.pdf"
): Promise<void> {
  const { default: mammoth } = await import("mammoth")
  const arrayBuffer = await docxBlob.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const container = document.createElement("div")
  container.style.cssText =
    "position:absolute;left:-9999px;top:0;width:794px;background:#fff;padding:40px;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#1e293b;"
  container.innerHTML = result.value
  document.body.appendChild(container)
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pageWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

// ── Template Model Generator (docx package) ──────────────────────────────────────

export async function generateTemplateModel(): Promise<void> {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel,
  } = await import("docx")
  const headerParagraph = new Paragraph({
    children: [
      new TextRun({ text: "MODELO DE PROPOSTA — ALLKA", bold: true, size: 32, color: "6D28D9" }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  })

  const subtitleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: "Use este documento como base para criar suas próprias propostas personalizadas.",
        size: 22,
        italics: true,
        color: "64748B",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  })

  const instrTitle = new Paragraph({
    children: [new TextRun({ text: "Como usar", bold: true, size: 26 })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 200 },
  })

  const instrText = new Paragraph({
    children: [
      new TextRun({
        text: "Mantenha os códigos entre chaves EXATAMENTE como escritos (respeitando maiúsculas). Ao exportar via 'Documento Personalizado', cada código será substituído pelos dados reais do projeto. O loop {#produtos}...{/produtos} se repete para cada produto adicionado.",
        size: 20,
      }),
    ],
    spacing: { after: 400 },
  })

  // Fields table
  const fieldsTitle = new Paragraph({
    children: [new TextRun({ text: "Campos Individuais", bold: true, size: 24 })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 200 },
  })

  const fieldRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Código", bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Descrição", bold: true })] })],
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Exemplo de saída", bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...PROPOSAL_PLACEHOLDERS.map(
      (ph) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ph.code, font: "Courier New" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ph.description })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ph.example, italics: true, color: "64748B" })] })],
            }),
          ],
        })
    ),
  ]

  const fieldsTable = new Table({
    rows: fieldRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  // Loop table
  const loopTitle = new Paragraph({
    children: [new TextRun({ text: "Loop de Produtos", bold: true, size: 24 })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 600, after: 200 },
  })

  const loopInstruction = new Paragraph({
    children: [
      new TextRun({
        text: "Tudo entre {#produtos} e {/produtos} se repete para cada produto do projeto:",
        size: 20,
      }),
    ],
    spacing: { after: 200 },
  })

  const loopRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Código", bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Descrição", bold: true })] })],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...PROPOSAL_LOOP_PLACEHOLDERS.map(
      (ph) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ph.code, font: "Courier New" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ph.description })] })],
            }),
          ],
        })
    ),
  ]

  const loopTable = new Table({
    rows: loopRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  // Example section
  const exampleTitle = new Paragraph({
    children: [new TextRun({ text: "Exemplo de Template Completo", bold: true, size: 24 })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 600, after: 200 },
  })

  const exampleLines = [
    "PROPOSTA COMERCIAL",
    "",
    "Projeto: {PROJETO_NOME}",
    "Data: {PROPOSTA_DATA}",
    "Tipo: {PROJETO_TIPO}",
    "",
    "Cliente: {CLIENTE_NOME}",
    "Empresa: {EMPRESA_NOME}",
    "Consultor: {CONSULTOR_NOME} | {CONSULTOR_EMAIL}",
    "Criado em: {DATA_CRIACAO}   Entrega prevista: {DATA_ENTREGA}",
    "",
    "Descrição:",
    "{PROJETO_DESCRICAO}",
    "",
    "────────────────────────────────",
    "PRODUTOS E SERVIÇOS",
    "────────────────────────────────",
    "{#produtos}",
    "  • {PRODUTO_NOME}    Qtd: {PRODUTO_QTD}    Unit: {PRODUTO_VALOR_UNIT}    Total: {PRODUTO_VALOR_TOTAL}",
    "{/produtos}",
    "────────────────────────────────",
    "TOTAL GERAL: {TOTAL_VALOR}",
  ]

  const exampleParagraphs = exampleLines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, font: "Courier New", size: 18 })],
        spacing: { after: 0 },
      })
  )

  const doc = new Document({
    sections: [
      {
        children: [
          headerParagraph,
          subtitleParagraph,
          instrTitle,
          instrText,
          fieldsTitle,
          fieldsTable,
          loopTitle,
          loopInstruction,
          loopTable,
          exampleTitle,
          ...exampleParagraphs,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(
    blob,
    "modelo-proposta-allka.docx"
  )
}

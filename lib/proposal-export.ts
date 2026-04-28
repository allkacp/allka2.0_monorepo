// @ts-nocheck
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ── Placeholder Schema ──────────────────────────────────────────────────────────

export const PROPOSAL_PLACEHOLDERS = [
  {
    code: "{PROJETO_NOME}",
    label: "Nome do Projeto",
    description: "Nome completo do projeto",
    example: "Florescer – Site Institucional",
  },
  {
    code: "{PROJETO_TIPO}",
    label: "Tipo do Projeto",
    description: "Mensal ou Avulso",
    example: "Avulso",
  },
  {
    code: "{PROJETO_STATUS}",
    label: "Status",
    description: "Status atual do projeto",
    example: "Aguardando Pagamento",
  },
  {
    code: "{PROJETO_DESCRICAO}",
    label: "Descrição",
    description: "Descrição completa do projeto",
    example: "Desenvolvimento de website...",
  },
  {
    code: "{CLIENTE_NOME}",
    label: "Nome do Cliente",
    description: "Nome do cliente final",
    example: "Florescer LTDA",
  },
  {
    code: "{EMPRESA_NOME}",
    label: "Nome da Empresa",
    description: "Nome da agência/empresa contratante",
    example: "Lamego Academy",
  },
  {
    code: "{CONSULTOR_NOME}",
    label: "Consultor Responsável",
    description: "Nome do consultor do projeto",
    example: "Carlos Lima",
  },
  {
    code: "{CONSULTOR_EMAIL}",
    label: "E-mail do Consultor",
    description: "E-mail de contato do consultor",
    example: "carlos@allka.digital",
  },
  {
    code: "{DATA_CRIACAO}",
    label: "Data de Criação",
    description: "Data em que o projeto foi criado",
    example: "19/02/2025",
  },
  {
    code: "{DATA_ENTREGA}",
    label: "Data de Entrega",
    description: "Prazo previsto de entrega",
    example: "22/03/2025",
  },
  {
    code: "{PROPOSTA_DATA}",
    label: "Data da Proposta",
    description: "Data de hoje (geração da proposta)",
    example: "07/03/2026",
  },
  {
    code: "{TOTAL_VALOR}",
    label: "Valor Total",
    description: "Soma de todos os produtos formatada em R$",
    example: "R$ 15.000,00",
  },
];

export const PROPOSAL_LOOP_PLACEHOLDERS = [
  {
    code: "{#produtos}",
    label: "Início do Loop de Produtos",
    description:
      "Marca o início da repetição — tudo entre aqui e {/produtos} será repetido para cada produto",
  },
  {
    code: "{PRODUTO_NOME}",
    label: "Nome do Produto",
    description: "Nome/descrição do serviço ou produto (usar dentro do loop)",
  },
  {
    code: "{PRODUTO_QTD}",
    label: "Quantidade",
    description: "Quantidade contratada (usar dentro do loop)",
  },
  {
    code: "{PRODUTO_VALOR_UNIT}",
    label: "Valor Unitário",
    description: "Valor por unidade em R$ (usar dentro do loop)",
  },
  {
    code: "{PRODUTO_VALOR_TOTAL}",
    label: "Valor Total do Item",
    description: "Quantidade × valor unitário formatado (usar dentro do loop)",
  },
  {
    code: "{/produtos}",
    label: "Fim do Loop de Produtos",
    description: "Marca o encerramento da repetição",
  },
];

// ── Types ────────────────────────────────────────────────────────────────────────

export interface BrandConfig {
  gradient: string;
  logoUrl: string;
  agencyName: string;
}

export interface ProposalData {
  PROJETO_NOME: string;
  PROJETO_TIPO: string;
  PROJETO_STATUS: string;
  PROJETO_DESCRICAO: string;
  CLIENTE_NOME: string;
  EMPRESA_NOME: string;
  CONSULTOR_NOME: string;
  CONSULTOR_EMAIL: string;
  DATA_CRIACAO: string;
  DATA_ENTREGA: string;
  PROPOSTA_DATA: string;
  TOTAL_VALOR: string;
  produtos: Array<{
    PRODUTO_NOME: string;
    PRODUTO_QTD: number | string;
    PRODUTO_VALOR_UNIT: string;
    PRODUTO_VALOR_TOTAL: string;
  }>;
}

// ── Helper ───────────────────────────────────────────────────────────────────────

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Extracts a usable CSS background string from sidebarSettings.backgroundColor */
export function parseBrandGradient(backgroundColor: string): string {
  if (backgroundColor?.startsWith("custom-gradient:")) {
    return backgroundColor.replace("custom-gradient:", "");
  }
  return "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)";
}

// ── Data Builder ─────────────────────────────────────────────────────────────────

export function buildProposalData(
  mockData: any,
  dadosProjForm: any,
  project: any,
): ProposalData {
  const rawProdutos = mockData?.produtos || project?.products || [];

  const produtos = rawProdutos.map((p: any) => {
    const nome = p.nome ?? p.name ?? "";
    const qty = p.quantidade ?? p.qty ?? 1;
    const unitVal = p.valorUnitario ?? p.valor ?? p.price ?? 0;
    const totalVal = p.valorTotal ?? qty * unitVal ?? 0;
    return {
      PRODUTO_NOME: nome,
      PRODUTO_QTD: qty,
      PRODUTO_VALOR_UNIT: fmtCurrency(Number(unitVal)),
      PRODUTO_VALOR_TOTAL: fmtCurrency(Number(totalVal)),
    };
  });

  const total = rawProdutos.reduce((acc: number, p: any) => {
    const qty = p.quantidade ?? p.qty ?? 1;
    const unitVal = p.valorUnitario ?? p.valor ?? p.price ?? 0;
    return acc + (p.valorTotal ?? qty * unitVal ?? 0);
  }, 0);

  const today = new Date().toLocaleDateString("pt-BR");

  return {
    PROJETO_NOME: dadosProjForm?.nome ?? project?.name ?? mockData?.nome ?? "",
    PROJETO_TIPO: dadosProjForm?.lifecycle ?? project?.type ?? "",
    PROJETO_STATUS: project?.status ?? mockData?.situacao ?? "",
    PROJETO_DESCRICAO:
      dadosProjForm?.descricao ??
      project?.description ??
      mockData?.descricao ??
      "",
    CLIENTE_NOME:
      dadosProjForm?.cliente ?? project?.client ?? mockData?.cliente ?? "",
    EMPRESA_NOME:
      dadosProjForm?.agencia ?? project?.company ?? mockData?.agencia ?? "",
    CONSULTOR_NOME:
      dadosProjForm?.consultorResponsavel ??
      mockData?.consultorResponsavel ??
      "",
    CONSULTOR_EMAIL:
      dadosProjForm?.emailConsultor ?? mockData?.emailConsultor ?? "",
    DATA_CRIACAO: dadosProjForm?.dataCriacao ?? mockData?.dataCriacao ?? "",
    DATA_ENTREGA: dadosProjForm?.dataEntrega ?? project?.deadline ?? "",
    PROPOSTA_DATA: today,
    TOTAL_VALOR: fmtCurrency(Number(total)),
    produtos,
  };
}

// ── HTML Builder for PDF ─────────────────────────────────────────────────────────

function buildProposalHTML(
  data: ProposalData,
  brandConfig: BrandConfig,
): string {
  // Product rows — numbered, alternating background
  const productRows = data.produtos
    .map(
      (p, i) => `
    <tr>
      <td style="padding:13px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="min-width:22px;height:22px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#94a3b8;flex-shrink:0;margin-top:1px;">${i + 1}</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#0f172a;line-height:1.3;">${p.PRODUTO_NOME}</div>
          </div>
        </div>
      </td>
      <td style="padding:13px 16px;text-align:center;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
        <div style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;color:#334155;">${p.PRODUTO_QTD}</div>
      </td>
      <td style="padding:13px 16px;text-align:right;border-bottom:1px solid #f1f5f9;vertical-align:middle;font-size:12px;color:#64748b;">${p.PRODUTO_VALOR_UNIT}</td>
      <td style="padding:13px 16px;text-align:right;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
        <span style="font-size:13px;font-weight:700;color:#0f172a;">${p.PRODUTO_VALOR_TOTAL}</span>
      </td>
    </tr>`,
    )
    .join("");

  const hasProducts = data.produtos.length > 0;
  const hasDescription = !!data.PROJETO_DESCRICAO;
  const hasPrazo = !!data.DATA_ENTREGA;
  const hasTipo = !!data.PROJETO_TIPO;
  const hasInicio = !!data.DATA_CRIACAO;

  return `<div style="width:794px;background:#fff;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">

  <!-- ── CAPA / HEADER ── -->
  <div style="background:${brandConfig.gradient};position:relative;overflow:hidden;padding:52px 52px 44px;">
    <!-- Decorative circles -->
    <div style="position:absolute;top:-50px;right:-50px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
    <div style="position:absolute;bottom:-70px;right:90px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
    <div style="position:absolute;top:30px;right:200px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>

    <!-- Logo + badge -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:44px;position:relative;">
      <img src="${brandConfig.logoUrl}" alt="logo" style="height:38px;object-fit:contain;" onerror="this.style.display='none'" />
      <div style="text-align:right;">
        <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:5px 16px;font-size:9px;color:rgba(255,255,255,0.95);text-transform:uppercase;letter-spacing:2px;font-weight:700;">Proposta Comercial</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:7px;">${data.PROPOSTA_DATA}</div>
      </div>
    </div>

    <!-- Project title -->
    <div style="position:relative;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:12px;">Projeto</div>
      <h1 style="font-size:34px;font-weight:800;color:#fff;margin:0;letter-spacing:-0.5px;line-height:1.15;">${data.PROJETO_NOME}</h1>
      <div style="width:52px;height:3px;background:rgba(255,255,255,0.35);border-radius:2px;margin-top:20px;"></div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:14px;font-weight:500;">${brandConfig.agencyName}</div>
    </div>
  </div>

  <!-- ── FAIXA DE DESTAQUE (cliente + consultor) ── -->
  <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:0 52px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;padding:24px 0;vertical-align:top;border-right:1px solid #e2e8f0;padding-right:32px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;font-weight:700;margin-bottom:8px;">Preparado para</div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:3px;line-height:1.2;">${data.CLIENTE_NOME || "—"}</div>
          ${data.EMPRESA_NOME ? `<div style="font-size:12px;color:#64748b;font-weight:500;">${data.EMPRESA_NOME}</div>` : ""}
        </td>
        <td style="width:50%;padding:24px 0;vertical-align:top;padding-left:32px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;font-weight:700;margin-bottom:8px;">Consultor responsável</div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:3px;line-height:1.2;">${data.CONSULTOR_NOME || "—"}</div>
          ${data.CONSULTOR_EMAIL ? `<div style="font-size:12px;color:#64748b;">${data.CONSULTOR_EMAIL}</div>` : ""}
        </td>
      </tr>
    </table>
  </div>

  <!-- ── TIMELINE STRIP ── -->
  ${
    hasInicio || hasPrazo || hasTipo
      ? `
  <div style="padding:0 52px;background:#fff;border-bottom:1px solid #f1f5f9;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        ${
          hasInicio
            ? `<td style="padding:18px 0;text-align:center;border-right:1px solid #f1f5f9;vertical-align:middle;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:600;margin-bottom:5px;">Data de Início</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${data.DATA_CRIACAO}</div>
        </td>`
            : ""
        }
        ${
          hasPrazo
            ? `<td style="padding:18px 0;text-align:center;border-right:1px solid #f1f5f9;vertical-align:middle;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:600;margin-bottom:5px;">Prazo de Entrega</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${data.DATA_ENTREGA}</div>
        </td>`
            : ""
        }
        ${
          hasTipo
            ? `<td style="padding:18px 0;text-align:center;vertical-align:middle;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:600;margin-bottom:5px;">Modalidade</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${data.PROJETO_TIPO}</div>
        </td>`
            : ""
        }
      </tr>
    </table>
  </div>
  `
      : ""
  }

  <!-- ── CONTEÚDO PRINCIPAL ── -->
  <div style="padding:36px 52px;">

    <!-- Escopo / Descrição -->
    ${
      hasDescription
        ? `
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:3px;height:18px;background:linear-gradient(to bottom,#6366f1,#8b5cf6);border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#6366f1;font-weight:700;">Escopo do Projeto</div>
      </div>
      <div style="background:linear-gradient(135deg,#fafafe 0%,#f8fafc 100%);border:1px solid #e2e8f0;border-left:3px solid #6366f1;border-radius:0 10px 10px 0;padding:18px 20px;">
        <p style="font-size:13px;color:#334155;line-height:1.75;margin:0;">${data.PROJETO_DESCRICAO}</p>
      </div>
    </div>
    `
        : ""
    }

    <!-- Produtos & Serviços -->
    ${
      hasProducts
        ? `
    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:3px;height:18px;background:linear-gradient(to bottom,#0ea5e9,#6366f1);border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#0ea5e9;font-weight:700;">Produtos &amp; Serviços Incluídos</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:11px 16px;font-size:9px;text-align:left;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e2e8f0;">Produto / Serviço</th>
              <th style="padding:11px 16px;font-size:9px;text-align:center;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e2e8f0;width:60px;">Qtd</th>
              <th style="padding:11px 16px;font-size:9px;text-align:right;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e2e8f0;width:110px;">Unit.</th>
              <th style="padding:11px 16px;font-size:9px;text-align:right;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e2e8f0;width:120px;">Total</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Total em destaque -->
    <div style="border-radius:14px;overflow:hidden;margin-bottom:8px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:22px 28px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);vertical-align:middle;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:4px;">Investimento Total</div>
            <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${data.TOTAL_VALOR}</div>
          </td>
          <td style="padding:22px 28px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);vertical-align:middle;text-align:right;width:200px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.6);margin-bottom:6px;">Itens incluídos</div>
            <div style="font-size:22px;font-weight:800;color:#fff;">${data.produtos.length} ${data.produtos.length === 1 ? "item" : "itens"}</div>
          </td>
        </tr>
      </table>
    </div>
    `
        : `
    <div style="border:2px dashed #e2e8f0;border-radius:12px;padding:32px;text-align:center;color:#94a3b8;">
      <div style="font-size:13px;">Nenhum produto adicionado a esta proposta</div>
    </div>
    `
    }

  </div>

  <!-- ── RODAPÉ ── -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 52px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:middle;">
          <div style="font-size:10px;color:#94a3b8;">${brandConfig.agencyName} · Proposta gerada em ${data.PROPOSTA_DATA}</div>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;border:1px solid #e2e8f0;border-radius:4px;padding:3px 10px;font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Documento Confidencial</div>
        </td>
      </tr>
    </table>
  </div>

</div>`;
}

// ── PDF Export (html2canvas + jsPDF) ─────────────────────────────────────────────

export async function exportProposalPDF(
  data: ProposalData,
  brandConfig: BrandConfig,
  filename = "proposta.pdf",
): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:-9999px;top:0;width:794px;pointer-events:none;";
  container.innerHTML = buildProposalHTML(data, brandConfig);
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(
      container.firstElementChild as HTMLElement,
      {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      },
    );
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// ── Custom Docx Processing (docxtemplater + pizzip) ──────────────────────────────

export async function processCustomDocx(
  file: File,
  data: ProposalData,
): Promise<Blob> {
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import("pizzip"),
    import("docxtemplater"),
  ]);
  const arrayBuffer = await file.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  const out = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return out;
}

// ── Custom Docx → PDF (mammoth + html2canvas + jsPDF) ────────────────────────────

export async function customDocxToPDF(
  docxBlob: Blob,
  filename = "proposta-personalizada.pdf",
): Promise<void> {
  const { default: mammoth } = await import("mammoth");
  const arrayBuffer = await docxBlob.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:-9999px;top:0;width:794px;background:#fff;padding:40px;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#1e293b;";
  container.innerHTML = result.value;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// ── Template Model Generator (docx package) ──────────────────────────────────────

export async function generateTemplateModel(): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    HeadingLevel,
  } = await import("docx");
  const headerParagraph = new Paragraph({
    children: [
      new TextRun({
        text: "MODELO DE PROPOSTA — ALLKA",
        bold: true,
        size: 32,
        color: "6D28D9",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });

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
  });

  const instrTitle = new Paragraph({
    children: [new TextRun({ text: "Como usar", bold: true, size: 26 })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 200 },
  });

  const instrText = new Paragraph({
    children: [
      new TextRun({
        text: "Mantenha os códigos entre chaves EXATAMENTE como escritos (respeitando maiúsculas). Ao exportar via 'Documento Personalizado', cada código será substituído pelos dados reais do projeto. O loop {#produtos}...{/produtos} se repete para cada produto adicionado.",
        size: 20,
      }),
    ],
    spacing: { after: 400 },
  });

  // Fields table
  const fieldsTitle = new Paragraph({
    children: [
      new TextRun({ text: "Campos Individuais", bold: true, size: 24 }),
    ],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 200 },
  });

  const fieldRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Código", bold: true })],
            }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Descrição", bold: true })],
            }),
          ],
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Exemplo de saída", bold: true })],
            }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...PROPOSAL_PLACEHOLDERS.map(
      (ph) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: ph.code, font: "Courier New" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ph.description })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: ph.example,
                      italics: true,
                      color: "64748B",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  ];

  const fieldsTable = new Table({
    rows: fieldRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // Loop table
  const loopTitle = new Paragraph({
    children: [new TextRun({ text: "Loop de Produtos", bold: true, size: 24 })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 600, after: 200 },
  });

  const loopInstruction = new Paragraph({
    children: [
      new TextRun({
        text: "Tudo entre {#produtos} e {/produtos} se repete para cada produto do projeto:",
        size: 20,
      }),
    ],
    spacing: { after: 200 },
  });

  const loopRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Código", bold: true })],
            }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Descrição", bold: true })],
            }),
          ],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...PROPOSAL_LOOP_PLACEHOLDERS.map(
      (ph) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: ph.code, font: "Courier New" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ph.description })],
                }),
              ],
            }),
          ],
        }),
    ),
  ];

  const loopTable = new Table({
    rows: loopRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // Example section
  const exampleTitle = new Paragraph({
    children: [
      new TextRun({
        text: "Exemplo de Template Completo",
        bold: true,
        size: 24,
      }),
    ],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 600, after: 200 },
  });

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
  ];

  const exampleParagraphs = exampleLines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, font: "Courier New", size: 18 })],
        spacing: { after: 0 },
      }),
  );

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
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, "modelo-proposta-allka.docx");
}

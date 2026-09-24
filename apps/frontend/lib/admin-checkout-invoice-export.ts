// Fatura em PDF da contratação feita pelo Admin Master em nome de empresa/
// agência — achado do usuário 2026-09-23: "tinha que aparecer... fatura
// para baixar, PDF, tudo certinho". Reaproveita o MESMO padrão já usado
// pra exportar proposta em PDF (html-to-image + jsPDF, ver proposal-export.ts)
// — nunca uma segunda biblioteca/abordagem de PDF.

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const SETTLEMENT_LABEL: Record<string, string> = {
  ALLKOINS: "Carteira allkoin",
  BRINDE: "Cortesia (brinde)",
  LINK_PAGAMENTO: "Link de pagamento (pendente)",
};

export interface AdminCheckoutInvoiceData {
  invoiceNumber: string | null;
  projectTitle: string;
  projectCode: string;
  targetName: string;
  targetKind: "company" | "agency";
  amount: number;
  paidAt: string | Date | null;
  settlement: string;
  motivo: string;
  paymentId: string;
}

function buildInvoiceHTML(data: AdminCheckoutInvoiceData): string {
  return `<div style="width:794px;padding:48px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7c3aed;padding-bottom:20px;margin-bottom:28px;">
      <div>
        <div style="font-size:22px;font-weight:800;background:linear-gradient(90deg,#4a2cff,#d92293);-webkit-background-clip:text;background-clip:text;color:#7c3aed;">ALLKA</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">Comprovante de contratação</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#64748b;">Fatura</div>
        <div style="font-size:16px;font-weight:700;">${data.invoiceNumber ?? "—"}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:6px 0;font-size:11px;color:#64748b;width:180px;">Contratado para</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;">${data.targetName} <span style="font-size:10px;color:#94a3b8;font-weight:400;">(${data.targetKind === "company" ? "empresa" : "agência"})</span></td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:11px;color:#64748b;">Projeto</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;">${data.projectTitle} <span style="font-size:10px;color:#94a3b8;font-weight:400;">(${data.projectCode})</span></td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:11px;color:#64748b;">Data</td>
        <td style="padding:6px 0;font-size:13px;">${data.paidAt ? fmtDate(data.paidAt) : "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:11px;color:#64748b;">Forma de acerto</td>
        <td style="padding:6px 0;font-size:13px;">${SETTLEMENT_LABEL[data.settlement] ?? data.settlement}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:11px;color:#64748b;vertical-align:top;">Motivo da contratação</td>
        <td style="padding:6px 0;font-size:13px;">${data.motivo}</td>
      </tr>
    </table>

    <div style="border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:12px;color:#64748b;">Valor total</div>
      <div style="font-size:24px;font-weight:800;color:#7c3aed;">${fmtBRL(data.amount)}</div>
    </div>

    <div style="margin-top:36px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
      Documento gerado automaticamente pela plataforma Allka — contratação registrada pelo administrador (ID do pagamento: ${data.paymentId}).
    </div>
  </div>`;
}

export async function exportAdminCheckoutInvoicePDF(data: AdminCheckoutInvoiceData, filename = "fatura.pdf"): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;pointer-events:none;";
  container.innerHTML = buildInvoiceHTML(data);
  document.body.appendChild(container);
  try {
    const element = container.firstElementChild as HTMLElement | null;
    if (!element) throw new Error("Falha ao montar a estrutura HTML da fatura.");

    const [{ toPng }, { jsPDF: JsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: element.offsetWidth || 794,
      cacheBust: true,
    });
    const img = new Image();
    const { width: pxW, height: pxH } = await new Promise<{ width: number; height: number }>((resolve) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1588, height: 2245 });
      img.src = dataUrl;
    });
    const pdf = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (pxH / pxW) * pageWidth;
    pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, imgHeight);
    await pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// @ts-nocheck
// Real PDF export for the report catalog cards ("Visualizar"/"Baixar").
// Reuses the html-to-image + jsPDF pipeline already established in
// lib/proposal-export.ts for the same kind of single-page A4 snapshot.

export interface ReportExportMeta {
  categoryName: string;
  dateRangeLabel: string;
  generatedAt: string;
}

function buildReportSummaryHTML(
  report: { name: string; desc: string; formats: string[] },
  meta: ReportExportMeta,
): string {
  return `<div style="width:794px;background:#fff;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;padding:0;">
    <div style="background:linear-gradient(135deg,#0a1628 0%,#1e3a8a 60%,#0a1628 100%);padding:44px 52px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:12px;">${meta.categoryName}</div>
      <h1 style="font-size:28px;font-weight:800;color:#fff;margin:0;letter-spacing:-0.5px;line-height:1.2;">${report.name}</h1>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:14px;">Gerado em ${meta.generatedAt} · Período: ${meta.dateRangeLabel}</div>
    </div>
    <div style="padding:36px 52px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#6366f1;font-weight:700;margin-bottom:10px;">Descrição</div>
      <p style="font-size:13px;color:#334155;line-height:1.75;margin:0 0 28px 0;">${report.desc}</p>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#6366f1;font-weight:700;margin-bottom:10px;">Formatos disponíveis</div>
      <div style="display:flex;gap:6px;">
        ${report.formats
          .map(
            (f) =>
              `<span style="display:inline-block;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:4px 12px;font-size:11px;color:#0369a1;font-weight:600;">${f}</span>`,
          )
          .join("")}
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 52px;">
      <div style="font-size:10px;color:#94a3b8;">Documento gerado automaticamente pela plataforma Allka.</div>
    </div>
  </div>`;
}

/** Exports a single-page PDF summary of a catalog report (name, description,
 * category, period, formats). There is no per-report dataset/backend export
 * endpoint yet, so this renders the report's catalog metadata rather than
 * generated numbers — still a real file, not a simulated download. */
export async function exportReportSummaryPDF(
  report: { name: string; desc: string; formats: string[] },
  meta: ReportExportMeta,
): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:-9999px;top:0;width:794px;pointer-events:none;";
  container.innerHTML = buildReportSummaryHTML(report, meta);
  document.body.appendChild(container);
  try {
    const element = container.firstElementChild as HTMLElement | null;
    if (!element) throw new Error("Falha ao montar o relatório.");

    const [{ toPng }, { jsPDF: JsPDF }] = await Promise.all([
      import("html-to-image"),
      import("jspdf"),
    ]);
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: element.offsetWidth || 794,
      cacheBust: true,
    });
    const pdf = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const img = new Image();
    const { width: pxW, height: pxH } = await new Promise<{ width: number; height: number }>(
      (resolve) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 1588, height: 2245 });
        img.src = dataUrl;
      },
    );
    const imgHeight = (pxH / pxW) * pageWidth;
    pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, imgHeight);
    const safeName = report.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    await pdf.save(`relatorio-${safeName || "sem-nome"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

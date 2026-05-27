// @ts-nocheck
/**
 * ExportExtratoModal â€” Excel / PDF / PNG + compartilhar com senha
 * Renderizado dentro do SheetContent (sem portal) para evitar conflito Radix.
 */
import { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Share2,
  Download,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  Copy,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ExtratoRow {
  date: string | Date;
  description: string;
  type: "credit" | "debit";
  amount: number;
  balanceAfter: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rows: ExtratoRow[];
  companyName: string;
}

type Format = "excel" | "pdf" | "png";

const FORMAT_OPTIONS = [
  {
    id: "excel" as Format,
    label: "Excel",
    ext: ".xlsx",
    desc: "Abre no Excel, Sheets, Numbers",
    icon: FileSpreadsheet,
    color: "text-emerald-600",
    iconBg: "bg-emerald-100",
    border: "border-emerald-400",
    activeBg: "bg-emerald-50",
  },
  {
    id: "pdf" as Format,
    label: "PDF",
    ext: ".pdf",
    desc: "Suporta proteÃ§Ã£o com senha",
    icon: FileText,
    color: "text-red-500",
    iconBg: "bg-red-100",
    border: "border-red-400",
    activeBg: "bg-red-50",
  },
  {
    id: "png" as Format,
    label: "Imagem",
    ext: ".png",
    desc: "Captura visual do extrato",
    icon: ImageIcon,
    color: "text-blue-500",
    iconBg: "bg-blue-100",
    border: "border-blue-400",
    activeBg: "bg-blue-50",
  },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString("pt-BR");
}
function slug(name: string) {
  return name.replace(/\s+/g, "-").toLowerCase();
}

// â”€â”€ Export: Excel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function exportExcel(rows: ExtratoRow[], companyName: string) {
  const XLSX = await import("xlsx");
  const data = [
    ["Data", "DescriÃ§Ã£o", "Tipo", "Valor (R$)", "Saldo ApÃ³s (R$)"],
    ...rows.map((r) => [
      fmtDateTime(r.date),
      r.description,
      r.type === "credit" ? "Entrada" : "SaÃ­da",
      r.type === "credit" ? r.amount : -r.amount,
      r.balanceAfter,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Extrato");
  XLSX.writeFile(wb, `extrato-${slug(companyName)}.xlsx`);
}

// â”€â”€ Export: PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function exportPDF(rows: ExtratoRow[], companyName: string, password?: string) {
  const { jsPDF } = await import("jspdf");
  const opts: any = { orientation: "landscape", unit: "mm", format: "a4" };
  if (password) {
    opts.userPassword = password;
    opts.ownerPassword = password + "_allka";
    opts.permissions = { printing: "highResolution", modifying: false, copying: false };
  }
  const doc = new jsPDF(opts);
  const pw = doc.internal.pageSize.getWidth();

  // Brand gradient header: simulate #000 → #1a2a6f → #c81a7f with 3 bands
  const bandW = pw / 8;
  for (let b = 0; b < 8; b++) {
    const t = b / 7;
    // Interpolate: 0→#000(0,0,0), 0.45→#1a2a6f(26,42,111), 1→#c81a7f(200,26,127)
    let r, g, bl;
    if (t <= 0.45) {
      const f = t / 0.45;
      r = Math.round(0 + f * 26); g = Math.round(0 + f * 42); bl = Math.round(0 + f * 111);
    } else {
      const f = (t - 0.45) / 0.55;
      r = Math.round(26 + f * (200 - 26)); g = Math.round(42 + f * (26 - 42)); bl = Math.round(111 + f * (127 - 111));
    }
    doc.setFillColor(r, g, bl);
    doc.rect(b * bandW, 0, bandW + 1, 18, "F");
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Extrato â€” ${companyName}`, 14, 11);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pw - 14, 11, { align: "right" });

  const colW = [38, 90, 22, 38, 42];
  const cols = ["Data", "DescriÃ§Ã£o", "Tipo", "Valor (R$)", "Saldo ApÃ³s (R$)"];
  let y = 26;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, pw - 28, 8, "F");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let x = 14;
  cols.forEach((col, i) => {
    doc.text(col, i >= 3 ? x + colW[i] : x, y, { align: i >= 3 ? "right" : "left" });
    x += colW[i];
  });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  rows.forEach((r, idx) => {
    if (y > 185) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, pw - 28, 7, "F");
    }
    const isCredit = r.type === "credit";
    let cx = 14;
    [fmtDateTime(r.date), r.description, isCredit ? "Entrada" : "SaÃ­da", `R$ ${fmt(r.amount)}`, `R$ ${fmt(r.balanceAfter)}`]
      .forEach((v, i) => {
        if (i === 2) doc.setTextColor(isCredit ? 5 : 220, isCredit ? 150 : 38, isCredit ? 105 : 38);
        else doc.setTextColor(30, 41, 59);
        doc.text(v, i >= 3 ? cx + colW[i] : cx, y, { align: i >= 3 ? "right" : "left", maxWidth: colW[i] - 2 });
        cx += colW[i];
      });
    y += 7;
  });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text("Allka Platform â€” documento gerado automaticamente", pw / 2, 200, { align: "center" });
  doc.save(`extrato-${slug(companyName)}.pdf`);
}

// â”€â”€ Export: PNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function exportPNG(rows: ExtratoRow[], companyName: string) {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;background:#fff;padding:0;font-family:Inter,system-ui,sans-serif;width:960px;border-radius:12px;overflow:hidden;";
  container.innerHTML = `
    <div style="background:linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%);padding:18px 24px;">
      <div style="color:#fff;font-size:17px;font-weight:700;">Extrato â€” ${companyName}</div>
      <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:4px;">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:9px 14px;text-align:left;color:#334155;font-weight:600;border-bottom:1px solid #e2e8f0;">Data</th>
        <th style="padding:9px 14px;text-align:left;color:#334155;font-weight:600;border-bottom:1px solid #e2e8f0;">DescriÃ§Ã£o</th>
        <th style="padding:9px 14px;text-align:left;color:#334155;font-weight:600;border-bottom:1px solid #e2e8f0;">Tipo</th>
        <th style="padding:9px 14px;text-align:right;color:#334155;font-weight:600;border-bottom:1px solid #e2e8f0;">Valor</th>
        <th style="padding:9px 14px;text-align:right;color:#334155;font-weight:600;border-bottom:1px solid #e2e8f0;">Saldo ApÃ³s</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};">
            <td style="padding:8px 14px;color:#475569;border-bottom:1px solid #f1f5f9;">${fmtDateTime(r.date)}</td>
            <td style="padding:8px 14px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${r.description}</td>
            <td style="padding:8px 14px;color:${r.type === "credit" ? "#059669" : "#dc2626"};font-weight:600;border-bottom:1px solid #f1f5f9;">${r.type === "credit" ? "â†‘ Entrada" : "â†“ SaÃ­da"}</td>
            <td style="padding:8px 14px;text-align:right;color:${r.type === "credit" ? "#059669" : "#dc2626"};font-weight:600;border-bottom:1px solid #f1f5f9;">R$ ${fmt(r.amount)}</td>
            <td style="padding:8px 14px;text-align:right;color:#1e293b;border-bottom:1px solid #f1f5f9;">R$ ${fmt(r.balanceAfter)}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div style="background:#f8fafc;padding:10px 24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;">
      Allka Platform â€” documento gerado automaticamente
    </div>`;
  document.body.appendChild(container);
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `extrato-${slug(companyName)}.png`;
    a.click();
  } finally {
    document.body.removeChild(container);
  }
}

// â”€â”€ Share helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateShareToken(rows: ExtratoRow[], companyName: string) {
  return btoa(encodeURIComponent(JSON.stringify({ companyName, rows, ts: Date.now() })));
}
function buildShareUrl(token: string) {
  return `${window.location.origin}/extrato-compartilhado?t=${token}`;
}

// â”€â”€ Toggle sub-component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Toggle({ checked, onChange, color = "bg-cyan-500" }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(); }}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? color : "bg-slate-200"}`}
    >
      <div className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-[3px]"}`} />
    </button>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ExportExtratoModal({ open, onClose, rows, companyName }: Props) {
  const { toast } = useToast();
  const [format, setFormat] = useState<Format>("excel");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [enableShare, setEnableShare] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [showSharePassword, setShowSharePassword] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  // Block ALL events from bubbling up to the Sheet
  const block = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  const handleExport = async (e: React.MouseEvent) => {
    block(e);
    setLoading(true);
    setDone(false);
    try {
      const pwd = enablePassword && format === "pdf" && password ? password : undefined;
      if (format === "excel") await exportExcel(rows, companyName);
      else if (format === "pdf") await exportPDF(rows, companyName, pwd);
      else await exportPNG(rows, companyName);
      setDone(true);
      toast({
        title: "Exportado!",
        description: `Arquivo ${FORMAT_OPTIONS.find((f) => f.id === format)?.ext} salvo com sucesso.`,
      });
      setTimeout(() => setDone(false), 3000);
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = (e: React.MouseEvent) => {
    block(e);
    const token = generateShareToken(rows, companyName);
    if (sharePassword) {
      try { localStorage.setItem(`share_${token.slice(0, 16)}`, btoa(sharePassword)); } catch {}
    }
    setShareUrl(buildShareUrl(token));
  };

  const handleCopy = (e: React.MouseEvent) => {
    block(e);
    navigator.clipboard.writeText(shareUrl).then(() =>
      toast({ title: "Link copiado!", description: "Envie para quem precisar acessar." }),
    );
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.72)", backdropFilter: "blur(6px)" }}
      onMouseDown={block}
      onClick={block}
      onPointerDown={block}
      onTouchStart={block}
    >
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]"
        onMouseDown={block}
        onClick={block}
        onPointerDown={block}
        onTouchStart={block}
      >
        {/* â”€â”€ Header â”€â”€ */}
        <div
          className="flex-shrink-0 px-6 py-5 rounded-t-3xl"
          style={{ background: "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white font-bold text-lg">Exportar Extrato</p>
              <p className="text-white/80 text-xs mt-0.5">{companyName}</p>
              <p className="text-white/60 text-[11px] mt-0.5">
                {rows.length} {rows.length === 1 ? "movimentaÃ§Ã£o" : "movimentaÃ§Ãµes"}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { block(e); onClose(); }}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* â”€â”€ Scrollable body â”€â”€ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-6 space-y-4">

            {/* Formato */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Formato de exportaÃ§Ã£o</p>
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = format === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(e) => { block(e); setFormat(opt.id); if (opt.id !== "pdf") setEnablePassword(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${active ? `${opt.border} ${opt.activeBg}` : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? opt.iconBg : "bg-slate-100"}`}>
                        <Icon className={`${active ? opt.color : "text-slate-400"}`} style={{ width: 20, height: 20 }} />
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-bold ${active ? "text-slate-900" : "text-slate-500"}`}>{opt.label}</p>
                        <p className={`text-[10px] ${active ? "text-slate-500" : "text-slate-400"}`}>{opt.ext}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">{FORMAT_OPTIONS.find((f) => f.id === format)?.desc}</p>
            </div>

            {/* ProteÃ§Ã£o com senha (PDF only) */}
            <div className={`rounded-2xl border overflow-hidden transition-all ${format !== "pdf" ? "border-slate-100 opacity-40 pointer-events-none select-none" : "border-slate-200"}`}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enablePassword && format === "pdf" ? "bg-[#c81a7f]/10" : "bg-slate-100"}`}>
                  <Lock className={`h-4 w-4 ${enablePassword && format === "pdf" ? "text-[#c81a7f]" : "text-slate-400"}`} style={{ width: 16, height: 16 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Proteger com senha</p>
                  <p className="text-[11px] text-slate-400">Somente para exportaÃ§Ã£o em PDF</p>
                </div>
                <Toggle
                  checked={enablePassword && format === "pdf"}
                  onChange={() => setEnablePassword((v) => !v)}
                  color="bg-[#1a2a6f]"
                />
              </div>
              {enablePassword && format === "pdf" && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 mt-3 mb-1.5">Senha do arquivo PDF</p>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Defina a senha..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onClick={block}
                      onMouseDown={block}
                      onPointerDown={block}
                      className="w-full h-10 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c81a7f]/40 bg-slate-50"
                    />
                    <button type="button" onClick={(e) => { block(e); setShowPassword((v) => !v); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compartilhar */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enableShare ? "bg-emerald-100" : "bg-slate-100"}`}>
                  <Share2 className={`h-4 w-4 ${enableShare ? "text-emerald-600" : "text-slate-400"}`} style={{ width: 16, height: 16 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Gerar link para compartilhar</p>
                  <p className="text-[11px] text-slate-400">Com ou sem senha de acesso</p>
                </div>
                <Toggle
                  checked={enableShare}
                  onChange={() => setEnableShare((v) => !v)}
                  color="bg-emerald-500"
                />
              </div>

              {enableShare && (
                <div className="px-4 pb-4 border-t border-slate-100 space-y-3 pt-3">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5">Senha de acesso (opcional)</p>
                    <div className="relative">
                      <input
                        type={showSharePassword ? "text" : "password"}
                        placeholder="Quem abrir o link precisarÃ¡ informar..."
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                        onClick={block}
                        onMouseDown={block}
                        onPointerDown={block}
                        className="w-full h-10 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                      />
                      <button type="button" onClick={(e) => { block(e); setShowSharePassword((v) => !v); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSharePassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                  </div>

                  {!shareUrl ? (
                    <button
                      type="button"
                      onClick={handleGenerateLink}
                      className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Share2 style={{ width: 14, height: 14 }} />
                      Gerar link
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                        <span className="text-[11px] text-slate-500 flex-1 truncate">{shareUrl}</span>
                        <button type="button" onClick={handleCopy} className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors" style={{ background: "var(--app-brand-gradient, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))" }}>
                          <Copy style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                      {sharePassword && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
                          <Lock style={{ width: 12, height: 12 }} className="flex-shrink-0" />
                          <span>Senha configurada â€” necessÃ¡ria para visualizar</span>
                        </div>
                      )}
                      <button type="button" onClick={(e) => { block(e); setShareUrl(""); setSharePassword(""); }} className="text-[11px] text-slate-400 hover:text-slate-600 underline">
                        Gerar novo link
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* â”€â”€ Footer â”€â”€ */}
        <div className="flex-shrink-0 px-6 pt-3 pb-6 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={(e) => { block(e); onClose(); }}
            className="flex-1 h-11 rounded-2xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className={`flex-1 h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-lg ${done ? "bg-green-500" : ""}`}
            style={done ? {} : { background: "var(--app-brand-button, var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)))" }}
          >
            {loading ? (
              <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
            ) : done ? (
              <><CheckCircle2 style={{ width: 16, height: 16 }} /> Exportado!</>
            ) : (
              <><Download style={{ width: 16, height: 16 }} /> Baixar {FORMAT_OPTIONS.find((f) => f.id === format)?.label}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

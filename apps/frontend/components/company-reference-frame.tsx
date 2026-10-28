import type { ComponentProps } from "react";
import { Mail, MessageCircle, X } from "lucide-react";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { FramedPanel, FramedModal, FRAMED_HEADER_CLASS, FRAMED_FOOTER_CLASS } from "@/components/framed-panel";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { NeonBadge } from "@/components/neon-badge";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { formatCompanySequenceId } from "@/lib/company-display-id";
import type { Company } from "@/types/company";

/** Opt-in da Referência Clientes; mantém os formulários/abas e seus handlers. */
export function CompanyReferenceFrame({ enabled = false, mode = "panel", company, ...props }: ComponentProps<typeof EmbeddedSlideScreen> & { enabled?: boolean; mode?: "panel" | "modal"; company?: Company }) {
  const { sidebarWidth } = useAppFrameMetrics();
  if (!enabled) return <EmbeddedSlideScreen {...props} />;
  const { open, onClose, title, subtitle, pin, footer, children } = props;
  const digits = company?.phone?.replace(/\D/g, "") ?? "";
  const whatsapp = digits && !company?.phone?.trim().startsWith("+") && [10, 11].includes(digits.length) ? `55${digits}` : digits;
  const content = <>
    <header className={`${FRAMED_HEADER_CLASS} flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-white`} style={{ background: "var(--app-brand-gradient)" }}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{company && <span className="mr-2 text-xs font-normal text-white/70">{formatCompanySequenceId(company.sequence_number ?? company.id)}</span>}{title || company?.name || "Empresa"}</h2>
          {!company && subtitle && <p className="mt-1 truncate text-xs text-white/70">{subtitle}</p>}
        </div>
        {company && <NeonBadge color={company.status === "active" ? "emerald" : company.status === "pending" ? "amber" : "slate"}>{company.status === "active" ? "Ativo" : company.status === "pending" ? "Pendente" : "Inativo"}</NeonBadge>}
        {whatsapp && <a aria-label="WhatsApp da empresa" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 hover:bg-white/20"><MessageCircle className="h-4 w-4" /></a>}
        {company?.email && <a aria-label="E-mail da empresa" href={`mailto:${company.email}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 hover:bg-white/20"><Mail className="h-4 w-4" /></a>}
      </div>
      {pin && <PinToTrayButton {...pin} />}
      <button type="button" aria-label="Fechar empresa" onClick={onClose} className="shrink-0 rounded-lg p-2 hover:bg-white/20"><X className="h-4 w-4" /></button>
    </header>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white">{children}</div>
    {footer && <footer className={`${FRAMED_FOOTER_CLASS} shrink-0 border-t border-slate-200 pt-3`}>{footer}</footer>}
  </>;
  return mode === "modal"
    ? <FramedModal open={open} onOpenChange={value => { if (!value) onClose(); }} title="Editar empresa" testId="company-edit-modal" style={{ width: `calc(100vw - ${parseInt(String(sidebarWidth), 10) || 0}px - 2rem)` }}>{content}</FramedModal>
    : <FramedPanel open={open} onOpenChange={value => { if (!value) onClose(); }} title={typeof title === "string" ? title : "Empresa"} testId={pin?.id.includes("view") ? "company-view-panel" : "company-edit-panel"}>{content}</FramedPanel>;
}

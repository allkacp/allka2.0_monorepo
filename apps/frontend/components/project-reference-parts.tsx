import type { ReactNode } from "react";
import { FolderOpen, Zap, TrendingUp, DollarSign, Eye, Pencil, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ProjectReferenceStats({ total, active, completed, mrr }: { total: number; active: number; completed: number; mrr: number }) {
  const items = [
    { label: "Total de Projetos", value: total, icon: FolderOpen, color: "bg-sky-50 text-[#1877e8] ring-sky-100" },
    { label: "Em Andamento", value: active, icon: Zap, color: "bg-emerald-50 text-[#05ae70] ring-emerald-100" },
    { label: "Concluídos", value: completed, icon: TrendingUp, color: "bg-violet-50 text-[#8238e9] ring-violet-100" },
    { label: "MRR", value: `R$ ${(mrr / 1000).toFixed(0)}k`, icon: DollarSign, color: "bg-orange-50 text-[#ff6a1a] ring-orange-100" },
  ];
  return <div data-testid="project-reference-stats" className="project-reference-stats mt-[5px] mb-[5px] grid overflow-hidden rounded-xl border border-slate-200/80 bg-white/80">{items.map(({ label, value, icon: Icon, color }) => <div key={label} className="project-reference-stat flex min-w-0 items-center"><span className={`project-reference-stat-icon flex shrink-0 items-center justify-center rounded-full ring-1 ${color}`}><Icon /></span><div className="min-w-0"><p className="project-reference-stat-label font-bold uppercase tracking-[.02em] text-[#31578f]">{label}</p><p className="project-reference-stat-value mt-1 font-extrabold tracking-tight text-[#0c2455]">{value}</p></div></div>)}</div>;
}

function Action({ label, icon, onClick, disabled = false }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" aria-label={label} className="project-reference-action" disabled={disabled} onClick={onClick}>{icon}</button></TooltipTrigger><TooltipContent className="text-xs font-medium">{label}</TooltipContent></Tooltip>;
}
export function ProjectReferenceActions({ name, archived, status, onView, onEdit, onClone, onCancel, onArchive, onContinue, onPayment }: { name: string; archived?: boolean; status: string; onView: () => void; onEdit: () => void; onClone: () => void; onCancel: () => void; onArchive: () => void; onContinue: () => void; onPayment: () => void }) {
  const draft = status === "draft", awaiting = status === "awaiting-payment";
  return <TooltipProvider delayDuration={400}><div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
    <Action label={`Ver projeto ${name}`} icon={<Eye className="h-3.5 w-3.5" />} onClick={onView} />
    <Action label={draft ? `Continuar projeto ${name}` : `Editar projeto ${name}`} icon={<Pencil className="h-3.5 w-3.5" />} onClick={draft ? onContinue : onEdit} disabled={!!archived} />
    <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Mais ações — ${name}`} className="project-reference-action"><MoreHorizontal className="h-3.5 w-3.5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
      <DropdownMenuItem onSelect={onView}>Ver todas as informações</DropdownMenuItem>
      {!archived && (draft ? <><DropdownMenuItem onSelect={onContinue}>Continuar rascunho</DropdownMenuItem><DropdownMenuItem onSelect={onCancel}>Descartar rascunho</DropdownMenuItem></> : <>
        {awaiting && <DropdownMenuItem onSelect={onPayment}>Ir para pagamento</DropdownMenuItem>}
        <DropdownMenuItem onSelect={onEdit}>Editar projeto</DropdownMenuItem>
        {!awaiting && <DropdownMenuItem onSelect={onClone}>Clonar projeto</DropdownMenuItem>}
        <DropdownMenuItem onSelect={onCancel}>Cancelar projeto</DropdownMenuItem>
        <DropdownMenuItem onSelect={onArchive}>Arquivar projeto</DropdownMenuItem>
      </>)}
    </DropdownMenuContent></DropdownMenu>
  </div></TooltipProvider>;
}


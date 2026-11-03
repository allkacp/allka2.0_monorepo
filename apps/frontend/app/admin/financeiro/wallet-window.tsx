// Financeiro → Carteiras: as janelas de movimentações (Comissões e os demais cartões, Extrato da carteira,
// Projeções e Ajuste manual) abrem como JANELA MOLDURA (padrão global 5, `FramedModal` — ver docs/padroes-globais.md).
// Antes eram slides laterais (Sheet z-50) que ficavam por baixo do cabeçalho global (z-90): o cabeçalho e o X da
// janela ficavam cobertos e o clique em fechar não funcionava (auditoria T28, 01/11).
// Fundo preto 60%/2px começando depois da sidebar (sidebar livre), clique no fundo bloqueado sem fechar,
// cabeçalho e X dentro da janela, só o corpo rola; X e Escape fecham apenas esta janela e a tela de origem fica como estava.
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { FramedModal, FRAMED_HEADER_CLASS } from "@/components/framed-panel";
import { cn } from "@/lib/utils";

export function WalletWindow({
  open,
  onOpenChange,
  testId,
  title,
  header,
  toolbar,
  footer,
  children,
  className,
  fitContent = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  /** Nome da janela para leitores de tela e para o botão fechar. */
  title: string;
  /** Conteúdo do banner com o degradê da plataforma (o X já vem incluído). */
  header: ReactNode;
  /** Faixa fixa acima da lista (filtros, contagem, atualizar). */
  toolbar?: ReactNode;
  /** Faixa fixa abaixo da lista (paginação, botões). */
  footer?: ReactNode;
  children: ReactNode;
  /** Largura própria (padrão: a mesma do slide antigo, `max-w-2xl`). */
  className?: string;
  /** Altura pelo conteúdo (formulários curtos); listas usam a altura toda da área. */
  fitContent?: boolean;
}) {
  return (
    <FramedModal
      open={open}
      onOpenChange={onOpenChange}
      testId={testId}
      title={title}
      className={cn(!fitContent && "h-[calc(100dvh-4rem)]", "max-w-2xl sm:!max-w-2xl", className)}
    >
      <div className={cn("app-brand-header relative shrink-0 rounded-2xl px-6 py-4 pr-14", FRAMED_HEADER_CLASS)} data-testid={`${testId}-header`}>
        {header}
        <button
          type="button"
          aria-label={`Fechar ${title}`}
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          data-testid={`${testId}-close`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-[10px] flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {toolbar}
        <div className="min-h-0 flex-1 overflow-y-auto" data-testid={`${testId}-scroll`}>
          {children}
        </div>
        {footer}
      </div>
    </FramedModal>
  );
}

// @ts-nocheck
/**
 * StandardModalDialog — popup centralizado (com fundo escurecido), pro caso
 * de uma ação pontual que não é uma "tela" (não faz sentido ir pra Bandeja
 * de Telas) — ex.: Compartilhar, confirmações maiores com formulário curto.
 * Segue a mesma linguagem visual dos outros padrões desta sessão: cabeçalho
 * com o gradiente da marca, cantos arredondados, X pra fechar — mas SEM
 * botão de pin (propositalmente; um dialog não é uma tela pra empilhar).
 *
 * Duas particularidades pedidas explicitamente (2026-07-16):
 *  - Centralizado excluindo a sidebar (não o viewport inteiro) — usa
 *    useAppFrameMetrics pra saber a largura real da sidebar e desloca o
 *    centro horizontal pra dentro da área de conteúdo só.
 *  - O cabeçalho gradiente fica RECUADO (15px em cima/lados) em vez de
 *    colado nos cantos do popup — mesma lógica do painel branco padrão
 *    (STANDARD_SHELL_PANEL_CLASS envolvendo o StandardPageBanner), só que
 *    aqui com 15px em vez de 12px.
 *
 * Pra telas de verdade (formulário grande, navegação própria, algo que faz
 * sentido deixar aberto e alternar depois) use <EmbeddedSlideScreen> em vez
 * disso — ele desliza de dentro do painel e tem pin. Este aqui é só um
 * popup rápido.
 *
 *   <StandardModalDialog open={open} onClose={onClose} title="..." subtitle="...">
 *     {children}
 *   </StandardModalDialog>
 *
 * `size="large"` (padrão, "popup 1"): 1090px x 68vh, pra formulários maiores
 * (Novo Usuário, Filtros, Configurar colunas). `size="compact"`: altura
 * ajustada ao conteúdo (sem forçar 68vh) e largura menor — pra confirmações
 * curtas (Bloquear/Deletar) — mantém a mesma centralização/cabeçalho recuado.
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";

interface StandardModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Largura máxima em px do popup. Se omitido, usa o padrão do `size`. */
  maxWidthPx?: number;
  /** "large" = popup 1 (1090px x 68vh, formulários). "compact" = altura
   * ajustada ao conteúdo, largura menor (confirmações). */
  size?: "large" | "compact";
}

export function StandardModalDialog({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  maxWidthPx,
  size = "large",
}: StandardModalDialogProps) {
  const { sidebarWidth } = useAppFrameMetrics();
  const sidebarWidthPx =
    typeof sidebarWidth === "number"
      ? sidebarWidth
      : parseInt(sidebarWidth as string) || 240;
  const resolvedMaxWidth = maxWidthPx ?? (size === "compact" ? 460 : 1090);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl flex flex-col w-[calc(100%-64px)]"
        style={{
          // Centralizado na área de conteúdo (exclui a sidebar), não no
          // viewport inteiro — por isso não usamos left-1/2 padrão.
          left: `calc(${sidebarWidthPx}px + (100vw - ${sidebarWidthPx}px) / 2 - 15px)`,
          top: "calc(50% + 30px)",
          maxWidth: resolvedMaxWidth,
          ...(size === "large"
            ? { height: "68vh", maxHeight: "68vh" }
            : { maxHeight: "85vh" }),
        }}
      >
        {/* Cabeçalho recuado — 15px em cima/lados, igual o painel branco
            padrão recua o banner gradiente das outras telas. */}
        <div className="shrink-0 pt-[15px] px-[15px]">
          <div
            className="flex items-center gap-3 px-6 py-4 rounded-2xl"
            style={{
              background:
                "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))",
            }}
          >
            <div className="min-w-0 flex-1 truncate">
              <div className="text-base font-semibold text-white truncate">
                {title}
              </div>
              {subtitle && (
                <p className="text-xs font-normal text-white/70 mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

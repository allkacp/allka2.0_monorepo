// @ts-nocheck
/**
 * EmbeddedSlideScreen — painel que desliza POR CIMA do conteúdo de uma
 * página, mas contido dentro do próprio painel branco (não cobre a tela
 * inteira, nem sidebar/header/footer, ao contrário do <SlidePanel>
 * compartilhado). Estilo/animação nascidos em /admin/empresas (Novo
 * Cadastro): cantos arredondados, sombra própria, entrada com
 * fade+zoom+slide sutil — dá pra perceber que o card de trás continua ali.
 *
 * Diferente do <SlidePanel>, isso NÃO usa portal — precisa ser renderizado
 * dentro de um container com `position: relative` (o painel/tela onde deve
 * aparecer), e cobre esse container inteiro (`absolute inset-0`).
 *
 * Uso: mesma assinatura de props do <SlidePanel>, então trocar um pelo
 * outro é só trocar o nome do componente.
 *
 *   <EmbeddedSlideScreen open={open} onClose={onClose} title="..." subtitle="...">
 *     {children}
 *   </EmbeddedSlideScreen>
 *
 * Pin pra Bandeja de Telas embutido: passe `pin` e o botão de pin aparece
 * sozinho no cabeçalho, já ligado ao contexto global — não precisa lembrar
 * de adicionar isso em cada tela nova que usa este componente. `pin` é um
 * dado puro (id/label/icon/path/activateKey) — sobrevive a navegar pra
 * outra rota, e reabrir pela bandeja usa `path` + `activateKey` (lido pela
 * página de origem via useConsumePendingActivation), não um callback vivo.
 *
 *   <EmbeddedSlideScreen
 *     open={open} onClose={onClose} title="..." subtitle="..."
 *     pin={{ id: "dashboard-historico", label: "Histórico", icon: History, path: "/admin/dashboard", activateKey: "historico" }}
 *   >
 */
import { useEffect, useState, type ReactNode } from "react";
import { Pin, X } from "lucide-react";
import { usePinEntry, type PinnedEntry } from "@/contexts/open-screens-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EmbeddedSlideScreenProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** z-index relativo ao container pai — aumente se houver camadas empilhadas. */
  zIndex?: number;
  pin?: PinnedEntry;
  /**
   * Quando a tela já tem seu próprio cabeçalho rico (avatar, tabs, botões
   * de salvar/cancelar etc. — ex.: UserViewSlidePanel), passe `hideHeader`
   * pra pular o cabeçalho padrão (gradiente + título + X) e deixar só a
   * animação/posicionamento do cartão. O botão de pin, se `pin` for
   * passado, ainda aparece — como um ícone flutuante no canto superior
   * direito, por cima do que os `children` renderizarem ali.
   */
  hideHeader?: boolean;
}

export function EmbeddedSlideScreen({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  zIndex = 30,
  pin,
  hideHeader = false,
}: EmbeddedSlideScreenProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const { pinned, toggle: togglePin } = usePinEntry(pin ?? null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 320);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      data-state={closing ? "closed" : "open"}
      style={{ zIndex }}
      className="absolute inset-0 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-right-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-right-4 duration-300"
    >
      {!hideHeader && (
        <div
          className="shrink-0 flex items-center gap-3 px-6 py-4"
          style={{
            background:
              "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))",
          }}
        >
          <div className="min-w-0 flex-1 truncate">
            <div className="text-base font-semibold text-white truncate flex items-center gap-3">
              {title}
            </div>
            {subtitle && (
              <p className="text-xs font-normal text-white/70 mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {pin && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={togglePin}
                    aria-pressed={pinned}
                    className={`flex items-center justify-center h-9 w-9 rounded-lg border transition-colors shrink-0 ${
                      pinned
                        ? "border-white bg-white/25 text-white"
                        : "border-white/40 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {pinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {hideHeader && pin && (
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={togglePin}
                aria-pressed={pinned}
                // Posicionado pra não colidir com o X do cabeçalho custom
                // (ModalBrandHeader usa top-5 right-5, ~36px de botão) —
                // fica logo à esquerda dele, mesma altura.
                className={`absolute top-5 right-16 z-10 flex items-center justify-center h-8 w-8 rounded-lg transition-all ${
                  pinned
                    ? "bg-white/25 text-white"
                    : "text-white/80 hover:bg-white/20 hover:text-white"
                }`}
              >
                <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {pinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">{children}</div>

      {footer && (
        <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
}

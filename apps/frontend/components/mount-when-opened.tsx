import { Suspense, useState, type ReactNode } from "react";
import { PageLoader } from "@/components/ui/loading";

/**
 * Só monta `children` na primeira vez que `open` vira true e depois mantém montado
 * (preserva a animação de fechar e o estado interno, como antes).
 * Usado junto com React.lazy para tirar painéis pesados do pacote inicial:
 * o código do painel só é baixado quando a pessoa abre o painel pela primeira vez.
 * Enquanto baixa, mostra a animação padrão de carregamento (PageLoader) por cima da tela.
 */
export function MountWhenOpened({
  open,
  loadingText = "Carregando…",
  children,
}: {
  open: boolean;
  loadingText?: string;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  if (!opened && !open) return null;
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <PageLoader text={loadingText} compact />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

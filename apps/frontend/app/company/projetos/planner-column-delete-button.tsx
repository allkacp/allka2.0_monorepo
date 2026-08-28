import { useState } from "react";
import { X } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface PlannerColumnDeleteButtonProps {
  columnLabel: string;
  /** Nº de cartões na coluna — a confirmação diz o que acontece com eles. */
  cardCount: number;
  /**
   * Remoção real da coluna (estado local desta visão do Planejador da
   * empresa — não há chamada de API). Síncrona.
   */
  onConfirm: () => void;
}

/**
 * Botão de remover coluna do Planejador (Empresa → Projetos → Planejador).
 *
 * Fechamento do bloco 1 (ata 2026-08): troca o `window.confirm` de uma
 * etapa pelo `ConfirmationDialog` compartilhado em `twoStep`. Esta visão do
 * Planejador é um quadro de trabalho LOCAL (as colunas e cartões vivem só
 * no estado da tela, não são salvos no servidor), então a confirmação diz
 * isso explicitamente — não promete uma persistência que não existe. A 1ª
 * etapa mostra o nome da coluna e quantos cartões saem junto; a 2ª etapa é
 * a confirmação final.
 *
 * Componente pequeno e isolado porque a página que o usa é grande demais
 * para montar em teste.
 */
export function PlannerColumnDeleteButton({
  columnLabel,
  cardCount,
  onConfirm,
}: PlannerColumnDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  const cardLine =
    cardCount === 0
      ? "A coluna não tem cartões."
      : cardCount === 1
        ? "O único cartão desta coluna sai do quadro junto com ela."
        : `Os ${cardCount} cartões desta coluna saem do quadro junto com ela.`;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="hover:bg-white/20 rounded p-0.5 transition-colors"
        aria-label={`Remover coluna ${columnLabel}`}
      >
        <X className="h-3 w-3" />
      </button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        twoStep
        destructive
        icon={X}
        title="Remover coluna do Planejador"
        message={
          <span className="space-y-2 block">
            <span className="block">{cardLine}</span>
            <span className="block">
              Este Planejador é um quadro de trabalho local — a mudança vale só
              nesta sessão e não é salva no servidor.
            </span>
          </span>
        }
        targetName={columnLabel}
        consequences={[
          "A coluna sai do quadro imediatamente.",
          cardCount > 0
            ? "Os cartões dela não são movidos para outra coluna — saem do quadro."
            : "Nenhum cartão é afetado.",
          "Nada é salvo no servidor: recarregar a página restaura o quadro padrão.",
        ]}
        continueText="Continuar para confirmação"
        finalConfirmText={`Remover "${columnLabel}" do quadro`}
      />
    </>
  );
}

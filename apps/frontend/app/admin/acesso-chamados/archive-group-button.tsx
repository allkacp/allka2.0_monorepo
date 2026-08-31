import { useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface ArchiveGroupButtonProps {
  groupName: string;
  memberCount?: number;
  /**
   * O arquivamento real (chamada de API). Uma rejeição sobe pro
   * `ConfirmationDialog`, que mostra o erro DENTRO do diálogo e mantém o
   * grupo como está.
   */
  onArchive: () => Promise<unknown>;
  /** Recarga da lista depois de a API confirmar o arquivamento. */
  onArchived?: () => void | Promise<unknown>;
  disabled?: boolean;
}

/**
 * Arquivar um grupo de acesso a chamados (Admin → Acesso a Chamados).
 *
 * Fechamento do bloco 1 (ata 2026-08): a ação NÃO é exclusão — o grupo é
 * apenas ARQUIVADO (deixa de valer para os membros, mas continua no
 * histórico e nas auditorias). Por isso troca o `window.confirm` de uma
 * etapa pelo `ConfirmationDialog` compartilhado em modo `twoStep` +
 * `attention` (âmbar, ícone Archive) — nada de vermelho de exclusão, nada
 * de "excluir definitivamente".
 *
 * Só a confirmação da ação existente muda: regras, membros, permissões e
 * criação de grupos ficam exatamente como estavam.
 */
export function ArchiveGroupButton({
  groupName,
  memberCount,
  onArchive,
  onArchived,
  disabled,
}: ArchiveGroupButtonProps) {
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    // Sem try/catch: a rejeição sobe pro diálogo (erro inline, grupo intacto).
    await onArchive();
    try {
      await onArchived?.();
    } catch {
      /* recarga é melhor-esforço — o grupo já foi arquivado no servidor */
    }
  }

  const memberLine =
    typeof memberCount === "number"
      ? memberCount === 0
        ? "O grupo não tem membros no momento."
        : `As regras deste grupo deixam de ser aplicadas a ${memberCount} membro${
            memberCount !== 1 ? "s" : ""
          }.`
      : "As regras deste grupo deixam de ser aplicadas aos membros.";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-amber-600"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Arquivar
      </Button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        twoStep
        attention
        icon={Archive}
        title="Arquivar grupo"
        message={
          <>
            Arquivar move o grupo para fora das regras ativas. {memberLine} O
            grupo continua registrado no histórico e nas auditorias — não é uma
            exclusão.
          </>
        }
        targetName={groupName}
        consequences={[
          "O grupo para de valer para todos os membros a partir de agora.",
          "Membros e permissões do grupo não são apagados — só deixam de ser aplicados.",
          "O grupo continua visível no histórico e nas auditorias de acesso.",
        ]}
        continueText="Continuar para confirmação"
        finalConfirmText="Arquivar grupo"
      />
    </>
  );
}

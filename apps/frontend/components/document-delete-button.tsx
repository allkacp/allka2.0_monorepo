import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface DocumentDeleteButtonProps {
  /** Nome do arquivo — mostrado nas duas etapas da confirmação. */
  documentName: string;
  /**
   * A exclusão real (chamada de API). Uma rejeição sobe pro
   * `ConfirmationDialog`, que mostra o erro DENTRO do diálogo (403/409/rede)
   * e mantém o documento — nada some da lista.
   */
  onDelete: () => Promise<unknown>;
  /**
   * Recarga da lista depois de a API confirmar a exclusão. Uma falha aqui
   * NÃO reverte a exclusão nem vira erro no diálogo (o arquivo já foi apagado).
   */
  onDeleted?: () => void | Promise<unknown>;
  /** Frase curta de contexto (ex.: `da base "Comercial"`, `do projeto`). */
  scopeLabel?: string;
  title?: string;
  /** Bullets de consequência; há um padrão de exclusão física. */
  consequences?: React.ReactNode[];
  /** Toast de sucesso (default: "Documento removido"). */
  successToast?: string;
  /** Gatilho visual — recebe `open` pra abrir a confirmação em duas etapas. */
  children: (open: () => void) => React.ReactNode;
}

const DEFAULT_CONSEQUENCES: React.ReactNode[] = [
  "O arquivo é apagado do servidor — não há lixeira nem desfazer.",
  "Quem tinha acesso a esse documento deixa de vê-lo imediatamente.",
  "Enviar o arquivo de novo cria um documento novo, com outro histórico.",
];

/**
 * Botão de excluir documento com confirmação em DUAS etapas
 * (`ConfirmationDialog` compartilhado, `twoStep` + `destructive`, ícone
 * Trash2 vermelho).
 *
 * Fechamento do bloco 1 (ata 2026-08): substitui o `window.confirm` de uma
 * etapa nas exclusões FÍSICAS de documento (base de conhecimento em Admin →
 * Configurações; documentos do projeto no modal de gestão). A 1ª etapa
 * explica o que some e que não dá pra desfazer, mostrando o nome do
 * arquivo; a 2ª etapa é a confirmação final. O documento só sai da lista
 * quando a API responde ok; clique duplo no botão final não dispara duas
 * exclusões (o próprio diálogo trava enquanto envia).
 *
 * Extraído como componente pequeno pra ser testado isolado — as páginas que
 * o usam são grandes demais pra montar em teste.
 */
export function DocumentDeleteButton({
  documentName,
  onDelete,
  onDeleted,
  scopeLabel,
  title = "Excluir documento",
  consequences = DEFAULT_CONSEQUENCES,
  successToast = "Documento removido",
  children,
}: DocumentDeleteButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    // Sem try/catch em volta de onDelete: a rejeição sobe pro diálogo.
    await onDelete();
    toast({ title: successToast });
    try {
      await onDeleted?.();
    } catch {
      /* recarga é melhor-esforço — o arquivo já foi apagado no servidor */
    }
  }

  return (
    <>
      {children(() => setOpen(true))}
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        twoStep
        destructive
        icon={Trash2}
        title={title}
        message={
          <>
            O arquivo é removido em definitivo do servidor
            {scopeLabel ? ` ${scopeLabel}` : ""}. Esta ação não pode ser
            desfeita.
          </>
        }
        targetName={documentName}
        consequences={consequences}
        continueText="Continuar para confirmação"
        finalConfirmText={`Excluir "${documentName}" definitivamente`}
      />
    </>
  );
}

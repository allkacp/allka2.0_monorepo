"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Confirmações do editor de produto quando há itens com alteração ainda NÃO salva (ex.: etapa aberta para edição).
//  · "draft": ao clicar em Salvar rascunho — avisa que tudo o que está aberto será salvo junto.
//  · "lock" / "close": ao travar a edição ou sair — pergunta se salva o rascunho, descarta o que não foi salvo, ou continua editando.
export type UnsavedMode = "draft" | "lock" | "close";

export function UnsavedChangesDialog({ mode, labels, hasNewVersion, draftChanged, busy, onSave, onDiscard, onCancel }: {
  mode: UnsavedMode | null;
  labels: string[];
  hasNewVersion: boolean;
  draftChanged: boolean;
  busy?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  if (!mode) return null;
  const action = mode === "close" ? "sair" : "travar a edição";
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="w-[95vw] max-w-lg" data-testid="unsaved-dialog">
        <DialogTitle className="text-base">
          {mode === "draft" ? "Há itens que você ainda não salvou" : `Deseja salvar antes de ${action}?`}
        </DialogTitle>
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
          {labels.length > 0 && (
            <>
              <p>{mode === "draft" ? "Ao clicar em Salvar rascunho, todos os itens abaixo serão salvos junto com o rascunho:" : "Estes itens estão abertos com alterações que ainda não foram salvas:"}</p>
              <ul className="list-disc space-y-0.5 pl-5" data-testid="unsaved-list">{labels.map((l) => <li key={l} className="font-semibold">{l}</li>)}</ul>
            </>
          )}
          {mode !== "draft" && (
            <>
              {draftChanged && <p>Você também tem alterações que ainda não foram guardadas no <strong>rascunho</strong> (salvar a etapa não salva o rascunho).</p>}
              <p className="text-[13px] text-slate-600 dark:text-slate-300">
                {hasNewVersion
                  ? "Se continuar sem salvar, esta nova versão é descartada e a versão publicada continua exatamente como está."
                  : "Se continuar sem salvar, o que está aberto e não foi salvo se perde. O que você já salvou por etapa continua no rascunho."}
              </p>
            </>
          )}
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>{mode === "draft" ? "Cancelar" : "Continuar editando"}</Button>
          {mode !== "draft" && <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={onDiscard} disabled={busy}>{mode === "close" ? "Sair sem salvar" : "Travar sem salvar"}</Button>}
          <Button onClick={onSave} disabled={busy} className="bg-[#1b2559] text-white hover:bg-[#253277]">
            {mode === "draft" ? "Salvar tudo e salvar rascunho" : mode === "close" ? "Salvar rascunho e sair" : "Salvar rascunho e travar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

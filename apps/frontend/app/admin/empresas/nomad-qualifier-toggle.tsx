"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

// Chave do cadastro do nômade: "Nômade qualificador". Ligada, a pessoa entra no grupo de nômades qualificadores e passa a
// receber, em rodízio, etapas de outros nômades para conferir — só das áreas/tarefas em que ela mesma é habilitada.
export function NomadQualifierToggle({ nomadId, initial, disabled }: { nomadId: string; initial: boolean; disabled?: boolean }) {
  const { toast } = useToast();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(initial), [initial, nomadId]);
  const change = async (next: boolean) => {
    setBusy(true);
    const prev = on;
    setOn(next);
    try {
      await apiClient.updateNomade(nomadId, { is_qualifier: next });
      toast({ title: next ? "Nômade qualificador ativado" : "Nômade qualificador desativado", description: next ? "Entra no rodízio de qualificação das tarefas em que é habilitado." : "Não recebe mais etapas para qualificar." });
    } catch (e: any) {
      setOn(prev);
      toast({ title: "Não foi possível salvar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="nomad-qualifier-toggle">
      <label className="flex items-start gap-3">
        <Switch aria-label="Nômade qualificador" checked={on} disabled={busy || disabled} onCheckedChange={(v) => void change(!!v)} />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Nômade qualificador</span>
          <span className="block text-[12px] leading-snug text-slate-600 dark:text-slate-300">
            Ligado: este nômade entra no grupo de qualificadores e recebe, em rodízio, etapas de outros nômades para conferir — somente das áreas e tarefas em que ele é habilitado. Desligado: ele só executa.
          </span>
        </span>
      </label>
    </div>
  );
}

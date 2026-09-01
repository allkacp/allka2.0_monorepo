/**
 * "Visualizar contexto que a IA utilizará" + atalho pra relatar possível
 * alucinação (bloco 2/4). Só existe na memória de PROJETO — compila as 3
 * camadas (Projeto > Company > Agência) a partir de um projeto real.
 * Nenhuma chamada de IA acontece aqui: é uma prévia real do que seria
 * enviado, registrada como snapshot imutável no servidor.
 */
import { useState } from "react";
import { Eye, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { apiClient, ApiError } from "@/lib/api-client";
import { HallucinationReportDialog } from "@/components/hallucination-report-dialog";

interface CompiledLayer {
  scope: "project" | "company" | "agency";
  present: boolean;
  sections: { positive_instructions: string | null; negative_instructions: string | null; summary: string | null };
}

const LAYER_LABEL: Record<string, string> = { project: "Projeto", company: "Empresa/Company", agency: "Agência" };

export function MemoryContextPreview({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [layers, setLayers] = useState<CompiledLayer[]>([]);
  const [missingLayers, setMissingLayers] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const clientActionId = crypto.randomUUID();
      const res = await apiClient.previewMemoryContext(projectId, clientActionId);
      setSnapshotId(res.snapshot_id);
      setText(res.text);
      setLayers(res.layers ?? []);
      setMissingLayers(res.missing_layers ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível compilar o contexto agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => void openPreview()}>
        <Eye className="h-3.5 w-3.5" />
        Visualizar contexto que a IA utilizará
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-amber-600 hover:text-amber-700" onClick={() => setReportOpen(true)}>
        <AlertTriangle className="h-3.5 w-3.5" />
        Reportar possível alucinação
      </Button>

      <StandardModalDialog open={open} onClose={() => setOpen(false)} title="Contexto hierárquico compilado" size="large">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ordem de prioridade: Projeto (mais específica) → Empresa/Company → Agência (mais geral). A camada mais
              específica prevalece em caso de conflito. Nenhuma chamada de IA foi feita — isto é só uma prévia real,
              registrada como snapshot para auditoria.
            </p>
            {missingLayers.length > 0 && (
              <p className="text-xs text-slate-400 italic">
                Camadas ausentes (não é erro): {missingLayers.map((l) => LAYER_LABEL[l] ?? l).join(", ")}
              </p>
            )}
            {layers.map((layer) => (
              <div key={layer.scope} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  {LAYER_LABEL[layer.scope] ?? layer.scope}
                  {!layer.present && " — ausente"}
                </p>
                {layer.present && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    {layer.sections.summary && (
                      <p>
                        <strong>Resumo:</strong> {layer.sections.summary}
                      </p>
                    )}
                    {layer.sections.positive_instructions && (
                      <p>
                        <strong>Fazer:</strong> {layer.sections.positive_instructions}
                      </p>
                    )}
                    {layer.sections.negative_instructions && (
                      <p>
                        <strong>Evitar:</strong> {layer.sections.negative_instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 dark:text-slate-400">Ver texto completo compilado</summary>
              <pre className="whitespace-pre-wrap break-words text-[11px] bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mt-2 max-h-64 overflow-y-auto">{text}</pre>
            </details>
          </div>
        )}
      </StandardModalDialog>

      <HallucinationReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        projectId={projectId}
        snapshotId={snapshotId}
        onSubmitted={() => setReportSent(true)}
      />

      {reportSent && (
        <span className="text-[11px] text-emerald-600" role="status">
          Relato enviado para análise administrativa.
        </span>
      )}
    </div>
  );
}

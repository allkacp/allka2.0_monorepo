/**
 * Formulário "Reportar possível alucinação" (bloco 2/4). Nunca afirma que
 * houve alucinação de fato — só coleta a suspeita para análise
 * administrativa. Disponível inicialmente na aba Memória do projeto (ver
 * memory-context-preview.tsx), junto da prévia de contexto.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { apiClient, ApiError } from "@/lib/api-client";

const CATEGORY_OPTIONS = [
  { value: "informacao_incorreta", label: "Informação incorreta" },
  { value: "instrucao_ignorada", label: "Instrução ignorada" },
  { value: "tom_inadequado", label: "Tom inadequado" },
  { value: "dado_inventado", label: "Dado inventado" },
  { value: "outro", label: "Outro" },
];

const IMPACT_OPTIONS = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

interface HallucinationReportDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  snapshotId?: string | null;
  projectTaskId?: string | null;
  onSubmitted?: () => void;
}

export function HallucinationReportDialog({ open, onClose, projectId, snapshotId, projectTaskId, onSubmitted }: HallucinationReportDialogProps) {
  const [description, setDescription] = useState("");
  const [questionedResponse, setQuestionedResponse] = useState("");
  const [category, setCategory] = useState("");
  const [impact, setImpact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Gerado UMA vez por tentativa de envio (não por clique) — reenviar após
  // um erro de rede reusa o MESMO id, então o backend nunca duplica.
  const [clientActionId, setClientActionId] = useState<string | null>(null);

  function reset() {
    setDescription("");
    setQuestionedResponse("");
    setCategory("");
    setImpact("");
    setError(null);
    setClientActionId(null);
  }

  function handleClose() {
    if (!submitting) reset();
    onClose();
  }

  async function handleSubmit() {
    if (!description.trim() || !category || !impact) {
      setError("Descrição, categoria e impacto são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const actionId = clientActionId ?? crypto.randomUUID();
      setClientActionId(actionId);
      await apiClient.createHallucinationReport({
        project_id: projectId,
        description: description.trim(),
        questioned_response: questionedResponse.trim() || null,
        snapshot_id: snapshotId ?? null,
        project_task_id: projectTaskId ?? null,
        category,
        impact,
        create_client_action_id: actionId,
      });
      reset();
      onClose();
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o relato agora.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StandardModalDialog
      open={open}
      onClose={handleClose}
      title="Reportar possível alucinação"
      subtitle="Isto registra uma SUSPEITA para análise administrativa — não afirma que houve erro de fato."
      size="large"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" className="btn-brand border-0" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Enviar relato
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Descrição do problema *</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descreva o que pareceu errado na resposta da IA..." disabled={submitting} className="mt-1 text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Resposta/trecho questionado</label>
          <Textarea value={questionedResponse} onChange={(e) => setQuestionedResponse(e.target.value)} rows={3} placeholder="Cole aqui o trecho exato, se tiver" disabled={submitting} className="mt-1 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Categoria *</label>
            <Select value={category} onValueChange={setCategory} disabled={submitting}>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Impacto *</label>
            <Select value={impact} onValueChange={setImpact} disabled={submitting}>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Anexos podem ser adicionados depois de enviar, na tela de acompanhamento do relato.
        </p>
      </div>
    </StandardModalDialog>
  );
}

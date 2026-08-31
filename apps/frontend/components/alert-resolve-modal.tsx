/**
 * "Resolver alerta" (ata 2026-08, 10º lote) — formulário obrigatório pra
 * resolução formal de alerta crítico/vermelho. Um alerta vermelho não pode
 * desaparecer só por dispensa/arquivamento simples (regra aplicada no
 * BACKEND, ver POST /system-alerts/:id/resolve — este modal nunca é a
 * única barreira). Mesmo padrão visual já corrigido (StandardModalDialog
 * com overlay z-65 acima da Central).
 */
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  RESOLUTION_ACTIONS, RESOLUTION_ACTION_LABEL, type ResolutionAction,
  criticalityLabel, criticalityIcon, criticalityBadgeColor,
} from "@/components/alerts-header-icon";

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;

export interface AlertResolveTarget {
  id: string;
  title: string;
  message: string;
  entityLabel?: string | null;
  originLink?: string | null;
}

interface AlertResolveModalProps {
  open: boolean;
  onClose: () => void;
  target: AlertResolveTarget | null;
  onResolved: (alertId: string, result: { manual_resolved_at: string; resolution_action: string; resolution_description: string }) => void;
}

export function AlertResolveModal({ open, onClose, target, onResolved }: AlertResolveModalProps) {
  const [action, setAction] = useState<ResolutionAction | "">("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Um clientActionId por SUBMISSÃO intencional (não por render) — gerado
  // no clique de "Confirmar resolução", nunca reaproveitado entre
  // tentativas distintas do usuário; um retry do MESMO clique (rede) usa
  // o mesmo valor (guardado no ref até a resposta voltar).
  const clientActionIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setAction("");
      setDescription("");
      setError("");
      clientActionIdRef.current = null;
    }
  }, [open, target?.id]);

  async function handleConfirm() {
    if (savingRef.current || !target) return;
    if (!action) {
      setError("Selecione a ação realizada.");
      return;
    }
    const trimmed = description.trim();
    if (trimmed.length < DESCRIPTION_MIN) {
      setError(`A descrição precisa ter pelo menos ${DESCRIPTION_MIN} caracteres.`);
      return;
    }
    if (trimmed.length > DESCRIPTION_MAX) {
      setError(`A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`);
      return;
    }
    if (!clientActionIdRef.current) clientActionIdRef.current = crypto.randomUUID();

    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const res: any = await apiClient.resolveSystemAlert(target.id, { action, description: trimmed }, clientActionIdRef.current);
      onResolved(target.id, {
        manual_resolved_at: res.manual_resolved_at,
        resolution_action: res.resolution_action,
        resolution_description: res.resolution_description,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.data?.already_resolved) {
        // Alguém já resolveu (outra aba, outra requisição) — nunca
        // sobrescreve; informa e fecha, já que não há mais nada a fazer.
        setError("Este alerta já foi resolvido por outra ação. Fechando...");
        setTimeout(() => onClose(), 1500);
        return;
      }
      // ApiError já traz uma mensagem amigável vinda do servidor (400/403/
      // 404/409 — "Você não tem autorização...", etc.). Qualquer outra
      // falha (rede, timeout, erro genérico) mostra uma mensagem própria,
      // nunca o texto técnico bruto da exceção.
      setError(err instanceof ApiError ? err.message : "Não foi possível confirmar a resolução. Tente novamente.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const criticality = "vermelho" as const;
  const CriticalityIcon = criticalityIcon[criticality];

  return (
    <StandardModalDialog
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Resolver alerta"
      size="large"
      overlayClassName="z-65 bg-slate-900/40 backdrop-blur-[2px]"
    >
      {target && (
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{target.title}</h3>
            <Badge className={`text-xs gap-1 ${criticalityBadgeColor[criticality]}`}>
              <CriticalityIcon className="h-3 w-3" aria-hidden="true" />
              {criticalityLabel[criticality]}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{target.message}</p>
          {target.entityLabel && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Entidade relacionada: {target.entityLabel}</p>
          )}
          {target.originLink && (
            <a
              href={target.originLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-fit"
            >
              Ver origem
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                Ação realizada <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ação realizada">
                {RESOLUTION_ACTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={saving}
                    onClick={() => setAction(opt)}
                    aria-pressed={action === opt}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      action === opt
                        ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {RESOLUTION_ACTION_LABEL[opt]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Descrição da resolução <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">{description.length}/{DESCRIPTION_MAX}</span>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                placeholder="Descreva o que foi feito para resolver este alerta"
                className="min-h-28 resize-none"
                maxLength={DESCRIPTION_MAX}
                disabled={saving}
              />
              <p className="text-[10px] text-slate-400 mt-1">Mínimo de {DESCRIPTION_MIN} caracteres.</p>
            </div>

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-9 text-sm" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button className="h-9 text-sm btn-brand border-0" onClick={() => void handleConfirm()} disabled={saving}>
                {saving ? "Confirmando..." : "Confirmar resolução"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </StandardModalDialog>
  );
}

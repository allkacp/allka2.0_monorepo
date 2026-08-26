/**
 * Aba "Regras" da Central de Alertas (ata 2026-08, 2º lote) — Admin Master
 * ativa/desativa e ajusta a antecedência das duas regras existentes (tarefa
 * próxima do prazo / atrasada). Nenhum construtor genérico de condições
 * ainda — os gatilhos disponíveis são fixos nesta fase.
 */
import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { apiClient } from "@/lib/api-client";
import { criticalityFromSeverity, criticalityLabel, criticalityIcon, criticalityBadgeColor } from "@/components/alerts-header-icon";
import { cn } from "@/lib/utils";

interface AlertRule {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  lead_time_minutes: number | null;
  severity_override: "info" | "warning" | "error" | null;
  last_triggered_at: string | null;
  standard: { id: string; key: string; name: string; default_severity: "info" | "warning" | "error" };
}

function friendlyExplanation(rule: AlertRule): string {
  if (rule.trigger_type === "task.due_soon") {
    const hours = Math.round((rule.lead_time_minutes ?? 1440) / 60);
    return `Este alerta será criado ${hours}h antes do prazo da tarefa.`;
  }
  if (rule.trigger_type === "task.overdue") {
    return "Este alerta será criado quando a tarefa estiver atrasada.";
  }
  return "";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Nunca disparou";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AlertRulesTab() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.getAdminAlertRules();
      setRules(res?.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  async function toggleActive(rule: AlertRule) {
    const updated = await apiClient.updateAdminAlertRule(rule.id, { is_active: !rule.is_active });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...updated } : r)));
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4">
        {error && <p className="text-sm text-red-500 text-center py-10">Não foi possível carregar as regras agora.</p>}
        {!error && loading && rules.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>}
        {!error && !loading && rules.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Nenhuma regra cadastrada.</p>}
        {!error && (
          <div className="space-y-2">
            {rules.map((rule) => {
              const severity = rule.severity_override ?? rule.standard.default_severity;
              const criticality = criticalityFromSeverity[severity];
              const Icon = criticalityIcon[criticality];
              return (
                <div key={rule.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{rule.name}</p>
                      <Badge className={cn("text-xs gap-1", criticalityBadgeColor[criticality])}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {criticalityLabel[criticality]}
                      </Badge>
                      {!rule.is_active && <Badge variant="outline" className="text-[10px]">Desativada</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Padrão: {rule.standard.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{friendlyExplanation(rule)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Última execução: {formatDate(rule.last_triggered_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={rule.is_active} onCheckedChange={() => void toggleActive(rule)} aria-label={`Ativar/desativar ${rule.name}`} />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => setEditing(rule)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <EditRuleModal
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRules((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditRuleModal({ rule, onClose, onSaved }: { rule: AlertRule; onClose: () => void; onSaved: (updated: AlertRule) => void }) {
  const [leadHours, setLeadHours] = useState(String(Math.round((rule.lead_time_minutes ?? 1440) / 60)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usesLeadTime = rule.trigger_type === "task.due_soon";

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const data: { lead_time_minutes?: number } = {};
      if (usesLeadTime) {
        const hours = Number(leadHours);
        if (!Number.isFinite(hours) || hours <= 0) {
          setError("Antecedência deve ser um número de horas maior que zero.");
          setSaving(false);
          return;
        }
        data.lead_time_minutes = Math.round(hours * 60);
      }
      const updated = await apiClient.updateAdminAlertRule(rule.id, data);
      onSaved(updated);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StandardModalDialog open onClose={onClose} title={`Editar regra: ${rule.name}`} size="compact">
      <div className="p-6 space-y-4">
        {usesLeadTime ? (
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Antecedência (horas antes do prazo)</label>
            <Input type="number" min={1} value={leadHours} onChange={(e) => setLeadHours(e.target.value)} className="mt-1" />
          </div>
        ) : (
          <p className="text-xs text-slate-500">Esta regra dispara sempre que a tarefa estiver atrasada — não há antecedência para configurar.</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" className="btn-brand border-0" onClick={() => void handleSave()} disabled={saving || !usesLeadTime}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </StandardModalDialog>
  );
}

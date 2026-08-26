/**
 * Aba "Regras" da Central de Alertas (ata 2026-08, 3º lote — reparo
 * conceitual) — Admin Master ativa/desativa, ajusta antecedência e escolhe
 * CATEGORIAS de destinatário (papéis/relações) das quatro regras existentes.
 *
 * Toda regra aqui é GERAL: se aplica a TODAS as tarefas ou TODAS as etapas
 * (conforme o gatilho), nunca a um registro específico — não existe, e
 * nunca vai existir nesta tela, um seletor de tarefa/etapa/produto/compra
 * individual. Destinatário é sempre uma categoria (Responsável, Nômade
 * executor, Líder, Admin responsável) — nunca uma pessoa escolhida a dedo;
 * isso é exclusivo do Alerta Avulso (aba Avulsos).
 */
import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { apiClient } from "@/lib/api-client";
import { criticalityFromSeverity, criticalityLabel, criticalityIcon, criticalityBadgeColor } from "@/components/alerts-header-icon";
import { cn } from "@/lib/utils";

type EntityType = "project_task" | "project_task_stage";

interface AlertRule {
  id: string;
  name: string;
  trigger_type: string;
  entity_type: EntityType;
  is_active: boolean;
  lead_time_minutes: number | null;
  severity_override: "info" | "warning" | "error" | null;
  recipient_roles: string[];
  last_triggered_at: string | null;
  standard: { id: string; key: string; name: string; default_severity: "info" | "warning" | "error" };
}

interface RecipientCategoryOption {
  value: string;
  label: string;
}

const DUE_SOON_TRIGGERS = ["task.due_soon", "stage.due_soon"];

function entityLabel(entityType: EntityType): string {
  return entityType === "project_task_stage" ? "todas as etapas com prazo" : "todas as tarefas ativas";
}

function friendlyExplanation(rule: AlertRule): string {
  const isDueSoon = DUE_SOON_TRIGGERS.includes(rule.trigger_type);
  const alvo = rule.entity_type === "project_task_stage" ? "a etapa" : "a tarefa";
  if (isDueSoon) {
    const hours = Math.round((rule.lead_time_minutes ?? 1440) / 60);
    return `Este alerta será criado ${hours}h antes do prazo — verifica ${entityLabel(rule.entity_type)}.`;
  }
  return `Este alerta será criado quando ${alvo} estiver atrasada — verifica ${entityLabel(rule.entity_type)}.`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Nunca disparou";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AlertRulesTab() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<RecipientCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.getAdminAlertRules();
      setRules(res?.data ?? []);
      setCategoryOptions(res?.recipient_category_options ?? []);
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
                      <Badge variant="outline" className="text-[10px] gap-1 border-slate-300 text-slate-600 dark:text-slate-300">
                        Regra geral
                      </Badge>
                      <Badge className={cn("text-xs gap-1", criticalityBadgeColor[criticality])}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {criticalityLabel[criticality]}
                      </Badge>
                      {!rule.is_active && <Badge variant="outline" className="text-[10px]">Desativada</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Padrão: {rule.standard.name} · Aplica-se a {entityLabel(rule.entity_type)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{friendlyExplanation(rule)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Destinatários: {rule.recipient_roles.map((v) => categoryOptions.find((o) => o.value === v)?.label ?? v).join(", ")}
                    </p>
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
          categoryOptions={categoryOptions}
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

function EditRuleModal({
  rule,
  categoryOptions,
  onClose,
  onSaved,
}: {
  rule: AlertRule;
  categoryOptions: RecipientCategoryOption[];
  onClose: () => void;
  onSaved: (updated: AlertRule) => void;
}) {
  const [leadHours, setLeadHours] = useState(String(Math.round((rule.lead_time_minutes ?? 1440) / 60)));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(rule.recipient_roles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usesLeadTime = DUE_SOON_TRIGGERS.includes(rule.trigger_type);

  function toggleCategory(value: string) {
    setSelectedCategories((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleSave() {
    if (saving) return;
    if (selectedCategories.length === 0) {
      setError("Selecione ao menos uma categoria de destinatário.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data: { lead_time_minutes?: number; recipient_roles?: string[] } = { recipient_roles: selectedCategories };
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
    <StandardModalDialog
      open
      onClose={onClose}
      title={`Editar regra: ${rule.name}`}
      subtitle={`Regra geral — aplica-se a ${entityLabel(rule.entity_type)}. Não existe seletor de registro individual.`}
      size="compact"
    >
      <div className="p-6 space-y-4">
        {usesLeadTime ? (
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Antecedência (horas antes do prazo)</label>
            <Input type="number" min={1} value={leadHours} onChange={(e) => setLeadHours(e.target.value)} className="mt-1" />
          </div>
        ) : (
          <p className="text-xs text-slate-500">Esta regra dispara sempre que o registro estiver atrasado — não há antecedência para configurar.</p>
        )}

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Destinatários (categorias — um alerta individual será enviado a cada destinatário elegível)
          </label>
          <div className="mt-2 space-y-2">
            {categoryOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                <Checkbox
                  checked={selectedCategories.includes(option.value)}
                  onCheckedChange={() => toggleCategory(option.value)}
                  aria-label={option.label}
                />
                {option.label}
                {option.value === "admin_responsavel" && (
                  <span className="text-[10px] text-amber-600">(ainda não implementado — nenhum vínculo confiável de admin responsável existe hoje)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" className="btn-brand border-0" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </StandardModalDialog>
  );
}

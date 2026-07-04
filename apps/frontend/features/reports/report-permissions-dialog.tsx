// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_TYPE_OPTIONS,
  DATA_SCOPES,
  DATA_SCOPE_LABELS,
  type ReportConfig,
} from "./types";
import { Shield, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

const DEFAULT_CONFIG: ReportConfig = {
  report_key: "",
  is_active: true,
  allowed_account_types: [],
  allowed_roles: [],
  allowed_user_ids: [],
  blocked_user_ids: [],
  data_scope: "GLOBAL",
  can_export: true,
  can_change_filters: true,
  only_related_data: false,
};

interface Props {
  reportKey: string | null;
  reportName: string;
  allConfigs: Record<string, ReportConfig>;
  onClose: () => void;
  onSaved: (key: string, config: ReportConfig) => void;
}

export function ReportPermissionsDialog({
  reportKey,
  reportName,
  allConfigs,
  onClose,
  onSaved,
}: Props) {
  const isOpen = reportKey !== null;
  const existing = reportKey ? allConfigs[reportKey] : null;

  const [form, setForm] = useState<ReportConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !reportKey) return;
    setForm(
      existing
        ? { ...existing }
        : { ...DEFAULT_CONFIG, report_key: reportKey },
    );
    setSavedOk(false);
    setError(null);
  }, [reportKey, isOpen]);

  const toggleAccountType = useCallback((value: string) => {
    setForm((f) => {
      const has = f.allowed_account_types.includes(value);
      return {
        ...f,
        allowed_account_types: has
          ? f.allowed_account_types.filter((x) => x !== value)
          : [...f.allowed_account_types, value],
      };
    });
  }, []);

  const save = async () => {
    if (!reportKey) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await apiClient.saveReportConfig(reportKey, form);
      onSaved(reportKey, saved);
      setSavedOk(true);
      setTimeout(onClose, 900);
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent hideOverlay className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700">
              <Shield className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <SheetTitle className="text-base leading-tight">
              Permissões — {reportName}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-slate-500">
            Configure quem pode acessar este relatório e qual escopo de dados verá.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded accent-slate-700"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Relatório ativo (visível para quem tiver acesso)
            </span>
          </label>

          {/* Account types */}
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">
              Perfis com acesso
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Se nenhum perfil for selecionado, apenas Admin pode visualizar.
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                const active = form.allowed_account_types.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleAccountType(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {form.allowed_account_types.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.allowed_account_types.map((v) => (
                  <Badge key={v} variant="secondary" className="text-[10px]">
                    {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === v)?.label || v}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Data scope */}
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">
              Escopo de dados
            </p>
            <Select
              value={form.data_scope}
              onValueChange={(v) => setForm((f) => ({ ...f, data_scope: v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_SCOPES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {DATA_SCOPE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Define quais dados o usuário vê ao abrir o relatório.
            </p>
          </div>

          {/* Feature toggles */}
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-3">
              Capacidades
            </p>
            <div className="space-y-3">
              {[
                {
                  key: "can_export" as const,
                  label: "Pode exportar (PDF / XLSX)",
                  desc: "Permite baixar o relatório como arquivo",
                },
                {
                  key: "can_change_filters" as const,
                  label: "Pode alterar filtros",
                  desc: "Permite mudar período, categoria e busca",
                },
                {
                  key: "only_related_data" as const,
                  label: "Ver apenas dados relacionados ao perfil",
                  desc: "Aplica o escopo automaticamente sem mostrar dados globais",
                },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded accent-slate-700 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {label}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status / error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700/40 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          {savedOk && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/40 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Permissões salvas com sucesso.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs flex-1"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs flex-1 gap-1"
              onClick={save}
              disabled={saving}
            >
              {saving && <RefreshCw className="h-3 w-3 animate-spin" />}
              Salvar permissões
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

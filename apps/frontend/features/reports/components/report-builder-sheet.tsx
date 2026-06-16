// @ts-nocheck
import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Settings2, Shield, Database, Users, Lock } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useSidebar } from "@/contexts/sidebar-context";
import { DATA_SCOPES, DATA_SCOPE_LABELS, ACCOUNT_TYPE_OPTIONS } from "../types";
import type { ReportConfig } from "../types";

// ─── Blank config ─────────────────────────────────────────────────────────────

function blankConfig(): ReportConfig {
  return {
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
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const t = draft.trim();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setDraft("");
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(); }
          }}
        />
        <Button variant="outline" size="sm" className="h-9 px-3" onClick={addTag}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 text-xs font-normal pr-1">
              {v}
              <button onClick={() => onChange(values.filter((x) => x !== v))} className="ml-0.5 opacity-60 hover:opacity-100">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Multi-select account types ───────────────────────────────────────────────

const PROFILE_COLORS: Record<string, string> = {
  agencias: "bg-blue-100 text-blue-800 border-blue-300 data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:border-blue-600",
  empresas: "bg-violet-100 text-violet-800 border-violet-300 data-[active=true]:bg-violet-600 data-[active=true]:text-white data-[active=true]:border-violet-600",
  nomades:  "bg-emerald-100 text-emerald-800 border-emerald-300 data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600",
  parceiro: "bg-amber-100 text-amber-800 border-amber-300 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  admin:    "bg-slate-100 text-slate-700 border-slate-300 data-[active=true]:bg-slate-700 data-[active=true]:text-white data-[active=true]:border-slate-700",
  lider:    "bg-pink-100 text-pink-800 border-pink-300 data-[active=true]:bg-pink-600 data-[active=true]:text-white data-[active=true]:border-pink-600",
};

function AccountTypeSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Perfis com acesso</Label>
      <div className="flex flex-wrap gap-2">
        {ACCOUNT_TYPE_OPTIONS.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              data-active={active}
              onClick={() => toggle(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all select-none ${PROFILE_COLORS[opt.value] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
            >
              <Users className="h-3 w-3" />
              {opt.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">{selected.length} perfil(s) selecionado(s)</p>
      )}
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 rounded-lg bg-slate-100">
          <Icon className="h-3.5 w-3.5 text-slate-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

interface ReportBuilderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConfig: ReportConfig | null;
  onSaved: () => void;
}

export function ReportBuilderSheet({
  open,
  onOpenChange,
  editingConfig,
  onSaved,
}: ReportBuilderSheetProps) {
  const isNew = !editingConfig;
  const { sidebarWidth } = useSidebar();
  const [form, setForm] = useState<ReportConfig>(blankConfig());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(editingConfig ?? blankConfig());
      setSaveError(null);
    }
  }, [open, editingConfig]);

  function set<K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.report_key.trim()) {
      setSaveError("A chave do relatório é obrigatória.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (isNew) {
        await apiClient.createAdminReport(form.report_key, form);
      } else {
        await apiClient.updateAdminReport(form.report_key, form);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideOverlay={true}
        className="p-0 flex flex-col gap-0 w-auto! max-w-none!"
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
          maxWidth: `calc(100vw - ${sidebarWidth}px)`,
        }}
      >
        <div className="relative flex flex-col h-full overflow-hidden">

          {/* ── Gradient header ───────────────────────────────────────────── */}
          <ModalBrandHeader
            icon={<Settings2 />}
            title={isNew ? "Nova configuração de relatório" : "Editar configuração"}
            subtitle={
              isNew
                ? "Defina quem pode acessar este relatório e com quais permissões"
                : `Relatório: ${editingConfig?.report_key}`
            }
            onClose={() => onOpenChange(false)}
            right={
              !isNew ? (
                <Badge
                  className={`text-xs font-medium border ${
                    form.is_active
                      ? "bg-emerald-500/30 text-emerald-100 border-emerald-400/40"
                      : "bg-red-500/30 text-red-100 border-red-400/40"
                  }`}
                >
                  {form.is_active ? "Ativo" : "Inativo"}
                </Badge>
              ) : null
            }
          />

          {/* ── Body (scrollable) ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-slate-50/40">
            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Coluna esquerda */}
              <div className="space-y-8">

                <Section title="Identificação" icon={Database}>
                  <div className="space-y-1.5">
                    <Label htmlFor="report_key" className="text-sm font-medium">
                      Chave do relatório <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="report_key"
                      value={form.report_key}
                      onChange={(e) => set("report_key", e.target.value)}
                      placeholder="ex: relatorio_financeiro_admin"
                      disabled={!isNew}
                      className="font-mono text-sm h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificador único. Não pode ser alterado após a criação.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Escopo de dados</Label>
                    <Select value={form.data_scope} onValueChange={(v) => set("data_scope", v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATA_SCOPES.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {DATA_SCOPE_LABELS[scope] ?? scope}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Section>

                <Section title="Acesso por perfil" icon={Users}>
                  <AccountTypeSelector
                    selected={form.allowed_account_types}
                    onChange={(v) => set("allowed_account_types", v)}
                  />
                </Section>

                <Section title="Acesso granular" icon={Shield}>
                  <TagInput
                    label="Roles permitidas (opcional)"
                    values={form.allowed_roles}
                    onChange={(v) => set("allowed_roles", v)}
                    placeholder="ex: agency_admin"
                  />
                  <TagInput
                    label="IDs de usuários com acesso explícito"
                    values={form.allowed_user_ids}
                    onChange={(v) => set("allowed_user_ids", v)}
                    placeholder="cuid do usuário"
                  />
                  <TagInput
                    label="IDs de usuários bloqueados"
                    values={form.blocked_user_ids}
                    onChange={(v) => set("blocked_user_ids", v)}
                    placeholder="cuid do usuário"
                  />
                </Section>

              </div>

              {/* Coluna direita */}
              <div className="space-y-8">

                <Section title="Permissões de uso" icon={Lock}>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 divide-y divide-slate-100">
                    <ToggleRow
                      label="Relatório ativo"
                      description="Inativo = nenhum perfil consegue acessar."
                      checked={form.is_active}
                      onCheckedChange={(v) => set("is_active", v)}
                    />
                    <ToggleRow
                      label="Permitir exportação"
                      description="Usuários podem baixar o relatório em PDF ou XLSX."
                      checked={form.can_export}
                      onCheckedChange={(v) => set("can_export", v)}
                    />
                    <ToggleRow
                      label="Filtros editáveis"
                      description="Usuários podem alterar período e dimensões."
                      checked={form.can_change_filters}
                      onCheckedChange={(v) => set("can_change_filters", v)}
                    />
                    <ToggleRow
                      label="Restringir dados ao perfil"
                      description="Aplica escopo de dados do usuário automaticamente."
                      checked={form.only_related_data}
                      onCheckedChange={(v) => set("only_related_data", v)}
                    />
                  </div>
                </Section>

                {/* Resumo de acesso */}
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resumo de acesso</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <span className={`font-semibold ${form.is_active ? "text-emerald-600" : "text-red-500"}`}>
                        {form.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Perfis</span>
                      <span className="font-semibold text-slate-700">
                        {form.allowed_account_types.length === 0
                          ? <span className="text-slate-400 font-normal">Nenhum</span>
                          : `${form.allowed_account_types.length} perfil(s)`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Escopo</span>
                      <span className="font-semibold text-slate-700">{DATA_SCOPE_LABELS[form.data_scope] ?? form.data_scope}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Exportação</span>
                      <span className={`font-semibold ${form.can_export ? "text-emerald-600" : "text-slate-400"}`}>
                        {form.can_export ? "Permitida" : "Bloqueada"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Filtros</span>
                      <span className={`font-semibold ${form.can_change_filters ? "text-emerald-600" : "text-slate-400"}`}>
                        {form.can_change_filters ? "Editáveis" : "Fixos"}
                      </span>
                    </div>
                    {form.allowed_account_types.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {form.allowed_account_types.map((at) => (
                          <Badge key={at} variant="secondary" className="text-xs font-normal capitalize">
                            {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === at)?.label ?? at}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {saveError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm text-red-600">{saveError}</p>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              {isNew ? "Campos marcados com * são obrigatórios" : `Editando: ${editingConfig?.report_key}`}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-9 px-5">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-6 btn-brand border-0 shadow-md"
              >
                {saving ? "Salvando…" : isNew ? "Criar configuração" : "Salvar alterações"}
              </Button>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

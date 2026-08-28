/**
 * Aba "Padrões" da Central de Alertas (ata 2026-08, 2º lote) — Admin Master
 * edita nome/título/mensagem/criticidade/ativo dos padrões existentes.
 * Nunca cria/exclui padrão nem edita a chave estável — os dois padrões
 * obrigatórios (tarefa próxima do prazo / atrasada) já nascem prontos no
 * bootstrap do backend (ver alert-engine.ts).
 */
import { useCallback, useEffect, useState } from "react";
import { Eye, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import {
  criticalityFromSeverity, criticalityLabel, criticalityIcon, criticalityBadgeColor,
  type Criticality,
} from "@/components/alerts-header-icon";
import { AlertImageThumbnail } from "@/components/alert-image-lightbox";
import { AlertImageField, isAlertImageFieldValid, type AlertImageFieldValue } from "@/components/alert-image-field";
import { cn } from "@/lib/utils";

interface AlertStandard {
  id: string;
  key: string;
  name: string;
  title: string;
  message: string;
  default_severity: "info" | "warning" | "error";
  is_active: boolean;
  is_system: boolean;
  allowed_variables: string[];
  image_file_name?: string | null;
  image_alt?: string | null;
  image_url?: string | null;
  // Governança do Admin Master (ata 2026-08, bloco 2/5)
  is_mandatory?: boolean;
  mandatory_min_severity?: "info" | "warning" | "error" | null;
  personal_prefs_allowed?: boolean;
  additional_channels?: string[];
  governed_event_types?: string[];
  mandatory_set_by?: { id: string; name: string } | null;
}

const MANDATORY_HINT = "Definido como obrigatório pelo Admin Master.";

const SEVERITY_OPTIONS: { value: "info" | "warning" | "error"; criticality: Criticality }[] = [
  { value: "info", criticality: "verde" },
  { value: "warning", criticality: "amarelo" },
  { value: "error", criticality: "vermelho" },
];

const TITLE_MAX = 200;
const MESSAGE_MAX = 2000;

export function AlertStandardsTab() {
  const [standards, setStandards] = useState<AlertStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [editing, setEditing] = useState<AlertStandard | null>(null);
  const [previewing, setPreviewing] = useState<AlertStandard | null>(null);
  const [previewData, setPreviewData] = useState<{ title: string; message: string; severity: string; image_url?: string | null; image_alt?: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchStandards = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.getAdminAlertStandards();
      setStandards(res?.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStandards();
  }, [fetchStandards]);

  async function toggleActive(standard: AlertStandard) {
    const updated = await apiClient.updateAdminAlertStandard(standard.id, { is_active: !standard.is_active });
    setStandards((prev) => prev.map((s) => (s.id === standard.id ? { ...s, ...updated } : s)));
  }

  async function openPreview(standard: AlertStandard) {
    setPreviewing(standard);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await apiClient.previewAdminAlertStandard(standard.id);
      setPreviewData(res);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4">
        {error && <p className="text-sm text-red-500 text-center py-10">Não foi possível carregar os padrões agora.</p>}
        {!error && loading && standards.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>}
        {!error && !loading && standards.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Nenhum padrão cadastrado.</p>}
        {!error && (
          <div className="space-y-2">
            {standards.map((standard) => {
              const criticality = criticalityFromSeverity[standard.default_severity];
              const Icon = criticalityIcon[criticality];
              return (
                <div key={standard.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {standard.image_url && (
                    <AlertImageThumbnail src={apiClient.resolveAlertImageUrl(standard.image_url)} alt={standard.image_alt} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{standard.name}</p>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{standard.key}</code>
                      <Badge className={cn("text-xs gap-1", criticalityBadgeColor[criticality])}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {criticalityLabel[criticality]}
                      </Badge>
                      {!standard.is_active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                      {standard.is_mandatory && (
                        <Badge className="text-[10px] gap-1 bg-amber-100 text-amber-700 border-amber-200">
                          <Lock className="h-2.5 w-2.5" />
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{standard.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{standard.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Variáveis permitidas: {standard.allowed_variables.map((v) => `{{${v}}}`).join(", ")}
                    </p>
                    {standard.is_mandatory && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        {MANDATORY_HINT}
                        {standard.mandatory_set_by ? ` (${standard.mandatory_set_by.name})` : ""}
                        {standard.mandatory_min_severity ? ` — criticidade mínima: ${standard.mandatory_min_severity}.` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {standard.is_mandatory ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch checked disabled aria-label={`${standard.name} está obrigatório e não pode ser desativado`} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{MANDATORY_HINT}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Switch checked={standard.is_active} onCheckedChange={() => void toggleActive(standard)} aria-label={`Ativar/desativar ${standard.name}`} />
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Visualizar prévia" onClick={() => void openPreview(standard)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => setEditing(standard)}>
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
        <EditStandardModal
          standard={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setStandards((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setEditing(null);
          }}
        />
      )}

      <StandardModalDialog open={previewing !== null} onClose={() => setPreviewing(null)} title="Prévia do padrão" subtitle="Dados fictícios — nenhum alerta real é criado" size="compact">
        <div className="p-6 space-y-3">
          {previewLoading && <p className="text-sm text-slate-400">Carregando prévia...</p>}
          {!previewLoading && previewData && (
            <>
              <p className="text-[10px] uppercase tracking-wide text-amber-600 font-medium">Exemplo — dados fictícios</p>
              {previewData.image_url && (
                <AlertImageThumbnail
                  src={apiClient.resolveAlertImageUrl(previewData.image_url)}
                  alt={previewData.image_alt}
                  className="h-24 w-24"
                />
              )}
              <p className="text-sm font-medium text-slate-800 dark:text-white">{previewData.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{previewData.message}</p>
            </>
          )}
        </div>
      </StandardModalDialog>
    </div>
  );
}

function EditStandardModal({
  standard,
  onClose,
  onSaved,
}: {
  standard: AlertStandard;
  onClose: () => void;
  onSaved: (updated: AlertStandard) => void;
}) {
  const [name, setName] = useState(standard.name);
  const [title, setTitle] = useState(standard.title);
  const [message, setMessage] = useState(standard.message);
  const [severity, setSeverity] = useState(standard.default_severity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Governança (ata 2026-08, bloco 2/5) ──────────────────────────────
  const [isMandatory, setIsMandatory] = useState(!!standard.is_mandatory);
  const [minSeverity, setMinSeverity] = useState<"info" | "warning" | "error" | "">(standard.mandatory_min_severity ?? "");
  const [personalPrefs, setPersonalPrefs] = useState(standard.personal_prefs_allowed ?? true);
  const [extraChannels, setExtraChannels] = useState<string[]>(standard.additional_channels ?? []);
  const [governedEvents, setGovernedEvents] = useState((standard.governed_event_types ?? []).join(", "));
  const toggleChannel = (c: string) =>
    setExtraChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const [image, setImage] = useState<AlertImageFieldValue>({
    image_file_name: standard.image_file_name ?? null,
    image_alt: standard.image_alt ?? null,
    image_url: apiClient.resolveAlertImageUrl(standard.image_url),
  });

  async function handleSave() {
    if (saving) return;
    if (!name.trim() || !title.trim() || !message.trim()) {
      setError("Nome, título e mensagem são obrigatórios.");
      return;
    }
    if (!isAlertImageFieldValid(image)) {
      setError("Texto alternativo é obrigatório quando há imagem.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateAdminAlertStandard(standard.id, {
        name: name.trim(),
        title: title.trim(),
        message: message.trim(),
        default_severity: severity,
        image_file_name: image.image_file_name,
        image_alt: image.image_file_name ? image.image_alt : null,
        is_mandatory: isMandatory,
        mandatory_min_severity: isMandatory ? (minSeverity || null) : null,
        personal_prefs_allowed: personalPrefs,
        additional_channels: extraChannels,
        governed_event_types: governedEvents
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StandardModalDialog open onClose={onClose} title={`Editar padrão: ${standard.name}`} subtitle={`Chave: ${standard.key} (não editável)`} size="compact">
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nome administrativo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Título ({title.length}/{TITLE_MAX})</label>
          <Input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Mensagem ({message.length}/{MESSAGE_MAX})</label>
          <Textarea value={message} maxLength={MESSAGE_MAX} onChange={(e) => setMessage(e.target.value)} className="mt-1" rows={3} />
          <p className="text-[10px] text-slate-400 mt-1">Variáveis permitidas: {standard.allowed_variables.map((v) => `{{${v}}}`).join(", ")}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Criticidade padrão</label>
          <div className="flex items-center gap-1.5 mt-1">
            {SEVERITY_OPTIONS.map(({ value, criticality }) => {
              const Icon = criticalityIcon[criticality];
              const active = severity === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeverity(value)}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors",
                    active ? criticalityBadgeColor[criticality] : "bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {criticalityLabel[criticality]}
                </button>
              );
            })}
          </div>
        </div>
        <AlertImageField value={image} onChange={setImage} disabled={saving} />

        {/* ── Governança do Admin Master ─────────────────────────────── */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-3 space-y-3">
          <label className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Padrão obrigatório
              <span className="block text-[10px] font-normal text-amber-600">
                Não pode ser desativado nem ter a criticidade reduzida por Admin comum, Líder ou usuário.
              </span>
            </span>
            <Switch checked={isMandatory} onCheckedChange={setIsMandatory} aria-label="Marcar padrão como obrigatório" />
          </label>

          {isMandatory && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Criticidade mínima</label>
                <select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value as typeof minSeverity)}
                  className="mt-1 h-8 text-xs w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
                >
                  <option value="">Usar a criticidade padrão como piso</option>
                  <option value="info">Verde (info)</option>
                  <option value="warning">Amarelo (aviso)</option>
                  <option value="error">Vermelho (crítico)</option>
                </select>
              </div>

              <label className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Preferências pessoais permitidas
                  <span className="block text-[10px] font-normal text-slate-400">
                    Se desligado, Líder/usuário só visualiza os canais deste tipo de alerta.
                  </span>
                </span>
                <Switch checked={personalPrefs} onCheckedChange={setPersonalPrefs} aria-label="Permitir preferências pessoais" />
              </label>

              <div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Canais adicionais permitidos</span>
                <p className="text-[10px] text-slate-400">O canal "dentro da plataforma" é sempre obrigatório.</p>
                <div className="flex gap-3 mt-1">
                  {["email", "whatsapp", "push"].map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={extraChannels.includes(c)}
                        onChange={() => toggleChannel(c)}
                      />
                      {c}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-1">
                  E-mail / WhatsApp / Push ainda não têm envio real — ficam salvos como “disponível futuramente”.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Tipos de evento governados (preferências pessoais)
                </label>
                <Input
                  value={governedEvents}
                  onChange={(e) => setGovernedEvents(e.target.value)}
                  placeholder="ex.: task-due, task-assigned"
                  className="mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Chaves separadas por vírgula. Deixe vazio para proteger só o padrão e suas regras.
                </p>
              </div>
            </div>
          )}
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

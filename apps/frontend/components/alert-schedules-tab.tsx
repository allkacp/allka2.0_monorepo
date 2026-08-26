/**
 * Aba "Programados" da Central de Alertas (ata 2026-08, 4º lote) — Admin
 * Master cria/edita/ativa/desativa/arquiva Alertas Programados (estrutura
 * própria de recorrência por data/horário, nunca cron livre digitado —
 * ver comentário em system-alerts.ts). Cada disparo vira um SystemAlert
 * comum, gerado só pelo job do backend; nada aqui cria uma ocorrência real
 * — nem a "Prévia", que só chama o endpoint de fixture.
 *
 * Estrutura de card-list análoga a alert-standards-tab.tsx (mesmo padrão
 * visual: linha com miniatura + conteúdo + ações à direita, modal de
 * edição via StandardModalDialog).
 */
import { useCallback, useEffect, useState } from "react";
import { Archive, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/api-client";
import {
  criticalityFromSeverity, criticalityLabel, criticalityIcon, criticalityBadgeColor,
  type Criticality,
} from "@/components/alerts-header-icon";
import { AlertImageThumbnail } from "@/components/alert-image-lightbox";
import { AlertImageField, isAlertImageFieldValid, type AlertImageFieldValue } from "@/components/alert-image-field";
import { describeSchedule } from "@/lib/describe-schedule";
import { cn } from "@/lib/utils";

export interface AlertSchedule {
  id: string;
  name: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  image_file_name: string | null;
  image_alt: string | null;
  image_url: string | null;
  user_id: string | null;
  destinatario: { id: string; name: string; email: string } | null;
  recurrence_type: "once" | "daily" | "weekly";
  weekdays: number[];
  time_of_day: string;
  timezone: string;
  starts_at: string;
  ends_at: string | null;
  occurrence_expires_minutes: number | null;
  is_active: boolean;
  is_archived: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_BY_CRITICALITY: Record<Criticality, "info" | "warning" | "error"> = {
  verde: "info",
  amarelo: "warning",
  vermelho: "error",
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AlertSchedulesTab() {
  const [schedules, setSchedules] = useState<AlertSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AlertSchedule | null>(null);
  const [archiving, setArchiving] = useState<AlertSchedule | null>(null);
  const [previewing, setPreviewing] = useState<AlertSchedule | null>(null);
  const [previewData, setPreviewData] = useState<{ title: string; message: string; severity: string; image_url?: string | null; image_alt?: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.getAdminAlertSchedules();
      setSchedules(res?.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  function patchLocal(updated: AlertSchedule) {
    setSchedules((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  }

  async function toggleActive(schedule: AlertSchedule) {
    const updated = await apiClient.updateAdminAlertSchedule(schedule.id, { is_active: !schedule.is_active });
    patchLocal(updated);
  }

  async function confirmArchive() {
    if (!archiving) return;
    const updated = await apiClient.archiveAdminAlertSchedule(archiving.id);
    patchLocal(updated);
  }

  async function openPreview(schedule: AlertSchedule) {
    setPreviewing(schedule);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await apiClient.previewAdminAlertSchedule(schedule.id);
      setPreviewData(res);
    } finally {
      setPreviewLoading(false);
    }
  }

  const activeSchedules = schedules.filter((s) => !s.is_archived);
  const archivedSchedules = schedules.filter((s) => s.is_archived);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-5 pt-1 pb-2 flex-wrap gap-2 shrink-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">Alertas que disparam automaticamente por data/horário — nunca por gatilho de tarefa/etapa.</p>
        <Button size="sm" className="h-8 text-xs gap-1.5 btn-brand border-0" onClick={() => { setEditing(null); setFormOpen(true); }}>
          Nova programação
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
        {error && <p className="text-sm text-red-500 text-center py-10">Não foi possível carregar as programações agora.</p>}
        {!error && loading && schedules.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>}
        {!error && !loading && schedules.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Nenhuma programação cadastrada.</p>}

        {!error && schedules.length > 0 && (
          <div className="space-y-2">
            {[...activeSchedules, ...archivedSchedules].map((schedule) => {
              const criticality = criticalityFromSeverity[schedule.severity];
              const Icon = criticalityIcon[criticality];
              const descriptionLines = describeSchedule(schedule);
              return (
                <div key={schedule.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {schedule.image_url && (
                    <AlertImageThumbnail src={apiClient.resolveAlertImageUrl(schedule.image_url)} alt={schedule.image_alt} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{schedule.name}</p>
                      <Badge className={cn("text-xs gap-1", criticalityBadgeColor[criticality])}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {criticalityLabel[criticality]}
                      </Badge>
                      {schedule.is_archived && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Archive className="h-2.5 w-2.5" />
                          Arquivada
                        </Badge>
                      )}
                      {!schedule.is_archived && !schedule.is_active && (
                        <Badge variant="outline" className="text-[10px]">Inativa</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{schedule.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{schedule.message}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {descriptionLines.map((line, i) => (
                        <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400">{line}</p>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap">
                      <span>{schedule.destinatario ? schedule.destinatario.name : "Geral (todo Admin)"}</span>
                      <span>Último disparo: {formatDateTime(schedule.last_run_at)}</span>
                      <span>Próximo disparo: {formatDateTime(schedule.next_run_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!schedule.is_archived && (
                      <Switch checked={schedule.is_active} onCheckedChange={() => void toggleActive(schedule)} aria-label={`Ativar/desativar ${schedule.name}`} />
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Visualizar prévia" onClick={() => void openPreview(schedule)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {!schedule.is_archived && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => { setEditing(schedule); setFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Arquivar" onClick={() => setArchiving(schedule)}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <ScheduleFormModal
          schedule={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            if (editing) {
              patchLocal(saved);
            } else {
              setSchedules((prev) => [saved, ...prev]);
            }
            setFormOpen(false);
          }}
        />
      )}

      <ConfirmationDialog
        open={archiving !== null}
        onClose={() => setArchiving(null)}
        onConfirm={() => void confirmArchive()}
        title="Arquivar programação"
        message={`"${archiving?.name}" para de gerar novos alertas, mas continua registrada — nada é excluído.`}
        confirmText="Arquivar"
        destructive={false}
      />

      <StandardModalDialog open={previewing !== null} onClose={() => setPreviewing(null)} title="Prévia da programação" subtitle="Dados fictícios — nenhum alerta real é criado" size="compact">
        <div className="p-6 space-y-3">
          {previewLoading && <p className="text-sm text-slate-400">Carregando prévia...</p>}
          {!previewLoading && previewData && (
            <>
              <p className="text-[10px] uppercase tracking-wide text-amber-600 font-medium">Exemplo — dados fictícios</p>
              {previewData.image_url && (
                <AlertImageThumbnail src={apiClient.resolveAlertImageUrl(previewData.image_url)} alt={previewData.image_alt} className="h-24 w-24" />
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

const RECURRENCE_OPTIONS: { value: AlertSchedule["recurrence_type"]; label: string }[] = [
  { value: "once", label: "Uma vez" },
  { value: "daily", label: "Todos os dias" },
  { value: "weekly", label: "Dias da semana" },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

function isoToDateInTimeZone(iso: string | null, timezone: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function ScheduleFormModal({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: AlertSchedule | null;
  onClose: () => void;
  onSaved: (saved: AlertSchedule) => void;
}) {
  const isEdit = !!schedule;

  const [name, setName] = useState(schedule?.name ?? "");
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [message, setMessage] = useState(schedule?.message ?? "");
  const [criticality, setCriticality] = useState<Criticality>(schedule ? criticalityFromSeverity[schedule.severity] : "amarelo");
  const [recipientMode, setRecipientMode] = useState<"geral" | "especifico">(schedule?.user_id ? "especifico" : "geral");
  const [recipientId, setRecipientId] = useState(schedule?.user_id ?? "");
  const [members, setMembers] = useState<SearchableSelectItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [recurrenceType, setRecurrenceType] = useState<AlertSchedule["recurrence_type"]>(schedule?.recurrence_type ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays ?? []);
  const [timeOfDay, setTimeOfDay] = useState(schedule?.time_of_day ?? "09:00");
  const [timezone, setTimezone] = useState(schedule?.timezone ?? DEFAULT_TIMEZONE);
  const [startDate, setStartDate] = useState(isoToDateInTimeZone(schedule?.starts_at ?? null, schedule?.timezone ?? DEFAULT_TIMEZONE));
  const [endDate, setEndDate] = useState(isoToDateInTimeZone(schedule?.ends_at ?? null, schedule?.timezone ?? DEFAULT_TIMEZONE));
  const [expiresMinutes, setExpiresMinutes] = useState(schedule?.occurrence_expires_minutes ? String(schedule.occurrence_expires_minutes) : "");

  const [image, setImage] = useState<AlertImageFieldValue>({
    image_file_name: schedule?.image_file_name ?? null,
    image_alt: schedule?.image_alt ?? null,
    image_url: apiClient.resolveAlertImageUrl(schedule?.image_url ?? null),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingMembers(true);
    apiClient
      .getNotificationGroupEligibleMembers()
      .then((res) => {
        const data: { id: string; name: string; email: string }[] = res?.data ?? [];
        setMembers(data.map((m) => ({ value: m.id, label: m.name, sublabel: m.email })));
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, []);

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  async function handleSave() {
    if (saving) return;
    const trimmedName = name.trim();
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedTitle || !trimmedMessage) {
      setError("Nome, título e mensagem são obrigatórios.");
      return;
    }
    if (recipientMode === "especifico" && !recipientId) {
      setError("Selecione um destinatário ou escolha \"Geral\".");
      return;
    }
    if (!isAlertImageFieldValid(image)) {
      setError("Texto alternativo é obrigatório quando há imagem.");
      return;
    }
    if (recurrenceType === "weekly" && weekdays.length === 0) {
      setError("Selecione ao menos um dia da semana.");
      return;
    }
    if (!startDate) {
      setError("Data inicial é obrigatória.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("Data final precisa ser depois da inicial.");
      return;
    }
    const expiresMinutesTrimmed = expiresMinutes.trim();
    const occurrenceExpiresMinutes = expiresMinutesTrimmed ? Number(expiresMinutesTrimmed) : null;
    if (expiresMinutesTrimmed && (!Number.isFinite(occurrenceExpiresMinutes) || occurrenceExpiresMinutes! <= 0)) {
      setError("Minutos de expiração da ocorrência inválidos.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: trimmedName,
        title: trimmedTitle,
        message: trimmedMessage,
        severity: SEVERITY_BY_CRITICALITY[criticality],
        user_id: recipientMode === "especifico" ? recipientId : null,
        image_file_name: image.image_file_name,
        image_alt: image.image_file_name ? image.image_alt : null,
        recurrence_type: recurrenceType,
        weekdays: recurrenceType === "weekly" ? weekdays : undefined,
        time_of_day: timeOfDay,
        timezone,
        start_date: startDate,
        end_date: endDate || null,
        occurrence_expires_minutes: occurrenceExpiresMinutes,
      };
      const saved = isEdit
        ? await apiClient.updateAdminAlertSchedule(schedule!.id, payload)
        : await apiClient.createAdminAlertSchedule(payload as Parameters<typeof apiClient.createAdminAlertSchedule>[0]);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a programação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const CRITICALITY_OPTIONS: Criticality[] = ["verde", "amarelo", "vermelho"];

  return (
    <StandardModalDialog
      open
      onClose={onClose}
      title={isEdit ? "Editar programação" : "Nova programação"}
      subtitle="Alertas Programados — dispara automaticamente por data/horário"
      size="large"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" className="h-9 text-sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button className="h-9 text-sm btn-brand border-0" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar programação"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Nome administrativo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lembrete de fechamento mensal" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Título</label>
          <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Mensagem</label>
          <Textarea value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} className="min-h-20 resize-none" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Criticidade</label>
          <div className="flex items-center gap-1.5" role="group" aria-label="Criticidade do alerta">
            {CRITICALITY_OPTIONS.map((c) => {
              const Icon = criticalityIcon[c];
              const selected = criticality === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCriticality(c)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors",
                    selected ? criticalityBadgeColor[c] : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {criticalityLabel[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Destinatário</label>
          <div className="flex items-center gap-1.5 mb-2">
            <Button type="button" size="sm" variant={recipientMode === "geral" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5" onClick={() => setRecipientMode("geral")}>
              Geral (todo Admin)
            </Button>
            <Button type="button" size="sm" variant={recipientMode === "especifico" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5" onClick={() => setRecipientMode("especifico")}>
              Usuário específico
            </Button>
          </div>
          {recipientMode === "especifico" && (
            <SearchableSelect
              items={members}
              value={recipientId}
              onValueChange={setRecipientId}
              placeholder="Buscar por nome ou e-mail..."
              searchPlaceholder="Nome ou e-mail"
              emptyMessage="Nenhum usuário encontrado."
              loading={loadingMembers}
            />
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Recorrência</label>
          <div className="flex items-center gap-1.5" role="group" aria-label="Tipo de recorrência">
            {RECURRENCE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecurrenceType(value)}
                aria-pressed={recurrenceType === value}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  recurrenceType === value
                    ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {recurrenceType === "weekly" && (
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Dias da semana</label>
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Dias da semana">
              {WEEKDAY_OPTIONS.map(({ value, label }) => {
                const selected = weekdays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleWeekday(value)}
                    aria-pressed={selected}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-colors",
                      selected
                        ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Horário</label>
            <input
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Fuso horário</label>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder={DEFAULT_TIMEZONE} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
              {recurrenceType === "once" ? "Data de envio" : "Início da recorrência"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            />
          </div>
          {recurrenceType !== "once" && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Fim da recorrência (opcional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Expiração de cada ocorrência (minutos, opcional)</label>
          <Input
            type="number"
            min={1}
            max={30 * 24 * 60}
            value={expiresMinutes}
            onChange={(e) => setExpiresMinutes(e.target.value)}
            placeholder="Ex.: 480 (8 horas)"
          />
          <p className="text-[10px] text-slate-400 mt-1">Depois desse tempo, cada alerta gerado por esta programação expira automaticamente. Máximo 43200 (30 dias).</p>
        </div>

        <AlertImageField value={image} onChange={setImage} disabled={saving} />

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </StandardModalDialog>
  );
}

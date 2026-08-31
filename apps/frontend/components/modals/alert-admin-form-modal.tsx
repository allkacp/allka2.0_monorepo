/**
 * Central de Alertas (ata 2026-08) — "Novo alerta" / "Editar alerta". Só
 * título e mensagem são editáveis depois de criado (reclassificar
 * criticidade é uma ação própria, rápida, direto na linha da lista — ver
 * AlertsAdminCenter; destinatário nunca muda depois de criado, pra não
 * confundir quem já recebeu o alerta original).
 */
import { useEffect, useState } from "react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/api-client";
import {
  criticalityLabel, criticalityIcon, criticalityBadgeColor,
  type Criticality,
} from "@/components/alerts-header-icon";
import { AlertImageField, isAlertImageFieldValid, type AlertImageFieldValue } from "@/components/alert-image-field";
import { cn } from "@/lib/utils";

const TITLE_MAX = 200;
const MESSAGE_MAX = 2000;

const SEVERITY_BY_CRITICALITY: Record<Criticality, "info" | "warning" | "error"> = {
  verde: "info",
  amarelo: "warning",
  vermelho: "error",
};

export interface AlertAdminDraft {
  id?: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  user_id: string | null;
  destinatarioLabel?: string | null;
  image_file_name?: string | null;
  image_alt?: string | null;
  image_url?: string | null;
  expires_at?: string | null;
  // Só pra exibição em modo edição (read-only, ver render abaixo) — nunca
  // reenviado: o destino não pode mudar depois de criado, mesma regra do
  // destinatário.
  entity_type?: string | null;
}

type DestinationType = "none" | "project" | "task";

interface AlertAdminFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: AlertAdminDraft | null;
  onSave: (draft: {
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
    user_id: string | null;
    image_file_name?: string | null;
    image_alt?: string | null;
    expires_at?: string | null;
    destination_type?: DestinationType;
    destination_id?: string | null;
  }) => Promise<void>;
}

const DESTINATION_ENTITY_LABEL: Record<string, string> = {
  project: "Projeto",
  project_task: "Tarefa",
};

// datetime-local <-> ISO — o input só entende "YYYY-MM-DDTHH:mm" (hora
// local do navegador, sem timezone explícita); convertemos pra ISO só na
// hora de enviar.
function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AlertAdminFormModal({ open, onClose, initial, onSave }: AlertAdminFormModalProps) {
  const isEdit = !!initial?.id;

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [criticality, setCriticality] = useState<Criticality>("amarelo");
  const [recipientMode, setRecipientMode] = useState<"geral" | "especifico">("geral");
  const [recipientId, setRecipientId] = useState("");
  const [members, setMembers] = useState<SearchableSelectItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<AlertImageFieldValue>({ image_file_name: null, image_alt: null, image_url: null });
  const [expiresAtLocal, setExpiresAtLocal] = useState("");

  // Destino opcional (ata 2026-08, 6º lote) — "none" (padrão) = alerta
  // informativo, sem botão "Ver". Nunca aceita URL/id digitado: o único
  // jeito de escolher é o seletor buscável abaixo, sobre registros reais.
  const [destinationType, setDestinationType] = useState<DestinationType>("none");
  const [destinationId, setDestinationId] = useState("");
  const [destinationLabel, setDestinationLabel] = useState<string | null>(null);
  const [destinationOptions, setDestinationOptions] = useState<SearchableSelectItem[]>([]);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [loadingDestinations, setLoadingDestinations] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setMessage(initial?.message ?? "");
    const initialSeverity = initial?.severity ?? "warning";
    setCriticality(
      initialSeverity === "info" ? "verde" : initialSeverity === "error" ? "vermelho" : "amarelo",
    );
    setRecipientMode(initial?.user_id ? "especifico" : "geral");
    setRecipientId(initial?.user_id ?? "");
    setImage({
      image_file_name: initial?.image_file_name ?? null,
      image_alt: initial?.image_alt ?? null,
      image_url: initial?.image_url ?? null,
    });
    setExpiresAtLocal(isoToDatetimeLocal(initial?.expires_at));
    setError("");
    // Destino nunca é reconstruído em modo edição (não é reenviado — ver
    // comentário no onSave/AlertAdminDraft), só limpo em modo criação.
    setDestinationType("none");
    setDestinationId("");
    setDestinationLabel(null);
    setDestinationOptions([]);
    setDestinationSearch("");
    if (!isEdit) {
      setLoadingMembers(true);
      apiClient
        .getNotificationGroupEligibleMembers()
        .then((res) => {
          const data: { id: string; name: string; email: string }[] = res?.data ?? [];
          setMembers(data.map((m) => ({ value: m.id, label: m.name, sublabel: m.email })));
        })
        .catch(() => setMembers([]))
        .finally(() => setLoadingMembers(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // Busca as opções do seletor de destino no servidor (nunca lista tudo:
  // GET /system-alerts/admin/destination-options é sempre paginado/leve —
  // o próprio Bug 1 deste lote nasceu de uma listagem sem paginação).
  // Refaz a cada troca de tipo e a cada termo digitado (debounced).
  useEffect(() => {
    if (!open || isEdit || destinationType === "none") {
      setDestinationOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingDestinations(true);
    const t = setTimeout(() => {
      apiClient
        .getAlertDestinationOptions(destinationType, destinationSearch.trim() || undefined)
        .then((res) => {
          if (cancelled) return;
          const data: { id: string; label: string; sublabel: string | null }[] = res?.data ?? [];
          setDestinationOptions(data.map((d) => ({ value: d.id, label: d.label, sublabel: d.sublabel ?? undefined })));
        })
        .catch(() => {
          if (!cancelled) setDestinationOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingDestinations(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, isEdit, destinationType, destinationSearch]);

  async function handleSave() {
    if (saving) return; // clique duplo bloqueado
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle) {
      setError("Título é obrigatório.");
      return;
    }
    if (!trimmedMessage) {
      setError("Mensagem é obrigatória.");
      return;
    }
    if (!isEdit && recipientMode === "especifico" && !recipientId) {
      setError("Selecione um destinatário ou escolha \"Geral\".");
      return;
    }
    if (!isEdit && destinationType !== "none" && !destinationId) {
      setError("Selecione um registro para o destino escolhido, ou volte para \"Nenhum\".");
      return;
    }
    if (!isAlertImageFieldValid(image)) {
      setError("Texto alternativo é obrigatório quando há imagem.");
      return;
    }
    const expiresAtIso = datetimeLocalToIso(expiresAtLocal);
    if (expiresAtLocal && (!expiresAtIso || new Date(expiresAtIso).getTime() <= Date.now())) {
      setError("A expiração precisa ser no futuro.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: trimmedTitle,
        message: trimmedMessage,
        severity: SEVERITY_BY_CRITICALITY[criticality],
        user_id: recipientMode === "especifico" ? recipientId : null,
        image_file_name: image.image_file_name,
        image_alt: image.image_file_name ? image.image_alt : null,
        expires_at: expiresAtIso,
        destination_type: isEdit ? undefined : destinationType,
        destination_id: isEdit ? undefined : destinationType === "none" ? null : destinationId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o alerta. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const CRITICALITY_OPTIONS: Criticality[] = ["verde", "amarelo", "vermelho"];

  return (
    <StandardModalDialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar alerta" : "Novo alerta"}
      subtitle={isEdit ? "Só título e mensagem podem ser alterados aqui" : "Criação manual — Central de Alertas"}
      size="large"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" className="h-9 text-sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="h-9 text-sm btn-brand border-0" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar alerta"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Título</label>
            <span className="text-[10px] text-slate-400">{title.length}/{TITLE_MAX}</span>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="Ex.: Pagamento pendente há mais de 5 dias"
            maxLength={TITLE_MAX}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mensagem</label>
            <span className="text-[10px] text-slate-400">{message.length}/{MESSAGE_MAX}</span>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            placeholder="Detalhe o que precisa de atenção"
            className="min-h-24 resize-none"
            maxLength={MESSAGE_MAX}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
            Criticidade
          </label>
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
                    selected
                      ? criticalityBadgeColor[c]
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
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
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
            Destinatário
          </label>
          {isEdit ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              {initial?.user_id ? (initial.destinatarioLabel ?? "Usuário específico") : "Geral (todo Admin)"}
              {" — não pode ser alterado depois de criado."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={recipientMode === "geral" ? "secondary" : "ghost"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setRecipientMode("geral")}
                >
                  Geral (todo Admin)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={recipientMode === "especifico" ? "secondary" : "ghost"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setRecipientMode("especifico")}
                >
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
            </>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
            Destino opcional
          </label>
          {isEdit ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              {initial?.entity_type ? DESTINATION_ENTITY_LABEL[initial.entity_type] ?? "Vinculado" : "Nenhum (alerta informativo)"}
              {" — não pode ser alterado depois de criado."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                {(["none", "project", "task"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={destinationType === t ? "secondary" : "ghost"}
                    className="h-7 text-xs px-2.5"
                    onClick={() => {
                      setDestinationType(t);
                      setDestinationId("");
                      setDestinationLabel(null);
                      setDestinationSearch("");
                    }}
                  >
                    {t === "none" ? "Nenhum" : t === "project" ? "Projeto" : "Tarefa"}
                  </Button>
                ))}
              </div>
              {destinationType === "none" ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Este alerta é informativo e não possui uma tela vinculada. O botão "Ver" não aparecerá.
                </p>
              ) : (
                <>
                  <SearchableSelect
                    items={destinationOptions}
                    value={destinationId}
                    onValueChange={(v) => {
                      setDestinationId(v);
                      setDestinationLabel(destinationOptions.find((o) => o.value === v)?.label ?? null);
                    }}
                    onSearchChange={setDestinationSearch}
                    placeholder={destinationType === "project" ? "Buscar projeto por nome..." : "Buscar tarefa por nome ou código..."}
                    searchPlaceholder="Digite para buscar"
                    emptyMessage="Nenhum registro encontrado."
                    loading={loadingDestinations}
                  />
                  {destinationId && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      Ao clicar em Ver, o usuário abrirá: {destinationLabel ?? "registro selecionado"} ({destinationType === "project" ? "projeto" : "tarefa"})
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <AlertImageField value={image} onChange={setImage} disabled={saving} />

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
            Expira em (opcional)
          </label>
          <input
            type="datetime-local"
            value={expiresAtLocal}
            onChange={(e) => setExpiresAtLocal(e.target.value)}
            disabled={saving}
            className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-[10px] text-slate-400 mt-1">Depois desse horário, a ocorrência expira automaticamente.</p>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </StandardModalDialog>
  );
}

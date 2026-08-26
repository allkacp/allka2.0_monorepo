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
}

interface AlertAdminFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: AlertAdminDraft | null;
  onSave: (draft: { title: string; message: string; severity: "info" | "warning" | "error"; user_id: string | null }) => Promise<void>;
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
    setError("");
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
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: trimmedTitle,
        message: trimmedMessage,
        severity: SEVERITY_BY_CRITICALITY[criticality],
        user_id: recipientMode === "especifico" ? recipientId : null,
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

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </StandardModalDialog>
  );
}

/**
 * "Nova Regra" (painel de notificações, aba Regras) — escolhe um tipo de
 * evento do catálogo (PREF_GROUPS, definido em notification-preferences-panel.tsx)
 * e quais canais avisam por ele. Salva na mesma tabela usada pela aba
 * Preferências (NotificationPreference) — uma "regra" aqui é só uma forma
 * diferente de olhar pra mesma preferência, nunca um segundo sistema.
 */
import { useState } from "react";
import { Mail, MessageSquare, Bell, Smartphone } from "lucide-react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type PrefEventOption = { id: string; label: string; groupLabel: string };

interface NotificationRuleFormModalProps {
  open: boolean;
  onClose: () => void;
  eventOptions: PrefEventOption[];
  onSave: (eventType: string, channels: { email: boolean; whatsapp: boolean; push: boolean }) => Promise<void>;
}

const CHANNEL_FIELDS = [
  { key: "email" as const, label: "E-mail", Icon: Mail },
  { key: "whatsapp" as const, label: "WhatsApp", Icon: MessageSquare },
  { key: "push" as const, label: "Push", Icon: Smartphone },
];

export function NotificationRuleFormModal({ open, onClose, eventOptions, onSave }: NotificationRuleFormModalProps) {
  const [eventType, setEventType] = useState("");
  const [email, setEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [push, setPush] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setEventType("");
    setEmail(false);
    setWhatsapp(false);
    setPush(false);
    setError("");
  }

  async function handleSave() {
    if (!eventType) {
      setError("Escolha um tipo de evento.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(eventType, { email, whatsapp, push });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a regra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StandardModalDialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nova Regra"
      subtitle="Escolha o evento e por quais canais quer ser avisado"
      size="compact"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1 h-9 text-sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1 h-9 text-sm btn-brand border-0" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar regra"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Tipo de evento</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
          >
            <option value="">Selecione...</option>
            {eventOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.groupLabel} — {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <Bell className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dentro da plataforma</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Sempre ativo</span>
          </div>
          {CHANNEL_FIELDS.map(({ key, label, Icon }) => {
            const value = key === "email" ? email : key === "whatsapp" ? whatsapp : push;
            const setValue = key === "email" ? setEmail : key === "whatsapp" ? setWhatsapp : setPush;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                  <span className="text-[9px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-0.5">
                    não enviado ainda
                  </span>
                </div>
                <Switch checked={value} onCheckedChange={setValue} />
              </div>
            );
          })}
        </div>

        {error && <p className={cn("text-xs text-red-600 dark:text-red-400")}>{error}</p>}
      </div>
    </StandardModalDialog>
  );
}

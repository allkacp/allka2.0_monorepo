// Configurações → Chat (só o Admin Master grava; os outros admins só veem).
// Liga/desliga o chat, escolhe quais perfis usam, o que dá para mandar (áudio,
// fotos, documentos, emojis), o que dá para fazer com a mensagem (responder,
// editar, apagar) e os tamanhos da janela pequena e da tela grande. O servidor
// é a fonte de verdade (GET/PUT /api/chat/settings); ao salvar, o chat aberto
// nesta aba já passa a seguir as regras novas.
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AudioLines, Image as ImageIcon, Lock, MessageSquare, MessagesSquare, Monitor, RotateCcw, Save, ShieldCheck, Users } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useChat } from "@/contexts/chat-context";
import { CHAT_PROFILES, CHAT_PROFILE_LABELS, DEFAULT_CHAT_SETTINGS, type ChatProfile, type ChatSettings } from "@/lib/chat-settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const KEYS = Object.keys(DEFAULT_CHAT_SETTINGS) as (keyof ChatSettings)[];

function pick(raw: any): ChatSettings {
  const out: any = { ...DEFAULT_CHAT_SETTINGS };
  for (const k of KEYS) if (raw && raw[k] !== undefined) out[k] = raw[k];
  return out as ChatSettings;
}

function same(a: ChatSettings, b: ChatSettings) {
  return KEYS.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

function formatSeconds(s: number) {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

function formatMinutes(m: number) {
  if (m === 0) return "sem limite";
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.round((m / 60) * 10) / 10} h`.replace(".", ",");
  return `${Math.round((m / 1440) * 10) / 10} dia(s)`.replace(".", ",");
}

// ─── Peças ───────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border border-slate-200/70 shadow-sm dark:border-slate-700/60">
      <div className="flex items-center gap-3 border-b border-slate-200/70 bg-slate-50/60 px-5 py-3 dark:border-slate-700/60 dark:bg-slate-900/30">
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight text-slate-700 dark:text-slate-200">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  );
}

function Toggle({ label, description, checked, onChange, disabled }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-start justify-between gap-4", disabled ? "cursor-default" : "cursor-pointer")}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5 shrink-0" />
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-2", disabled && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} disabled={disabled} aria-label={label} />
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

/** Desenho da tela com as duas janelas, para ver as proporções antes de salvar. */
function WindowPreview({ s }: { s: ChatSettings }) {
  // Tela de referência: 1440 × 900.
  const W = 1440;
  const H = 900;
  const cw = (Math.min(s.compact_width, W - 32) / W) * 100;
  const ch = (Math.min(s.compact_height, H - 32) / H) * 100;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="space-y-1.5">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          <div className="absolute inset-x-0 top-0 h-[6%] bg-slate-200 dark:bg-slate-700" />
          <div
            className="absolute rounded-md border border-black/10 bg-white shadow-md dark:bg-slate-600"
            style={{ width: `${cw}%`, height: `${ch}%`, right: "1.5%", bottom: "2%" }}
          >
            <div className="h-[11%] rounded-t-md" style={{ background: "var(--app-brand-header, var(--app-brand-gradient, linear-gradient(135deg,#000,#1a2a6f,#c81a7f)))" }} />
          </div>
        </div>
        <figcaption className="text-center text-xs text-slate-500">
          Janela pequena: {s.compact_width} × {s.compact_height} px
        </figcaption>
      </figure>
      <figure className={cn("space-y-1.5", !s.allow_expanded && "opacity-40")}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 bg-slate-400/60 dark:border-slate-700 dark:bg-slate-900">
          <div
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md bg-white shadow-lg dark:bg-slate-600"
            style={{ width: `${s.expanded_width_pct}%`, height: `${s.expanded_height_pct}%` }}
          >
            <div className="w-[32%] border-r border-black/10">
              <div className="h-[11%]" style={{ background: "var(--app-brand-header, var(--app-brand-gradient, linear-gradient(135deg,#000,#1a2a6f,#c81a7f)))" }} />
            </div>
            <div className="chat-wallpaper flex-1">
              <div className="h-[11%]" style={{ background: "var(--app-brand-header, var(--app-brand-gradient, linear-gradient(135deg,#000,#1a2a6f,#c81a7f)))" }} />
            </div>
          </div>
        </div>
        <figcaption className="text-center text-xs text-slate-500">
          {s.allow_expanded ? `Tela grande: ${s.expanded_width_pct}% × ${s.expanded_height_pct}% da janela` : "Tela grande desligada"}
        </figcaption>
      </figure>
    </div>
  );
}

// ─── Painel ──────────────────────────────────────────────────────────────

export function ChatSettingsPanel() {
  const { toast } = useToast();
  const { reloadSettings } = useChat();
  const [saved, setSaved] = useState<ChatSettings | null>(null);
  const [draft, setDraft] = useState<ChatSettings | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res: any = await apiClient.getChatSettings();
      const s = pick(res?.settings);
      setSaved(s);
      setDraft(s);
      setCanManage(!!res?.can_manage);
      setUpdatedAt(res?.settings?.updated_at ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível abrir as configurações do chat.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => !!saved && !!draft && !same(saved, draft), [saved, draft]);

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </span>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!draft || !saved) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const ro = !canManage;
  const set = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const toggleProfile = (p: ChatProfile, on: boolean) =>
    set("allowed_profiles", on ? CHAT_PROFILES.filter((x) => x === p || draft.allowed_profiles.includes(x)) : draft.allowed_profiles.filter((x) => x !== p));

  const save = async () => {
    setSaving(true);
    try {
      const res: any = await apiClient.updateChatSettings(draft as unknown as Record<string, unknown>);
      const s = pick(res?.settings);
      setSaved(s);
      setDraft(s);
      setUpdatedAt(res?.settings?.updated_at ?? new Date().toISOString());
      toast({ title: "Configurações do chat salvas", description: "Valem na hora para quem abrir o chat." });
      void reloadSettings();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const extensions = draft.allowed_extensions
    .split(",")
    .map((x) => x.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);

  return (
    <div className="space-y-4 pb-20">
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border p-4",
          draft.enabled
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
        )}
      >
        <MessageSquare className="h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{draft.enabled ? "O chat está ligado" : "O chat está desligado"}</p>
          <p className="mt-0.5 text-xs opacity-80">
            {draft.enabled
              ? "Aparece para os perfis marcados abaixo. A administração sempre tem acesso, para dar suporte."
              : "Só a administração vê o chat. O botão some para todos os outros perfis."}
          </p>
        </div>
        <Switch checked={draft.enabled} onCheckedChange={(v) => set("enabled", v)} disabled={ro} aria-label="Ligar o chat" />
      </div>

      {ro && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" /> Só o Admin Master altera estas configurações. Você pode consultar como estão.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={Users} title="Quem usa o chat" description="Perfis que veem o botão do chat e podem conversar.">
          <div className="grid gap-2 sm:grid-cols-2">
            {CHAT_PROFILES.map((p) => {
              const isAdmin = p === "admin";
              const checked = isAdmin || draft.allowed_profiles.includes(p);
              return (
                <label
                  key={p}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                    checked ? "chat-accent-soft border-transparent" : "border-slate-200 dark:border-slate-700",
                    ro || isAdmin ? "cursor-default" : "cursor-pointer",
                  )}
                >
                  <Checkbox checked={checked} disabled={ro || isAdmin} onCheckedChange={(v) => toggleProfile(p, v === true)} />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-700 dark:text-slate-200">{CHAT_PROFILE_LABELS[p]}</span>
                    {isAdmin && <span className="block text-[11px] text-slate-400">Sempre tem acesso</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <Toggle
            label="Pode começar conversa nova"
            description="Quem não é da administração pode abrir conversa com a administração e com quem já conversa. Desligado: só responde nas conversas que já existem."
            checked={draft.allow_new_conversations}
            onChange={(v) => set("allow_new_conversations", v)}
            disabled={ro}
          />
        </Section>

        <Section icon={MessagesSquare} title="Mensagens" description="O que dá para fazer com cada mensagem.">
          <Toggle label="Emojis" checked={draft.allow_emoji} onChange={(v) => set("allow_emoji", v)} disabled={ro} />
          <Toggle label="Responder uma mensagem" description="Cita a mensagem original, como no WhatsApp." checked={draft.allow_reply} onChange={(v) => set("allow_reply", v)} disabled={ro} />
          <Toggle label="Editar mensagem enviada" checked={draft.allow_edit} onChange={(v) => set("allow_edit", v)} disabled={ro} />
          {draft.allow_edit && (
            <Range label="Prazo para editar" value={draft.edit_window_minutes} min={0} max={1440} step={5} format={formatMinutes} onChange={(v) => set("edit_window_minutes", v)} disabled={ro} />
          )}
          <Toggle label="Apagar para todos" checked={draft.allow_delete} onChange={(v) => set("allow_delete", v)} disabled={ro} />
          {draft.allow_delete && (
            <Range label="Prazo para apagar" value={draft.delete_window_minutes} min={0} max={1440} step={5} format={formatMinutes} onChange={(v) => set("delete_window_minutes", v)} disabled={ro} />
          )}
          <Toggle label="Confirmação de leitura" description="Mostra os dois tiques azuis quando o outro lado leu." checked={draft.show_read_receipts} onChange={(v) => set("show_read_receipts", v)} disabled={ro} />
          <Toggle label="Enter envia" description="Shift+Enter quebra linha. Desligado: Enter quebra linha e Ctrl+Enter envia." checked={draft.enter_sends} onChange={(v) => set("enter_sends", v)} disabled={ro} />
          <Range label="Tamanho máximo da mensagem" value={draft.max_message_chars} min={100} max={4000} step={100} format={(v) => `${v} caracteres`} onChange={(v) => set("max_message_chars", v)} disabled={ro} />
        </Section>

        <Section icon={AudioLines} title="Mensagem de voz" description="Gravada direto no chat, pelo microfone.">
          <Toggle label="Liberar áudio" checked={draft.allow_audio} onChange={(v) => set("allow_audio", v)} disabled={ro} />
          {draft.allow_audio && (
            <Range label="Duração máxima" value={draft.max_audio_seconds} min={10} max={900} step={10} format={formatSeconds} onChange={(v) => set("max_audio_seconds", v)} disabled={ro} />
          )}
        </Section>

        <Section icon={ImageIcon} title="Fotos e documentos" description="Arquivos enviados ficam guardados no servidor da plataforma.">
          <Toggle label="Liberar fotos" checked={draft.allow_images} onChange={(v) => set("allow_images", v)} disabled={ro} />
          <Toggle label="Liberar documentos" checked={draft.allow_files} onChange={(v) => set("allow_files", v)} disabled={ro} />
          {(draft.allow_images || draft.allow_files || draft.allow_audio) && (
            <Range label="Tamanho máximo do arquivo" value={draft.max_file_mb} min={1} max={25} format={(v) => `${v} MB`} onChange={(v) => set("max_file_mb", v)} disabled={ro} />
          )}
          {draft.allow_files && (
            <div className="space-y-2">
              <label htmlFor="chat-ext" className="text-sm text-slate-600 dark:text-slate-300">
                Tipos de documento aceitos
              </label>
              <Input
                id="chat-ext"
                value={draft.allowed_extensions}
                onChange={(e) => set("allowed_extensions", e.target.value)}
                disabled={ro}
                maxLength={500}
                placeholder="pdf, docx, xlsx"
              />
              <p className="text-[11px] text-slate-400">Separe por vírgula, sem ponto. Exemplo: pdf, docx, xlsx.</p>
              {extensions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {extensions.map((x) => (
                    <span key={x} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {x}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      <Section icon={Monitor} title="Tamanho da janela" description="O chat abre pequeno no canto da tela e pode ser aberto em tela grande, como o WhatsApp Web. No celular ele sempre ocupa a tela toda.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Range label="Largura da janela pequena" value={draft.compact_width} min={320} max={640} step={10} format={(v) => `${v} px`} onChange={(v) => set("compact_width", v)} disabled={ro} />
            <Range label="Altura da janela pequena" value={draft.compact_height} min={420} max={900} step={10} format={(v) => `${v} px`} onChange={(v) => set("compact_height", v)} disabled={ro} />
            <Toggle
              label="Permitir tela grande"
              description="Mostra o botão de abrir em tela grande, com a lista de conversas ao lado."
              checked={draft.allow_expanded}
              onChange={(v) => {
                set("allow_expanded", v);
                if (!v) set("default_mode", "compact");
              }}
              disabled={ro}
            />
            <Toggle
              label="Permitir abrir em outra janela"
              description="Mostra o botão que abre o chat separado, numa janela própria do navegador (só no computador)."
              checked={draft.allow_popout}
              onChange={(v) => set("allow_popout", v)}
              disabled={ro}
            />
            {draft.allow_expanded && (
              <>
                <Range label="Largura da tela grande" value={draft.expanded_width_pct} min={50} max={100} format={(v) => `${v}%`} onChange={(v) => set("expanded_width_pct", v)} disabled={ro} />
                <Range label="Altura da tela grande" value={draft.expanded_height_pct} min={50} max={100} format={(v) => `${v}%`} onChange={(v) => set("expanded_height_pct", v)} disabled={ro} />
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-300">Como abre na primeira vez</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como o chat abre na primeira vez">
                    {(["compact", "expanded"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={draft.default_mode === m}
                        disabled={ro}
                        onClick={() => set("default_mode", m)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-default",
                          draft.default_mode === m
                            ? "chat-accent-soft border-transparent"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                        )}
                      >
                        {m === "compact" ? "Janela pequena" : "Tela grande"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">Cada pessoa pode trocar depois; o chat lembra a última escolha dela.</p>
                </div>
              </>
            )}
          </div>
          <WindowPreview s={draft} />
        </div>
      </Section>

      {canManage && (
        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur sm:px-4 sm:py-3 dark:border-slate-700 dark:bg-slate-900/95">
          <p className="hidden min-w-0 items-center gap-2 text-xs text-slate-500 sm:flex">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {dirty ? "Há alterações não salvas." : updatedAt ? `Salvo em ${new Date(updatedAt).toLocaleString("pt-BR")}.` : "Usando os valores padrão."}
          </p>
          <div className="flex min-w-0 flex-1 justify-end gap-2 sm:flex-none">
            <Button variant="outline" size="sm" onClick={() => setDraft({ ...DEFAULT_CHAT_SETTINGS })} disabled={saving || same(draft, DEFAULT_CHAT_SETTINGS)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> <span className="max-sm:hidden">Voltar ao padrão</span>
              <span className="sm:hidden">Padrão</span>
            </Button>
            {dirty && (
              <Button variant="outline" size="sm" onClick={() => setDraft(saved)} disabled={saving}>
                Desfazer
              </Button>
            )}
            <Button size="sm" className="max-sm:flex-1" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? <Spinner size="xs" className="mr-1.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />} Salvar<span className="max-sm:hidden">&nbsp;alterações</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

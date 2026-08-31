import { useCallback, useEffect, useState } from "react";
import { Bell, Mail, MessageCircle, Smartphone, Info, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Preferência de CANAL para comunicações NÃO obrigatórias + opt-in de
// marketing + fundação de Web Push (ata 2026-08, bloco 5/5). Evolui a tela
// de Preferências existente — não recria a aba "Regras" (removida antes).

type Prefs = {
  platform_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  marketing_opt_in: boolean;
};

const CHANNEL_META = [
  { key: "platform_enabled", label: "Plataforma", Icon: Bell, availKey: null },
  { key: "email_enabled", label: "E-mail", Icon: Mail, availKey: "email" },
  { key: "whatsapp_enabled", label: "WhatsApp", Icon: MessageCircle, availKey: "whatsapp" },
  { key: "push_enabled", label: "Web Push", Icon: Smartphone, availKey: "push" },
] as const;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

export function CommsChannelPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<Array<{ channel: string; state: string; detail: string }>>([]);
  const [avail, setAvail] = useState<{ email: boolean; whatsapp: boolean; push: boolean }>({ email: false, whatsapp: false, push: false });
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, ps] = await Promise.all([apiClient.getCommsPreferences(), apiClient.getCommsPushStatus()]);
      setPrefs(p.preferences);
      setStatus(p.channel_status);
      setAvail(p.availability);
      setPushConfigured(ps.configured);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: keyof Prefs, value: boolean) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
    try {
      await apiClient.updateCommsPreferences({ [key]: value });
    } catch {
      setPrefs({ ...prefs, [key]: !value });
    }
  }

  // Ativação de Web Push — SÓ por ação explícita do usuário, nunca no load.
  async function enablePush() {
    setPushMsg(null);
    if (!pushConfigured) {
      setPushMsg("Web Push ainda não está configurado nesta instalação. Nada foi solicitado.");
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushMsg("Este navegador não suporta Web Push.");
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMsg("Permissão não concedida.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const ps = await apiClient.getCommsPushStatus();
      if (!ps.vapid_public_key) {
        setPushMsg("Web Push não configurado (sem chave pública).");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(ps.vapid_public_key),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await apiClient.subscribeWebPush({
        endpoint: json.endpoint ?? "",
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      setPushMsg("Notificações do navegador ativadas.");
      await load();
    } catch (e: any) {
      setPushMsg(e?.message ?? "Não foi possível ativar as notificações do navegador.");
    } finally {
      setPushBusy(false);
    }
  }

  if (!prefs) return null;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Canais para comunicações não obrigatórias
        </p>
        <div className="space-y-1.5">
          {CHANNEL_META.map(({ key, label, Icon, availKey }) => {
            const chStatus = status.find((s) => s.channel === (key === "platform_enabled" ? "platform" : availKey));
            const notConfigured = chStatus?.state === "not_configured";
            const unavailable = availKey ? !avail[availKey] : false;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                    <p className="text-[10px] text-slate-400">
                      {key === "platform_enabled"
                        ? "Comunicação interna obrigatória sempre chega por aqui."
                        : notConfigured
                          ? "Canal não configurado — nada real é enviado ainda."
                          : unavailable
                            ? "Indisponível: sem endereço/assinatura válida na sua conta."
                            : "Disponível."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs[key as keyof Prefs] as boolean}
                  onCheckedChange={(v) => toggle(key as keyof Prefs, v)}
                  className="scale-75"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Comunicações de marketing / reengajamento</p>
          <p className="text-[10px] text-slate-400">Opt-in: campanhas de marketing só chegam se isto estiver ligado.</p>
        </div>
        <Switch checked={prefs.marketing_opt_in} onCheckedChange={(v) => toggle("marketing_opt_in", v)} className="scale-75" />
      </div>

      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notificações do navegador (Web Push)</p>
        <p className="mb-2 text-[10px] text-slate-400">
          {pushConfigured
            ? "Ativação só acontece após seu clique — nunca automaticamente."
            : "Push não configurado nesta instalação. O botão fica disponível para quando as chaves forem configuradas."}
        </p>
        <Button size="sm" variant="outline" onClick={enablePush} disabled={pushBusy}>
          {pushBusy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Ativar notificações do navegador
        </Button>
        {pushMsg && <p className={cn("mt-1.5 text-[10px]", pushMsg.includes("ativad") ? "text-emerald-600" : "text-slate-500")}>{pushMsg}</p>}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-[10px] leading-relaxed text-slate-400">
          Desligar um canal impede novas comunicações não obrigatórias por ele. Alertas críticos operacionais nunca somem
          por preferência. Nenhuma preferência dá acesso a dados de outra conta.
        </p>
      </div>
    </div>
  );
}

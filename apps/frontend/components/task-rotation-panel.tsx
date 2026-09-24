import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Users, AlertTriangle, Clock, Settings2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useIsAdminMaster } from "@/hooks/use-is-admin-master";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// Situação do rodízio de ofertas de Nômade, para o responsável (Admin/Líder)
// entender por que ninguém assumiu e reiniciar quando houver candidatos de
// novo (ata 2026-08, bloco 4/5). Atualização localizada por poll curto — a
// tela da tarefa não é substituída por loader.

const POLL_MS = 10_000;

interface RotationOffer {
  id: string;
  nomade_name: string | null;
  rotation_order: number;
  rotation_round?: number;
  is_mandatory?: boolean;
  status: string;
  offered_at: string;
  expires_at: string;
  decline_reason: string | null;
  close_reason: string | null;
}
interface Rotation {
  phase: "atribuida" | "procurando" | "oferta_enviada" | "recusada" | "expirada" | "escalada" | "inativo";
  pending_offer: { id: string; nomade_id: string; rotation_order: number; expires_at: string } | null;
  counts: { offered: number; declined: number; expired: number; pending: number };
  offers: RotationOffer[];
  escalated: boolean;
}

const PHASE_LABEL: Record<Rotation["phase"], string> = {
  atribuida: "Nômade atribuído",
  procurando: "Procurando Nômade",
  oferta_enviada: "Oferta enviada — aguardando resposta",
  recusada: "Última oferta recusada",
  expirada: "Última oferta expirou",
  escalada: "Rodízio esgotado — escalado ao responsável",
  inativo: "Rodízio inativo",
};
const PHASE_TONE: Record<Rotation["phase"], string> = {
  atribuida: "text-emerald-600",
  procurando: "text-blue-600",
  oferta_enviada: "text-blue-600",
  recusada: "text-amber-600",
  expirada: "text-amber-600",
  escalada: "text-red-600",
  inativo: "text-slate-500",
};

export function TaskRotationPanel({ taskId, category, taskAutomaticEnabled = true, taskStatus = "AGUARDANDO_NOMADE" }: { taskId: string; category?: string | null; taskAutomaticEnabled?: boolean; taskStatus?: string }) {
  const isAdminMaster = useIsAdminMaster();
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [masterOpen, setMasterOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError(false);
      try {
        const r = (await apiClient.getTaskRotation(taskId)) as Rotation | null;
        setRotation(r);
      } catch {
        if (!opts.silent) setError(true);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    if (!isAdminMaster && taskStatus !== "AGUARDANDO_NOMADE") return;
    void load();
    pollRef.current = setInterval(() => void load({ silent: true }), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load, isAdminMaster, taskStatus]);

  async function confirmRestart() {
    setRestarting(true);
    try {
      await apiClient.restartTaskRotation(taskId);
      setFlash("Rodízio reiniciado.");
      setRestartOpen(false);
      await load({ silent: true });
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Não foi possível reiniciar o rodízio.");
    } finally {
      setRestarting(false);
      setTimeout(() => setFlash(null), 5000);
    }
  }

  if (!isAdminMaster && taskStatus !== "AGUARDANDO_NOMADE") return null;

  return (
    <div className="col-span-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Rodízio de Nômade
        </p>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      {loading && !rotation && <p className="text-xs text-slate-400">Carregando…</p>}
      {error && (
        <div className="text-xs text-red-500">
          Não foi possível carregar o rodízio.{" "}
          <button className="underline" onClick={() => void load()}>
            Tentar de novo
          </button>
        </div>
      )}

      {rotation && (
        <>
          <p className={cn("text-sm font-medium", PHASE_TONE[rotation.phase])}>{PHASE_LABEL[rotation.phase]}</p>

          {rotation.escalated && (
            <p className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Ninguém elegível/online assumiu. Você recebeu um alerta. Reinicie o rodízio quando houver candidatos —
              esconder o alerta não resolve.
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Avaliados: {rotation.counts.offered}</span>
            <span>Recusaram: {rotation.counts.declined}</span>
            <span>Expiraram: {rotation.counts.expired}</span>
          </div>

          {rotation.pending_offer && (
            <p className="text-xs text-blue-600 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Oferta {rotation.pending_offer.rotation_order} aguardando resposta até{" "}
              {new Date(rotation.pending_offer.expires_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {rotation.offers.length > 0 && (
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 max-h-32 overflow-y-auto">
              {rotation.offers.map((o) => (
                <li key={o.id}>
                  #{o.rotation_order} {o.nomade_name ?? o.id.slice(0, 6)} — <span className="font-medium">{o.status}</span>{o.is_mandatory ? " · obrigatória" : o.rotation_round ? ` · volta ${o.rotation_round}` : ""}
                  {o.decline_reason ? ` ("${o.decline_reason}")` : ""}
                </li>
              ))}
            </ul>
          )}

          {(rotation.phase === "escalada" || rotation.phase === "recusada" || rotation.phase === "expirada") && (
            <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => setRestartOpen(true)} disabled={restarting}>
              {restarting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Reiniciar rodízio
            </Button>
          )}

          {flash && <p className="text-xs text-slate-600 dark:text-slate-300">{flash}</p>}
          {isAdminMaster && (
            <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => setMasterOpen(true)}>
              <Settings2 className="h-3 w-3 mr-1" /> Controle do Admin Master
            </Button>
          )}
        </>
      )}

      <ConfirmationDialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        onConfirm={confirmRestart}
        title="Reiniciar o rodízio?"
        message="A plataforma vai oferecer a tarefa novamente, do começo, aos Nômades elegíveis e online. As ofertas anteriores são encerradas."
        confirmText="Reiniciar"
        destructive={false}
      />
      {isAdminMaster && <MasterRoutingDialog open={masterOpen} onOpenChange={setMasterOpen} taskId={taskId} category={category} taskAutomaticEnabled={taskAutomaticEnabled} onChanged={() => void load({ silent: true })} />}
    </div>
  );
}

function MasterRoutingDialog({ open, onOpenChange, taskId, category, taskAutomaticEnabled, onChanged }: { open: boolean; onOpenChange: (next: boolean) => void; taskId: string; category?: string | null; taskAutomaticEnabled: boolean; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [areaEnabled, setAreaEnabled] = useState(true);
  const [minutes, setMinutes] = useState("60");
  const [alertOnMandatoryDecline, setAlertOnMandatoryDecline] = useState(true);
  const [nomades, setNomades] = useState<Array<{ id: string; name: string; eligible: boolean }>>([]);
  const [selected, setSelected] = useState("");
  const [nomadQuery, setNomadQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visibleNomades = nomades
    .filter((nomade) => nomade.name.toLocaleLowerCase("pt-BR").includes(nomadQuery.trim().toLocaleLowerCase("pt-BR")))
    .slice(0, 12);
  const selectedNomade = nomades.find((nomade) => nomade.id === selected) ?? null;

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true); setError(null); setSelected(""); setNomadQuery("");
    setEnabled(taskAutomaticEnabled);
    Promise.all([apiClient.getTaskRoutingSettings(), apiClient.getTaskRoutingAreas(), apiClient.getTaskRoutingNomades(taskId)])
      .then(([settings, areas, list]) => {
        if (!live) return;
        setMinutes(String(settings.offer_timeout_minutes));
        setAlertOnMandatoryDecline(settings.mandatory_decline_alerts);
        setAreaEnabled(category ? (areas.find((a) => a.area === category)?.auto_nomad_dispatch_enabled ?? true) : true);
        setNomades(list);
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "Não foi possível carregar os controles."))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [open, taskId, category, taskAutomaticEnabled]);

  async function saveSettings() {
    const value = Number(minutes);
    if (!Number.isInteger(value) || value < 1 || value > 1440) { setError("Informe de 1 minuto a 24 horas."); return; }
    setSaving(true); setError(null);
    try {
      await Promise.all([
        apiClient.updateTaskRouting(taskId, enabled),
        apiClient.updateTaskRoutingSettings({ offer_timeout_minutes: value, mandatory_decline_alerts: alertOnMandatoryDecline }),
        category ? apiClient.updateTaskRoutingArea(category, areaEnabled) : Promise.resolve(),
      ]);
      onChanged();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Não foi possível salvar os controles."); }
    finally { setSaving(false); }
  }
  async function offer(direct: boolean) {
    if (!selected) { setError("Escolha um Nômade."); return; }
    setSaving(true); setError(null);
    try {
      if (direct) await apiClient.assignTaskNomadeDirectly(taskId, selected);
      else await apiClient.sendTaskManualOffer(taskId, selected);
      onChanged(); onOpenChange(false);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Não foi possível encaminhar a tarefa."); }
    finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-violet-600" /> Encaminhamento de Nômades</DialogTitle><DialogDescription className="text-xs">Defina o encaminhamento automático e a intervenção administrativa desta tarefa.</DialogDescription></DialogHeader>
      {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-violet-600" /></div> : <div className="space-y-4">
        <p className="text-xs text-slate-500">Controles administrativos. A plataforma ainda valida todas as permissões e a elegibilidade no servidor.</p>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"><span><b className="text-sm">Encaminhar esta tarefa automaticamente</b><small className="block text-xs text-slate-500 mt-0.5">Desligar não altera uma tarefa que já tenha responsável.</small></span><Switch checked={enabled} onCheckedChange={setEnabled} /></label>
        {category && <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"><span><b className="text-sm">Automático para a área “{category}”</b><small className="block text-xs text-slate-500 mt-0.5">Vale para novas ofertas desta área.</small></span><Switch checked={areaEnabled} onCheckedChange={setAreaEnabled} /></label>}
        <div className="rounded-xl border border-slate-200 p-3 space-y-2"><label className="text-sm font-semibold">Prazo para responder à oferta</label><div className="flex items-center gap-2"><Input type="number" min="1" max="1440" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-28" /><span className="text-sm text-slate-500">minutos</span></div><label className="flex items-center gap-2 text-xs text-slate-600"><Switch checked={alertOnMandatoryDecline} onCheckedChange={setAlertOnMandatoryDecline} /> Avisar responsáveis se uma oferta obrigatória for recusada</label></div>
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <label className="text-sm font-semibold" htmlFor={`nomad-search-${taskId}`}>Escolher Nômade manualmente</label>
          <Input id={`nomad-search-${taskId}`} value={nomadQuery} onChange={(e) => setNomadQuery(e.target.value)} placeholder="Pesquisar Nômade por nome…" />
          {selectedNomade && <p className={cn("rounded-md px-2.5 py-2 text-xs font-medium", selectedNomade.eligible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>Selecionado: {selectedNomade.name}{!selectedNomade.eligible && " — não habilitado para esta tarefa"}</p>}
          {nomadQuery.trim() && <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {visibleNomades.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">Nenhum Nômade encontrado.</p> : visibleNomades.map((n) => <button type="button" key={n.id} onClick={() => setSelected(n.id)} className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50", n.eligible ? "text-slate-800" : "text-red-700")}>{n.name}<span className="shrink-0 text-[11px]">{n.eligible ? "Habilitado" : "Não habilitado"}</span></button>)}
          </div>}
          <p className="text-xs text-slate-500">Pesquise para escolher. Nomes não habilitados aparecem em vermelho e continuam disponíveis apenas ao Admin Master. “Enviar oferta” mantém o aceite/recusa; “já aceitou” atribui diretamente.</p>
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={saving || !selected} onClick={() => void offer(false)}><Send className="h-3.5 w-3.5 mr-1" /> Enviar oferta</Button><Button size="sm" disabled={saving || !selected} onClick={() => void offer(true)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Já aceitou</Button></div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>}
      <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Fechar</Button><Button onClick={() => void saveSettings()} disabled={loading || saving}>{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Salvar controles</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

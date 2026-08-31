"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone, Radio, PanelTop, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Central Administrativa de Comunicação (ata 2026-08, bloco 5/5).
// Canais (auditoria) · Campanhas/reengajamento · Banners obrigatórios.
// Toda decisão crítica (público, ativação) é revalidada no servidor — esta
// tela nunca envia a lista de destinatários.

const CHANNELS = ["platform", "email", "whatsapp", "push"] as const;
const CHANNEL_LABEL: Record<string, string> = {
  platform: "Plataforma",
  email: "E-mail",
  whatsapp: "WhatsApp",
  push: "Web Push",
};
const PRINCIPALS = ["empresas", "agencias", "nomades"] as const;

const CAMPAIGN_STATUS_TONE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  scheduled: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  paused: "bg-orange-100 text-orange-700",
  cancelled: "bg-neutral-200 text-neutral-500",
  failed: "bg-red-100 text-red-700",
};

interface Campaign {
  id: string;
  internal_name: string;
  title: string;
  body: string;
  status: string;
  channels: string[];
  audience: Record<string, any>;
  is_reengagement: boolean;
  inactivity_days: number | null;
  link_url: string | null;
}

export default function AdminComunicacaoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Central de Comunicação</h1>
        <p className="text-sm text-neutral-500">
          Canais, campanhas de comunicação/reengajamento e banners obrigatórios. Alertas e notificações operacionais
          continuam em suas próprias telas.
        </p>
      </header>

      <Tabs defaultValue="campanhas">
        <TabsList>
          <TabsTrigger value="campanhas"><Megaphone className="mr-1.5 h-4 w-4" />Campanhas</TabsTrigger>
          <TabsTrigger value="banners"><PanelTop className="mr-1.5 h-4 w-4" />Banners</TabsTrigger>
          <TabsTrigger value="canais"><Radio className="mr-1.5 h-4 w-4" />Canais</TabsTrigger>
        </TabsList>
        <TabsContent value="campanhas"><CampaignsTab /></TabsContent>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="canais"><ChannelsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────── CANAIS ─────────────────────────────────
function ChannelsTab() {
  const [rows, setRows] = useState<Array<{ channel: string; state: string; detail: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient
      .getCommsChannelAudit()
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-neutral-500">
        O que funciona de verdade hoje. Canais "não configurado" capturam um preview local e nunca fingem entrega.
      </p>
      {rows.map((r) => (
        <div key={r.channel} className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div>
            <div className="font-medium">{CHANNEL_LABEL[r.channel] ?? r.channel}</div>
            <div className="text-sm text-neutral-500">{r.detail}</div>
          </div>
          <Badge className={r.state === "working" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}>
            {r.state === "working" ? "Funcionando" : "Não configurado"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────── CAMPANHAS ──────────────────────────────
function emptyCampaign(): Campaign {
  return {
    id: "",
    internal_name: "",
    title: "",
    body: "",
    status: "draft",
    channels: ["platform"],
    audience: { account_state: "active" },
    is_reengagement: false,
    inactivity_days: null,
    link_url: null,
  };
}

function CampaignsTab() {
  const [list, setList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    apiClient
      .listCommsCampaigns()
      .then((r) => setList(r.data as Campaign[]))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(reload, [reload]);

  async function act(id: string, fn: () => Promise<any>, label: string) {
    setMsg(null);
    try {
      await fn();
      setMsg(label);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "Falha na operação.");
    }
  }

  if (editing) {
    return (
      <CampaignForm
        campaign={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setEditing(emptyCampaign())}>Nova campanha</Button>
        <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {msg && <p className="text-sm text-blue-600">{msg}</p>}
      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty text="Nenhuma campanha ainda." />
      ) : (
        list.map((c) => (
          <div key={c.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-neutral-500">
                  {c.internal_name} · {c.channels.map((ch) => CHANNEL_LABEL[ch] ?? ch).join(", ")}
                  {c.is_reengagement ? " · reengajamento" : ""}
                </div>
              </div>
              <Badge className={CAMPAIGN_STATUS_TONE[c.status] ?? "bg-neutral-100"}>{c.status}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["draft", "scheduled", "paused"].includes(c.status) && (
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Editar</Button>
              )}
              {["draft", "scheduled", "paused"].includes(c.status) && (
                <Button size="sm" onClick={() => act(c.id, () => apiClient.activateCommsCampaign(c.id), "Campanha ativada.")}>
                  Ativar
                </Button>
              )}
              {["scheduled", "processing"].includes(c.status) && (
                <Button size="sm" variant="outline" onClick={() => act(c.id, () => apiClient.pauseCommsCampaign(c.id), "Campanha pausada.")}>
                  Pausar
                </Button>
              )}
              {!["completed", "cancelled"].includes(c.status) && (
                <Button size="sm" variant="ghost" onClick={() => act(c.id, () => apiClient.cancelCommsCampaign(c.id), "Campanha cancelada.")}>
                  Cancelar
                </Button>
              )}
              <CampaignDeliveries id={c.id} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CampaignDeliveries({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (open && !data) apiClient.getCommsCampaignDeliveries(id).then(setData).catch(() => setData({ error: true }));
  }, [open, data, id]);
  return (
    <div className="w-full">
      <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
        {open ? "Ocultar métricas" : "Métricas"}
      </Button>
      {open && (
        <div className="mt-2 rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-800">
          {!data ? (
            "Carregando…"
          ) : data.error ? (
            "Não foi possível carregar."
          ) : (
            <>
              <div className="mb-1 font-medium">Entregas por canal/situação (situação real da outbox — "entregue" ≠ "na fila")</div>
              <ul>
                {data.by_channel_status.map((g: any, i: number) => (
                  <li key={i}>
                    {CHANNEL_LABEL[g.channel] ?? g.channel}: {g.status} — {g.count}
                  </li>
                ))}
              </ul>
              {data.failures_sample?.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">Falhas / não configurado (preview, sem segredo):</div>
                  <ul>
                    {data.failures_sample.slice(0, 8).map((f: any) => (
                      <li key={f.id}>
                        {CHANNEL_LABEL[f.channel] ?? f.channel}: {f.status} — {f.failure_summary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignForm({ campaign, onClose, onSaved }: { campaign: Campaign; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<Campaign>(campaign);
  const [estimate, setEstimate] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = !c.id;

  const audiencePayload = useMemo(
    () => ({
      principal_types: c.audience.principal_types,
      account_state: c.audience.account_state ?? "any",
      last_access_days: c.audience.last_access_days || undefined,
      only_partners: c.audience.only_partners || undefined,
      environment: c.audience.environment || undefined,
    }),
    [c.audience],
  );

  async function runEstimate() {
    setErr(null);
    try {
      const e = await apiClient.estimateCommsAudience({
        audience: audiencePayload,
        channels: c.channels,
        is_reengagement: c.is_reengagement,
      });
      setEstimate(e);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao estimar público.");
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    const body = {
      internal_name: c.internal_name,
      title: c.title,
      body: c.body,
      link_url: c.link_url || null,
      channels: c.channels,
      audience: audiencePayload,
      is_reengagement: c.is_reengagement,
      inactivity_days: c.inactivity_days || null,
    };
    try {
      if (isNew) await apiClient.createCommsCampaign(body);
      else await apiClient.updateCommsCampaign(c.id, body);
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-semibold">{isNew ? "Nova campanha" : "Editar campanha"}</h2>
      <Field label="Nome interno">
        <Input value={c.internal_name} onChange={(e) => setC({ ...c, internal_name: e.target.value })} />
      </Field>
      <Field label="Título">
        <Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
      </Field>
      <Field label="Mensagem">
        <Textarea rows={4} value={c.body} onChange={(e) => setC({ ...c, body: e.target.value })} />
      </Field>
      <Field label="Link (opcional)">
        <Input value={c.link_url ?? ""} placeholder="https://…" onChange={(e) => setC({ ...c, link_url: e.target.value })} />
      </Field>

      <Field label="Canais">
        <div className="flex flex-wrap gap-3">
          {CHANNELS.map((ch) => (
            <label key={ch} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={c.channels.includes(ch)}
                onCheckedChange={(v) =>
                  setC({ ...c, channels: v ? [...c.channels, ch] : c.channels.filter((x) => x !== ch) })
                }
              />
              {CHANNEL_LABEL[ch]}
            </label>
          ))}
        </div>
      </Field>

      <fieldset className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Público</legend>
        <Field label="Tipo principal">
          <div className="flex flex-wrap gap-3">
            {PRINCIPALS.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm capitalize">
                <Checkbox
                  checked={(c.audience.principal_types ?? []).includes(p)}
                  onCheckedChange={(v) => {
                    const cur: string[] = c.audience.principal_types ?? [];
                    setC({
                      ...c,
                      audience: { ...c.audience, principal_types: v ? [...cur, p] : cur.filter((x) => x !== p) },
                    });
                  }}
                />
                {p}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Situação da conta">
          <select
            className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
            value={c.audience.account_state ?? "any"}
            onChange={(e) => setC({ ...c, audience: { ...c.audience, account_state: e.target.value } })}
          >
            <option value="any">Qualquer</option>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
          </select>
        </Field>
        <Field label="Sem acesso há (dias) — 0 ignora">
          <Input
            type="number"
            value={c.audience.last_access_days ?? ""}
            onChange={(e) => setC({ ...c, audience: { ...c.audience, last_access_days: Number(e.target.value) || undefined } })}
          />
        </Field>
        <Field label="Ambiente (guarda)">
          <select
            className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
            value={c.audience.environment ?? ""}
            onChange={(e) => setC({ ...c, audience: { ...c.audience, environment: e.target.value || undefined } })}
          >
            <option value="">Qualquer</option>
            <option value="local">local</option>
            <option value="qa">qa</option>
            <option value="production">production</option>
          </select>
        </Field>
        <label className="flex items-center gap-1.5 text-sm">
          <Checkbox
            checked={c.is_reengagement}
            onCheckedChange={(v) => setC({ ...c, is_reengagement: !!v })}
          />
          Campanha de reengajamento (exige opt-in de marketing do usuário)
        </label>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={runEstimate}>Estimar público</Button>
        {estimate && (
          <span className="text-xs text-neutral-600">
            ~{estimate.estimated} no filtro · {estimate.without_consent} sem consentimento ·{" "}
            {estimate.without_contact} sem contato · {estimate.possible_deliveries} entregas possíveis
            {!estimate.environment_ok && " · ⚠ ambiente diferente"}
          </span>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
      <p className="text-xs text-neutral-400">
        Ao ativar, o servidor recalcula o público a partir deste registro (a lista de pessoas nunca sai daqui) e cria as
        entregas de forma idempotente.
      </p>
    </div>
  );
}

// ─────────────────────────────── BANNERS ────────────────────────────────
function emptyBanner() {
  return {
    id: "",
    title: "",
    body: "",
    kind: "obrigatorio" as "obrigatorio" | "informativo",
    ack_button_label: "Li e estou ciente",
    link_url: "",
    audience: { account_state: "active" } as Record<string, any>,
    starts_at: "",
    ends_at: "",
    is_active: true,
    version: 1,
  };
}

function BannersTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    apiClient
      .listMandatoryBanners()
      .then((r) => setList(r.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(reload, [reload]);

  async function act(fn: () => Promise<any>, label: string) {
    setMsg(null);
    try {
      await fn();
      setMsg(label);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "Falha.");
    }
  }

  if (editing) {
    return <BannerForm banner={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />;
  }

  return (
    <div className="mt-4 space-y-3">
      <Button size="sm" onClick={() => setEditing(emptyBanner())}>Novo banner</Button>
      {msg && <p className="text-sm text-blue-600">{msg}</p>}
      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty text="Nenhum banner ainda." />
      ) : (
        list.map((b) => (
          <div key={b.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{b.title}</div>
                <div className="text-xs text-neutral-500">
                  {b.kind} · v{b.version} · {b.acknowledgement_count ?? 0} ciências
                  {b.is_cancelled ? " · cancelado" : b.is_active ? "" : " · inativo"}
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(b)}>Editar</Button>
              <Button size="sm" variant="outline" onClick={() => act(() => apiClient.publishBannerVersion(b.id), "Nova versão publicada — exige nova ciência.")}>
                Publicar nova versão
              </Button>
              {!b.is_cancelled && (
                <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.cancelMandatoryBanner(b.id), "Banner cancelado.")}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function BannerForm({ banner, onClose, onSaved }: { banner: any; onClose: () => void; onSaved: () => void }) {
  const [b, setB] = useState<any>({ ...emptyBanner(), ...banner });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = !b.id;

  async function save() {
    setSaving(true);
    setErr(null);
    const body: Record<string, any> = {
      title: b.title,
      body: b.body,
      kind: b.kind,
      ack_button_label: b.ack_button_label || "Li e estou ciente",
      link_url: b.link_url || null,
      audience: {
        principal_types: b.audience.principal_types,
        account_state: b.audience.account_state ?? "any",
      },
      is_active: b.is_active,
    };
    if (b.starts_at) body.starts_at = new Date(b.starts_at).toISOString();
    if (b.ends_at) body.ends_at = new Date(b.ends_at).toISOString();
    try {
      if (isNew) await apiClient.createMandatoryBanner(body);
      else await apiClient.updateMandatoryBanner(b.id, body);
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-semibold">{isNew ? "Novo banner" : "Editar banner"}</h2>
      <Field label="Título">
        <Input value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} />
      </Field>
      <Field label="Mensagem">
        <Textarea rows={4} value={b.body} onChange={(e) => setB({ ...b, body: e.target.value })} />
      </Field>
      <Field label="Tipo">
        <select
          className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
          value={b.kind}
          onChange={(e) => setB({ ...b, kind: e.target.value })}
        >
          <option value="obrigatorio">Obrigatório (exige ciência; Esc/clique-fora não fecham)</option>
          <option value="informativo">Informativo (pode fechar)</option>
        </select>
      </Field>
      <Field label="Texto do botão de ciência">
        <Input value={b.ack_button_label} onChange={(e) => setB({ ...b, ack_button_label: e.target.value })} />
      </Field>
      <Field label="Link (opcional)">
        <Input value={b.link_url ?? ""} onChange={(e) => setB({ ...b, link_url: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início">
          <Input type="datetime-local" value={b.starts_at} onChange={(e) => setB({ ...b, starts_at: e.target.value })} />
        </Field>
        <Field label="Expiração (opcional)">
          <Input type="datetime-local" value={b.ends_at} onChange={(e) => setB({ ...b, ends_at: e.target.value })} />
        </Field>
      </div>
      <Field label="Público — tipo principal">
        <div className="flex flex-wrap gap-3">
          {PRINCIPALS.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-sm capitalize">
              <Checkbox
                checked={(b.audience.principal_types ?? []).includes(p)}
                onCheckedChange={(v) => {
                  const cur: string[] = b.audience.principal_types ?? [];
                  setB({ ...b, audience: { ...b.audience, principal_types: v ? [...cur, p] : cur.filter((x) => x !== p) } });
                }}
              />
              {p}
            </label>
          ))}
        </div>
      </Field>
      <p className="text-xs text-neutral-400">
        Imagem recomendada: 1200 × 200 px (mesmo padrão seguro dos Alertas). A ciência do banner NÃO é aceite jurídico
        de termos.
      </p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────── helpers ────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
      {children}
    </label>
  );
}
function Loading() {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-neutral-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-neutral-400">{text}</p>;
}

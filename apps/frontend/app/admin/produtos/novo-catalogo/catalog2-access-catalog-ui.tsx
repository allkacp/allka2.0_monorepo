"use client";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildProductRequirementBody } from "./catalog2-connections-ui";

// Catálogo de tipos de acesso (2026-10-06): escolher um acesso para o produto, CRIAR tipos novos (ex.: Tray) com os campos que o cliente preenche
// e/ou liberação por API, e (Admin Master) excluir. Tudo fica salvo no catálogo global para os outros produtos.
type Act = (fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) => Promise<any>;
export type FieldType = "text" | "secret" | "url" | "email" | "number" | "textarea";
export interface FieldDraft { key: string; label: string; type: FieldType; required: boolean; help: string }
export const FIELD_TYPE_LABEL: Record<FieldType, string> = { text: "Texto", secret: "Segredo (cofre cifrado)", url: "Endereço (URL)", email: "E-mail", number: "Número", textarea: "Texto longo" };
const SECRET_LIKE = /(senha|password|passwd|secret|token|api[_-]?key|credencial|authorization)/i;
const SEL = "h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900";
const DEFAULT_LEVELS = [{ key: "read", label: "Somente leitura" }, { key: "read_write", label: "Leitura e edição" }, { key: "admin", label: "Administrador" }];

export const slugKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

/** Resumo legível de um tipo: como o cliente fornece e o que precisa informar. */
export function typeSummary(t: any, methodLabel: (k: string) => string) {
  const fields: any[] = t.fields ?? [];
  return {
    how: (t.allowed_methods ?? []).map(methodLabel).join(", ") || "—",
    needs: fields.length ? fields.map((f) => `${f.label}${f.required ? "*" : ""}`).join(", ") : "identificação da conta (padrão)",
    levels: (t.permission_levels ?? []).map((l: any) => l.label).join(", ") || "—",
  };
}

function TypeForm({ initial, vocab, onCancel, onSaved }: { initial: any | null; vocab: any; onCancel: () => void; onSaved: () => void }) {
  const editing = !!initial;
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [key, setKey] = useState<string>(initial?.key ?? "");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [instructions, setInstructions] = useState<string>(initial?.default_instructions ?? "");
  const [methods, setMethods] = useState<string[]>(initial?.allowed_methods ?? []);
  const [levels, setLevels] = useState<{ key: string; label: string }[]>(initial?.permission_levels?.length ? initial.permission_levels : DEFAULT_LEVELS);
  const [fields, setFields] = useState<FieldDraft[]>((initial?.fields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type, required: !!f.required, help: f.help ?? "" })));
  const [active, setActive] = useState<boolean>(initial?.is_active !== false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const methodList: { key: string; label: string }[] = vocab?.methods ?? [];
  const toggleMethod = (k: string) => setMethods((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  const addField = (label: string, type: FieldType, required = true) => setFields((f) => [...f, { key: slugKey(label), label, type, required, help: "" }]);
  const valid = name.trim().length >= 2 && /^[a-z0-9_]{2,60}$/.test(key) && methods.length > 0 && levels.length > 0 && levels.every((l) => l.label.trim() && l.key) && fields.every((f) => f.label.trim() && /^[a-z0-9_]{2,40}$/.test(f.key));
  const save = async () => {
    setBusy(true); setErr(null);
    const body = {
      name: name.trim(), description: description.trim() || null, default_instructions: instructions.trim() || null, allowed_methods: methods,
      permission_levels: levels.map((l) => ({ key: l.key, label: l.label.trim() })), is_active: active,
      fields: fields.map((f) => ({ key: f.key, label: f.label.trim(), type: f.type, required: f.required, help: f.help.trim() || null })),
    };
    try {
      if (editing) await apiClient.updateConnectionType(initial.id, body); else await apiClient.createConnectionType({ ...body, key });
      onSaved();
    } catch (e: any) { setErr(e?.message ?? "Não foi possível salvar o tipo de acesso."); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 text-xs" data-testid="access-type-form">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block font-semibold text-slate-600 dark:text-slate-300">Nome do acesso
          <Input aria-label="Nome do acesso" className="mt-0.5 h-8 text-xs" value={name} placeholder="Ex.: Tray (loja virtual)" onChange={(e) => { setName(e.target.value); if (!editing && !keyTouched) setKey(slugKey(e.target.value)); }} />
        </label>
        <label className="block font-semibold text-slate-600 dark:text-slate-300">Identificador (não muda depois)
          <Input aria-label="Identificador do acesso" className="mt-0.5 h-8 text-xs" value={key} disabled={editing} onChange={(e) => { setKeyTouched(true); setKey(slugKey(e.target.value)); }} />
        </label>
      </div>
      <label className="block font-semibold text-slate-600 dark:text-slate-300">Descrição (opcional)
        <Input aria-label="Descrição do acesso" className="mt-0.5 h-8 text-xs" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <fieldset className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        <legend className="px-1 font-semibold text-slate-700 dark:text-slate-200">Como o cliente pode liberar este acesso</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">{methodList.map((m) => <label key={m.key} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={methods.includes(m.key)} onChange={() => toggleMethod(m.key)} />{m.label}</label>)}</div>
        <p className="mt-1 text-[11px] text-slate-500">Para liberar por API, marque "Chave de API / integração por API" e, abaixo, cadastre os campos da API (chave, URL…).</p>
      </fieldset>
      <fieldset className="rounded-lg border border-slate-200 p-2 dark:border-slate-700" data-testid="type-fields">
        <legend className="px-1 font-semibold text-slate-700 dark:text-slate-200">O que o cliente precisa informar</legend>
        {fields.length === 0 && <p className="text-[11px] text-slate-500">Nenhum campo extra: o cliente informa só a identificação da conta (padrão). Adicione campos se precisar de algo específico.</p>}
        <ul className="space-y-1.5">
          {fields.map((f, i) => (
            <li key={i} className="grid items-center gap-1.5 sm:grid-cols-[1.4fr_1fr_auto_1.6fr_auto]">
              <Input aria-label={`Nome do campo ${i + 1}`} className="h-8 text-xs" placeholder="Ex.: ID da loja" value={f.label} onChange={(e) => { const label = e.target.value; setFields((cur) => cur.map((x, j) => (j === i ? { ...x, label, key: slugKey(label), type: x.type === "text" && SECRET_LIKE.test(label) ? "secret" : x.type } : x))); }} />
              <select aria-label={`Tipo do campo ${i + 1}`} className={SEL} value={f.type} onChange={(e) => setFields((cur) => cur.map((x, j) => (j === i ? { ...x, type: e.target.value as FieldType } : x)))}>{(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}</select>
              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.required} onChange={(e) => setFields((cur) => cur.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} />obrigatório</label>
              <Input aria-label={`Ajuda do campo ${i + 1}`} className="h-8 text-xs" placeholder="Dica para o cliente (opcional)" value={f.help} onChange={(e) => setFields((cur) => cur.map((x, j) => (j === i ? { ...x, help: e.target.value } : x)))} />
              <button type="button" aria-label={`Remover campo ${i + 1}`} className="text-red-500" onClick={() => setFields((cur) => cur.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addField("", "text")}><Plus className="mr-1 h-3 w-3" />Campo</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addField("Chave de API", "secret")}><KeyRound className="mr-1 h-3 w-3" />Chave de API</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addField("Endereço da API (URL)", "url")}>URL da API</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addField("Usuário", "text")}>Usuário</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addField("ID da conta / loja", "text")}>ID da conta</Button>
        </div>
        <p className="mt-1 text-[11px] text-amber-800">Campos do tipo "Segredo" ficam cifrados em cofre e nunca são mostrados de novo. Nunca peça a senha principal do cliente.</p>
      </fieldset>
      <fieldset className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        <legend className="px-1 font-semibold text-slate-700 dark:text-slate-200">Níveis de permissão que o cliente pode conceder</legend>
        <ul className="space-y-1">
          {levels.map((l, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <Input aria-label={`Nível de permissão ${i + 1}`} className="h-8 flex-1 text-xs" value={l.label} onChange={(e) => setLevels((cur) => cur.map((x, j) => (j === i ? { label: e.target.value, key: (editing && initial?.permission_levels?.[j]?.key) || slugKey(e.target.value) || `nivel_${j + 1}` } : x)))} />
              {levels.length > 1 && <button type="button" aria-label={`Remover nível ${i + 1}`} className="text-red-500" onClick={() => setLevels((cur) => cur.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>}
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="outline" className="mt-1 h-7 px-2 text-[11px]" onClick={() => setLevels((cur) => [...cur, { key: `nivel_${cur.length + 1}`, label: "" }])}><Plus className="mr-1 h-3 w-3" />Nível</Button>
      </fieldset>
      <label className="block font-semibold text-slate-600 dark:text-slate-300">Instruções para o cliente (opcional)
        <textarea aria-label="Instruções do acesso" rows={3} className="mt-0.5 w-full rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Passo a passo para o cliente liberar este acesso." />
      </label>
      {editing && <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />Tipo ativo (desmarque para esconder sem excluir)</label>}
      {err && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-red-700">{err}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!valid || busy} onClick={() => void save()} data-testid="save-access-type">{editing ? "Salvar alterações" : "Criar tipo de acesso"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

const PROVIDER_TONE: Record<string, string> = { google: "bg-blue-50 text-blue-700", meta: "bg-indigo-50 text-indigo-700" };
const FILTERS = [["all", "Todos"], ["available", "Disponíveis"], ["in_product", "No produto"], ["inactive", "Inativos"]] as const;

function Pill({ children, tone = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", title }: { children: React.ReactNode; tone?: string; title?: string }) {
  return <span title={title} className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>{children}</span>;
}

export function AccessCatalogDialog({ open, onOpenChange, version, readOnly, act }: { open: boolean; onOpenChange: (v: boolean) => void; version: any; readOnly: boolean; act: Act }) {
  const [types, setTypes] = useState<any[]>([]);
  const [vocab, setVocab] = useState<any>(null);
  const [view, setView] = useState<{ form: true; type: any | null } | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => Promise.all([apiClient.getConnectionTypes(true), apiClient.getConnectionVocabulary()]).then(([t, v]) => { setTypes(t.data); setVocab(v); }).catch(() => {});
  useEffect(() => { if (open) { setView(null); setMsg(null); void load(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const methodLabel = (k: string) => vocab?.methods?.find((m: any) => m.key === k)?.label ?? k;
  const inProduct = new Set<number>((version.connection_requirements ?? []).map((r: any) => r.connection_type?.id));
  const shown = useMemo(() => types.filter((t) => {
    if (!`${t.name} ${t.provider ?? ""} ${t.key} ${t.description ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (filter === "available") return t.is_active && !inProduct.has(t.id);
    if (filter === "in_product") return inProduct.has(t.id);
    if (filter === "inactive") return !t.is_active;
    return true;
  }), [types, q, filter, version.connection_requirements]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = async (t: any) => {
    setMsg(null);
    try {
      await act(async () => {
        if (!version.requires_connections) await apiClient.setVersionConnectionsModule(version.id, true);
        return apiClient.saveConnectionRequirement(version.id, `${t.key}_${Date.now().toString(36)}`, buildProductRequirementBody(version, t));
      }, `"${t.name}" adicionado aos acessos do produto.`, { rethrow: true });
      setMsg({ ok: true, text: `"${t.name}" adicionado ao produto. Ajuste os detalhes na lista de acessos, abaixo.` });
    } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível adicionar." }); }
  };
  const remove = async (t: any) => {
    if (!window.confirm(`Excluir o tipo de acesso "${t.name}" do catálogo? Só é possível se nenhum produto, projeto ou cliente o usa. Isso vale para todos os produtos.`)) return;
    setMsg(null);
    try { await apiClient.deleteConnectionType(t.id); setMsg({ ok: true, text: `"${t.name}" excluído do catálogo.` }); await load(); }
    catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível excluir." }); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl" data-testid="access-catalog-dialog">
        <div className="border-b border-slate-200 px-5 pb-3 pt-4 dark:border-slate-800">
          <DialogTitle className="text-base">{view ? (view.type ? `Editar tipo de acesso — ${view.type.name}` : "Novo tipo de acesso") : "Adicionar acesso ao produto"}</DialogTitle>
          {!view && (
            <>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Escolha um acesso do catálogo para este produto ou crie um tipo novo (uma plataforma que ainda não existe). O que você criar fica salvo e vale para os outros produtos.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input aria-label="Buscar acesso" className="h-9 pl-8 text-xs" placeholder="Buscar acesso (Google Ads, CRM, Tray…)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <div className="flex gap-1" role="group" aria-label="Filtrar acessos">
                  {FILTERS.map(([k, l]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${filter === k ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{l}</button>)}
                </div>
                {!readOnly && <Button type="button" size="sm" className="h-9 bg-gradient-to-r from-violet-700 to-fuchsia-600" onClick={() => setView({ form: true, type: null })} data-testid="new-access-type"><Plus className="mr-1.5 h-4 w-4" />Criar novo tipo de acesso</Button>}
              </div>
              {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
            </>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4 dark:bg-slate-950/40">
          {view ? (
            <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <TypeForm initial={view.type} vocab={vocab} onCancel={() => setView(null)} onSaved={() => { setView(null); setMsg({ ok: true, text: "Tipo de acesso salvo no catálogo (vale para todos os produtos)." }); void load(); }} />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((t) => {
                const fields: any[] = t.fields ?? [];
                const mine = inProduct.has(t.id);
                return (
                  <li key={t.id} className={`flex flex-col rounded-xl border bg-white p-3 text-xs shadow-sm dark:bg-slate-900 ${mine ? "border-emerald-300" : "border-slate-200 dark:border-slate-700"} ${t.is_active ? "" : "opacity-70"}`} data-testid={`access-type-${t.key}`}>
                    <div className="flex items-start gap-2">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${PROVIDER_TONE[t.provider ?? ""] ?? "bg-violet-50 text-violet-700"}`}>{(t.name as string).slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100" title={t.name}>{t.name}</p>
                        <p className="line-clamp-2 min-h-[2rem] text-[11px] text-slate-500" title={t.description ?? ""}>{t.description || "Sem descrição."}</p>
                      </div>
                      {mine && <Pill tone="bg-emerald-100 text-emerald-800">no produto</Pill>}
                      {!t.is_active && <Pill>inativo</Pill>}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Como o cliente libera</p><div className="mt-0.5 flex flex-wrap gap-1">{(t.allowed_methods ?? []).map((m: string) => <Pill key={m} tone={m === "api_key" ? "bg-fuchsia-100 text-fuchsia-800" : undefined}>{methodLabel(m)}</Pill>)}</div></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">O cliente informa</p><div className="mt-0.5 flex flex-wrap gap-1">{fields.length ? fields.map((f) => <Pill key={f.key} tone="bg-sky-50 text-sky-800" title={f.help ?? undefined}>{f.type === "secret" ? "🔒 " : ""}{f.label}{f.required ? " *" : ""}</Pill>) : <Pill>identificação da conta</Pill>}</div></div>
                      <p className="text-[11px] text-slate-500"><span className="font-semibold">Permissões:</span> {(t.permission_levels ?? []).map((l: any) => l.label).join(" · ") || "—"}</p>
                    </div>
                    {!readOnly && (
                      <div className="mt-auto flex items-center gap-1.5 pt-3">
                        <Button type="button" size="sm" className="h-8 flex-1 text-xs" disabled={!t.is_active || mine} onClick={() => void add(t)}><Plus className="mr-1 h-3.5 w-3.5" />{mine ? "Já adicionado" : "Adicionar ao produto"}</Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Editar este tipo de acesso" aria-label={`Editar ${t.name}`} onClick={() => setView({ form: true, type: t })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" title="Excluir do catálogo (só Admin Master; só se ninguém usa)" aria-label={`Excluir ${t.name}`} onClick={() => void remove(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </li>
                );
              })}
              {shown.length === 0 && <li className="col-span-full rounded-lg bg-white p-6 text-center text-xs text-slate-500">Nenhum acesso neste filtro. Use "Criar novo tipo de acesso".</li>}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

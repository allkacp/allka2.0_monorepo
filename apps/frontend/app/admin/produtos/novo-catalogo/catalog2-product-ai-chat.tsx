"use client";

// P-8 (reunião 07/10): a IA conversa com o administrador e preenche o produto inteiro. Só PROPÕE um rascunho; nada é salvo até clicar em "Aplicar no produto".
import { useEffect, useState } from "react";
import { Check, ChevronRight, CircleHelp, Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FramedModal } from "@/components/framed-panel";
import type { ReactNode } from "react";
import { AI_COMMERCIAL_FIELDS, AI_PERMISSION_CONTEXT, hasAiInput, productAiInventory, type AiCommercialKey } from "./product-ai-inventory";

export interface AiProductDraft extends Partial<Record<AiCommercialKey, string>> {
  title: string; summary: string; full_description: string;
  included_items: string[]; excluded_items: string[]; client_requirements: string[]; deliverables_summary: string[];
  suggested_tasks: { name: string; objective: string; steps: { name: string; description: string; completion_criteria: string }[] }[];
}
type Msg = { role: "user" | "assistant"; text: string };

/** Só aplica o que a IA trouxe (lista vazia não apaga o que já existe no produto). */
/**
 * R21-14: com `onlyEmpty` (produto já preenchido/publicado) a IA só COMPLETA o que está vazio — textos e listas que já têm conteúdo ficam como estão.
 */
export function draftToVersionPatch(d: AiProductDraft, current: { title?: string; summary?: string; full_description?: string }, onlyEmpty = false, currentLists: { included_items?: unknown[] | null; excluded_items?: unknown[] | null; client_requirements?: unknown[] | null; deliverables_summary?: unknown[] | null } & Partial<Record<AiCommercialKey, string | null>> = {}) {
  const text = (ai: string, cur?: string) => (onlyEmpty && (cur ?? "").trim() ? cur! : ai || cur || "");
  const list = (key: "included_items" | "excluded_items" | "client_requirements" | "deliverables_summary", ai: string[]) => (ai.length && !(onlyEmpty && (currentLists[key] ?? []).length > 0) ? { [key]: ai } : {});
  return {
    title: text(d.title, current.title), summary: text(d.summary, current.summary), full_description: text(d.full_description, current.full_description),
    ...list("included_items", d.included_items), ...list("excluded_items", d.excluded_items),
    ...list("client_requirements", d.client_requirements), ...list("deliverables_summary", d.deliverables_summary),
    ...Object.fromEntries(AI_COMMERCIAL_FIELDS.filter(([key]) => !!d[key]?.trim() && !(onlyEmpty && currentLists[key]?.trim())).map(([key]) => [key, d[key]])),
  } as { title: string; summary: string; full_description: string; included_items?: string[]; excluded_items?: string[]; client_requirements?: string[]; deliverables_summary?: string[] } & Partial<Record<AiCommercialKey, string>>;
}

const MAX_ATTACH_CHARS = 20000;
/** Texto de um anexo (.txt/.md/.csv/.json) já pronto para entrar na conversa, com limite de tamanho. */
export function attachmentToMessage(name: string, content: string): string {
  const body = content.length > MAX_ATTACH_CHARS ? `${content.slice(0, MAX_ATTACH_CHARS)}\n[…anexo cortado: passou de 20.000 caracteres]` : content;
  return `[Anexo: ${name}]\n${body}`;
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p><ul className="ml-4 list-disc text-xs">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>;
}

const FIELD_GROUPS = [
  { name: "Identificação e descrição", fields: ["Título comercial", "Descrição curta", "Descrição completa"] },
  { name: "Apresentação comercial", fields: ["Público-alvo", "Objetivo / promessa", "Escopo", "Informações do cliente", "Aviso de resultados", "Política de alterações", "Observações internas", "Itens incluídos", "Itens não incluídos", "Requisitos do cliente", "Resumo comercial dos entregáveis"] },
];
function AiInventoryColumn({ items, available = false }: { items: string[]; available?: boolean }) {
  const groups = [...FIELD_GROUPS, { name: "Configuração do produto", fields: items.filter(item => !FIELD_GROUPS.some(group => group.fields.includes(item))) }];
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-2 flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700">{available ? <Sparkles className="h-4 w-4" /> : <Check className="h-4 w-4" />}</span>
      <h3 className="flex-1 text-xs font-bold text-slate-900 dark:text-slate-100">{available ? "A IA pode completar" : "Já informado no cadastro"}</h3>
      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{items.length}</span>
    </div>
    <div data-testid={available ? "ai-available-fields" : "ai-filled-fields"} className="space-y-2">
      {!items.length ? <p className="text-xs leading-relaxed text-slate-500">{available ? "Nenhum campo vazio. Use a conversa abaixo para pedir ajustes nos textos existentes." : "Nenhum campo informado ainda."}</p> : groups.map(group => {
        const fields = group.fields.filter(field => items.includes(field));
        if (!fields.length) return null;
        return <div key={group.name}><h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{group.name}</h4><ul aria-label={group.name} className="flex flex-wrap gap-1.5">{fields.map(field => <li key={field} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] leading-snug ${available ? "border-violet-200 bg-violet-50 text-violet-900" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{field}</li>)}</ul></div>;
      })}
    </div>
  </section>;
}
function ProductAiWindow({ framed, open, onOpenChange, children }: { framed: boolean; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  if (framed) return <FramedModal open={open} onOpenChange={onOpenChange} testId="product-ai-chat">{children}</FramedModal>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[90vh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl" data-testid="product-ai-chat">{children}</DialogContent></Dialog>;
}

/** R21-18: guias e métodos que a IA consulta ao preencher qualquer produto (texto colado ou arquivo .txt/.md). */
export function AiGuidesPanel({ readOnly }: { readOnly?: boolean }) {
  const [guides, setGuides] = useState<{ id: string; title: string; content: string; is_active: boolean }[]>([]);
  const [title, setTitle] = useState(""); const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const load = async () => { try { const r = await apiClient.listCatalog2AiGuides(); setGuides(r?.guides ?? []); } catch (e: any) { setErr(e?.message ?? "Não foi possível carregar os guias."); } };
  useEffect(() => { void load(); }, []);
  async function run(fn: () => Promise<unknown>) { setBusy(true); setErr(null); try { await fn(); await load(); } catch (e: any) { setErr(e?.message ?? "Não foi possível salvar."); } finally { setBusy(false); } }
  async function pick(files: FileList | null) {
    const file = files?.[0]; if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) { setErr("Anexe um arquivo .txt ou .md (para Word/PDF, copie o texto e cole aqui)."); return; }
    setContent(await file.text()); if (!title.trim()) setTitle(file.name.replace(/\.(txt|md)$/i, ""));
  }
  return (
    <details className="rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-900" data-testid="ai-guides">
      <summary className="cursor-pointer select-none px-3 py-2 font-semibold">Guias e métodos que a IA consulta ({guides.filter((g) => g.is_active).length} ativo(s))</summary>
      <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <p className="text-[11px] text-slate-500">Cole ou anexe instruções de preenchimento (ex.: método PLA, padrões de escrita). A IA segue os guias <strong>ativos</strong> sempre que preencher um produto.</p>
        {guides.length === 0 ? <p className="text-slate-400">Nenhum guia cadastrado ainda.</p> : (
          <ul className="space-y-1" data-testid="ai-guides-list">
            {guides.map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded border border-slate-100 px-2 py-1 dark:border-slate-800">
                <input type="checkbox" aria-label={`Guia ativo: ${g.title}`} checked={g.is_active} disabled={readOnly || busy} onChange={(e) => void run(() => apiClient.updateCatalog2AiGuide(g.id, { is_active: e.target.checked }))} />
                <span className="min-w-0 flex-1 truncate font-semibold" title={g.content.slice(0, 300)}>{g.title}</span>
                <span className="text-[10px] text-slate-400">{g.content.length.toLocaleString("pt-BR")} caracteres</span>
                {!readOnly && <button type="button" className="text-[11px] font-semibold text-rose-600" disabled={busy} onClick={() => { if (window.confirm(`Apagar o guia “${g.title}”?`)) void run(() => apiClient.deleteCatalog2AiGuide(g.id)); }}>Apagar</button>}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <div className="space-y-1.5 rounded border border-dashed border-slate-300 p-2 dark:border-slate-700">
            <input aria-label="Título do guia" data-testid="ai-guide-title" className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Título (ex.: Método PLA)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea aria-label="Texto do guia" data-testid="ai-guide-content" rows={4} className="w-full rounded-md border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Cole aqui o texto do guia…" value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-semibold dark:border-slate-700"><Paperclip className="h-3 w-3" />Anexar .txt/.md<input type="file" accept=".txt,.md" className="sr-only" data-testid="ai-guide-file" onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} /></label>
              <Button type="button" size="sm" className="ml-auto h-7" data-testid="ai-guide-save" disabled={busy || title.trim().length < 2 || content.trim().length < 10} onClick={() => void run(async () => { await apiClient.createCatalog2AiGuide({ title: title.trim(), content: content.trim() }); setTitle(""); setContent(""); })}>Guardar guia</Button>
            </div>
          </div>
        )}
        {err && <p role="alert" className="font-semibold text-red-700">{err}</p>}
      </div>
    </details>
  );
}

export function ProductAiChatDialog({ open, onOpenChange, productId, readOnly, onApply, currentValues }: { open: boolean; onOpenChange: (v: boolean) => void; productId: string; readOnly?: boolean; onApply: (d: AiProductDraft, opts: { onlyEmpty: boolean }) => Promise<void>; currentValues?: Record<string, unknown> }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState<AiProductDraft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [attached, setAttached] = useState<string[]>([]);
  const [confirmApply, setConfirmApply] = useState(false);
  const inventory = currentValues ? productAiInventory(currentValues) : null;
  // Campos de apresentação comercial ainda vazios (o atalho "Sugerir público-alvo e textos comerciais" propõe só estes).
  const commercialEmpty = inventory ? AI_COMMERCIAL_FIELDS.filter(([key]) => key !== "internal_notes" && !hasAiInput((currentValues ?? {})[key])).map(([, label]) => label) : [];
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    const parts: string[] = []; const names: string[] = [];
    for (const file of Array.from(files)) {
      if (!/\.(txt|md|csv|json)$/i.test(file.name)) { setErr(`“${file.name}” não é texto. Anexe .txt, .md, .csv ou .json (para Word/PDF, copie o texto e cole na conversa).`); continue; }
      parts.push(attachmentToMessage(file.name, await file.text())); names.push(file.name);
    }
    if (parts.length) { setText((t) => [t.trim(), ...parts].filter(Boolean).join("\n\n")); setAttached((a) => [...a, ...names]); setErr(null); }
  }

  async function send(request?: string) {
    const t = (request ?? text).trim();
    if (!t || busy) return;
    // Item 1 (31/10): "Quem pode ver"/"Níveis de agência" são PERMISSÕES (quem enxerga/contrata) — a IA só lê; Público-alvo é texto
    // comercial do cliente ideal. As tarefas/etapas (nomes, descrições, critérios, entregáveis; sem horas/preços/pessoas) dão o contexto.
    const context = inventory
      ? `CADASTRO ATUAL: campos preenchidos: ${inventory.filled.join(", ") || "nenhum"}. Campos vazios que este assistente pode sugerir: ${inventory.available.join(", ") || "nenhum"}. Considere os dados já informados, inclusive os textos ainda na tela e as tarefas/etapas (tasks_context). Não invente preço, horas, prazo, pessoas ou configurações; tarefas e etapas são apenas sugestões, não cadastros automáticos. "Quem pode ver" e "Níveis de agência" são PERMISSÕES de acesso (quem enxerga e pode contratar o produto): não as use como público-alvo e não proponha alterá-las. "Público-alvo" é a descrição comercial do cliente ideal (perfil, momento, necessidade), deduzida do produto e das tarefas/etapas. Se faltar informação, pergunte. Contexto adicional do formulário: ${JSON.stringify(inventory.context).slice(0, 6000)}\nPedido: `
      : "";
    const next: Msg[] = [...messages, { role: "user", text: t }];
    setMessages(next); setText(""); setBusy(true); setErr(null); setApplied(false);
    setConfirmApply(false);
    try {
      const requestMessages = context ? next.map((message, index) => index === next.length - 1 ? { ...message, text: context + message.text } : message) : next;
      const latestFilled = inventory && onlyEmpty ? Object.fromEntries(Object.entries(inventory.current).filter(([, value]) => hasAiInput(value))) : {};
      const currentDraft = draft ? { ...draft, ...latestFilled } : inventory?.current ?? null;
      const r = await apiClient.draftCatalog2ProductWithAI(productId, requestMessages, currentDraft);
      setDraft(r.draft); setMessages([...next, { role: "assistant", text: r.reply }]);
    } catch (e: any) { setErr(e?.message ?? "Não foi possível usar a IA agora."); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!draft || busy) return;
    setBusy(true); setErr(null);
    try { await onApply(draft, { onlyEmpty }); setApplied(true); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível aplicar o rascunho."); }
    finally { setBusy(false); }
  }

  return (
    <ProductAiWindow framed={!!inventory} open={open} onOpenChange={onOpenChange}>
        <div style={inventory ? { background: "var(--app-brand-gradient, linear-gradient(90deg,#111827,#6d28d9,#c026d3))" } : undefined} className={inventory ? "shrink-0 rounded-xl px-4 py-3 text-white" : "border-b border-slate-200 px-5 pb-3 pt-4 dark:border-slate-800"}>
          <div className="flex items-center justify-between gap-3"><DialogTitle className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4" />Preencher o produto com IA</DialogTitle>{inventory && <button type="button" aria-label="Fechar assistente de IA" onClick={() => onOpenChange(false)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/30 hover:bg-white/15"><X className="h-4 w-4" /></button>}</div>
          <p className={inventory ? "mt-1 text-[11px] text-white/80" : "mt-1 text-xs text-slate-600 dark:text-slate-300"}>{inventory ? "Confira os dados → gere uma proposta → revise e confirme. Abrir esta janela não altera o produto." : "Conte o que é o produto, o que entrega e para quem. A IA monta título, descrições, itens e uma sugestão de tarefas. Você pode pedir ajustes na conversa e só então aplicar."}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" data-testid="ai-window-body">
        {inventory && <section className="space-y-2 px-3 py-3 text-xs" aria-label="Conferência do preenchimento para a IA" data-testid="ai-input-inventory">
          <div className="grid items-start gap-3 md:grid-cols-2">
            <AiInventoryColumn items={inventory.filled.filter((label) => !(inventory.contextLabels as string[]).includes(label))} />
            <AiInventoryColumn items={inventory.available} available />
          </div>
          {inventory.contextLabels.length > 0 && (
            <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/20" data-testid="ai-context-used">
              <h3 className="mb-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">Contexto que a IA lê (não altera)</h3>
              <ul aria-label="Contexto que a IA lê" className="flex flex-wrap gap-1.5">
                {inventory.contextLabels.map((label) => {
                  const isPermission = (AI_PERMISSION_CONTEXT as readonly string[]).includes(label);
                  const tasks = label === "Tarefas e etapas" && Array.isArray(currentValues?.tasks_context) ? (currentValues!.tasks_context as any[]) : null;
                  const extra = tasks ? ` · ${tasks.length} tarefa(s), ${tasks.reduce((n, t) => n + (t.steps?.length ?? 0), 0)} etapa(s)` : "";
                  return <li key={label} title={isPermission ? "Permissão de acesso: define quem enxerga e pode contratar. A IA só lê; não é o público-alvo e não é alterada." : undefined} className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-[11px] text-slate-700 dark:border-sky-900 dark:bg-slate-900 dark:text-slate-200">{label}{extra}{isPermission && <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600" data-testid="ai-permission-tag">permissão · não altera</span>}</li>;
                })}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300"><strong>Quem pode ver/contratar</strong> é permissão de acesso. <strong>Público-alvo</strong> é o texto comercial sobre o cliente ideal — esse a IA pode sugerir, a partir do produto e das tarefas/etapas.</p>
            </section>
          )}
          <details className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] text-slate-500"><summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold"><CircleHelp className="h-3.5 w-3.5" />O que a IA não altera<ChevronRight className="ml-auto h-3.5 w-3.5" /></summary><p className="mt-1.5 leading-relaxed">Preço, horas, prazo, executor e regras não são preenchidos automaticamente. Tarefas e etapas são apenas sugestões. Os textos também mantêm os botões individuais de IA.</p></details>
          {!draft && commercialEmpty.length > 0 && <Button type="button" size="sm" variant="outline" disabled={busy || readOnly || !inventory.filled.length} className="mr-2 border-violet-300 text-violet-800" data-testid="ai-suggest-audience" data-fields={commercialEmpty.join("|")} aria-description={`Vai propor: ${commercialEmpty.join(", ")}`}
            onClick={() => void send(`Proponha somente estes campos vazios de apresentação comercial: ${commercialEmpty.join(", ")}. Use o produto já informado e o contexto das tarefas/etapas para deduzir o público-alvo (cliente ideal). Não use "Quem pode ver" como público-alvo, não altere permissões e não invente preço, horas, prazo ou pessoas. Preserve os campos já preenchidos.`)}><Sparkles className="mr-1 h-3.5 w-3.5" />Sugerir público-alvo e textos comerciais</Button>}
          {!draft && inventory.available.length > 0 && <Button type="button" size="sm" disabled={busy || readOnly || !inventory.filled.length} className="bg-[image:var(--app-brand-button,linear-gradient(to_right,#6d28d9,#c026d3))] text-white" onClick={() => void send("Desejo uma proposta para todos os campos vazios disponíveis neste assistente, usando apenas o que já informei. Preserve os campos preenchidos e pergunte o que não puder inferir com segurança.")} data-testid="ai-generate-from-inputs"><Sparkles className="mr-1 h-3.5 w-3.5" />Gerar sugestões para os campos vazios</Button>}
        </section>}
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden bg-slate-50 p-4 dark:bg-slate-950/40 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            {inventory && <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Converse com a IA</h3>}
            <ul className="min-h-[8rem] flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" aria-label="Conversa" data-testid="chat-log">
              {messages.length === 0 && <li className="text-slate-400">Exemplo: “Produto de gestão de tráfego pago para e-commerce: configuração de pixel, campanhas de remarketing e relatório quinzenal. O cliente precisa ter conta de anúncios.”</li>}
              {messages.map((m, i) => <li key={i} className={`rounded-md px-2 py-1.5 ${m.role === "user" ? "ml-6 bg-violet-100 text-violet-900" : "mr-6 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>{m.text}</li>)}
              {busy && <li className="flex items-center gap-1 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />A IA está montando…</li>}
            </ul>
            {attached.length > 0 && <p className="text-[11px] text-slate-500" data-testid="ai-attached">Anexado: {attached.join(", ")} — o texto foi colocado na caixa abaixo; você pode editar antes de enviar. A IA pergunta o que estiver ambíguo antes de fechar o rascunho.</p>}
            {err && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{err}</p>}
            <div className="flex items-end gap-2">
              <textarea aria-label="Mensagem para a IA" rows={3} disabled={busy || readOnly} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(); } }} placeholder={draft ? "Peça um ajuste (ex.: deixe o resumo mais curto)" : "Descreva o produto…"} className="min-h-[72px] flex-1 rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" title="Anexar escopo ou explicações (.txt, .md, .csv, .json)"><Paperclip className="h-3.5 w-3.5" />Anexar<input type="file" multiple accept=".txt,.md,.csv,.json" className="sr-only" data-testid="ai-attach" disabled={busy || readOnly} onChange={(e) => { void attach(e.target.files); e.target.value = ""; }} /></label>
              <Button type="button" className="h-9" disabled={busy || !text.trim() || readOnly} onClick={() => void send()}><Send className="mr-1 h-3.5 w-3.5" />{draft ? "Ajustar" : "Gerar"}</Button>
            </div>
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900" data-testid="draft-preview">
            {inventory && <h3 className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-900 dark:text-slate-100">Proposta para revisão</h3>}
            <AiGuidesPanel readOnly={readOnly} />
            {!draft ? <p className="text-slate-400">O rascunho aparece aqui.</p> : (
              <>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Título</p><p className="text-sm font-semibold">{draft.title}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Descrição curta</p><p>{draft.summary}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Descrição completa</p><p className="whitespace-pre-wrap">{draft.full_description}</p></div>
                <Bullets title="Itens incluídos" items={draft.included_items} />
                <Bullets title="Itens não incluídos" items={draft.excluded_items} />
                <Bullets title="Requisitos do cliente" items={draft.client_requirements} />
                <Bullets title="Resumo dos entregáveis" items={draft.deliverables_summary} />
                {inventory && AI_COMMERCIAL_FIELDS.map(([key, label]) => draft[key] ? <div key={key}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p>{draft[key]}</p></div> : null)}
                {draft.suggested_tasks.length > 0 && (
                  <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sugestão de tarefas e etapas (cadastre na aba Entrega)</p>
                    <ol className="ml-4 list-decimal space-y-1">{draft.suggested_tasks.map((t) => <li key={t.name}><strong>{t.name}</strong>{t.objective ? ` — ${t.objective}` : ""}<ul className="ml-4 list-disc">{t.steps.map((s) => <li key={s.name}>{s.name}{s.completion_criteria ? ` (conclui quando: ${s.completion_criteria})` : ""}</li>)}</ul></li>)}</ol>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled={busy || readOnly} data-testid="ai-only-empty" checked={onlyEmpty} onChange={(e) => { setOnlyEmpty(e.target.checked); setConfirmApply(false); }} />Só completar o que está vazio (não sobrescrever o que já está preenchido)</label>
          <Button type="button" disabled={!draft || busy || readOnly} className="bg-[image:var(--app-brand-button,linear-gradient(to_right,#6d28d9,#c026d3))] text-white" onClick={() => { if (inventory) setConfirmApply(true); else void apply(); }} data-testid="apply-draft">Aplicar no produto</Button>
          {applied && <span role="status" className="text-xs font-semibold text-emerald-700">{inventory ? "Sugestões aplicadas ao formulário. Salve o rascunho ou avance para gravar; anexos existentes são mantidos. Tarefas e etapas continuam apenas sugestões." : "Aplicado e salvo. As tarefas e etapas sugeridas ficam para você cadastrar na aba Entrega."}</span>}
          <Button type="button" variant="ghost" className="ml-auto" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
        {confirmApply && inventory && <div role="alertdialog" aria-label="Confirmar aplicação das sugestões" className="space-y-2 border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs">
          <p>{onlyEmpty ? "Confirma completar somente os campos vazios com a proposta revisada? Os dados preenchidos serão preservados." : "Atenção: você desligou a proteção. Confirma substituir os textos e listas existentes pelos campos propostos? Tarefas, etapas, valores e regras não serão criados nem alterados."}</p>
          <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirmApply(false)}>Voltar à revisão</Button><Button type="button" size="sm" disabled={busy || readOnly} onClick={() => { setConfirmApply(false); void apply(); }} data-testid="confirm-ai-apply">Confirmar e aplicar</Button></div>
        </div>}
    </ProductAiWindow>
  );
}

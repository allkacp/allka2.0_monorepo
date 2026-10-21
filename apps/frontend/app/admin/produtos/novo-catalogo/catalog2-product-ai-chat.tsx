"use client";

// P-8 (reunião 07/10): a IA conversa com o administrador e preenche o produto inteiro. Só PROPÕE um rascunho; nada é salvo até clicar em "Aplicar no produto".
import { useEffect, useState } from "react";
import { Loader2, Paperclip, Send, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface AiProductDraft {
  title: string; summary: string; full_description: string;
  included_items: string[]; excluded_items: string[]; client_requirements: string[]; deliverables_summary: string[];
  suggested_tasks: { name: string; objective: string; steps: { name: string; description: string; completion_criteria: string }[] }[];
}
type Msg = { role: "user" | "assistant"; text: string };

/** Só aplica o que a IA trouxe (lista vazia não apaga o que já existe no produto). */
/**
 * R21-14: com `onlyEmpty` (produto já preenchido/publicado) a IA só COMPLETA o que está vazio — textos e listas que já têm conteúdo ficam como estão.
 */
export function draftToVersionPatch(d: AiProductDraft, current: { title?: string; summary?: string; full_description?: string }, onlyEmpty = false, currentLists: { included_items?: unknown[] | null; excluded_items?: unknown[] | null; client_requirements?: unknown[] | null; deliverables_summary?: unknown[] | null } = {}) {
  const text = (ai: string, cur?: string) => (onlyEmpty && (cur ?? "").trim() ? cur! : ai || cur || "");
  const list = (key: keyof typeof currentLists, ai: string[]) => (ai.length && !(onlyEmpty && (currentLists[key] ?? []).length > 0) ? { [key]: ai } : {});
  return {
    title: text(d.title, current.title), summary: text(d.summary, current.summary), full_description: text(d.full_description, current.full_description),
    ...list("included_items", d.included_items), ...list("excluded_items", d.excluded_items),
    ...list("client_requirements", d.client_requirements), ...list("deliverables_summary", d.deliverables_summary),
  } as { title: string; summary: string; full_description: string; included_items?: string[]; excluded_items?: string[]; client_requirements?: string[]; deliverables_summary?: string[] };
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

export function ProductAiChatDialog({ open, onOpenChange, productId, readOnly, onApply }: { open: boolean; onOpenChange: (v: boolean) => void; productId: string; readOnly?: boolean; onApply: (d: AiProductDraft, opts: { onlyEmpty: boolean }) => Promise<void> }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState<AiProductDraft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [attached, setAttached] = useState<string[]>([]);
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    const parts: string[] = []; const names: string[] = [];
    for (const file of Array.from(files)) {
      if (!/\.(txt|md|csv|json)$/i.test(file.name)) { setErr(`“${file.name}” não é texto. Anexe .txt, .md, .csv ou .json (para Word/PDF, copie o texto e cole na conversa).`); continue; }
      parts.push(attachmentToMessage(file.name, await file.text())); names.push(file.name);
    }
    if (parts.length) { setText((t) => [t.trim(), ...parts].filter(Boolean).join("\n\n")); setAttached((a) => [...a, ...names]); setErr(null); }
  }

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...messages, { role: "user", text: t }];
    setMessages(next); setText(""); setBusy(true); setErr(null); setApplied(false);
    try {
      const r = await apiClient.draftCatalog2ProductWithAI(productId, next, draft);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl" data-testid="product-ai-chat">
        <div className="border-b border-slate-200 px-5 pb-3 pt-4 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-600" />Preencher o produto com IA</DialogTitle>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Conte o que é o produto, o que entrega e para quem. A IA monta título, descrições, itens e uma sugestão de tarefas. Você pode pedir ajustes na conversa e só então aplicar.</p>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden bg-slate-50 p-4 dark:bg-slate-950/40 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
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
                {draft.suggested_tasks.length > 0 && (
                  <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sugestão de tarefas e etapas (cadastre na aba Entrega)</p>
                    <ol className="ml-4 list-decimal space-y-1">{draft.suggested_tasks.map((t) => <li key={t.name}><strong>{t.name}</strong>{t.objective ? ` — ${t.objective}` : ""}<ul className="ml-4 list-disc">{t.steps.map((s) => <li key={s.name}>{s.name}{s.completion_criteria ? ` (conclui quando: ${s.completion_criteria})` : ""}</li>)}</ul></li>)}</ol>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" data-testid="ai-only-empty" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} />Só completar o que está vazio (não sobrescrever o que já está preenchido)</label>
          <Button type="button" disabled={!draft || busy || readOnly} className="bg-[image:var(--app-brand-button,linear-gradient(to_right,#6d28d9,#c026d3))] text-white" onClick={() => void apply()} data-testid="apply-draft">Aplicar no produto</Button>
          {applied && <span role="status" className="text-xs font-semibold text-emerald-700">Aplicado e salvo. As tarefas e etapas sugeridas ficam para você cadastrar na aba Entrega.</span>}
          <Button type="button" variant="ghost" className="ml-auto" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

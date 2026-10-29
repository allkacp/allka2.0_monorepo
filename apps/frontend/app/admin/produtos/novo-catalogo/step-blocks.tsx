"use client";

// Os 6 blocos do painel de edição da etapa: na página cada um é um CARTÃO com o resumo (e o selo completo / incompleto / com erro);
// clicar (ou em "Editar") abre o bloco numa JANELA MOLDURA maior, por cima do painel. Só um bloco fica aberto por vez; o que é digitado
// vive no formulário da etapa, então fechar a janela não perde nada.
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { keepNativeTitlesStripped } from "./field-help-layer";
import { ChevronDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { FramedModal, InsideFramedModal } from "@/components/framed-panel";
import { STATUS_LABEL, type BlockStatus, type StepBlockId } from "./step-completeness";

export function useIsNarrow(maxWidth = 767): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return narrow;
}

/** Estado de abertura dos blocos. `narrow`: só um aberto por vez. */
export function useBlocks(initial: StepBlockId[] = [], narrow = false, onChange?: (open: StepBlockId[]) => void, startInList = false) {
  const [openSet, setOpenSet] = useState<Set<StepBlockId>>(new Set(initial));
  // Avisa quem quiser lembrar o que está aberto (ex.: para voltar igual depois de F5).
  useEffect(() => { onChange?.([...openSet].sort()); }, [openSet]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ao estreitar a tela, fica só o primeiro aberto.
  useEffect(() => { if (narrow) setOpenSet((cur) => (cur.size > 1 ? new Set([[...cur].sort()[0]]) : cur)); }, [narrow]);
  // Modo normal: cada bloco abre numa janela (um por vez). Modo "lista" (Expandir todos): os blocos abrem na própria página, como acordeão.
  const [list, setList] = useState(startInList);
  const toggle = useCallback((n: StepBlockId) => setOpenSet((cur) => {
    if (cur.has(n)) { const c = new Set(cur); c.delete(n); return c; }
    return list ? (narrow ? new Set([n]) : new Set([...cur, n])) : new Set<StepBlockId>([n]);
  }), [list, narrow]);
  const reveal = useCallback((n: StepBlockId) => setOpenSet((cur) => {
    if (cur.has(n) && (list || cur.size === 1)) return cur;
    return list ? (narrow ? new Set([n]) : new Set([...cur, n])) : new Set<StepBlockId>([n]);
  }), [list, narrow]);
  const expandAll = useCallback(() => { setList(true); setOpenSet(new Set<StepBlockId>(narrow ? [1] : [1, 2, 3, 4, 5, 6])); }, [narrow]);
  const collapseAll = useCallback(() => { setList(false); setOpenSet(new Set()); }, []);
  return { open: openSet, list, toggle, reveal, expandAll, collapseAll };
}

const CHIP: Record<BlockStatus, string> = {
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  incomplete: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  optional: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  na: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export function StepBlock({ n, title, status, count = 0, summary, open, onToggle, onGo, onSaveDraft, savingDraft = false, draftNote, inline = false, help, children }: {
  n: StepBlockId; title: string; status: BlockStatus; /** pendências reais do bloco (mostradas no selo) */ count?: number; summary?: string; open: boolean; onToggle: () => void; /** vai para outro bloco (anterior/próximo) */ onGo?: (n: StepBlockId) => void; /** salva a etapa como rascunho sem sair do bloco */ onSaveDraft?: () => void; savingDraft?: boolean; draftNote?: string | null; /** modo lista (Expandir todos): abre na própria página */ inline?: boolean; help?: string; children: React.ReactNode;
}) {
  const id = `step-block-${n}`;
  const asModal = open && !inline;
  // O conteúdo fica SEMPRE montado (nada digitado se perde): ele é desenhado num nó próprio que muda de lugar —
  // escondido dentro do cartão quando fechado, ou dentro da janela quando aberto.
  const [host] = useState<HTMLDivElement | null>(() => (typeof document !== "undefined" ? document.createElement("div") : null));
  const [cardSlot, setCardSlot] = useState<HTMLDivElement | null>(null);
  const [modalSlot, setModalSlot] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!host) return;
    const target = asModal ? modalSlot : cardSlot;
    if (target && host.parentElement !== target) target.appendChild(host);
  }, [host, asModal, modalSlot, cardSlot]);
  // O conteúdo do bloco pode estar dentro da janela (fora da camada de ajuda): garante que só o ⓘ mostra tooltip, nunca o do navegador também.
  useEffect(() => (host ? keepNativeTitlesStripped(host) : undefined), [host]);
  const chipOf = (testId: string) => (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CHIP[status]}`} data-testid={testId}>{STATUS_LABEL[status]}{(status === "incomplete" || status === "error") && count > 0 ? ` · ${count} pendência${count > 1 ? "s" : ""}` : ""}</span>
  );
  // O conteúdo é desenhado num nó que muda de lugar (fora da árvore da janela): avisa que, quando o bloco está numa janela, painéis abertos de dentro dele ficam POR CIMA dela.
  const body = host ? createPortal(<InsideFramedModal.Provider value={asModal}>{children}</InsideFramedModal.Provider>, host) : null;
  return (
    <section className={`min-w-0 rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${status === "error" ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 dark:border-slate-700"}`} data-testid={`step-block-${n}`} data-status={status} data-open={open ? "true" : "false"}>
      <h5 className="m-0">
        <button type="button" id={`${id}-header`} aria-expanded={open} aria-controls={inline ? `${id}-panel` : undefined} aria-haspopup={inline ? undefined : "dialog"} onClick={onToggle}
          className="flex w-full min-w-0 items-center gap-2 rounded-xl px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-slate-800/50">
          <span className="section-number-badge flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">{n}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100" data-no-info="">{title}</span>
              {help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}
              {chipOf(`step-block-${n}-status`)}
            </span>
            {(inline ? !open : true) && summary && <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400" data-testid={`step-block-${n}-summary`}>{summary}</span>}
          </span>
          {inline
            ? (open ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />)
            : <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</span>}
        </button>
      </h5>
      {/* cartão: o conteúdo mora aqui, escondido (modo janela) ou à vista (modo lista) */}
      <div id={inline ? `${id}-panel` : undefined} role={inline ? "region" : undefined} aria-labelledby={inline ? `${id}-header` : undefined} hidden={asModal ? true : !open}
        className={inline ? "min-w-0 space-y-3 border-t border-slate-100 p-4 dark:border-slate-800" : "hidden"}>
        <div ref={setCardSlot} className="min-w-0 space-y-3" />
      </div>
      {asModal && (
        <FramedModal open overlayTone="dark" onOpenChange={(o) => { if (!o) onToggle(); }} testId={`step-block-${n}-modal`} title={title}>
          <div className="mx-[2px] mt-[2px] flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
            <div className="flex min-w-0 items-center gap-2">
              <span className="section-number-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">{n}</span>
              <span className="min-w-0"><span className="block truncate text-base font-bold text-slate-900 dark:text-slate-100">{title}</span><span className="block text-[11px] text-slate-500">Bloco {n} de 6 da etapa</span></span>
              {chipOf(`step-block-${n}-modal-status`)}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {draftNote && <span role="status" className="whitespace-nowrap text-[11px] font-semibold text-emerald-700" data-testid={`step-block-${n}-draft-note`}>{draftNote.split(".")[0]}</span>}
              {onSaveDraft && <button type="button" disabled={savingDraft} onClick={onSaveDraft} data-testid={`step-block-${n}-save-draft`} title="Guarda tudo o que já foi preenchido na etapa, sem sair deste bloco." className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60">{savingDraft ? "Salvando…" : "Salvar rascunho"}</button>}
              <button type="button" onClick={onToggle} data-testid={`step-block-${n}-close`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Fechar</button>
            </div>
          </div>
          <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-header`} className="mt-2 min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 dark:bg-slate-900">
            <div ref={setModalSlot} className="min-w-0 space-y-3" />
          </div>
              <div className="mx-[2px] mb-[2px] mt-2 flex shrink-0 items-center justify-between gap-2">
              <button type="button" disabled={!onGo || n <= 1} onClick={() => onGo?.((n - 1) as StepBlockId)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" />Bloco anterior</button>
              <button type="button" disabled={!onGo || n >= 6} onClick={() => onGo?.((n + 1) as StepBlockId)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Próximo bloco<ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
        </FramedModal>
      )}
      {body}
    </section>
  );
}

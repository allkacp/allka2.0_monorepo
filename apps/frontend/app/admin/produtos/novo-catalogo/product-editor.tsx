"use client";

import { Suspense, lazy, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Copy, RefreshCw, Search, Link2, Unlink, FileText, Settings2, Clock, Save, CheckCircle2, MoreVertical, X, Pin, Tag, Layers, ListChecks, CheckSquare, ListOrdered, DollarSign, CalendarClock, Info, Sparkles, UploadCloud, Undo2, Pencil, Lock, Eye, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePinEntry, type PinnedEntry } from "@/contexts/open-screens-context";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Catalog2ProductDetail } from "@/components/catalog2-product-detail";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useIallkaContext } from "@/contexts/iallka-context";
import { ModelPickerDialog, TaskModelInfoDialog, ModelScopeDialog, SimilarModelsDialog, ModelStatusChips, TaskIndicators, EXEC_LABEL, PURPOSE_LABEL, CYCLE_TYPE_LABEL, REPEAT_RULE_LABEL, IMPLEMENTATION_RULE_LABEL, CONTINUITY_LABEL, ASSET_RULE_LABEL, fmtMinutes } from "./catalog2-models-ui";
import { DependencyRuleForm, type DependencyOptions } from "@/components/dependency-rule-form";
import { TaskOpsForm, StepOpsForm } from "./catalog2-ops-ui";
import { TaskDeliverablesEditor } from "./catalog2-deliverables-ui";
import { AiConfig } from "./catalog2-ai-ui";
import { CommercialConsistencyBanner } from "./commercial-consistency";
import { CommercialFieldsCard } from "./catalog2-commercial-ui";
import { ConnectionsSection } from "./catalog2-connections-ui";
import { QuestionConfigFields, emptyQuestion, draftFromServer, payloadFromDraft, questionTypeLabel, type QuestionDraft } from "./catalog2-questions-ui";
import { BillingSplitSection } from "@/components/catalog2-pricing-memory-popover";
import { VariationSettings, OptionSettings, AddonSettings, ChargeScopeFields, chargeScopeLabel } from "./catalog2-choices-ui";
import { CATALOG2_STATUSES, CATALOG2_STATUS_LABEL, CATALOG2_STATUS_MEANING, catalog2StatusLabel, catalog2StatusTone, type Catalog2Status } from "@/lib/catalog2-status";

// Construtor de produto do novo catálogo (sprint de produtos, bloco 3/6).
// Ocupa o container padrão — SEM sobreposição grande sobre outra tela.
//
// Reunião 10/09/2026 — reformulação de usabilidade: as 10 seções técnicas
// originais foram AGRUPADAS em 5 etapas de trabalho + 1 área secundária de
// origem. Nenhuma função foi removida; rotas, payloads, cálculos e regras de
// publicação continuam idênticos. Uma versão publicada é imutável (a UI
// bloqueia + o backend reaplica). Ordenação por setas (sem drag-drop).
// Preço/prazo vêm do backend — nunca calculados aqui.

const EFFECT_TYPES = [
  ["add_deadline_days", "Adicionar dias ao prazo"],
  ["add_fixed_amount", "Adicionar valor fixo"],
  ["add_percent", "Adicionar percentual"],
  ["add_task", "Incluir tarefa (condicional)"],
  ["remove_task", "Remover tarefa"],
  ["add_step", "Incluir etapa (condicional)"],
  ["require_info", "Exigir informação do cliente"],
  ["add_deliverable", "Adicionar entregável"],
] as const;
const OPERATORS = [["eq", "igual a"], ["neq", "diferente de"], ["gte", "maior ou igual a"], ["lte", "menor ou igual a"], ["contains", "contém"], ["selected", "está selecionado"], ["not_selected", "não está selecionado"]] as const;
const TRIGGERS = [["variation_option", "Opção de variação"], ["addon_selected", "Adicional selecionado"], ["quantity", "Quantidade"], ["client_answer", "Resposta do cliente"], ["contract_attribute", "Atributo da contratação"]] as const;
const EXEC_MODES = [["humano", "Humano"], ["ia", "IA"], ["hibrido", "Humano ou IA"]] as const;

export function ProductEditor({ productId, onBack, pin, notice }: { productId: string; onBack: () => void; pin?: PinnedEntry; notice?: React.ReactNode }) {
  const [product, setProduct] = useState<any>(null);
  const [refs, setRefs] = useState<{ pillars: any[]; fourF: any[]; categories: any[]; specialties: any[]; questionnaires: any[] }>({ pillars: [], fourF: [], categories: [], specialties: [], questionnaires: [] });
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [editorTab, setEditorTab] = useState("info");
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const [highlightTaskIds, setHighlightTaskIds] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Prontidão navegável (pedido do usuário 2026-09-25): clicar num item leva
  // à aba/sub-aba/campo certo e destaca em amarelo até o item ficar resolvido.
  const [loadCount, setLoadCount] = useState(0);
  const [subTabs, setSubTabs] = useState({ opcoes: "class", entrega: "tarefas", revisao: "preview" });
  const [watch, setWatch] = useState<{ key: string; ids: string[] } | null>(null);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  // A tela abre TRAVADA (só leitura): só o botão "Editar" libera os campos, pra
  // ninguém alterar produto sem querer.
  const [editMode, setEditMode] = useState(false);
  const [readinessData, setReadinessData] = useState<any>(null);
  const [publishing, setPublishing] = useState<{ title: string; done: boolean; error: string | null } | null>(null);
  async function startPublish(title: string, fn: () => Promise<any>) {
    setPublishing({ title, done: false, error: null });
    try {
      await fn();
      setPublishing((cur) => (cur ? { ...cur, done: true } : cur));
    } catch (e: any) {
      setPublishing((cur) => (cur ? { ...cur, error: e?.message ?? "Falha ao publicar." } : cur));
    }
  }
  useEffect(() => {
    const open = () => setPricingOpen(true);
    window.addEventListener("allka:open-pricing", open);
    return () => window.removeEventListener("allka:open-pricing", open);
  }, []);
  const autoDraftRef = useRef<{ promise: Promise<void> | null; draftId: string | null; baseId: string | null }>({ promise: null, draftId: null, baseId: null });
  const [pubDlg, setPubDlg] = useState<{ val: any } | null>(null);
  // Saída com rascunho novo NÃO salvo e com alterações: pergunta antes de descartar.
  const [leaveDlg, setLeaveDlg] = useState<"close" | "lock" | null>(null);
  // Visualização do cliente DENTRO do editor (mostra a versão aberta, rascunho ou publicada).
  const [previewOpen, setPreviewOpen] = useState(false);
  const flushers = useRef(new Set<() => Promise<void>>());
  const registerFlusher = useCallback((fn: () => Promise<void>) => { flushers.current.add(fn); return () => { flushers.current.delete(fn); }; }, []);
  async function flushPending() { for (const fn of [...flushers.current]) await fn(); }
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [readinessItems, setReadinessItems] = useState<Record<string, { level: string; note: string }> | null>(null);
  const { setScreenContext: setIallkaScreenContext } = useIallkaContext();

  // Contexto pra Aura (Item 9, reunião 2026-09-14, "Atualizar o contexto da
  // Aura") — só o nome (já visível na própria tela) e o id real do produto
  // (revalidado/reautorizado no servidor antes de virar contexto de
  // prompt — nunca confiado só por estar aqui). Some ao sair da tela.
  useEffect(() => {
    setIallkaScreenContext({
      label: "Cadastro de Produtos",
      openItemName: product?.internal_name,
      productId,
    });
    return () => setIallkaScreenContext(null);
  }, [product?.internal_name, productId, setIallkaScreenContext]);

  const load = useCallback(async () => {
    const [p, pil, ff, cat, sp, qn] = await Promise.all([
      apiClient.getCatalog2Product(productId),
      apiClient.getCatalog2Pillars(),
      apiClient.getCatalog2FourF(),
      apiClient.getCatalog2Categories(),
      apiClient.getCatalog2Specialties(),
      apiClient.getCatalog2Questionnaires(),
    ]);
    const cur = p;
    setProduct(cur);
    setRefs({ pillars: pil.data, fourF: ff.data, categories: cat.data, specialties: sp.data, questionnaires: qn.data });
    setSelectedVersionId((sel) => sel && cur.versions.some((v: any) => v.id === sel) ? sel : (cur.versions.find((v: any) => v.state === "rascunho")?.id ?? cur.versions.find((v: any) => v.id === cur.published_version_id)?.id ?? cur.versions[0]?.id ?? ""));
    setLoading(false);
    setLoadCount((c) => c + 1);
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  // Campo a campo: cada campo incompleto fica amarelo; ao ser resolvido fica
  // verde por alguns segundos e volta ao normal.
  useEffect(() => {
    if (!watch || !product) return;
    const cur = product.versions.find((v: any) => v.id === selectedVersionId);
    const level = readinessItems?.[watch.key]?.level;
    const still = level === "pronto" ? [] : readinessPendingIds(watch.key, product, cur, level, readinessItems?.[watch.key]?.note);
    const finished = watch.ids.filter((id) => !still.includes(id));
    if (finished.length === 0) return;
    setWatch((w) => (w ? { ...w, ids: w.ids.filter((id) => still.includes(id)) } : w));
    setDoneIds((d) => [...d, ...finished]);
    window.setTimeout(() => setDoneIds((d) => d.filter((x) => !finished.includes(x))), 3500);
  }, [product, readinessItems]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToReadinessItem(key: string) {
    const dest = readinessDestination(key, product, readinessItems?.[key]?.note);
    const level = readinessItems?.[key]?.level;
    const cur = product?.versions.find((v: any) => v.id === selectedVersionId);
    const ids = level === "pronto" ? [] : readinessPendingIds(key, product, cur, level, readinessItems?.[key]?.note);
    setEditorTab(dest.tab);
    if (dest.sub) setSubTabs((cur2) => ({ ...cur2, ...dest.sub }));
    setHighlightTarget(null);
    setHighlightTaskIds([]);
    setDoneIds([]);
    setWatch(ids.length ? { key, ids } : null);
    window.setTimeout(() => (document.getElementById(ids[0] ?? dest.target) ?? document.getElementById(dest.target) ?? document.getElementById("catalog2-tasks") ?? document.getElementById("catalog2-editor-tabs"))?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
  }
  function goToReadinessAdjustment(key: string, targetId: string) {
    const base = readinessDestination(key, product, readinessItems?.[key]?.note);
    const dest = targetId.startsWith("task-effort:") || targetId.startsWith("catalog2-step-add:")
      ? { tab: "entrega", sub: { entrega: "tarefas" }, target: targetId }
      : targetId === "catalog2-deadline-base"
        ? { tab: "entrega", sub: { entrega: "tarefas" }, target: targetId }
        : targetId === "catalog2-price-pending"
          ? { tab: "precos", target: targetId }
          : { ...base, target: targetId };
    setEditorTab(dest.tab);
    if (dest.sub) setSubTabs((cur2) => ({ ...cur2, ...dest.sub }));
    setHighlightTarget(null);
    setHighlightTaskIds([]);
    setDoneIds([]);
    setWatch({ key, ids: [targetId] });
    window.setTimeout(() => (document.getElementById(targetId) ?? document.getElementById(dest.target) ?? document.getElementById("catalog2-editor-tabs"))?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
  }
  const AMBER = "rounded-lg bg-amber-100 p-2 ring-2 ring-amber-400 dark:bg-amber-900/30";
  const GREEN = "rounded-lg bg-emerald-100 p-2 ring-2 ring-emerald-400 transition-colors dark:bg-emerald-900/30";
  const ringOf = (id: string) => (doneIds.includes(id) ? GREEN : watch?.ids.includes(id) || highlightTarget === id ? AMBER : "");
  const secRing = (id: string) => ringOf(id).replace("rounded-lg", "rounded-2xl").replace("p-2", "p-3");

  const version = useMemo(() => product?.versions.find((v: any) => v.id === selectedVersionId) ?? null, [product, selectedVersionId]);
  const readOnly = version?.state === "publicada" || !editMode;

  // Status COMERCIAL do produto (Ativo/Inativo…), separado do status da versão
  // (Rascunho/Publicada). Salva na hora, a partir do cabeçalho.
  function changeStatus(status: string) {
    if (status === product.status) return;
    const needsPublishedVersion = ["pre_lancamento", "disponivel", "temporariamente_inativo", "esgotado_temporariamente"].includes(status) && !product.published_version_id;
    if (needsPublishedVersion) {
      setMsg("Publique uma versão antes de usar este status, pois ele pode aparecer no catálogo do cliente.");
      return;
    }
    void act(() => apiClient.setCatalog2ProductStatus(productId, status), "Status do produto salvo.");
  }

  // "Editar": libera os campos. Se a versão aberta é uma publicada e ainda não
  // há rascunho, cria o próximo (v2, v3…) — se ninguém mudar nada, é descartado
  // ao fechar (ver closeEditor).
  async function startEditing() {
    setMsg(null);
    try {
      if (version?.state === "publicada") {
        const draft = product.versions.find((v: any) => v.state === "rascunho");
        if (draft) {
          setSelectedVersionId(draft.id);
        } else {
          const nv: any = await apiClient.newCatalog2Version(productId);
          autoDraftRef.current = { promise: null, draftId: nv.version_id, baseId: product.published_version_id ?? version.id };
          await load();
          setSelectedVersionId(nv.version_id);
          setMsg(`Editando a próxima versão (v${nv.version_number ?? version.version_number + 1}). Clique em "Salvar rascunho" para guardar; sem salvar, as alterações são descartadas ao sair e a versão publicada continua igual.`);
        }
      }
      setEditMode(true);
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível iniciar a edição.");
    }
  }

  function goToPublishIssue(issue: string, detail?: { target?: string; task_ids?: string[] }) {
    const text = issue.toLocaleLowerCase("pt-BR");
    const targetFromApi = detail?.target;
    const destination = targetFromApi === "title" ? { tab: "info", target: "catalog2-field-title" }
      : targetFromApi === "full_description" ? { tab: "info", target: "catalog2-field-full-description" }
      : targetFromApi === "pillar" ? { tab: "opcoes", target: "catalog2-field-pillar" }
      : targetFromApi === "category" ? { tab: "opcoes", target: "catalog2-field-category" }
      : targetFromApi === "four_f" ? { tab: "opcoes", target: "catalog2-field-four-f" }
      : targetFromApi === "task_create" ? { tab: "entrega", target: "catalog2-task-create" }
      : targetFromApi === "task_effort" ? { tab: "entrega", target: "catalog2-task-effort" }
      : targetFromApi === "task_duration" ? { tab: "entrega", target: "catalog2-task-duration" }
      : targetFromApi === "conditions" ? { tab: "entrega", target: "catalog2-conditions" }
      : targetFromApi === "options" ? { tab: "opcoes", target: "catalog2-classification" }
      : targetFromApi === "pricing" ? { tab: "precos", target: "catalog2-costs" }
      : text.includes("título")
      ? { tab: "info", target: "catalog2-field-title" }
      : text.includes("descrição")
        ? { tab: "info", target: "catalog2-field-full-description" }
        : text.includes("pilar")
          ? { tab: "opcoes", target: "catalog2-field-pillar" }
          : text.includes("categoria")
            ? { tab: "opcoes", target: "catalog2-field-category" }
            : text.includes("4f")
              ? { tab: "opcoes", target: "catalog2-field-four-f" }
              : text.includes("variação") || text.includes("adicional")
                ? { tab: "opcoes", target: "catalog2-classification" }
        : text.includes("tarefa") || text.includes("prazo") || text.includes("duração") || text.includes("condição")
          ? { tab: "entrega", target: "catalog2-tasks" }
          : { tab: "precos", target: "catalog2-costs" };

    setEditorTab(destination.tab);
    setHighlightTarget(destination.target);
    setHighlightTaskIds(detail?.task_ids ?? []);
    window.setTimeout(() => document.getElementById(destination.target)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  const clearPublishHighlight = (target: string) => setHighlightTarget((current) => current === target ? null : current);

  // Rascunho criado automaticamente pelo "Editar" e ainda NÃO salvo pelo botão
  // "Salvar rascunho": "none" = não há; "unchanged" = igual à publicada; "changed" = tem alterações.
  async function unsavedDraftStatus(): Promise<"none" | "unchanged" | "changed"> {
    const ad = autoDraftRef.current;
    if (!ad.draftId || !ad.baseId) return "none";
    try {
      const fresh = await apiClient.getCatalog2Product(productId);
      const draft = fresh.versions.find((v: any) => v.id === ad.draftId && v.state === "rascunho");
      const base = fresh.versions.find((v: any) => v.id === ad.baseId);
      if (!draft || !base) return "none";
      return versionSignature(draft) === versionSignature(base) ? "unchanged" : "changed";
    } catch { return "none"; /* na dúvida, mantém o rascunho */ }
  }
  async function discardUnsavedDraft() {
    const ad = autoDraftRef.current;
    if (ad.draftId) { try { await apiClient.discardCatalog2DraftVersion(ad.draftId); } catch { /* mantém */ } }
    autoDraftRef.current = { promise: null, draftId: null, baseId: null };
  }

  async function closeEditor() {
    await flushPending();
    const st = await unsavedDraftStatus();
    if (st === "changed") { setLeaveDlg("close"); return; }
    if (st === "unchanged") await discardUnsavedDraft();
    onBack();
  }

  // "Travar edição": volta ao modo leitura; se o rascunho é novo e não foi salvo, some e volta a publicada.
  async function stopEditing() {
    await flushPending();
    const st = await unsavedDraftStatus();
    if (st === "changed") { setLeaveDlg("lock"); return; }
    if (st === "unchanged") await finishLock();
    else setEditMode(false);
  }
  async function finishLock() {
    await discardUnsavedDraft();
    await load();
    setSelectedVersionId(product.published_version_id ?? product.versions.find((v: any) => v.state === "publicada")?.id ?? "");
    setEditMode(false);
  }

  // "Salvar rascunho": mantém o rascunho (não será mais descartado ao sair) e trava a edição.
  async function saveDraft() {
    await flushPending();
    const n = version?.version_number;
    autoDraftRef.current = { promise: null, draftId: null, baseId: null };
    setEditMode(false);
    setMsg(`Rascunho v${n} salvo. Ele aparece no seletor de versões e continua aqui quando você voltar; a versão publicada segue igual até você publicar.`);
  }

  async function act(fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) {
    setMsg(null);
    try {
      const r = await fn();
      const okMsg = typeof ok === "function" ? ok(r) : ok;
      if (okMsg) setMsg(okMsg);
      await load();
      return r;
    }
    catch (e: any) {
      const message = e?.message ?? "Falha na operação.";
      setMsg(message);
      if (opts?.rethrow) throw e instanceof Error ? e : new Error(message);
    }
  }

  if (loading) return <div className="flex items-center gap-2 p-10 text-sm text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
  if (!product) return <div className="flex flex-1 flex-col items-start gap-3 p-10 text-sm text-red-600">Produto não encontrado.<Button size="sm" variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</Button></div>;

  return (
    <RingCtx.Provider value={ringOf}>
    <FlushCtx.Provider value={registerFlusher}>
    <div className="product-editor flex min-h-0 min-w-0 flex-1 flex-col gap-3 bg-[#dde2f3] p-3 dark:bg-slate-950">
      {!previewOpen && <EditorHeader
        product={product}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        onBack={() => void closeEditor()}
        onRefresh={async () => { await load(); setMsg("Dados do produto atualizados."); }}
        editMode={editMode}
        onStartEdit={() => void startEditing()}
        onStopEdit={() => void stopEditing()}
        onSaveDraft={() => void saveDraft()}
        unsavedDraftId={autoDraftRef.current.draftId}
        onClientView={async () => { await flushPending(); setPreviewOpen(true); }}
        previewOpen={previewOpen}
        onChangeStatus={changeStatus}
        canPublish={editMode && !!version && (version.state === "rascunho" || !version.is_published_current)}
        priceInfo={(() => { if (version?.pricing_mode === "on_request") return { text: "Sob consulta", hint: "Sem preço público: não gera cotação nem contratação automática" }; if (version?.pricing_mode === "manual_fixed" && version?.manual_price != null) return { text: `R$ ${Number(version.manual_price).toFixed(2).replace(".", ",")}`, hint: "Preço fixo informado" }; const real = readinessData?.price_amount; const sim = readinessData?.pricing_simulation?.price_amount; const f = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`; return real != null ? { text: f(real), hint: "Preço de venda calculado a partir das tarefas, etapas e taxas" } : sim != null ? { text: `≈ ${f(sim)}`, hint: "Preço estimado (ainda há pendências para fechar o preço comercial)" } : { text: "Preço a definir", hint: "Falta completar tarefas, etapas e prazo para calcular" }; })()}
        versionInfo={version ? { published: version.state === "publicada", current: !!version.is_published_current, number: version.version_number } : null}
        onPublish={async () => { if (!version) return; if (version.state === "publicada") { setPubDlg({ val: { ok: true, restore: true } }); return; } await flushPending(); apiClient.validateCatalog2Version(version.id).then((val: any) => setPubDlg({ val })).catch((e: any) => setMsg(e?.message ?? "Não foi possível validar a versão.")); }}
        canNewVersion={!!product.published_version_id && !product.versions.some((v: any) => v.state === "rascunho")}
        onNewVersion={() => act(() => apiClient.newCatalog2Version(productId), "Nova versão rascunho criada.")}
        pin={pin}
      />}
      <ConfirmationDialog
        open={leaveDlg !== null}
        onClose={() => setLeaveDlg(null)}
        title="Sair sem salvar o rascunho?"
        message={<>Você fez alterações na <strong>v{version?.version_number}</strong> que ainda não foram salvas como rascunho. Se continuar, elas serão <strong>descartadas</strong> e a versão publicada continua exatamente como está. Para guardar, cancele e clique em <strong>Salvar rascunho</strong>.</>}
        confirmText="Descartar alterações"
        destructive
        onConfirm={async () => { const a = leaveDlg; setLeaveDlg(null); if (a === "close") { await discardUnsavedDraft(); onBack(); } else { await finishLock(); } }}
      />
      {previewOpen && version && (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${version.state === "rascunho" ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100"}`}>
            <Eye className="h-4 w-4 shrink-0" />
            <span className="min-w-[12rem] flex-1">
              <strong>Somente visualização</strong> — é assim que o cliente vê {version.state === "rascunho" ? <>o <strong>rascunho v{version.version_number}</strong> (ainda NÃO publicado)</> : <>a <strong>versão publicada v{version.version_number}</strong></>}. Nada aqui gera cotação nem contratação.
            </span>
            <VersionPicker light versions={product.versions} selectedVersionId={selectedVersionId} onSelect={setSelectedVersionId} unsavedDraftId={autoDraftRef.current.draftId} />
            <Button size="sm" variant="outline" className="bg-white text-slate-800 hover:bg-slate-50" onClick={() => setPreviewOpen(false)}><ArrowLeft className="h-4 w-4" /> Voltar para a edição</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-background">
            <Catalog2ProductDetail key={`${version.id}:${loadCount}`} productId={productId} dataSource="client" preview previewVersionId={version.id} canBuy={false} onBack={() => setPreviewOpen(false)} />
          </div>
        </div>
      )}
      <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 ${previewOpen ? "hidden" : ""}`}>
      <div className="flex flex-wrap items-stretch gap-2">
        {notice && !noticeHidden && (
          <div className="relative min-w-[16rem] flex-1 [&>div]:!rounded-xl [&>div]:!py-1.5 [&>div]:!pr-9 [&>div]:!text-xs">
            {notice}
            <button type="button" aria-label="Dispensar aviso" onClick={() => setNoticeHidden(true)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-amber-700 hover:bg-amber-200/60"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {!editMode && (
          <p className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white/70 py-1.5 px-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Lock className="h-3.5 w-3.5 shrink-0" /> Somente leitura — clique em <strong>Editar</strong> (no topo) para liberar os campos.
          </p>
        )}
        {msg && (
          <p className="relative min-w-[12rem] flex-1 rounded-xl border border-blue-200 bg-blue-50 py-1.5 pl-4 pr-9 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            {msg}
            <button type="button" aria-label="Dispensar mensagem" onClick={() => setMsg(null)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-blue-200/60"><X className="h-3.5 w-3.5" /></button>
          </p>
        )}
      </div>
      <ProductReadinessPanel productId={productId} versionId={selectedVersionId} versionKey={`${selectedVersionId}:${loadCount}`} onGo={goToReadinessItem} onGoDetail={goToReadinessAdjustment} onItems={setReadinessItems} onData={setReadinessData} detailFor={(key: string) => readinessDetailLines(key, product, version, readinessItems?.[key]?.note)} detailTargetFor={(key: string, index: number) => readinessDetailTargets(key, product, version, readinessItems?.[key]?.note)[index]} />

      {version && (
        <Tabs value={editorTab} onValueChange={setEditorTab}>
          {/* Etapas de trabalho (reunião 10/09). As 10 seções originais
              continuam todas aqui — reagrupadas, nada removido. */}
          <Stepper current={editorTab} onSelect={(t: string) => { void flushPending().then(() => setEditorTab(t)); }} items={readinessItems} />

          <TabsContent value="info" className="mt-3">
            <GeneralTab version={version} readOnly={readOnly} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2VersionInfo(version.id, b), "Informações salvas.", { rethrow: true })} product={product} />
          </TabsContent>

          <TabsContent value="opcoes" className={TAB_CARD}>
            <StepIntro>Como o produto é classificado e as escolhas que o cliente faz na contratação.</StepIntro>
            <Tabs value={subTabs.opcoes} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, opcoes: v }))}>
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="class" className={SUB_TAB}>Classificação</TabsTrigger>
                <TabsTrigger value="var" className={SUB_TAB}>Variações</TabsTrigger>
                <TabsTrigger value="add" className={SUB_TAB}>Adicionais</TabsTrigger>
              </TabsList>
              <TabsContent value="class"><ClassTab product={product} refs={refs} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2Classifications(productId, b), "Classificações salvas.")} /></TabsContent>
              <TabsContent value="var"><div id="sec-var" className={secRing("sec-var")}><VariationsTab version={version} readOnly={readOnly} act={act} /></div></TabsContent>
              <TabsContent value="add"><div id="sec-add" className={secRing("sec-add")}><AddonsTab version={version} readOnly={readOnly} act={act} /></div></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="entrega" className={TAB_CARD}>
            <StepIntro>Onde se cadastram tarefas, etapas, especialidades, prazos e as condições que ajustam a entrega.</StepIntro>
            <div className="mb-3 grid items-stretch gap-2 md:grid-cols-2 xl:grid-cols-4">
              <DeadlineBaseField version={version} act={act} ringOf={ringOf} locked={!editMode} />
              <div className="min-w-0 md:col-span-2 [&>details]:h-full"><ContractModesSection version={version} readOnly={readOnly} act={act} /></div>
              <ProductPrerequisitesSection productDetailId={productId} readOnly={readOnly} />
              {(version.access_requirements?.length ?? 0) > 0 && <AccessRequirementsSection version={version} readOnly={readOnly} act={act} />}
              <div className="min-w-0 md:col-span-2 xl:col-span-4 [&>details]:h-full" id="sec-connections"><ConnectionsSection version={version} readOnly={readOnly} act={act} /></div>
            </div>
            <Tabs value={subTabs.entrega} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, entrega: v }))}>
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="tarefas" className={SUB_TAB}>Tarefas e etapas</TabsTrigger>
                <TabsTrigger value="cond" className={SUB_TAB}>Prazos e condições</TabsTrigger>
              </TabsList>
              <TabsContent value="tarefas"><TasksTab version={version} productId={productId} readOnly={readOnly} refs={refs} act={act} highlightTarget={highlightTarget} highlightTaskIds={highlightTaskIds} clearHighlight={clearPublishHighlight} /></TabsContent>
              <TabsContent value="cond"><ConditionsTab version={version} readOnly={readOnly} act={act} /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="precos" className={TAB_CARD}>
            <StepIntro>Taxas, margens e valor/hora das especialidades. O preço e o prazo são sempre calculados no servidor.</StepIntro>
            <CostTab version={version} refs={refs} act={act} onReloadRefs={load} productId={productId} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} />
          </TabsContent>

          <TabsContent value="revisao" className={TAB_CARD}>
            <StepIntro>Confira como o produto aparece para o cliente e publique a versão quando estiver pronta.</StepIntro>
            <Tabs value={subTabs.revisao} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, revisao: v }))}>
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="preview" className={SUB_TAB}>Pré-visualização</TabsTrigger>
                <TabsTrigger value="hist" className={SUB_TAB}>Publicação e versões</TabsTrigger>
                <TabsTrigger value="historico" className={SUB_TAB}>Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="preview"><PreviewTab version={version} /></TabsContent>
              <TabsContent value="hist"><div id="sec-publicacao" className={secRing("sec-publicacao")}><HistoryTab version={version} readOnly={readOnly} act={act} onResolveIssue={goToPublishIssue} /></div></TabsContent>
              <TabsContent value="historico"><ProductHistoryTab productId={productId} /></TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}
      {version && (() => {
        const idx = Math.max(0, EDITOR_STEPS.findIndex((st) => st.id === editorTab));
        const prev = EDITOR_STEPS[idx - 1];
        const next = EDITOR_STEPS[idx + 1];
        const go = (id: string) => { setEditorTab(id); document.getElementById("catalog2-editor-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
        return (
          <div className="flex items-center justify-between gap-3 pb-1">
            <Button variant="outline" className="gap-1.5" disabled={!prev} onClick={() => prev && go(prev.id)}><ArrowLeft className="h-4 w-4" /> {prev ? `Passo ${idx}` : "Início"}</Button>
            <span className="text-xs font-medium text-slate-500">Passo {idx + 1} de {EDITOR_STEPS.length}</span>
            <Button className="gap-1.5 bg-[#3b2bff] text-white hover:bg-[#3223d6]" disabled={!next} onClick={() => next && go(next.id)}>{next ? `Passo ${idx + 2}: ${next.label.split(":")[0]}` : "Fim"} <ChevronRight className="h-4 w-4" /></Button>
          </div>
        );
      })()}
      </div>
    </div>
      {publishing && (
        <PublishProgress
          open
          title={publishing.title}
          done={publishing.done}
          error={publishing.error}
          onFinish={() => { setPublishing(null); onBack(); }}
          onClose={() => setPublishing(null)}
        />
      )}
      <Dialog open={pricingOpen} onOpenChange={(o) => { setPricingOpen(o); if (!o) void load(); }}>
        <DialogContent className="h-[88vh] w-[96vw] max-w-[1280px] overflow-y-auto border-0 bg-[#dde2f3] p-3">
          <DialogTitle className="sr-only">Precificação</DialogTitle>
          <Suspense fallback={<div className="flex items-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>}>
            <PricingPageLazy />
          </Suspense>
        </DialogContent>
      </Dialog>
      {pubDlg && version && (() => {
        const current = product.versions.find((v: any) => v.is_published_current);
        if (pubDlg.val?.restore) {
          return (
            <ConfirmationDialog
              open
              onClose={() => setPubDlg(null)}
              title={`Voltar para a v${version.version_number}?`}
              message={`A v${version.version_number} volta a ser a versão publicada e SUBSTITUI a atual (v${current?.version_number ?? "?"}). O cliente passa a ver a v${version.version_number}.`}
              confirmText="Publicar novamente"
              destructive={false}
              onConfirm={() => { setPubDlg(null); void startPublish(`Voltando para a v${version.version_number}`, () => apiClient.makeCatalog2VersionCurrent(version.id)); }}
            />
          );
        }
        const ok = !!pubDlg.val?.ok;
        const forceOk = false; // preço/prazo indefinido nunca é ignorado
        const canGo = ok;
        const message = canGo
          ? (current
              ? `A versão v${version.version_number} (rascunho) vai SUBSTITUIR a versão publicada atual (v${current.version_number}). A v${version.version_number} fica imutável; mudanças futuras exigem uma nova versão.`
              : `A versão v${version.version_number} será a primeira publicada e fica imutável; mudanças futuras exigem uma nova versão.`) + (forceOk ? " Atenção: há pendência comercial de preço ou prazo; ela será publicada assim mesmo." : "")
          : `Ainda não dá para publicar: ${(pubDlg.val?.issues ?? []).join(" ")}`;
        return (
          <PublishChoiceDialog
            canGo={canGo}
            title={canGo ? `Publicar a v${version.version_number}?` : "Não é possível publicar ainda"}
            message={message}
            canActivate={product.status === "em_preparacao"}
            onClose={() => setPubDlg(null)}
            onConfirm={(activate) => {
              setPubDlg(null);
              if (!canGo) return;
              void startPublish(activate ? `Publicando e ativando a v${version.version_number} — ${product.internal_name}` : `Publicando a v${version.version_number} — ${product.internal_name}`, () => apiClient.publishCatalog2Version(version.id, { client_action_id: `pub-${version.id}-${Date.now()}`, change_summary: version.change_summary ?? "", force: forceOk ? true : undefined, ...(activate ? { activate: true, confirm_activation: true } : {}) }));
            }}
          />
        );
      })()}
    </FlushCtx.Provider>
    </RingCtx.Provider>
  );
}

// ── 1. Geral ──────────────────────────────────────────────────────────
// Assinatura do conteúdo de uma versão (sem ids/datas) — serve para saber se o
// rascunho automático foi mexido. Conservador: na dúvida considera "mudou".
const VOLATILE_KEYS = new Set(["id", "version_id", "task_id", "variation_id", "updated_at", "created_at", "history", "version_number", "state", "is_published_current", "published_at", "published_by_user_id", "publish_client_action_id", "updated_by_user_id", "created_by_user_id", "change_summary"]);
const versionSignature = (v: any) => JSON.stringify(v, (k, val) => (VOLATILE_KEYS.has(k) ? undefined : val));

// Botão "Melhorar com IA" por campo (a integração já existe: /ai-consultor/improve-product-field).
// Opção "Pesquisar na internet" usa a busca do Gemini com a data de hoje.
function AiFieldButton({ label, value, mode = "text", context, onResult, disabled, defaultResearch = true }: { label: string; value: string; mode?: "text" | "list"; context: any; onResult: (v: string) => void; disabled?: boolean; defaultResearch?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [approach, setApproach] = useState<"melhorar" | "recriar">(value.trim() ? "melhorar" : "recriar");
  const [length, setLength] = useState<"manter" | "curto" | "medio" | "longo">("manter");
  const [research, setResearch] = useState(defaultResearch);
  const [prev, setPrev] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r: any = await apiClient.aiImproveProductField({ field_label: label, current_value: value, mode, length, approach, research, context });
      const text = String(r?.improved_value ?? "").trim();
      if (!text) throw new Error("A IA não devolveu texto.");
      setPrev(value);
      onResult(text);
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível usar a IA agora.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      {prev !== null && (
        <button type="button" onClick={() => { onResult(prev); setPrev(null); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800">
          <Undo2 className="h-3 w-3" /> Desfazer
        </button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            title="Preencher ou melhorar com Inteligência Artificial"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" /> IA
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 p-3 text-xs">
          <p className="font-semibold text-slate-800">{value.trim() ? "Melhorar" : "Preencher"} “{label}” com IA</p>
          <div className="flex gap-1.5">
            {(["melhorar", "recriar"] as const).map((a) => (
              <button key={a} type="button" onClick={() => setApproach(a)} className={`flex-1 rounded-lg border px-2 py-1 font-semibold ${approach === a ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600"}`}>{a === "melhorar" ? "Melhorar o atual" : "Recriar do zero"}</button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-2">Tamanho
            <select value={length} onChange={(e) => setLength(e.target.value as any)} className="!py-1 text-xs">
              <option value="manter">Manter</option><option value="curto">Curto</option><option value="medio">Médio</option><option value="longo">Longo</option>
            </select>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} className="mt-0.5" />
            <span>Pesquisar na internet (como o produto é conhecido <strong>hoje</strong>)</span>
          </label>
          {err && <p className="text-red-600">{err}</p>}
          <Button size="sm" className="w-full gap-1.5" disabled={busy} onClick={() => void run()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {busy ? "Gerando…" : "Gerar"}
          </Button>
        </PopoverContent>
      </Popover>
    </span>
  );
}

// Publicar NÃO é ativar: "Publicar versão" congela a versão e mantém o status do produto; só "Publicar e ativar" (com confirmação) muda Em preparação → Disponível e avisa a ativação.
function PublishChoiceDialog({ canGo, title, message, canActivate, onClose, onConfirm }: { canGo: boolean; title: string; message: string; canActivate: boolean; onClose: () => void; onConfirm: (activate: boolean) => void }) {
  const [askActivate, setAskActivate] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogTitle>{askActivate ? "Publicar e ativar o produto?" : title}</DialogTitle>
        {askActivate ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>Além de publicar a versão, o produto passa de <strong>Em preparação</strong> para <strong>Disponível</strong>: ele aparece no catálogo e quem acompanha os produtos recebe o <strong>aviso de ativação</strong>.</p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">Confirme só se o produto já pode ser vendido. Para publicar sem ativar, volte e escolha “Publicar versão”.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAskActivate(false)}>Voltar</Button>
              <Button className="bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-white" onClick={() => onConfirm(true)}>Sim, publicar e ativar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            <p>{message}</p>
            {canGo && <p className="text-xs text-slate-500">“Publicar versão” congela esta versão e <strong>não muda o status do produto</strong> nem envia aviso de ativação.</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {canGo ? (
                <>
                  <Button variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button onClick={() => onConfirm(false)}>Publicar versão</Button>
                  {canActivate && <Button className="bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-white" onClick={() => setAskActivate(true)}>Publicar e ativar</Button>}
                </>
              ) : <Button onClick={onClose}>Entendi</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const PUBLISH_STEPS: { at: number; text: string }[] = [
  { at: 0, text: "Conferindo os dados do produto…" },
  { at: 14, text: "Validando título, descrições e classificação…" },
  { at: 28, text: "Calculando preço e prazo comercial…" },
  { at: 42, text: "Revisando tarefas, etapas e especialidades…" },
  { at: 58, text: "Congelando esta versão (ela fica imutável)…" },
  { at: 72, text: "Substituindo a versão anterior no catálogo…" },
  { at: 84, text: "Avisando quem tem proposta em aberto…" },
  { at: 92, text: "Atualizando o catálogo dos clientes…" },
];

// Tela de "publicando": barra de 0 a 100% + frases. O progresso sobe sozinho até ~92%
// enquanto o servidor trabalha e vai a 100% quando a publicação termina.
function PublishProgress({ open, title, done, error, onFinish, onClose }: { open: boolean; title: string; done: boolean; error: string | null; onFinish: () => void; onClose: () => void }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!open) { setPct(0); return; }
    const t = window.setInterval(() => {
      setPct((cur) => {
        if (error) return cur;
        if (done) return Math.min(100, cur + 6);
        const cap = 92;
        return cur >= cap ? cur : Math.min(cap, cur + Math.max(0.4, (cap - cur) * 0.06));
      });
    }, 70);
    return () => window.clearInterval(t);
  }, [open, done, error]);
  useEffect(() => {
    if (open && done && !error && pct >= 100) {
      const t = window.setTimeout(onFinish, 900);
      return () => window.clearTimeout(t);
    }
  }, [open, done, error, pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = Math.round(pct);
  const current = [...PUBLISH_STEPS].reverse().find((st) => pct >= st.at) ?? PUBLISH_STEPS[0];
  const finished = done && !error && pct >= 100;
  return (
    <Dialog open={open} onOpenChange={() => { if (error) onClose(); }}>
      <DialogContent className="max-w-md overflow-hidden border-0 p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Publicando</DialogTitle>
        <div className="bg-gradient-to-r from-[#111A4D] via-[#6E2C96] to-[#D92293] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{error ? "Não foi possível publicar" : finished ? "Tudo certo" : "Publicando"}</p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight">{title}</h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          {error ? (
            <>
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              <Button className="w-full" onClick={onClose}>Fechar</Button>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-extrabold tabular-nums text-slate-900">{shown}<span className="text-xl text-slate-400">%</span></span>
                <span className="text-sm font-medium text-slate-500">{finished ? "Pronto! Versão publicada." : current.text}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] transition-[width] duration-100" style={{ width: `${pct}%` }} />
              </div>
              <ul className="space-y-1.5 text-[13px]">
                {PUBLISH_STEPS.map((st) => {
                  const ok = pct > st.at + 8 || finished;
                  const now = !ok && current === st;
                  return (
                    <li key={st.at} className={`flex items-center gap-2 ${ok ? "text-emerald-700" : now ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                      {ok ? <CheckCircle2 className="h-4 w-4" /> : now ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                      {st.text}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Passo a passo na ORDEM de montar o produto. Cada passo mostra se está ok/pendente/bloqueado
// a partir dos itens do checklist que pertencem a ele.
const EDITOR_STEPS: { id: string; label: string; keys: string[] }[] = [
  { id: "info", label: "Informações do produto", keys: ["conteudo"] },
  { id: "entrega", label: "Entrega: tarefas, etapas e prazos", keys: ["tarefas", "etapas", "esforco_tarefas", "prazo", "conexoes"] },
  { id: "opcoes", label: "Classificação e opções", keys: ["classificacao", "variacoes", "adicionais"] },
  { id: "precos", label: "Custos e preço", keys: ["preco"] },
  { id: "revisao", label: "Revisão e publicação", keys: ["validacao"] },
];

function Stepper({ current, onSelect, items }: { current: string; onSelect: (id: string) => void; items: Record<string, { level: string; note: string }> | null }) {
  return (
    <nav id="catalog2-editor-tabs" data-tour-id="catalog2-editor-tabs" aria-label="Passos do produto" className="flex items-stretch gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {EDITOR_STEPS.map((st, i) => {
        const levels = st.keys.map((k) => items?.[k]?.level).filter(Boolean) as string[];
        const state = !items || st.keys.length === 0 ? "neutral" : levels.includes("bloqueador") ? "blocked" : levels.includes("pendente") ? "pending" : "ok";
        const active = current === st.id;
        const dot = state === "blocked" ? "bg-red-400" : state === "pending" ? "bg-amber-400" : state === "ok" ? "bg-emerald-400" : "bg-slate-300";
        const circle = active ? "bg-white/25 text-white" : state === "ok" ? "bg-emerald-100 text-emerald-700" : state === "pending" ? "bg-amber-100 text-amber-700" : state === "blocked" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600";
        return (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelect(st.id)}
            aria-current={active ? "step" : undefined}
            style={active ? { background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" } : undefined}
            className={`flex min-w-[9.5rem] flex-1 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${active ? "text-white shadow-md ring-1 ring-white/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${circle}`}>{state === "ok" && !active ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[12px] font-semibold leading-tight ${active ? "text-white" : "text-slate-700 dark:text-slate-200"}`}>{st.label}</span>
              <span className={`flex items-center gap-1 text-[10px] leading-tight ${active ? "text-white/80" : "text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{state === "blocked" ? "Tem bloqueio" : state === "pending" ? "Pendente" : state === "ok" ? "Completo" : "Passo " + (i + 1)}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const PricingPageLazy = lazy(() => import("@/app/admin/precificacao/page"));

const RingCtx = createContext<(id: string) => string>(() => "");
// Campos com botão "Salvar" próprio se registram aqui: o editor grava o que está digitado
// antes de salvar rascunho, abrir a prévia, trocar de etapa, publicar ou sair.
const FlushCtx = createContext<(fn: () => Promise<void>) => () => void>(() => () => {});

function GeneralTab({ version, readOnly, onSave, product, highlightTarget, clearHighlight }: any) {
  const ringOf = useContext(RingCtx);
  const [f, setF] = useState({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  // Digitou e ainda não clicou em "Salvar informações"? O editor grava sozinho antes de salvar rascunho/prévia/sair.
  const registerFlusher = useContext(FlushCtx);
  const dirtyRef = useRef(false);
  const fRef = useRef(f);
  fRef.current = f;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffect(() => { dirtyRef.current = false; setF({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" }); }, [version.id]);
  useEffect(() => registerFlusher(async () => {
    if (!dirtyRef.current || readOnly) return;
    dirtyRef.current = false;
    try { await onSaveRef.current(fRef.current); } catch { dirtyRef.current = true; }
  }), [registerFlusher, readOnly]);
  async function saveInfo() {
    setSavingInfo(true);
    setInfoSaved(false);
    try {
      await onSave(f);
      dirtyRef.current = false;
      // Resumo da mudança automático (IA + diferença calculada) quando ficou em branco.
      if (!f.change_summary.trim() && (version?.version_number ?? 1) > 1) {
        try {
          const r = await apiClient.generateCatalog2ChangeSummary(version.id);
          const next = { ...f, change_summary: r.summary };
          setF(next);
          await onSave(next);
        } catch { /* segue sem resumo */ }
      }
      setInfoSaved(true);
      if (f.title.trim()) clearHighlight("catalog2-field-title");
      if (f.full_description.trim()) clearHighlight("catalog2-field-full-description");
    } catch {
      // O erro da API fica visível no editor; não exibimos confirmação falsa.
    } finally {
      setSavingInfo(false);
    }
  }

  function updateInfo(next: Partial<typeof f>) {
    setF({ ...f, ...next });
    dirtyRef.current = true;
    setInfoSaved(false);
  }

  return (
    <div id="catalog2-general" className="scroll-mt-6 space-y-3">
      <SectionCard icon={FileText} title="Dados principais" subtitle="Nome e descrição comercial do produto.">
        <div id="catalog2-field-title" className={ringOf("catalog2-field-title")}>
          <Field label={<span className="flex w-full items-center justify-between gap-2"><span>Título comercial<Req /></span><AiFieldButton label="Título comercial" value={f.title} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} onResult={(v) => updateInfo({ title: v.replace(/\n/g, " ").slice(0, 200) })} /></span>}><Input disabled={readOnly} value={f.title} onChange={(e) => updateInfo({ title: e.target.value })} /></Field>
        </div>
        <Field label={<span className="flex w-full items-center justify-between gap-2"><span>Descrição curta<Req /></span><AiFieldButton label="Descrição curta" value={f.summary} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} onResult={(v) => updateInfo({ summary: v.slice(0, 500) })} /></span>}>
          <div className="space-y-1">
            <Textarea rows={3} disabled={readOnly} value={f.summary} onChange={(e) => updateInfo({ summary: e.target.value })} />
            <CharCount value={f.summary} max={500} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={FileText} title="Descrição completa" subtitle="Detalhe o produto com informações completas, benefícios e diferenciais." collapsible defaultOpen={!String(f.full_description ?? "").trim()} forceOpen={ringOf("catalog2-field-full-description") !== ""}>
        <div id="catalog2-field-full-description" className={ringOf("catalog2-field-full-description")}>
          <Field label={<span className="flex w-full items-center justify-between gap-2"><span>Descrição completa<Req /></span><AiFieldButton label="Descrição completa" value={f.full_description} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} onResult={(v) => updateInfo({ full_description: v.slice(0, 2000) })} /></span>}>
            <div className="space-y-1">
              <Textarea rows={5} disabled={readOnly} value={f.full_description} onChange={(e) => updateInfo({ full_description: e.target.value })} />
              <CharCount value={f.full_description} max={4000} />
            </div>
          </Field>
        </div>
      </SectionCard>

      <CommercialFieldsCard version={version} readOnly={readOnly} registerFlush={registerFlusher} onSave={(b) => onSave(b)} />

      <SectionCard icon={Clock} title="Resumo da mudança" subtitle="Escrito pela IA a partir do que foi alterado — você pode editar." collapsible defaultOpen={(version?.version_number ?? 1) > 1}>
        <div className="space-y-1">
          <div className="flex items-center justify-end">
            <ChangeSummaryAiButton versionId={version.id} disabled={readOnly} onResult={(v) => updateInfo({ change_summary: v.slice(0, 500) })} />
          </div>
          <Textarea rows={2} maxLength={500} disabled={readOnly} placeholder="Deixe em branco: ao salvar, a IA descreve o que foi alterado (preço, prazo, textos, tarefas…)." value={f.change_summary} onChange={(e) => updateInfo({ change_summary: e.target.value })} />
          <CharCount value={f.change_summary} max={500} />
        </div>
      </SectionCard>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-4">
          <SaveButton disabled={savingInfo || (f.summary.length > 500 && f.summary !== (version.summary ?? "")) || (f.full_description.length > 4000 && f.full_description !== (version.full_description ?? ""))} onClick={() => void saveInfo()}>{savingInfo ? "Salvando…" : "Salvar informações"}</SaveButton>
          <div className="text-sm">
            {infoSaved && <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ Informações salvas.</p>}
            {fmtUpdatedAt(version?.updated_at ?? product.updated_at) && <p className="text-xs text-slate-500">Última atualização: {fmtUpdatedAt(version?.updated_at ?? product.updated_at)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Gera o resumo do que mudou nesta versão (compara com a anterior já salva).
function ChangeSummaryAiButton({ versionId, onResult, disabled }: { versionId: string; onResult: (v: string) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {err && <span className="text-[11px] text-red-600">{err}</span>}
      <button
        type="button"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true); setErr(null);
          try { const r = await apiClient.generateCatalog2ChangeSummary(versionId); onResult(r.summary); }
          catch (e: any) { setErr(e?.message ?? "Não foi possível gerar."); }
          finally { setBusy(false); }
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {busy ? "Analisando…" : "Gerar com IA"}
      </button>
    </span>
  );
}

// ── 2. Classificações ─────────────────────────────────────────────────
function ClassTab({ product, refs, onSave, highlightTarget, clearHighlight }: any) {
  const ringOf = useContext(RingCtx);
  const [pillar, setPillar] = useState(product.pillar?.id ?? "");
  const [category, setCategory] = useState(product.category?.id ?? "");
  const [fourF, setFourF] = useState<string[]>(product.four_f.map((f: any) => f.id));
  const saveClassifications = () => onSave({ pillar_id: pillar || null, category_id: category || null, four_f_ids: fourF }).then(() => {
    if (pillar) clearHighlight("catalog2-field-pillar");
    if (category) clearHighlight("catalog2-field-category");
    if (fourF.length > 0) clearHighlight("catalog2-field-four-f");
  });
  return (
    <div id="catalog2-classification" className="mt-3 scroll-mt-6">
      <SectionCard icon={Layers} title="Classificação do produto" subtitle="Pilar, categoria e classificações 4F.">
      <div className="grid items-start gap-3 md:grid-cols-3">
      <div id="catalog2-field-pillar" className={ringOf("catalog2-field-pillar")}><Field label="Pilar">
        <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={pillar} onChange={(e) => setPillar(e.target.value)}>
          <option value="">—</option>{refs.pillars.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field></div>
      <div id="catalog2-field-category" className={ringOf("catalog2-field-category")}><Field label="Categoria">
        <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>{refs.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field></div>
      <div id="catalog2-field-four-f" className={ringOf("catalog2-field-four-f")}><Field label="Classificações 4F">
        <div className="flex flex-wrap gap-3">
          {refs.fourF.map((f: any) => (
            <label key={f.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={fourF.includes(f.id)} onChange={(e) => setFourF(e.target.checked ? [...fourF, f.id] : fourF.filter((x) => x !== f.id))} />
              {f.name}
            </label>
          ))}
        </div>
      </Field></div>
      </div>
      <p className="text-[11px] text-slate-400">A divergência de classificação entre a planilha principal e a Review Rose não é resolvida aqui — precisa de decisão comercial.</p>
      <SaveButton onClick={saveClassifications}>Salvar</SaveButton>
      </SectionCard>
    </div>
  );
}

// ── 3. Variações ─────────────────────────────────────────────────────
function VariationsTab({ version, readOnly, act }: any) {
  const [nv, setNv] = useState({ key: "", name: "" });
  return (
    <div className="mt-3 space-y-4">
      <p className="text-xs text-neutral-500">Escolhas OBRIGATÓRIAS do cliente. Cada opção pode ter efeitos (prazo/custo/tarefa/etapa/entregável/informação).</p>
      {version.variations.map((va: any, vi: number) => (
        <details open key={va.id} className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden" title="Clique para recolher ou expandir">
            <div className="flex items-center gap-1.5 font-medium"><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />{va.name} <span className="text-xs text-neutral-400">({va.key}){va.is_required ? " · obrigatória" : " · opcional"}</span>{va.is_active === false && <Badge className="ml-1 bg-neutral-200 text-neutral-600">inativa</Badge>}</div>
            {!readOnly && <span onClick={(e) => e.preventDefault()}><DeleteBtn label="Remover variação?" tip="Remover esta variação" onConfirm={() => act(() => apiClient.deleteCatalog2Variation(va.id), "Variação removida.")} /></span>}
          </summary>
          <VariationSettings va={va} index={vi} list={version.variations} readOnly={readOnly} act={act} />
          <ul className="mt-2 space-y-1.5">
            {va.options.map((o: any, oi: number) => (
              <li key={o.id} className="rounded bg-neutral-50 px-2 py-1.5 text-sm dark:bg-neutral-800">
                <div className="flex items-center justify-between">
                  <span>{o.label} {o.is_default && <Badge className="ml-1 bg-blue-100 text-blue-700">padrão</Badge>}</span>
                  {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Option(o.id), "Opção removida.")}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
                <OptionSettings o={o} va={va} index={oi} list={va.options} readOnly={readOnly} act={act} />
                <EffectList effects={o.effects} readOnly={readOnly} onAdd={(b) => act(() => apiClient.addCatalog2OptionEffect(o.id, b), "Efeito adicionado.")} onDel={(id) => act(() => apiClient.deleteCatalog2OptionEffect(id), "Efeito removido.")} />
              </li>
            ))}
            {!readOnly && <AddOptionRow onAdd={(b) => act(() => apiClient.addCatalog2Option(va.id, b), "Opção adicionada.")} />}
          </ul>
        </details>
      ))}
      {!readOnly && (
        <div className="flex items-end gap-2">
          <Field label="Nova variação — key"><Input value={nv.key} onChange={(e) => setNv({ ...nv, key: e.target.value })} /></Field>
          <Field label="Nome"><Input value={nv.name} onChange={(e) => setNv({ ...nv, name: e.target.value })} /></Field>
          <Button size="sm" onClick={() => nv.key && nv.name && act(() => apiClient.addCatalog2Variation(version.id, nv), "Variação criada.").then(() => setNv({ key: "", name: "" }))}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
function AddOptionRow({ onAdd }: { onAdd: (b: any) => void }) {
  const [o, setO] = useState({ key: "", label: "" });
  return (
    <li className="flex items-end gap-2">
      <Field label="key"><Input value={o.key} onChange={(e) => setO({ ...o, key: e.target.value })} /></Field>
      <Field label="rótulo"><Input value={o.label} onChange={(e) => setO({ ...o, label: e.target.value })} /></Field>
      <AddBtn onClick={() => o.key && o.label && (onAdd(o), setO({ key: "", label: "" }))}>Adicionar opção</AddBtn>
    </li>
  );
}
function EffectList({ effects, readOnly, onAdd, onDel }: any) {
  const [e, setE] = useState<any>({ effect_type: "add_deadline_days", effect_value: "", charge_scope: "recurring" });
  const money = e.effect_type === "add_fixed_amount" || e.effect_type === "add_percent";
  return (
    <div className="mt-1 ml-2 border-l-2 border-neutral-200 pl-2 dark:border-neutral-700">
      {(effects ?? []).map((ef: any) => (
        <div key={ef.id} className="flex items-center justify-between text-xs text-neutral-500">
          <span>{ef.effect_type} = {ef.effect_value}{(ef.effect_type === "add_fixed_amount" || ef.effect_type === "add_percent") && ef.charge_scope ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">{chargeScopeLabel(ef.charge_scope)}{ef.charge_scope === "per_cycle" ? ` (ciclo ${ef.charge_start_cycle}${ef.charge_end_cycle != null ? ` a ${ef.charge_end_cycle}` : "+"})` : ef.charge_scope === "per_quantity" && ef.charge_quantity ? ` ×${ef.charge_quantity}` : ""}</span> : null}</span>
          {!readOnly && <button className="text-red-500" onClick={() => onDel(ef.id)}>×</button>}
        </div>
      ))}
      {!readOnly && (
        <div className="mt-1 flex items-center gap-1">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 text-xs dark:border-neutral-700" value={e.effect_type} onChange={(ev) => setE({ ...e, effect_type: ev.target.value })}>
            {EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input className="h-6 text-xs" value={e.effect_value} onChange={(ev) => setE({ ...e, effect_value: ev.target.value })} placeholder="valor" />
          <Button size="sm" variant="ghost" className="h-6" onClick={() => e.effect_value && (onAdd(money ? e : { effect_type: e.effect_type, effect_value: e.effect_value }), setE({ ...e, effect_value: "" }))}><Plus className="h-3 w-3" /></Button>
        </div>
      )}
      {!readOnly && money && (
        <div className="mt-1"><ChargeScopeFields value={e} onChange={(v) => setE({ ...e, ...v })} /></div>
      )}
    </div>
  );
}

// ── 4. Adicionais ────────────────────────────────────────────────────
function AddonsTab({ version, readOnly, act }: any) {
  const [na, setNa] = useState({ key: "", name: "", base_cost: "" });
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Escolhas OPCIONAIS. Uma contratação sem adicional continua válida.</p>
      {version.addons.map((a: any, ai: number) => (
        <details open key={a.id} className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden" title="Clique para recolher ou expandir">
            <div className="flex items-center gap-1.5"><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />{a.name} <span className="text-xs text-neutral-400">({a.key}){a.base_cost != null ? ` · R$ ${a.base_cost}` : ""}</span></div>
            {!readOnly && <span onClick={(e) => e.preventDefault()}><DeleteBtn label="Remover adicional?" tip="Remover este adicional" onConfirm={() => act(() => apiClient.deleteCatalog2Addon(a.id), "Adicional removido.")} /></span>}
          </summary>
          <AddonSettings a={a} index={ai} list={version.addons} version={version} readOnly={readOnly} act={act} />
          <EffectList effects={a.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2AddonEffect(a.id, b), "Efeito adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2AddonEffect(id), "Efeito removido.")} />
        </details>
      ))}
      {!readOnly && (
        <div className="flex items-end gap-2">
          <Field label="key"><Input value={na.key} onChange={(e) => setNa({ ...na, key: e.target.value })} /></Field>
          <Field label="nome"><Input value={na.name} onChange={(e) => setNa({ ...na, name: e.target.value })} /></Field>
          <Field label="custo (opcional)"><Input type="number" value={na.base_cost} onChange={(e) => setNa({ ...na, base_cost: e.target.value })} /></Field>
          <Button size="sm" onClick={() => na.key && na.name && act(() => apiClient.addCatalog2Addon(version.id, { key: na.key, name: na.name, base_cost: na.base_cost ? Number(na.base_cost) : null }), "Adicional criado.").then(() => setNa({ key: "", name: "", base_cost: "" }))}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}

// ── 5. Tarefas e etapas ─────────────────────────────────────────────
// Reunião 2026-09-14 (Item 3, "Cadastro integrado do produto"): "Selecionar
// existente" busca tarefas de QUALQUER produto e IMPORTA (copia) pra esta
// versão — Catalog2Task pertence a uma única versão, então não existe
// vínculo por referência aqui (diferente de especialidade/questionário,
// que são bibliotecas compartilhadas de verdade). "Criar nova" continua o
// formulário inline já existente.
// Modalidades de contratação (vale para qualquer produto): avulso, recorrente mensal,
// recorrente com implementação inicial, só em pacote. Congelada junto com a versão.
// ── Peças visuais compactas (layout profissional) ──────────────────────
// Cartão recolhível de configuração do produto (modalidades, pré-requisitos, acessos).
function SetupCard({ icon: Icon, title, summary, children, defaultOpen = false, onToggle, scroll = false }: { icon: React.ComponentType<{ className?: string }>; title: string; summary?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; onToggle?: (e: React.SyntheticEvent<HTMLDetailsElement>) => void; scroll?: boolean }) {
  return (
    <details open={defaultOpen || undefined} onToggle={onToggle} className="group h-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><Icon className="h-3.5 w-3.5" /></span>
        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {summary != null && <span title={typeof summary === "string" ? summary : undefined} className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{summary}</span>}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className={`min-w-0 space-y-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800 ${scroll ? "max-h-56 overflow-y-auto overflow-x-hidden" : ""}`}>{children}</div>
    </details>
  );
}
// Botãozinho com quadradinho de marcar.
function CheckPill({ checked, onChange, disabled, hint, children }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label title={hint} className={`inline-flex select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${checked ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"} ${disabled ? "cursor-default opacity-70" : "cursor-pointer"}`}>
      <input type="checkbox" className="sr-only" disabled={disabled} checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"}`}>{checked && <Check className="h-3 w-3" strokeWidth={3} />}</span>
      {children}
    </label>
  );
}
// Botão SALVAR padrão: degradê da marca (o mesmo do cabeçalho), ícone de disquete.
function SaveButton({ children, onClick, disabled, icon = true }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; icon?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(110,44,150,0.28)] ring-1 ring-white/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {icon && <Save className="h-3.5 w-3.5" />}{children}
    </button>
  );
}
// Botão de ação secundária (adicionar…): contorno na cor da marca.
function AddBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
      <Plus className="h-3.5 w-3.5" />{children}
    </button>
  );
}
// Botão de ícone COM dica ao passar o mouse (e rótulo para leitor de tela).
function IconBtn({ label, onClick, disabled, tone = "neutral", children }: { label: string; onClick?: () => void; disabled?: boolean; tone?: "neutral" | "danger" | "ok"; children: React.ReactNode }) {
  const tones = {
    neutral: "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    danger: "text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40",
    ok: "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
  } as const;
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" disabled={disabled} aria-label={label} onClick={onClick} className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30 ${tones[tone]}`}>{children}</button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[16rem] text-xs leading-snug">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
// Campo compacto (rótulo pequeno em cima).
function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-0.5"><span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>{children}</label>;
}
const MINI_SELECT = "h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900";
// Etiqueta de informação (executor, especialidade, tempo…).
function MetaChip({ children, title }: { children: React.ReactNode; title?: string }) {
  return <span title={title} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{children}</span>;
}

function ContractModesSection({ version, readOnly, act }: any) {
  const pick = () => ({
    accepts_one_time: version.accepts_one_time ?? true,
    accepts_recurring: version.accepts_recurring ?? false,
    has_initial_implementation: version.has_initial_implementation ?? false,
    implementation_rule: version.implementation_rule ?? "first_only",
    implementation_blocks_operation: version.implementation_blocks_operation ?? true,
    sell_mode: version.sell_mode ?? "standalone",
    show_executor_name: version.show_executor_name ?? false,
    pricing_mode: version.pricing_mode ?? "calculated",
    manual_price: version.manual_price ?? null,
    manual_deadline_days: version.manual_deadline_days ?? null,
  });
  const [f, setF] = useState<any>(pick);
  const sig = JSON.stringify(pick());
  useEffect(() => { setF(pick()); }, [version.id, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  // Marcou e não clicou em "Salvar modalidades"? O editor grava antes de salvar rascunho/prévia/sair.
  const registerFlusher = useContext(FlushCtx);
  const fRef = useRef(f); fRef.current = f;
  const sigRef = useRef(sig); sigRef.current = sig;
  const actRef = useRef(act); actRef.current = act;
  useEffect(() => registerFlusher(async () => {
    if (readOnly || JSON.stringify(fRef.current) === sigRef.current) return;
    await actRef.current(() => apiClient.updateCatalog2VersionInfo(version.id, fRef.current));
  }), [registerFlusher, readOnly, version.id]);
  const set = (patch: Partial<typeof f>) => setF((cur: any) => ({ ...cur, ...patch }));
  const summary = [f.accepts_one_time && "Avulso", f.accepts_recurring && (f.has_initial_implementation ? "Assinatura mensal com implementação inicial" : "Assinatura mensal"), f.sell_mode === "package_only" && "Somente em pacote"].filter(Boolean).join(" · ") || "Nenhuma modalidade";
  return (
    <SetupCard icon={Settings2} title="Modalidades de contratação" summary={summary} defaultOpen>
      <CommercialConsistencyBanner version={version} readOnly={readOnly} act={act} />
      <p className="mb-2 text-[11px] text-slate-500">
        Três coisas diferentes: <strong>modalidades de compra</strong> (avulso e/ou assinatura mensal — abaixo), <strong>tipo de entrega</strong> (única ou mensal recorrente — Passo 4) e <strong>implementação inicial</strong> (própria regra, não é forma de pagamento).
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <CheckPill disabled={readOnly} checked={f.accepts_one_time} onChange={(v) => set({ accepts_one_time: v })} hint="Compra de um único mês/ciclo, sem renovação">Avulso</CheckPill>
        <CheckPill disabled={readOnly} checked={f.accepts_recurring} onChange={(v) => set({ accepts_recurring: v })} hint="Assinatura: cobra e renova todo mês. Exige a entrega mensal recorrente marcada (Passo 4) e o período Mensal ativo.">Assinatura mensal recorrente</CheckPill>
        <CheckPill disabled={readOnly} checked={f.has_initial_implementation} onChange={(v) => set({ has_initial_implementation: v })} hint="Implantação, configuração ou diagnóstico antes da rotina">Implementação inicial</CheckPill>
        <CheckPill disabled={readOnly} checked={f.show_executor_name} onChange={(v) => set({ show_executor_name: v })} hint="Por padrão o cliente vê só 'Especialista responsável'. Marque para mostrar o nome do profissional nesta versão.">Mostrar nome do profissional ao cliente</CheckPill>
        <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
        <select disabled={readOnly} aria-label="Venda" className="h-7 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={f.sell_mode} onChange={(e) => set({ sell_mode: e.target.value })}>
          <option value="standalone">Vendido sozinho</option>
          <option value="package_only">Só em pacote</option>
        </select>
      </div>
      <div data-testid="pricing-mode" className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs dark:bg-slate-800/50">
        <span className="font-medium text-slate-600 dark:text-slate-300" title="Como o preço desta versão é definido. Preço ou prazo indefinido bloqueia a publicação.">Preço:</span>
        <select disabled={readOnly} aria-label="Modo de preço" className="h-7 max-w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={f.pricing_mode} onChange={(e) => set({ pricing_mode: e.target.value })}>
          <option value="calculated">Calculado pelas tarefas (custo + taxas)</option>
          <option value="manual_fixed">Preço fixo informado</option>
          <option value="on_request">Sob consulta (sem preço público, sem compra automática)</option>
        </select>
        {f.pricing_mode === "manual_fixed" && (
          <>
            <label className="inline-flex items-center gap-1">R$ <input disabled={readOnly} type="number" min={0} step="0.01" aria-label="Preço fixo" className="h-7 w-28 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={f.manual_price ?? ""} onChange={(e) => set({ manual_price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            <label className="inline-flex items-center gap-1">prazo <input disabled={readOnly} type="number" min={1} aria-label="Prazo fixo em dias" className="h-7 w-20 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={f.manual_deadline_days ?? ""} onChange={(e) => set({ manual_deadline_days: e.target.value === "" ? null : Number(e.target.value) })} /> dias</label>
          </>
        )}
        <span className="basis-full text-[11px] text-slate-500">{f.pricing_mode === "calculated" ? "Custo humano, custo de IA, preço, prazo e cada modalidade precisam estar calculáveis para publicar." : f.pricing_mode === "manual_fixed" ? "Vale como avulso, primeira cobrança e renovação. Exige preço e prazo." : "Aparece como “Sob consulta”; não gera cotação nem contratação automática."}</span>
      </div>
      {f.has_initial_implementation && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs dark:bg-slate-800/50">
          <span className="font-medium text-slate-600 dark:text-slate-300">Implementação roda:</span>
          <select disabled={readOnly} className="h-7 max-w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={f.implementation_rule} onChange={(e) => set({ implementation_rule: e.target.value })}>
            {Object.entries(IMPLEMENTATION_RULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <CheckPill disabled={readOnly} checked={f.implementation_blocks_operation} onChange={(v) => set({ implementation_blocks_operation: v })} hint="As tarefas operacionais só começam depois que a implementação concluir">Bloqueia a rotina até concluir</CheckPill>
        </div>
      )}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <SaveButton onClick={() => void act(() => apiClient.updateCatalog2VersionInfo(version.id, f), "Modalidades de contratação salvas.")}>Salvar modalidades</SaveButton>
          <span className="text-[11px] text-slate-500">Em cada tarefa, escolha o tipo de ciclo e a regra de repetição.</span>
        </div>
      )}
    </SetupCard>
  );
}

// Pré-requisitos do PRODUTO: exige outro produto/tarefa/aprovação já concluído pelo mesmo cliente
// antes de começar (fora de pacote). Regras de pacote ficam em Pacotes e Dependências.
function ProductPrerequisitesSection({ productDetailId, readOnly }: any) {
  const productId: string | undefined = productDetailId;
  const [rules, setRules] = useState<any[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [options, setOptions] = useState<DependencyOptions | null>(null);
  const [open, setOpen] = useState(true);
  const load = useCallback(() => {
    if (!productId) return;
    apiClient.getCatalog2ProductPrerequisites(productId).then((r) => setRules(r.data)).catch(() => {});
  }, [productId]);
  useEffect(() => { if (open) { load(); apiClient.getCatalog2DependencyOptions().then(setOptions).catch(() => {}); apiClient.getCatalog2Products({ page_size: 100 }).then((r) => setProducts(r.data.map((p: any) => ({ id: p.id, name: p.internal_name })))).catch(() => {}); } }, [open, load]);
  if (!productId) return null;
  return (
    <SetupCard icon={Link2} title="Pré-requisitos" summary="exige outro produto, tarefa ou aprovação antes de começar" defaultOpen scroll onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <div className="space-y-2 text-xs">
        <ul className="space-y-1">
          {rules.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 px-2 py-1 dark:border-neutral-800 ${r.is_active ? "" : "opacity-50"}`}>
              <span>{r.dependent_task_key ? `Tarefa ${r.dependent_task_key}` : "Todas as tarefas"} espera {options?.target_kinds.find((k) => k.key === r.target_kind)?.label ?? r.target_kind}{r.target_product ? ` de ${r.target_product.internal_name}` : ""}{r.target_task_key ? ` › ${r.target_task_key}` : ""} — {options?.behaviors.find((b) => b.key === r.behavior)?.label ?? r.behavior}</span>
              {!readOnly && <button type="button" className="text-xs text-neutral-500 underline" onClick={async () => { await apiClient.setCatalog2DependencyRuleActive(r.id, !r.is_active); load(); }}>{r.is_active ? "desativar" : "reativar"}</button>}
            </li>
          ))}
          {rules.length === 0 && <li className="text-xs text-neutral-500">Nenhum pré-requisito: o produto pode começar sem depender de outro.</li>}
        </ul>
        {!readOnly && (
          <DependencyRuleForm
            products={products}
            dependentProductId={productId}
            options={options}
            submitLabel="Adicionar pré-requisito"
            onSubmit={async (body) => { await apiClient.addCatalog2ProductPrerequisite(productId, body); load(); }}
          />
        )}
      </div>
    </SetupCard>
  );
}

// Acessos externos que este produto exige do cliente (Google Ads, Meta, Pixel…).
// Só diz QUAIS acessos são necessários — nunca senha. A etapa padrão "Validação e
// organização dos acessos" usa esta lista.
const ACCESS_OPTIONS: [string, string][] = [
  ["google_ads", "Google Ads"], ["meta_business_manager", "Meta Business Manager"], ["ad_account", "Conta de anúncios"],
  ["pixel_capi", "Pixel / Conversions API"], ["google_analytics", "Google Analytics"], ["google_tag_manager", "Google Tag Manager"],
  ["crm", "CRM"], ["site_landing", "Site / landing page"],
];
function AccessRequirementsSection({ version, readOnly, act }: any) {
  const current: any[] = version.access_requirements ?? [];
  const build = () => {
    const sel: Record<string, { on: boolean; required: boolean }> = {};
    for (const [k] of ACCESS_OPTIONS) {
      const found = current.find((a) => a.access_type === k);
      sel[k] = { on: !!found, required: found ? found.is_required : true };
    }
    return { sel, others: current.filter((a) => a.access_type === "other").map((a) => ({ label: a.label, required: a.is_required })) };
  };
  const [st, setSt] = useState(build);
  const [newOther, setNewOther] = useState("");
  const sig = JSON.stringify(current.map((a) => [a.access_type, a.label, a.is_required]));
  useEffect(() => { setSt(build()); }, [version.id, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => act(() => apiClient.updateCatalog2AccessRequirements(version.id, [
    ...ACCESS_OPTIONS.filter(([k]) => st.sel[k].on).map(([k, label]) => ({ access_type: k, label, is_required: st.sel[k].required })),
    ...st.others.map((o) => ({ access_type: "other", label: o.label, is_required: o.required })),
  ]), "Acessos necessários salvos.");
  const total = ACCESS_OPTIONS.filter(([k]) => st.sel[k].on).length + st.others.length;
  return (
    <SetupCard icon={Lock} title="Acessos necessários" summary={`${total} selecionado${total === 1 ? "" : "s"} · nunca é pedida nem guardada senha do cliente`} defaultOpen scroll>
      <p className="text-[11px] text-slate-500">Marque o que o cliente precisa liberar (convite de usuário, papel de acesso, parceiro/agência). A etapa padrão <strong>Validação e organização dos acessos</strong> confere isso.</p>
      <div className="flex flex-wrap gap-1.5">
        {ACCESS_OPTIONS.map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <CheckPill disabled={readOnly} checked={st.sel[k].on} onChange={(v) => setSt({ ...st, sel: { ...st.sel, [k]: { ...st.sel[k], on: v } } })}>{label}</CheckPill>
            {st.sel[k].on && (
              <button type="button" disabled={readOnly} title="Clique para alternar entre obrigatório e opcional" onClick={() => setSt({ ...st, sel: { ...st.sel, [k]: { ...st.sel[k], required: !st.sel[k].required } } })} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${st.sel[k].required ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>{st.sel[k].required ? "obrigatório" : "opcional"}</button>
            )}
          </span>
        ))}
        {st.others.map((o, i) => (
          <span key={"o" + i} className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
            {o.label} <span className="text-[10px] opacity-70">(outro)</span>
            {!readOnly && <button type="button" aria-label={`Remover ${o.label}`} className="ml-0.5 text-violet-500 hover:text-red-600" onClick={() => setSt({ ...st, others: st.others.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-7 w-56 text-xs" placeholder="Outro acesso (ex.: ERP do cliente)" value={newOther} onChange={(e) => setNewOther(e.target.value)} />
          <AddBtn disabled={!newOther.trim()} onClick={() => { setSt({ ...st, others: [...st.others, { label: newOther.trim(), required: true }] }); setNewOther(""); }}>Adicionar</AddBtn>
          <SaveButton onClick={() => void save()}>Salvar acessos</SaveButton>
        </div>
      )}
    </SetupCard>
  );
}

function TasksTab({ version, productId, readOnly, refs, act, highlightTarget, highlightTaskIds, clearHighlight }: any) {
  const ringOf = useContext(RingCtx);
  const [nt, setNt] = useState({ name: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [similarAsk, setSimilarAsk] = useState<any[] | null>(null);
  // Nome igual/parecido a um modelo do catálogo? Mostra os candidatos antes de criar (nunca duplica por descuido).
  const createTask = (justification?: string) => act(() => apiClient.addCatalog2Task(version.id, { name: nt.name.trim(), client_action_id: `task-${version.id}-${Date.now()}`, ...(justification ? { duplicate_resolution: "create_anyway", duplicate_justification: justification } : {}) }), "Tarefa criada e cadastrada no catálogo global de modelos.", { rethrow: true })
    .then((result: any) => { if (result) { setNt({ name: "" }); setShowCreate(false); clearHighlight("catalog2-task-create"); } })
    .catch((e: any) => { if (e?.code === "duplicate_model_candidates" && Array.isArray(e?.data?.details?.candidates)) setSimilarAsk(e.data.details.candidates); });
  const [pickTask, setPickTask] = useState(false);
  const [viewModel, setViewModel] = useState<number | null>(null);
  const tasks = version.tasks;
  // Acordeão: cada tarefa pode ser recolhida; abre sozinha quando a prontidão aponta para ela.
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const toggleTask = (id: string) => setClosed((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div id="catalog2-tasks" className="mt-3 scroll-mt-6 space-y-3">
      {tasks.length > 1 && (
        <div className="flex items-center justify-end gap-1 text-[11px]">
          <button type="button" className="rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-white hover:text-slate-800" onClick={() => setClosed(new Set(tasks.map((x: any) => x.id)))}>Recolher todas</button>
          <span className="text-slate-300">|</span>
          <button type="button" className="rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-white hover:text-slate-800" onClick={() => setClosed(new Set())}>Expandir todas</button>
        </div>
      )}
      <p className="px-1 text-[11px] text-slate-500">Cada <strong className="text-violet-700">tarefa</strong> tem <strong className="text-sky-700">etapas</strong> dentro. Os números (<strong>Tarefa #ID</strong>, <strong>Etapa #ID</strong>) são permanentes e vêm do catálogo global de modelos — clique no número para ver o modelo. Publicada = imutável.</p>
      {tasks.map((t: any, i: number) => (
        <div key={t.id} className="rounded-xl border border-violet-200 border-l-4 border-l-violet-500 bg-white p-3 shadow-sm dark:border-violet-900/60 dark:border-l-violet-500 dark:bg-slate-900/60">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <IconBtn label={closed.has(t.id) && !highlightTaskIds.includes(t.id) ? "Expandir esta tarefa (mostrar etapas e configurações)" : "Recolher esta tarefa (esconder etapas e configurações)"} onClick={() => toggleTask(t.id)}>{closed.has(t.id) && !highlightTaskIds.includes(t.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</IconBtn><span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">Tarefa</span><span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-violet-600 px-1 text-[11px] font-bold text-white">{i + 1}</span><span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t.name}</span>
                {t.task_model_id != null && <button type="button" title="Ver o modelo global desta tarefa" onClick={() => setViewModel(t.task_model_id)} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-200">Tarefa #{t.task_model_id}</button>}
                <ModelStatusChips model={t.model} readOnly={readOnly} onSync={() => act(() => apiClient.syncCatalog2TaskModel(t.id), "Tarefa atualizada para a revisão atual do modelo global.")} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                <MetaChip title="Quem executa">{EXEC_LABEL[t.execution_mode] ?? t.execution_mode}</MetaChip>
                <MetaChip title="Especialidade">{t.specialty?.name ?? "sem especialidade"}</MetaChip>
                <MetaChip title="Tempo estimado"><Clock className="h-3 w-3" /> {fmtMinutes(t.estimated_minutes)}</MetaChip>
                <MetaChip title="Etapas desta tarefa">{t.steps.length} etapa{t.steps.length === 1 ? "" : "s"}</MetaChip>
                {t.questionnaire && <MetaChip title="Questionário vinculado">questionário: {t.questionnaire.name}</MetaChip>}
                <TaskIndicators task={t} />
              </div>
              <details className="text-[11px] text-neutral-400">
                <summary className="cursor-pointer select-none">Avançado</summary>
                <span>Identificador técnico (gerado automaticamente): <code>{t.key}</code></span>
              </details>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <IconBtn label="Mover tarefa para cima — ela passa a ser executada antes da anterior" disabled={i === 0} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, -1)))}><ChevronUp className="h-4 w-4" /></IconBtn>
                <IconBtn label="Mover tarefa para baixo — ela passa a ser executada depois da próxima" disabled={i === tasks.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, 1)))}><ChevronDown className="h-4 w-4" /></IconBtn>
                <IconBtn label="Duplicar esta tarefa (cria uma cópia dela neste produto)" onClick={() => act(() => apiClient.duplicateCatalog2Task(t.id), "Tarefa duplicada.")}><Copy className="h-4 w-4" /></IconBtn>
                <DeleteBtn label="Remover tarefa deste produto?" onConfirm={() => act(() => apiClient.deleteCatalog2Task(t.id), "Tarefa removida do produto.")} />
              </div>
            )}
          </div>
          <div className={closed.has(t.id) && !highlightTaskIds.includes(t.id) ? "hidden" : ""}>
          {!readOnly && <TaskInlineEdit task={t} refs={refs} act={act} effortHighlighted={(highlightTarget === "catalog2-task-effort" && highlightTaskIds.includes(t.id)) || ringOf("task-effort:" + t.id).includes("amber")} durationHighlighted={(highlightTarget === "catalog2-task-duration" && highlightTaskIds.includes(t.id)) || ringOf("task-duration:" + t.id).includes("amber")} effortDone={ringOf("task-effort:" + t.id).includes("emerald")} durationDone={ringOf("task-duration:" + t.id).includes("emerald")} onSaved={(target: string) => clearHighlight(target)} />}
          <ul className="mt-2 ml-2 space-y-1 border-l-2 border-sky-200 pl-3 dark:border-sky-900/60">
            {t.steps.map((st: any, si: number) => (
              <StepRow key={st.id} step={st} index={si} steps={t.steps} taskId={t.id} readOnly={readOnly} act={act} refs={refs} task={t} />
            ))}
            {!readOnly && <AddStepControl ringClass={ringOf("catalog2-step-add:" + t.id)} domId={"catalog2-step-add:" + t.id} refs={refs} task={t} act={act} />}
          </ul>
          </div>
        </div>
      ))}
      {!readOnly && (
        <div id="catalog2-task-create" className={`space-y-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900/60 dark:bg-violet-950/10 ${ringOf("catalog2-task-create")}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(110,44,150,0.3)] ring-1 ring-white/20 transition hover:brightness-110 active:scale-[0.98]"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25"><Plus className="h-3 w-3" strokeWidth={3} /></span> Adicionar tarefa <ChevronDown className="h-3.5 w-3.5 opacity-80" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setPickTask(true); setShowCreate(false); }}><Search className="h-4 w-4" /> Selecionar modelo existente</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Criar nova tarefa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {showCreate && (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Nome da nova tarefa"><Input className="w-72" value={nt.name} onChange={(e) => setNt({ name: e.target.value })} /></Field>
              <Button size="sm" disabled={!nt.name.trim()} onClick={() => void createTask()}>Criar tarefa</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <p className="w-full text-xs text-neutral-500">A nova tarefa recebe um número próprio (Tarefa #ID) e fica disponível no catálogo global para outros produtos. Depois de criada, ajuste executor, especialidade e tempo no cartão dela.</p>
            </div>
          )}
        </div>
      )}
      <ModelPickerDialog kind="task" open={pickTask} refs={refs} onClose={() => setPickTask(false)} onPick={(id) => act(() => apiClient.addCatalog2TaskFromModel(version.id, id), "Tarefa adicionada a partir do modelo global.")} />
      {similarAsk && <SimilarModelsDialog kind="task" similar={similarAsk} onCancel={() => setSimilarAsk(null)} onUse={(id) => { setSimilarAsk(null); void act(() => apiClient.addCatalog2TaskFromModel(version.id, id), "Tarefa adicionada a partir do modelo global.").then(() => { setNt({ name: "" }); setShowCreate(false); }); }} onCreateAnyway={(why) => { setSimilarAsk(null); void createTask(why); }} />}
      {viewModel != null && <TaskModelInfoDialog id={viewModel} onClose={() => setViewModel(null)} />}
    </div>
  );
}

const SpecialtySelect = ({ refs, value, onChange, emptyLabel }: any) => (
  <select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">{emptyLabel}</option>
    {(refs?.specialties ?? []).map((sp: any) => <option key={sp.id} value={sp.id}>{sp.name}{sp.max_hourly_rate == null ? " (sem valor/hora)" : ""}</option>)}
  </select>
);

function StepRow({ step, index, steps, taskId, readOnly, act, refs, task }: any) {
  const [editing, setEditing] = useState(false);
  const [viewModel, setViewModel] = useState(false);
  const [scopeAsk, setScopeAsk] = useState(false);
  const initial = () => ({ name: step.name, estimated_minutes: step.estimated_minutes ?? "", specialty_id: step.specialty_id ?? "", purpose: step.purpose ?? "execucao", execution_mode: step.execution_mode ?? "humano", completion_criteria: step.completion_criteria ?? "", first_execution_only: !!step.first_execution_only, skip_when_same_executor: !!step.skip_when_same_executor, description: step.description ?? "", ops: (step.ops ?? {}) as any });
  const [f, setF] = useState(initial);
  const specName = (refs?.specialties ?? []).find((sp: any) => sp.id === (step.specialty_id ?? task?.specialty?.id))?.name;
  const payload = () => ({ name: f.name, estimated_minutes: f.estimated_minutes === "" ? null : Number(f.estimated_minutes), specialty_id: f.specialty_id || null, purpose: f.purpose, execution_mode: f.execution_mode, completion_criteria: f.completion_criteria.trim() ? f.completion_criteria : null, first_execution_only: f.first_execution_only, skip_when_same_executor: f.skip_when_same_executor, description: f.description.trim() ? f.description : null, ops: f.ops });
  const doSave = (scope?: "product" | "model") => act(() => apiClient.updateCatalog2Step(step.id, { ...payload(), ...(scope ? { scope } : {}), ...(scope === "model" ? { confirm_model_update: true } : {}) }), "Etapa salva.").then(() => setEditing(false));
  const save = () => (step.step_model_id != null ? setScopeAsk(true) : void doSave());
  if (editing) {
    return (
      <li className="space-y-2 rounded border border-neutral-200 p-2 dark:border-neutral-800">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nome"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Finalidade"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Executor"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={f.execution_mode} onChange={(e) => setF({ ...f, execution_mode: e.target.value })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Especialidade"><SpecialtySelect refs={refs} value={f.specialty_id} onChange={(v: string) => setF({ ...f, specialty_id: v })} emptyLabel="(usa a da tarefa)" /></Field>
          <Field label="Min"><Input className="w-20" type="number" value={f.estimated_minutes} onChange={(e) => setF({ ...f, estimated_minutes: e.target.value })} /></Field>
        </div>
        <Field label="Critério de conclusão"><Input value={f.completion_criteria} onChange={(e) => setF({ ...f, completion_criteria: e.target.value })} placeholder="Quando esta etapa pode ser considerada concluída?" /></Field>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-1" title="Nunca se repete nos ciclos seguintes"><input type="checkbox" checked={f.first_execution_only} onChange={(e) => setF({ ...f, first_execution_only: e.target.checked })} /> somente na primeira execução</label>
          <label className="flex items-center gap-1" title="Se o mesmo executor for mantido no ciclo seguinte, esta etapa é dispensada"><input type="checkbox" checked={f.skip_when_same_executor} onChange={(e) => setF({ ...f, skip_when_same_executor: e.target.checked })} /> dispensável quando o mesmo executor continua</label>
        </div>
        <Field label="Descrição da etapa"><Textarea rows={2} maxLength={8000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-0 text-xs" /></Field>
        <StepOpsForm value={f.ops} onChange={(v) => setF({ ...f, ops: v })} />
        <div className="flex gap-2">
          <SaveButton onClick={save}>Salvar</SaveButton>
          <Button size="sm" variant="ghost" onClick={() => { setF(initial()); setEditing(false); }}>Cancelar</Button>
        </div>
        <ModelScopeDialog open={scopeAsk} kindLabel="etapa" modelId={step.step_model_id} onCancel={() => setScopeAsk(false)} onChoose={(sc) => { setScopeAsk(false); void doSave(sc); }} />
      </li>
    );
  }
  return (
    <li className="rounded-lg bg-sky-50/70 px-2.5 py-1.5 text-[13px] dark:bg-sky-950/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300">Etapa</span><span className="flex h-4 min-w-4 items-center justify-center rounded bg-sky-500 px-1 text-[10px] font-bold text-white">{index + 1}</span><span className="font-medium text-slate-800 dark:text-slate-100">{step.name}</span>
            {step.step_model_id != null && <button type="button" title="Ver o modelo global desta etapa" onClick={() => setViewModel(true)} className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200">Etapa #{step.step_model_id}</button>}
            <ModelStatusChips model={step.model} readOnly={readOnly} onSync={() => act(() => apiClient.syncCatalog2StepModel(step.id), "Etapa atualizada para a revisão atual do modelo global.")} />
            {step.first_execution_only && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">Só na 1ª execução</span>}
            {step.skip_when_same_executor && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Dispensável c/ mesmo executor</span>}
            {step.is_access_validation && <span title="Bloqueia as etapas seguintes até os acessos serem validados" className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Pré-requisito: acessos</span>}
            {task?.effort_is_provisional && !readOnly && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">revisar</span>}
          </div>
          <div className="text-xs text-neutral-500">
            {PURPOSE_LABEL[step.purpose] ?? step.purpose} · {EXEC_LABEL[step.execution_mode] ?? step.execution_mode} · {specName ?? "sem especialidade"} · {fmtMinutes(step.estimated_minutes)}{step.is_conditional ? " · condicional" : ""}
          </div>
          {step.completion_criteria && <div className="text-xs text-neutral-500">Critério de conclusão: {step.completion_criteria}</div>}
        </div>
        {!readOnly && (
          <span className="flex shrink-0 gap-1">
            {task?.effort_is_provisional && (
              <button
                className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                title="Conferi esta etapa (nome, horas e especialidade) — confirmar"
                onClick={() => act(() => apiClient.updateCatalog2Step(step.id, { name: step.name, estimated_minutes: step.estimated_minutes ?? null, specialty_id: step.specialty_id ?? task?.specialty?.id ?? null }), "Etapa confirmada.")}
              >Ok</button>
            )}
            <IconBtn label="Editar esta etapa (nome, executor, especialidade, tempo…)" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Mover etapa para cima — ela passa a acontecer antes da anterior" disabled={index === 0} onClick={() => act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, -1)))}><ChevronUp className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Mover etapa para baixo — ela passa a acontecer depois da próxima" disabled={index === steps.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, 1)))}><ChevronDown className="h-3.5 w-3.5" /></IconBtn>
            <DeleteBtn label="Remover etapa desta tarefa?" onConfirm={() => act(() => apiClient.deleteCatalog2Step(step.id), "Etapa removida da tarefa.")} />
          </span>
        )}
      </div>
      {viewModel && step.step_model_id != null && <TaskModelInfoDialog kind="step" id={step.step_model_id} onClose={() => setViewModel(false)} />}
    </li>
  );
}

function TaskInlineEdit({ task, refs, act, effortHighlighted, durationHighlighted, effortDone, durationDone, onSaved }: any) {
  const [t, setT] = useState({ execution_mode: task.execution_mode, estimated_minutes: task.estimated_minutes ?? "", specialty_id: task.specialty?.id ?? "", is_conditional: task.is_conditional, requires_review: task.requires_review, requires_client_approval: task.requires_client_approval, requires_qualification: task.requires_qualification ?? false, cycle_type: task.cycle_type ?? "recorrente", repeat_rule: task.repeat_rule ?? "all_cycles", repeat_every_cycles: task.repeat_every_cycles ?? "", executor_continuity: task.executor_continuity ?? "not_allowed", asset_rule: task.asset_rule ?? "first_only", asset_revalidate_days: task.asset_revalidate_days ?? "" });
  const [scopeAsk, setScopeAsk] = useState(false);
  const [showNewSpecialty, setShowNewSpecialty] = useState(false);
  // Guia operacional (Pedido 3): descrição, objetivo, instruções, entradas, saída, critério de aceite, riscos + quem vê cada um.
  const [descT, setDescT] = useState<string>(task.description ?? "");
  const [opsT, setOpsT] = useState<any>(task.ops ?? {});
  const [qualifier, setQualifier] = useState<string>(task.qualifier_user_id ?? "");
  const [reviewer, setReviewer] = useState<string>(task.reviewer_user_id ?? "");
  const [reviewMin, setReviewMin] = useState<string>(task.review_minutes == null ? "" : String(task.review_minutes));
  const [reviewSpec, setReviewSpec] = useState<string>(task.review_specialty_id ?? "");
  const [qualifiers, setQualifiers] = useState<{ id: string; name: string; kind: string }[]>([]);
  useEffect(() => {
    if ((t.requires_qualification || t.requires_review) && qualifiers.length === 0) apiClient.getCatalog2Qualifiers().then((r) => setQualifiers(r.data)).catch(() => {});
  }, [t.requires_qualification, t.requires_review]); // eslint-disable-line react-hooks/exhaustive-deps
  const doSaveTask = (scope?: "product" | "model") => act(
    () => apiClient.updateCatalog2Task(task.id, { ...t, description: descT.trim() ? descT : null, ops: opsT, qualifier_user_id: t.requires_qualification ? (qualifier || null) : null, reviewer_user_id: t.requires_review ? (reviewer || null) : null, review_minutes: t.requires_review && reviewMin !== "" ? Number(reviewMin) : null, review_specialty_id: t.requires_review ? (reviewSpec || null) : null, estimated_minutes: t.estimated_minutes === "" ? null : Number(t.estimated_minutes), specialty_id: t.specialty_id || null, repeat_every_cycles: t.repeat_rule === "every_n_cycles" && t.repeat_every_cycles !== "" ? Number(t.repeat_every_cycles) : null, asset_revalidate_days: t.asset_rule === "every_x_days" && t.asset_revalidate_days !== "" ? Number(t.asset_revalidate_days) : null, ...(scope ? { scope } : {}), ...(scope === "model" ? { confirm_model_update: true } : {}) }),
    scope === "model" ? "Modelo global atualizado." : "Tarefa salva."
  ).then((result: any) => {
    if (!result) return;
    if (effortHighlighted) onSaved("catalog2-task-effort");
    if (durationHighlighted && t.estimated_minutes !== "" && Number(t.estimated_minutes) >= 0) onSaved("catalog2-task-duration");
  });
  // Tarefa vinculada a modelo global: sempre pergunta ONDE aplicar (só neste produto x modelo global).
  const saveTask = () => (task.task_model_id != null ? setScopeAsk(true) : void doSaveTask());
  return (
    <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/30" open={effortHighlighted || durationHighlighted || !!effortDone || !!durationDone ? true : undefined}>
    <summary className="cursor-pointer select-none text-[12px] font-semibold text-slate-600 dark:text-slate-300">Configurar tarefa <span className="font-normal text-slate-400">(executor, especialidade, tempo, ciclo, acessos, questionário…)</span></summary>
    <div className="space-y-2 pt-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.execution_mode} onChange={(e) => setT({ ...t, execution_mode: e.target.value })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className={`rounded border bg-transparent px-1 py-0.5 dark:border-neutral-700 ${effortDone ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : effortHighlighted ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-900/30" : "border-neutral-300"}`} value={t.specialty_id} onChange={(e) => setT({ ...t, specialty_id: e.target.value })}><option value="">sem especialidade</option>{refs.specialties.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <button type="button" className="text-neutral-500 underline hover:text-neutral-900 dark:hover:text-neutral-100" onClick={() => setShowNewSpecialty((v) => !v)}>+ nova especialidade</button>
        <label>min <input id={"task-duration:" + task.id} type="number" className={`w-16 rounded border bg-transparent px-1 dark:border-neutral-700 ${durationDone || effortDone ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : durationHighlighted || effortHighlighted ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-900/30" : "border-neutral-300"}`} value={t.estimated_minutes} onChange={(e) => setT({ ...t, estimated_minutes: e.target.value })} /></label>
        <label><input type="checkbox" checked={t.is_conditional} onChange={(e) => setT({ ...t, is_conditional: e.target.checked })} /> condicional</label>
        <label title="A entrega passa por uma revisão técnica de um revisor ANTES da qualificação e da aprovação. Tem rodadas e pode devolver ao executor."><input type="checkbox" checked={t.requires_review} onChange={(e) => setT({ ...t, requires_review: e.target.checked })} /> revisão obrigatória</label>
        <label><input type="checkbox" checked={t.requires_client_approval} onChange={(e) => setT({ ...t, requires_client_approval: e.target.checked })} /> aprovação cliente</label>
        <label className="flex items-center gap-1">ciclo
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.cycle_type} onChange={(e) => setT({ ...t, cycle_type: e.target.value })}>{Object.entries(CYCLE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="flex items-center gap-1">repetição
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.repeat_rule} onChange={(e) => setT({ ...t, repeat_rule: e.target.value })}>{Object.entries(REPEAT_RULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {t.repeat_rule === "every_n_cycles" && <input type="number" min={1} className="w-14 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={t.repeat_every_cycles} onChange={(e) => setT({ ...t, repeat_every_cycles: e.target.value })} />}
        </label>
        <label className="flex items-center gap-1" title="Quando a etapa de validação dos acessos pode ser dispensada ou precisa repetir">acessos
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.asset_rule} onChange={(e) => setT({ ...t, asset_rule: e.target.value })}>{Object.entries(ASSET_RULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {t.asset_rule === "every_x_days" && <input type="number" min={1} placeholder="dias" className="w-14 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={t.asset_revalidate_days} onChange={(e) => setT({ ...t, asset_revalidate_days: e.target.value })} />}
        </label>
        <label className="flex items-center gap-1" title="Permitir continuidade com o mesmo executor do ciclo anterior">continuidade
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.executor_continuity} onChange={(e) => setT({ ...t, executor_continuity: e.target.value })}>{Object.entries(CONTINUITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label title="A entrega concluída só é aceita depois da aprovação de um líder/qualificador"><input type="checkbox" checked={t.requires_qualification} onChange={(e) => setT({ ...t, requires_qualification: e.target.checked })} /> qualificação obrigatória</label>
        <Button id={"task-effort:" + task.id} size="sm" variant="outline" className={`h-6 ${effortDone ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : effortHighlighted ? "border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-400 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-100" : ""}`} onClick={saveTask}>Salvar tarefa</Button>
      </div>
      {t.requires_review && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs dark:bg-purple-950/20" title="Quem confere a entrega antes da qualificação e da aprovação. Sem escolha, o sistema usa o líder responsável da tarefa.">
          <span className="font-semibold">Revisão:</span>
          <select aria-label="Revisor" className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
            <option value="">Líder responsável (automático)</option>
            {qualifiers.map((q) => <option key={q.id} value={q.id}>{q.name} · {q.kind === "admin" ? "administrador" : "líder"}</option>)}
          </select>
          <label className="inline-flex items-center gap-1">Tempo previsto
            <input type="number" min={0} max={10000} className="h-7 w-16 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={reviewMin} onChange={(e) => setReviewMin(e.target.value)} />
            min
          </label>
          <select aria-label="Especialidade da revisão" className="h-7 max-w-[14rem] rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={reviewSpec} onChange={(e) => setReviewSpec(e.target.value)} title="Define o valor/hora usado no custo da revisão. Sem escolha, vale a reserva percentual de revisão da Precificação.">
            <option value="">Custo pela reserva % de revisão</option>
            {(refs?.specialties ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      {t.requires_qualification && (
        <label className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs dark:bg-amber-950/20" title="Quem aprova a entrega antes da agência e do cliente. Sem escolha, o sistema usa o líder da área.">
          <span className="font-semibold">Qualificador:</span>
          <select className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={qualifier} onChange={(e) => setQualifier(e.target.value)}>
            <option value="">Líder da área (automático)</option>
            {qualifiers.map((q) => <option key={q.id} value={q.id}>{q.name} · {q.kind === "admin" ? "administrador" : "líder"}</option>)}
          </select>
          <span className="text-[10px] text-slate-500">Uma pessoa por tarefa. A estrutura já está pronta para mais de um no futuro.</span>
        </label>
      )}
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Guia da tarefa <span className="font-normal normal-case">— aparece para quem executa, aprova ou contrata, conforme a visibilidade escolhida em cada campo</span></p>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Descrição</span>
          <Textarea rows={2} maxLength={8000} value={descT} onChange={(e) => setDescT(e.target.value)} className="min-h-0 text-xs" />
        </label>
        <TaskOpsForm value={opsT} onChange={setOpsT} />
      </div>
      <TaskDeliverablesEditor task={task} act={act} />
      {effortHighlighted && <p className="text-amber-700 dark:text-amber-300">Dados provisórios de teste: revise os valores já preenchidos e clique em <strong>Salvar tarefa</strong> para confirmá-los como dados reais.</p>}
      {showNewSpecialty && (
        <NewSpecialtyForm
          onCreated={(s: any) => { setT((c) => ({ ...c, specialty_id: s.id })); setShowNewSpecialty(false); }}
          act={act}
        />
      )}
      {(t.execution_mode === "ia" || t.execution_mode === "hibrido") && <AiConfig task={task} act={act} />}
      <QuestionnaireSection task={task} refs={refs} act={act} />
      {task.task_model_id != null && <ModelScopeDialog open={scopeAsk} kindLabel="tarefa" modelId={task.task_model_id} onCancel={() => setScopeAsk(false)} onChoose={(sc) => { setScopeAsk(false); void doSaveTask(sc); }} />}
    </div>
    </details>
  );
}

// "Cadastrar uma nova [especialidade] durante a configuração da tarefa,
// respeitando a permissão administrativa atual" (Item 3) — reaproveita
// POST /specialties (guardAdminMaster já se aplica a toda a rota).
function NewSpecialtyForm({ onCreated, act }: { onCreated: (s: any) => void; act: any }) {
  const [f, setF] = useState({ key: "", name: "", max_hourly_rate: "" });
  return (
    <div className="flex items-end gap-2 rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
      <Field label="key"><Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>
      <Field label="nome"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="valor/hora (opcional)"><Input type="number" value={f.max_hourly_rate} onChange={(e) => setF({ ...f, max_hourly_rate: e.target.value })} /></Field>
      <Button
        size="sm"
        onClick={() =>
          f.key && f.name &&
          act(() => apiClient.addCatalog2Specialty({ key: f.key, name: f.name, max_hourly_rate: f.max_hourly_rate ? Number(f.max_hourly_rate) : null }), "Especialidade criada.")
            .then((s: any) => s && onCreated(s))
        }
      >
        Criar especialidade
      </Button>
    </div>
  );
}

// "No ponto de vínculo previsto pelo modelo atual" (Item 3): a tarefa é o
// ponto real de briefing — cada tarefa pode VINCULAR (referência, nunca
// cópia) um questionário da biblioteca compartilhada. Editar um
// questionário aqui afeta toda tarefa que já o vincula, em qualquer produto
// — SALVO quando o backend detecta compartilhamento e cria uma cópia
// própria automaticamente (Item 3.1, PUT .../questionnaire/content):
// avisamos isso na tela quando acontece, nunca em silêncio.
function QuestionnaireSection({ task, refs, act }: any) {
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectId, setSelectId] = useState("");
  const q = task.questionnaire;

  if (q) {
    if (showEdit) {
      return <EditQuestionnaireForm task={task} act={act} onDone={() => setShowEdit(false)} onCancel={() => setShowEdit(false)} />;
    }
    return (
      <div className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium">Questionário: {q.name}</span>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setShowEdit(true)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.setCatalog2TaskQuestionnaire(task.id, null), "Questionário desvinculado.")}>
              <Unlink className="h-3.5 w-3.5" /> Desvincular
            </Button>
          </div>
        </div>
        {q.description && <p className="mt-0.5 text-neutral-500">{q.description}</p>}
        <ul className="mt-1 ml-3 list-disc space-y-0.5">
          {q.questions.map((qq: any) => (
            <li key={qq.id}>{qq.label} {qq.is_required && <span className="text-red-500">*</span>} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600" title="Tipo da pergunta">{questionTypeLabel(qq.question_type)}</span></li>
          ))}
          {q.questions.length === 0 && <li className="list-none text-neutral-400">Nenhuma pergunta ainda — clique em "Editar" pra adicionar.</li>}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setShowPicker((v) => !v); setShowCreate(false); }}><Link2 className="h-3.5 w-3.5" /> Selecionar questionário existente</Button>
        <Button size="sm" variant="outline" onClick={() => { setShowCreate((v) => !v); setShowPicker(false); }}><Plus className="h-3.5 w-3.5" /> Criar novo questionário</Button>
      </div>
      {showPicker && (
        <div className="flex items-end gap-2">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={selectId} onChange={(e) => setSelectId(e.target.value)}>
            <option value="">selecione…</option>
            {refs.questionnaires.map((qn: any) => <option key={qn.id} value={qn.id}>{qn.name} ({qn.question_count} pergunta(s))</option>)}
          </select>
          <Button size="sm" disabled={!selectId} onClick={() => act(() => apiClient.setCatalog2TaskQuestionnaire(task.id, selectId), "Questionário vinculado.")}>Vincular</Button>
        </div>
      )}
      {showCreate && <NewQuestionnaireForm taskId={task.id} act={act} onDone={() => setShowCreate(false)} />}
    </div>
  );
}

// Cria um questionário novo (nome + perguntas com obrigatoriedade) e já
// vincula à tarefa atual ao salvar.
function NewQuestionnaireForm({ taskId, act, onDone }: { taskId: string; act: any; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [nq, setNq] = useState({ label: "", is_required: true });
  const updateQuestion = (i: number, patch: Partial<QuestionDraft>) => setQuestions((qs) => qs.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  // Evita duplicar o questionário se o admin clicar "Criar e vincular"
  // repetidas vezes enquanto as chamadas (criar + N perguntas + vincular)
  // ainda estão em andamento.
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    if (!nq.label.trim()) return;
    const key = `p${questions.length + 1}-${nq.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
    setQuestions((qs) => [...qs, { key, label: nq.label.trim(), is_required: nq.is_required, ...emptyQuestion() }]);
    setNq({ label: "", is_required: true });
  }

  async function save() {
    if (!name.trim() || questions.length === 0) return;
    const created: any = await apiClient.addCatalog2Questionnaire({ name: name.trim(), description: description.trim() || null });
    for (const [i, q] of questions.entries()) {
      await apiClient.addCatalog2QuestionnaireQuestion(created.id, { ...payloadFromDraft(q), sort_order: i + 1 });
    }
    await apiClient.setCatalog2TaskQuestionnaire(taskId, created.id);
  }

  // `act` engole o erro internamente (só mostra a mensagem) — sem isto o
  // formulário fecharia (onDone) mesmo quando salvar falha no meio do
  // caminho, escondendo as perguntas já digitadas do admin.
  async function saveAndTrack(): Promise<boolean> {
    await save();
    return true;
  }

  return (
    <div className="space-y-2 rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
      <Field label="nome do questionário"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="descrição (opcional)"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="space-y-1">
        {questions.map((q, i) => (
          <div key={q.key} className="rounded bg-neutral-50 px-2 py-1 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <span>{i + 1}. {q.label} {q.is_required && <span className="text-red-500">*</span>} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{questionTypeLabel(q.question_type)}</span></span>
              <button type="button" aria-label="Remover pergunta" className="text-neutral-400 hover:text-red-500" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <details className="mt-1"><summary className="cursor-pointer text-[11px] text-violet-600">Tipo e configurações da pergunta</summary><div className="mt-1"><QuestionConfigFields q={q} onChange={(patch) => updateQuestion(i, patch)} /></div></details>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Field label="nova pergunta"><Input value={nq.label} onChange={(e) => setNq({ ...nq, label: e.target.value })} /></Field>
        <label><input type="checkbox" checked={nq.is_required} onChange={(e) => setNq({ ...nq, is_required: e.target.checked })} /> obrigatória</label>
        <Button size="sm" variant="outline" onClick={addQuestion}>Adicionar pergunta</Button>
      </div>
      <Button
        size="sm"
        disabled={!name.trim() || questions.length === 0 || saving}
        onClick={() => {
          setSaving(true);
          act(saveAndTrack, "Questionário criado e vinculado.").then((ok: boolean | undefined) => { if (ok) onDone(); }).finally(() => setSaving(false));
        }}
      >
        {saving ? "Salvando…" : "Criar e vincular"}
      </Button>
      {questions.length === 0 && <p className="text-neutral-400">Adicione ao menos uma pergunta antes de criar.</p>}
    </div>
  );
}

// Item 3.1 — editar título, perguntas, obrigatoriedade e ordem de um
// questionário JÁ VINCULADO, pelo próprio formulário da tarefa (sem tela
// de biblioteca separada). Reordenar é local (setas, antes de salvar);
// "Cancelar" simplesmente descarta o estado local, nada é enviado — o
// conteúdo anterior nunca é tocado. "Salvar" manda o estado final inteiro
// pro backend, que decide sozinho se precisa criar uma cópia (avisamos
// aqui quando isso acontece).
function EditQuestionnaireForm({ task, act, onDone, onCancel }: { task: any; act: any; onDone: () => void; onCancel: () => void }) {
  const q = task.questionnaire;
  const [name, setName] = useState(q.name);
  const [description, setDescription] = useState(q.description ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(q.questions.map((qq: any) => draftFromServer(qq)));
  const [nq, setNq] = useState({ label: "", is_required: true });
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    if (!nq.label.trim()) return;
    const key = `p${questions.length + 1}-${nq.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
    setQuestions((qs) => [...qs, { key, label: nq.label.trim(), is_required: nq.is_required, ...emptyQuestion() }]);
    setNq({ label: "", is_required: true });
  }
  function moveQuestion(i: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const j = i + dir;
      if (j < 0 || j >= qs.length) return qs;
      const c = [...qs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }
  function updateQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  async function save() {
    return apiClient.updateCatalog2TaskQuestionnaireContent(task.id, {
      name: name.trim(),
      description: description.trim() || null,
      questions: questions.map(payloadFromDraft),
    });
  }

  return (
    <div className="space-y-2 rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
      <Field label="nome do questionário"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="descrição (opcional)"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="space-y-1">
        {questions.map((qItem, i) => (
          <div key={qItem.key} className="space-y-1 rounded bg-neutral-50 px-2 py-1 dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-neutral-400">{i + 1}.</span>
            <Input className="flex-1" value={qItem.label} onChange={(e) => updateQuestion(i, { label: e.target.value })} />
            <label className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              <input type="checkbox" checked={qItem.is_required} onChange={(e) => updateQuestion(i, { is_required: e.target.checked })} /> obrigatória
            </label>
            <button type="button" disabled={i === 0} className="disabled:opacity-30" onClick={() => moveQuestion(i, -1)}><ChevronUp className="h-3.5 w-3.5" /></button>
            <button type="button" disabled={i === questions.length - 1} className="disabled:opacity-30" onClick={() => moveQuestion(i, 1)}><ChevronDown className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Remover pergunta" className="text-neutral-400 hover:text-red-500" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <details><summary className="cursor-pointer text-[11px] text-violet-600">Tipo: {questionTypeLabel(qItem.question_type)} · configurações</summary><div className="mt-1"><QuestionConfigFields q={qItem} onChange={(patch) => updateQuestion(i, patch)} /></div></details>
          </div>
        ))}
        {questions.length === 0 && <p className="text-neutral-400">Nenhuma pergunta — adicione abaixo.</p>}
      </div>
      <div className="flex items-end gap-2">
        <Field label="nova pergunta"><Input value={nq.label} onChange={(e) => setNq({ ...nq, label: e.target.value })} /></Field>
        <label><input type="checkbox" checked={nq.is_required} onChange={(e) => setNq({ ...nq, is_required: e.target.checked })} /> obrigatória</label>
        <Button size="sm" variant="outline" onClick={addQuestion}>Adicionar pergunta</Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || questions.length === 0 || saving}
          onClick={() => {
            setSaving(true);
            act(save, (r: any) => (r?.forked
              ? "Questionário salvo — como ele era usado por outra tarefa/versão, uma cópia própria foi criada só para esta tarefa."
              : "Questionário salvo."))
              .then((r: any) => { if (r) onDone(); })
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
      {questions.length === 0 && <p className="text-neutral-400">Adicione ao menos uma pergunta antes de salvar.</p>}
    </div>
  );
}
// Vem PRÉ-PREENCHIDA com o nome, a especialidade e as horas da própria tarefa
// (pedido do usuário: já vir preenchido, só clicar para confirmar e ajustar depois).
function AddStepControl({ refs, ringClass, domId, task, act }: { refs?: any; ringClass?: string; domId?: string; task?: any; act: any }) {
  const defaults = () => ({
    name: task?.name ?? "",
    estimated_minutes: task?.estimated_minutes != null ? String(task.estimated_minutes) : "",
    specialty_id: task?.specialty?.id ?? "",
    purpose: "execucao",
    execution_mode: task?.execution_mode ?? "humano",
    completion_criteria: "",
  });
  const [s, setS] = useState(defaults);
  const [showCreate, setShowCreate] = useState(false);
  const [pick, setPick] = useState(false);
  const [similarAsk, setSimilarAsk] = useState<any[] | null>(null);
  const createStep = (justification?: string) => act(() => apiClient.addCatalog2Step(task.id, { name: s.name.trim(), estimated_minutes: s.estimated_minutes ? Number(s.estimated_minutes) : null, specialty_id: s.specialty_id || null, purpose: s.purpose, execution_mode: s.execution_mode, completion_criteria: s.completion_criteria.trim() || null, client_action_id: `step-${task.id}-${Date.now()}`, ...(justification ? { duplicate_resolution: "create_anyway", duplicate_justification: justification } : {}) }), "Etapa criada e cadastrada no catálogo global de modelos.", { rethrow: true })
    .then((r: any) => { if (r) { setS(defaults()); setShowCreate(false); } })
    .catch((e: any) => { if (e?.code === "duplicate_model_candidates" && Array.isArray(e?.data?.details?.candidates)) setSimilarAsk(e.data.details.candidates); });
  useEffect(() => { setS(defaults()); }, [task?.id, task?.name, task?.estimated_minutes, task?.specialty?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <li id={domId} className={`space-y-2 ${ringClass ?? ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-gradient-to-b from-sky-50 to-white px-3 text-xs font-semibold text-sky-700 shadow-sm transition hover:border-sky-400 hover:from-sky-100 active:scale-[0.98] dark:border-sky-800 dark:from-sky-950/40 dark:to-slate-900 dark:text-sky-200"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white"><Plus className="h-3 w-3" strokeWidth={3} /></span> Adicionar etapa <ChevronDown className="h-3.5 w-3.5 opacity-70" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { setPick(true); setShowCreate(false); }}><Search className="h-4 w-4" /> Selecionar etapa existente</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Criar nova etapa</DropdownMenuItem>
          <DropdownMenuItem onClick={() => act(() => apiClient.addCatalog2AccessValidationStep(task.id), "Etapa \"Validação e organização dos acessos\" adicionada no início da tarefa.")}><ChevronRight className="h-4 w-4" /> Validação e organização dos acessos (padrão)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showCreate && (
        <div className="space-y-2 rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Nome"><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
            <Field label="Finalidade"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={s.purpose} onChange={(e) => setS({ ...s, purpose: e.target.value })}>{Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Executor"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={s.execution_mode} onChange={(e) => setS({ ...s, execution_mode: e.target.value })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Especialidade"><SpecialtySelect refs={refs} value={s.specialty_id} onChange={(v: string) => setS({ ...s, specialty_id: v })} emptyLabel="(usa a da tarefa)" /></Field>
            <Field label="Min"><Input className="w-20" type="number" value={s.estimated_minutes} onChange={(e) => setS({ ...s, estimated_minutes: e.target.value })} /></Field>
          </div>
          <Field label="Critério de conclusão"><Input value={s.completion_criteria} onChange={(e) => setS({ ...s, completion_criteria: e.target.value })} placeholder="Quando esta etapa pode ser considerada concluída?" /></Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={!s.name.trim()} onClick={() => void createStep()}>Criar etapa</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      {similarAsk && <SimilarModelsDialog kind="step" similar={similarAsk} onCancel={() => setSimilarAsk(null)} onUse={(id) => { setSimilarAsk(null); void act(() => apiClient.addCatalog2StepFromModel(task.id, id), "Etapa adicionada a partir do modelo global.").then(() => { setS(defaults()); setShowCreate(false); }); }} onCreateAnyway={(why) => { setSimilarAsk(null); void createStep(why); }} />}
      <ModelPickerDialog kind="step" open={pick} refs={refs} onClose={() => setPick(false)} onPick={(id) => act(() => apiClient.addCatalog2StepFromModel(task.id, id), "Etapa adicionada a partir do modelo global.")} />
    </li>
  );
}

// ── 6. Condições ────────────────────────────────────────────────────
function ConditionsTab({ version, readOnly, act }: any) {
  const [c, setC] = useState({ key: "", name: "", trigger_source: "variation_option", trigger_ref: "", operator: "selected", comparison_value: "", effect_type: "add_deadline_days", effect_value: "", charge_scope: "recurring" } as any);
  return (
    <div className="mt-3 space-y-2">
      <p className="px-1 text-[11px] text-slate-500">Regras tipadas (gatilho → efeito), sem código livre. O construtor recusa condições incompletas ou que apontem para tarefas/opções inexistentes.</p>
      {version.conditions.map((x: any) => (
        <div key={x.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-slate-50">{x.name}</span>
              {!x.is_active && <Badge className="bg-neutral-200 text-neutral-500">inativa</Badge>}
            </div>
            <p className="text-xs text-slate-500">{x.explanation}</p>
          </div>
          {!readOnly && <DeleteBtn label="Excluir condição?" tip="Excluir esta condição" onConfirm={() => act(() => apiClient.deleteCatalog2Condition(x.id), "Condição removida.")} />}
        </div>
      ))}
      {version.conditions.length === 0 && <p className="px-1 text-xs text-slate-400">Nenhuma condição cadastrada.</p>}
      {!readOnly && (
        <SetupCard icon={Plus} title="Nova condição" summary="gatilho → efeito" defaultOpen>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MiniField label="Chave"><Input className="h-8 text-xs" value={c.key} onChange={(e) => setC({ ...c, key: e.target.value })} /></MiniField>
            <MiniField label="Nome"><Input className="h-8 text-xs" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></MiniField>
            <MiniField label="Gatilho"><select className={MINI_SELECT} value={c.trigger_source} onChange={(e) => setC({ ...c, trigger_source: e.target.value })}>{TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></MiniField>
            <MiniField label="Referência (chave)"><Input className="h-8 text-xs" value={c.trigger_ref} onChange={(e) => setC({ ...c, trigger_ref: e.target.value })} /></MiniField>
            <MiniField label="Operador"><select className={MINI_SELECT} value={c.operator} onChange={(e) => setC({ ...c, operator: e.target.value })}>{OPERATORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></MiniField>
            <MiniField label="Valor de comparação"><Input className="h-8 text-xs" value={c.comparison_value} onChange={(e) => setC({ ...c, comparison_value: e.target.value })} /></MiniField>
            <MiniField label="Efeito"><select className={MINI_SELECT} value={c.effect_type} onChange={(e) => setC({ ...c, effect_type: e.target.value })}>{EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></MiniField>
            <MiniField label="Valor do efeito"><Input className="h-8 text-xs" value={c.effect_value} onChange={(e) => setC({ ...c, effect_value: e.target.value })} /></MiniField>
          </div>
          {(c.effect_type === "add_fixed_amount" || c.effect_type === "add_percent") && <div className="mt-1"><ChargeScopeFields value={c as any} onChange={(v) => setC({ ...c, ...v } as any)} /></div>}
          <AddBtn onClick={() => c.key && c.name && c.effect_value && act(() => apiClient.addCatalog2Condition(version.id, { ...c, trigger_ref: c.trigger_ref || null, comparison_value: c.comparison_value || null }), "Condição criada.").then(() => setC({ ...c, key: "", name: "", effect_value: "" }))}>Adicionar condição</AddBtn>
        </SetupCard>
      )}
    </div>
  );
}

// ── 7. Custos e preço (simulador) ───────────────────────────────────
// Prazo comercial base da versão: é o que o cliente vê como prazo de entrega.
// Não é a soma das tarefas (isso é só a estimativa interna de esforço).
function DeadlineBaseField({ version, act, ringOf, locked }: any) {
  const [v, setV] = useState<string>(version.base_commercial_deadline_days == null ? "" : String(version.base_commercial_deadline_days));
  useEffect(() => { setV(version.base_commercial_deadline_days == null ? "" : String(version.base_commercial_deadline_days)); }, [version.id, version.base_commercial_deadline_days]);
  const n = Number(v);
  const valid = v !== "" && Number.isInteger(n) && n >= 1;
  const readOnly = version.state === "publicada" || !!locked;
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);
  return (
    <div id="catalog2-deadline-base" className={`h-full min-w-0 rounded-xl ${ringOf("catalog2-deadline-base")}`}>
      <SetupCard icon={CalendarClock} title="Prazo comercial base" summary={valid ? `${n} dias` : "não definido"} defaultOpen scroll>
        <p className="text-[11px] text-slate-500">Prazo prometido ao cliente nesta versão. Dias extras de variações, adicionais e condições somam a ele.</p>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} className="h-7 w-20 text-xs" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} />
          <span className="text-xs text-slate-500">dias</span>
          <SaveButton disabled={readOnly || !valid} onClick={async () => {
            setErr(null); setOkMsg(false);
            try { await act(() => apiClient.updateCatalog2VersionInfo(version.id, { base_commercial_deadline_days: n }), "Prazo comercial salvo.", { rethrow: true }); setOkMsg(true); window.setTimeout(() => setOkMsg(false), 4000); }
            catch (e: any) { setErr(e?.message ?? "Não foi possível salvar o prazo."); }
          }}>Salvar prazo</SaveButton>
        </div>
        {readOnly && <p className="text-[11px] text-amber-700">Versão publicada ou travada (somente leitura). Clique em Editar para alterar.</p>}
        {!readOnly && v !== "" && !valid && <p className="text-[11px] text-red-600">Informe um número inteiro de dias, 1 ou mais.</p>}
        {err && <p role="alert" className="text-xs font-semibold text-red-600">Não salvou: {err}</p>}
        {okMsg && <p role="status" className="text-xs font-semibold text-emerald-700">✓ Prazo salvo.</p>}
      </SetupCard>
    </div>
  );
}

function CostTab({ version, refs, act, onReloadRefs, productId, highlightTarget, clearHighlight }: any) {
  // (o aviso de configuração comercial fica no topo do painel de períodos, logo abaixo)
  const ringOf = useContext(RingCtx);
  const [sel, setSel] = useState<any>({ variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} });
  const [result, setResult] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    apiClient.getCatalog2PricingSettings().then(setPricing).catch(() => {});
    // default selection
    const opts: string[] = [];
    for (const va of version.variations) { const d = va.options.find((o: any) => o.is_default) ?? va.options[0]; if (d) opts.push(d.key); }
    setSel({ variation_option_keys: opts, addon_keys: version.addons.filter((a: any) => a.is_default_selected).map((a: any) => a.key), quantity: 1, answers: {} });
  }, [version.id]);

  const run = () => apiClient.simulateCatalog2(version.id, sel).then((r: any) => setResult(r.pricing)).catch((e: any) => setResult({ error: e?.message }));
  useEffect(() => { void run(); /* eslint-disable-next-line */ }, [JSON.stringify(sel), version.id]);

  return (
    <div id="catalog2-costs" className={`mt-3 grid items-start gap-3 scroll-mt-6 md:grid-cols-2`}>
      <SetupCard icon={DollarSign} title="Composição do preço" summary="calculada a partir das tarefas, etapas e taxas" defaultOpen>
        {highlightTarget === "catalog2-costs" && <p className="rounded-lg border border-amber-400 bg-amber-100 p-2 text-sm text-amber-950 dark:bg-amber-900/30 dark:text-amber-100">Há uma pendência comercial de preço ou prazo. Revise o valor que está marcado como “aguardando definição comercial” e salve a alteração.</p>}
        <p className="text-xs text-neutral-500">Calculada automaticamente a partir das tarefas, etapas e especialidades deste produto, mais as taxas cadastradas em Precificação.</p>
        {result?.pending_info?.length > 0 && (
          <div id="catalog2-price-pending" className={`rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 ${ringOf("catalog2-price-pending")}`}>
            <p className="font-semibold">Ainda falta para fechar o preço:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{result.pending_info.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            {result.pending_info.some((x: string) => /valor\/hora|percentual|ordem|imposto|token/i.test(x)) && (
              <button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="mt-2 rounded-lg bg-white px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">Conferir na Precificação</button>
            )}
          </div>
        )}
        {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : result && <PricingResultView r={result} />}
      </SetupCard>

      <SetupCard icon={ListChecks} title="Simular cenário" summary="variações, adicionais e quantidade" defaultOpen>
        {version.variations.map((va: any) => (
          <Field key={va.id} label={va.name}>
            <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={sel.variation_option_keys.find((k: string) => va.options.some((o: any) => o.key === k)) ?? ""} onChange={(e) => setSel({ ...sel, variation_option_keys: [...sel.variation_option_keys.filter((k: string) => !va.options.some((o: any) => o.key === k)), e.target.value] })}>
              {va.options.map((o: any) => <option key={o.id} value={o.key}>{o.label}</option>)}
            </select>
          </Field>
        ))}
        <Field label="Adicionais">
          <div className="flex flex-wrap gap-2">
            {version.addons.map((a: any) => (
              <label key={a.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={sel.addon_keys.includes(a.key)} onChange={(e) => setSel({ ...sel, addon_keys: e.target.checked ? [...sel.addon_keys, a.key] : sel.addon_keys.filter((k: string) => k !== a.key) })} />{a.name}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Quantidade"><Input type="number" value={sel.quantity} onChange={(e) => setSel({ ...sel, quantity: Number(e.target.value) || 1 })} /></Field>
        <Field label="Atributos/respostas (ex.: urgente=sim)">
          <Input placeholder="chave=valor;chave2=valor2" onBlur={(e) => {
            const answers: Record<string, string> = {};
            e.target.value.split(";").forEach((p) => { const [k, v] = p.split("="); if (k?.trim()) answers[k.trim()] = (v ?? "").trim(); });
            setSel({ ...sel, answers });
          }} />
        </Field>

      </SetupCard>

      <div className="md:col-span-2">
        <div className="mb-2"><CommercialConsistencyBanner version={version} readOnly={!!(version?.state === "publicada")} act={act} /></div>
        <ProductPeriodsPanel productId={productId} act={act} />
      </div>
    </div>
  );
}

// Item 6 (reunião 2026-09-14, "Modalidades de contratação por período") —
// mecanismo administrativo: SEMPRE mostra os 4 períodos possíveis, cada um
// com "Não configurado" até o admin definir um desconto explícito. Nenhum
// percentual padrão é sugerido — o campo nasce vazio.
function ProductPeriodsPanel({ productId, act }: { productId: string; act: (fn: () => Promise<any>, ok: string) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [deliveryRecurrence, setDeliveryRecurrence] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiClient.getCatalog2ProductPeriods(productId)
      .then((r: any) => { setRows(r.data); setDeliveryRecurrence(r.delivery_recurrence ?? null); })
      .catch(() => setRows([]));
  }, [productId]);
  useEffect(() => { load(); }, [load]);

  if (!rows) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <h3 className="text-sm font-semibold">Modalidades de contratação por período</h3>

      {/* Item 6.1 (reunião 2026-09-14, "Completar a execução dos
          períodos"): pré-requisito — sem isto, NENHUM período fica
          disponível pra contratação, mesmo com desconto configurado. */}
      <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={deliveryRecurrence === "mensal"}
            onChange={(e) => act(
              () => apiClient.updateCatalog2ProductDeliveryRecurrence(productId, e.target.checked ? "mensal" : null).then(load),
              e.target.checked ? "Produto marcado como entrega mensal recorrente." : "Entrega mensal recorrente desmarcada — períodos ficam indisponíveis até ser definida de novo.",
            )}
          />
          Tipo de entrega: MENSAL RECORRENTE (um novo lote de tarefas a cada mês do período pago) — não é o mesmo que "assinatura disponível"
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Só marque isto se o serviço realmente se repete mês a mês (ex.: gestão de redes sociais). Um produto avulso com desconto por período configurado (ex.: "pague o ano e ganhe desconto", mas a entrega é única) NÃO deve ser marcado — sem esta marcação, nenhum período fica contratável, mesmo com desconto já configurado abaixo.
        </p>
        {deliveryRecurrence !== "mensal" && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Pendência administrativa: frequência de entrega ainda não definida — nenhuma modalidade de período está disponível pra contratação.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Nesta primeira etapa, somente a contratação <strong>mensal</strong> fica disponível. Trimestral, semestral e anual permanecem registrados para ativação futura e não podem ser contratados agora.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 pr-2">Período</th>
              <th className="py-1 pr-2">Meses</th>
              <th className="py-1 pr-2">Desconto (%)</th>
              <th className="py-1 pr-2">Status</th>
              <th className="py-1 pr-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.period] ?? (row.discount_percent != null ? String(row.discount_percent) : "");
              const reservedForFuture = row.period !== "mensal";
              return (
                <tr key={row.period} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-1.5 pr-2 font-medium">{row.label}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{row.months}</td>
                  <td className="py-1.5 pr-2">
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      max={90}
                      placeholder="—"
                      value={draft}
                      disabled={reservedForFuture}
                      onChange={(e) => setDrafts((d) => ({ ...d, [row.period]: e.target.value }))}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    {reservedForFuture ? (
                      <Badge className="bg-muted text-muted-foreground">Reservado para ativação futura</Badge>
                    ) : !row.configured ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Não configurado</Badge>
                    ) : row.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Ativo</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">Desativado</Badge>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex flex-wrap gap-1.5">
                      {reservedForFuture ? (
                        <span className="text-xs text-muted-foreground">Indisponível nesta etapa</span>
                      ) : <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={draft === "" || Number.isNaN(Number(draft))}
                        onClick={() => act(() => apiClient.updateCatalog2ProductPeriod(productId, row.period, { discount_percent: Number(draft), is_active: true }).then(load), `Período "${row.label}" configurado.`)}
                      >
                        Salvar
                      </Button>
                      {row.configured && row.is_active && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => act(() => apiClient.updateCatalog2ProductPeriod(productId, row.period, { discount_percent: row.discount_percent, is_active: false }).then(load), "Período desativado.")}>
                          Desativar
                        </Button>
                      )}
                      {row.configured && !row.is_active && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => act(() => apiClient.updateCatalog2ProductPeriod(productId, row.period, { discount_percent: row.discount_percent, is_active: true }).then(load), "Período reativado.")}>
                          Reativar
                        </Button>
                      )}
                      {row.configured && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600" onClick={() => act(() => apiClient.removeCatalog2ProductPeriod(productId, row.period).then(load), "Configuração removida.")}>
                          Remover
                        </Button>
                      )}
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const PRICING_FIELD_LABEL: Record<string, string> = {
  tax_percent: "Imposto (%)",
  commission_percent: "Comissão (%)",
  operational_fee_percent: "Taxa operacional (%)",
  profit_margin_percent: "Margem de lucro (%)",
  human_review_percent: "Reserva para revisão humana (%)",
};

function SpecialtyRateRow({ specialty, isTestLocal, act, onReloadRefs }: any) {
  const initialValue = specialty.max_hourly_rate ?? "";
  const [value, setValue] = useState<string | number>(initialValue);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => setValue(specialty.max_hourly_rate ?? ""), [specialty.id, specialty.max_hourly_rate]);
  const changed = String(value) !== String(initialValue);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-40 truncate">{specialty.name}</span>
      <Input aria-label={`Valor/hora padrão: ${specialty.name}`} className="w-24" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
      <SaveButton disabled={!changed} onClick={() => setConfirmOpen(true)}>Salvar valor/hora</SaveButton>
      <Button size="sm" variant="ghost" disabled={!changed} onClick={() => setValue(initialValue)}>Restaurar padrão</Button>
      {specialty.max_hourly_rate == null && <span className="text-xs text-amber-600">aguardando definição comercial</span>}
      {specialty.max_hourly_rate != null && isTestLocal && <span className="text-xs text-amber-600">valor de teste — não é decisão comercial</span>}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Salvar valor/hora padrão?"
        message={`O valor de ${specialty.name} será aplicado automaticamente aos produtos que usam essa especialidade.`}
        confirmText="Salvar valor/hora"
        destructive={false}
        onConfirm={() => act(() => apiClient.updateCatalog2Specialty(specialty.id, { max_hourly_rate: value === "" ? null : Number(value) }).then(onReloadRefs), "Valor/hora padrão salvo.")}
      />
    </div>
  );
}

function PricingSettingsForm({ pricing, onSave }: any) {
  const [f, setF] = useState({ tax_percent: pricing.tax_percent ?? "", commission_percent: pricing.commission_percent ?? "", operational_fee_percent: pricing.operational_fee_percent ?? "", profit_margin_percent: pricing.profit_margin_percent ?? "", human_review_percent: pricing.human_review_percent ?? "" });
  const n = (v: any) => (v === "" ? null : Number(v));
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => setF({ tax_percent: pricing.tax_percent ?? "", commission_percent: pricing.commission_percent ?? "", operational_fee_percent: pricing.operational_fee_percent ?? "", profit_margin_percent: pricing.profit_margin_percent ?? "", human_review_percent: pricing.human_review_percent ?? "" }), [pricing]);
  const restoreConfigured = () => setF({ tax_percent: pricing.tax_percent ?? "", commission_percent: pricing.commission_percent ?? "", operational_fee_percent: pricing.operational_fee_percent ?? "", profit_margin_percent: pricing.profit_margin_percent ?? "", human_review_percent: pricing.human_review_percent ?? "" });
  const savePayload = () => ({ tax_percent: n(f.tax_percent), commission_percent: n(f.commission_percent), operational_fee_percent: n(f.operational_fee_percent), profit_margin_percent: n(f.profit_margin_percent), human_review_percent: n(f.human_review_percent) });
  const [inact, setInact] = useState({
    demo_inactivation_compensation_percent: pricing.demo_inactivation_compensation_percent ?? "",
    demo_inactivation_compensation_note: pricing.demo_inactivation_compensation_note ?? "",
  });
  const [simBase, setSimBase] = useState("");
  const [simResult, setSimResult] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);
  // Transparência: config sem responsável comercial registrado (veio de
  // seed/teste) e base de incidência ainda indefinida. Avisos informativos —
  // não bloqueiam a edição nem gravam nada.
  const provisional = pricing.updated_by_user_id == null;
  const componentBaseUndefined = !pricing.component_base_json;
  const componentOrderDefined = !!pricing.component_order_json;
  return (
    <div className="space-y-1.5 text-sm">
      {provisional && (
        <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/20">
          Configuração provisória — sem responsável comercial registrado. Os percentuais abaixo vieram de seed/teste
          e ainda não são decisão comercial.
        </p>
      )}
      {componentBaseUndefined && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/20">
          Base de incidência dos componentes ainda não definida — o cálculo usa "acumulado" por padrão.
        </p>
      )}
      {!componentOrderDefined && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/20">
          Ordem de incidência das taxas não confirmada — o preço comercial fica "A definir".
        </p>
      )}
      {(Object.keys(f) as (keyof typeof f)[]).map((k) => (
        <label key={k} className="flex flex-wrap items-center gap-2">
          <span className="w-44 text-xs">{PRICING_FIELD_LABEL[k]}</span>
          <Input className="w-20" type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          {f[k] === "" && <span className="text-[10px] text-amber-600">aguardando definição comercial</span>}
          {f[k] !== "" && provisional && <span className="text-[10px] text-amber-600">provisório (seed)</span>}
        </label>
      ))}
      <div className="flex flex-wrap gap-2">
        <SaveButton onClick={() => setConfirmOpen(true)}>Salvar taxas e margem</SaveButton>
        <Button size="sm" variant="outline" onClick={restoreConfigured}>Restaurar valores salvos</Button>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Salvar configuração comercial?"
        message="As taxas e a margem são globais e passam a ser usadas nos cálculos dos produtos. Cotações já emitidas permanecem protegidas pela regra comercial."
        confirmText="Salvar configuração"
        destructive={false}
        onConfirm={() => onSave(savePayload())}
      />

      <div className="mt-3 space-y-1.5 rounded border border-amber-300 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="text-[11px] font-medium text-amber-700">
          Desconto por inativação — DEMONSTRATIVO (Item 16.1). Percentual fictício só para simulação; a base
          definitiva e o tratamento do já entregue continuam sem definição. Nunca gera crédito, estorno ou
          abatimento real.
        </p>
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-44 text-xs">percentual demonstrativo (%)</span>
          <Input
            className="w-20"
            type="number"
            value={inact.demo_inactivation_compensation_percent}
            onChange={(e) => setInact({ ...inact, demo_inactivation_compensation_percent: e.target.value })}
          />
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-44 text-xs">nota / observação</span>
          <Input
            className="w-80"
            value={inact.demo_inactivation_compensation_note}
            onChange={(e) => setInact({ ...inact, demo_inactivation_compensation_note: e.target.value })}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onSave({
              demo_inactivation_compensation_percent: n(inact.demo_inactivation_compensation_percent),
              demo_inactivation_compensation_note: inact.demo_inactivation_compensation_note || null,
            })
          }
        >
          Salvar configuração demonstrativa
        </Button>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-amber-200 pt-2">
          <span className="w-44 text-xs">simular sobre base (R$)</span>
          <Input className="w-24" type="number" value={simBase} onChange={(e) => setSimBase(e.target.value)} />
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              setSimError(null);
              setSimResult(null);
              try {
                const r = await apiClient.simulateCatalog2InactivationCompensation(Number(simBase));
                setSimResult(r);
              } catch (e: any) {
                setSimError(e?.message || "Falha ao simular.");
              }
            }}
          >
            Simular
          </Button>
        </div>
        {simError && <p className="text-[11px] text-red-600">{simError}</p>}
        {simResult && (
          <p className="text-[11px] text-amber-700">
            SIMULAÇÃO — {simResult.percent}% de R$ {simResult.base_amount} = R$ {simResult.simulated_compensation_amount}.
            {" "}Nenhum crédito, estorno ou abatimento real foi gerado.
          </p>
        )}
      </div>
    </div>
  );
}
function PricingResultView({ r }: { r: any }) {
  const money = (v: number | null) => (v == null ? <span className="text-amber-600">aguardando definição comercial</span> : `${r.currency} ${v.toFixed(2)}`);

  // Sem NENHUMA tarefa ativa não existe base de custo — o cálculo real
  // devolve zeros, mas mostrar "Preço comercial final: R$ 0,00" seria mentira.
  // (O motor `computePricing` NÃO é alterado — só a apresentação.)
  const noCostBase = Array.isArray(r.active_task_keys) && r.active_task_keys.length === 0;
  if (noCostBase) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
        <p className="font-semibold text-amber-800 dark:text-amber-200">Sem tarefas cadastradas — base de custo indefinida</p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          Cadastre tarefas, especialidades, tempos e prazo para calcular a precificação. Enquanto não houver
          tarefas ativas, não há preço comercial — o valor <strong>não</strong> é R$ 0,00.
        </p>
        <div className="mt-2 space-y-0.5 border-t border-amber-200 pt-2 dark:border-amber-800">
          <Row
            k="Prazo comercial"
            v={r.deadline?.commercial_deadline_pending
              ? <span className="text-amber-700">aguardando definição comercial</span>
              : `${r.deadline?.commercial_deadline_days} dia(s)`}
          />
          <Row k="Esforço interno estimado" v={`${r.deadline?.effort_days ?? "—"} dia(s) úteis`} />
        </div>
        {r.warnings?.length > 0 && (
          <ul className="mt-1 list-inside list-disc text-xs text-amber-700">{r.warnings.map((w: any, i: number) => <li key={i}>{w.message}</li>)}</ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Row k={r.lines.human_cost.label} v={money(r.lines.human_cost.amount)} />
      <Row k={r.lines.ia_cost.label} v={money(r.lines.ia_cost.amount)} />
      <Row k={r.lines.human_review_cost.label} v={money(r.lines.human_review_cost.amount)} />
      <Row k={r.lines.addons.label} v={money(r.lines.addons.amount)} />
      <Row k={r.lines.variation_impacts.label} v={money(r.lines.variation_impacts.amount)} />
      <Row k="Impactos de condições" v={r.lines.condition_impacts.detail} />
      <Row k={r.lines.subtotal_cost.label} v={money(r.lines.subtotal_cost.amount)} />
      <Row k="Custo direto (humano + IA)" v={money(r.lines.direct_cost?.amount ?? null)} />
      {!r.order_defined && <p className="text-[11px] text-amber-600">Ordem de incidência das taxas não confirmada — usando a ordem-padrão (imposto → comissão → operacional → margem). Confirme no módulo de precificação.</p>}
      {r.lines.taxes_and_margins.map((t: any, i: number) => <Row key={i} k={t.label} v={t.amount == null ? <span className="text-amber-600">{t.detail}</span> : money(t.amount)} />)}
      {r.split && <div className="my-2"><BillingSplitSection split={r.split} /></div>}
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      <Row k="Preço mínimo permitido (= custo direto)" v={money(r.lines.minimum_price.amount)} />
      <Row k={<strong>Preço comercial final</strong>} v={<strong>{money((r.lines.commercial_final_price ?? r.lines.final_price).amount)}</strong>} />
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      <Row k="Esforço interno estimado" v={`${r.deadline?.effort_days ?? "—"} dia(s) úteis`} />
      <Row
        k="Prazo comercial"
        v={r.deadline?.commercial_deadline_pending
          ? <span className="text-amber-600">aguardando definição comercial</span>
          : `${r.deadline?.commercial_deadline_days} dia(s)`}
      />
      <p className="mt-1 text-[11px] text-neutral-400">
        O esforço é planejamento interno (min ÷ {480}) e <strong>não</strong> é promessa de entrega ao cliente. O prazo
        comercial é definido à parte (base + dias de variações/condições/adicionais).
      </p>
      <p className="mt-1 text-xs text-neutral-400">{r.deadline_detail}</p>
      {r.pending_info?.length > 0 && (
        <p className="mt-1 text-xs text-amber-600">Aguardando definição comercial: {r.pending_info.join("; ")}.</p>
      )}
      {r.warnings.length > 0 && <ul className="mt-1 list-inside list-disc text-xs text-amber-600">{r.warnings.map((w: any, i: number) => <li key={i}>{w.message}</li>)}</ul>}
    </div>
  );
}
function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between py-0.5"><span className="text-neutral-500">{k}</span><span>{v}</span></div>;
}

// ── 8. Pré-visualização ─────────────────────────────────────────────
function PreviewTab({ version }: any) {
  const banner = <CommercialConsistencyBanner version={version} readOnly showActions={false} />;
  const [p, setP] = useState<any>(null);
  useEffect(() => { apiClient.previewCatalog2Version(version.id).then(setP).catch(() => setP({ error: true })); }, [version.id]);
  if (!p) return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (p.error) return <p className="mt-3 text-sm text-red-600">Não foi possível carregar.</p>;
  return (
    <div className="mt-3 max-w-lg space-y-2">
    {banner}
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="text-lg font-semibold">{p.title || p.name}</div>
      {version?.sale_label && <div className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{version.sale_label}</div>}
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{p.description}</p>
      <div className="mt-2 text-xs text-neutral-500">{p.pillar} · {p.category} · {p.four_f.join(", ")}</div>
      {p.variations.length > 0 && <div className="mt-3 text-sm"><strong>Variações:</strong> {p.variations.map((v: any) => `${v.name} (${v.options.join("/")})`).join(" · ")}</div>}
      {p.addons.length > 0 && <div className="mt-1 text-sm"><strong>Adicionais:</strong> {p.addons.map((a: any) => a.name).join(", ")}</div>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm">
          Prazo comercial: {p.commercial_deadline_pending || p.estimated_deadline_days == null ? "a definir" : `${p.estimated_deadline_days} dia(s)`}
          {p.effort_days != null && <span className="text-neutral-400"> · esforço interno {p.effort_days} d</span>}
        </span>
        <span className="text-sm font-semibold">
          {/* Sem tarefas ativas: base de custo indefinida — não é "R$ 0,00". */}
          {p.has_cost_base === false || (p.tasks?.length ?? 0) === 0
            ? <span className="text-amber-600">Preço: base de custo indefinida</span>
            : p.price_pending
              ? "Preço: a definir"
              : `${p.currency} ${Number(p.price).toFixed(2)}`}
        </span>
      </div>
      {(p.has_cost_base === false || (p.tasks?.length ?? 0) === 0) && (
        <p className="mt-1 text-[10px] text-amber-600">Cadastre tarefas, especialidades, tempos e prazo para calcular a precificação.</p>
      )}
      {p.pending_info?.length > 0 && <p className="mt-1 text-[10px] text-amber-600">Aguardando definição comercial: {p.pending_info.join("; ")}.</p>}
      <p className="mt-2 text-[10px] text-neutral-400">A pré-visualização usa exatamente o mesmo cálculo do backend (seleção padrão). Esforço interno ≠ promessa de entrega.</p>
    </div>
    </div>
  );
}

// ── 9. Versões e histórico ─────────────────────────────────────────
function HistoryTab({ version, readOnly, act, onResolveIssue }: any) {
  const [val, setVal] = useState<any>(null);
  const [summary, setSummary] = useState("");
  useEffect(() => { apiClient.validateCatalog2Version(version.id).then(setVal).catch(() => setVal(null)); }, [version.id, version.updated_at]);
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold">Validação para publicar</h3>
        {!val ? "…" : val.ok ? <p className="text-sm text-emerald-600">Tudo certo para publicar.</p> : (
          <ul className="space-y-1 text-sm text-red-600">{val.issues.map((i: string, k: number) => <li key={k}><button type="button" className="text-left underline decoration-red-300 underline-offset-2 hover:text-red-800" onClick={() => onResolveIssue(i, val.issue_details?.[k])}>{i} → corrigir agora</button></li>)}</ul>
        )}
        {val && !val.ok && <p className="text-xs text-slate-500">Preço, custo ou prazo indefinido <strong>bloqueia</strong> a publicação (não há “publicar assim mesmo”). Se o produto for vendido sob consulta, escolha esse modo em “Modalidades de contratação”.</p>}
        {readOnly && <p className="mt-2 text-xs text-neutral-500">Esta versão já está publicada. Crie uma nova versão para editar ou publicar uma alteração.</p>}
        {!readOnly && (
          <div className="mt-2 flex items-end gap-2">
            <Field label="Resumo da mudança"><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          </div>
        )}
        <div className="mt-2"><PublishBtn versionId={version.id} canPublish={!!val?.ok} readOnly={readOnly} summary={summary} act={act} /></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold">Histórico da versão</h3>
        <ul className="text-sm">
          {(version.history ?? []).map((h: any, k: number) => (
            <li key={k} className="text-neutral-500">{new Date(h.at).toLocaleString("pt-BR")} — {h.event_type}{h.note ? ` — ${h.note}` : ""}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
function PublishBtn({ versionId, canPublish, readOnly, summary, act }: any) {
  const [open, setOpen] = useState(false);
  const clientActionId = useMemo(() => `pub-${versionId}-${Date.now()}`, [versionId, open]);
  return (
    <>
      <Button size="sm" disabled={readOnly || !canPublish} onClick={() => setOpen(true)}>Publicar versão</Button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Publicar esta versão?"
        message="A versão ficará imutável e o produto NÃO é ativado: o status continua o mesmo. Mudanças futuras exigem uma nova versão."
        confirmText="Publicar"
        destructive={false}
        onConfirm={() => act(() => apiClient.publishCatalog2Version(versionId, { client_action_id: clientActionId, change_summary: summary }), "Versão publicada (o produto não foi ativado).", { rethrow: true })}
      />
    </>
  );
}

// ── Histórico de alterações (Item 7, reunião 2026-09-14) ────────────
// Seção somente-leitura, própria do produto (não muda por versão
// selecionada) — mescla no servidor os eventos deterministicos já
// registrados + os dois mecanismos anteriores (versão/comercial). Resumo
// por IA é opcional e nunca substitui a lista de eventos abaixo dela.
const HISTORY_CATEGORY_LABEL: Record<string, string> = {
  conteudo: "Conteúdo",
  tarefas: "Tarefas e questionários",
  variacoes: "Variações e adicionais",
  status: "Status e inativação",
  periodos: "Períodos e recorrência",
  versao: "Versão e publicação",
  comercial: "Comercial",
};
const HISTORY_ACTOR_LABEL: Record<string, string> = {
  user: "Admin",
  import: "Importação",
  system: "Processo automático",
};
function ProductHistoryTab({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.getCatalog2ProductHistory(productId, {
        page,
        page_size: 20,
        category: category || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setResult(r);
    } finally {
      setLoading(false);
    }
  }, [productId, page, category, dateFrom, dateTo]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [category, dateFrom, dateTo]);

  async function genSummary() {
    setSummaryLoading(true);
    try {
      setSummary(await apiClient.summarizeCatalog2ProductHistory(productId));
    } finally {
      setSummaryLoading(false);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.page_size)) : 1;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Resumo por IA</h3>
          <Button size="sm" variant="outline" disabled={summaryLoading} onClick={genSummary}>
            {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar resumo"}
          </Button>
        </div>
        {summary && (
          summary.summary ? (
            <div className="mt-2 text-sm">
              <Badge className="mb-1 bg-blue-100 text-blue-700">Resumo gerado por IA</Badge>
              <p className="text-neutral-700 dark:text-neutral-300">{summary.summary}</p>
              <p className="mt-1 text-xs text-neutral-500">Baseado em {summary.based_on_event_ids?.length ?? 0} evento(s) listados abaixo.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">{summary.unavailable_reason ?? "Resumo indisponível no momento — o histórico abaixo continua completo."}</p>
          )
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <Field label="Tipo de alteração">
          <select className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(HISTORY_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="De"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
        <Field label="Até"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
      </div>

      {result?.coverage && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <p>
            {result.coverage.status === "complete_since_marker"
              ? <>Cobertura completa a partir de {new Date(result.coverage.full_coverage_since).toLocaleString("pt-BR")} (marco real deste ambiente — nunca a data da reunião).</>
              : <>Ainda há lacunas de categoria em aberto — o histórico não pode ser considerado completo, nem a partir de {new Date(result.coverage.full_coverage_since).toLocaleString("pt-BR")}.</>}
          </p>
          {result.coverage.has_history_before_marker && (
            <p className="mt-1">Este produto tem registros anteriores a essa data — esse intervalo anterior é histórico parcial: só aparece o que já era comprovado por versões/registros existentes antes desta revisão.</p>
          )}
          {result.coverage.known_gaps?.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {result.coverage.known_gaps.map((g: string, k: number) => <li key={k}>{g}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : !result?.data?.length ? (
          <p className="p-4 text-sm text-neutral-500">Nenhum evento encontrado para os filtros selecionados.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {result.data.map((e: any) => (
              <li key={e.id} className="p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-neutral-500">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                    {" — "}{e.description}
                    {e.actor_kind !== "user" && (
                      <Badge className="ml-2 bg-amber-100 text-amber-700">{HISTORY_ACTOR_LABEL[e.actor_kind] ?? e.actor_kind}</Badge>
                    )}
                  </div>
                  {(e.before || e.after) && (
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                      {openId === e.id ? "Ocultar detalhes" : "Ver detalhes"}
                    </Button>
                  )}
                </div>
                {openId === e.id && (e.before || e.after) && (
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    {e.before != null && <pre className="overflow-x-auto rounded bg-neutral-50 p-2 dark:bg-neutral-900">{JSON.stringify(e.before, null, 2)}</pre>}
                    {e.after != null && <pre className="overflow-x-auto rounded bg-neutral-50 p-2 dark:bg-neutral-900">{JSON.stringify(e.after, null, 2)}</pre>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {result && result.total > result.page_size && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-neutral-500">Página {page} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}

// ── 10. Origem e revisão (importação dos 36 — bloco 4/6) ────────────
const PENDENCY_LABEL: Record<string, string> = {
  content_review_pending: "Revisar conteúdo preservado",
  classification_decision_pending: "Decidir classificação (categoria × área)",
  price_pending: "Definir preço comercial",
  deadline_pending: "Definir prazo comercial",
  portfolio_pending: "Anexar portfólio",
  rose_review_pending: "Revisão da Rose pendente",
};

function OriginReviewTab({ productId, onChanged }: { productId: string; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "not_imported" | "error">("loading");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setState("loading");
    apiClient
      .getCatalog2ProductOrigin(productId)
      .then((d: any) => { setData(d); setState("ready"); })
      .catch((e: any) => setState(e?.status === 404 ? "not_imported" : "error"));
  }, [productId]);
  useEffect(() => { reload(); }, [reload]);

  if (state === "loading") return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (state === "not_imported") return <p className="mt-3 rounded bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800">Este produto não veio da importação dos 36 — foi criado manualmente no construtor.</p>;
  if (state === "error" || !data) return <p className="mt-3 text-sm text-red-600">Não foi possível carregar a origem.</p>;

  const hp = data.historical_price ?? {};
  async function resolve(key: string) {
    const decision = (decisions[key] ?? "").trim();
    if (!decision) { setMsg("Descreva a decisão antes de concluir a pendência."); return; }
    setMsg(null);
    try {
      await apiClient.resolveCatalog2Pendency(productId, { pendency_key: key, decision });
      setDecisions((d) => ({ ...d, [key]: "" }));
      reload();
      onChanged();
    } catch (e: any) {
      setMsg(e?.message ?? "Falha ao concluir a pendência.");
    }
  }

  return (
    <div className="mt-3 space-y-4 text-sm">
      {msg && <p className="text-blue-600">{msg}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="font-semibold">Planilha principal (fonte da identidade)</h3>
        <p className="text-xs text-neutral-500">#{data.source.index} · {data.source.name} · chave <code>{data.source.key}</code></p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(data.main_fields ?? {}).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-neutral-400">{k}</dt><dd className="truncate">{fmt(v)}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="font-semibold">Revisão da Rose</h3>
        {data.rose_reviewed ? (
          <>
            <p className="text-xs text-neutral-500">
              Casada com a planilha principal. Área sugerida pela Rose: <strong>{data.area_rose ?? "—"}</strong>{" "}
              <span className="text-neutral-400">(nunca substitui a categoria automaticamente)</span>
            </p>
            {data.rose_changed_fields?.length > 0 ? (
              <div className="mt-2">
                <div className="text-xs font-medium text-neutral-500">Campos que a Rose alterou:</div>
                <ul className="list-inside list-disc text-xs">
                  {data.rose_changed_fields.map((k: string) => (
                    <li key={k}><span className="text-neutral-400">{k}:</span> {fmt(data.rose_fields?.[k])}</li>
                  ))}
                </ul>
              </div>
            ) : <p className="mt-1 text-xs text-neutral-400">Nenhum campo textual da Rose foi aplicado (campos vazios não apagam a principal).</p>}
          </>
        ) : (
          <p className="text-xs text-amber-600">Sem revisão da Rose para este produto — dado da planilha principal + pendência "Revisão da Rose pendente".</p>
        )}
      </section>

      {data.divergences?.length > 0 && (
        <section className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
          <h3 className="font-semibold text-orange-800 dark:text-orange-300">Divergências registradas (nunca ocultadas)</h3>
          <ul className="mt-1 space-y-1 text-xs">
            {data.divergences.map((d: any, i: number) => (
              <li key={i}>
                <Badge className="mr-1 bg-orange-100 text-orange-700">{d.type}</Badge>
                {d.detail} {d.decision_pending && <span className="font-medium text-orange-700">— decisão pendente</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="font-semibold">Referência histórica de preço</h3>
        <p className="text-xs">
          {hp.min == null && hp.max == null
            ? "Sem referência na planilha."
            : `${hp.min ?? "?"} – ${hp.max ?? "?"}`}{" "}
          <span className="text-neutral-400">— {hp.note}</span>
        </p>
        <p className="text-[11px] text-amber-600">Não é o preço final e não é usada automaticamente no cálculo.</p>
      </section>

      {data.original_texts && Object.keys(data.original_texts).length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="font-semibold">Textos originais preservados</h3>
          <p className="text-[11px] text-neutral-400">Preservados na íntegra quando não puderam ser estruturados com segurança. Nada foi inventado.</p>
          <dl className="mt-2 space-y-1 text-xs">
            {Object.entries(data.original_texts).map(([k, v]) => v ? (
              <div key={k}><dt className="text-neutral-400">{k}</dt><dd className="whitespace-pre-wrap rounded bg-neutral-50 p-1.5 dark:bg-neutral-800">{fmt(v)}</dd></div>
            ) : null)}
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="font-semibold">Pendências para decisão</h3>
        <p className="text-[11px] text-neutral-400">
          Estado de preparo atual: <Badge className="bg-amber-100 text-amber-700">{data.review_state}</Badge>. Concluir uma
          pendência altera só o rascunho, registra quem/quando/decisão e preserva a divergência original no histórico.
        </p>
        {data.pendencies.length === 0 ? (
          <p className="mt-2 text-xs text-emerald-600">Nenhuma pendência aberta — pronto para revisão final.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.pendencies.map((key: string) => (
              <li key={key} className="rounded border border-neutral-200 p-2 dark:border-neutral-700">
                <div className="text-xs font-medium">{PENDENCY_LABEL[key] ?? key}</div>
                <Textarea
                  rows={2}
                  className="mt-1 text-xs"
                  placeholder="Descreva a decisão tomada (ex.: preço comercial definido em R$ X; ou 'mantida a categoria Redação, área da Rose registrada como especialidade')."
                  value={decisions[key] ?? ""}
                  onChange={(e) => setDecisions((d) => ({ ...d, [key]: e.target.value }))}
                />
                <Button size="sm" className="mt-1" onClick={() => resolve(key)}>Concluir pendência</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.resolutions?.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="font-semibold">Histórico de resoluções</h3>
          <ul className="mt-1 space-y-1 text-xs">
            {data.resolutions.map((r: any) => (
              <li key={r.id} className="text-neutral-500">
                {new Date(r.resolved_at).toLocaleString("pt-BR")} — <strong>{PENDENCY_LABEL[r.pendency_key] ?? r.pendency_key}</strong>: {r.decision}
                {r.original_divergence && <div className="text-neutral-400">divergência preservada: {JSON.stringify(r.original_divergence)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.human_edited_at && (
        <p className="text-[11px] text-sky-600">
          Rascunho editado por humano em {new Date(data.human_edited_at).toLocaleString("pt-BR")} — o importador não sobrescreve mais este produto.
        </p>
      )}
      <p className="text-[11px] text-neutral-400">Observações da importação: {data.observations ?? "—"} · último checksum <code>{String(data.last_import_checksum ?? "").slice(0, 12)}…</code></p>
    </div>
  );
}
function fmt(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── Prontidão do produto (atalho — reunião 10/09/2026, bloco 2) ────
// Consome GET /catalog2-admin/products/:id/readiness — MESMA regra do painel
// geral (nenhuma validação duplicada no frontend). Só leitura.
export const READINESS_ITEM_LABEL: Record<string, string> = {
  conteudo: "Conteúdo",
  classificacao: "Classificação",
  variacoes: "Variações",
  adicionais: "Adicionais",
  tarefas: "Tarefas",
  etapas: "Etapas",
  esforco_tarefas: "Especialidade e horas das tarefas",
  preco: "Preço / base de custo",
  prazo: "Prazo comercial",
  validacao: "Pendências para publicar",
  conexoes: "Conexões e acessos necessários",
  portfolio: "Portfólio",
  revisao_rose: "Revisão da Rose",
  publicacao: "Publicação",
};
const READINESS_TONE: Record<string, string> = {
  pronto: "bg-emerald-100 text-emerald-700",
  pendente: "bg-amber-100 text-amber-700",
  bloqueador: "bg-red-100 text-red-700",
  opcional: "bg-neutral-100 text-neutral-600",
};

// Lista EXATA do que falta em cada item (um ponto por campo/tarefa/etapa).
function readinessDetailLines(key: string, product: any, version: any, note?: string): string[] {
  const out: string[] = [];
  const tasks: any[] = version?.tasks ?? [];
  const mins = (x: any) => (x?.estimated_minutes ?? 0) > 0;
  switch (key) {
    case "conteudo":
      if (!String(version?.title ?? "").trim()) out.push("Título comercial: vazio");
      if (!String(version?.summary ?? "").trim()) out.push("Descrição curta: vazia");
      if (!String(version?.full_description ?? "").trim()) out.push("Descrição completa: vazia");
      break;
    case "classificacao":
      if (!product?.pillar) out.push("Pilar: não escolhido");
      if (!product?.category) out.push("Categoria: não escolhida");
      if (!(product?.four_f?.length > 0)) out.push("Classificação 4F: nenhuma marcada");
      break;
    case "tarefas":
      if (tasks.length === 0) out.push("Nenhuma tarefa cadastrada");
      break;
    case "etapas":
      for (const t of tasks) if ((t.steps ?? []).length === 0) out.push(`Tarefa "${t.name}": sem etapa — toda tarefa precisa de ao menos uma`);
      break;
    case "esforco_tarefas": {
      for (const t of tasks) {
        if (t.effort_is_provisional) out.push(`Revisar "${t.name}": confirmar especialidade e horas reais`);
        const allSteps = t.steps ?? [];
        if (allSteps.length > 0) {
          for (const st of allSteps) {
            if (!mins(st)) out.push(`Definir horas: "${t.name}" › "${st.name}"`);
            if (!(st.specialty_id ?? t.specialty?.id)) out.push(`Definir especialidade: "${t.name}" › "${st.name}"`);
          }
        } else {
          out.push(`Criar etapa em "${t.name}" e informar especialidade e horas`);
        }
      }
      break;
    }
    case "preco": {
      if (/prazo/i.test(note ?? "")) {
        if (version?.base_commercial_deadline_days == null) out.push("Prazo comercial base (dias): não informado (passo 2, campo Prazo comercial base)");
      }
      if (tasks.length === 0) out.push("Cadastrar tarefas para formar a base de custo");
      if (priceBlockedByTasks(note)) out.push("Concluir o ajuste separado: Especialidade e horas das tarefas");
      const m = /"A definir":\s*(.*)\.$/.exec(note ?? "");
      if (m) for (const part of m[1].split(";").map((x) => x.trim()).filter(Boolean)) if (!/prazo/i.test(part) && !/provis|tarefa/i.test(part)) out.push(`Configurar em Precificação: ${part}`);
      break;
    }
    case "prazo": {
      if (version?.base_commercial_deadline_days == null) out.push("Informar o prazo comercial base em dias");
      break;
    }
    case "variacoes":
      for (const va of version?.variations ?? []) if (va.is_required && (va.options ?? []).length === 0) out.push(`Variação "${va.name}": obrigatória e sem opções`);
      break;
    default:
      break;
  }
  return out;
}

// Um destino por linha do checklist. A ordem espelha readinessDetailLines para
// que cada ajuste seja uma ação independente, não apenas texto decorativo.
function readinessDetailTargets(key: string, product: any, version: any, note?: string): string[] {
  const targets: string[] = [];
  const tasks: any[] = version?.tasks ?? [];
  const mins = (x: any) => (x?.estimated_minutes ?? 0) > 0;
  if (key === "esforco_tarefas") {
    for (const t of tasks) {
      const target = "task-effort:" + t.id;
      if (t.effort_is_provisional) targets.push(target);
      const steps = t.steps ?? [];
      if (steps.length > 0) {
        for (const st of steps) {
          if (!mins(st)) targets.push(target);
          if (!(st.specialty_id ?? t.specialty?.id)) targets.push(target);
        }
      } else {
        targets.push(target);
      }
    }
    return targets;
  }
  if (key === "preco") {
    if (/prazo/i.test(note ?? "") && version?.base_commercial_deadline_days == null) targets.push("catalog2-deadline-base");
    if (tasks.length === 0) targets.push("catalog2-task-create");
    if (priceBlockedByTasks(note)) targets.push(readinessPendingIds("esforco_tarefas", product, version, undefined, note)[0] ?? "catalog2-task-effort");
    const m = /"A definir":\s*(.*)\.$/.exec(note ?? "");
    if (m) for (const part of m[1].split(";").map((x) => x.trim()).filter(Boolean)) if (!/prazo/i.test(part) && !/provis|tarefa/i.test(part)) targets.push("catalog2-price-pending");
    return targets;
  }
  const generic = readinessPendingIds(key, product, version, undefined, note);
  const lineCount = readinessDetailLines(key, product, version, note).length;
  return Array.from({ length: lineCount }, (_, index) => generic[index] ?? generic[0] ?? readinessDestination(key, product, note).target);
}

// Campos exatos que ainda impedem o item de ficar pronto (ids de elementos).
function readinessPendingIds(key: string, product: any, version: any, level?: string, note?: string): string[] {
  const tasks: any[] = version?.tasks ?? [];
  const out: string[] = [];
  switch (key) {
    case "conteudo":
      if (!String(version?.title ?? "").trim()) out.push("catalog2-field-title");
      if (!String(version?.full_description ?? "").trim()) out.push("catalog2-field-full-description");
      if (!out.length) out.push("catalog2-field-full-description");
      return out;
    case "classificacao":
      if (!product?.pillar) out.push("catalog2-field-pillar");
      if (!product?.category) out.push("catalog2-field-category");
      if (!(product?.four_f?.length > 0)) out.push("catalog2-field-four-f");
      if (!out.length) out.push("catalog2-field-category");
      return out;
    case "preco":
      if (priceBlockedByTasks(note)) return readinessPendingIds("esforco_tarefas", product, version, level, note);
      return /prazo/i.test(note ?? "") ? ["catalog2-deadline-base"] : ["catalog2-price-pending"];
    case "etapas": {
      const miss = tasks.filter((t) => (t.steps ?? []).length === 0).map((t) => "catalog2-step-add:" + t.id);
      if (miss.length) return miss;
      const first = tasks[0];
      return first ? ["catalog2-step-add:" + first.id] : ["catalog2-tasks"];
    }
    case "esforco_tarefas": {
      const miss = tasks.filter((t) => {
        const all = t.steps ?? [];
        if (t.effort_is_provisional) return true;
        return all.length > 0 ? all.some((x: any) => !((x.estimated_minutes ?? 0) > 0) || !(x.specialty_id ?? t.specialty?.id)) : (!t.specialty?.id || t.estimated_minutes == null);
      }).map((t) => "task-effort:" + t.id);
      return miss.length ? miss : tasks.map((t) => "task-effort:" + t.id);
    }
    default:
      return [readinessDestination(key, product, note).target];
  }
}

// Destino de cada item de prontidão: aba, sub-aba e campo a destacar.
// O bloqueio de preço vem de dados das tarefas (provisórios / sem especialidade ou horas)
// ou da configuração global (Precificação). Cada caso aponta para um lugar diferente.
function priceBlockedByTasks(note?: string) {
  return /provis|tarefa/i.test(note ?? "");
}

function readinessDestination(key: string, product: any, note?: string): { tab: string; sub?: Record<string, string>; target: string } {
  switch (key) {
    case "conteudo": return { tab: "info", target: "catalog2-field-full-description" };
    case "classificacao": return { tab: "opcoes", sub: { opcoes: "class" }, target: !product?.pillar ? "catalog2-field-pillar" : !product?.category ? "catalog2-field-category" : "catalog2-field-four-f" };
    case "variacoes": return { tab: "opcoes", sub: { opcoes: "var" }, target: "sec-var" };
    case "adicionais": return { tab: "opcoes", sub: { opcoes: "add" }, target: "sec-add" };
    case "tarefas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-create" };
    case "etapas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-tasks" };
    case "esforco_tarefas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-effort" };
    case "prazo": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-deadline-base" };
    case "conexoes": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "sec-connections" };
    case "preco": return priceBlockedByTasks(note) ? { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-effort" } : /prazo/i.test(note ?? "") ? { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-deadline-base" } : { tab: "precos", target: "catalog2-price-pending" };
    case "portfolio": return { tab: "info", target: "catalog2-general" };
    case "validacao": return { tab: "revisao", sub: { revisao: "hist" }, target: "sec-publicacao" };
    case "publicacao": return { tab: "revisao", sub: { revisao: "hist" }, target: "sec-publicacao" };
    default: return { tab: "info", target: "catalog2-general" };
  }
}

const READINESS_WHERE: Record<string, string> = {
  conteudo: "Passo 1 · Informações",
  classificacao: "Passo 3 · Classificação",
  variacoes: "Passo 3 · Variações",
  adicionais: "Passo 3 · Adicionais",
  tarefas: "Passo 2 · Tarefas e etapas",
  etapas: "Passo 2 · Tarefas e etapas",
  esforco_tarefas: "Passo 2 · Tarefas e etapas",
  prazo: "Passo 2 · Prazo comercial",
  conexoes: "Passo 2 · Conexões e acessos necessários",
  validacao: "Passo 5 · Revisão e publicação",
  preco: "Passo 4 · Custos e preço",
  portfolio: "Informações do produto",
  publicacao: "Revisão e publicação › Publicação e versões",
};

// Explicação completa do que fazer (some ao lado da nota curta do servidor).
// Vale mesmo quando o campo já está preenchido: um item pode estar preenchido
// e continuar pendente/bloqueado — o texto explica o porquê.
const READINESS_HELP: Record<string, Partial<Record<"bloqueador" | "pendente", string>>> = {
  conteudo: { bloqueador: "O texto veio da importação e ainda não foi revisado. Leia o título e as descrições, ajuste o que for preciso e salve. Mesmo com tudo preenchido, o item continua bloqueado até a revisão do conteúdo ser confirmada." },
  classificacao: {
    bloqueador: "Escolha o pilar e a categoria do produto. Se houver divergência entre a categoria e a área de origem da importação, é preciso decidir qual vale. Sem isso o produto não fica classificado corretamente no catálogo.",
  },
  etapas: { bloqueador: "Toda tarefa precisa de ao menos uma etapa: é a etapa que tem a especialidade, as horas e o valor pago (nômade ou custo interno). Ex.: tarefa \"Criação de conteúdo\" → etapas \"Roteiro\", \"Redação\", \"Revisão\". Clique em Adicionar etapa dentro da tarefa." },
  tarefas: { pendente: "Cadastre pelo menos uma tarefa (o que será executado quando o produto for contratado). Sem tarefas não há operação nem base de custo para calcular o preço." },
  esforco_tarefas: { pendente: "Cada tarefa precisa de especialidade e horas estimadas reais. Mesmo que já estejam preenchidas, se estiverem marcadas como PROVISÓRIAS (dado de teste) o item continua pendente até você revisar e confirmar os valores reais." },
  preco: { bloqueador: "Resolva os ajustes listados acima. A base de custo usa as horas das tarefas e o valor/hora das especialidades; taxas e margens são configuradas em Custos e preço." },
  prazo: { bloqueador: "O prazo que o cliente vê NÃO é a soma das tarefas: é o \"Prazo comercial base\" da versão, que ainda não foi informado. Preencha o campo em Custos e preço › Prazo comercial base (dias) e salve." },
  publicacao: { bloqueador: "O produto nunca foi publicado, então o cliente não o enxerga. Quando os outros bloqueios estiverem resolvidos, publique a versão em Revisão e publicação › Publicação e versões." },
};

const READINESS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  conteudo: FileText,
  classificacao: Tag,
  variacoes: Layers,
  adicionais: ListChecks,
  tarefas: CheckSquare,
  etapas: ListOrdered,
  esforco_tarefas: Clock,
  preco: DollarSign,
  prazo: CalendarClock,
};

const LEVEL_META: Record<string, { label: string; chip: string; border: string; rank: number }> = {
  bloqueador: { label: "Bloqueio", chip: "bg-red-100 text-red-700", border: "border-l-red-500", rank: 0 },
  pendente: { label: "Pendente", chip: "bg-amber-100 text-amber-700", border: "border-l-amber-400", rank: 1 },
  pronto: { label: "Pronto", chip: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500", rank: 2 },
  opcional: { label: "Opcional", chip: "bg-slate-100 text-slate-600", border: "border-l-slate-300", rank: 3 },
};

type ReadinessFilter = "todos" | "pronto" | "bloqueador" | "pendente" | "opcional";

function ProductReadinessPanel({ productId, versionId, versionKey, onGo, onGoDetail, onItems, onData, detailFor, detailTargetFor }: { productId: string; versionId?: string; versionKey: string; onGo: (key: string) => void; onGoDetail: (key: string, targetId: string) => void; onItems?: (items: Record<string, { level: string; note: string }>) => void; onData?: (d: any) => void; detailFor?: (key: string) => string[]; detailTargetFor?: (key: string, index: number) => string | undefined }) {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReadinessFilter>("todos");

  const reload = useCallback(() => {
    setLoading(true);
    apiClient
      .getCatalog2ProductReadiness(productId, versionId)
      .then((d: any) => setData(d))
      .catch(() => setData({ error: true }))
      .finally(() => setLoading(false));
  }, [productId, versionId]);
  useEffect(() => { reload(); }, [reload, versionKey]);
  useEffect(() => { if (data?.items) onItems?.(data.items); if (data && !data.error) onData?.(data); }, [data, onItems, onData]);

  const blockers = data?.blockers ?? [];
  const pendings = data?.pendings ?? [];
  const entries: { key: string; level: string; note: string }[] = data?.items
    ? Object.entries(data.items).filter(([key]) => key !== "publicacao").map(([key, it]: any) => ({ key, level: it.level, note: it.note }))
    : [];
  const counted = entries.filter((it) => it.level !== "opcional");
  const readyCount = counted.filter((it) => it.level === "pronto").length;
  const pct = counted.length > 0 ? Math.round((readyCount / counted.length) * 100) : 0;
  const seg = (n: number) => (counted.length > 0 ? (n / counted.length) * 100 : 0);
  const nBlock = blockers.length;
  const nPend = pendings.length;
  const countOf = (lvl: string) => entries.filter((it) => it.level === lvl).length;
  const visible = entries
    .filter((it) => filter === "todos" || it.level === filter)
    .sort((x, y) => (LEVEL_META[x.level]?.rank ?? 9) - (LEVEL_META[y.level]?.rank ?? 9));
  const filters: { id: ReadinessFilter; label: string; n: number }[] = [
    { id: "todos", label: "Todos", n: entries.length },
    { id: "pronto", label: "Pronto", n: countOf("pronto") },
    { id: "bloqueador", label: "Bloqueios", n: countOf("bloqueador") },
    { id: "pendente", label: "Pendentes", n: countOf("pendente") },
    { id: "opcional", label: "Opcional", n: countOf("opcional") },
  ];

  return (
    <section className="rounded-2xl border border-white/70 bg-[#e8ecf9] shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="block w-full px-5 py-4 text-left"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Checklist do produto ·</span>
            {data?.error ? (
              <span className="text-red-600">não foi possível carregar</span>
            ) : loading && !data ? (
              <span className="text-slate-500">carregando…</span>
            ) : nBlock === 0 && nPend === 0 ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">nada pendente</span>
            ) : (
              <>
                {nBlock > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">{nBlock} {nBlock === 1 ? "bloqueio" : "bloqueios"}</span>}
                {nPend > 0 && <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-semibold text-pink-700">{nPend} {nPend === 1 ? "pendência" : "pendências"}</span>}
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
            {data?.items && <span>{pct}% concluído</span>}
            {open ? <ChevronDown className="h-5 w-5 text-violet-600" /> : <ChevronRight className="h-5 w-5 text-violet-600" />}
          </span>
        </span>
        {data?.items && (
          <span className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60" aria-hidden>
            <span className="h-full bg-emerald-500" style={{ width: seg(readyCount) + "%" }} />
            <span className="h-full bg-pink-300" style={{ width: seg(nPend) + "%" }} />
            <span className="h-full bg-red-500" style={{ width: seg(nBlock) + "%" }} />
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-slate-200/80 px-5 py-4 dark:border-slate-700/60">
          {data?.error ? (
            <p className="text-sm text-red-600">Não foi possível carregar a prontidão.</p>
          ) : !data?.items ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar itens do checklist">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filter === f.id ? "border-violet-600 bg-violet-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                  >
                    {f.label} <span className={filter === f.id ? "text-white/80" : "text-slate-400"}>({f.n})</span>
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-slate-500">Clique num item para ir ao lugar de resolver.</span>
              </div>
              {visible.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/40">Nenhum item nesta categoria.</p>
              ) : (
                <ul className="space-y-1.5">
                  {visible.map((it) => {
                    const meta = LEVEL_META[it.level] ?? LEVEL_META.opcional;
                    const help = (READINESS_HELP[it.key] as any)?.[it.level] as string | undefined;
                    const Icon = READINESS_ICON[it.key] ?? FileText;
                    const details = detailFor?.(it.key) ?? [];
                    return (
                      <li key={it.key} className="overflow-hidden rounded-xl border border-white/70 bg-[#f2f4fc] transition-colors hover:border-violet-300 dark:border-slate-700/60 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => onGo(it.key)}
                          className="w-full px-3 py-1.5 text-left hover:bg-white dark:hover:bg-slate-800/50"
                        >
                          <span className="flex items-center gap-3">
                            <span className={`w-[74px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>
                            <Icon className="h-4 w-4 shrink-0 text-violet-600" />
                            <span className="w-[210px] shrink-0 truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">{READINESS_ITEM_LABEL[it.key] ?? it.key}</span>
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400" title={it.note}>{it.note}</span>
                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                              {READINESS_WHERE[it.key] ?? "Abrir"} <ChevronRight className="h-4 w-4" />
                            </span>
                          </span>
                        </button>
                        {it.level !== "pronto" && details.length > 0 && (
                          <div className="mx-3 mb-2 rounded-lg border border-slate-200/80 bg-white/70 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              {details.length} {details.length === 1 ? "ajuste necessário" : "ajustes necessários"} · clique em cada um para resolver
                            </div>
                            <div className="grid gap-1 sm:grid-cols-2">
                              {details.map((line, i) => {
                                const targetId = detailTargetFor?.(it.key, i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    disabled={!targetId}
                                    onClick={() => targetId && onGoDetail(it.key, targetId)}
                                    className="group flex items-start gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-left text-[12px] leading-snug text-slate-700 transition-colors hover:bg-violet-100 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-violet-950/50 dark:hover:text-violet-200"
                                  >
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-950 dark:text-violet-300">{i + 1}</span>
                                    <span className="flex-1">{line}</span>
                                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500 opacity-0 transition-opacity group-hover:opacity-100" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {help && (
                          <div className={`mx-3 mb-2 rounded-lg px-2.5 py-1.5 text-[12px] leading-snug ${it.level === "bloqueador" ? "bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"}`}>
                            <strong>{it.level === "bloqueador" ? "Como resolver: " : "Como concluir: "}</strong>{help}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                <span>tarefas: {data.task_count ?? 0} · etapas: {data.step_count ?? 0}</span>
                <button type="button" className="underline" onClick={reload}>atualizar</button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── helpers ────────────────────────────────────────────────────────
// Estilo do editor (pedido do usuário 2026-09-25: "sem margem, ruim de ler,
// não segue o layout da plataforma"): abas em pílula com o degradê da marca,
// cada aba dentro de um cartão arredondado com respiro, cabeçalho em cartão.
const MAIN_TABS_LIST = "h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0 dark:border-slate-700";
const MAIN_TAB = "-mb-px flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-3 text-[13px] font-semibold text-slate-500 shadow-none hover:text-slate-700 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-violet-300";
const SUB_TABS_LIST = "h-auto w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const SUB_TAB = "flex-none rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2558FF] data-[state=active]:via-[#6E2C96] data-[state=active]:to-[#D92293] data-[state=active]:text-white data-[state=active]:shadow-md dark:text-slate-300";
const TAB_CARD = "mt-3 rounded-2xl border border-white/70 bg-[#e8ecf9] p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900";

function SectionCard({ icon: Icon, title, subtitle, children, collapsible = true, defaultOpen = true, forceOpen = false }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean; forceOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open || forceOpen;
  const head = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1 text-left">
        <h3 className="text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={subtitle}>{subtitle}</p>
      </div>
      {collapsible && (shown ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />)}
    </>
  );
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      {collapsible ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown} className="flex w-full items-center gap-2.5" title={shown ? "Clique para recolher" : "Clique para expandir"}>{head}</button>
      ) : (
        <header className="flex items-center gap-2.5">{head}</header>
      )}
      {shown && <div className="mt-2.5 space-y-2">{children}</div>}
    </section>
  );
}

function Req() {
  return <span className="text-red-500"> *</span>;
}

function CharCount({ value, max }: { value: string; max: number }) {
  return <span className={`block text-right text-xs ${value.length > max ? "text-red-600" : "text-slate-400"}`}>{value.length}/{max}</span>;
}

function fmtUpdatedAt(raw?: string | null) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

// Cabeçalho do editor no padrão da plataforma (degradê da marca): voltar,
// nome + status, subtítulo, versão, atualizar, menu ⋮ (nova versão / fixar na
// bandeja) e fechar. Pedido do usuário 2026-09-25 (layout de referência).
function HeaderIconBtn({ label, onClick, children, className = "" }: { label: string; onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={onClick} aria-label={label} className={`rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white ${className}`}>
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Seletor de versões do cabeçalho. Só a publicada VIGENTE leva o nome "Publicada";
// as anteriores viram "Versão antiga" com o período em que valeram (da publicação
// até a publicação da versão seguinte); o rascunho só aparece se existir.
function versionDate(raw?: string | null) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR");
}
function describeVersion(v: any, all: any[], unsavedDraftId?: string | null) {
  if (v.state === "rascunho") {
    return { title: `v${v.version_number} — Rascunho`, sub: v.id === unsavedDraftId ? "ainda não salvo" : "em edição, ainda não publicado", dot: "bg-amber-400", tone: "text-amber-700" };
  }
  if (v.is_published_current) {
    const from = versionDate(v.published_at);
    return { title: `v${v.version_number} — Publicada`, sub: from ? `no ar desde ${from}` : "no ar agora", dot: "bg-emerald-400", tone: "text-emerald-700" };
  }
  const next = all
    .filter((o) => o.state === "publicada" && o.version_number > v.version_number && o.published_at)
    .sort((a, b) => a.version_number - b.version_number)[0];
  const from = versionDate(v.published_at);
  const to = versionDate(next?.published_at);
  const period = from && to ? `valeu de ${from} a ${to}` : from ? `valeu desde ${from}` : "versão substituída";
  return { title: `v${v.version_number} — Versão antiga`, sub: period, dot: "bg-slate-400", tone: "text-slate-500" };
}
function VersionPicker({ versions, selectedVersionId, onSelect, unsavedDraftId, light = false }: any) {
  const ordered = [...versions].sort((a: any, b: any) => b.version_number - a.version_number);
  const current = versions.find((v: any) => v.id === selectedVersionId) ?? ordered[0];
  const cur = current ? describeVersion(current, versions, unsavedDraftId) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Versão do produto"
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ring-1 transition focus:outline-none ${light ? "bg-white text-slate-800 ring-slate-300 hover:bg-slate-50" : "bg-white/15 text-white ring-white/30 backdrop-blur hover:bg-white/25 focus:ring-2 focus:ring-white/60"}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${cur?.dot ?? "bg-slate-400"}`} />
          {cur?.title ?? "Versão"}
          <ChevronDown className={`h-4 w-4 ${light ? "text-slate-500" : "text-white/80"}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[17rem]">
        {ordered.map((v: any) => {
          const d = describeVersion(v, versions, unsavedDraftId);
          return (
            <DropdownMenuItem key={v.id} onClick={() => onSelect(v.id)} className="flex items-start gap-2.5 py-2">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${d.dot}`} />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{d.title}{v.id === selectedVersionId ? " ✓" : ""}</span>
                <span className={`text-[11px] ${d.tone}`}>{d.sub}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditorHeader({ product, selectedVersionId, onSelectVersion, onBack, onRefresh, canNewVersion, onNewVersion, pin, canPublish, onPublish, versionInfo, priceInfo, editMode, onStartEdit, onStopEdit, onChangeStatus, onSaveDraft, unsavedDraftId, onClientView, previewOpen }: any) {
  const { pinned, toggle } = usePinEntry(pin ?? null);
  const [spinning, setSpinning] = useState(false);
  const refresh = async () => {
    setSpinning(true);
    try { await onRefresh(); } finally { window.setTimeout(() => setSpinning(false), 600); }
  };
  const selVersion = product.versions.find((v: any) => v.id === selectedVersionId);
  const isDraftView = selVersion?.state === "rascunho";
  const isOldView = selVersion?.state === "publicada" && !selVersion?.is_published_current;
  const headerTitle = (selVersion?.title || "").trim() || product.internal_name;
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-5 py-3 shadow-lg ring-1 ring-white/15"
      style={{ background: "radial-gradient(ellipse at 88% -20%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.10)), var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))" }}
    >
      <HeaderIconBtn label="Voltar" onClick={onBack}><ArrowLeft className="h-6 w-6" /></HeaderIconBtn>
      <div className="min-w-[12rem] flex-1">
        <h2 title={headerTitle !== product.internal_name ? `Nome interno: ${product.internal_name}` : undefined} className="min-w-0 text-xl font-bold leading-tight text-white">{headerTitle}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {isDraftView && <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-sm">Rascunho v{selVersion.version_number} · não publicado</span>}
          {isOldView && <span className="inline-flex items-center gap-1 rounded-full bg-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-800 shadow-sm">Versão antiga v{selVersion.version_number}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!editMode}
                aria-label="Status do produto"
                title={editMode ? "Status comercial do produto — clique para alterar" : "Status comercial do produto — clique em Editar para alterar"}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm transition disabled:cursor-default ${editMode ? "hover:brightness-95" : ""} ${catalog2StatusTone(product.status)}`}
              >
                {(isDraftView || isOldView) && <span className="font-normal opacity-70">Produto:</span>}{catalog2StatusLabel(product.status)}{editMode && <ChevronDown className="h-3 w-3" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {CATALOG2_STATUSES.map((st) => (
                <DropdownMenuItem key={st} onClick={() => onChangeStatus(st)} className="flex flex-col items-start gap-0.5">
                  <span className="font-semibold">{CATALOG2_STATUS_LABEL[st]}{st === product.status ? " ✓" : ""}</span>
                  <span className="max-w-[16rem] text-[11px] leading-snug text-muted-foreground">{CATALOG2_STATUS_MEANING[st]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {product.is_new && <Badge className="bg-emerald-100 text-emerald-700">Novo</Badge>}
          {selVersion && !isDraftView && !isOldView && <span title="Versão que está aberta e o estado dela (rascunho ou publicada)" className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/25">Versão v{selVersion.version_number} · {selVersion.state === "rascunho" ? "rascunho" : "publicada"}</span>}
          {product.header && (
            <>
              <span title={product.header.published ? `A v${product.header.published_version_number} está publicada: é a versão congelada que o catálogo usa` : "Nenhuma versão foi publicada ainda"} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${product.header.published ? "bg-sky-100 text-sky-900 ring-sky-300" : "bg-slate-200 text-slate-700 ring-slate-300"}`}>{product.header.published ? `Publicado · v${product.header.published_version_number}` : "Não publicado"}</span>
              <span title={product.header.activated ? "O produto está Disponível no catálogo" : product.header.awaiting_activation ? "Versão publicada, mas o produto ainda não foi ativado (continua Em preparação)" : "O produto não está ativo no catálogo"} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${product.header.activated ? "bg-emerald-100 text-emerald-900 ring-emerald-300" : product.header.awaiting_activation ? "bg-amber-100 text-amber-900 ring-amber-300" : "bg-slate-200 text-slate-700 ring-slate-300"}`}>{product.header.activated ? "Ativo" : product.header.awaiting_activation ? "Aguardando ativação" : "Não ativo"}</span>
            </>
          )}
          {priceInfo && <span title={priceInfo.hint} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-0.5 text-sm font-bold text-white ring-1 ring-white/25">{priceInfo.text}</span>}
        </div>
      </div>
      <VersionPicker versions={product.versions} selectedVersionId={selectedVersionId} onSelect={onSelectVersion} unsavedDraftId={unsavedDraftId} />
      {versionInfo?.published && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Sobre esta versão" className="rounded-full p-1.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white">
                <Info className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="max-w-sm space-y-2 p-4 text-[13px] leading-relaxed">
              <p className="text-sm font-bold">{versionInfo.current ? `v${versionInfo.number} é a versão publicada atual` : `v${versionInfo.number} é uma versão anterior`}</p>
              <p>Versões publicadas ficam <strong>somente leitura</strong> — assim o que o cliente viu e contratou nunca muda por engano.</p>
              <p>Para alterar o produto, clique em <strong>Editar</strong> e depois em <strong>Salvar rascunho</strong> (v{versionInfo.number + 1}). Se não salvar, nada muda: a versão publicada continua igual.</p>
              <p>Ao clicar em <strong>Publicar</strong>, o rascunho substitui a versão atual, e a anterior fica guardada. {versionInfo.current ? "" : "Nesta versão, o botão Publicar volta a torná-la a versão vigente."}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <HeaderIconBtn label="Visualizar como o cliente vê (prévia da versão que está aberta)" onClick={onClientView} className={previewOpen ? "!bg-white/25 !text-white" : ""}><Eye className="h-5 w-5" /></HeaderIconBtn>
      {editMode ? (
        <>
          <button
            type="button"
            onClick={onStopEdit}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-gradient-to-b from-white/25 to-white/5 px-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur transition hover:from-white/35 hover:to-white/10 active:scale-[0.98]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><Lock className="h-3 w-3" /></span> Travar edição
          </button>
          {versionInfo && !versionInfo.published && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] ring-1 ring-white/25 transition hover:bg-emerald-400"
            >
              <Save className="h-4 w-4" /> Salvar rascunho
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          aria-label="Editar"
          title="Editar produto"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/25"
        >
          <Pencil className="h-[18px] w-[18px]" />
        </button>
      )}
      {canPublish && (
        <button
          type="button"
          onClick={onPublish}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(123,44,219,0.35)] ring-1 ring-white/25 transition hover:brightness-110"
        >
          <UploadCloud className="h-4 w-4" /> Publicar
        </button>
      )}
      {pin && (
        <HeaderIconBtn label={pinned ? "Remover da Bandeja de Telas" : "Fixar na Bandeja de Telas"} onClick={toggle} className={pinned ? "!text-amber-300" : ""}>
          <Pin className={`h-5 w-5 ${pinned ? "fill-current" : ""}`} />
        </HeaderIconBtn>
      )}
      <HeaderIconBtn label="Recarregar dados do produto (busca de novo no servidor o que foi salvo)" onClick={refresh}>
        <RefreshCw className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`} />
      </HeaderIconBtn>
      {(canNewVersion || pin) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Mais ações" className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canNewVersion && <DropdownMenuItem onClick={onNewVersion}>Nova versão (rascunho)</DropdownMenuItem>}
            {pin && (
              <DropdownMenuItem onClick={toggle}>
                <Pin className="h-4 w-4" /> {pinned ? "Remover da Bandeja de Telas" : "Fixar na Bandeja de Telas"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <HeaderIconBtn label="Fechar" onClick={onBack}><X className="h-6 w-6" /></HeaderIconBtn>
    </div>
  );
}

function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 rounded-lg bg-violet-50/70 px-3 py-1.5 text-xs text-slate-600 dark:bg-violet-950/20 dark:text-slate-300">{children}</p>;
}
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}
function DeleteBtn({ label, onConfirm, tip }: { label: string; onConfirm: () => void; tip?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconBtn tone="danger" label={tip ?? label.replace(/\?$/, "")} onClick={() => setOpen(true)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
      <ConfirmationDialog open={open} onClose={() => setOpen(false)} title={label} message="Esta ação não pode ser desfeita." confirmText="Excluir" destructive onConfirm={onConfirm} />
    </>
  );
}
function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const c = [...arr];
  const j = i + dir;
  if (j < 0 || j >= c.length) return c;
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

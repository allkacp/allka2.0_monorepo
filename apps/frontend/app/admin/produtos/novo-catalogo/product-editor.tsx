"use client";

import { Fragment, Suspense, lazy, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Copy, RefreshCw, Search, Link2, Unlink, FileText, Settings2, Clock, Save, CheckCircle2, MoreVertical, X, Pin, Tag, Layers, ListChecks, CheckSquare, ListOrdered, DollarSign, CalendarClock, Info, Sparkles, UploadCloud, Undo2, Pencil, Lock, Eye, Check, Globe2, AlertCircle, Lightbulb, ExternalLink, User, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePinEntry, type PinnedEntry } from "@/contexts/open-screens-context";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Catalog2ProductDetail } from "@/components/catalog2-product-detail";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useIallkaContext } from "@/contexts/iallka-context";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { AccordionToggleAll, useAccordionAll } from "./accordion-toggle-all";
import { FramedModal, FramedPanel, FRAMED_HEADER_CLASS } from "@/components/framed-panel";
import { ModelPickerDialog, TaskModelInfoDialog, ModelScopeDialog, ModelEditCtx, type ModelScope, SimilarModelsDialog, ModelStatusChips, TaskIndicators, EXEC_LABEL, PURPOSE_LABEL, CYCLE_TYPE_LABEL, REPEAT_RULE_LABEL, IMPLEMENTATION_RULE_LABEL, CONTINUITY_LABEL, ASSET_RULE_LABEL } from "./catalog2-models-ui";
import { TaskOpsForm } from "./catalog2-ops-ui";
import { OPEN_STEP_EVENT, TaskDeliverablesEditor } from "./catalog2-deliverables-ui";
import { StepBlock, useBlocks, useIsNarrow } from "./step-blocks";
import { BLOCK_IDS, blockInfo, firstIssue, stepIssues, type BlockInfo, type StepBlockId, type StepIssue } from "./step-completeness";
import { StepDeliverablesEditor } from "./step-deliverables-editor";
import { activeDeliv, commitDelivItems, delivIssues, hasDelivPending, isStaleDraft, itemsFromTask, type DelivItem } from "./step-deliverables";
import { deliverableBrief, deliverableIssues, deliverableSituation } from "./catalog2-deliverable-fields";
import { ClientApprovalSection, MODE_LABEL, effectiveMode } from "./client-approval";
import { StepCyclesSection, generateCycles } from "./step-cycles";
import { ProductPeriodsInline } from "./product-periods-inline";
import { DurationInput } from "./duration-input";
import { HeaderPriceTag } from "./header-price-tag";
import { StatusChangeDialog } from "./status-change-dialog";
import { StepFinalSummary } from "./step-final-summary";
import { makeQuickCreate } from "./quick-variation";
import { RevealBox, flashElement } from "./reveal";
import { StepAccessesEditor } from "./step-accesses-editor";
import { accessIssues, accessName, activeItems, commitAccessItems, configuredCount, hasPending, incompleteCount, itemsFromRequirements, opsAfterAccesses, type AccessItem } from "./step-accesses";
import { AiConfig } from "./catalog2-ai-ui";
import { CommercialConsistencyBanner } from "./commercial-consistency";
import { CommercialFieldsCard } from "./catalog2-commercial-ui";
import { ConnectionsSection, AccessesSummary } from "./catalog2-connections-ui";
import { TaskSummaryCard } from "./task-summary";
import { ChargeSummary, ChargeSummaryLoader, ChargeMemory } from "./charge-summary";
import { ContinuityCard } from "./continuity-card";
import { ClearTaskButton, RestoreTaskPanel } from "./task-clear";
import { createPortal } from "react-dom";
import { SpecialtyCombobox } from "./specialty-combobox";
import { OptionExamples } from "./option-examples-ui";
import { OptionStepAdjustments } from "./option-step-adjust-ui";
import { StepDetailsSummary } from "./step-details-summary";
import { UnsavedChangesDialog, type UnsavedMode } from "./unsaved-dialog";
import { ConfirmDeleteButton, EditableVariationName } from "./variation-actions-ui";
import { StepChecklistDialog, checklistCount, type ChecklistItem } from "./catalog2-step-checklist-ui";
import { AudienceCard, audienceSummary } from "./catalog2-audience-ui";
import { collectAiFreeStages } from "./catalog2-ai-free-changes";
const aiFreeTotal = (v: any) => { const rows = collectAiFreeStages(v); return rows.length === 0 ? "—" : rows.reduce((n: number, r: any) => n + r.value, 0); };
import { Users as AudienceIcon } from "lucide-react";
import { AiFreeChangesCard } from "./catalog2-ai-free-changes";
import { accessPatch } from "./step-access-picker";
import { APPROVER_OPTIONS, applyApprover, approverOf, enforceApprover, type ApproverMode } from "./step-approver";
import { FieldHelpLayer } from "./field-help-layer";
import { AccessCatalogDialog, accessCount, typeSummary } from "./catalog2-access-catalog-ui";
import { ProductAiChatDialog, draftToVersionPatch } from "./catalog2-product-ai-chat";
import { StepGovernance } from "./catalog2-step-governance-ui";
import { EmergencyCard } from "./catalog2-emergency-ui";
import { StepFlowEditor, StepFlowControls, stepFlowChips, stepStartMode, startChangePayload, flowSummary } from "./catalog2-step-flow-ui";
import { useWorkCalendar, fmtBusinessMinutes, businessDaysOf } from "@/lib/use-work-calendar";
import { specialtiesForMode, keepSpecialtyForMode, isSpecialtyCompatible, emptySpecialtyHint, EXEC_KIND_LABEL, specialtyKind } from "./catalog2-specialty-kind";
import { EffortEffectForm, EFFORT_TYPES, isEffortType, effortEffectSummary, InternalNameEditor, ProductCounts, ApprovalGatesSection, SlaRulesSection, UniversalMemory, availabilityLabel } from "./catalog2-universal-ui";
import { draftFromSuggestion, payloadFromDraft, questionTypeLabel, type QuestionDraft, type QuestionCtx } from "./catalog2-questions-ui";
import { BRAND_OUTLINE_CLASS, QuestionList, QuestionnaireDataModal, QuestionnaireEditor, QuestionnairePreview, questionnaireBody, stateFromServer, type QuestionnaireState } from "./catalog2-questionnaire-builder";
import { BillingSplitSection } from "@/components/catalog2-pricing-memory-popover";
import { VariationSettings, OptionSettings, AddonSettings, ChargeScopeFields, chargeScopeLabel } from "./catalog2-choices-ui";
import { CATALOG2_STATUSES, CATALOG2_STATUS_LABEL, CATALOG2_STATUS_MEANING, catalog2StatusLabel, catalog2StatusTone, type Catalog2Status } from "@/lib/catalog2-status";
import { ButtonLoader, InlineLoader, PageLoader } from "@/components/ui/loading";

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
  ...EFFORT_TYPES,
] as const;
const OPERATORS = [["eq", "igual a"], ["neq", "diferente de"], ["gte", "maior ou igual a"], ["lte", "menor ou igual a"], ["contains", "contém"], ["selected", "está selecionado"], ["not_selected", "não está selecionado"]] as const;
const TRIGGERS = [["variation_option", "Opção de variação"], ["addon_selected", "Adicional selecionado"], ["quantity", "Quantidade"], ["client_answer", "Resposta do cliente"], ["contract_attribute", "Atributo da contratação"]] as const;
/** Botões "Ajudante" ocultos por ora (pedido do usuário, 20/10): o código continua; mude para true quando for melhorá-los. */
const SHOW_HELPER_BUTTON = false;
const EXEC_MODES = [["humano", "Humano"], ["ia", "IA"], ["hibrido", "Humano ou IA"]] as const;

/** Edição de um MODELO GLOBAL dentro de "Modelos globais": o mesmo editor do produto, focado na tarefa/etapa onde o modelo é usado. */
export interface EmbeddedModel { kind: "task" | "step"; modelId: number; taskId: string; stepId?: string; modelName: string; onClose: () => void }

export function ProductEditor({ productId, onBack, pin, notice, embedded, openInEditMode = false }: { productId: string; onBack: () => void; pin?: PinnedEntry; notice?: React.ReactNode; embedded?: EmbeddedModel | null; /** Produto recém-criado: já abre com os campos editáveis (sem o botão Editar). */ openInEditMode?: boolean }) {
  const [product, setProduct] = useState<any>(null);
  const [refs, setRefs] = useState<{ pillars: any[]; fourF: any[]; categories: any[]; specialties: any[]; questionnaires: any[]; qualifierPercent: number | null }>({ pillars: [], fourF: [], categories: [], specialties: [], questionnaires: [], qualifierPercent: null });
  // Posição na tela: ao dar F5 (ou Ctrl+R) a pessoa volta exatamente para o passo, a sub-aba, a versão, o modo de edição
  // e a rolagem onde estava. Guardado na sessão da aba (some ao fechar a aba) — não vai para o servidor.
  const stateKey = `allka:product-editor:${productId}`;
  const restored = useRef<{ tab?: string; sub?: Record<string, string>; ver?: string; edit?: boolean; y?: number; win?: number } | null>(null);
  if (restored.current === null) {
    let s: any = null;
    try { s = JSON.parse(typeof window !== "undefined" ? window.sessionStorage.getItem(stateKey) ?? "null" : "null"); } catch { s = null; }
    restored.current = s && typeof s === "object" ? s : {};
  }
  const [selectedVersionId, setSelectedVersionId] = useState<string>(restored.current?.ver ?? "");
  const [editorTab, setEditorTab] = useState(restored.current?.tab && ["info", "entrega", "opcoes", "precos", "revisao"].includes(restored.current.tab) ? restored.current.tab : "info");
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const [highlightTaskIds, setHighlightTaskIds] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  // Aviso visível de salvamento: "Salvando…" (azul), salvo (verde) e erro (vermelho, fica até fechar).
  const [toast, setToast] = useState<{ kind: "saving" | "ok" | "error"; text: string } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((kind: "saving" | "ok" | "error", text: string) => {
    if (toastTimer.current) { window.clearTimeout(toastTimer.current); toastTimer.current = null; }
    setToast({ kind, text });
    if (kind === "ok") toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  const [screenNotifications, setScreenNotifications] = useState<{ id: string; content: React.ReactNode }[]>([]);
  const [screenNotificationsOpen, setScreenNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Prontidão navegável (pedido do usuário 2026-09-25): clicar num item leva
  // à aba/sub-aba/campo certo e destaca em amarelo até o item ficar resolvido.
  const [loadCount, setLoadCount] = useState(0);
  const [accessCatalogOpen, setAccessCatalogOpen] = useState(false);
  // "add" = adicionar acesso geral ao produto · "manage" = só configurar os tipos pré-definidos (aberto pelo botão da lista das etapas).
  const [accessCatalogMode, setAccessCatalogMode] = useState<"add" | "manage">("add");
  useEffect(() => {
    const open = () => { setAccessCatalogMode("manage"); setAccessCatalogOpen(true); };
    window.addEventListener("catalog2:manage-access-types", open);
    return () => window.removeEventListener("catalog2:manage-access-types", open);
  }, []);
  const [subTabs, setSubTabs] = useState<{ opcoes: string; entrega: string; revisao: string }>({ opcoes: "class", entrega: "tarefas", revisao: "preview", ...(restored.current?.sub ?? {}) });
  const entregaInfo = {
    tarefas: {
      title: "Tarefas e etapas",
      text: "As cores ajudam a achar cada coisa na lista:",
      legend: [
        { dot: "bg-gradient-to-br from-slate-900 to-fuchsia-600", chip: "bg-slate-100 text-slate-800", name: "Degradê", what: "Os números dos blocos (1, 2, 3…), na ordem da tela" },
        { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", name: "Roxo", what: "Resumo da tarefa (nome e número da tarefa)" },
        { dot: "bg-amber-400", chip: "bg-amber-100 text-amber-800", name: "Amarelo", what: "Configuração específica deste produto" },
        { dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", name: "Azul", what: "Etapas (o passo a passo da tarefa)" },
        { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", name: "Verde", what: "Modelo global ou configuração válida" },
      ] as { dot: string; chip: string; name: string; what: string }[],
    },
    cond: { title: "Prazos e condições", text: "Cadastre regras reais de gatilho e efeito. Elas podem alterar prazo, preço, tarefas, etapas ou entregáveis conforme a contratação.", legend: undefined },
    aprov: { title: "Aprovações e prazos", text: "Configure quem aprova, em qual momento e os prazos de cada aprovação antes de a entrega avançar.", legend: undefined },
  }[subTabs.entrega] ?? { title: "Informações", text: "Informações desta etapa.", legend: undefined };
  const [watch, setWatch] = useState<{ key: string; ids: string[] } | null>(null);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  // Ao configurar um custo global a partir de uma tarefa, a pessoa não perde o
  // contexto: o editor guarda a origem e reabre a própria tarefa ao voltar.
  const [pricingReturnTaskId, setPricingReturnTaskId] = useState<string | null>(null);
  const [taskEditRequest, setTaskEditRequest] = useState<string | null>(null);
  // A tela abre TRAVADA (só leitura): só o botão "Editar" libera os campos, pra
  // ninguém alterar produto sem querer.
  const [editMode, setEditMode] = useState(openInEditMode);
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
  // "Salvar rascunho" só fica ativo depois que algo mudou desde o último salvamento (ou desde que a tela abriu).
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  // Marca "tem alteração" FORA do evento de digitação (adiado): o campo que está sendo digitado não é re-renderizado junto
  // com o editor inteiro no primeiro caractere.
  const markDirty = useCallback(() => {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    window.setTimeout(() => setDirtyState(true), 0);
  }, []);
  const setDirty = useCallback((v: boolean) => { dirtyRef.current = v; setDirtyState(v); }, []);
  const [starting, setStarting] = useState(false);
  // Largura da barra de rolagem da área de conteúdo: o cabeçalho (fora da rolagem) usa a mesma folga à direita,
  // para cabeçalho, checklist, passos e cartões terem exatamente a mesma largura e as mesmas margens.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [barW, setBarW] = useState(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) { setBarW(0); return; }
    const measure = () => setBarW(Math.max(0, el.offsetWidth - el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  });
  const [pubDlg, setPubDlg] = useState<{ val: any } | null>(null);
  // Saída com rascunho novo NÃO salvo e com alterações: pergunta antes de descartar.
  const [leaveDlg, setLeaveDlg] = useState<"close" | "lock" | null>(null);
  // Visualização do cliente DENTRO do editor (mostra a versão aberta, rascunho ou publicada).
  const [previewOpen, setPreviewOpen] = useState(false);
  const forms = useRef(new Map<string, OpenFormApi>());
  const registerForm = useCallback((id: string, api: OpenFormApi) => { forms.current.set(id, api); return () => { if (forms.current.get(id) === api) forms.current.delete(id); }; }, []);
  const dirtyForms = () => [...forms.current.values()].filter((f) => f.isDirty());
  const [unsavedDlg, setUnsavedDlg] = useState<UnsavedMode | null>(null);
  const [unsavedBusy, setUnsavedBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const flushers = useRef(new Set<() => Promise<void>>());
  const registerFlusher = useCallback((fn: () => Promise<void>) => { flushers.current.add(fn); return () => { flushers.current.delete(fn); }; }, []);
  async function flushPending() { for (const fn of [...flushers.current]) await fn(); }
  // A janela "Entrega comercial" pede para salvar o rascunho (ou só gravar o que está pendente ao fechar) sem sair dela.
  const saveDraftRef = useRef<() => Promise<boolean>>(async () => false);
  useEffect(() => {
    const onSave = () => { void saveDraftRef.current(); };
    const onFlush = () => { void flushPending(); };
    window.addEventListener("catalog2:save-draft", onSave);
    window.addEventListener("catalog2:flush-pending", onFlush);
    return () => { window.removeEventListener("catalog2:save-draft", onSave); window.removeEventListener("catalog2:flush-pending", onFlush); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function openPricingFromTask(taskId: string) {
    // Campos da tarefa podem estar abertos. Persistimos antes de abrir a
    // configuração global para que o retorno seja sempre para um rascunho real.
    await flushPending();
    autoDraftRef.current = { promise: null, draftId: null, baseId: null };
    setTaskEditRequest(taskId);
    setPricingReturnTaskId(taskId);
    setPricingOpen(true);
    setMsg("Rascunho salvo. Configure a precificação e você volta para esta mesma tarefa.");
  }
  async function closePricing(returnToTask = true, saved = false) {
    const taskId = pricingReturnTaskId;
    setPricingOpen(false);
    await load();
    if (!returnToTask || !taskId) return;
    setEditorTab("entrega");
    setSubTabs((current) => ({ ...current, entrega: "tarefas" }));
    setHighlightTaskIds([taskId]);
    setTaskEditRequest(taskId);
    setPricingReturnTaskId(null);
    setMsg(saved ? "Precificação salva. Você voltou à tarefa que estava editando." : "Você voltou à tarefa que estava editando. O rascunho continua salvo.");
    window.setTimeout(() => document.getElementById(`catalog2-task-${taskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
  }
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [readinessItems, setReadinessItems] = useState<Record<string, { level: string; note: string }> | null>(null);
  const { setScreenContext: setIallkaScreenContext } = useIallkaContext();
  const lastScreenMessage = useRef<string | null>(null);
  const readinessNoticeVersion = useRef<string | null>(null);

  // Avisos desta tela não se misturam ao sino global: vivem só enquanto o
  // editor está aberto e ficam disponíveis no rodapé até serem visualizados.
  useEffect(() => {
    if (!msg) { lastScreenMessage.current = null; return; }
    if (lastScreenMessage.current === msg) return;
    lastScreenMessage.current = msg;
    setScreenNotifications((items) => [...items, { id: `message-${Date.now()}`, content: msg }]);
  }, [msg]);
  useEffect(() => {
    if (!notice || noticeHidden) return;
    setScreenNotifications((items) => items.some((item) => item.id === "editor-notice") ? items : [...items, { id: "editor-notice", content: notice }]);
  }, [notice, noticeHidden]);
  useEffect(() => {
    if (!selectedVersionId || readinessNoticeVersion.current === selectedVersionId) return;
    const entries = Object.values(readinessData?.items ?? {}) as any[];
    const blockers = entries.filter((item) => item?.level === "bloqueador").length;
    const pending = entries.filter((item) => item?.level === "pendente").length;
    if (!blockers && !pending) return;
    readinessNoticeVersion.current = selectedVersionId;
    setScreenNotifications((items) => [...items, { id: `readiness-${selectedVersionId}`, content: `Este produto tem ${blockers ? `${blockers} ${blockers === 1 ? "bloqueio" : "bloqueios"}` : ""}${blockers && pending ? " e " : ""}${pending ? `${pending} ${pending === 1 ? "pendência" : "pendências"}` : ""} para revisar antes de publicar.` }]);
  }, [readinessData, selectedVersionId]);

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
    const [p, pil, ff, cat, sp, qn, ps] = await Promise.all([
      apiClient.getCatalog2Product(productId),
      apiClient.getCatalog2Pillars(),
      apiClient.getCatalog2FourF(),
      apiClient.getCatalog2Categories(),
      apiClient.getCatalog2Specialties(),
      apiClient.getCatalog2Questionnaires(),
      Promise.resolve(apiClient.getCatalog2PricingSettings()).catch(() => null),
    ]);
    const cur = p;
    setProduct(cur);
    setRefs({ pillars: pil.data, fourF: ff.data, categories: cat.data, specialties: sp.data, questionnaires: qn.data, qualifierPercent: (ps as any)?.human_review_percent ?? null });
    setSelectedVersionId((sel) => sel && cur.versions.some((v: any) => v.id === sel) ? sel : (// Produto JÁ PUBLICADO abre na versão publicada (leitura); o rascunho só entra em cena quando você clica em Editar. Sem publicação, abre o rascunho.
      cur.versions.find((v: any) => v.id === cur.published_version_id)?.id ?? cur.versions.find((v: any) => v.state === "rascunho")?.id ?? cur.versions[0]?.id ?? ""));
    setLoading(false);
    setLoadCount((c) => c + 1);
  }, [productId]);

  useEffect(() => { void load(); }, [load]);
  // Recarrega as especialidades (ex.: depois de editar o valor/hora dentro de uma etapa).
  useEffect(() => { const on = () => { void load(); }; window.addEventListener("catalog2:reload-refs", on); return () => window.removeEventListener("catalog2:reload-refs", on); }, [load]);

  // ── Guardar/restaurar a posição (F5 volta para o mesmo lugar) ────────────
  const scrollPos = useRef({ y: restored.current?.y ?? 0, win: restored.current?.win ?? 0 });
  const persistState = useCallback(() => {
    try {
      window.sessionStorage.setItem(stateKey, JSON.stringify({ tab: editorTab, sub: subTabs, ver: selectedVersionId, edit: editMode, y: scrollPos.current.y, win: scrollPos.current.win }));
    } catch { /* sessão indisponível: segue sem restaurar */ }
  }, [stateKey, editorTab, subTabs, selectedVersionId, editMode]);
  useEffect(() => { if (!loading) persistState(); }, [loading, persistState]);
  useEffect(() => {
    const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
      for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
        const oy = getComputedStyle(n).overflowY;
        if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    };
    let t = 0;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const sp = scrollParent(document.getElementById("catalog2-editor-tabs"));
        scrollPos.current = { y: sp?.scrollTop ?? scrollPos.current.y, win: window.scrollY };
        persistState();
      }, 150);
    };
    document.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("scroll", onScroll, true); window.clearTimeout(t); };
  }, [persistState]);
  // Depois do primeiro carregamento: reabre a edição (só se a versão guardada for um RASCUNHO, sem criar nada) e volta a rolagem.
  const didRestore = useRef(false);
  useEffect(() => {
    if (didRestore.current || loading || !product) return;
    didRestore.current = true;
    const r = restored.current ?? {};
    const ver = product.versions.find((v: any) => v.id === selectedVersionId);
    if (r.edit && ver?.state === "rascunho") setEditMode(true);
    const apply = () => {
      const el = document.getElementById("catalog2-editor-tabs");
      for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
        const oy = getComputedStyle(n).overflowY;
        if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) { n.scrollTop = r.y ?? 0; break; }
      }
      if (r.win) window.scrollTo(0, r.win);
    };
    if ((r.y ?? 0) > 0 || (r.win ?? 0) > 0) [120, 500, 1200].forEach((ms) => window.setTimeout(apply, ms));
  }, [loading, product, selectedVersionId]);

  // Prévia local: os chips da tarefa precisam acompanhar a escolha antes do
  // salvamento. Persistência continua exclusivamente no botão de salvar; ao
  // recarregar/fechar sem salvar, o servidor volta a ser a fonte oficial.
  useEffect(() => {
    const previewTask = (event: Event) => {
      const { taskId, patch } = (event as CustomEvent<{ taskId: string; patch: Record<string, unknown> }>).detail ?? {};
      if (!taskId || !patch) return;
      setProduct((current: any) => current ? {
        ...current,
        versions: current.versions.map((v: any) => ({ ...v, tasks: (v.tasks ?? []).map((task: any) => task.id === taskId ? { ...task, ...patch, specialty: patch.specialty ? patch.specialty : task.specialty } : task) })),
      } : current);
    };
    window.addEventListener("catalog2:task-draft", previewTask);
    return () => window.removeEventListener("catalog2:task-draft", previewTask);
  }, []);

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
    revealTargets([...ids, dest.target]);
    if (dest.target === "catalog2-delivery-recurrence") { setHighlightTarget(dest.target); revealDeliveryRecurrenceField(); window.setTimeout(() => setHighlightTarget((c) => (c === dest.target ? null : c)), 8000); return; }
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
    revealTargets([targetId, dest.target]);
    window.setTimeout(() => (document.getElementById(targetId) ?? document.getElementById(dest.target) ?? document.getElementById("catalog2-editor-tabs"))?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
  }
  const AMBER = "rounded-lg bg-amber-100 p-2 ring-2 ring-amber-400 dark:bg-amber-900/30";
  const GREEN = "rounded-lg bg-emerald-100 p-2 ring-2 ring-emerald-400 transition-colors dark:bg-emerald-900/30";
  const ringOf = (id: string) => (doneIds.includes(id) ? GREEN : watch?.ids.includes(id) || highlightTarget === id ? AMBER : "");
  const secRing = (id: string) => ringOf(id).replace("rounded-lg", "rounded-2xl").replace("p-2", "p-3");

  const version = useMemo(() => product?.versions.find((v: any) => v.id === selectedVersionId) ?? null, [product, selectedVersionId]);
  // "Ajustar" no preço → abre a etapa no bloco de horas/valor/hora; ao sair dela, volta para a Composição do preço.
  useEffect(() => {
    const go = (e: Event) => {
      const { taskKey, stepKey } = ((e as CustomEvent).detail ?? {}) as { taskKey?: string; stepKey?: string };
      let stepId: string | null = null;
      for (const t of version?.tasks ?? []) for (const st of t.steps ?? []) if (st.key === stepKey && (!taskKey || t.key === taskKey)) stepId = st.id;
      if (!stepId) return;
      priceReturn.stepId = stepId;
      window.dispatchEvent(new Event(CLOSE_COST_CARDS_EVENT)); // fecha a janela do preço; ao voltar ela reabre
      setEditorTab("entrega"); setSubTabs((cur) => ({ ...cur, entrega: "tarefas" }));
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId, block: 2 } })), 450);
    };
    const back = () => {
      window.dispatchEvent(new Event(CLOSE_STEPS_PANELS_EVENT));
      window.setTimeout(() => { setEditorTab("precos"); window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_COST_CARD_EVENT, { detail: { id: "catalog2-composition-card" } })), 300); }, 250);
    };
    window.addEventListener(GOTO_STEP_PRICE_EVENT, go);
    window.addEventListener(RETURN_TO_PRICE_EVENT, back);
    return () => { window.removeEventListener(GOTO_STEP_PRICE_EVENT, go); window.removeEventListener(RETURN_TO_PRICE_EVENT, back); };
  }, [version]);
  const readOnly = version?.state === "publicada" || !editMode;
  // Modo "Modelos globais": usa a versão onde a tarefa/etapa está cadastrada e libera a edição (só se for rascunho; publicada nunca muda).
  const embeddedOpened = useRef(false);
  useEffect(() => {
    if (!embedded || !product) return;
    const v = (product.versions ?? []).find((x: any) => (x.tasks ?? []).some((t: any) => t.id === embedded.taskId));
    if (!v) return;
    if (selectedVersionId !== v.id) { setSelectedVersionId(v.id); return; }
    if (v.state === "rascunho" && !editMode) setEditMode(true);
    if (embedded.kind === "step" && embedded.stepId && !embeddedOpened.current && (v.state !== "rascunho" || editMode)) {
      embeddedOpened.current = true;
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: embedded.stepId } })), 400);
    }
  }, [embedded, product, selectedVersionId, editMode]);

  // Status COMERCIAL do produto (Ativo/Inativo…), separado do status da versão
  // (Rascunho/Publicada). Salva na hora, a partir do cabeçalho.
  const [statusAsk, setStatusAsk] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  function changeStatus(status: string) {
    if (status === product.status) return;
    const needsPublishedVersion = ["pre_lancamento", "disponivel", "temporariamente_inativo", "esgotado_temporariamente"].includes(status) && !product.published_version_id;
    if (needsPublishedVersion) {
      setMsg("Publique uma versão antes de usar este status, pois ele pode aparecer no catálogo do cliente.");
      return;
    }
    setStatusAsk(status);
  }
  // Status comercial vale na hora e não mexe em rascunho: aplicado depois da confirmação, sem marcar "alterações não salvas" (então sair não pergunta nada).
  async function applyStatus() {
    if (!statusAsk) return;
    setStatusBusy(true);
    try {
      await apiClient.setCatalog2ProductStatus(productId, statusAsk);
      showToast("ok", "Status do produto salvo.");
      setMsg("Status do produto salvo.");
      await load();
      setStatusAsk(null);
    } catch (e: any) {
      const message = e?.message ?? "Não foi possível mudar o status.";
      setMsg(message); showToast("error", message);
    } finally { setStatusBusy(false); }
  }

  // "Editar": libera os campos. Se a versão aberta é uma publicada e ainda não
  // há rascunho, cria o próximo (v2, v3…) — se ninguém mudar nada, é descartado
  // ao fechar (ver closeEditor).
  // Botão "Editar" dentro dos painéis (ex.: Questionário) liga a edição do produto, igual ao Editar do rodapé.
  useEffect(() => {
    const h = () => { if (!editMode) void startEditing(); };
    window.addEventListener("catalog2:start-editing", h);
    return () => window.removeEventListener("catalog2:start-editing", h);
  });
  async function startEditing() {
    if (starting) return;
    setMsg(null);
    setStarting(true);
    const needsNewVersion = version?.state === "publicada" && !product.versions.some((v: any) => v.state === "rascunho");
    if (needsNewVersion) showToast("saving", "Preparando a edição… aguarde um instante antes de digitar.");
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
      if (needsNewVersion) setToast(null);
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível iniciar a edição.");
      if (needsNewVersion) showToast("error", e?.message ?? "Não foi possível iniciar a edição.");
    } finally {
      setStarting(false);
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
      : MONTHLY_ISSUE_RE.test(issue) ? { tab: "precos", target: "catalog2-delivery-recurrence" }
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
    if (destination.target === "catalog2-delivery-recurrence") { revealDeliveryRecurrenceField(); window.setTimeout(() => setHighlightTarget((c) => (c === destination.target ? null : c)), 8000); return; }
    window.setTimeout(() => document.getElementById(destination.target)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  const clearPublishHighlight = (target: string) => setHighlightTarget((current) => current === target ? null : current);
  // Atalho do Passo 2 para o campo "Este produto gera uma nova entrega todo mês" (Passo 4 › Modalidades por período).
  function goToDeliveryRecurrence() {
    setEditorTab("precos");
    setHighlightTarget("catalog2-delivery-recurrence");
    revealDeliveryRecurrenceField();
    window.setTimeout(() => setHighlightTarget((c) => (c === "catalog2-delivery-recurrence" ? null : c)), 8000);
  }

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
    // Itens abertos sem salvar, ou rascunho ainda não guardado: pergunta antes de sair.
    if (dirty || dirtyForms().length > 0) { setUnsavedDlg("close"); return; }
    await closeNow();
  }
  async function closeNow() {
    await flushPending();
    const st = await unsavedDraftStatus();
    if (st === "changed") { setLeaveDlg("close"); return; }
    if (st === "unchanged") await discardUnsavedDraft();
    try { window.sessionStorage.removeItem(stateKey); window.sessionStorage.removeItem(OPEN_STORE_KEY); openStoreCache = null; } catch { /* ok */ }
    onBack();
  }

  // "Travar edição": volta ao modo leitura; se o rascunho é novo e não foi salvo, some e volta a publicada.
  async function stopEditing() {
    // Etapa aberta sem salvar, ou rascunho ainda não guardado: confirma antes de travar.
    if (dirty || dirtyForms().length > 0) { setUnsavedDlg("lock"); return; }
    await lockNow();
  }
  async function lockNow() {
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

  // "Salvar rascunho": grava tudo o que está aberto e mantém o rascunho (não será mais descartado ao sair).
  // A edição CONTINUA ATIVA: dá para seguir configurando e passar de um passo a outro sem clicar em "Editar" de novo.
  // Para travar, use "Travar edição".
  async function saveDraft(confirmed = false): Promise<boolean> {
    const pend = dirtyForms();
    // Há etapa(s) aberta(s) com alteração não salva: avisa que o rascunho salva tudo junto.
    if (pend.length > 0 && !confirmed) { setUnsavedDlg("draft"); return false; }
    showToast("saving", "Salvando rascunho…");
    try {
      for (const f of pend) await f.save();
      await flushPending();
      const n = version?.version_number;
      autoDraftRef.current = { promise: null, draftId: null, baseId: null };
      setDirty(false);
      const text = `Rascunho v${n} salvo. Você pode continuar editando; use “Travar edição” quando terminar. A versão publicada segue igual até você publicar.`;
      setMsg(text);
      showToast("ok", `Rascunho v${n} salvo com sucesso`);
      return true;
    } catch (e: any) {
      const message = e?.message ?? "Não foi possível salvar o rascunho.";
      setMsg(message);
      showToast("error", `Não foi possível salvar: ${message}`);
      return false;
    }
  }

  saveDraftRef.current = () => saveDraft(true);

  // Respostas da confirmação de itens não salvos.
  async function unsavedSave() {
    const mode = unsavedDlg; setUnsavedBusy(true);
    try {
      const ok = await saveDraft(true);
      setUnsavedDlg(null);
      if (!ok) return;
      if (mode === "lock") await lockNow();
      else if (mode === "close") await closeNow();
    } finally { setUnsavedBusy(false); }
  }
  async function unsavedDiscard() {
    const mode = unsavedDlg; setUnsavedBusy(true);
    try {
      for (const f of dirtyForms()) f.discard();
      setUnsavedDlg(null);
      const hadNewVersion = !!autoDraftRef.current.draftId;
      if (hadNewVersion) await discardUnsavedDraft();
      if (mode === "close") {
        try { window.sessionStorage.removeItem(stateKey); window.sessionStorage.removeItem(OPEN_STORE_KEY); openStoreCache = null; } catch { /* ok */ }
        onBack();
        return;
      }
      await load();
      if (hadNewVersion) setSelectedVersionId(product?.published_version_id ?? product?.versions.find((v: any) => v.state === "publicada")?.id ?? "");
      setDirty(false);
      setResetKey((k) => k + 1); // remonta a tela: campos voltam ao que está guardado
      setEditMode(false);
    } finally { setUnsavedBusy(false); }
  }

  async function act(fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) {
    setMsg(null);
    showToast("saving", "Salvando…");
    try {
      const r = await fn();
      const okMsg = typeof ok === "function" ? ok(r) : ok;
      if (okMsg) setMsg(okMsg);
      showToast("ok", okMsg || "Salvo com sucesso");
      markDirty();
      await load();
      return r;
    }
    catch (e: any) {
      const message = e?.message ?? "Falha na operação.";
      setMsg(message);
      showToast("error", message);
      if (opts?.rethrow) throw e instanceof Error ? e : new Error(message);
    }
  }

  if (loading) return <PageLoader text="Carregando produto…" compact />;
  if (!product) return <div className="flex flex-1 flex-col items-start gap-3 p-10 text-sm text-red-600">Produto não encontrado.<Button size="sm" variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</Button></div>;

  // "Modelos globais": o MESMO editor da tarefa/etapa (as mesmas peças do produto), sem a casca do produto (abas, publicação, preço).
  if (embedded) {
    const focusTask = version ? { ...version, tasks: (version.tasks ?? []).filter((t: any) => t.id === embedded.taskId) } : null;
    return (
      <ModelEditCtx.Provider value={{ embedded: true }}>
      <RingCtx.Provider value={ringOf}>
      <FlushCtx.Provider value={registerFlusher}>
      <FormsCtx.Provider value={registerForm}>
      <RefsCtx.Provider value={refs}>
      <FieldHelpLayer>
      <div key={resetKey} className="product-editor relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-[#dfe5f6] p-3 dark:bg-slate-950" data-testid="embedded-model-editor"
        onChangeCapture={() => { if (editMode) markDirty(); }} onInputCapture={() => { if (editMode) markDirty(); }}>
        {toast && typeof document !== "undefined" && createPortal(
          <div className="pointer-events-none fixed inset-0 z-[2147483000] flex items-center justify-center p-4">
            <div role={toast.kind === "error" ? "alert" : "status"} aria-live="polite" data-testid={`save-toast-${toast.kind}`}
              className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl border-2 px-6 py-4 text-base font-bold shadow-2xl ${toast.kind === "ok" ? "border-emerald-400 bg-emerald-50 text-emerald-900" : toast.kind === "error" ? "border-red-400 bg-red-50 text-red-900" : "border-sky-400 bg-sky-50 text-sky-900"}`}>
              {toast.kind === "saving" ? <Loader2 className="h-6 w-6 shrink-0 animate-spin" /> : toast.kind === "ok" ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <X className="h-6 w-6 shrink-0 text-red-600" />}
              <span className="min-w-0 flex-1 break-words">{toast.text}</span>
              {toast.kind === "error" && <button type="button" aria-label="Fechar aviso" className="ml-1 shrink-0 rounded-md p-1 hover:bg-red-100" onClick={() => setToast(null)}><X className="h-4 w-4" /></button>}
            </div>
          </div>,
          document.body,
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-slate-900" data-testid="embedded-model-banner">
          <div className="min-w-0">
            <p data-no-info="" className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Editando modelo global de {embedded.kind === "task" ? "tarefa" : "etapa"} #{embedded.modelId}</p>
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{embedded.modelName}</p>
            <p className="text-[11px] text-slate-500">Usado em: {product.internal_name} · v{version?.version_number} ({version?.state === "rascunho" ? "rascunho" : "publicada"}). É o mesmo editor do produto: ao salvar você escolhe entre criar novo modelo ou editar globalmente.</p>
          </div>
          <Button size="sm" variant="outline" onClick={embedded.onClose} data-testid="embedded-model-close">Fechar</Button>
        </div>
        {version && version.state !== "rascunho" && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900" data-testid="embedded-model-locked">Este uso está numa versão publicada, que nunca muda sozinha. Para editar, abra o produto, crie a próxima versão e edite lá — ou escolha outro produto que use este modelo.</p>}
        {focusTask && <TasksTab taskStructure="single" version={focusTask} productId={productId} readOnly={readOnly} refs={refs} act={act} highlightTarget={null} highlightTaskIds={[]} clearHighlight={() => {}} editTaskId={null} onOpenPricing={undefined} />}
      </div>
      </FieldHelpLayer>
      </RefsCtx.Provider>
      </FormsCtx.Provider>
      </FlushCtx.Provider>
      </RingCtx.Provider>
      </ModelEditCtx.Provider>
    );
  }

  return (
    <RingCtx.Provider value={ringOf}>
    <FlushCtx.Provider value={registerFlusher}>
    <FormsCtx.Provider value={registerForm}>
    <RefsCtx.Provider value={refs}>
    <FieldHelpLayer>
    <div key={resetKey} className="product-editor relative flex min-h-0 min-w-0 flex-1 flex-col gap-2"
      onChangeCapture={() => { if (editMode) markDirty(); }} onInputCapture={() => { if (editMode) markDirty(); }}>
      {/* Aviso de salvamento: no CENTRO da tela e por cima de tudo (fora do editor, direto no <body>, para nenhuma camada cobrir). */}
      {toast && typeof document !== "undefined" && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[2147483000] flex items-center justify-center p-4">
          <div role={toast.kind === "error" ? "alert" : "status"} aria-live="polite" data-testid={`save-toast-${toast.kind}`}
            className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl border-2 px-6 py-4 text-base font-bold shadow-2xl ${toast.kind === "ok" ? "border-emerald-400 bg-emerald-50 text-emerald-900" : toast.kind === "error" ? "border-red-400 bg-red-50 text-red-900" : "border-sky-400 bg-sky-50 text-sky-900"}`}>
            {toast.kind === "saving" ? <Loader2 className="h-6 w-6 shrink-0 animate-spin" /> : toast.kind === "ok" ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <X className="h-6 w-6 shrink-0 text-red-600" />}
            <span className="min-w-0 flex-1 break-words">{toast.text}</span>
            {toast.kind === "error" && <button type="button" aria-label="Fechar aviso" className="ml-1 shrink-0 rounded-md p-1 hover:bg-red-100" onClick={() => setToast(null)}><X className="h-4 w-4" /></button>}
          </div>
        </div>,
        document.body,
      )}
      <UnsavedChangesDialog mode={unsavedDlg} labels={dirtyForms().map((f) => f.label)} hasNewVersion={!!autoDraftRef.current.draftId} draftChanged={dirty} busy={unsavedBusy}
        onSave={() => void unsavedSave()} onDiscard={() => void unsavedDiscard()} onCancel={() => setUnsavedDlg(null)} />
      {statusAsk && version && <StatusChangeDialog open product={product} version={product.versions.find((v: any) => v.id === product.published_version_id) ?? version} from={product.status} to={statusAsk} fromLabel={CATALOG2_STATUS_LABEL[product.status as Catalog2Status] ?? product.status} toLabel={CATALOG2_STATUS_LABEL[statusAsk as Catalog2Status] ?? statusAsk} meaning={CATALOG2_STATUS_MEANING[statusAsk as Catalog2Status] ?? ""} busy={statusBusy} onCancel={() => setStatusAsk(null)} onConfirm={() => void applyStatus()} />}
      {!previewOpen && <div className="shrink-0" data-testid="editor-header-wrap"><EditorHeader
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
        readiness={<ProductReadinessPanel taskName={(version?.tasks ?? [])[0]?.name} productId={productId} versionId={selectedVersionId} versionKey={`${selectedVersionId}:${loadCount}`} onGo={goToReadinessItem} onGoDetail={goToReadinessAdjustment} onItems={setReadinessItems} onData={setReadinessData} detailFor={(key: string) => readinessDetailLines(key, product, version, readinessItems?.[key]?.note)} detailTargetFor={(key: string, index: number) => readinessDetailTargets(key, product, version, readinessItems?.[key]?.note)[index]} />}
      /></div>}
      {!previewOpen && (product.assignment_issues ?? []).some((i: any) => i.version_id === selectedVersionId) && <div role="alert" className="mx-3 my-2 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="specific-assignee-warning"><p className="font-semibold">Responsável específico indisponível — ajuste a configuração</p><ul className="mt-1 space-y-1">{(product.assignment_issues ?? []).filter((i: any) => i.version_id === selectedVersionId).map((i: any) => <li key={`${i.task_id}:${i.step_id}:${i.label}`}>{i.message}</li>)}</ul><button type="button" className="mt-1 font-semibold text-violet-700" onClick={() => { setEditorTab("entrega"); setSubTabs(cur => ({ ...cur, entrega: "tarefas" })); }}>Revisar tarefas e etapas</button></div>}
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
      <div className={`min-h-0 flex-1 flex-col ${previewOpen ? "hidden" : "flex"}`}>
      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-3">
      {version && (
        <Tabs value={editorTab} onValueChange={setEditorTab} className="!mt-[7px]" /* cabeçalho → abas = 15 px (8 do editor + 7) */>
          {/* Etapas de trabalho (reunião 10/09). As 10 seções originais
              continuam todas aqui — reagrupadas, nada removido. */}
          <Stepper current={editorTab} onSelect={(t: string) => { void flushPending().then(() => setEditorTab(t)); }} items={readinessItems} />

          <KeepTabsContent value="info" className="mt-2">
            <div className="mb-3 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><ProductCounts version={version} /><AccordionToggleAll /></div>
            </div>
            <GeneralTab afterMain={<>
              {/* Itens 2 e 3 da tela (o 1 é Dados principais): acordeão fechado por padrão (mesmo layout dos demais cartões desta tela). */}
              <SectionCard number={2} icon={AudienceIcon} title="Quem pode ver este produto" subtitle={`Quem enxerga e contrata: ${audienceSummary(product?.visibility_mode)}`} help="Define para quais públicos o produto aparece e pode ser contratado. Vale na lista, no detalhe, na cotação, na cesta e nas recomendações da IA." collapsible defaultOpen={false} keepMounted>
                <AudienceCard bare product={product} readOnly={!product || readOnly} registerFlush={registerFlusher} onDone={() => void load()} />
              </SectionCard><SectionCard number={3} icon={Clock} title="Alterações por IA grátis neste produto" subtitle={`Total: ${aiFreeTotal(version)} — definido em cada etapa`} help="Soma das alterações por IA grátis definidas em cada etapa. Para mudar, edite o campo na própria etapa." collapsible defaultOpen={false}><AiFreeChangesCard bare version={version} /></SectionCard>
</>} version={version} readOnly={readOnly} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2VersionInfo(version.id, b), "Informações salvas.", { rethrow: true })} product={product} />
          </KeepTabsContent>

          <KeepTabsContent value="opcoes" className={TAB_CARD}>
            <Tabs value={subTabs.opcoes} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, opcoes: v }))} className="!mt-0 !gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TabsList className={SUB_TABS_LIST}>
                    <TabsTrigger value="class" className={SUB_TAB}><Tag className="h-3.5 w-3.5" />Classificação<span className="field-info" data-help="Define a base comercial e as classificações do produto (categoria, tags e tipo) usadas para organizar e encontrar o produto." aria-hidden="true">i</span></TabsTrigger>
                    <TabsTrigger value="var" className={SUB_TAB}><Layers className="h-3.5 w-3.5" />Variações<span className="field-info" data-help="Variações: escolhas que o cliente faz ao contratar e que DEFINEM o produto principal (ex.: número de campanhas ou plataforma). As opções de uma variação são exclusivas entre si. Cada opção pode mudar preço, prazo, etapas e entregáveis." aria-hidden="true">i</span></TabsTrigger>
                    <TabsTrigger value="add" className={SUB_TAB}><Plus className="h-3.5 w-3.5" />Adicionais<span className="field-info" data-help="Adicionais: funcionalidades e entregáveis OPCIONAIS e complementares que o cliente pode adicionar ao carrinho (ex.: relatório extra, peças complementares), cada um com seu preço e seus impactos." aria-hidden="true">i</span></TabsTrigger>
                    <TabsTrigger value="cond" className={SUB_TAB}><Clock className="h-3.5 w-3.5" />Prazos e condições<span className="field-info" data-help="Condições: alterações GLOBAIS de execução (ex.: entrega expressa/full ou prazo de aprovação ampliado). Ao ativar uma condição, o prazo e o custo de TODAS as etapas do produto mudam (prazo somado e percentual sobre o custo). Aqui também ficam as regras de prazo." aria-hidden="true">i</span></TabsTrigger>
                  </TabsList>
                </div>
                <AccordionToggleAll />
              </div>
              <KeepTabsContent value="class"><ClassTab readOnly={readOnly} product={product} refs={refs}highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2Classifications(productId, b), "Classificações salvas.")} /></KeepTabsContent>
              <KeepTabsContent value="var"><div id="sec-var" className={secRing("sec-var")}><VariationsTab version={version} readOnly={readOnly} act={act} /></div></KeepTabsContent>
              <KeepTabsContent value="add"><div id="sec-add" className={secRing("sec-add")}><AddonsTab version={version} readOnly={readOnly} act={act} /></div></KeepTabsContent>
              <KeepTabsContent value="cond">
                <div className="space-y-3" data-testid="deadline-rows">
                  <PanelCard allowEdit readOnly={readOnly} icon={Clock} title="Entrega emergencial" summary={version.emergency_enabled ? "oferecida ao cliente" : "não oferecida"} help="O cliente pode pedir prazo menor pagando um adicional. Cada etapa diz quantas horas encurta e quanto cobra a mais; o sistema recalcula o prazo total e o preço final.">
                    <EmergencyCard version={version} readOnly={readOnly} act={act} />
                  </PanelCard>
                  <PanelCard allowEdit readOnly={readOnly} icon={Link2} title="Regras de prazo" summary={`${(version.conditions ?? []).length} regra(s) · prazo base ${version.base_commercial_deadline_days ?? "—"} dias`} help="Regras tipadas (gatilho → efeito), sem código livre: por exemplo, um adicional escolhido que soma dias ao prazo.">
                    <ConditionsTab version={version} readOnly={readOnly} act={act} />
                  </PanelCard>
                  <PanelCard allowEdit readOnly={readOnly} icon={ListChecks} title="Aprovações gerais do produto" summary={`${(version.approval_gates ?? []).length} aprovação(ões)`} help="Aprovações e prazos GERAIS do produto (implantação, ciclo recorrente, relatório, publicação…). A aprovação e o prazo de cada etapa se configuram dentro da própria etapa (aba Tarefa e etapas).">
                    <ApprovalGatesSection version={version} readOnly={readOnly} act={act} />
                  </PanelCard>
                  <PanelCard allowEdit readOnly={readOnly} icon={CalendarClock} title="Prazos gerais (SLA)" summary={`${(version.sla_rules ?? []).length} regra(s)`} help="Prazos GERAIS do produto (implantação, ciclo recorrente, relatório…). O prazo de cada etapa se configura dentro da própria etapa.">
                    <SlaRulesSection version={version} readOnly={readOnly} act={act} />
                  </PanelCard>
                </div>
              </KeepTabsContent>
            </Tabs>
          </KeepTabsContent>

          <KeepTabsContent value="entrega" className="mt-2 space-y-2">
            <Tabs value={subTabs.entrega} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, entrega: v }))} className="!mt-0 !gap-3">
              <div className="flex items-center gap-3">
                <TabsList className={`${SUB_TABS_LIST} !gap-0.5 !p-0.5`}>
                  <TabsTrigger value="tarefas" className={`${SUB_TAB} !px-2.5 !py-1 !text-xs`}><ListOrdered className="h-3.5 w-3.5" />{product?.task_structure === "single" ? "Tarefa" : "Tarefas"}</TabsTrigger>
                </TabsList>
                <span className="min-w-0 flex-1 truncate text-[11px] text-violet-900 dark:text-violet-100" data-testid="task-structure-banner" title={product?.task_structure === "single" ? "Produto individual: uma tarefa principal. Todo o trabalho é dividido em etapas dentro da tarefa. Várias tarefas só existem em combos (tela de Combos)." : "Cada tarefa é um bloco de trabalho; as etapas são o passo a passo de cada uma."}><strong>{product?.task_structure === "single" ? "Produto individual: uma tarefa principal." : "Produto composto (combo): várias tarefas."}</strong> {product?.task_structure === "single" ? "Todo o trabalho é dividido em etapas." : "As etapas são o passo a passo de cada tarefa."}</span>
                <div className="ml-auto flex items-center gap-1 text-[11px]">
                  <Tooltip><TooltipTrigger asChild><button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700" aria-label={`Informações: ${entregaInfo.title}`}><Info className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="bottom" className="max-w-sm p-3 text-xs"><p className="text-sm font-bold">{entregaInfo.title}</p><p className="mt-1 opacity-90">{entregaInfo.text}</p>{entregaInfo.legend && (<ul className="mt-2.5 space-y-2" data-testid="entrega-color-legend">{entregaInfo.legend.map((item) => (<li key={item.name} className="flex items-center gap-2.5"><span className={`inline-flex min-w-[58px] items-center justify-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${item.chip}`}><span className={`h-2 w-2 rounded-full ${item.dot}`} />{item.name}</span><span className="flex-1 leading-snug">{item.what}</span></li>))}</ul>)}</TooltipContent></Tooltip>
                </div>
              </div>
              <div className="space-y-3">
                <AccessCatalogDialog open={accessCatalogOpen} onOpenChange={setAccessCatalogOpen} version={version} readOnly={readOnly} act={act} mode={accessCatalogMode} />
              </div>
              <KeepTabsContent value="tarefas"><TasksTab leading={(n: number) => <DeliveryCommercialOverview number={n} version={version} readOnly={readOnly} act={act} ringOf={ringOf} locked={!editMode} product={product} onGoToRecurrence={goToDeliveryRecurrence} />} trailing={(n: number) => (<div id="sec-connections" className="h-full"><PanelCard number={n} forceOpen={highlightTarget === "sec-connections"} readOnly={readOnly} icon={Lock} title="Acessos necessários" summary={accessCount(version) > 0 ? `${accessCount(version)} configurado${accessCount(version) === 1 ? "" : "s"}` : "nenhum acesso cadastrado nas etapas"} help="Aqui você NÃO cadastra acessos: esta lista é só um resumo. Os acessos aparecem aqui depois de cadastrados dentro de uma etapa (em “Conexões e acessos desta etapa”). Se nenhuma etapa pedir acesso, nada aparece aqui — e tudo bem."><div className="min-w-0 space-y-2"><p className="text-[11px] text-slate-500">Resumo, só leitura: os acessos de cada etapa. Para pedir um acesso, abra a etapa e use “Conexões e acessos desta etapa”.</p><AccessesSummary version={version} act={act} readOnly={readOnly} /></div></PanelCard></div>)} taskStructure={product?.task_structure ?? "multiple"} version={version} productId={productId} readOnly={readOnly} refs={refs} act={act} highlightTarget={highlightTarget} highlightTaskIds={highlightTaskIds} clearHighlight={clearPublishHighlight} editTaskId={taskEditRequest} onOpenPricing={openPricingFromTask} /></KeepTabsContent>
            </Tabs>
            {/* Acessos necessários: fica DEPOIS das tarefas. Os acessos são cadastrados dentro de cada etapa; aqui é o resumo de tudo o que foi pedido. */}
          </KeepTabsContent>

          <KeepTabsContent value="precos" className={TAB_CARD}>
            <StepIntro noToggle>Taxas, margens e valor/hora das especialidades. O preço e o prazo são sempre calculados no servidor.</StepIntro>
            <CostTab version={version} refs={refs} act={act} onReloadRefs={load} productId={productId} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} />
          </KeepTabsContent>

          <TabsContent value="revisao" className={TAB_CARD}>
            <Tabs value={subTabs.revisao} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, revisao: v }))} className="!mt-0 !gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TabsList className={SUB_TABS_LIST}>
                    <TabsTrigger value="preview" className={SUB_TAB}><Eye className="h-3.5 w-3.5" />Conferência final<span className="field-info" data-help="Confere como o produto aparece para o cliente e o que ainda bloqueia a publicação." aria-hidden="true">i</span></TabsTrigger>
                    <TabsTrigger value="hist" className={SUB_TAB}><UploadCloud className="h-3.5 w-3.5" />Publicação e versões<span className="field-info" data-help="Publica a versão do produto e controla as versões (o que está no ar e o que é rascunho)." aria-hidden="true">i</span></TabsTrigger>
                    <TabsTrigger value="historico" className={SUB_TAB}><Clock className="h-3.5 w-3.5" />Histórico<span className="field-info" data-help="Registro das alterações e publicações feitas neste produto." aria-hidden="true">i</span></TabsTrigger>
                  </TabsList>
                </div>
                <AccordionToggleAll />
              </div>
              <TabsContent value="preview"><PreviewTab version={version} readOnly={readOnly} act={act} onResolveIssue={goToPublishIssue} /></TabsContent>
              <TabsContent value="hist"><div id="sec-publicacao" className={secRing("sec-publicacao")}><HistoryTab version={version} product={product} readOnly={readOnly} act={act} onResolveIssue={goToPublishIssue} /></div></TabsContent>
              <TabsContent value="historico"><ReviewHistoryTab productId={productId} version={version} /></TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}
      </div>
      {version && (() => {
        const idx = Math.max(0, EDITOR_STEPS.findIndex((st) => st.id === editorTab));
        const prev = EDITOR_STEPS[idx - 1];
        const next = EDITOR_STEPS[idx + 1];
        const go = (id: string) => { setEditorTab(id); document.getElementById("catalog2-editor-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
        const requestPublish = async () => {
          if (version.state === "publicada") { setPubDlg({ val: { ok: true, restore: true } }); return; }
          await flushPending();
          apiClient.validateCatalog2Version(version.id).then((val: any) => setPubDlg({ val })).catch((e: any) => setMsg(e?.message ?? "Não foi possível validar a versão."));
        };
        const canPublish = editMode && (version.state === "rascunho" || !version.is_published_current);
        return (
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-white/70 bg-[#dfe5f6] px-1 pt-2 dark:border-slate-700/60 dark:bg-slate-950">
            <div className="flex min-w-0 items-center gap-1.5">
              {/* Navegação direta: "Início" só aparece no passo 2; do passo 3 em diante volta para o passo anterior; no passo 1 só há o "próximo". */}
              {prev && <Button variant="outline" className="h-8 gap-1 px-2.5 text-xs" onClick={() => go(prev.id)}><ArrowLeft className="h-3.5 w-3.5" /> {idx === 1 ? "Início" : `Passo ${idx}: ${prev.label.split(":")[0]}`}</Button>}
              <Button style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="h-8 gap-1 px-2.5 text-xs text-white shadow-md hover:brightness-110 disabled:opacity-55" disabled={!next} onClick={() => next && go(next.id)}>{next ? `Passo ${idx + 2}: ${next.label.split(":")[0]}` : "Fim"} <ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Button variant="outline" onClick={() => setScreenNotificationsOpen((open) => !open)} className="relative h-8 gap-1.5 px-2.5 text-xs" title="Avisos desta tela"><ListChecks className="h-3.5 w-3.5" /> Avisos{screenNotifications.length > 0 && <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">{screenNotifications.length}</span>}</Button>
              {fmtUpdatedAt(version.updated_at ?? product.updated_at) && <span className="hidden text-[11px] text-slate-500 2xl:inline">Atualizado: {fmtUpdatedAt(version.updated_at ?? product.updated_at)}</span>}
              {!editMode ? (
                <Button onClick={() => void startEditing()} disabled={starting} className="h-8 gap-1.5 bg-[#1b2559] px-3 text-xs text-white hover:bg-[#253277]">{starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />} {starting ? "Abrindo…" : "Editar"}</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => void stopEditing()} className="h-8 gap-1.5 px-2.5 text-xs"><Lock className="h-3.5 w-3.5" /> Travar edição</Button>
                  {version.state !== "publicada" && <Button onClick={() => void saveDraft()} disabled={!dirty} title={dirty ? "Salvar as alterações como rascunho" : "Já está salvo — nenhuma alteração desde o último salvamento"} className="h-8 gap-1.5 bg-[#1b2559] px-3 text-xs text-white hover:bg-[#253277] disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {dirty ? "Salvar rascunho" : "Rascunho salvo"}</Button>}
                  {canPublish && <Button onClick={() => void requestPublish()} style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="h-8 gap-1.5 px-3 text-xs text-white shadow-md hover:brightness-110"><UploadCloud className="h-3.5 w-3.5" /> Publicar</Button>}
                </>
              )}
            </div>
          </div>
        );
      })()}
      {screenNotificationsOpen && !previewOpen && (
        <aside aria-label="Avisos desta tela" className="absolute bottom-[64px] right-5 z-30 w-[min(24rem,calc(100%-2.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800"><span className="text-xs font-bold text-slate-800 dark:text-slate-100">Avisos desta tela</span><button type="button" className="text-[11px] font-semibold text-violet-700 hover:underline dark:text-violet-300" onClick={() => { setScreenNotifications([]); setMsg(null); setNoticeHidden(true); }}>Marcar todos como visualizados</button></div>
          <div className="max-h-48 space-y-1 overflow-y-auto p-2">
            {screenNotifications.length === 0 ? <p className="px-2 py-3 text-center text-xs text-slate-500">Nenhum aviso pendente nesta tela.</p> : screenNotifications.map((item) => <div key={item.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/70 dark:text-slate-200"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" /><div>{item.content}</div></div>)}
          </div>
        </aside>
      )}
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
      <Dialog open={pricingOpen} onOpenChange={(o) => { if (o) setPricingOpen(true); else void closePricing(true, false); }}>
        <DialogContent showCloseButton={false} className="h-[94vh] w-[98vw] max-w-[1680px] overflow-y-auto border-0 bg-[#dde2f3] p-2 sm:p-3">
          <DialogTitle className="sr-only">Precificação</DialogTitle>
          <Suspense fallback={<InlineLoader text="Carregando precificação…" />}>
            <PricingPageLazy returnAfterSave={!!pricingReturnTaskId} onSaveComplete={() => void closePricing(true, true)} onClose={() => void closePricing(true, false)} />
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
    </FieldHelpLayer>
    </RefsCtx.Provider>
    </FormsCtx.Provider>
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
function AiFieldButton({ label, value, mode = "text", context, onResult, disabled, defaultResearch = true, compact = false, fieldMaxChars = null }: { label: string; value: string; mode?: "text" | "list"; context: any; onResult: (v: string) => void; disabled?: boolean; defaultResearch?: boolean; compact?: boolean; /** Limite de caracteres do próprio campo: a IA escreve dentro dele (nunca corta). */ fieldMaxChars?: number | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [approach, setApproach] = useState<"melhorar" | "recriar">(value.trim() ? "melhorar" : "recriar");
  const [length, setLength] = useState<"manter" | "curto" | "medio" | "longo">("manter");
  const [research, setResearch] = useState(defaultResearch);
  // Fontes que a IA pode usar: banco interno (documentos da Allka) e/ou internet. O usuário escolhe.
  const [useInternal, setUseInternal] = useState(true);
  const [notes, setNotes] = useState<string[]>([]);
  const [prev, setPrev] = useState<string | null>(null);
  const [maxWords, setMaxWords] = useState("");
  const [maxChars, setMaxChars] = useState("");
  const [minWords, setMinWords] = useState("");
  const [minChars, setMinChars] = useState("");
  // Basta o NOME do produto (a IA pesquisa na internet e escreve o campo); ou algum texto no próprio campo.
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  const hasName = !!String(context?.name ?? "").trim();
  const tooShort = words < 1 && !hasName;
  const limitsBad = (!!minWords && !!maxWords && Number(minWords) > Number(maxWords)) || (!!minChars && !!maxChars && Number(minChars) > Number(maxChars));
  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r: any = await apiClient.aiImproveProductField({ field_label: label, current_value: value, mode, length, approach, research, use_internal_bank: useInternal, field_max_chars: fieldMaxChars, context, max_words: maxWords ? Number(maxWords) : null, max_chars: maxChars ? Number(maxChars) : null, min_words: minWords ? Number(minWords) : null, min_chars: minChars ? Number(minChars) : null });
      const text = String(r?.improved_value ?? "").trim();
      if (!text) throw new Error("A IA não devolveu texto.");
      setPrev(value);
      setNotes(Array.isArray(r?.notes) ? r.notes : []);
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
      {notes.length > 0 && <span role="status" data-testid="ai-field-notes" className="max-w-[18rem] text-[11px] font-semibold text-amber-700">{notes.join(" ")}</span>}
      {prev !== null && (
        <button type="button" onClick={() => { onResult(prev); setPrev(null); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800">
          <Undo2 className="h-3 w-3" /> Desfazer
        </button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || tooShort}
            title={tooShort ? "Informe o nome do produto (título comercial) ou escreva algo no campo para liberar a IA." : "Preencher ou melhorar com Inteligência Artificial"}
            className={`inline-flex items-center rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#7c3aed,#c026d3))] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 ${compact ? "h-6 w-6 justify-center" : "gap-1 px-2 py-1 text-[11px]"}`}
          >
            <Sparkles className="h-3 w-3" />{!compact && " IA"}
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
          <p className="text-[11px] text-slate-500">Com só o nome do produto, a IA pesquisa na internet e escreve este campo do zero.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5">Mín. palavras<input type="number" min={1} value={minWords} onChange={(e) => setMinWords(e.target.value)} placeholder="sem mínimo" className="h-7 rounded border border-slate-200 px-1.5 text-xs" aria-label="Mínimo de palavras" /></label>
            <label className="flex flex-col gap-0.5">Mín. caracteres<input type="number" min={1} value={minChars} onChange={(e) => setMinChars(e.target.value)} placeholder="sem mínimo" className="h-7 rounded border border-slate-200 px-1.5 text-xs" aria-label="Mínimo de caracteres" /></label>
            <label className="flex flex-col gap-0.5">Máx. palavras<input type="number" min={1} value={maxWords} onChange={(e) => setMaxWords(e.target.value)} placeholder="sem limite" className="h-7 rounded border border-slate-200 px-1.5 text-xs" aria-label="Limite de palavras" /></label>
            <label className="flex flex-col gap-0.5">Máx. caracteres<input type="number" min={1} value={maxChars} onChange={(e) => setMaxChars(e.target.value)} placeholder={fieldMaxChars ? `campo: até ${fieldMaxChars}` : "sem limite"} className="h-7 rounded border border-slate-200 px-1.5 text-xs" aria-label="Limite de caracteres" /></label>
          </div>
          <fieldset className="space-y-1.5 rounded-lg border border-slate-200 p-2" data-testid="ai-sources">
            <legend className="px-1 text-[11px] font-semibold text-slate-600">De onde a IA pode tirar informação</legend>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={useInternal} onChange={(e) => setUseInternal(e.target.checked)} className="mt-0.5" aria-label="Usar o banco interno de IA" />
              <span><strong>Banco interno</strong> (documentos e materiais cadastrados na Allka)</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} className="mt-0.5" aria-label="Pesquisar na internet" />
              <span><strong>Internet</strong> (como o produto é conhecido <strong>hoje</strong>)</span>
            </label>
            {!useInternal && !research && <p className="text-[11px] text-slate-500">Sem nenhuma fonte marcada, a IA usa só o texto do campo e os dados do produto.</p>}
          </fieldset>
          {limitsBad && <p className="text-red-600">O mínimo não pode ser maior que o máximo.</p>}
          {err && <p className="text-red-600">{err}</p>}
          <Button size="sm" className="w-full gap-1.5" disabled={busy || limitsBad} onClick={() => void run()}>
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
    <nav id="catalog2-editor-tabs" data-tour-id="catalog2-editor-tabs" aria-label="Passos do produto" className="grid grid-cols-5 items-stretch gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            title={st.label}
            className={`flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-left transition ${active ? "text-white shadow-md ring-1 ring-white/40" : "bg-[#f3f1fb] text-slate-700 hover:bg-[#ebe7f8] dark:bg-slate-800 dark:text-slate-200"}`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${circle}`}>{state === "ok" && !active ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[12px] font-semibold leading-tight ${active ? "text-white" : "text-slate-700 dark:text-slate-100"}`}>{st.label}</span>
              <span className={`flex items-center gap-1 text-[10px] leading-tight ${active ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{state === "blocked" ? "Tem bloqueio" : state === "pending" ? "Pendente" : state === "ok" ? "Completo" : "Passo " + (i + 1)}</span>
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
// Formulários com botão próprio de salvar (ex.: "Salvar etapa"): o editor sabe quais estão abertos com alteração NÃO salva.
export interface OpenFormApi { label: string; isDirty: () => boolean; save: () => Promise<void>; discard: () => void }
const FormsCtx = createContext<(id: string, api: OpenFormApi) => () => void>(() => () => {});
// Cadastros de apoio (especialidades etc.) para componentes fundos que só precisam consultar.
const RefsCtx = createContext<any>(null);

function GeneralTab({ version, readOnly, onSave, product, highlightTarget, clearHighlight, afterMain }: any) {
  const ringOf = useContext(RingCtx);
  const [f, setF] = useState({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const saveCommercialRef = useRef<() => Promise<void>>(async () => {});
  // Digitou e ainda não clicou em "Salvar informações"? O editor grava sozinho antes de salvar rascunho/prévia/sair.
  const registerFlusher = useContext(FlushCtx);
  const dirtyRef = useRef(false);
  const fRef = useRef(f);
  fRef.current = f;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  // Uma atualização recebida do servidor deve aparecer após Recarregar, mas
  // nunca pode substituir texto ainda não salvo no formulário atual.
  useEffect(() => {
    if (dirtyRef.current) return;
    setF({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" });
  }, [version.id, version.updated_at]);
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
      await saveCommercialRef.current();
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
  const [aiChatOpen, setAiChatOpen] = useState(false);
  // P-8: aplica o rascunho da IA (textos + listas) e salva; listas vazias não apagam o que já existe.
  async function applyAiDraft(d: any, opts?: { onlyEmpty: boolean }) {
    const patch = draftToVersionPatch(d, f, !!opts?.onlyEmpty, version ?? {});
    const next = { ...f, title: patch.title, summary: patch.summary, full_description: patch.full_description };
    await onSave({ ...next, ...(patch.included_items ? { included_items: patch.included_items } : {}), ...(patch.excluded_items ? { excluded_items: patch.excluded_items } : {}), ...(patch.client_requirements ? { client_requirements: patch.client_requirements } : {}), ...(patch.deliverables_summary ? { deliverables_summary: patch.deliverables_summary } : {}) } as any);
    setF(next);
    dirtyRef.current = false;
    setInfoSaved(true);
  }
  function updateInfo(next: Partial<typeof f>) {
    setF({ ...f, ...next });
    dirtyRef.current = true;
    setInfoSaved(false);
  }

  return (
    <div id="catalog2-general" className="scroll-mt-6 space-y-2">
      <SectionCard number={1} icon={FileText} title="Dados principais" subtitle="Nome e descrição comercial do produto." help="Preencha o nome comercial e um resumo curto que explicam este produto para o cliente." defaultOpen={false}>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <div id="catalog2-field-title" className={ringOf("catalog2-field-title")}>
            <FieldAccordion title={<span>Título comercial <Req /></span>} help="O nome que aparece para o cliente ao contratar este produto." forceOpen={ringOf("catalog2-field-title") !== ""}><div className="space-y-1"><div className="relative"><Textarea aria-label="Título comercial" rows={2} className="h-[62px] resize-none pr-16" disabled={readOnly} value={f.title} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} onChange={(e) => updateInfo({ title: e.target.value.replace(/[\r\n]+/g, " ") })} /><span className="absolute right-2 top-2"><AiFieldButton compact label="Título comercial" value={f.title} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} fieldMaxChars={200} onResult={(v) => updateInfo({ title: v.replace(/\n/g, " ") })} /></span></div><CharCount value={f.title} max={200} /></div></FieldAccordion>
          </div>
          <FieldAccordion title={<span>Descrição curta <Req /></span>} help="Resumo breve que apresenta o serviço ao cliente."><div className="space-y-1"><div className="relative"><Textarea aria-label="Descrição curta" rows={2} className="min-h-[62px] pr-16" disabled={readOnly} value={f.summary} onChange={(e) => updateInfo({ summary: e.target.value })} /><span className="absolute right-2 top-2"><AiFieldButton compact label="Descrição curta" value={f.summary} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} fieldMaxChars={500} onResult={(v) => updateInfo({ summary: v })} /></span></div><CharCount value={f.summary} max={500} /></div></FieldAccordion>
        </div>
      </SectionCard>

      {afterMain}

      <SectionCard number={4} icon={FileText} title="Descrição completa" subtitle="Detalhe o produto com informações completas, benefícios e diferenciais." help="Apresente como o produto funciona, seus benefícios, limites e diferenciais de forma clara." collapsible defaultOpen={false} forceOpen={ringOf("catalog2-field-full-description") !== ""}>
        <div id="catalog2-field-full-description" className={ringOf("catalog2-field-full-description")}><FieldAccordion title={<span>Descrição <Req /></span>} help="Explicação completa do produto, com benefícios, funcionamento e diferenciais." forceOpen={ringOf("catalog2-field-full-description") !== ""}><div className="space-y-1"><div className="relative"><Textarea aria-label="Descrição" rows={5} className="pr-16" disabled={readOnly} value={f.full_description} onChange={(e) => updateInfo({ full_description: e.target.value })} /><span className="absolute right-2 top-2"><AiFieldButton compact label="Descrição completa" value={f.full_description} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} fieldMaxChars={4000} onResult={(v) => updateInfo({ full_description: v })} /></span></div><CharCount value={f.full_description} max={4000} /></div></FieldAccordion></div>
      </SectionCard>

      <CommercialFieldsCard version={version} readOnly={readOnly} registerFlush={registerFlusher} registerSave={(fn) => { saveCommercialRef.current = fn; return () => { if (saveCommercialRef.current === fn) saveCommercialRef.current = async () => {}; }; }} onSave={(b) => onSave(b)} />

      <SectionCard number={8} tone="soft" icon={Clock} title="Resumo da mudança" subtitle="Escrito pela IA a partir do que foi alterado — você pode editar." collapsible defaultOpen={false}>
        <div className="space-y-1">
          <div className="relative"><Textarea rows={2} maxLength={500} className="pr-16" disabled={readOnly} placeholder="Deixe em branco: ao salvar, a IA descreve o que foi alterado (preço, prazo, textos, tarefas…)." value={f.change_summary} onChange={(e) => updateInfo({ change_summary: e.target.value })} /><span className="absolute right-2 top-2"><ChangeSummaryAiButton compact versionId={version.id} disabled={readOnly} onResult={(v) => updateInfo({ change_summary: v.slice(0, 500) })} /></span></div>
          <CharCount value={f.change_summary} max={500} />
        </div>
      </SectionCard>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" data-testid="open-ai-chat" onClick={() => setAiChatOpen(true)} title="A IA conversa com você e preenche o produto inteiro a partir de uma explicação" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[image:var(--app-brand-button,linear-gradient(to_right,#7c3aed,#c026d3))] px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"><Sparkles className="h-3.5 w-3.5" />Preencher o produto com IA</button>
          {/* Sem botão "Salvar informações": o texto é gravado junto com "Salvar rascunho" (rodapé), publicar ou ao trocar de passo. */}
          {savingInfo && <span role="status" className="text-xs text-slate-500">Salvando…</span>}
          {fmtUpdatedAt(version?.updated_at) && <span className="text-xs text-slate-500 dark:text-slate-400">Última atualização: {fmtUpdatedAt(version.updated_at)}</span>}
          <ProductAiChatDialog open={aiChatOpen} onOpenChange={setAiChatOpen} productId={product.id} readOnly={readOnly} onApply={applyAiDraft} />
          {infoSaved && <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ Informações salvas.</p>}
        </div>
      )}
    </div>
  );
}

// Gera o resumo do que mudou nesta versão (compara com a anterior já salva).
function ChangeSummaryAiButton({ versionId, onResult, disabled, compact = false }: { versionId: string; onResult: (v: string) => void; disabled?: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {err && !compact && <span className="text-[11px] text-red-600">{err}</span>}
      <button
        type="button"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true); setErr(null);
          try { const r = await apiClient.generateCatalog2ChangeSummary(versionId); onResult(r.summary); }
          catch (e: any) { setErr(e?.message ?? "Não foi possível gerar."); }
          finally { setBusy(false); }
        }}
        title="Gerar ou atualizar o resumo da mudança com IA"
        className={`inline-flex items-center rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#7c3aed,#c026d3))] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 ${compact ? "h-6 w-6 justify-center" : "gap-1 px-2 py-1 text-[11px]"}`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}{!compact && ` ${busy ? "Analisando…" : "Gerar com IA"}`}
      </button>
    </span>
  );
}

// ── 2. Classificações ─────────────────────────────────────────────────
function ClassTab({ product, refs, onSave, highlightTarget, clearHighlight, readOnly }: any) {
  const ringOf = useContext(RingCtx);
  const registerFlusher = useContext(FlushCtx);
  const [pillar, setPillar] = useState(product.pillar?.id ?? "");
  const [category, setCategory] = useState(product.category?.id ?? "");
  const [fourF, setFourF] = useState<string[]>(product.four_f.map((f: any) => f.id));
  const saveClassifications = () => onSave({ pillar_id: pillar || null, category_id: category || null, four_f_ids: fourF }).then(() => {
    if (pillar) clearHighlight("catalog2-field-pillar");
    if (category) clearHighlight("catalog2-field-category");
    if (fourF.length > 0) clearHighlight("catalog2-field-four-f");
  });
  // Sem botão "Salvar classificação": grava junto com "Salvar rascunho", publicar ou ao trocar de passo (como os outros campos).
  const savedKey = JSON.stringify([product.pillar?.id ?? "", product.category?.id ?? "", [...product.four_f.map((f: any) => f.id)].sort()]);
  const currentKey = JSON.stringify([pillar, category, [...fourF].sort()]);
  const stateRef = useRef({ dirty: false, save: saveClassifications, readOnly: !!readOnly });
  stateRef.current = { dirty: currentKey !== savedKey, save: saveClassifications, readOnly: !!readOnly };
  useEffect(() => registerFlusher(async () => {
    const s = stateRef.current;
    if (s.readOnly || !s.dirty) return;
    await s.save();
  }), [registerFlusher]);
  const fourFDescription = (name: string, index: number) => {
    const code = (name.match(/F\s*([1-4])/i)?.[1] ?? String(index + 1));
    return ({ "1": "Estrutura e base", "2": "Aquisição e tráfego", "3": "Oferta e conversão", "4": "Retenção e crescimento" } as Record<string, string>)[code] ?? "Classificação comercial";
  };
  return (
    <div id="catalog2-classification" className="mt-3 scroll-mt-6">
      <SectionCard icon={Layers} title="Classificação do produto" subtitle="Defina a base comercial e as classificações aplicáveis" defaultOpen>
      <div className="grid items-start gap-4 md:grid-cols-2">
      <section className="space-y-2 md:border-r md:border-slate-200 md:pr-4 dark:md:border-slate-800">
        <div><h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Base comercial</h4><p className="text-xs text-slate-500">Defina o pilar e a categoria do produto.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
        <div id="catalog2-field-pillar" className={ringOf("catalog2-field-pillar")}><Field label="Pilar">
        <select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={pillar} onChange={(e) => setPillar(e.target.value)}>
          <option value="">—</option>{refs.pillars.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field></div>
      <div id="catalog2-field-category" className={ringOf("catalog2-field-category")}><Field label="Categoria">
        <select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>{refs.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field></div>
        </div>
      </section>
      <section className="space-y-2">
        <div><h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Classificações 4F<span className="field-info" data-help="As classificações 4F do produto (Fundação, Fluxo, Força e Fidelização). Servem para filtrar e agrupar produtos no catálogo; pode marcar mais de uma." aria-hidden="true">i</span></h4><p className="text-xs text-slate-500">Selecione as classificações que se aplicam ao produto.</p></div>
        <div id="catalog2-field-four-f" className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${ringOf("catalog2-field-four-f")}`}>
          {refs.fourF.map((f: any, index: number) => {
            const selected = fourF.includes(f.id);
            return <label key={f.id} className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-2 transition ${selected ? "border-violet-500 bg-violet-50/70 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
              <input type="checkbox" className="sr-only" disabled={readOnly} checked={selected} onChange={(e) => setFourF(e.target.checked ? [...fourF, f.id] : fourF.filter((x) => x !== f.id))} />
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"}`}>{selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className="min-w-0"><span className="block text-[13px] font-bold leading-tight">{f.name}</span><span className="block truncate pt-0.5 text-xs text-slate-500 dark:text-slate-400">{fourFDescription(f.name, index)}</span></span>
            </label>
          })}
        </div>
      </section>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/40" data-testid="class-summary">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <span className={"flex h-7 w-7 items-center justify-center rounded-full text-white " + (fourF.length > 0 ? "bg-emerald-500" : "bg-slate-300")}><Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /></span>
          {fourF.length} de {refs.fourF.length} classificações selecionadas
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:border-l md:border-slate-200 md:pl-4 dark:md:border-slate-700">
          {refs.fourF.filter((f: any) => fourF.includes(f.id)).map((f: any) => (
            <span key={f.id} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
              {String(f.name).split(/\s·\s|\s-\s/)[0]}
              {!readOnly && <button type="button" aria-label={"Remover " + f.name} className="rounded-full p-0.5 hover:bg-violet-200/70" onClick={() => setFourF(fourF.filter((x) => x !== f.id))}><X className="h-3.5 w-3.5" /></button>}
            </span>
          ))}
        </span>
        {!readOnly && (
          <span className={"ml-auto flex items-center gap-1.5 text-xs " + (currentKey !== savedKey ? "text-amber-700" : "text-slate-500")} data-testid={currentKey !== savedKey ? "class-pending" : "class-saved"}>
            {currentKey !== savedKey ? "Alteração pendente — vale ao clicar em “Salvar rascunho”." : <><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />Alterações salvas</>}
          </span>
        )}
      </div>
      </SectionCard>
    </div>
  );
}

// ── 3. Variações ─────────────────────────────────────────────────────
function VariationsTab({ version, readOnly, act }: any) {
  const [nv, setNv] = useState({ name: "" });
  const [nvInBase, setNvInBase] = useState(true);
  const [adding, setAdding] = useState(false);
  const [varErr, setVarErr] = useState("");
  const keyFromName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-slate-600 dark:border-violet-900/60 dark:bg-violet-950/20 dark:text-slate-300">
        <Layers className="h-4 w-4 shrink-0 text-violet-600" /><span>As escolhas do cliente atualizam preço, prazo, etapas e entregáveis conforme os impactos configurados.</span>
        {!readOnly && <AddBtn onClick={() => setAdding((v) => !v)}>Nova variação</AddBtn>}
      </div>
      <UnlinkedStepsBanner version={version} />
      {version.variations.map((va: any, vi: number) => (
        <VariationRow key={va.id} va={va} vi={vi} version={version} readOnly={readOnly} act={act} />
      ))}
      {!readOnly && adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-[14px] border border-dashed border-violet-300 bg-white p-3 dark:border-violet-800 dark:bg-slate-900/60">
          <MiniField label="Nome da nova variação"><Input className="h-9 w-72 max-w-full" placeholder="Ex.: Número de campanhas simultâneas" value={nv.name} onChange={(e) => { setNv({ name: e.target.value }); setVarErr(""); }} /></MiniField><label className="flex max-w-md items-start gap-2 pb-1 text-xs text-slate-700 dark:text-slate-200"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={nvInBase} onChange={(e) => setNvInBase(e.target.checked)} data-testid="new-variation-in-base" /><span><strong>O produto original já inclui esta variação</strong><br /><span className="text-slate-500">Marcado: uma opção será o “padrão” (já está no produto, não soma custo) e as outras somam. Desmarcado: a variação é um acréscimo e todas as opções somam custo.</span></span></label><AddBtn onClick={() => !nv.name.trim() ? setVarErr("Digite o nome da nova variação antes de clicar em Criar variação.") : (setVarErr(""), act(() => apiClient.addCatalog2Variation(version.id, { key: keyFromName(nv.name), name: nv.name.trim(), base_included: nvInBase }), "Variação criada.").then(() => { setNv({ name: "" }); setAdding(false); }))}>Criar variação</AddBtn>{varErr && <span role="alert" data-testid="add-variation-error" className="text-xs font-semibold text-red-600">{varErr}</span>}
        </div>
      )}
    </div>
  );
}


/** Variação em UMA linha (número, nome, resumo) com botão Ver; tudo é editado num PAINEL MOLDURA. */
function VariationRow({ va, vi, version, readOnly, act }: any) {
  const [open, setOpen] = useState(false);
  useOpenOn((k, id) => k === "option" && (va.options ?? []).some((o: any) => o.id === id), () => setOpen(true));
  const def = va.options.find((o: any) => o.is_default);
  const configured = va.options.some((o: any) => (o.effects ?? []).length > 0);
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="variation-row">
      <div className="flex min-h-[44px] items-center gap-2 px-3 py-1.5">
        <span className="section-number-badge flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-bold text-white">Variação {vi + 1}</span>
        <span className="min-w-0 truncate text-[13px] font-bold text-slate-900 dark:text-slate-100" title={va.name}>{va.name}</span>
        <span className="text-[11px] text-slate-500">{va.options.length === 1 ? "1 opção" : `${va.options.length} opções`}</span>
        <Badge className={va.is_required ? "border-0 bg-amber-100 text-amber-800" : "border-0 bg-slate-100 text-slate-600"}>{va.is_required ? "Obrigatória" : "Opcional"}</Badge>
        {def && <Badge className="border-0 bg-blue-100 text-blue-700">Padrão: {def.label}</Badge>}
        <Badge className={configured ? "border-0 bg-emerald-100 text-emerald-700" : "border-0 bg-slate-100 text-slate-500"}>{configured ? "Configurada" : "A configurar"}</Badge>
        {va.is_active === false && <Badge className="border-0 bg-neutral-200 text-neutral-600">Inativa</Badge>}
        <button type="button" onClick={() => setOpen(true)} className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="variation-open"><Eye className="h-3.5 w-3.5" />Ver</button>
      </div>
      {open && (
        <FramedPanel open onOpenChange={setOpen} testId="variation-panel" title={`Variação ${vi + 1}`}>
          <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="flex min-w-0 items-center gap-2"><span className="section-number-badge flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-bold text-white">Variação {vi + 1}</span><EditableVariationName name={va.name} readOnly={readOnly} onRename={(next: string) => act(() => apiClient.updateCatalog2Variation(va.id, { name: next }), "Nome da variação salvo.")} /></div>
            <div className="flex flex-wrap items-center gap-2">
              <CheckPill disabled={readOnly} checked={va.base_included !== false}
                hint={"Marcado: o produto ORIGINAL já inclui esta variação. Uma das opções pode ser o 'padrão' (não soma custo) e as outras somam.\nDesmarcado: a variação NÃO existe no produto original; nenhuma opção é padrão e TODAS somam custo."}
                onChange={(v) => void act(() => apiClient.updateCatalog2Variation(va.id, { base_included: v }), v ? "A variação passa a existir no produto original." : "A variação não existe no produto original: todas as opções somam custo.")}>
                Já no produto original
              </CheckPill>
              {!readOnly && <ConfirmDeleteButton testId="variation-delete" label="Excluir variação" title="Excluir esta variação?" message="A variação e todas as suas opções serão removidas. Esta ação não pode ser desfeita." onConfirm={() => act(() => apiClient.deleteCatalog2Variation(va.id), "Variação removida.")} />}
              {readOnly && <Button size="sm" onClick={() => window.dispatchEvent(new Event("catalog2:start-editing"))} data-testid="variation-edit"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3"><VariationEditor va={va} index={vi} list={version.variations} version={version} readOnly={readOnly} act={act} /></div>
        </FramedPanel>
      )}
    </section>
  );
}

function EffectChips({ effects }: { effects: any[] }) {
  const labels: Record<string, string> = { add_deadline_days: "Prazo", add_fixed_amount: "Preço", add_percent: "Preço", add_task: "Etapas", remove_task: "Etapas", add_step: "Etapas", require_info: "Informações", add_deliverable: "Entregáveis", add_effort_minutes: "Esforço", add_effort_hours: "Esforço", replace_effort_minutes: "Esforço" };
  if (!effects?.length) return <span className="text-[11px] text-slate-400">Sem impactos configurados</span>;
  return <span className="flex flex-wrap gap-1">{effects.map((effect: any) => <Badge key={effect.id} className="border-0 bg-violet-100 text-[10px] font-medium text-violet-800">{labels[effect.effect_type] ?? "Impacto"}</Badge>)}</span>;
}

function VariationEditor({ va, index, list, version, readOnly, act }: any) {
  const [help, setHelp] = useState(va.notes ?? "");
  const [newLabel, setNewLabel] = useState("");
  const [addErr, setAddErr] = useState("");
  const putVariation = (body: any, ok: string) => act(() => apiClient.updateCatalog2Variation(va.id, body), ok);
  const type = va.selection_type ?? "single";
  return <div className="space-y-2 px-1 py-1">
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <label className="inline-flex items-center gap-1.5"><span className="font-semibold text-slate-700 dark:text-slate-200">Tipo de escolha<span className="field-info" data-help="Uma opção: o cliente escolhe só uma. Várias opções: pode marcar mais de uma. Quantidade: o cliente informa um número." aria-hidden="true">i</span></span><select disabled={readOnly} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={type} onChange={(e) => void putVariation({ selection_type: e.target.value }, "Tipo de escolha atualizado.")}><option value="single">Uma opção</option><option value="multiple">Várias opções</option><option value="quantity">Quantidade</option></select></label>
      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><Switch aria-label="Obrigatória" disabled={readOnly} checked={!!va.is_required} onCheckedChange={(v) => void putVariation({ is_required: !!v }, "Obrigatoriedade atualizada.")} />Obrigatória<span className="field-info" data-help="Obrigatória: o cliente precisa escolher uma opção desta variação para contratar." aria-hidden="true">i</span></label>
      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><Switch aria-label="Ativa" disabled={readOnly} checked={va.is_active !== false} onCheckedChange={(v) => void putVariation({ is_active: !!v }, "Variação atualizada.")} />Ativa<span className="field-info" data-help="Desligada, a variação não aparece para o cliente, mas continua cadastrada." aria-hidden="true">i</span></label>
      {!readOnly && <span className="ml-auto"><IconBtn label="Reordenar variação" onClick={() => void putVariation({ sort_order: Math.max(1, (va.sort_order ?? index + 1) - 1) }, "Ordem atualizada.")}><ListOrdered className="h-4 w-4" /></IconBtn></span>}
    </div>
    <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Ajuda para o cliente<span className="field-info" data-help="Texto curto que explica ao cliente como escolher entre as opções desta variação." aria-hidden="true">i</span></span><Input disabled={readOnly} className="h-8 text-xs" maxLength={2000} value={help} onChange={(e) => setHelp(e.target.value)} onBlur={() => { if (help !== (va.notes ?? "")) void putVariation({ notes: help.trim() || null }, "Ajuda salva."); }} placeholder="Explique como o cliente deve escolher" /></label>
    <ul className="space-y-1.5">
      {va.options.map((option: any, optionIndex: number) => <VariationOptionRow key={option.id} option={option} variation={va} index={optionIndex} list={va.options} version={version} readOnly={readOnly} act={act} />)}
    </ul>
    {!readOnly && <div className="flex flex-wrap items-center justify-between gap-2 pt-1"><div className="flex items-center gap-2"><Input className="h-8 w-56 text-xs" placeholder="Título da nova opção" value={newLabel} onChange={(e) => { setNewLabel(e.target.value); setAddErr(""); }} /><AddBtn onClick={() => !newLabel.trim() ? setAddErr("Digite o título da nova opção antes de clicar em Adicionar opção.") : (setAddErr(""), act(() => apiClient.addCatalog2Option(va.id, { key: newLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), label: newLabel.trim() }), "Opção adicionada.").then(() => setNewLabel("")))}>Adicionar opção</AddBtn>{addErr && <span role="alert" data-testid="add-option-error" className="text-xs font-semibold text-red-600">{addErr}</span>}</div><SaveButton onClick={() => void putVariation({ notes: help.trim() || null }, "Variação salva.")}>Salvar variação</SaveButton></div>}
  </div>;
}

function VariationOptionRow({ option, variation, index, list, version, readOnly, act }: any) {
  const refsCtx = useContext(RefsCtx);
  const requested = useImpactsRequested("option", option.id);
  const [detailOpen, setDetailOpen] = useState(requested);
  useOpenOn((k, id) => k === "option" && id === option.id, () => setDetailOpen(true));
  const [label, setLabel] = useState(option.label);
  const [message, setMessage] = useState(option.availability_note ?? "");
  const put = (body: any, ok: string) => act(() => apiClient.updateCatalog2Option(option.id, body), ok);
  const customQuote = option.availability === "custom_quote";
  const saveImage = (file: File) => {
    if (file.size > 1_000_000) return;
    const reader = new FileReader();
    reader.onload = () => void put({ media_url: String(reader.result), icon_key: null }, "Imagem adicionada.");
    reader.readAsDataURL(file);
  };
  const mediaIcon = option.icon_key === "globe" ? <Globe2 className="h-4 w-4" /> : option.icon_key === "tag" ? <Tag className="h-4 w-4" /> : <Layers className="h-4 w-4" />;
  return <li className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-950/20">
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2" data-testid="option-row">
      <label title="Clique para enviar uma imagem (PNG, JPG ou WEBP até 1 MB). Para usar um ícone, abra o menu ⋮ da opção." className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-violet-200 bg-white text-violet-600 hover:border-violet-400 dark:border-violet-900 dark:bg-slate-900">
        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={readOnly} onChange={(e) => { const file = e.target.files?.[0]; if (file) saveImage(file); e.currentTarget.value = ""; }} />
        {option.media_url ? <img className="h-full w-full object-cover" src={option.media_url} alt="Mídia da opção" /> : option.icon_key ? <span data-testid="option-icon" className="[&>svg]:h-5 [&>svg]:w-5">{mediaIcon}</span> : <UploadCloud className="h-4 w-4 text-slate-400" />}
        <span className="sr-only">Adicionar ícone ou imagem</span>
      </label>
      <div className="min-w-[12rem] flex-1">
        <Input id={`option-title-${option.id}`} disabled={readOnly} aria-label="Título da opção" className="h-8 text-xs" maxLength={160} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => { if (label.trim() && label !== option.label) void put({ label: label.trim() }, "Título salvo."); }} />
        <div className="mt-1 flex flex-wrap items-center gap-1" data-testid="option-actions">
          {!readOnly && <button type="button" data-testid="option-rename" onClick={() => { const el = document.getElementById(`option-title-${option.id}`) as HTMLInputElement | null; el?.focus(); el?.select(); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3 w-3" />Editar nome</button>}
          {!readOnly && <ConfirmDeleteButton size="sm" testId="option-delete" label="Excluir" title="Excluir esta opção?" message={`A opção “${option.label}” será removida. Esta ação não pode ser desfeita.`} onConfirm={() => act(() => apiClient.deleteCatalog2Option(option.id), "Opção removida.")} />}
        </div></div>
      <div className="w-52 shrink-0"><label className="min-w-0"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Disponibilidade</span><select disabled={readOnly} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={option.availability ?? "auto"} onChange={(e) => void put({ availability: e.target.value }, "Disponibilidade atualizada.")}><option value="auto">Contratação automática</option><option value="commercial_review">Exige revisão comercial</option><option value="custom_quote">Orçamento personalizado</option><option value="assisted_only">Só com atendimento</option><option value="unavailable">Indisponível</option></select></label></div>
      <div className="min-w-[7rem] max-w-[16rem] shrink-0"><div className="min-w-0"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Impactos</span><div className="flex flex-wrap items-center gap-2"><EffectChips effects={option.effects ?? []} /><button type="button" aria-expanded={detailOpen} onClick={() => setDetailOpen((v) => !v)} data-testid="option-detail-toggle" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:bg-slate-900"><Settings2 className="h-3.5 w-3.5" />{detailOpen ? "Fechar detalhes" : "Configurar impactos"}</button></div></div></div>
      {!typeIsQuantity(variation) && (
        <div className="pt-5" data-testid="option-default-box">
          <CheckPill disabled={readOnly || variation.base_included === false} checked={!!option.is_default}
            hint={variation.base_included === false ? "Esta variação não existe no produto original: nenhuma opção é padrão, todas somam custo." : "Marque se o produto original JÁ inclui esta opção: ela vira o ponto de partida e não soma custo nem horas. As outras opções somam em cima."}
            onChange={(v) => void put({ is_default: v }, v ? "Opção padrão definida." : "Opção deixou de ser padrão.")}>
            Padrão<span className="field-info" data-help="Padrão (já no produto original): a opção que o produto original já inclui. Ela não soma custo nem horas; as outras somam em cima." aria-hidden="true">i</span>
          </CheckPill>
        </div>
      )}
      <div className="pt-4"><label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><Switch aria-label="Opção ativa" disabled={readOnly} checked={option.is_active !== false} onCheckedChange={(v) => void put({ is_active: !!v }, "Opção atualizada.")} />Ativa</label></div>
      <div className="pt-4"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mais ações da opção"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">{!readOnly && <><DropdownMenuItem onClick={() => void put({ icon_key: "layers", media_url: null }, "Ícone de camadas definido.")}>{option.icon_key === "layers" ? "✓ " : ""}Usar ícone de camadas</DropdownMenuItem><DropdownMenuItem onClick={() => void put({ icon_key: "globe", media_url: null }, "Ícone de globo definido.")}>{option.icon_key === "globe" ? "✓ " : ""}Usar ícone de globo</DropdownMenuItem><DropdownMenuItem onClick={() => void put({ icon_key: "tag", media_url: null }, "Ícone de etiqueta definido.")}>{option.icon_key === "tag" ? "✓ " : ""}Usar ícone de etiqueta</DropdownMenuItem>{(option.media_url || option.icon_key) && <DropdownMenuItem onClick={() => void put({ icon_key: null, media_url: null }, "Mídia removida.")}>Manter sem mídia</DropdownMenuItem>}<DropdownMenuItem className="text-red-600" onClick={() => void act(() => apiClient.deleteCatalog2Option(option.id), "Opção removida.")}>Remover opção</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div>
    </div>
    {customQuote && <label className="mt-2 block pl-[60px]"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Mensagem ao cliente (opcional)</span><Input disabled={readOnly} className="h-8 text-xs" maxLength={1000} placeholder="Explique como o cliente receberá o orçamento" value={message} onChange={(e) => setMessage(e.target.value)} onBlur={() => { if (message !== (option.availability_note ?? "")) void put({ availability_note: message.trim() || null }, "Mensagem salva."); }} /></label>}
    {detailOpen && (
      <FramedModal open onOpenChange={setDetailOpen} testId="option-impacts-panel" title={`Impactos — ${option.label}`}>
        <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
          <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Configurar impactos · {option.label}</p><p className="truncate text-xs text-slate-500">Variação: {variation.name} — o que muda (preço, prazo, etapas, entregáveis) quando o cliente escolhe esta opção.</p></div>
          <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>Fechar</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[2px] py-1">
      <div className="mt-2 grid gap-y-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900" data-testid="option-detail">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"><User className="h-4 w-4 text-violet-600" aria-hidden="true" />Para o cliente</p>
          <OptionExamples option={option} readOnly={readOnly} put={put} />
        </div>
        <div className="min-w-0 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"><Layers className="h-4 w-4 text-violet-600" aria-hidden="true" />Impactos da opção</p>
          <OptionImpactSummary effects={option.effects ?? []} />
          <details open className="group rounded-xl border border-slate-200 dark:border-slate-700" data-testid="option-hours-accordion">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-bold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden"><Clock className="h-4 w-4 text-violet-600" aria-hidden="true" /><span className="flex-1">Horas extras</span><ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <div className="border-t border-slate-100 px-3 pb-3 dark:border-slate-800"><OptionStepAdjustments option={option} version={version} specialties={refsCtx?.specialties ?? []} readOnly={readOnly} act={act} /></div>
          </details>
          <details className="group rounded-xl border border-slate-200 dark:border-slate-700" data-testid="option-deadline-accordion">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-bold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden"><CalendarClock className="h-4 w-4 text-violet-600" aria-hidden="true" /><span className="flex-1">Prazo e outros impactos desta opção</span><span className="text-xs font-normal text-slate-500">{impactSummary(option.effects ?? []).deadline}</span><ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <div className="border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800"><div><EffectList version={version} effects={option.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2OptionEffect(option.id, b), "Impacto adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2OptionEffect(id), "Impacto removido.")} /></div></div>
          </details>
        </div>
      </div>
        </div>
      </FramedModal>
    )}
  </li>;
}

/** Resumo curto dos impactos de uma opção (Preço, Prazo, Etapas, Entregáveis, Horas extras). R21-10: linguagem de ETAPA, não de tarefa. */
function impactSummary(effects: any[]) {
  const by = (types: string[]) => effects.filter((e) => types.includes(e.effect_type));
  const price = by(["add_fixed_amount", "add_percent"]);
  const days = by(["add_deadline_days"]);
  const tasks = by(["add_task", "remove_task", "add_step"]);
  const deliverables = by(["add_deliverable", "require_info"]);
  const effort = by(["add_effort_hours", "add_effort_minutes", "replace_effort_minutes"]);
  const n = (l: any[], one: string, many: string) => (l.length === 0 ? "Sem alteração" : `${l.length} ${l.length === 1 ? one : many}`);
  const totalDays = days.reduce((a, e) => a + (Number(e.effect_value) || 0), 0);
  return {
    price: n(price, "alteração", "alterações"),
    deadline: days.length === 0 ? "Sem alteração de prazo" : `+${totalDays} dia(s)`,
    tasks: n(tasks, "alteração", "alterações"),
    deliverables: n(deliverables, "alteração", "alterações"),
    effort: effort.length,
    configured: effects.length,
  };
}
function OptionImpactSummary({ effects }: { effects: any[] }) {
  const s = impactSummary(effects);
  const Item = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => (
    <span className="flex min-w-0 flex-1 items-center gap-2 px-2 first:pl-0"><Icon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" /><span className="min-w-0"><span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">{label}</span><span className="block truncate text-[11px] text-slate-500">{value}</span></span></span>
  );
  return (
    <div className="flex divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900" data-testid="option-impact-summary">
      <Item icon={DollarSign} label="Preço" value={s.price} />
      <Item icon={CalendarClock} label="Prazo" value={s.deadline === "Sem alteração de prazo" ? "Sem alteração" : s.deadline} />
      <Item icon={ListChecks} label="Etapas" value={s.tasks} />
      <Item icon={Layers} label="Entregáveis" value={s.deliverables} />
    </div>
  );
}

function typeIsQuantity(variation: any) { return (variation.selection_type ?? "single") === "quantity"; }
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
/** Etapas marcadas como "dependem de variação ou adicional" (valor "taskKey:stepKey"), para o seletor de "Incluir etapa". */
export function conditionalStepOptions(version: any): [string, string][] {
  return (version?.tasks ?? []).flatMap((t: any) => (t.steps ?? []).filter((s: any) => s.is_conditional).map((s: any): [string, string] => [`${t.key}:${s.key}`, s.name]));
}
export function stepNameOfRef(version: any, ref: string): string {
  for (const t of version?.tasks ?? []) for (const s of t.steps ?? []) if (`${t.key}:${s.key}` === ref) return s.name;
  return ref;
}
/** Referências "taskKey:stepKey" já ligadas por alguma opção de variação, adicional ou condição (efeito "incluir etapa"). */
export function linkedStepRefs(version: any): Set<string> {
  const out = new Set<string>();
  for (const va of version?.variations ?? []) for (const o of va.options ?? []) for (const e of o.effects ?? []) if (e.effect_type === "add_step") out.add(e.effect_value);
  for (const ad of version?.addons ?? []) for (const e of ad.effects ?? []) if (e.effect_type === "add_step") out.add(e.effect_value);
  for (const c of version?.conditions ?? []) if (c.effect_type === "add_step") out.add(c.effect_value);
  return out;
}
/** Aviso nas abas Variações e Adicionais: etapas marcadas como dependentes que nenhuma opção/adicional inclui ainda (bloqueiam a publicação). */
// "Ligar agora": abre direto a janela de impactos da opção/adicional escolhida, já com "Incluir etapa" + a etapa preenchidos.
let pendingLinkStepRef: string | null = null;
let pendingImpacts: { kind: "option" | "addon"; id: string } | null = null;
export const OPEN_IMPACTS_EVENT = "catalog2:open-impacts";
export function openImpacts(kind: "option" | "addon", id: string, stepRef?: string) {
  pendingLinkStepRef = stepRef ?? null;
  pendingImpacts = { kind, id };
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_IMPACTS_EVENT, { detail: { kind, id } }));
}
/** A linha (variação/adicional) abre o próprio painel quando o pedido é para uma opção/adicional dela. */
function useOpenOn(match: (kind: "option" | "addon", id: string) => boolean, open: () => void) {
  const m = useRef(match); m.current = match;
  const o = useRef(open); o.current = open;
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d && m.current(d.kind, d.id)) o.current(); };
    window.addEventListener(OPEN_IMPACTS_EVENT, on);
    return () => window.removeEventListener(OPEN_IMPACTS_EVENT, on);
  }, []);
}
/** Já nasce aberto quando o pedido de "Ligar agora" é para este item (o painel pai acabou de abrir). Limpa o pedido depois de usar. */
function useImpactsRequested(kind: "option" | "addon", id: string): boolean {
  const asked = pendingImpacts?.kind === kind && pendingImpacts.id === id;
  useEffect(() => { if (asked) pendingImpacts = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return asked;
}
/** Aviso nas abas Variações e Adicionais: um cartão por etapa dependente que nenhuma opção/adicional inclui ainda (bloqueiam a publicação). Clicar leva direto a onde ligar. */
export function UnlinkedStepsBanner({ version }: { version: any }) {
  const linked = linkedStepRefs(version);
  const pend = conditionalStepOptions(version).filter(([ref]) => !linked.has(ref));
  if (pend.length === 0) return null;
  const targets: { kind: "option" | "addon"; id: string; label: string; group: string }[] = [
    ...(version?.variations ?? []).flatMap((va: any) => (va.options ?? []).map((o: any) => ({ kind: "option" as const, id: o.id, label: o.label, group: `Variação: ${va.name}` }))),
    ...(version?.addons ?? []).map((ad: any) => ({ kind: "addon" as const, id: ad.id, label: ad.name, group: "Adicionais" })),
  ];
  const groups = Array.from(new Set(targets.map((t) => t.group)));
  return (
    <div role="alert" data-testid="unlinked-steps-banner" className="space-y-1.5">
      {pend.map(([ref, name]) => (
        <div key={ref} className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100" data-testid="unlinked-step-card">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong>A etapa “{name}” depende de variação ou adicional e ainda não está ligada.</strong> Sem isso o produto não publica.<span className="sr-only"> Para ligar: Ver numa opção (ou adicional) → Configurar impactos → Prazo e outros impactos desta opção → tipo Incluir etapa → escolha a etapa → +.</span></span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" data-testid="unlinked-step-fix" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white shadow-md hover:brightness-110" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }}><Link2 className="h-3.5 w-3.5" />Ligar agora<ChevronDown className="h-3.5 w-3.5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {targets.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">Cadastre uma variação (com opções) ou um adicional para ligar esta etapa.</div>}
              {groups.map((g, gi) => (
                <div key={g}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{g}</div>
                  {targets.filter((t) => t.group === g).map((t) => <DropdownMenuItem key={t.kind + t.id} onClick={() => openImpacts(t.kind, t.id, ref)}>{t.label}</DropdownMenuItem>)}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
      <p className="px-1 text-[11px] text-rose-800/80 dark:text-rose-200/80">Escolha a opção ou o adicional que traz esta etapa: a janela de impactos abre já com “Incluir etapa” e a etapa preenchidos — é só clicar em +.</p>
    </div>
  );
}
function EffectList({ effects, readOnly, onAdd, onDel, version }: any) {
  const [e, setE] = useState<any>(() => (pendingLinkStepRef ? { effect_type: "add_step", effect_value: pendingLinkStepRef, charge_scope: "recurring" } : { effect_type: "add_deadline_days", effect_value: "", charge_scope: "recurring" }));
  useEffect(() => { pendingLinkStepRef = null; }, []);
  const money = e.effect_type === "add_fixed_amount" || e.effect_type === "add_percent";
  const effort = isEffortType(e.effect_type);
  return (
    <div className="mt-1 ml-2 border-l-2 border-neutral-200 pl-2 dark:border-neutral-700">
      {(effects ?? []).map((ef: any) => (
        <div key={ef.id} className="flex items-center justify-between text-xs text-neutral-500">
          <span>{isEffortType(ef.effect_type) ? effortEffectSummary(ef, version) : ef.effect_type === "add_step" ? <>Inclui a etapa “{stepNameOfRef(version, ef.effect_value)}”</> : <>{ef.effect_type} = {ef.effect_value}</>}{(ef.effect_type === "add_fixed_amount" || ef.effect_type === "add_percent") && ef.charge_scope ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">{chargeScopeLabel(ef.charge_scope)}{ef.charge_scope === "per_cycle" ? ` (ciclo ${ef.charge_start_cycle}${ef.charge_end_cycle != null ? ` a ${ef.charge_end_cycle}` : "+"})` : ef.charge_scope === "per_quantity" && ef.charge_quantity ? ` ×${ef.charge_quantity}` : ""}</span> : null}</span>
          {!readOnly && <button className="text-red-500" onClick={() => onDel(ef.id)}>×</button>}
        </div>
      ))}
      {!readOnly && (
        <div className="mt-1 flex items-center gap-1">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 text-xs dark:border-neutral-700" value={e.effect_type} onChange={(ev) => setE({ ...e, effect_type: ev.target.value })}>
            {EFFECT_TYPES.filter(([v]) => v !== "add_task" && v !== "remove_task").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {e.effect_type === "add_step"
            ? (conditionalStepOptions(version).length > 0
              ? <select aria-label="Etapa que esta opção inclui" data-testid="add-step-select" className="h-6 min-w-[10rem] flex-1 rounded border border-neutral-300 bg-transparent px-1 text-xs dark:border-neutral-700" value={e.effect_value} onChange={(ev) => setE({ ...e, effect_value: ev.target.value })}><option value="">Escolha a etapa…</option>{conditionalStepOptions(version).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <span className="text-[11px] text-amber-700" data-testid="add-step-empty">Nenhuma etapa marcada como “Depende de uma variação ou adicional”. Marque a etapa em Entrega → Ver etapas → Editar.</span>)
            : <Input className="h-6 text-xs" value={e.effect_value} onChange={(ev) => setE({ ...e, effect_value: ev.target.value })} placeholder="valor" />}
          <Button size="sm" variant="ghost" className="h-6" onClick={() => e.effect_value && (!effort || e.source_task_key) && (onAdd(effort ? { effect_type: e.effect_type, effect_value: e.effect_value, charge_scope: e.charge_scope ?? "recurring", charge_start_cycle: e.charge_start_cycle, charge_end_cycle: e.charge_end_cycle, source_task_key: e.source_task_key, source_step_key: e.source_step_key ?? null, effort_scale_by_quantity: !!e.effort_scale_by_quantity } : money ? e : { effect_type: e.effect_type, effect_value: e.effect_value }), setE({ ...e, effect_value: "" }))}><Plus className="h-3 w-3" /></Button>
        </div>
      )}
      {!readOnly && money && (
        <div className="mt-1"><ChargeScopeFields value={e} onChange={(v) => setE({ ...e, ...v })} /></div>
      )}
      {!readOnly && effort && <EffortEffectForm value={e} onChange={setE} version={version} />}
    </div>
  );
}

// ── 4. Adicionais ────────────────────────────────────────────────────
function AddonsTab({ version, readOnly, act }: any) {
  const [na, setNa] = useState({ name: "", base_cost: "" });
  const [adding, setAdding] = useState(false);
  const keyFromName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>Escolhas opcionais. Uma contratação sem adicional continua válida.</span><span className="ml-auto text-violet-700">Os impactos atualizam automaticamente prazo, preço e entrega.</span>{!readOnly && <AddBtn onClick={() => setAdding((v) => !v)}>Novo adicional</AddBtn>}</div>
      <UnlinkedStepsBanner version={version} />
      {version.addons.map((a: any, ai: number) => (
        <AddonRow key={a.id} a={a} ai={ai} version={version} readOnly={readOnly} act={act} />
      ))}
      {!readOnly && adding && (
        <div className="rounded-[14px] border border-dashed border-violet-300 bg-white p-3 dark:border-violet-800 dark:bg-slate-900/60">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <MiniField label="Nome que o cliente verá"><Input placeholder="Ex.: Reunião estratégica extra" value={na.name} onChange={(e) => setNa({ ...na, name: e.target.value })} /></MiniField>
            <MiniField label="Custo base (opcional)"><Input type="number" min={0} placeholder="R$ 0,00" value={na.base_cost} onChange={(e) => setNa({ ...na, base_cost: e.target.value })} /></MiniField>
            <AddBtn onClick={() => na.name.trim() && act(() => apiClient.addCatalog2Addon(version.id, { key: keyFromName(na.name), name: na.name.trim(), base_cost: na.base_cost ? Number(na.base_cost) : null }), "Adicional criado.").then(() => { setNa({ name: "", base_cost: "" }); setAdding(false); })}>Adicionar adicional</AddBtn>
          </div>
        </div>
      )}
    </div>
  );
}

/** Adicional em UMA linha (nome, preço, impactos) com botão Ver; tudo é editado num PAINEL MOLDURA. */
function AddonRow({ a, ai, version, readOnly, act }: any) {
  const [open, setOpen] = useState(false);
  useOpenOn((k, id) => k === "addon" && id === a.id, () => setOpen(true));
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="addon-row">
      <div className="flex min-h-[44px] items-center gap-2 px-3 py-1.5">
        <span data-no-info="" className="section-number-badge flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-bold text-white" data-testid="section-number">Adicional {ai + 1}</span>
        <span className="min-w-0 truncate text-[13px] font-bold text-slate-900 dark:text-slate-100" title={a.name}>{a.name}</span>
        <span className="text-[11px] text-slate-500">{a.base_cost == null ? "sem preço" : brl2(Number(a.base_cost))}</span>
        <AddonImpactChips effects={a.effects ?? []} compact />
        {a.is_active === false && <Badge className="border-0 bg-neutral-200 text-neutral-600">Inativo</Badge>}
        <button type="button" onClick={() => setOpen(true)} className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="addon-open"><Eye className="h-3.5 w-3.5" />Ver</button>
      </div>
      {open && (
        <FramedPanel open onOpenChange={setOpen} testId="addon-panel" title={`Adicional ${ai + 1}`}>
          <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="flex min-w-0 items-center gap-2"><span data-no-info="" className="section-number-badge flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-bold text-white" data-testid="section-number">Adicional {ai + 1}</span><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{a.name}</p></div>
            <div className="flex flex-wrap items-center gap-2">
              {!readOnly && <DeleteBtn label="Remover adicional?" tip="Remover este adicional" onConfirm={() => act(() => apiClient.deleteCatalog2Addon(a.id), "Adicional removido.")} />}
              {readOnly && <Button size="sm" onClick={() => window.dispatchEvent(new Event("catalog2:start-editing"))} data-testid="addon-edit"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3"><AddonEditor addon={a} index={ai} list={version.addons} version={version} readOnly={readOnly} act={act} /></div>
        </FramedPanel>
      )}
    </section>
  );
}

/** Impactos do adicional: resumo + botão "Configurar impactos" que abre uma JANELA MOLDURA (padrão global). */
function AddonImpactsBox({ addon, readOnly, children }: { addon: any; readOnly: boolean; children: React.ReactNode }) {
  const requested = useImpactsRequested("addon", addon.id);
  const [open, setOpen] = useState(requested);
  useOpenOn((k, id) => k === "addon" && id === addon.id, () => setOpen(true));
  const n = (addon.effects ?? []).length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/20" data-testid="addon-impacts-box">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Impactos</span>
      {n === 0 ? <span className="text-[11px] text-slate-400">Sem impactos configurados</span> : <AddonImpactChips effects={addon.effects ?? []} />}
      <button type="button" onClick={() => setOpen(true)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50" data-testid="addon-impacts-open"><Settings2 className="h-3.5 w-3.5" />{readOnly ? "Ver impactos" : "Configurar impactos"}</button>
      {open && (
        <FramedModal open onOpenChange={setOpen} testId="addon-impacts-modal" title={`Impactos — ${addon.name}`}>
          <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Configurar impactos · {addon.name}</p><p className="truncate text-xs text-slate-500">O que muda (preço, prazo, etapas, entregáveis) quando o cliente contrata este adicional.</p></div>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">{children}</div>
        </FramedModal>
      )}
    </div>
  );
}

function AddonImpactChips({ effects, compact = false }: { effects: any[]; compact?: boolean }) {
  const label: Record<string, string> = { add_deadline_days: "+ prazo", add_fixed_amount: "+ preço", add_percent: "+ preço", add_task: "Inclui etapas", add_step: "Inclui etapas", require_info: "Requer acessos", add_deliverable: "Inclui entregáveis", add_effort_minutes: "Esforço" };
  const visible = compact ? effects.slice(0, 3) : effects;
  return <span className="hidden min-w-0 flex-wrap gap-1 md:flex">{visible.map((effect: any) => <Badge key={effect.id} className="border-0 bg-fuchsia-100 text-[10px] font-medium text-fuchsia-700">{effect.effect_type === "add_deadline_days" ? `+ ${effect.effect_value} dias no prazo` : label[effect.effect_type] ?? "Impacto"}</Badge>)}{compact && effects.length > 3 && <Badge className="border-0 bg-slate-100 text-[10px] text-slate-500">+{effects.length - 3}</Badge>}</span>;
}

function AddonMedia({ addon, readOnly, onChange }: { addon: any; readOnly: boolean; onChange?: (body: any) => void }) {
  const icon = addon.icon_key === "globe" ? <Globe2 className="h-4 w-4" /> : addon.icon_key === "tag" ? <Tag className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />;
  const save = (file: File) => { if (file.size > 1_000_000 || !onChange) return; const reader = new FileReader(); reader.onload = () => onChange({ media_url: String(reader.result), icon_key: null }); reader.readAsDataURL(file); };
  return <TooltipProvider delayDuration={160}><Tooltip><TooltipTrigger asChild><label className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white text-slate-400 ${readOnly ? "cursor-default" : "cursor-pointer hover:border-violet-400 hover:text-violet-600"}`}><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={readOnly} onChange={(e) => { const file = e.target.files?.[0]; if (file) save(file); e.currentTarget.value = ""; }} />{addon.media_url ? <img className="h-full w-full object-cover" src={addon.media_url} alt="Mídia do adicional" /> : icon}</label></TooltipTrigger><TooltipContent side="top" className="text-xs">Adicionar ícone ou imagem</TooltipContent></Tooltip></TooltipProvider>;
}

function AddonEditor({ addon, index, list, version, readOnly, act }: any) {
  const [name, setName] = useState(addon.name); const [help, setHelp] = useState(addon.description ?? ""); const [cost, setCost] = useState(addon.base_cost == null ? "" : String(addon.base_cost));
  const put = (body: any, ok = "Adicional salvo.") => act(() => apiClient.updateCatalog2Addon(addon.id, body), ok);
  const tasks = version.tasks ?? []; const steps = addon.target_task_id ? (tasks.find((t: any) => t.id === addon.target_task_id)?.steps ?? []) : tasks.flatMap((t: any) => t.steps ?? []);
  return <div className="space-y-3 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
    <div className="flex flex-wrap items-center gap-3"><AddonMedia addon={addon} readOnly={readOnly} onChange={(b) => void put(b, "Mídia salva.")} /><span className="text-xs text-slate-500">Imagem ou ícone opcional</span>{!readOnly && <DropdownMenu><DropdownMenuTrigger asChild><button className="text-xs font-medium text-violet-700">Escolher ícone</button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => void put({ icon_key: "globe", media_url: null })}>Globo</DropdownMenuItem><DropdownMenuItem onClick={() => void put({ icon_key: "tag", media_url: null })}>Etiqueta</DropdownMenuItem><DropdownMenuItem onClick={() => void put({ icon_key: null, media_url: null })}>Manter vazio</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div>
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto]"><MiniField label="Nome"><Input disabled={readOnly} className="h-10 text-xs" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== addon.name && void put({ name: name.trim() })} /></MiniField><MiniField label="Preço adicional (R$)"><Input disabled={readOnly} type="number" min={0} className="h-10 text-xs" value={cost} onChange={(e) => setCost(e.target.value)} onBlur={() => { const value = cost === "" ? null : Number(cost); if (value === null || Number.isFinite(value)) void put({ base_cost: value }); }} /></MiniField><CheckPill disabled={readOnly} checked={addon.is_active !== false} onChange={(v) => void put({ is_active: v }, v ? "Adicional ativado." : "Adicional inativado.")}>Ativo</CheckPill></div>
    <MiniField label="Texto de ajuda ao cliente"><Input disabled={readOnly} className="h-10 text-xs" value={help} onChange={(e) => setHelp(e.target.value)} onBlur={() => help !== (addon.description ?? "") && void put({ description: help.trim() || null })} placeholder="Explique o que este adicional inclui" /></MiniField>
    <div className="grid gap-3 lg:grid-cols-3"><MiniField label="Forma de cobrança"><select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={addon.charge_scope ?? "recurring"} onChange={(e) => void put({ charge_scope: e.target.value })}><option value="recurring">Uma única vez</option><option value="per_cycle">Por ciclo</option><option value="per_quantity">Por quantidade</option></select></MiniField><MiniField label="Tipo de seleção"><select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={addon.addon_type ?? "checkbox"} onChange={(e) => void put({ addon_type: e.target.value })}><option value="checkbox">Seleção simples</option><option value="quantity">Quantidade</option><option value="single_select">Escolha única</option><option value="multi_select">Várias escolhas</option></select></MiniField><MiniField label="Vincular à tarefa"><select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={addon.target_task_id ?? ""} onChange={(e) => void put({ target_task_id: e.target.value || null, target_step_id: null })}><option value="">Sem tarefa específica</option>{tasks.map((task: any) => <option key={task.id} value={task.id}>{task.name}</option>)}</select></MiniField></div>
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><MiniField label="Vincular à etapa"><select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={addon.target_step_id ?? ""} onChange={(e) => void put({ target_step_id: e.target.value || null })}><option value="">Sem etapa específica</option>{steps.map((step: any) => <option key={step.id} value={step.id}>{step.name}</option>)}</select></MiniField><div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2"><span className="text-xs font-semibold text-blue-700">Impactos configurados</span><div className="mt-1"><AddonImpactChips effects={addon.effects ?? []} /></div></div></div>
    <MiniField label="Quando o cliente pode contratar"><select aria-label="Quando o cliente pode contratar este adicional" data-testid="addon-contract-phase" disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={addon.contract_phase ?? "before"} onChange={(e) => void put({ contract_phase: e.target.value }, "Momento de contratação salvo.")}><option value="before">Só antes de começar a execução (na compra)</option><option value="during">Só depois que a execução começou</option><option value="both">Antes e depois da execução</option></select></MiniField>
    <AddonImpactsBox addon={addon} readOnly={readOnly}>
      <EffectList version={version} effects={addon.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2AddonEffect(addon.id, b), "Impacto adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2AddonEffect(id), "Impacto removido.")} />
    </AddonImpactsBox>
    <div className="flex items-center justify-between border-t border-slate-100 pt-2"><button type="button" disabled={readOnly} className="text-xs font-medium text-rose-600" onClick={() => void act(() => apiClient.deleteCatalog2Addon(addon.id), "Adicional removido.")}>Remover</button>{!readOnly && <SaveButton onClick={() => void put({ name: name.trim() || addon.name, description: help.trim() || null, base_cost: cost === "" ? null : Number(cost) })}>Salvar adicional</SaveButton>}</div>
  </div>;
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
function SetupCard({ icon: Icon, title, summary, help, children, defaultOpen = false, onToggle, scroll = false }: { icon: React.ComponentType<{ className?: string }>; title: string; summary?: React.ReactNode; help?: string; children: React.ReactNode; defaultOpen?: boolean; onToggle?: (e: React.SyntheticEvent<HTMLDetailsElement>) => void; scroll?: boolean }) {
  return (
    <details data-accordion open={readOpen("setup:" + title, defaultOpen) || undefined} onToggle={(e) => { writeOpen("setup:" + title, (e.currentTarget as HTMLDetailsElement).open); onToggle?.(e); }} className="group h-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><Icon className="h-3.5 w-3.5" /></span>
        <span data-no-info={help ? "" : undefined} className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}
        {summary != null && <span title={typeof summary === "string" ? summary : undefined} className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{summary}</span>}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className={`min-w-0 space-y-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800 ${scroll ? "max-h-56 overflow-y-auto overflow-x-hidden" : ""}`}>{children}</div>
    </details>
  );
}
// Atalhos "Corrigir" da prontidão: depois de trocar de aba, avisam quais campos devem ser mostrados; os cartões que guardam o campo dentro de painel/janela se abrem sozinhos.
const REVEAL_EVENT = "catalog2:reveal";
const revealTargets = (ids: string[]) => window.setTimeout(() => window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: { ids } })), 250);
// Quando alguém pede para abrir uma etapa (OPEN_STEP_EVENT) e o painel das etapas está fechado, o painel abre e a etapa abre assim que montar.
const pendingOpenStep: { id: string | null; block?: number } = { id: null };
// "Ajustar" nas etapas que formam o preço: vai até o bloco da etapa (horas e valor/hora) e, ao sair da etapa, volta para a Composição do preço.
export const GOTO_STEP_PRICE_EVENT = "catalog2:goto-step-price";
const RETURN_TO_PRICE_EVENT = "catalog2:return-to-price";
const CLOSE_STEPS_PANELS_EVENT = "catalog2:close-steps-panels";
const priceReturn: { stepId: string | null } = { stepId: null };

/** Cartão das etapas em UMA linha: "Ver etapas" (lista + cadastro, num PAINEL MOLDURA) e "Ver fluxo das etapas". Sem acordeão. */
function StepsPanelCard({ task, number, help, readOnly, act, hoursPerDay, forceOpen, children }: any) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  useEffect(() => {
    const on = (e: Event) => {
      const ids: string[] = (e as CustomEvent).detail?.ids ?? [];
      const hit = ids.find((id) => id === "catalog2-task-effort" || id.startsWith("task-effort:") || id === "catalog2-step-add:" + task.id);
      if (!hit) return;
      setOpen(true);
      window.setTimeout(() => document.getElementById(hit)?.scrollIntoView({ behavior: "smooth", block: "center" }), 700);
    };
    window.addEventListener(REVEAL_EVENT, on);
    return () => window.removeEventListener(REVEAL_EVENT, on);
  });
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent).detail?.stepId;
      if (!id || openRef.current || !(task.steps ?? []).some((s: any) => s.id === id)) return;
      pendingOpenStep.id = id;
      pendingOpenStep.block = Number((e as CustomEvent).detail?.block) || undefined;
      setOpen(true);
    };
    window.addEventListener(OPEN_STEP_EVENT, on);
    return () => window.removeEventListener(OPEN_STEP_EVENT, on);
  });
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener(CLOSE_STEPS_PANELS_EVENT, close);
    return () => window.removeEventListener(CLOSE_STEPS_PANELS_EVENT, close);
  }, []);
  const n = (task.steps ?? []).length;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="steps-card">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="section-number-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" data-testid="section-number">{number}</span>
        <div className="min-w-0 flex-1"><h3 className="text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100">Etapas da tarefa<span className="field-info" data-help={help} aria-hidden="true">i</span></h3><p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{n} etapa(s){n === 0 ? " · cadastre ao menos uma etapa" : ""}</p></div>
        <span className="flex shrink-0 items-center gap-1.5">
          {n >= 2 && <FlowPanelButton task={task} readOnly={readOnly} act={act} hoursPerDay={hoursPerDay} />}
          <button type="button" onClick={() => { for (const st of task.steps ?? []) writeOpen(`step-editing:${st.id}`, false); setOpen(true); }} className="inline-flex h-8 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="steps-open"><Eye className="h-3.5 w-3.5" />Ver etapas</button>
        </span>
      </div>
      {open && (
        <FramedPanel open onOpenChange={setOpen} testId="steps-panel" title="Etapas da tarefa">
          <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Etapas da tarefa · {task.name}</p><p className="truncate text-xs text-slate-500">{n} etapa(s). Cada etapa se edita pelo botão Editar dela.</p></div>
            <div className="flex items-center gap-2">{readOnly && <Button size="sm" onClick={() => window.dispatchEvent(new Event("catalog2:start-editing"))} data-testid="steps-edit"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}<Button size="sm" variant="outline" onClick={() => setOpen(false)}>Fechar</Button></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{children}</div>
        </FramedPanel>
      )}
    </section>
  );
}

/** Botão "Ver fluxo" (no cartão das etapas): abre o fluxo das etapas num PAINEL MOLDURA. É só uma visão do cadastro das etapas. */
function FlowPanelButton({ task, readOnly, act, hoursPerDay }: { task: any; readOnly: boolean; act: any; hoursPerDay: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-200 bg-white px-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-50" data-testid="open-step-flow"><RefreshCw className="h-3.5 w-3.5" />Ver fluxo das etapas</button>
      {open && (
        <FramedPanel open onOpenChange={setOpen} testId="step-flow-panel" title="Fluxo das etapas">
          <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Fluxo das etapas · {task.name}</p><p className="truncate text-xs text-slate-500">Mostra, em ordem, como as etapas cadastradas se encadeiam. Para mudar, edite a etapa.</p></div>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3"><StepFlowEditor task={task} readOnly={readOnly} act={act} hoursPerDay={hoursPerDay} /></div>
        </FramedPanel>
      )}
    </>
  );
}

/** Cartão em UMA linha (ícone, título, resumo) com botão "Ver / editar" que abre o conteúdo num PAINEL MOLDURA (padrão global; ver docs/padroes-globais.md). */
function PanelCard({ icon: Icon, title, summary, help, children, readOnly = false, allowEdit = false, number, forceOpen = false }: { forceOpen?: boolean; number?: number; allowEdit?: boolean; icon: React.ComponentType<{ className?: string }>; title: string; summary?: React.ReactNode; help?: string; children: React.ReactNode; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  return (
    <div className="h-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="panel-card">
      <div className="flex items-center gap-2 px-3 py-2">
        {number != null ? <span className="section-number-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" data-testid="section-number">{number}</span> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><Icon className="h-3.5 w-3.5" /></span>}
        <span data-no-info={help ? "" : undefined} className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}
        {summary != null && <span title={typeof summary === "string" ? summary : undefined} className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{summary}</span>}
        <button type="button" onClick={() => setOpen(true)} className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="panel-card-open"><Pencil className="h-3.5 w-3.5" />Ver</button>
      </div>
      {open && (
        <FramedPanel open onOpenChange={setOpen} testId="panel-card-panel" title={title}>
          <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{title}</p>{summary != null && <p className="truncate text-xs text-slate-500">{summary}</p>}</div></div>
            <div className="flex items-center gap-2">{readOnly && allowEdit && <Button size="sm" onClick={() => window.dispatchEvent(new Event("catalog2:start-editing"))} data-testid="panel-card-edit"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}<Button size="sm" variant="outline" onClick={() => setOpen(false)} data-testid="panel-card-close">Fechar</Button></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{children}</div>
        </FramedPanel>
      )}
    </div>
  );
}
// Botãozinho com quadradinho de marcar.
function CheckPill({ checked, onChange, disabled, hint, children }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label title={hint} className={`relative inline-flex select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${checked ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"} ${disabled ? "cursor-default opacity-70" : "cursor-pointer"}`}>
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

export function ContractModesSection({ version, readOnly, act, compact = false, product, onGoToRecurrence }: any) {
  // Ao marcar "Assinatura mensal" com a entrega mensal ainda indefinida, pergunta NO MESMO FLUXO se o produto gera nova entrega todo mês.
  const [askRecurrence, setAskRecurrence] = useState(false);
  const [recurrenceBusy, setRecurrenceBusy] = useState(false);
  const [recurrenceErr, setRecurrenceErr] = useState<string | null>(null);
  const deliveryMonthly = product?.delivery_recurrence === "mensal";
  const enableMonthlyDelivery = async () => {
    if (!product?.id) return;
    setRecurrenceBusy(true); setRecurrenceErr(null);
    try {
      await act(async () => {
        await apiClient.updateCatalog2ProductDeliveryRecurrence(product.id, "mensal");
        // Período mensal ativo (sem desconto, se ainda não estava configurado) — é o que deixa a assinatura contratável.
        const periods: any = await apiClient.getCatalog2ProductPeriods(product.id);
        const monthly = (periods?.data ?? []).find((p: any) => p.period === "mensal");
        if (!monthly || !monthly.is_active) await apiClient.updateCatalog2ProductPeriod(product.id, "mensal", { discount_percent: Number(monthly?.discount_percent ?? 0), is_active: true });
      }, "Entrega mensal ativada e período Mensal ligado.", { rethrow: true });
      setAskRecurrence(false);
    } catch (e: any) { setRecurrenceErr(e?.message ?? "Não foi possível ativar a entrega mensal."); }
    finally { setRecurrenceBusy(false); }
  };
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
  if (compact) {
    const CARD = "flex h-full min-w-0 flex-col gap-2.5 px-1 md:border-l md:border-slate-200 md:pl-5 dark:md:border-slate-700";
    const ICON = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";
    const FIELD = "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
    const priceHint = f.pricing_mode === "calculated" ? "Custo humano, de IA, taxas e prazo vêm das tarefas e etapas." : f.pricing_mode === "manual_fixed" ? "Vale como avulso, primeira cobrança e renovação. Exige preço e prazo." : "Sem compra automática nem cotação pública.";
    const modes = [
      { key: "accepts_one_time", label: "Avulso", hint: "Compra de um único ciclo, sem renovação automática. Atividades exclusivas da primeira execução podem ser cobradas quando aplicáveis." },
      { key: "accepts_recurring", label: "Assinatura (renova todo mês)", hint: "Abre um novo ciclo a cada mês. O cliente pode pagar mês a mês ou antecipado (bimestral, trimestral, semestral ou anual, com o desconto que você definir); as tarefas continuam abrindo todo mês. Atividades exclusivas da primeira execução não são cobradas novamente nas renovações." },
    ] as const;
    return <div id="catalog2-contract-modes" className="contents">
      <div className={CARD} data-testid="price-type-card">
        <div className="flex items-start gap-2.5"><span className={ICON}><DollarSign className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[14px] font-bold text-slate-900 dark:text-slate-100">Preço desta versão<span className="field-info" data-help="Como o preço desta versão é definido: calculado pelas tarefas (custo + taxas), preço fixo informado ou sob consulta (sem compra automática nem cotação pública)." aria-hidden="true">i</span></span><span className="block text-[11px] text-slate-500">Como o preço desta versão é definido</span></span></div>
        <select aria-label="Tipo de preço" disabled={readOnly} className={FIELD} value={f.pricing_mode} onChange={(e) => set({ pricing_mode: e.target.value })}>
          <option value="calculated">Calculado pelas tarefas (custo + taxas)</option>
          <option value="manual_fixed">Preço fixo informado</option>
          <option value="on_request">Sob consulta</option>
        </select>
        {f.pricing_mode === "manual_fixed" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Preço (R$)</span><input disabled={readOnly} type="number" min={0} step="0.01" aria-label="Preço fixo" className={FIELD} value={f.manual_price ?? ""} onChange={(e) => set({ manual_price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            <label className="block"><span className="mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Prazo (dias)</span><input disabled={readOnly} type="number" min={1} aria-label="Prazo fixo em dias" className={FIELD} value={f.manual_deadline_days ?? ""} onChange={(e) => set({ manual_deadline_days: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          </div>
        )}
        <p className="text-[11px] leading-snug text-slate-500">{priceHint}</p>
      </div>
      <div className={CARD} data-testid="modalities-card">
        <div className="flex items-start gap-2.5"><span className={ICON}><Settings2 className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[14px] font-bold text-slate-900 dark:text-slate-100">Modalidade<span className="field-info" data-help="Como o cliente pode contratar: Avulso (compra única, sem renovação) e/ou Assinatura mensal (renova todo mês). Pode marcar as duas; pelo menos uma precisa estar marcada." aria-hidden="true">i</span></span><span className="block text-[11px] text-slate-500">Escolha como o cliente pode contratar</span></span></div>
        <div className="grid gap-2">
          {modes.map((mode) => (
            <label key={mode.key} className={`relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 transition ${f[mode.key] ? "border-violet-500 bg-violet-50/70 dark:border-violet-600 dark:bg-violet-950/30" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"} ${readOnly ? "cursor-default opacity-80" : ""}`}>
              <input type="checkbox" disabled={readOnly} checked={!!f[mode.key]} onChange={(e) => { set({ [mode.key]: e.target.checked }); if (mode.key === "accepts_recurring" && e.target.checked && !deliveryMonthly) setAskRecurrence(true); if (mode.key === "accepts_recurring" && !e.target.checked) setAskRecurrence(false); }} className="sr-only" />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${f[mode.key] ? "border-violet-600" : "border-slate-300"}`}>{f[mode.key] && <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />}</span>
              <span className="min-w-0"><span className="block text-[13px] font-bold text-slate-900 dark:text-slate-100" data-no-info="">{mode.label}<span className="field-info" data-help={mode.hint} aria-hidden="true">i</span></span><span className="sr-only">{mode.hint}</span></span>
            </label>
          ))}
        </div>
        {f.accepts_recurring && !deliveryMonthly && (askRecurrence || !readOnly) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" data-testid="recurrence-prompt" role="group" aria-label="Este produto gera uma nova entrega todo mês?">
            <p className="font-semibold">Este produto gera uma nova entrega todo mês?</p>
            <p className="mt-0.5 leading-snug"><strong>Cobrança mensal</strong> é como o cliente paga (todo mês). <strong>Nova entrega mensal</strong> é abrir, a cada mês pago, um novo ciclo de tarefas. Para serviço recorrente (ex.: gestão mensal), o normal é <em>sim</em>. Sem isso a assinatura não pode ser publicada.</p>
            {recurrenceErr && <p role="alert" className="mt-1 font-semibold text-red-700">{recurrenceErr}</p>}
            {!readOnly && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <button type="button" disabled={recurrenceBusy} onClick={() => void enableMonthlyDelivery()} className="rounded-md bg-violet-700 px-2.5 py-1 font-semibold text-white hover:bg-violet-800 disabled:opacity-60" data-testid="recurrence-yes">Sim, gerar novo ciclo/entrega todos os meses</button>
              <button type="button" onClick={() => onGoToRecurrence?.()} className="rounded-md border border-amber-400 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100" data-testid="recurrence-goto">Decidir no Passo 4 (ir ao campo)</button>
            </div>}
          </div>
        )}
        {!readOnly && <p className={`flex items-center justify-end gap-1.5 text-xs ${JSON.stringify(f) === sig ? "text-slate-500" : "text-amber-700"}`}>{JSON.stringify(f) === sig ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />Alterações salvas</> : "Alteração pendente — vale ao clicar em “Salvar rascunho”."}</p>}
      </div>
      {f.accepts_recurring && product?.id && <div className="md:col-span-3" data-testid="periods-row"><ProductPeriodsInline productId={product.id} versionId={version?.id} readOnly={readOnly} /></div>}
    </div>;
  }
  // O cartão de modalidades só existe na versão compacta do Passo 2 (Avulso e Assinatura mensal). Os controles antigos de
  // "implementação inicial", "implementação roda" e "só em pacote" foram removidos do cadastro (16/10): a implantação vem das etapas
  // "Só na primeira execução" e "somente em pacote" é decidido em Pacotes e Dependências.
  return null;
}

/** Número da tarefa na tela: sequencial e com zero à esquerda (01, 02… 10, 11). */
export const taskNumberLabel = (n: number | null | undefined) => (n == null ? "—" : String(n).padStart(2, "0"));

export function DeliveryCommercialOverview({ version, readOnly, act, ringOf, locked, product, onGoToRecurrence, number }: any) {
  const [open, setOpen] = usePersistedFlag(`commercial-overview:${product?.id ?? version?.id ?? "x"}`, false); // F5 reabre a janela se ela estava aberta
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    const on = (e: Event) => {
      const ids: string[] = (e as CustomEvent).detail?.ids ?? [];
      const hit = ids.find((id) => /^(catalog2-deadline-base|catalog2-delivery-recurrence|charge-summary-card|delivery-readiness)/.test(id));
      if (!hit) return;
      setOpen(true);
      window.setTimeout(() => document.getElementById(hit)?.scrollIntoView({ behavior: "smooth", block: "center" }), 700);
    };
    window.addEventListener(REVEAL_EVENT, on);
    return () => window.removeEventListener(REVEAL_EVENT, on);
  }, []);
  const tasks = version.tasks ?? [];
  const dependencyCount = tasks.reduce((n: number, task: any) => n + (task.depends_on?.length ?? 0), 0);
  // Cada parte diz exatamente o que falta (aparece no "i" ao lado do nome). Completa = nada faltando.
  const listNames = (names: string[]) => names.slice(0, 4).join(", ") + (names.length > 4 ? ` e mais ${names.length - 4}` : "");
  const structureMissing = [!version.title && "o título comercial", !version.summary && "a descrição curta"].filter(Boolean) as string[];
  const tasksMissing: string[] = [];
  if (tasks.length === 0) tasksMissing.push("Nenhuma tarefa cadastrada.");
  else {
    const noSteps = tasks.filter((t: any) => (t.steps ?? []).length === 0).map((t: any) => t.name || "Tarefa sem nome");
    if (noSteps.length) tasksMissing.push(`Tarefa${noSteps.length > 1 ? "s" : ""} sem etapas: ${listNames(noSteps)}.`);
    const noTime = tasks.flatMap((t: any) => (t.steps ?? []).filter((s: any) => !s.estimated_minutes).map((s: any) => `${s.name || "Etapa"} (${t.name || "tarefa"})`));
    if (noTime.length) tasksMissing.push(`Etapa${noTime.length > 1 ? "s" : ""} sem tempo estimado: ${listNames(noTime)}.`);
  }
  const readyParts = [
    { label: "Estrutura comercial", ok: structureMissing.length === 0, help: structureMissing.length ? `Falta preencher: ${structureMissing.join(" e ")} (Passo 1, Informações do produto).` : "Título comercial e descrição curta preenchidos." },
    { label: "Tarefas e etapas", ok: tasksMissing.length === 0, help: tasksMissing.length ? `Falta: ${tasksMissing.join(" ")}` : `${tasks.length} tarefa${tasks.length === 1 ? "" : "s"}, todas com etapas e tempo estimado.` },
    { label: "Acessos e conexões", ok: accessCount(version) > 0, help: accessCount(version) > 0 ? `${accessCount(version)} acesso${accessCount(version) === 1 ? "" : "s"} configurado${accessCount(version) === 1 ? "" : "s"}.` : "Nenhum acesso configurado. Adicione os acessos que o cliente precisa liberar em “Acessos necessários”." },
  ];
  const ready = readyParts.filter((part) => part.ok).length;
  const percent = Math.round((ready / readyParts.length) * 100);
  return <section className="h-full min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
    <div className="flex items-start gap-2.5">
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
        {number != null ? <span className="section-number-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" data-testid="section-number">{number}</span> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40"><CalendarClock className="h-4 w-4" /></span>}
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Entrega comercial<span className="field-info" data-help="Reúne o prazo prometido ao cliente, o tipo de preço, as modalidades de contratação e a prontidão da entrega (o que já está completo e o que falta)." aria-hidden="true">i</span></span><span className="block text-[11px] text-slate-500">Defina prazo, preço, modalidades e prontidão.</span></span>
      </button>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 shrink-0 items-center gap-1 self-center rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="commercial-overview-open"><Eye className="h-3.5 w-3.5" />Ver</button>
      {SHOW_HELPER_BUTTON && <button type="button" onClick={() => setGuideOpen(true)} title="Abrir ajudante de cadastro" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"><Lightbulb className="h-3.5 w-3.5" />Ajudante</button>}
    </div>
    {open && <FramedModal open onOpenChange={setOpen} testId="commercial-overview-modal" title="Entrega comercial">
      <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
        <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Entrega comercial</p><p className="truncate text-xs text-slate-500">Prazo, preço, modalidades de contratação e prontidão da entrega.</p></div>
        <div className="flex items-center gap-2">{readOnly && <Button size="sm" onClick={() => window.dispatchEvent(new Event("catalog2:start-editing"))} data-testid="commercial-overview-edit"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}{!readOnly && <Button size="sm" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="text-white shadow-md hover:brightness-110" data-testid="commercial-overview-save" title="Salva tudo o que você configurou nesta janela (modalidades, prazo, preço) no rascunho" onClick={() => window.dispatchEvent(new Event("catalog2:save-draft"))}><Save className="mr-1 h-3.5 w-3.5" />Salvar rascunho</Button>}<Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" data-testid="commercial-overview-close" onClick={() => { window.dispatchEvent(new Event("catalog2:flush-pending")); setOpen(false); }}>Fechar</Button></div>
      </div>
      <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <CommercialConsistencyBanner version={version} readOnly={readOnly} act={act} />
      <div className="grid items-start gap-4 md:grid-cols-3"><DeadlineBaseField version={version} act={act} ringOf={ringOf} locked={locked} compact /><ContractModesSection version={version} readOnly={readOnly} act={act} compact product={product} onGoToRecurrence={onGoToRecurrence} /></div>
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40" data-testid="charge-summary-card"><p className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100" data-no-info="">Cobrança estimada<span className="field-info" data-help="Implantação/primeira execução (etapas “Só na primeira execução”), ciclo recorrente, primeira cobrança, renovação mensal e compra avulsa — calculados pelo servidor com as opções padrão. A implantação nasce sozinha das etapas marcadas; não há botão de “Implementação inicial”." aria-hidden="true">i</span></p><ChargeSummaryLoader version={version} refreshKey={String(version.updated_at ?? "")} /></section>
      <section id="delivery-readiness" className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 lg:grid-cols-[auto_minmax(9rem,1fr)_repeat(3,minmax(0,1fr))] lg:items-center">
        <div className="flex items-center gap-2"><span className="flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-500 bg-white text-sm font-extrabold text-slate-900 dark:bg-slate-900 dark:text-slate-100">{percent}%</span><span><span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Prontidão da entrega</span><span className="block text-[10px] text-slate-500" data-testid="readiness-subtitle">Verifica se a estrutura para <strong>executar</strong> o produto está configurada.</span></span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} /></div>
        {readyParts.map((part) => <div key={part.label} className={`flex min-w-0 items-center gap-1.5 border-l border-emerald-100 pl-2 text-[11px] dark:border-emerald-900/40 ${part.ok ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block" data-no-info="">{part.label}<span className="field-info" data-help={part.help} aria-hidden="true">i</span></span><strong className="block text-xs">{part.ok ? "OK" : "REVISAR"}</strong></span></div>)}
        <details className="min-w-0 rounded-lg border border-emerald-200 bg-white/70 px-2.5 py-1.5 text-[11px] text-slate-700 dark:border-emerald-900/50 dark:bg-slate-900/40 dark:text-slate-200 lg:col-span-full" data-testid="readiness-explain">
          <summary className="cursor-pointer font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">O que a prontidão verifica</summary>
          <p className="mt-1.5 leading-snug">Este quadro confere se a estrutura operacional necessária para executar o produto está configurada. Os itens verificados:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 leading-snug">
            <li><strong>Estrutura comercial:</strong> modalidades, recorrência e demais configurações comerciais.</li>
            <li><strong>Tarefas e etapas:</strong> fluxo operacional, responsáveis, duração e regras de execução.</li>
            <li><strong>Acessos e conexões:</strong> requisitos de acesso necessários, quando houver.</li>
          </ul>
          <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 font-semibold leading-snug text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" data-testid="readiness-not-published">Prontidão da entrega <u>não</u> significa que o produto já está publicado. Ela indica somente que a estrutura de execução está suficientemente configurada; a publicação continua dependendo das demais validações do cadastro (Passo 5).</p>
        </details>
      </section>
      </div>
    </FramedModal>}
    <DeliverySetupGuide open={guideOpen} onOpenChange={setGuideOpen} />
  </section>;
}

/** Guia contextual: fica na própria área para a pessoa preencher um campo e avançar ao próximo. */
function DeliverySetupGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [current, setCurrent] = useState(0);
  const steps = [
    { title: "Prazo comercial", text: "É o prazo que o cliente vê. Informe em horas úteis: 24 h equivalem a 1 dia. Ele é a promessa comercial; as horas das etapas servem para o esforço interno.", target: "catalog2-deadline-base" },
    { title: "Preço desta versão", text: "Escolha como este preço será definido: calculado pelas tarefas, preço fixo ou sob consulta. No preço calculado, o valor vem das horas, especialidades, impostos e margem; no fixo, preencha valor e prazo manualmente.", target: "catalog2-contract-modes" },
    { title: "Modalidades de contratação", text: "Defina se o cliente pode comprar uma vez, assinar recorrência ou as duas formas. Marque recorrência apenas quando uma nova entrega deve ser criada em cada ciclo pago.", target: "catalog2-contract-modes" },
    { title: "Cobrança estimada", text: "Este quadro é somente de leitura: ele mostra a previsão calculada para primeira cobrança, recorrência e avulso. Para mudar valores, ajuste etapas ou a precificação — nunca se digita aqui.", target: "charge-summary-card" },
    { title: "Prontidão da entrega", text: "É uma conferência da estrutura: tarefas, etapas e acessos. Ela não publica o produto. Use-a para descobrir exatamente o que falta antes de avançar.", target: "delivery-readiness" },
  ];
  const item = steps[current];
  const go = (next: number) => {
    setCurrent(next);
    window.setTimeout(() => document.getElementById(steps[next].target)?.scrollIntoView({ block: "center", behavior: "smooth" }), 0);
  };
  if (!open) return null;
  return <aside className="mt-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3 shadow-sm" data-testid="delivery-setup-guide">
    <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-1.5 text-sm font-bold text-violet-950"><Lightbulb className="h-4 w-4 text-violet-700" />Ajudante de cadastro</p><p className="mt-0.5 text-[11px] text-violet-700">Passo {current + 1} de {steps.length} · ele só orienta; não altera nem salva dados.</p></div><button type="button" aria-label="Fechar ajudante" onClick={() => onOpenChange(false)} className="rounded-md p-1 text-violet-700 hover:bg-violet-100"><X className="h-4 w-4" /></button></div>
    <div className="mt-2 flex gap-1" aria-hidden="true">{steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= current ? "bg-violet-600" : "bg-violet-200"}`} />)}</div>
    <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-700">{item.text}</p>
    <div className="mt-3 flex items-center justify-between gap-2"><Button type="button" variant="outline" size="sm" disabled={current === 0} onClick={() => go(current - 1)}>Anterior</Button>{current < steps.length - 1 ? <Button type="button" size="sm" onClick={() => go(current + 1)}>Próximo campo<ChevronRight className="h-4 w-4" /></Button> : <Button type="button" size="sm" onClick={() => onOpenChange(false)}>Terminar ajuda</Button>}</div>
  </aside>;
}

// Pré-requisitos do PRODUTO: exige outro produto/tarefa/aprovação já concluído pelo mesmo cliente
// antes de começar (fora de pacote). Regras de pacote ficam em Pacotes e Dependências.
function ProductPrerequisitesSection({ version, compact = false, onAdd }: { version: any; compact?: boolean; onAdd?: () => void }) {
  const tasks = version.tasks ?? [];
  const byId = new Map(tasks.map((task: any) => [task.id, task]));
  const taskRules = tasks.flatMap((task: any) => (task.depends_on ?? []).map((dependencyId: string) => ({ task, prerequisite: byId.get(dependencyId) })));
  // Dependências entre ETAPAS (fluxo): "junto com o início", "depois de X" e regras de executor.
  const stepRules: { task: any; step: any; text: string }[] = [];
  for (const task of tasks) {
    const steps: any[] = task.steps ?? [];
    const nm = (k: string) => steps.find((s) => s.key === k)?.name ?? k;
    for (const s of steps) {
      const parts: string[] = [];
      if (Array.isArray(s.depends_on)) parts.push(s.depends_on.length === 0 ? "começa junto com o início da tarefa" : "começa depois de " + s.depends_on.map(nm).join(" e "));
      if (s.executor_same_as_key && s.executor_policy === "same_as_step") parts.push("mantém o executor de " + nm(s.executor_same_as_key));
      if (s.executor_same_as_key && s.executor_policy === "prefer_same_as_step") parts.push("prefere o executor de " + nm(s.executor_same_as_key));
      if (s.executor_same_as_key && s.executor_policy === "other_than_step") parts.push("nunca o executor de " + nm(s.executor_same_as_key));
      if (parts.length) stepRules.push({ task, step: s, text: parts.join("; ") });
    }
  }
  const rules = taskRules;
  const totalRules = taskRules.length + stepRules.length;
  const totalSteps = tasks.reduce((n: number, t: any) => n + (t.steps?.length ?? 0), 0);
  if (compact) return <PersistDetails persistKey="d2" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><summary className="flex cursor-pointer list-none items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40"><Link2 className="h-4 w-4" /></span><span className="flex-1 text-sm font-bold text-slate-900 dark:text-slate-100">Dependências</span><span className="text-xs text-slate-500">{totalRules} regra{totalRules === 1 ? "" : "s"} <span className="text-slate-300">•</span> <strong className="text-emerald-700">{totalRules} configurada{totalRules === 1 ? "" : "s"}</strong></span><ChevronDown className="h-4 w-4 text-slate-500" /></summary><div className="mt-3"><p className="mb-2 text-[11px] text-slate-500">Dependência é a ordem em que as coisas começam: entre <strong>etapas</strong> (quais rodam juntas, quais esperam outras e se mantêm o mesmo executor) e entre <strong>tarefas</strong> (combos: uma tarefa só abre depois de outra).</p>{stepRules.length > 0 && <ul className="mb-2 space-y-1">{stepRules.map(({ task, step, text }) => <li key={task.id + step.id} className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-xs dark:border-indigo-900/50 dark:bg-indigo-950/20"><strong>{step.name}</strong> <span className="text-slate-400">({task.name})</span>: {text}.</li>)}</ul>}{rules.length === 0 && stepRules.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-800/50">{totalSteps < 2 ? "Ainda não há dependências: com uma única etapa não há o que ordenar. Cadastre pelo menos 2 etapas e use \"Quando começa\" / \"Fluxo das etapas\" para definir a ordem." : "Nenhuma dependência definida: as etapas seguem em sequência, uma depois da outra. Use \"Adicionar dependência\" para colocar etapas em paralelo ou depender de etapas específicas."}</p> : rules.length === 0 ? null : <ol className="space-y-1.5">{rules.map(({ task, prerequisite }: any, index: number) => <li key={`${task.id}-${prerequisite?.id ?? "missing"}`} className="relative flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50"><span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{index + 1}</span>{index < rules.length - 1 && <span className="absolute bottom-[-8px] left-[26px] h-3 w-px bg-violet-400" />}<strong className="min-w-0 flex-[0.9] truncate text-slate-800 dark:text-slate-100">{task.name}</strong><ChevronRight className="h-4 w-4 shrink-0 text-violet-500" /><span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300"><span className="text-slate-400">Depois de:</span> {prerequisite?.name ?? "tarefa indisponível"}</span><span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Configurada</span></li>)}</ol>}<div className="mt-3 flex justify-end"><Button type="button" variant="outline" className="h-8 border-violet-300 px-3 text-xs text-violet-700 hover:bg-violet-50" onClick={() => (onAdd ? onAdd() : document.getElementById("catalog2-editor-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }))}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar dependência</Button></div></div></PersistDetails>;
  return (
    <SetupCard icon={Link2} title="Resumo de dependências" summary={rules.length ? `${rules.length} regra${rules.length === 1 ? "" : "s"} cadastrada${rules.length === 1 ? "" : "s"}` : "nenhuma tarefa aguarda outra"} help="Este é apenas um resumo. As dependências são cadastradas e alteradas dentro da tarefa ou da etapa que será bloqueada; toda alteração feita lá aparece aqui automaticamente." scroll>
      {rules.length === 0 ? <p className="text-xs text-slate-500">Nenhuma tarefa está aguardando outra. Configure uma dependência dentro da própria tarefa quando precisar controlar a ordem de início.</p> : <ul className="space-y-2">
        {rules.map(({ task, prerequisite }: any) => <li key={`${task.id}-${prerequisite?.id ?? "missing"}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{task.name}</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">Só inicia depois de <strong>{prerequisite?.name ?? "uma tarefa que não está mais disponível"}</strong> ser finalizada.</p>
          <p className="mt-1 text-[11px] text-violet-700 dark:text-violet-300">Configurada nesta tarefa</p>
        </li>)}
      </ul>}
    </SetupCard>
  );
}

function formatStageHours(minutes: number | null | undefined) {
  const hours = (minutes ?? 0) / 60;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(hours)} h`;
}

/** Custo estimado de UMA etapa (horas × valor/hora da especialidade). Nulo quando falta hora ou valor/hora. */
function stepCostEstimate(step: any, task: any, refs: any): number | null {
  if (step.executor_kind === "leader" || step.executor_kind === "internal") return null; // líder / equipe interna: horas só como prazo, sem custo no produto
  const rate = (refs?.specialties ?? []).find((item: any) => item.id === (step.specialty_id ?? task?.specialty?.id))?.max_hourly_rate;
  if ((step.estimated_minutes ?? 0) <= 0 || rate == null) return null;
  return (step.estimated_minutes / 60) * Number(rate);
}
/** Custo da etapa com o qualificador: executor + percentual do qualificador sobre o custo da etapa (padrão 20%, configurável em Precificação). */
function stepQualifierCost(step: any, task: any, refs: any): { human: number; qualifier: number; total: number; pct: number } | null {
  const human = stepCostEstimate(step, task, refs);
  if (human == null) return null;
  const mode = step.execution_mode ?? "humano";
  const qualifies = mode !== "humano" || step.requires_qualification !== false || !!step.requires_specialist_qualification;
  if (!qualifies) return null;
  const pct = Number(refs?.qualifierPercent ?? 20);
  const qualifier = Math.round(human * (pct / 100) * 100) / 100;
  return { human, qualifier, total: Math.round((human + qualifier) * 100) / 100, pct };
}
const brl2 = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function taskStagesPrice(task: any, refs: any) {
  const steps = task.steps ?? [];
  if (steps.length === 0) return null;
  let total = 0;
  for (const step of steps) {
    const rate = (refs?.specialties ?? []).find((item: any) => item.id === (step.specialty_id ?? task.specialty?.id))?.max_hourly_rate;
    if ((step.estimated_minutes ?? 0) <= 0 || rate == null) return null;
    total += (step.estimated_minutes / 60) * Number(rate);
  }
  return total;
}

/** Custo da opção IA de uma etapa "Humano ou IA" (horas da IA × valor/hora da especialidade de IA). */
function stepAiCostEstimate(step: any, refs: any): number | null {
  const rate = (refs?.specialties ?? []).find((item: any) => item.id === step.ai_specialty_id)?.max_hourly_rate;
  if ((step.ai_estimated_minutes ?? 0) <= 0 || rate == null) return null;
  return (step.ai_estimated_minutes / 60) * Number(rate);
}
/** Total da tarefa se as etapas "Humano ou IA" forem feitas por IA (as demais etapas custam o mesmo). */
function taskStagesPriceAi(task: any, refs: any) {
  const steps = task.steps ?? [];
  if (steps.length === 0) return null;
  let total = 0;
  for (const step of steps) {
    const c = step.execution_mode === "hibrido" ? stepAiCostEstimate(step, refs) : stepCostEstimate(step, task, refs);
    if (c == null) return null;
    total += c;
  }
  return total;
}

function TasksTab({ version, productId, readOnly, refs, act, highlightTarget, highlightTaskIds, clearHighlight, editTaskId, onOpenPricing, taskStructure, leading, trailing }: any) {
  // Numeração dos cartões: 1 Resumo da tarefa, 2 Entrega comercial, 3 Etapas, 4 Questionário, 5 Entregáveis, 6 Acessos (com mais tarefas, continua).
  const nb = (i: number) => (i === 0 ? { r: 1, e: 3, q: 4, d: 5 } : { r: 4 * i + 2, e: 4 * i + 3, q: 4 * i + 4, d: 4 * i + 5 });
  const [summaryOpen, setSummaryOpen] = useState<string | null>(null);
  const ringOf = useContext(RingCtx);
  // Reunião 2026-10-05: produto individual = UMA tarefa principal (o resto são etapas); só combos/compostos têm várias.
  const single = taskStructure === "single";
  const wc = useWorkCalendar();
  const hasBaseTask = (version.tasks ?? []).some((x: any) => !x.is_conditional);
  const [nt, setNt] = useState({ name: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [similarAsk, setSimilarAsk] = useState<any[] | null>(null);
  // Nome igual/parecido a um modelo do catálogo? Mostra os candidatos antes de criar (nunca duplica por descuido).
  const createTask = (justification?: string) => act(() => apiClient.addCatalog2Task(version.id, { name: nt.name.trim(), client_action_id: `task-${version.id}-${Date.now()}`, ...(justification ? { duplicate_resolution: "create_anyway", duplicate_justification: justification } : {}) }), "Tarefa criada e cadastrada no catálogo global de modelos.", { rethrow: true })
    .then((result: any) => { if (result) { setNt({ name: "" }); setShowCreate(false); clearHighlight("catalog2-task-create"); } })
    .catch((e: any) => { if (e?.code === "duplicate_model_candidates" && Array.isArray(e?.data?.details?.candidates)) setSimilarAsk(e.data.details.candidates); });
  const [pickTask, setPickTask] = useState(false);
  const [viewModel, setViewModel] = useState<number | null>(null);
  const [guidedTaskId, setGuidedTaskId] = useState<string | null>(null);
  const tasks = version.tasks;
  const [advancedTask, setAdvancedTask] = useState<string | null>(null);
  // Acordeão: cada tarefa pode ser recolhida; abre sozinha quando a prontidão aponta para ela.
  const [closed, setClosed] = useState<Set<string>>(() => new Set(tasks.map((task: any) => task.id)));
  const toggleTask = (id: string) => setClosed((cur) => {
    if (!cur.has(id)) return new Set([...tasks.map((task: any) => task.id), id]);
    const next = new Set(tasks.map((task: any) => task.id)); next.delete(id); return next;
  });
  const toggleAdvancedTask = (id: string) => {
    // No segundo clique fecha de verdade. Ao abrir, revela a tarefa para que
    // o painel não fique ativo, porém invisível, dentro do acordeão fechado.
    if (advancedTask === id) {
      setAdvancedTask(null);
      return;
    }
    setClosed((cur) => {
      const next = new Set(cur);
      next.delete(id);
      return next;
    });
    setAdvancedTask(id);
  };
  useEffect(() => {
    const collapse = () => setClosed(new Set(tasks.map((task: any) => task.id)));
    const expand = () => setClosed(new Set());
    window.addEventListener("catalog2:collapse-tasks", collapse);
    window.addEventListener("catalog2:expand-tasks", expand);
    return () => { window.removeEventListener("catalog2:collapse-tasks", collapse); window.removeEventListener("catalog2:expand-tasks", expand); };
  }, [tasks]);
  useEffect(() => {
    if (!editTaskId || !tasks.some((task: any) => task.id === editTaskId)) return;
    setClosed((cur) => { const next = new Set(cur); next.delete(editTaskId); return next; });
    setAdvancedTask(editTaskId);
  }, [editTaskId, tasks]);
  return (
    <div id="catalog2-tasks" className="grid scroll-mt-6 items-stretch gap-3 md:grid-cols-2 [&>*]:h-full">
      {tasks.length === 0 && leading?.(1)}
      {tasks.map((t: any, i: number) => (
        <Fragment key={t.id}>

        <div id={`catalog2-task-${t.id}`} className="scroll-mt-8 rounded-xl border border-violet-200 border-l-4 border-l-violet-500 bg-white p-2 shadow-sm dark:border-violet-900/60 dark:border-l-violet-500 dark:bg-slate-900/60" data-testid="task-summary-row">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="section-number-badge flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold text-white" data-testid="section-number">{nb(i).r}</span>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase leading-none tracking-wide text-violet-700 dark:text-violet-300" data-testid="task-summary-label">Resumo da tarefa</p><span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t.name}</span></div>
            {t.task_model_id != null && <button type="button" title="Ver o modelo global desta tarefa" onClick={() => setViewModel(t.task_model_id)} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-200" data-testid="task-number">Tarefa ID {taskNumberLabel(t.model?.number ?? t.task_model_id)}</button>}
            <ModelStatusChips model={t.model} readOnly={readOnly} onSync={() => act(() => apiClient.syncCatalog2TaskModel(t.id), "Tarefa atualizada para a revisão atual do modelo global.")} />
            <span className="ml-auto flex items-center gap-1">
              {!readOnly && (
              <div className="flex gap-1">
                {!single && <IconBtn label="Mover tarefa para cima — ela passa a ser executada antes da anterior" disabled={i === 0} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, -1)))}><ChevronUp className="h-4 w-4" /></IconBtn>}
                {!single && <IconBtn label="Mover tarefa para baixo — ela passa a ser executada depois da próxima" disabled={i === tasks.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, 1)))}><ChevronDown className="h-4 w-4" /></IconBtn>}
                {!single && <IconBtn label="Duplicar esta tarefa (cria uma cópia dela neste produto)" onClick={() => act(() => apiClient.duplicateCatalog2Task(t.id), "Tarefa duplicada.")}><Copy className="h-4 w-4" /></IconBtn>}
                {/* Não se exclui tarefa (todo produto tem ao menos uma): ela é LIMPA com dupla confirmação e pode ser restaurada. */}
                <ClearTaskButton task={t} act={act} />
              </div>
              )}
              <button type="button" onClick={() => setSummaryOpen(t.id)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="task-summary-open"><Eye className="h-3.5 w-3.5" />Ver</button>
            </span>
          </div>
          {summaryOpen === t.id && (
            <FramedModal open onOpenChange={(o) => { if (!o) setSummaryOpen(null); }} testId="task-summary-modal" title={`Resumo da tarefa — ${t.name}`}>
              <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
                <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Resumo da tarefa · {t.name}</p><p className="truncate text-xs text-slate-500">Tudo vem das etapas cadastradas: quem executa, especialidades, horas, prazo e custo.</p></div>
                <div className="flex items-center gap-2">{readOnly && <Button size="sm" onClick={() => window.dispatchEvent(new Event("catalog2:start-editing"))} data-testid="task-summary-edit"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}<Button size="sm" variant="outline" onClick={() => setSummaryOpen(null)}>Fechar</Button></div>
              </div>
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mt-2">
          <TaskSummaryCard task={t} specialties={refs?.specialties ?? []} metrics={[
            { label: "Etapas", value: `${t.steps.length} etapa${t.steps.length === 1 ? "" : "s"}${t.stage_execution === "stage" ? " · execução por etapa" : ""}`, help: t.stage_execution === "stage" ? "Cada etapa é qualificada e aprovada antes de liberar a próxima." : "Qualificação e aprovação acontecem no fim da tarefa." },
            { label: "Horas das etapas", value: formatStageHours((t.steps ?? []).reduce((sum: number, step: any) => sum + (step.estimated_minutes ?? 0), 0)), help: "Soma do tempo estimado de todas as etapas." },
            { label: "Prazo pelas etapas", value: flowSummary(t.steps ?? []).criticalMinutes > 0 ? `${fmtBusinessMinutes(flowSummary(t.steps).criticalMinutes)} úteis (≈ ${businessDaysOf(flowSummary(t.steps).criticalMinutes, wc.business_hours_per_day).toLocaleString("pt-BR")} dia(s))` : "a definir", help: "Prazo calculado pelas etapas, em horas úteis do calendário da plataforma. Etapas em paralelo contam só a mais longa." },
            (t.steps ?? []).some((s: any) => s.execution_mode === "hibrido")
              ? { label: "Custo total estimado", value: `Humano ${taskStagesPrice(t, refs) == null ? "a definir" : brl2(taskStagesPrice(t, refs)!)} · IA ${taskStagesPriceAi(t, refs) == null ? "a definir" : brl2(taskStagesPriceAi(t, refs)!)}`, help: "Há etapa “Humano ou IA”: o total aparece com as duas opções (as etapas híbridas feitas por humano ou por IA). O cliente escolhe na contratação. Horas × valor/hora, sem taxas e margem." }
              : { label: "Custo total estimado", value: taskStagesPrice(t, refs) == null ? "a definir" : brl2(taskStagesPrice(t, refs)!), help: "Soma do custo estimado de todas as etapas (horas × valor/hora, sem taxas e margem)." },
          ]}>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
              <TaskIndicators task={t} />
              {!readOnly && ["ia", "hibrido"].includes(t.execution_mode) && (
                <button type="button" aria-expanded={advancedTask === t.id} onClick={() => toggleAdvancedTask(t.id)} className="inline-flex h-7 items-center gap-1 rounded-lg border border-violet-300 bg-white px-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-50">
                  <Sparkles className="h-3.5 w-3.5" />{advancedTask === t.id ? "Fechar configuração da IA" : "Configurar a IA desta tarefa"}
                </button>
              )}
            </div>
          </TaskSummaryCard>
          </div>
                {guidedTaskId === t.id && <TaskSetupGuide task={t} onClose={() => setGuidedTaskId(null)} />}
                {!readOnly && <RestoreTaskPanel task={t} act={act} />}
                <ContinuityCard task={t} readOnly={readOnly} act={act} />
                {!readOnly && advancedTask === t.id && ["ia", "hibrido"].includes(t.execution_mode) && <section className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/30"><AiConfig task={t} act={act} onOpenPricing={() => void onOpenPricing?.(t.id)} /></section>}
              </div>
            </FramedModal>
          )}
        </div>
        {i === 0 && leading?.(2)}
        {/* Etapas, entregáveis e fluxo: cada um no SEU cartão, abaixo do cartão da tarefa (pedido 20/10). */}
        <StepsPanelCard task={t} number={nb(i).e} help="Tudo o que você cadastra nas etapas abaixo (quem executa, especialidade, horas, prazo e custo) é somado automaticamente no resumo, em cima. O resumo é atualizado sozinho." readOnly={readOnly} act={act} hoursPerDay={wc.business_hours_per_day} forceOpen={highlightTaskIds.includes(t.id)}>
          {(() => {
            const together = flowSummary(t.steps ?? []).waves.filter((w) => w.length > 1);
            if (together.length === 0) return null;
            const numberOf = (k: string) => (t.steps ?? []).findIndex((s: any) => s.key === k) + 1;
            return <p className="ml-2 mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300" data-testid="parallel-legend">⇄ Ao mesmo tempo: {together.map((w) => `etapas ${w.map(numberOf).sort((a, b) => a - b).join(" + ")}`).join(" · ")}</p>;
          })()}
          <ul className="mt-2 ml-2 space-y-2.5 border-l-2 border-sky-200 pl-5 dark:border-sky-900/60">
            {t.steps.map((st: any, si: number) => {
              const wave = flowSummary(t.steps ?? []).waves.find((w) => w.length > 1 && w.includes(st.key));
              const parallelWith = wave ? wave.filter((k) => k !== st.key).map((k) => (t.steps ?? []).findIndex((s: any) => s.key === k) + 1).sort((a, b) => a - b) : [];
              return <StepRow key={st.id} version={version} step={st} index={si} steps={t.steps} taskId={t.id} readOnly={readOnly} act={act} refs={refs} task={t} parallelWith={parallelWith} />;
            })}
            {!readOnly && <AddStepControl ringClass={ringOf("catalog2-step-add:" + t.id)} domId={"catalog2-step-add:" + t.id} refs={refs} task={t} act={act} />}
          </ul>
        </StepsPanelCard>
        {/* O questionário vem DEPOIS da tarefa e das etapas: a IA monta as perguntas a partir delas. */}
        <div className="flex w-full min-w-0 flex-col" data-testid="task-cards-stack">
          <PanelCard number={nb(i).q} allowEdit readOnly={readOnly} icon={ListChecks} title="Questionário de contratação" summary={t.questionnaire ? `${t.questionnaire.name} · ${t.questionnaire.questions.length} pergunta(s)` : "nenhum questionário"} help="Perguntas que o cliente responde ao contratar. As respostas orientam a equipe e a IA. Pode ser um questionário já existente (busque pelo nome ou pelo ID) ou um novo.">
            <QuestionnaireSection task={t} refs={refs} act={act} version={version} readOnly={readOnly} />
          </PanelCard>
        </div>
        <div data-testid="task-deliverables-after-steps"><PanelCard number={nb(i).d} icon={UploadCloud} title="Entregáveis da tarefa" summary={`${(t.deliverables ?? []).length} entregável(is)${(t.deliverables ?? []).some((d: any) => !d.step_id) ? " · há entregável sem etapa responsável" : ""}`} help="Vistos por etapa: cada entregável pertence a uma etapa (a etapa responsável). Para criar ou ligar um entregável, abra a etapa e use o bloco “Entregáveis desta etapa”; aqui você acompanha, filtra, edita e vê o que ficou sem etapa. É sempre o mesmo cadastro: o que muda em um lugar muda no outro." readOnly={readOnly}>
        <TaskDeliverablesEditor summaryOnly task={t} act={act} readOnly={readOnly} version={version} />
        </PanelCard></div>
        </Fragment>
      ))}
      {trailing?.(tasks.length === 0 ? 2 : 4 * tasks.length + 2)}
      {!readOnly && !(single && hasBaseTask) && (
        <div id="catalog2-task-create" className={`space-y-2 md:col-span-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900/60 dark:bg-violet-950/10 ${ringOf("catalog2-task-create")}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(110,44,150,0.3)] ring-1 ring-white/20 transition hover:brightness-110 active:scale-[0.98]"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25"><Plus className="h-3 w-3" strokeWidth={3} /></span> {single ? "Cadastrar a tarefa principal" : "Adicionar tarefa"} <ChevronDown className="h-3.5 w-3.5 opacity-80" /></button>
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
              <p className="w-full text-xs text-neutral-500">A nova tarefa recebe o próximo número da sequência (ex.: Tarefa ID 03) e fica disponível no catálogo global para outros produtos. Depois de criada, ajuste executor e especialidade; as horas ficam exclusivamente nas etapas.</p>
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

// Especialidade da etapa: só as cadastradas (não existe mais "usa a da tarefa"), filtradas pelo executor e com busca.
const SpecialtySelect = ({ refs, value, onChange, mode }: any) => (
  <SpecialtyCombobox specialties={refs?.specialties ?? []} mode={mode} value={value} onChange={onChange} />
);

// Tipos de evidência que a etapa pode exigir (igual à lista do servidor).
const EVIDENCE_TYPE_OPTIONS: [string, string][] = [["print", "Print da tela"], ["arquivo", "Arquivo anexo"], ["pdf", "PDF"], ["relatorio", "Relatório"], ["link", "Link"], ["texto", "Texto / descrição"]];

function TaskField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex min-w-[8.5rem] flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"><span>{label}</span>{children}</label>;
}

function TaskSetupGuide({ task, onClose }: { task: any; onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const steps = [
    { title: "Nome da tarefa", text: "Use o resultado que será entregue, não um nome técnico. Exemplo: Gestão mensal de campanhas. A tarefa agrupa as etapas abaixo." },
    { title: "Resumo calculado", text: "Etapas, horas, prazo e custo neste resumo não são digitados na tarefa. Eles são atualizados automaticamente pela soma e pelo fluxo das etapas." },
    { title: "Execução por etapa", text: "Mantenha ligada quando cada etapa precisa ser conferida antes de liberar a próxima. É a melhor opção para testar liberações, aprovações e dependências." },
    { title: "Etapas da tarefa", text: "Cada etapa representa uma ação concreta. Cadastre nome, quem executa, especialidade e horas. A primeira pode liberar duas em paralelo; outra pode depender das duas." },
    { title: "Entregáveis e fluxo", text: "Use um entregável quando houver algo verificável. Depois configure o fluxo para decidir quais etapas começam juntas, quais aguardam outra e quais dependem de acessos." },
  ];
  const item = steps[current];
  return <aside className="mt-2 rounded-xl border border-violet-200 bg-violet-50/80 p-3" data-testid="task-setup-guide"><div className="flex items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-sm font-bold text-violet-950"><Lightbulb className="h-4 w-4 text-violet-700" />Ajudante da tarefa</p><p className="mt-0.5 text-[11px] text-violet-700">{task.name} · passo {current + 1} de {steps.length}</p></div><button type="button" aria-label="Fechar ajudante da tarefa" onClick={onClose} className="rounded-md p-1 text-violet-700 hover:bg-violet-100"><X className="h-4 w-4" /></button></div><div className="mt-2 flex gap-1" aria-hidden="true">{steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= current ? "bg-violet-600" : "bg-violet-200"}`} />)}</div><h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-700">{item.text}</p><div className="mt-3 flex justify-between"><Button type="button" size="sm" variant="outline" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>Anterior</Button>{current === steps.length - 1 ? <Button type="button" size="sm" onClick={onClose}>Terminar ajuda</Button> : <Button type="button" size="sm" onClick={() => setCurrent((value) => value + 1)}>Próximo<ChevronRight className="h-4 w-4" /></Button>}</div></aside>;
}

function StepSetupGuide({ guide, onGo, onClose }: { guide: number; onGo: (step: number) => void; onClose: () => void }) {
  const steps = [
    { title: "Nome e descrição", text: "Dê um nome que deixe claro a ação. Na descrição, escreva o que acontece aqui e o resultado esperado." },
    { title: "Quem faz e horas", text: "Escolha quem executa, a especialidade e as horas estimadas. Essas horas entram no esforço e no custo calculado da tarefa." },
    { title: "Conclusão e liberação", text: "Defina o critério que prova que a etapa terminou. Configure qualificação quando alguém precisa conferir antes de liberar o próximo passo." },
    { title: "Instruções e evidências", text: "Inclua somente orientações úteis para a execução. Peça evidência quando for necessário comprovar que a ação aconteceu." },
    { title: "Entregáveis", text: "Cadastre algo que será entregue ou aprovado: por exemplo, um plano, relatório, arquivo ou link. Se não houver entregável, informe isso no próprio bloco." },
    { title: "Conexões e acessos", text: "Ative apenas quando esta etapa depende de login, permissão ou integração. Um acesso aqui deve bloquear só as etapas que realmente dependem dele." },
    { title: "Resumo e salvar", text: "Revise as pendências. Salvar rascunho guarda o que já foi feito sem liberar a etapa; concluir e salvar só é usado quando os campos obrigatórios estiverem completos." },
  ];
  const current = Math.max(1, Math.min(guide, steps.length));
  const item = steps[current - 1];
  return <aside className="mx-4 mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3" data-testid="step-setup-guide"><div className="flex items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-sm font-bold text-sky-950"><Lightbulb className="h-4 w-4 text-sky-700" />Ajudante da etapa</p><p className="mt-0.5 text-[11px] text-sky-700">Passo {current} de {steps.length} · o bloco indicado foi aberto para você.</p></div><button type="button" aria-label="Fechar ajudante da etapa" onClick={onClose} className="rounded-md p-1 text-sky-700 hover:bg-sky-100"><X className="h-4 w-4" /></button></div><div className="mt-2 flex gap-1" aria-hidden="true">{steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < current ? "bg-sky-500" : "bg-sky-200"}`} />)}</div><h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-700">{item.text}</p><div className="mt-3 flex justify-between"><Button type="button" size="sm" variant="outline" disabled={current === 1} onClick={() => onGo(current - 1)}>Anterior</Button>{current === steps.length ? <Button type="button" size="sm" onClick={onClose}>Terminar ajuda</Button> : <Button type="button" size="sm" onClick={() => onGo(current + 1)}>Próximo campo<ChevronRight className="h-4 w-4" /></Button>}</div></aside>;
}

export function StepRow({ step, index, steps, taskId, readOnly, act, refs, task, version, parallelWith = [] }: any) {
  // Não é lembrado no F5: o texto digitado se perderia e a etapa voltaria "presa" no formulário. A etapa sempre abre na ficha de leitura.
  const [editing, setEditing] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  // Cada etapa é um acordeão: vem FECHADA (clicou abre, clicou fecha) e o lápis de editar fica sempre no cabeçalho.
  // Mover para cima/baixo sempre pergunta antes.
  // "Ver" abre a Janela Moldura com os detalhes da etapa (sem acordeão); não é lembrado entre aberturas.
  const [open, setOpenRaw] = useState(false);
  // Depois de "Concluir e salvar etapa" a janela de leitura abre como confirmação: banner verde + botão "Concluir" que volta para a lista de etapas.
  const [justSaved, setJustSaved] = useState(false);
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => { setOpenRaw(v); if (v === false) setJustSaved(false); };
  const [moveAsk, setMoveAsk] = useState<null | -1 | 1>(null);
  const [viewModel, setViewModel] = useState(false);
  const [scopeAsk, setScopeAsk] = useState(false);
  const [checklistOpen, setChecklistOpen] = usePersistedFlag(`step-checklist:${step.id}`, false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  // Rascunho da etapa (18/10): blocos em acordeão, erros sem perder nada, acessos em rascunho da tela, confirmação ao fechar.
  const narrow = useIsNarrow();
  // Os 5 blocos vêm FECHADOS ao clicar em Editar; o que o usuário abrir/fechar é lembrado nesta aba (sobrevive ao F5).
  const blockFlag = (n: number) => `step-block:${step.id}:${n}`;
  const blocks = useBlocks(BLOCK_IDS.filter((n) => readOpen(blockFlag(n), false)), narrow, (openNow) => { for (const n of BLOCK_IDS) writeOpen(blockFlag(n), openNow.includes(n)); });
  /** Bloco "atual" do passo-a-passo (Anterior / Próximo); 7 = resumo final. */
  const [guide, setGuide] = useState<number>(1);
  const [helperOpen, setHelperOpen] = useState(false);
  const editFlag = `step-editing:${step.id}`;
  const editRestored = useRef(false);
  const editPrev = useRef(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState<null | "draft" | "final">(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [closeAsk, setCloseAsk] = useState(false);
  const [accessItems, setAccessItems] = useState<AccessItem[]>([]);
  const [accessOn, setAccessOn] = useState(false);
  // Entregáveis desta etapa: também ficam em rascunho da tela e só são gravados ao salvar a etapa (ver StepDeliverablesEditor).
  const [delivItems, setDelivItems] = useState<DelivItem[]>([]);
  const baseline = useRef<{ f: string; on: boolean }>({ f: "", on: false });
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [leaders, setLeaders] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [specialists, setSpecialists] = useState<{ id: string; name: string; kind: string }[]>([]);
  useEffect(() => {
    if (!editing || specialists.length > 0) return;
    Promise.resolve(apiClient.getCatalog2Specialists?.()).then((r: any) => setSpecialists(r?.data ?? [])).catch(() => {});
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!editing || leaders.length > 0) return;
    apiClient.getCatalog2Qualifiers().then((r) => setLeaders(r.data.filter((u) => u.kind === "lider"))).catch(() => {});
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const initial = () => ({ name: step.name, estimated_hours: step.estimated_minutes == null ? "" : String(step.estimated_minutes / 60), specialty_id: step.specialty_id ?? "", purpose: step.purpose ?? "execucao", execution_mode: step.execution_mode ?? "humano", completion_criteria: step.completion_criteria ?? "", first_execution_only: !!step.first_execution_only, skip_when_same_executor: !!step.skip_when_same_executor, is_conditional: !!step.is_conditional, description: step.description ?? "", ops: (step.ops ?? {}) as any, executor_kind: step.executor_kind ?? "nomad", leader_mode: step.leader_mode ?? "auto", leader_user_id: step.leader_user_id ?? "", internal_step: !!step.internal_step, requires_qualification: step.requires_qualification !== false, release_next_auto: step.release_next_auto !== false, requires_specialist_qualification: !!step.requires_specialist_qualification, specialist_user_id: step.specialist_user_id ?? "", approval_hours: step.approval_hours == null ? "" : String(step.approval_hours), rework_hours: step.rework_hours == null ? "" : String(step.rework_hours), executor_accept_hours: step.executor_accept_hours == null ? "" : String(step.executor_accept_hours), ai_free_changes: step.ai_free_changes == null ? "" : String(step.ai_free_changes), ai_specialty_id: step.ai_specialty_id ?? "", ai_estimated_hours: step.ai_estimated_minutes == null ? "" : String(step.ai_estimated_minutes / 60), ai_prompt: String(step.ops?.ai_prompt ?? ""), qual_on: step.requires_qualification !== false || !!step.requires_specialist_qualification, qualifier_kind: (step.qualifier_kind && step.qualifier_kind !== "leader" ? step.qualifier_kind : step.requires_specialist_qualification ? (step.requires_qualification !== false ? "leader_person" : "person") : "leader") as string });
  const [f, setF] = useState(initial);
  const aiBad = f.ai_free_changes.trim() !== "" && !(/^\d+$/.test(f.ai_free_changes.trim()) && Number(f.ai_free_changes.trim()) <= 100);
  const specName = (refs?.specialties ?? []).find((sp: any) => sp.id === (step.specialty_id ?? task?.specialty?.id))?.name;
  const hoursOf = (v: string): number | null | "bad" => { const t = String(v ?? "").trim(); if (t === "") return null; const n = Number(t); return Number.isInteger(n) && n >= 1 ? n : "bad"; };
  const hoursBad = [f.approval_hours, f.rework_hours, f.executor_accept_hours].some((v) => hoursOf(v) === "bad");
  // Qualificação (reunião 14/10): liga/desliga por etapa + quem qualifica (líder, pessoa específica, líder e depois a pessoa,
  // nômades qualificadores). Etapa com IA (ou humano ou IA) SEMPRE tem qualificação ligada.
  // "Humano ou IA": a chave vale para a opção HUMANA (pode ser desligada); a opção IA sempre é qualificada (configuração própria abaixo).
  const qualOn = f.execution_mode === "ia" ? true : !!f.qual_on;
  const qualAny = f.execution_mode !== "humano" || qualOn; // alguma opção qualifica (vale para o checklist de conferência)
  const qualPayload = () => {
    const k = f.qualifier_kind as string;
    const person = qualOn && (k === "person" || k === "leader_person");
    return {
      requires_qualification: qualOn && k !== "person",
      requires_specialist_qualification: person,
      specialist_user_id: person ? f.specialist_user_id || null : null,
      qualifier_kind: qualOn ? k : "leader",
      release_next_auto: true,
    };
  };
  // Troca do "Quem executa": leva a especialidade/horas para o lugar certo (humana ↔ opção IA) em vez de perdê-las.
  const changeMode = (mode: string) => {
    const cur = (refs?.specialties ?? []).find((x: any) => x.id === f.specialty_id);
    const next: any = { ...f, execution_mode: mode };
    if (mode === "hibrido") {
      if (cur && specialtyKind(cur) === "ia") { next.ai_specialty_id = cur.id; next.specialty_id = ""; if (f.ai_estimated_hours === "") { next.ai_estimated_hours = f.estimated_hours; next.estimated_hours = ""; } }
      else if (cur && specialtyKind(cur) === "hibrido") next.specialty_id = "";
    } else {
      next.specialty_id = keepSpecialtyForMode(refs?.specialties, f.specialty_id, mode);
      if (f.execution_mode === "hibrido" && mode === "ia" && f.ai_specialty_id) { next.specialty_id = f.ai_specialty_id; if (f.ai_estimated_hours !== "") next.estimated_hours = f.ai_estimated_hours; }
    }
    setF(enforceApprover(next));
  };
  const payload = () => ({ ai_specialty_id: f.execution_mode === "hibrido" ? f.ai_specialty_id || null : null, ai_estimated_minutes: f.execution_mode === "hibrido" && f.ai_estimated_hours !== "" ? Math.round(Number(f.ai_estimated_hours) * 60) : null, ai_free_changes: f.ai_free_changes.trim() === "" || aiBad ? null : Number(f.ai_free_changes.trim()), approval_hours: hoursOf(f.approval_hours) === "bad" ? null : hoursOf(f.approval_hours), rework_hours: hoursOf(f.rework_hours) === "bad" ? null : hoursOf(f.rework_hours), executor_accept_hours: step.executor_policy === "prefer_same_as_step" ? (hoursOf(f.executor_accept_hours) === "bad" ? null : hoursOf(f.executor_accept_hours)) : (step.executor_accept_hours ?? null), name: f.name, estimated_minutes: f.estimated_hours === "" ? null : Math.round(Number(f.estimated_hours) * 60), specialty_id: f.specialty_id || null, purpose: f.purpose, execution_mode: f.execution_mode, completion_criteria: f.completion_criteria.trim() ? f.completion_criteria : null, first_execution_only: f.first_execution_only, skip_when_same_executor: f.skip_when_same_executor, is_conditional: f.is_conditional, description: f.description.trim() ? f.description : null, ops: f.ops, executor_kind: f.executor_kind, leader_mode: f.executor_kind === "leader" ? f.leader_mode : "auto", leader_user_id: f.executor_kind === "leader" && f.leader_mode === "specific" ? f.leader_user_id || null : null, internal_step: f.internal_step, ...qualPayload() });
  const stepReqs = () => ((version?.connection_requirements ?? []) as any[]).filter((r) => r.when_task_key === task?.key && r.when_step_key === step.key);
  /** Abre o painel com os valores salvos agora. Os acessos viram uma lista de RASCUNHO da tela (o servidor só muda ao salvar a etapa). */
  /** `restore`: voltando do F5 — mantém os blocos como estavam; num clique em Editar, começa com todos fechados. */
  const openEditor = (restore = false) => {
    if (restore !== true) blocks.collapseAll();
    const items = itemsFromRequirements(stepReqs());
    const keys: string[] = Array.isArray(step.ops?.access_keys) ? step.ops.access_keys : [];
    const borrowed = ((version?.connection_requirements ?? []) as any[]).some((r) => !r.draft_incomplete && r.when_step_key && r.when_step_key !== step.key && r.shared_with_steps && keys.includes(r.key));
    const on = items.length > 0 || borrowed;
    const fresh = initial();
    setF(fresh); setAccessItems(items); setAccessOn(on); setDelivItems(itemsFromTask(task?.deliverables ?? [], step.id)); setGuide(1);
    setShowErrors(false); setFormError(null); setDraftNote(null); setCloseAsk(false);
    baseline.current = { f: JSON.stringify(fresh), on };
    setEditing(true);
  };
  // F5 / Ctrl+R: se o painel desta etapa estava aberto, abre de novo (o texto ainda não salvo não volta: por isso o navegador avisa antes de recarregar).
  // (a página volta travada por um instante no F5: espera destravar para reabrir, uma única vez)
  useEffect(() => { if (editRestored.current || readOnly) return; editRestored.current = true; if (readOpen(editFlag, false)) openEditor(true); }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sem modo de edição (só leitura), o retorno ao preço acontece quando a janela "Ver" da etapa fecha.
  const openPrev = useRef(false);
  useEffect(() => { const was = openPrev.current; openPrev.current = open; if (was && !open && !editing && priceReturn.stepId === step.id) { priceReturn.stepId = null; window.dispatchEvent(new Event(RETURN_TO_PRICE_EVENT)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (editing === editPrev.current) return; const was = editPrev.current; editPrev.current = editing; writeOpen(editFlag, editing); if (was && !editing && priceReturn.stepId === step.id) { priceReturn.stepId = null; window.dispatchEvent(new Event(RETURN_TO_PRICE_EVENT)); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Ir para a etapa" (vindo do resumo de entregáveis da tarefa): abre o editor desta etapa.
  const liRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent).detail?.stepId !== step.id) return;
      if (readOnly) { setOpen(true); window.setTimeout(() => flashElement(liRef.current), 60); return; }
      if (!editing) openEditor();
      const blk = Number((e as CustomEvent).detail?.block);
      if (blk >= 1 && blk <= 6) [300, 900, 1600].forEach((ms) => window.setTimeout(() => blocks.reveal(blk as StepBlockId), ms));
    };
    window.addEventListener(OPEN_STEP_EVENT, on);
    return () => window.removeEventListener(OPEN_STEP_EVENT, on);
  });
  useEffect(() => { if (pendingOpenStep.id === step.id) { const block = pendingOpenStep.block; pendingOpenStep.id = null; pendingOpenStep.block = undefined; window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: step.id, block } })), 80); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Acessos de outras etapas que esta escolheu usar também valem: a etapa não fica "sem acesso".
  const ownAccessKeys = new Set(accessItems.map((i) => i.key).filter(Boolean) as string[]);
  const borrowedAccessCount = (Array.isArray(f.ops?.access_keys) ? (f.ops.access_keys as string[]) : []).filter((k) => !ownAccessKeys.has(k)).length;
  const accIssues = accessIssues(accessItems, accessOn, borrowedAccessCount);
  const delivNone = !!f.ops?.no_deliverables;
  const delivIss = delivIssues(delivItems, delivNone);
  const approvableNames = delivNone ? [] : activeDeliv(delivItems).filter((i) => i.fields.requires_approval).map((i) => i.fields.name.trim() || "(sem nome)");
  const issues: StepIssue[] = stepIssues(f as any, { taskSpecialtyId: task?.specialty?.id ?? null, stageExecution: task?.stage_execution === "stage", acceptHoursApplies: step.executor_policy === "prefer_same_as_step", accessIssues: accIssues, deliverableIssues: delivIss, approvableDeliverables: approvableNames.length, approvalDeliverables: approvableNames.length });
  const dirty = editing && (JSON.stringify(f) !== baseline.current.f || accessOn !== baseline.current.on || hasPending(accessItems) || hasDelivPending(delivItems));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const goToIssue = (it: StepIssue | null) => {
    if (!it) return;
    blocks.reveal(it.block as StepBlockId);
    window.setTimeout(() => {
      const root = modalRef.current; if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-field="${it.field}"]`);
      if (!el) return;
      el.scrollIntoView?.({ block: "center", behavior: "smooth" });
      const target = el.matches("input,select,textarea,button") ? el : el.querySelector<HTMLElement>("input,select,textarea,button,[tabindex]");
      target?.focus?.({ preventScroll: true });
    }, 60);
  };
  /**
   * Grava a etapa. "draft" = Salvar rascunho da etapa (aceita tudo incompleto, marca como rascunho incompleto, nunca altera o modelo global, a tela continua aberta).
   * "final" = Concluir e salvar etapa (o chamador já validou; tira a marca de rascunho e fecha a tela). Em erro: a tela NÃO fecha e nada é apagado.
   */
  const commitStep = async (mode: "draft" | "final", scope?: ModelScope) => {
    setFormError(null); setSaving(mode);
    try {
      const stepScope = { task: { key: task?.key ?? "", name: task?.name ?? "" }, step: { key: step.key, name: step.name } };
      let newOps: any = f.ops;
      await act(async () => {
        const ownKeys = new Set(accessItems.map((i) => i.key).filter(Boolean) as string[]);
        const keysNow: string[] = Array.isArray(f.ops?.access_keys) ? f.ops.access_keys : [];
        const borrowedKeys = keysNow.filter((k) => !ownKeys.has(k));
        const c = await commitAccessItems(accessItems, { version, scope: stepScope, draft: mode === "draft", turnedOff: !accessOn, borrowedKeys, onProgress: setAccessItems });
        setAccessItems(c.items);
        newOps = opsAfterAccesses(f.ops, { ownKeys: c.ownKeys, borrowedKeys, turnedOff: !accessOn, parked: c.parked });
        // Entregáveis desta etapa: mesmo registro de sempre, gravado pelas rotas oficiais antes de a etapa ser salva.
        // Ao CONCLUIR, entregável antigo marcado como rascunho que hoje está completo é regravado sem a marca de rascunho.
        const staleDrafts = mode === "final" ? delivItems.filter(isStaleDraft) : [];
        if (hasDelivPending(delivItems) || staleDrafts.length > 0) {
          // Salvar como rascunho aceita entregável incompleto: ele vai marcado como rascunho (nunca é descartado nem inventado).
          const toSave = mode === "draft" ? delivItems.map((i) => (deliverableIssues(i.fields).length ? { ...i, draft: true } : i)) : delivItems.map((i) => (isStaleDraft(i) ? { ...i, draft: false, state: i.state === "saved" ? ("edited" as const) : i.state } : i));
          const order = [...(task?.deliverables ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((d: any) => d.id as string);
          const dc = await commitDelivItems(toSave, { taskId: task.id, stepId: step.id, taskDeliverableIds: order, onProgress: setDelivItems });
          setDelivItems(dc.items);
        }
        return apiClient.updateCatalog2Step(step.id, { ...payload(), ops: newOps, draft: mode === "draft", ...(mode === "draft" ? { scope: "product" } : scope ? { scope } : {}), ...(mode === "final" && scope === "model" ? { confirm_model_update: true } : {}) });
      }, mode === "draft" ? "Rascunho da etapa salvo." : "Etapa concluída e salva.", { rethrow: true });
      setF((cur) => ({ ...cur, ops: newOps }));
      baseline.current = { f: JSON.stringify({ ...f, ops: newOps }), on: accessOn };
      if (mode === "final") { setShowErrors(false); setEditing(false); setJustSaved(true); setOpen(true); /* volta para a janela "Ver" já com os dados atualizados */ }
      else setDraftNote(`Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Você pode fechar e continuar depois do mesmo ponto.`);
    } catch (e: any) {
      setFormError(e?.message ?? "Não foi possível salvar a etapa. Nada do que você preencheu foi apagado.");
      throw e;
    } finally { setSaving(null); }
  };
  const concludeClick = () => {
    if (issues.length > 0) {
      setShowErrors(true); setDraftNote(null);
      const withIssues = Array.from(new Set(issues.map((i) => i.block)));
      // Modo lista: abre todos os blocos com pendência. Modo janela: abre o primeiro (os outros mostram "Com erro" no cartão).
      if (!narrow && blocks.list) withIssues.forEach((b) => blocks.reveal(b as StepBlockId));
      goToIssue(firstIssue(issues));
      return;
    }
    if (step.step_model_id != null) {
      // Modelo usado só por esta etapa (ex.: etapa recém-criada): editar o modelo não afeta ninguém, então não pergunta.
      void Promise.resolve(apiClient.getCatalog2ModelImpact?.("step", step.step_model_id)).then((r: any) => {
        if (typeof r?.instances === "number" && r.instances <= 1) void commitStep("final", "model").catch(() => {});
        else setScopeAsk(true);
      }).catch(() => setScopeAsk(true));
      return;
    }
    void commitStep("final").catch(() => {});
  };
  const discardAll = () => { setF(initial()); setAccessItems([]); setDelivItems([]); setCloseAsk(false); setEditing(false); };
  const requestClose = () => { if (saving) return; if (dirty) setCloseAsk(true); else setEditing(false); };
  // Registra a etapa aberta no editor: "Salvar rascunho"/"Travar edição" sabem se há alteração não salva aqui.
  const registerOpenForm = useContext(FormsCtx);
  const inModels = useContext(ModelEditCtx).embedded;
  const formApi = useRef<{ label: string; isDirty: () => boolean; save: () => Promise<void>; discard: () => void }>({ label: "", isDirty: () => false, save: async () => {}, discard: () => {} });
  formApi.current = {
    label: `Etapa ${index + 1} — ${step.name}`,
    isDirty: () => dirty,
    // O "Salvar rascunho" da página grava esta etapa SÓ NESTE PRODUTO (nunca mexe no modelo global): completa = concluída; incompleta = rascunho incompleto.
    save: async () => { await commitStep(issues.length === 0 ? "final" : "draft", "product"); },
    discard: () => discardAll(),
  };
  useEffect(() => {
    if (!editing) return;
    const api: OpenFormApi = {
      get label() { return formApi.current.label; },
      isDirty: () => formApi.current.isDirty(),
      save: () => formApi.current.save(),
      discard: () => formApi.current.discard(),
    };
    return registerOpenForm(`step:${step.id}`, api);
  }, [editing, step.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Edição travada (ou versão publicada): a etapa nunca fica com o formulário aberto.
  useEffect(() => { if (readOnly && editing) { setF(initial()); setEditing(false); } }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edição em MODAL (17/10): na página só fica a etapa pronta; "Editar" abre o modal com o formulário completo.
  let editModal: React.ReactNode = null;
  if (editing) {
    const draftCost = (() => { const h = Number(f.estimated_hours); const sp = (refs?.specialties ?? []).find((x: any) => x.id === (f.specialty_id || task?.specialty?.id)); return f.estimated_hours !== "" && h > 0 && sp?.max_hourly_rate != null ? (h * Number(sp.max_hourly_rate)) : null; })();
    // Etapa "Humano ou IA": custo da opção IA (horas da IA × valor/hora da especialidade de IA).
    const draftAiCost = (() => { const h = Number(f.ai_estimated_hours); const sp = (refs?.specialties ?? []).find((x: any) => x.id === f.ai_specialty_id); return f.ai_estimated_hours !== "" && h > 0 && sp?.max_hourly_rate != null ? (h * Number(sp.max_hourly_rate)) : null; })();
    const draftChecklist: ChecklistItem[] = (f.ops?.checklist as ChecklistItem[] | undefined) ?? [];
    const draftChecklistN = checklistCount(draftChecklist);
    const setOps = (patch: Record<string, unknown>) => setF({ ...f, ops: { ...(f.ops ?? {}), ...patch } });
    // Acessos da etapa: tudo fica em RASCUNHO DA TELA e só é gravado ao salvar a etapa (ver StepAccessesEditor).
    const err = (field: string): string | null => (showErrors ? issues.find((i) => i.field === field)?.message ?? null : null);
    const delivAct = activeDeliv(delivItems);
    // Situação REAL de cada bloco (completo / incompleto com a quantidade de pendências / não se aplica), nunca escondida no selo geral.
    const infos = Object.fromEntries(BLOCK_IDS.map((n) => [n, blockInfo(n, issues, showErrors, n === 4 ? { hasContent: draftChecklistN > 0 || !!f.ops?.instructions || !!f.ops?.evidence_required } : n === 5 ? { applies: !delivNone || delivAct.length > 0, hasContent: delivAct.length > 0 } : n === 6 ? { applies: accessOn } : {})])) as Record<StepBlockId, BlockInfo>;
    const bp = (n: StepBlockId) => ({ status: infos[n].status, count: infos[n].count, onGo: (t: StepBlockId) => blocks.reveal(t), inline: blocks.list, onSaveDraft: () => { setDraftNote(null); void commitStep("draft").catch(() => {}); }, savingDraft: saving === "draft", draftNote });
    const approvalMode = effectiveMode(f.ops, !!f.internal_step);
    const stageOn = task?.stage_execution === "stage";
    const approvalLine = !stageOn ? "Não se aplica: a tarefa não executa por etapa (a aprovação acontece no fim da tarefa)." : f.internal_step ? "Etapa interna: o cliente não vê nem aprova." : `${MODE_LABEL[approvalMode]}${approvalMode === "deliverables" ? ` (${approvableNames.length ? approvableNames.join(", ") : "nenhum entregável marcado"})` : ""}${approvalMode === "step" || approvalMode === "deliverables" ? ` · prazo do cliente: ${f.approval_hours.trim() ? `${f.approval_hours} h úteis` : "padrão da plataforma"}` : ""}`;
    const hasNext = index < (steps?.length ?? 0) - 1;
    const releaseLine = (stageOn && !f.internal_step && (approvalMode === "step" || approvalMode === "deliverables")) ? (hasNext ? "Liberada só depois da aprovação do cliente." : "Última etapa: a tarefa só encerra depois da aprovação do cliente.") : qualOn && stageOn ? (hasNext ? "Liberada depois da qualificação desta etapa." : "Última etapa da tarefa.") : (hasNext ? (stageOn ? "Liberada assim que esta etapa for concluída." : "Segue o fluxo da tarefa (qualificação e aprovação no fim da tarefa).") : "Última etapa da tarefa.");
    const accessLine = !accessOn ? "Esta etapa não precisa de acesso." : activeItems(accessItems).length === 0 ? "Nenhum acesso configurado ainda." : activeItems(accessItems).map((a) => accessName(a)).join(" · ");
    const goStep = (n: number) => {
      setGuide(n);
      if (n <= 6) blocks.reveal(n as StepBlockId);
      window.setTimeout(() => { const el = modalRef.current?.querySelector<HTMLElement>(n <= 6 ? `[data-testid="step-block-${n}"]` : '[data-testid="step-final-summary"]'); el?.scrollIntoView?.({ block: "start", behavior: "smooth" }); }, 60);
    };
    const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n).trim()}…` : t);
    const specLabel = (id: string) => (refs?.specialties ?? []).find((x: any) => x.id === (id || task?.specialty?.id))?.name ?? "sem especialidade";
    const hoursLabel = (h: string) => (h.trim() !== "" && Number(h) > 0 ? `${h} h` : "sem horas");
    const receiverLabel = f.executor_kind === "leader" ? "Líder" : f.executor_kind === "internal" ? "Equipe interna" : "Nômade";
    const sum1 = `${f.name.trim() || "(sem nome)"}${f.description.trim() ? ` — ${clip(f.description.trim(), 90)}` : ""}`;
    const sum2 = `${EXEC_LABEL[f.execution_mode] ?? f.execution_mode} · ${specLabel(f.specialty_id)} · ${hoursLabel(f.estimated_hours)}${f.execution_mode === "hibrido" ? ` · IA: ${specLabel(f.ai_specialty_id)} · ${hoursLabel(f.ai_estimated_hours)}` : ""} · recebe: ${receiverLabel}`;
    const sum3 = `Conclui quando: ${f.completion_criteria.trim() ? clip(f.completion_criteria.trim(), 70) : "não informado"}${f.first_execution_only ? " · só na 1ª execução" : ""}${f.is_conditional ? " · depende de variação/adicional" : ""}${f.skip_when_same_executor ? " · dispensável" : ""} · qualificação: ${qualOn ? "sim" : "não"}`;
    const sum4 = `${draftChecklistN} ${draftChecklistN === 1 ? "item" : "itens"} de checklist · orientações ${f.ops?.instructions ? "preenchidas" : "vazias"} · evidência ${f.ops?.evidence_required ? "obrigatória" : "não exigida"}`;
    const sum5 = delivNone ? "Esta etapa não tem entregáveis" : delivAct.length === 0 ? "Nenhum entregável ainda" : `${delivAct.length} entregável${delivAct.length === 1 ? "" : "is"}: ${clip(delivAct.map((i) => i.fields.name.trim() || "(sem nome)").join(", "), 80)}${delivIss.length ? ` · ${delivIss.length} incompleto${delivIss.length === 1 ? "" : "s"}` : ""}`;
    const sum6 = !accessOn ?"Esta etapa não precisa de acesso" : `${configuredCount(accessItems)} acesso${configuredCount(accessItems) === 1 ? "" : "s"} configurado${configuredCount(accessItems) === 1 ? "" : "s"}${incompleteCount(accessItems) ? ` · ${incompleteCount(accessItems)} incompleto${incompleteCount(accessItems) === 1 ? "" : "s"}` : ""}`;
    // Formulário COMPACTO: campos baixos (h-8), espaçamentos curtos e cabeçalho fixo com o custo, para enxergar tudo ao configurar.
    const CTL = "h-9 w-full min-w-0 max-w-full truncate rounded-md border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900";
    editModal = (
      <FramedPanel open onOpenChange={(o) => { if (!o) requestClose(); }} testId="step-edit-panel" title="Editar etapa">
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="relative rounded-xl [&_label>span:first-child]:text-xs [&_label>span:first-child]:font-semibold [&_label>span:first-child]:text-slate-600" data-testid="step-edit-form" ref={modalRef}>
        <fieldset disabled={readOnly} className="contents">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-sky-500 px-2 text-sm font-bold text-white">{index + 1}</span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Editar etapa {index + 1}</span>
              <span className="block truncate text-base font-bold leading-tight text-slate-900 dark:text-slate-100">{f.name || step.name}</span>
            </span>
          </div>
          {f.execution_mode === "hibrido" ? (
            // Humano ou IA: os DOIS custos aparecem sempre, lado a lado.
            <span className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="step-header-costs">
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">Custo estimado com humano: <strong>{draftCost == null ? "a definir" : brl2(draftCost)}</strong></span>
              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">Custo estimado com IA: <strong>{draftAiCost == null ? "a definir" : brl2(draftAiCost)}</strong></span>
            </span>
          ) : (
            <span className="text-xs text-slate-500">{draftCost == null ? "Custo estimado desta etapa: a definir" : <>Custo estimado desta etapa: <strong className="text-slate-800 dark:text-slate-100">{brl2(draftCost)}</strong></>}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3" data-testid="step-modal-toolbar">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {step.draft_incomplete && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800" data-testid="step-draft-badge">Rascunho incompleto</span>}
            {/* Pendências REAIS de todos os blocos, consolidadas aqui (nunca escondidas): clicar leva ao primeiro campo que falta. */}
            {issues.length > 0
              ? <button type="button" onClick={() => goToIssue(firstIssue(issues))} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200" data-testid="step-pending-chip" title="Clique para ir ao primeiro campo que falta">{issues.length} {issues.length === 1 ? "pendência" : "pendências"} para concluir</button>
              : <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800" data-testid="step-pending-chip">Rascunho pronto para concluir</span>}
            {draftNote && <span role="status" className="text-[11px] font-semibold text-emerald-700" data-testid="step-draft-note">{draftNote}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {SHOW_HELPER_BUTTON && <button type="button" onClick={() => setHelperOpen((value) => !value)} className="inline-flex h-8 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"><Lightbulb className="h-3.5 w-3.5" />Ajudante</button>}
            <button type="button" onClick={blocks.expandAll} title="Mostra todos os blocos um embaixo do outro, na própria página" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Expandir todos</button>
            <button type="button" onClick={blocks.collapseAll} title="Volta para os cartões; cada um abre numa janela" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Recolher todos</button>
          </div>
        </div>
        {showErrors && issues.length > 0 && (
          <div role="alert" className="mx-4 mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100" data-testid="step-error-summary">
            <p className="font-bold">A etapa ainda não pode ser concluída ({issues.length} {issues.length === 1 ? "pendência" : "pendências"}). Nada do que você preencheu foi apagado.</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {issues.map((it, i) => <li key={`${it.field}-${i}`}><button type="button" className="text-left underline decoration-dotted hover:text-rose-700" onClick={() => goToIssue(it)}>{it.message}</button></li>)}
            </ul>
            <p className="mt-1.5">Corrija e clique em “Concluir e salvar etapa”, ou use “Salvar rascunho da etapa” para guardar assim mesmo e continuar depois.</p>
          </div>
        )}
        {formError && <p role="alert" className="mx-4 mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100" data-testid="step-save-error">Não foi possível salvar: {formError} Nada do que você preencheu foi apagado.</p>}
        {helperOpen && <StepSetupGuide guide={guide} onGo={goStep} onClose={() => setHelperOpen(false)} />}
        {/* Uma coluna só, 100% da largura: os 5 blocos empilhados (acordeões), nunca lado a lado. */}
        <div className="flex flex-col gap-3 p-4">
          {/* 1 · O que é esta etapa */}
          <StepBlock n={1} title="O que é esta etapa" {...bp(1)} summary={sum1} open={blocks.open.has(1)} onToggle={() => blocks.toggle(1)}>
            {/* Nome e descrição lado a lado: o nome é curto, a descrição ocupa o resto. */}
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
              <Field field="name" error={err("name")} label="Nome da etapa"><input className={CTL} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field field="description" error={err("description")} label={<span className="inline-flex items-center gap-2">Descrição (o que acontece nesta etapa)<AiFieldButton compact label="Descrição (o que acontece nesta etapa)" value={f.description} context={{ name: f.name, other_fields: { "Tarefa": String(task?.name ?? ""), "Critério de conclusão": f.completion_criteria } }} disabled={readOnly} fieldMaxChars={8000} onResult={(v) => setF({ ...f, description: v })} /></span>}><Textarea rows={1} maxLength={8000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-[32px] py-1.5 text-[13px]" /></Field>
            </div>
          </StepBlock>
          {/* 2 · Quem faz e quanto tempo leva */}
          <StepBlock n={2} title="Quem faz e quanto tempo leva" {...bp(2)} summary={sum2} open={blocks.open.has(2)} onToggle={() => blocks.toggle(2)}>
            {/* Primeiro: quem recebe a etapa. Líder / equipe interna → sem especialidade e sem custo no produto. */}
            <div className="grid grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-2" data-testid="step-receiver">
              <Field label="Quem recebe a etapa">
                <select className={CTL} aria-label="Quem recebe a etapa" value={f.executor_kind} onChange={(e) => setF({ ...f, executor_kind: e.target.value, ...(e.target.value !== "leader" ? { leader_mode: "auto", leader_user_id: "" } : {}) })}>
                  <option value="nomad">Nômade da plataforma (oferta e rodízio)</option>
                  <option value="leader">Líder</option>
                  <option value="internal">Equipe interna</option>
                </select>
              </Field>
              {f.executor_kind === "leader" ? (
                <Field field="leader" error={err("leader")} label="Qual líder">
                  <select className={CTL} aria-label="Qual líder" value={f.leader_mode === "specific" ? f.leader_user_id : "__auto"} onChange={(e) => setF({ ...f, leader_mode: e.target.value === "__auto" ? "auto" : "specific", leader_user_id: e.target.value === "__auto" ? "" : e.target.value })}>
                    <option value="__auto">Qualquer líder da área (o com menos tarefas abertas)</option>
                    {f.leader_mode === "specific" && f.leader_user_id && !leaders.some(u => u.id === f.leader_user_id) && <option value={f.leader_user_id} disabled>Líder específico indisponível — escolha outro responsável</option>}
                    {leaders.map((u) => <option key={u.id} value={u.id}>Sempre {u.name}</option>)}
                  </select>
                </Field>
              ) : <div className="self-end pb-2 text-[11px] text-slate-500">{f.executor_kind === "nomad" ? "A etapa vai para a fila de nômades habilitados na especialidade." : "A equipe interna executa sem passar pela fila de nômades."}</div>}
            </div>
            {f.execution_mode === "hibrido" ? (
              <>
                <div className="grid grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-2">
                  <Field label="Finalidade"><select className={CTL} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                  <Field label="Quem executa"><select className={CTL} aria-label="Quem executa" value={f.execution_mode} onChange={(e) => changeMode(e.target.value)}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                </div>
                {/* Humano ou IA: duas opções, cada uma com a sua especialidade e o seu tempo. O cliente escolhe uma na contratação e vê o preço de cada. */}
                <div className="grid gap-2 md:grid-cols-2" data-testid="hybrid-options">
                  <div className="space-y-1.5 rounded-lg border border-sky-200 bg-sky-50/50 p-2 dark:border-sky-900 dark:bg-sky-950/20">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Opção humano</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                      <Field field="specialty" error={err("specialty")} label="Especialidade (humana)"><SpecialtyCombobox specialties={refs?.specialties ?? []} mode="humano" value={f.specialty_id} onChange={(v: string) => setF({ ...f, specialty_id: v })} /></Field>
                      <Field field="hours" error={err("hours")} label="Horas / prazo"><DurationInput className={CTL} ariaLabel="Horas estimadas do humano" value={f.estimated_hours} onChange={(v) => setF({ ...f, estimated_hours: v })} /></Field>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300" data-testid="hybrid-human-cost">Custo humano: {draftCost == null ? "a definir" : <strong>{brl2(draftCost)}</strong>}</p>
                  </div>
                  <div className="space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/50 p-2 dark:border-violet-900 dark:bg-violet-950/20">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Opção IA</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                      <Field field="ai_specialty" error={err("ai_specialty")} label="Especialidade (IA)"><SpecialtyCombobox specialties={refs?.specialties ?? []} mode="ia" value={f.ai_specialty_id} onChange={(v: string) => setF({ ...f, ai_specialty_id: v })} /></Field>
                      <Field field="ai_hours" error={err("ai_hours")} label="Horas / prazo"><DurationInput className={CTL} ariaLabel="Horas estimadas da IA" value={f.ai_estimated_hours} onChange={(v) => setF({ ...f, ai_estimated_hours: v })} /></Field>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300" data-testid="hybrid-ai-cost">Custo IA: {draftAiCost == null ? "a definir" : <strong>{brl2(draftAiCost)}</strong>}</p>
                  </div>
                </div>
              </>
            ) : (
            <div className="grid grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Finalidade"><select className={CTL} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Quem executa"><select className={CTL} aria-label="Quem executa" value={f.execution_mode} onChange={(e) => changeMode(e.target.value)}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              {(f.executor_kind ?? "nomad") === "nomad" && <Field field="specialty" error={err("specialty")} label="Especialidade"><SpecialtySelect refs={refs} mode={f.execution_mode} value={f.specialty_id} onChange={(v: string) => setF({ ...f, specialty_id: v })} /></Field>}
              <Field field="hours" error={err("hours")} label="Horas estimadas"><DurationInput className={CTL} ariaLabel="Horas estimadas" value={f.estimated_hours} onChange={(v) => setF({ ...f, estimated_hours: v })} /></Field>
            </div>
            )}
            {f.execution_mode !== "hibrido" && (f.executor_kind === "leader" || f.executor_kind === "internal") && (
              <p className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100" data-testid="internal-no-cost-note">
                Esta etapa é feita por {f.executor_kind === "leader" ? "um líder" : "a equipe interna"}: <strong>não tem especialidade nem valor/hora</strong> e <strong>não entra no custo do produto</strong> (a equipe interna já está coberta pela margem). As horas abaixo valem só como <strong>prazo</strong>.
              </p>
            )}
            {(() => {
              const sp = (refs?.specialties ?? []).find((x: any) => x.id === (f.specialty_id || task?.specialty?.id));
              if (!sp || f.execution_mode === "ia" || f.executor_kind === "leader" || f.executor_kind === "internal") return null;
              const money = (n: number) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
              return (
                <p className="flex flex-wrap items-center gap-x-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300" data-testid="step-hourly-rate">
                  <span>Valor da hora de <strong>{sp.name}</strong>: <strong>{sp.max_hourly_rate != null ? `${money(sp.max_hourly_rate)} por hora` : "ainda não definido"}</strong></span>
                  {!readOnly && <button type="button" className="font-semibold text-violet-700 underline" onClick={() => setRateOpen(true)} data-testid="step-hourly-rate-edit">Editar valor/hora</button>}
                  {rateOpen && (
                    <FramedModal open onOpenChange={setRateOpen} testId="step-hourly-rate-modal" title="Valor/hora da especialidade">
                      <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
                        <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Valor/hora · {sp.name}</p><p className="text-xs text-slate-500">Vale para todos os produtos que usam esta especialidade.</p></div>
                        <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={() => setRateOpen(false)}>Fechar</Button>
                      </div>
                      <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"><SpecialtyRateRow specialty={sp} act={act} onReloadRefs={() => { window.dispatchEvent(new Event("catalog2:reload-refs")); }} /></div>
                    </FramedModal>
                  )}
                </p>
              );
            })()}
          </StepBlock>
          {/* 3 · Quando a etapa termina */}
          <StepBlock n={3} title="Quando a etapa termina" {...bp(3)} summary={sum3} open={blocks.open.has(3)} onToggle={() => blocks.toggle(3)} help={"Aqui você define:\n• quando a etapa é considerada PRONTA (critério de conclusão);\n• se ela se repete nos meses seguintes, em produtos mensais;\n• e, em tarefas com execução por etapa, quem aprova e em quanto tempo."}>
            <Field field="completion_criteria" error={err("completion_criteria")} label={<span className="inline-flex items-center gap-2">Critério de conclusão<AiFieldButton compact label="Critério de conclusão" value={f.completion_criteria} context={{ name: f.name, other_fields: { "Tarefa": String(task?.name ?? ""), "Descrição da etapa": f.description } }} disabled={readOnly} fieldMaxChars={4000} onResult={(v) => setF({ ...f, completion_criteria: v.replace(/\n/g, " ") })} /></span>}><input className={CTL} value={f.completion_criteria} onChange={(e) => setF({ ...f, completion_criteria: e.target.value })} placeholder="Quando esta etapa pode ser considerada concluída?" /></Field>
            <div className="grid gap-2 sm:grid-cols-2" data-testid="repeat-options">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/40" title="Nunca se repete nos ciclos seguintes"><input type="checkbox" className="h-4 w-4" checked={f.first_execution_only} onChange={(e) => setF({ ...f, first_execution_only: e.target.checked })} /> <span data-no-info="">Só na primeira execução</span><span className="field-info" data-help={"Marque quando a etapa só precisa acontecer UMA vez, no primeiro mês do cliente (ex.: configurar a conta, liberar acessos). Nos meses seguintes ela não roda e não é cobrada de novo. As horas dela formam a “implantação”, cobrada só na primeira vez. Em produto avulso (um único ciclo) isso não muda nada."} aria-hidden="true">i</span></label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/40" title="A etapa só entra no produto quando o cliente escolhe a variação ou o adicional que a inclui" data-testid="step-conditional"><input type="checkbox" className="h-4 w-4" checked={f.is_conditional} onChange={(e) => setF({ ...f, is_conditional: e.target.checked })} /> <span data-no-info="">Depende de uma variação ou adicional</span><span className="field-info" data-help={"Marque quando a etapa NÃO faz parte do produto base: ela só entra se o cliente escolher uma variação ou um adicional que a inclua (ex.: o adicional “Relatório extra”). Depois de salvar, ligue a etapa à variação ou ao adicional correspondente."} aria-hidden="true">i</span></label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/40" title="Se o mesmo executor for mantido no ciclo seguinte, esta etapa é dispensada"><input type="checkbox" className="h-4 w-4" checked={f.skip_when_same_executor} onChange={(e) => setF({ ...f, skip_when_same_executor: e.target.checked })} /> <span data-no-info="">Dispensável quando o mesmo executor continua</span><span className="field-info" data-help={"Marque quando a etapa pode ser PULADA se, no mês seguinte, o mesmo profissional continuar atendendo o cliente (ex.: uma reunião de alinhamento que ele já conhece). Quando pulada, as horas dela não são cobradas naquele ciclo. Só vale se a tarefa permitir a continuidade do mesmo executor."} aria-hidden="true">i</span></label>
            </div>
            <RevealBox active={f.is_conditional} onReveal={() => blocks.reveal(3)} testId="conditional-reveal"><p className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-100" data-testid="conditional-effect">Esta etapa <strong>fica fora do produto base</strong>: só entra quando o cliente escolhe a variação ou o adicional ligado a ela. Depois de salvar, vá em <strong>Classificação e opções</strong> (Variações ou Adicionais → Ver → Configurar impactos → <strong>Incluir etapa</strong>) e escolha esta etapa. Sem esse vínculo o produto não publica.</p></RevealBox>
            <RevealBox active={f.first_execution_only} onReveal={() => blocks.reveal(3)} testId="first-execution-reveal"><p className="rounded-md bg-violet-50 px-2 py-1 text-[11px] text-violet-900 dark:bg-violet-950/30 dark:text-violet-100" data-testid="first-execution-effect">Esta etapa forma a <strong>implantação</strong>: entra na primeira cobrança e só roda no primeiro ciclo deste produto neste projeto. <strong>Não entra no preço das renovações.</strong></p></RevealBox>
            <RevealBox active={f.skip_when_same_executor} onReveal={() => blocks.reveal(3)} testId="dispensable-reveal">{((task?.executor_continuity ?? "not_allowed") === "not_allowed"
              ? <div className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-100" data-testid="dispensable-effect-off">
                  <span className="min-w-0 flex-1">Ainda <strong>sem efeito</strong>: esta tarefa não permite manter o mesmo executor de um mês para o outro. Libere abaixo para esta opção funcionar.</span>
                  {!readOnly && <button type="button" data-testid="allow-continuity" className="shrink-0 rounded-md border border-amber-400 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100" onClick={() => void act(() => apiClient.updateCatalog2Task(task.id, { executor_continuity: "allowed", scope: "product" }), "Continuidade do mesmo executor liberada nesta tarefa.")}>Permitir o mesmo executor nos próximos ciclos</button>}
                </div>
              : <p className="rounded-md bg-sky-50 px-2 py-1 text-[11px] text-sky-900 dark:bg-sky-950/30 dark:text-sky-100" data-testid="dispensable-effect-on">Se o mesmo executor continuar (no mesmo projeto, com os acessos ainda válidos e sem mudança de plataforma ou escopo), esta etapa é <strong>dispensada</strong> no ciclo seguinte e as horas dela <strong>não são cobradas</strong> (crédito na próxima fatura). O administrador pode exigi-la mesmo assim, com justificativa.</p>)}</RevealBox>
            <details className="rounded-md border border-sky-200 bg-sky-50/60 px-2 py-1 text-[11px] text-slate-700 dark:border-sky-900 dark:bg-sky-950/20 dark:text-slate-200" data-testid="recurrence-explainer">
              <summary className="cursor-pointer font-semibold text-sky-800 dark:text-sky-200">Como as duas opções acima funcionam em produtos mensais? Veja um exemplo</summary>
              <div className="mt-1.5 space-y-1.5 leading-snug">
                <p>Em um produto <strong>mensal (recorrente)</strong> a tarefa se repete todo mês. Cada mês é um <strong>ciclo</strong>. Em produto de compra única essas duas opções não mudam nada, pois só existe um ciclo.</p>
                <p>Exemplo — tarefa “Gestão de anúncios” com 3 etapas:</p>
                <ul className="list-disc space-y-0.5 pl-4">
                  <li><strong>Configurar a conta</strong> → marcada “Só na primeira execução”</li>
                  <li><strong>Reunião de alinhamento</strong> → marcada “Dispensável quando o mesmo executor continua”</li>
                  <li><strong>Otimizar campanhas</strong> → sem marcação</li>
                </ul>
                <div className="overflow-hidden rounded border border-sky-200 dark:border-sky-900">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-sky-100/70 dark:bg-sky-900/30"><tr><th className="px-2 py-1">Mês</th><th className="px-2 py-1">O que acontece</th></tr></thead>
                    <tbody>
                      <tr><td className="px-2 py-1 font-semibold">1</td><td className="px-2 py-1">As 3 etapas acontecem.</td></tr>
                      <tr><td className="px-2 py-1 font-semibold">2 (mesmo executor)</td><td className="px-2 py-1">Só “Otimizar campanhas”. A configuração não repete e a reunião é dispensada.</td></tr>
                      <tr><td className="px-2 py-1 font-semibold">3 (executor trocou)</td><td className="px-2 py-1">“Reunião de alinhamento” volta (o executor é novo) + “Otimizar campanhas”. A configuração nunca mais volta.</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>Resumo: <strong>“Só na primeira execução”</strong> = acontece uma única vez, no mês 1. <strong>“Dispensável…”</strong> = pula enquanto o profissional for o mesmo.</p>
              </div>
            </details>
            {/* Qualificação por etapa: liga/desliga + quem qualifica. O checklist de conferência (qualificação) só vale com ela ligada. */}
            <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900 dark:bg-amber-950/20" data-testid="qualification-box">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Switch aria-label="Esta etapa precisa de qualificação" checked={qualOn} disabled={readOnly || f.execution_mode === "ia"} onCheckedChange={(v) => setF({ ...f, qual_on: !!v })} />
                <span data-no-info="">{f.execution_mode === "hibrido" ? "Se um humano executar: esta etapa precisa de qualificação" : "Esta etapa precisa de qualificação"}</span>
                <span className="field-info" data-help={"Qualificação = alguém CONFERE a entrega antes de ela seguir (para o cliente ou para a próxima etapa).\nLigada: aparece o checklist de conferência e a escolha de quem qualifica.\nDesligada: a etapa é liberada sem essa conferência.\nEtapas feitas por IA (ou humano ou IA) sempre têm qualificação."} aria-hidden="true">i</span>
              </label>
              {f.execution_mode === "ia" && <p className="text-[11px] text-amber-800 dark:text-amber-200" data-testid="approver-ai-note">Esta etapa usa IA: um qualificador sempre confere a entrega.</p>}
              {qualOn && (
                <div className="grid gap-2 md:grid-cols-2" data-testid="qualifier-choice">
                  <Field label={f.execution_mode === "hibrido" ? "Quem qualifica (se humano executar)" : "Quem qualifica"}>
                    <select className={CTL} aria-label="Quem qualifica" value={f.qualifier_kind} onChange={(e) => setF({ ...f, qualifier_kind: e.target.value })}>
                      <option value="leader">Líder da área</option>
                      <option value="person">Pessoa específica</option>
                      <option value="leader_person">Líder e depois uma pessoa específica</option>
                      <option value="nomad_pool">Nômades qualificadores</option>
                    </select>
                  </Field>
                  {/* A condição fica no `active` (o bloco já está montado): assim, ao escolher "pessoa específica", ele abre, rola, destaca e diz o que falta. */}
                  {(
                    <RevealBox active={f.qualifier_kind === "person" || f.qualifier_kind === "leader_person"} missing={f.specialist_user_id ? 0 : 1} onReveal={() => blocks.reveal(3)} testId="qualifier-person-box">
                    <Field field="qualifier_person" error={err("qualifier_person")} label="Pessoa que qualifica">
                      <select aria-label="Pessoa que qualifica" className={CTL} value={f.specialist_user_id} onChange={(e) => setF({ ...f, specialist_user_id: e.target.value })}>
                        <option value="">Escolha a pessoa…</option>
                        {specialists.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.kind === "nomade" ? "nômade" : u.kind === "admin" ? "administração" : "líder"})</option>)}
                      </select>
                    </Field>
                    </RevealBox>
                  )}
                </div>
              )}
              {f.execution_mode === "hibrido" && (
                <div className="space-y-1.5 rounded-md border border-violet-200 bg-violet-50/60 p-2 dark:border-violet-900 dark:bg-violet-950/20" data-testid="ai-qualification-box">
                  <p className="text-[12px] font-semibold text-violet-900 dark:text-violet-200">Se a IA executar: sempre é qualificada<span className="field-info" data-help={"Na etapa 'Humano ou IA' existem duas configurações de qualificação:\n• Se um humano executar: você liga ou desliga a qualificação e escolhe quem qualifica (acima).\n• Se a IA executar: a conferência é SEMPRE obrigatória; aqui você escolhe quem confere o trabalho da IA."} aria-hidden="true">i</span></p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Quem qualifica (se a IA executar)">
                      <select className={CTL} aria-label="Quem qualifica se a IA executar" disabled={readOnly} value={(f.ops?.ai_qualifier_kind as string) ?? "leader"} onChange={(e) => setOps({ ai_qualifier_kind: e.target.value, ...(e.target.value === "person" || e.target.value === "leader_person" ? {} : { ai_qualifier_user_id: undefined }) })}>
                        <option value="leader">Líder da área</option>
                        <option value="person">Pessoa específica</option>
                        <option value="leader_person">Líder e depois uma pessoa específica</option>
                        <option value="nomad_pool">Nômades qualificadores</option>
                      </select>
                    </Field>
                    {(
                      <RevealBox active={f.ops?.ai_qualifier_kind === "person" || f.ops?.ai_qualifier_kind === "leader_person"} missing={f.ops?.ai_qualifier_user_id ? 0 : 1} onReveal={() => blocks.reveal(3)} testId="ai-qualifier-person-box">
                      <Field field="ai_qualifier_person" error={err("ai_qualifier_person")} label="Pessoa que qualifica (se a IA executar)">
                        <select aria-label="Pessoa que qualifica se a IA executar" className={CTL} disabled={readOnly} value={(f.ops?.ai_qualifier_user_id as string) ?? ""} onChange={(e) => setOps({ ai_qualifier_user_id: e.target.value || undefined })}>
                          <option value="">Escolha a pessoa…</option>
                          {specialists.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.kind === "nomade" ? "nômade" : u.kind === "admin" ? "administração" : "líder"})</option>)}
                        </select>
                      </Field>
                      </RevealBox>
                    )}
                  </div>
                </div>
              )}
              {qualOn && f.qualifier_kind === "nomad_pool" && <p className="text-[11px] text-slate-600 dark:text-slate-300">A conferência vai, em rodízio, para um nômade marcado como “Nômade qualificador” no cadastro e habilitado nesta área (nunca o próprio executor). Se não houver ninguém disponível, o líder da área qualifica.</p>}
              {/* O modo "execução por etapa" é da TAREFA (fica em Dados da tarefa), não da etapa: aqui só avisamos quando ele impede a qualificação desta etapa de valer. */}
              {qualOn && task?.stage_execution !== "stage" && <p className="text-[11px] text-slate-600 dark:text-slate-300" data-testid="qualification-task-mode-note">Esta qualificação vale para a etapa. Para ela ser cobrada a cada etapa (e não só no fim da tarefa), ligue “execução por etapa” nos dados da tarefa.</p>}
            </div>
            <ClientApprovalSection task={task} step={step} f={f} patch={(p) => setF({ ...f, ...p })} setOps={(p) => setOps(p)} readOnly={readOnly} err={err} hoursBad={hoursBad}
              approvable={approvableNames} hasNext={index < (steps?.length ?? 0) - 1} onReveal={() => blocks.reveal(3)} onClearDeliverableApprovals={() => setDelivItems((old) => old.map((item) => item.fields.requires_approval ? { ...item, fields: { ...item.fields, requires_approval: false } } : item))} />
            <StepCyclesSection ops={f.ops} setOps={(p) => setOps(p)} readOnly={readOnly} />
          </StepBlock>
          {/* 4 · Checklist, orientações e evidência */}
          <StepBlock n={4} title="Checklist, orientações e evidência" {...bp(4)} summary={sum4} open={blocks.open.has(4)} onToggle={() => blocks.toggle(4)} help={"Três coisas diferentes:\n• Orientações: o passo a passo de COMO executar.\n• Checklist: a lista de itens que serão CONFERIDOS.\n• Evidência: a PROVA da entrega (arquivo ou link anexado)."}>
            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600" data-testid="step-checklist-count">{checklistCount(draftChecklist)} {checklistCount(draftChecklist) === 1 ? "item" : "itens"}</span>
                <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setChecklistOpen(true)} data-testid="open-step-checklist"><ListChecks className="mr-1.5 h-4 w-4" />Gerenciar checklist</Button>
              </div>
            </div>
            {/* Prévia do checklist: os itens à vista, agrupados (a conferência só aparece com a qualificação ligada). */}
            {(() => {
              const KIND_LABEL: Record<string, string> = { execucao: "Execução", aprovacao: "Aprovação", qualificacao: "Qualificação (conferência)" };
              const shown = draftChecklist.filter((c) => qualAny || c.kind !== "qualificacao");
              // Os três quadros (Execução, Aprovação, Qualificação) aparecem SEMPRE; vazio mostra "nenhum item configurado".
              return (
                <div className="grid gap-1.5 md:grid-cols-3" data-testid="checklist-preview">
                  {(["execucao", "aprovacao", "qualificacao"] as const).map((k) => {
                    const off = k === "qualificacao" && !qualAny;
                    const list = off ? [] : shown.filter((c) => c.kind === k);
                    return (
                      <div key={k} data-testid={`checklist-box-${k}`} className={`rounded-md border px-2 py-1.5 ${off ? "border-dashed border-slate-300 bg-slate-100/60 dark:border-slate-700 dark:bg-slate-800/20" : "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{KIND_LABEL[k]} ({list.length})</p>
                        {off ? <p className="text-[11px] text-slate-500">Qualificação desligada nesta etapa: não há conferência.</p>
                          : list.length === 0 ? <p className="text-[11px] text-slate-500" data-testid={`checklist-empty-${k}`}>Nenhum item de checklist configurado.</p> : (
                          <ul className="mt-0.5 space-y-0.5 text-[11px] text-slate-700 dark:text-slate-200">
                            {list.slice(0, 4).map((c) => <li key={c.id} className="flex gap-1"><span aria-hidden="true">☐</span><span className="min-w-0 break-words">{c.text}</span></li>)}
                            {list.length > 4 && <li className="text-slate-400">+ {list.length - 4} item(ns)</li>}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <details className="rounded-md border border-violet-200 bg-violet-50/60 px-2 py-1 text-[11px] text-slate-700 dark:border-violet-900 dark:bg-violet-950/20 dark:text-slate-200" data-testid="checklist-vs-evidence">
              <summary className="cursor-pointer font-semibold text-violet-800 dark:text-violet-200">Checklist, orientações e evidência: qual a diferença?</summary>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-snug">
                <li><strong>Orientações para execução</strong> = o <em>como fazer</em>. Texto livre para o executor (ex.: “duplique a campanha modelo e troque o público”).</li>
                <li><strong>Checklist</strong> = o <em>que conferir</em>. Lista de itens (“logo aplicado”, “texto revisado”) que o executor marca como feitos e que quem qualifica e quem aprova também conferem.</li>
                <li><strong>Evidência obrigatória</strong> = a <em>prova</em>. Um arquivo ou link anexado (ex.: print da campanha no ar). Ligada, a etapa <u>não conclui</u> sem anexar a prova.</li>
              </ul>
              <p className="mt-1">Eles se complementam: o checklist diz o que foi conferido; a evidência é o comprovante. Pode usar só um, ou os dois.</p>
            </details>
            <Field label="Orientações para execução"><Textarea rows={4} maxLength={8000} value={f.ops?.instructions ?? ""} onChange={(e) => setOps({ instructions: e.target.value })} className="min-h-[88px] py-1.5 text-[13px]" placeholder={"Manual operacional da etapa (serve para o nômade, o líder e a IA).\n1. O que abrir ou acessar\n2. O que fazer, passo a passo\n3. Como conferir antes de entregar"} /><span className="block text-right text-[10px] text-slate-400">{(f.ops?.instructions ?? "").length}/8000</span></Field>
            {f.execution_mode !== "humano" && (
              <Field label="Prompt da IA (como a IA deve executar esta etapa)">
                <Textarea rows={3} maxLength={8000} disabled={readOnly} value={f.ops?.ai_prompt ?? ""} onChange={(e) => setOps({ ai_prompt: e.target.value })} className="min-h-[56px] py-1.5 text-[13px]" placeholder="Instrução específica para a IA: o que ela deve produzir, tom, formato da saída, o que nunca fazer…" data-testid="ai-prompt" />
              </Field>
            )}
            <label className="flex items-center gap-2.5 text-sm font-medium" title="A etapa só pode ser concluída depois de anexar uma evidência.">
              <Switch aria-label="Evidência obrigatória" checked={!!f.ops?.evidence_required} onCheckedChange={(v) => setOps({ evidence_required: !!v, ...(v ? {} : { evidence_types: undefined }) })} />
              Evidência obrigatória
            </label>
            <RevealBox active={!!f.ops?.evidence_required} onReveal={() => blocks.reveal(4)} testId="evidence-reveal">
              <fieldset className="rounded-lg border border-violet-200 bg-violet-50/50 px-2.5 py-2 dark:border-violet-900 dark:bg-violet-950/20" data-testid="evidence-types">
                <legend className="px-1 text-[11px] font-semibold text-violet-800 dark:text-violet-200">Que tipo de evidência você quer?<span className="field-info" data-help={"Marque o que vale como prova nesta etapa (pode marcar mais de um).\nO executor vê o tipo pedido e entrega do jeito certo.\nExemplo: Print da tela + Relatório."} aria-hidden="true">i</span></legend>
                <div className="flex flex-wrap gap-1.5">
                  {EVIDENCE_TYPE_OPTIONS.map(([key, label]) => {
                    const chosen: string[] = Array.isArray(f.ops?.evidence_types) ? f.ops.evidence_types : [];
                    const on = chosen.includes(key);
                    return (
                      <label key={key} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={(e) => setOps({ evidence_types: e.target.checked ? [...chosen, key] : chosen.filter((k) => k !== key) })} />
                        {label}
                      </label>
                    );
                  })}
                </div>
                {(!Array.isArray(f.ops?.evidence_types) || f.ops.evidence_types.length === 0) && <p className="mt-1 text-[11px] text-slate-500">Nenhum tipo marcado: qualquer prova (arquivo ou link) vale.</p>}
              </fieldset>
            </RevealBox>
            {/* Responsável e exemplo só aparecem com a evidência obrigatória LIGADA; desligada, não há o que configurar. */}
            {f.ops?.evidence_required && (
              <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2" data-testid="evidence-details">
                <Field label="Responsável pela evidência">
                  <select className={CTL} value={f.ops?.evidence_owner ?? "executor"} onChange={(e) => setOps({ evidence_owner: e.target.value })}>
                    <option value="executor">Executor da etapa</option><option value="leader">Líder</option><option value="client">Cliente</option>
                  </select>
                </Field>
                <Field label="Exemplo de evidência (opcional)"><input className={CTL} maxLength={1000} value={f.ops?.evidence_hint ?? ""} onChange={(e) => setOps({ evidence_hint: e.target.value })} placeholder="Ex.: print da tela com a campanha publicada" /></Field>
              </div>
            )}
          </StepBlock>
          {/* 5 · Entregáveis desta etapa (a etapa é a fonte do vínculo; o resumo da tarefa só reflete) */}
          <StepBlock n={5} title="Entregáveis desta etapa" {...bp(5)} summary={sum5} open={blocks.open.has(5)} onToggle={() => blocks.toggle(5)} help={"O que esta etapa precisa entregar. É o MESMO cadastro de entregáveis da tarefa (nada é copiado): o que você vincular, criar ou editar aqui aparece na seção Entregáveis da tarefa, e vice-versa. Só é gravado quando você salva a etapa."}>
            <StepDeliverablesEditor task={task} step={{ id: step.id, name: f.name || step.name }} stepIndex={index + 1} readOnly={readOnly} items={delivItems} setItems={setDelivItems}
              declaredNone={delivNone} setDeclaredNone={(v) => setOps({ no_deliverables: v ? true : undefined })} issues={delivIss} showErrors={showErrors} />
          </StepBlock>
          {/* 6 · Conexões e acessos (largura total) */}
        <StepBlock n={6} title="Conexões e acessos desta etapa" {...bp(6)} summary={sum6} open={blocks.open.has(6)} onToggle={() => blocks.toggle(6)}>
          <StepAccessesEditor version={version} readOnly={readOnly} quick={makeQuickCreate(version, act)} scope={{ task: { key: task.key, name: task.name }, step: { key: step.key, name: step.name } }}
            items={accessItems} setItems={setAccessItems} accessOn={accessOn} setAccessOn={setAccessOn} ops={f.ops} setOps={(patch) => setOps(patch)}
            stepNames={Object.fromEntries((version?.tasks ?? []).flatMap((t: any) => (t.steps ?? []).map((st: any) => [st.key, st.name])))}
            issues={accIssues} showErrors={showErrors} />
        </StepBlock>
          {/* Resumo final: o que está completo, o que falta e como a próxima etapa é liberada. */}
          <StepFinalSummary infos={infos} issues={issues} deliverables={delivNone ? [] : delivAct.map((i) => i.fields.name.trim() || "(sem nome)")} accessLine={accessLine} approvalLine={approvalLine}
            qualificationLine={qualOn ? `Sim — ${f.qualifier_kind === "person" ? "pessoa específica" : f.qualifier_kind === "leader_person" ? "líder e depois uma pessoa" : f.qualifier_kind === "nomad_pool" ? "nômades qualificadores" : "líder da área"}` : "Não precisa de qualificação"}
            releaseLine={releaseLine} onGo={goToIssue} />
        </div>

        <StepChecklistDialog open={checklistOpen} title={f.name || step.name} value={draftChecklist} qualificationEnabled={qualAny} stepId={step.id} draft={{ name: f.name, description: f.description, completion_criteria: f.completion_criteria, orientations: f.ops?.instructions ?? "", execution_mode: f.execution_mode, specialty: (refs?.specialties ?? []).find((sp: any) => sp.id === f.specialty_id)?.name ?? "", qualification: qualOn, internal: !!f.internal_step, client_approval: f.ops?.client_approval?.mode ?? "" }} onClose={() => setChecklistOpen(false)} onSave={(list) => { setOps({ checklist: list }); setChecklistOpen(false); }} />

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          {/* Anterior/Próximo do painel só no modo lista (Expandir todos): com as janelas, a navegação fica dentro de cada janela. */}
          {blocks.list && <div className="mr-auto flex items-center gap-1.5" data-testid="step-guide-nav">
            <Button size="sm" variant="outline" className="h-9" disabled={guide <= 1} onClick={() => goStep(Math.max(1, guide - 1))} data-testid="step-guide-prev">Anterior</Button>
            <Button size="sm" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="h-9 border-0 text-white shadow-md hover:brightness-110 hover:text-white" disabled={guide >= 7} onClick={() => goStep(Math.min(7, guide + 1))} data-testid="step-guide-next">{guide === 6 ? "Próximo: resumo" : "Próximo"}</Button>
            <span className="hidden text-[11px] text-slate-500 sm:inline" data-testid="step-guide-where">{guide <= 6 ? `Bloco ${guide} de 6` : "Resumo final"}</span>
          </div>}
          <Button size="sm" variant="ghost" className="h-9" disabled={saving !== null} onClick={requestClose}>Cancelar</Button>
          <Button size="sm" variant="outline" className="h-9" disabled={saving !== null} onClick={() => { setDraftNote(null); void commitStep("draft").catch(() => {}); }} data-testid="step-save-draft" title="Guarda tudo o que já foi preenchido, mesmo incompleto. A etapa fica marcada como rascunho incompleto e não é liberada para execução nem publicada.">{saving === "draft" ? "Salvando…" : "Salvar rascunho da etapa"}</Button>
          <SaveButton onClick={concludeClick} disabled={saving !== null}>{saving === "final" ? "Salvando…" : "Concluir e salvar etapa"}</SaveButton>
        </div>
        <ModelScopeDialog embedded={inModels} open={scopeAsk} kindLabel="etapa" modelId={step.step_model_id} onCancel={() => setScopeAsk(false)} onChoose={(sc) => { setScopeAsk(false); void commitStep("final", sc).catch(() => {}); }} />
        <Dialog open={closeAsk} onOpenChange={(o) => { if (!o) setCloseAsk(false); }}>
          <DialogContent className="max-w-md" data-testid="step-close-ask">
            <DialogTitle>Há alterações não salvas</DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300">O que você preencheu nesta etapa ainda não foi salvo. O que você prefere fazer?</p>
            <div className="flex flex-col gap-2 pt-1">
              <Button type="button" onClick={() => setCloseAsk(false)} data-testid="step-close-continue">Continuar editando</Button>
              <Button type="button" variant="outline" disabled={saving !== null} onClick={() => { void commitStep("draft").then(() => { setCloseAsk(false); setEditing(false); }).catch(() => setCloseAsk(false)); }} data-testid="step-close-draft">Salvar como rascunho e fechar</Button>
              <Button type="button" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={discardAll} data-testid="step-close-discard">Descartar alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
        </fieldset>
      </div>
      </div>
      </FramedPanel>
    );
  }
  return (
    <li ref={liRef} data-testid={`step-card-${index + 1}`} className={`relative rounded-xl border bg-white px-3 py-2.5 text-[13px] shadow-sm before:absolute before:-left-[26px] before:top-[18px] before:h-3 before:w-3 before:rounded-full before:border-2 before:border-white before:bg-violet-500 dark:bg-slate-900/60 ${parallelWith.length > 0 ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900" : open ? "border-cyan-300 bg-sky-50/40 ring-1 ring-cyan-200 dark:border-cyan-800 dark:ring-cyan-900" : "border-slate-200 dark:border-slate-700"}`}>
      <div className="flex items-start gap-3" data-testid="step-header">
        <span className="section-number-badge mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" data-testid="step-number">{index + 1}</span>
        <div className="min-w-0 flex-1 text-left" data-testid="step-toggle">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-bold leading-tight text-slate-900 dark:text-slate-100">{step.name}</span>
            {parallelWith.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" data-testid="step-parallel-chip" title="Estas etapas acontecem ao mesmo tempo">⇄ Ao mesmo tempo que a etapa {parallelWith.join(", ")}</span>}
            {step.step_model_id != null && <button type="button" title="Ver o modelo global desta etapa" onClick={(e) => { e.stopPropagation(); setViewModel(true); }} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200">Etapa #{step.step_model_id}</button>}
            <ModelStatusChips model={step.model} readOnly={readOnly} onSync={() => act(() => apiClient.syncCatalog2StepModel(step.id), "Etapa atualizada para a revisão atual do modelo global.")} />
            {step.draft_incomplete && <span data-testid="step-draft-chip" title="Salva como rascunho: ainda falta preencher. Não é liberada para execução nem publicada." className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Rascunho incompleto</span>}
            {step.is_conditional && <span data-testid="step-conditional-chip" title="Fora do produto base: só entra quando o cliente escolhe a variação ou o adicional ligado a ela." className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-[11px] font-semibold text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200">Depende de variação/adicional</span>}
            {step.is_conditional && !linkedStepRefs(version).has(`${task?.key}:${step.key}`) && <span data-testid="step-unlinked-chip" title="Nenhuma variação, adicional ou condição inclui esta etapa. Ligue em Classificação e opções → Configurar impactos → Incluir etapa. Sem isso o produto não publica." className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">sem variação/adicional ligada</span>}
            {step.first_execution_only && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">Só na 1ª execução</span>}
            {step.skip_when_same_executor && <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Dispensável c/ mesmo executor</span>}
            {step.is_access_validation && <span title="Bloqueia as etapas seguintes até os acessos serem validados" className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Pré-requisito: acessos</span>}
            {task?.effort_is_provisional && !readOnly && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">revisar</span>}
            {stepFlowChips(step, steps).slice(0, 1).map((c) => <span key={c} data-testid="step-flow-chips" className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{c.charAt(0).toUpperCase() + c.slice(1)}</span>)}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-slate-500">
            {PURPOSE_LABEL[step.purpose] ?? step.purpose} · {EXEC_LABEL[step.execution_mode] ?? step.execution_mode} · {specName ?? "sem especialidade"} · {formatStageHours(step.estimated_minutes)}
            {step.executor_kind && step.executor_kind !== "nomad" && <span data-testid="step-no-cost" title="Etapa de líder / equipe interna: as horas valem como prazo e não entram no custo do produto."> · sem custo no produto</span>}
            {(() => { const c = step.execution_mode === "hibrido" ? null : stepCostEstimate(step, task, refs); return c == null ? null : <span data-testid="step-cost" title="Custo estimado: horas × valor/hora da especialidade (sem taxas e margem)"> · custo {brl2(c)}</span>; })()}
            {step.execution_mode === "hibrido" && (() => {
              const aiSp = (refs?.specialties ?? []).find((sp: any) => sp.id === step.ai_specialty_id);
              return <span data-testid="step-ai-option" className="font-semibold text-violet-700 dark:text-violet-300"> · Opção IA: {aiSp?.name ?? "sem especialidade"} · {formatStageHours(step.ai_estimated_minutes)}</span>;
            })()}
          </span>
          {(() => {
            // Resumo dos entregáveis desta etapa (vem dos mesmos registros da tarefa): quantidade, nomes, aprovação, ciclo e se estão completos.
            const mine = ((task?.deliverables ?? []) as any[]).filter((d) => d.step_id === step.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            const none = !!step.ops?.no_deliverables;
            if (mine.length === 0) return <span className="mt-0.5 block text-[12px] text-slate-500" data-testid="step-deliverable-summary" data-count="0">{none ? "Sem entregáveis (declarado)" : "Nenhum entregável nesta etapa"}</span>;
            const pend = mine.filter((d) => !deliverableSituation(d).complete).length;
            return (
              <span className="mt-0.5 block text-[12px] text-slate-600 dark:text-slate-300" data-testid="step-deliverable-summary" data-count={mine.length}>
                <strong>{mine.length} entregável{mine.length === 1 ? "" : "is"}</strong> — {mine.map((d) => deliverableBrief(d)).join(" · ")}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${pend ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`} data-testid="step-deliverable-state">{pend ? `${pend} incompleto${pend === 1 ? "" : "s"}` : "completos"}</span>
              </span>
            );
          })()}
        </div>
        <button type="button" data-testid="step-view-btn" aria-label={`Ver a etapa ${index + 1}`} title="Ver todos os dados desta etapa" onClick={() => setOpen(true)} className="mt-0.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ver</span></button>
        {!readOnly && <button type="button" data-testid="step-edit-btn" aria-label={`Editar etapa ${index + 1}`} title="Editar esta etapa (nome, executor, especialidade, tempo…)" onClick={() => openEditor()} className="mt-0.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"><Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Editar</span></button>}
      </div>
      {open && (
        <FramedModal open onOpenChange={setOpen} testId="step-view-modal" title={`Etapa ${index + 1} — ${step.name}`}>
          <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="section-number-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">{index + 1}</span>
              <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{step.name}</p><p className="truncate text-xs text-slate-500">{PURPOSE_LABEL[step.purpose] ?? step.purpose} · {EXEC_LABEL[step.execution_mode] ?? step.execution_mode} · {specName ?? "sem especialidade"} · {formatStageHours(step.estimated_minutes)}</p></div>
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (justSaved
                ? <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" data-testid="step-view-edit" onClick={() => { setOpen(false); openEditor(); }}><Pencil className="mr-1 h-3.5 w-3.5" />Editar de novo</Button>
                : <Button size="sm" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="text-white shadow-md hover:brightness-110" data-testid="step-view-edit" onClick={() => { setOpen(false); openEditor(); }}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>)}
              {justSaved
                ? <Button size="sm" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="text-white shadow-md hover:brightness-110" data-testid="step-view-done" onClick={() => setOpen(false)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Concluir</Button>
                : <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" data-testid="step-view-close" onClick={() => setOpen(false)}>Fechar</Button>}
            </div>
          </div>
          {justSaved && <p role="status" className="mt-2 shrink-0 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" data-testid="step-saved-banner">✓ Etapa concluída e salva. Confira o resumo abaixo e clique em “Concluir” para voltar à lista de etapas.</p>}
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <StepDetailsSummary step={step} isLast={index === (steps?.length ?? 0) - 1} />
          {!readOnly && steps.length > 1 && <StepFlowControls step={step} steps={steps} index={index} taskId={taskId} act={act} />}
          {(step.executor_kind === "leader" || step.executor_kind === "internal") && <div><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800" data-testid="step-receiver-chip">{step.executor_kind === "internal" ? "Equipe interna" : step.leader_mode === "specific" ? "Líder específico" : "Líder da área"}</span></div>}
          <StepGovernance step={step} task={task} version={version} readOnly={readOnly} act={act} />
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800" data-testid="step-actions">
              {task?.effort_is_provisional && (
                <button className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700" title="Conferi esta etapa (nome, horas e especialidade) — confirmar"
                  onClick={() => act(() => apiClient.updateCatalog2Step(step.id, { name: step.name, estimated_minutes: step.estimated_minutes ?? null, specialty_id: step.specialty_id ?? task?.specialty?.id ?? null }), "Etapa confirmada.")}>Ok, conferi</button>
              )}
              <button type="button" data-testid="step-checklist-btn" title="Ver e cadastrar o checklist desta etapa (execução, aprovação e qualificação)" onClick={() => { setOpen(false); setChecklistOpen(true); }} className="inline-flex h-8 items-center gap-1 rounded-md border border-sky-200 bg-white px-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"><ListChecks className="h-3.5 w-3.5" />Checklist ({checklistCount((step.ops?.checklist as ChecklistItem[] | undefined) ?? [])})</button>
              <button type="button" disabled={index === 0} title="Mover etapa para cima — ela passa a acontecer antes da anterior" onClick={() => setMoveAsk(-1)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronUp className="h-3.5 w-3.5" />Subir</button>
              <button type="button" disabled={index === steps.length - 1} title="Mover etapa para baixo — ela passa a acontecer depois da próxima" onClick={() => setMoveAsk(1)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronDown className="h-3.5 w-3.5" />Descer</button>
              <ConfirmDeleteButton testId="step-delete" label="Excluir etapa" title="Remover etapa desta tarefa?" onConfirm={() => act(() => apiClient.deleteCatalog2Step(step.id), "Etapa removida da tarefa.")} />
            </div>
          )}
          </div>
        </FramedModal>
      )}
      {viewModel && step.step_model_id != null && <TaskModelInfoDialog kind="step" id={step.step_model_id} onClose={() => setViewModel(false)} />}
      <ConfirmationDialog
        open={moveAsk !== null}
        onClose={() => setMoveAsk(null)}
        title="Mudar a ordem da etapa?"
        message={moveAsk === null ? null : <>Deseja que a etapa <strong>“{step.name}”</strong> passe a ser a <strong>{index + 1 + moveAsk}ª</strong>? A etapa <strong>“{steps[index + moveAsk]?.name}”</strong> passa a ser a {index + 1}ª. A ordem muda também o que acontece antes e depois de cada etapa.</>}
        confirmText={`Sim, passar para a ${moveAsk === null ? "" : index + 1 + moveAsk}ª`}
        onConfirm={async () => { const dir = moveAsk; setMoveAsk(null); if (dir === null) return; await act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, dir)), "Ordem das etapas atualizada."); }}
      />
      <StepChecklistDialog open={checklistOpen} title={step.name} readOnly={readOnly} saving={savingChecklist} qualificationEnabled={step.execution_mode !== "humano" && step.execution_mode != null ? true : step.requires_qualification !== false || !!step.requires_specialist_qualification} value={(step.ops?.checklist as ChecklistItem[] | undefined) ?? []} onClose={() => setChecklistOpen(false)}
        onSave={(list) => { setSavingChecklist(true); void act(() => apiClient.updateCatalog2Step(step.id, { ops: { ...(step.ops ?? {}), checklist: list }, scope: "product" }), "Checklist da etapa salvo.").then(() => setChecklistOpen(false)).finally(() => setSavingChecklist(false)); }} />
      {editModal}
    </li>
  );
}

function TaskInlineEdit({ task, version, refs, act, effortHighlighted, durationHighlighted, effortDone, durationDone, onSaved, onOpenPricing }: any) {
  const registerFlusher = useContext(FlushCtx);
  const [t, setT] = useState({ stage_execution: task.stage_execution ?? "task", execution_mode: task.execution_mode, specialty_id: task.specialty?.id ?? "", is_conditional: task.is_conditional, requires_review: task.requires_review, requires_client_approval: task.requires_client_approval, requires_qualification: task.requires_qualification ?? false, cycle_type: task.cycle_type ?? "recorrente", repeat_rule: task.repeat_rule ?? "all_cycles", repeat_every_cycles: task.repeat_every_cycles ?? "", executor_continuity: task.executor_continuity ?? "not_allowed", asset_rule: task.asset_rule ?? "first_only", asset_revalidate_days: task.asset_revalidate_days ?? "" });
  const [scopeAsk, setScopeAsk] = useState(false);
  const dirtyRef = useRef(false);
  const preview = (patch: Record<string, unknown>) => {
    dirtyRef.current = true;
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("catalog2:task-draft", { detail: { taskId: task.id, patch } }));
  };
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
  const inModelsTask = useContext(ModelEditCtx).embedded;
  const doSaveTask = (scope?: ModelScope) => act(
    () => apiClient.updateCatalog2Task(task.id, { ...t, description: descT.trim() ? descT : null, ops: opsT, qualifier_user_id: t.requires_qualification ? (qualifier || null) : null, reviewer_user_id: t.requires_review ? (reviewer || null) : null, review_minutes: t.requires_review && reviewMin !== "" ? Number(reviewMin) : null, review_specialty_id: t.requires_review ? (reviewSpec || null) : null, estimated_minutes: null, specialty_id: t.specialty_id || null, repeat_every_cycles: t.repeat_rule === "every_n_cycles" && t.repeat_every_cycles !== "" ? Number(t.repeat_every_cycles) : null, asset_revalidate_days: t.asset_rule === "every_x_days" && t.asset_revalidate_days !== "" ? Number(t.asset_revalidate_days) : null, ...(scope ? { scope } : {}), ...(scope === "model" ? { confirm_model_update: true } : {}) }),
    scope === "model" ? "Modelo global atualizado." : "Tarefa salva."
  ).then((result: any) => {
    if (!result) return;
    dirtyRef.current = false;
    if (effortHighlighted) onSaved("catalog2-task-effort");
    return result;
  });
  // "Salvar rascunho" no cabeçalho deve salvar também as alterações ainda
  // abertas dentro desta tarefa. Antes, só o botão da própria tarefa fazia
  // isso e o usuário precisava descobrir essa exceção — ao atualizar, via a
  // impressão de que o rascunho havia sido perdido.
  useEffect(() => registerFlusher(async () => {
    if (dirtyRef.current) await doSaveTask("product");
  }), [registerFlusher, t, descT, opsT, qualifier, reviewer, reviewMin, reviewSpec]); // eslint-disable-line react-hooks/exhaustive-deps
  // A edição no cadastro é, por padrão, deste produto. Antes a tela abria um
  // segundo diálogo para toda tarefa vinda de modelo global: era fácil fechar
  // esse diálogo e acreditar que "Salvar tarefa" havia aplicado a alteração.
  // O modelo continua podendo ser atualizado, mas apenas por ação explícita.
  const saveTask = () => void doSaveTask("product");
  return (
    <section className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-800/30">
    <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Configurações da tarefa <span className="font-normal text-slate-400">(ciclo, repetição, guia, entregáveis, dependências, acessos, questionário…) — quem executa e a especialidade vêm das etapas</span></p>
    <div className="space-y-2 pt-2 text-xs">
      <div className="flex flex-wrap items-end gap-2">
        {/* Quem executa NÃO é escolhido aqui: vem das etapas (humano, IA ou misto) e aparece no Resumo da tarefa. */}
        <TaskField label="Especialidade padrão (das etapas sem especialidade própria)">
          <select className={`h-8 rounded border bg-white px-2 text-xs dark:border-neutral-700 dark:bg-slate-900 ${effortDone ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : effortHighlighted ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-900/30" : "border-neutral-300"}`} value={t.specialty_id} onChange={(e) => { const specialty = refs.specialties.find((s: any) => s.id === e.target.value) ?? null; setT({ ...t, specialty_id: e.target.value }); preview({ specialty_id: e.target.value || null, specialty }); }}><option value="">Sem especialidade</option>{specialtiesForMode(refs.specialties, t.execution_mode).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </TaskField>
        <button type="button" className="mb-0.5 text-xs font-semibold text-violet-700 underline hover:text-violet-900 dark:text-violet-300" onClick={() => void onOpenPricing?.(task.id)}>Configurar especialidades e custos</button>
        <label><input type="checkbox" checked={t.is_conditional} onChange={(e) => setT({ ...t, is_conditional: e.target.checked })} /> condicional</label>
        <label title="A entrega passa por uma revisão técnica de um revisor ANTES da qualificação e da aprovação. Tem rodadas e pode devolver ao executor."><input type="checkbox" checked={t.requires_review} onChange={(e) => setT({ ...t, requires_review: e.target.checked })} /> revisão obrigatória</label>
        <label><input type="checkbox" checked={t.requires_client_approval} onChange={(e) => setT({ ...t, requires_client_approval: e.target.checked })} /> aprovação cliente</label>
        <label className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200" title="Cada etapa passa pela qualificação do líder e pela aprovação de quem contratou antes de liberar a próxima. Desligado: qualificação e aprovação só no fim da tarefa (como sempre). Salva na hora." data-testid="stage-execution-toggle"><input type="checkbox" checked={t.stage_execution === "stage"} onChange={(e) => { const v = e.target.checked ? "stage" : "task"; setT({ ...t, stage_execution: v }); void act(() => apiClient.updateCatalog2Task(task.id, { stage_execution: v, scope: "product" }), v === "stage" ? "Execução por etapa ligada: cada etapa agora tem as opções de qualificação e aprovação (veja nas etapas, logo abaixo)." : "Execução por etapa desligada."); }} /> execução por etapa (qualifica e aprova cada etapa) — salva na hora</label>
        {t.stage_execution === "stage" && (
          <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300" title="Quando o nômade recebe: a cada etapa aprovada, ou só no fim da tarefa (créditos retidos até a última etapa). Salva na hora." data-testid="stage-payout-select">Pagamento do nômade
            <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={task.stage_payout_mode ?? "at_end"} onChange={(e) => void act(() => apiClient.updateCatalog2Task(task.id, { stage_payout_mode: e.target.value, scope: "product" }), "Forma de pagamento do nômade salva.")}>
              <option value="at_end">Só no fim da tarefa (créditos retidos)</option>
              <option value="per_stage">A cada etapa aprovada</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">Ciclo
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.cycle_type} onChange={(e) => setT({ ...t, cycle_type: e.target.value })}>{Object.entries(CYCLE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">Repetição
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.repeat_rule} onChange={(e) => setT({ ...t, repeat_rule: e.target.value })}>{Object.entries(REPEAT_RULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {t.repeat_rule === "every_n_cycles" && <input type="number" min={1} className="w-14 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={t.repeat_every_cycles} onChange={(e) => setT({ ...t, repeat_every_cycles: e.target.value })} />}
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300" title="Quando a etapa de validação dos acessos pode ser dispensada ou precisa repetir">Regra de acessos
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.asset_rule} onChange={(e) => setT({ ...t, asset_rule: e.target.value })}>{Object.entries(ASSET_RULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {t.asset_rule === "every_x_days" && <input type="number" min={1} placeholder="dias" className="w-14 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={t.asset_revalidate_days} onChange={(e) => setT({ ...t, asset_revalidate_days: e.target.value })} />}
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300" title="Permitir continuidade com o mesmo executor do ciclo anterior">Continuidade do executor
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.executor_continuity} onChange={(e) => setT({ ...t, executor_continuity: e.target.value })}>{Object.entries(CONTINUITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label title="A entrega concluída só é aceita depois da aprovação de um líder/qualificador"><input type="checkbox" checked={t.requires_qualification} onChange={(e) => setT({ ...t, requires_qualification: e.target.checked })} /> qualificação obrigatória</label>
        <Button id={"task-effort:" + task.id} size="sm" variant="outline" className={`h-6 ${effortDone ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : effortHighlighted ? "border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-400 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-100" : ""}`} onClick={saveTask}>Salvar neste produto</Button>
        {task.task_model_id != null && <button type="button" className="text-[11px] text-slate-500 underline hover:text-slate-900" onClick={() => setScopeAsk(true)}>Atualizar modelo global…</button>}
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
      <TaskDependencyCascade task={task} version={version} readOnly={false} act={act} />
      <ConnectionsSection version={version} readOnly={false} act={act} scope={{ kind: "task", task: { key: task.key, name: task.name } }} />
      {effortHighlighted && <p className="text-amber-700 dark:text-amber-300">Dados provisórios de teste: revise os valores já preenchidos e clique em <strong>Salvar tarefa</strong> para confirmá-los como dados reais.</p>}
      {(t.execution_mode === "ia" || t.execution_mode === "hibrido") && <AiConfig task={task} act={act} onOpenPricing={() => void onOpenPricing?.(task.id)} />}
      {t.execution_mode === "humano" && task.ai && <p className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Esta tarefa está em execução humana. A configuração de IA existente fica inativa, não entra no preço e pode ser reaproveitada caso a execução por IA seja habilitada futuramente.</p>}
      <QuestionnaireSection task={task} refs={refs} act={act} />
      {task.task_model_id != null && <ModelScopeDialog embedded={inModelsTask} open={scopeAsk} kindLabel="tarefa" modelId={task.task_model_id} onCancel={() => setScopeAsk(false)} onChoose={(sc) => { setScopeAsk(false); void doSaveTask(sc); }} />}
    </div>
    </section>
  );
}

// A ordem de execução é uma regra da tarefa, não um "gatilho" genérico do
// produto. O catálogo guarda a regra como modelo; no lançamento, a agência
// poderá manter ou ajustar a dependência entre as tarefas daquele projeto.
function TaskDependencyCascade({ task, version, readOnly, act }: { task: any; version: any; readOnly: boolean; act: any }) {
  const current: string[] = task.depends_on ?? [];
  const [picked, setPicked] = useState("");
  const [adding, setAdding] = useState(false);
  const candidates = (version.tasks ?? []).filter((item: any) => item.id !== task.id && !current.includes(item.id));
  const enabled = current.length > 0 || adding;
  const removeAll = () => void act(
    () => Promise.all(current.map((id) => apiClient.deleteCatalog2TaskDependency(task.id, id))),
    "Dependência removida desta tarefa."
  );
  return (
    <section className="space-y-2 text-xs">
      <label className={`flex h-8 items-center gap-2 ${readOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}>
        <input type="checkbox" checked={enabled} disabled={readOnly} onChange={(e) => e.target.checked ? setAdding(true) : (setAdding(false), removeAll())} />
        <span className="font-semibold text-slate-800 dark:text-slate-100">Esta tarefa abre depois de outra ser finalizada</span>
      </label>
      {enabled && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-2.5 text-slate-800 dark:border-violet-900 dark:bg-violet-950/20 dark:text-slate-100">
          <p className="mb-1.5 font-semibold">Aguardar finalização destas tarefas</p>
          <div className="flex flex-wrap gap-1.5">
            {current.map((id) => {
              const predecessor = (version.tasks ?? []).find((item: any) => item.id === id);
              return <span key={id} className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-white px-2 py-1 text-[11px] dark:border-violet-800 dark:bg-slate-900">{predecessor?.name ?? "Tarefa removida"}{!readOnly && <button type="button" aria-label={`Remover dependência ${predecessor?.name ?? ""}`} className="ml-0.5 text-violet-700 hover:text-rose-600 dark:text-violet-200" onClick={() => void act(() => apiClient.deleteCatalog2TaskDependency(task.id, id), "Dependência removida.")}><X className="h-3.5 w-3.5" /></button>}</span>;
            })}
          </div>
          {!readOnly && candidates.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2">
            <select aria-label="Tarefa que precisa ser finalizada antes" className="h-8 min-w-56 rounded-md border border-violet-300 bg-white px-2 text-xs dark:border-violet-800 dark:bg-slate-900" value={picked} onChange={(e) => setPicked(e.target.value)}>
              <option value="">Adicionar tarefa anterior…</option>
              {candidates.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Button type="button" size="sm" variant="outline" disabled={!picked} onClick={() => { const id = picked; setPicked(""); setAdding(false); void act(() => apiClient.addCatalog2TaskDependency(task.id, id), "Dependência adicionada."); }}>Adicionar</Button>
          </div>}
          <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">Esta tarefa só fica disponível quando a tarefa anterior for concluída.</p>
        </div>
      )}
    </section>
  );
}

// "Cadastrar uma nova [especialidade] durante a configuração da tarefa,
// respeitando a permissão administrativa atual" (Item 3) — reaproveita
// POST /specialties (guardAdminMaster já se aplica a toda a rota).
function NewSpecialtyForm({ onCreated, act }: { onCreated: (s: any) => void; act: any }) {
  const [f, setF] = useState({ key: "", name: "", max_hourly_rate: "", execution_kind: "humano" });
  return (
    <div className="flex items-end gap-2 rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
      <Field label="key"><Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>
      <Field label="nome"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="valor/hora (opcional)"><Input type="number" value={f.max_hourly_rate} onChange={(e) => setF({ ...f, max_hourly_rate: e.target.value })} /></Field>
      <Field label="tipo"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={f.execution_kind} onChange={(e) => setF({ ...f, execution_kind: e.target.value })}>{EXEC_MODES.filter(([v]) => v !== "hibrido").map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Button
        size="sm"
        onClick={() =>
          f.key && f.name &&
          act(() => apiClient.addCatalog2Specialty({ key: f.key, name: f.name, max_hourly_rate: f.max_hourly_rate ? Number(f.max_hourly_rate) : null, execution_kind: f.execution_kind }), "Especialidade criada.")
            .then((s: any) => s && onCreated(s))
        }
      >
        Criar especialidade
      </Button>
    </div>
  );
}

// Questionário de contratação — estilo da plataforma antiga (17/10): na página só o questionário PRONTO (perguntas recolhíveis, só leitura);
// "+ Adicionar" e o lápis de cada pergunta abrem um MODAL; criar questionário novo também abre modal. A tarefa VINCULA um questionário
// (sincronizado com o modelo) ou uma CÓPIA independente. Editar um modelo usado por 2+ tarefas pede a escolha (cópia ou editar o modelo).
export function QuestionnaireSection({ task, refs, act, version, readOnly }: any) {
  const [mode, setMode] = useState<"idle" | "picker" | "create" | "preview">("idle");
  const [prefill, setPrefill] = useState<QuestionnaireState | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAsk, setAiAsk] = useState(false); // janela "o que a IA vai consultar" antes de gerar
  const hasSteps = (task.steps ?? []).length > 0;
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<QuestionnaireState | null>(null);
  const [confirm, setConfirm] = useState(false);
  const q = task.questionnaire;
  const ctx: Omit<QuestionCtx, "otherQuestions" | "sections"> = {
    steps: (task.steps ?? []).map((s: any) => ({ key: s.key, name: s.name })),
    variations: (version?.variations ?? []).map((v: any) => ({ key: v.key, name: v.name, options: (v.options ?? []).map((o: any) => ({ key: o.key, label: o.label })) })),
    addons: (version?.addons ?? []).map((a: any) => ({ key: a.key, name: a.name })),
  };
  const usedBy = (refs.questionnaires ?? []).find((x: any) => x.id === q?.id)?.task_count ?? 1;
  // D-7: a IA lê todos os campos cadastrados do produto/tarefa e sugere o questionário (mesmos tipos e configurações do construtor manual).
  const generate = async () => {
    setAiBusy(true); setAiErr(null);
    try {
      const r = await apiClient.suggestCatalog2TaskQuestionnaire(task.id);
      setPrefill({ name: r.name, description: r.description ?? "", sections: [], questions: r.questions.map(draftFromSuggestion), is_global_model: false });
      setMode("create");
    } catch (e: any) { setAiErr(e?.message ?? "Não foi possível usar a IA agora."); } finally { setAiBusy(false); }
  };
  const suggestMore = async (labels: string[]) => (await apiClient.suggestCatalog2TaskQuestionnaire(task.id, labels)).questions.map(draftFromSuggestion);

  // Grava o conteúdo inteiro (perguntas com IDs estáveis). Modelo usado por 2+ tarefas: antes pergunta (cópia ou editar o modelo).
  const run = (st: QuestionnaireState, extra: Record<string, unknown>) => {
    setSaving(true);
    act(async () => {
      const r: any = await apiClient.updateCatalog2TaskQuestionnaireContent(task.id, { ...questionnaireBody(st), ...extra } as any);
      if (st.is_global_model !== !!r.questionnaire?.is_global_model) await apiClient.setCatalog2QuestionnaireGlobal(r.questionnaire.id, st.is_global_model);
      return r;
    }, (r: any) => (r?.forked ? "Cópia independente salva só para esta tarefa — o modelo compartilhado ficou intacto." : "Questionário salvo."))
      .then((r: any) => { if (r) setPending(null); })
      .finally(() => setSaving(false));
  };
  const persist = (st: QuestionnaireState) => (usedBy > 1 ? setPending(st) : run(st, {}));

  if (q) {
    const st = stateFromServer(q);
    return (
      <div className="w-full min-w-0 space-y-3" data-testid="questionnaire-view">
        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 text-sm font-semibold">Questionário: {q.name}
              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-600" title="Identificador permanente do questionário" data-testid="questionnaire-id">ID {String(q.id).slice(0, 8)}</span>
              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-600" title="Versão do conteúdo (sobe a cada edição)">v{q.revision ?? 1}</span>
              {q.is_global_model && <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-normal text-violet-800">modelo global</span>}
              {usedBy > 1 && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-800" title="Editar o modelo afeta todas as tarefas que o usam">usado por {usedBy} tarefas</span>}
            </span>
            <div className="flex shrink-0 flex-wrap gap-1">
              <Button size="sm" variant="outline" className={BRAND_OUTLINE_CLASS} onClick={() => setMode(mode === "preview" ? "idle" : "preview")}><Eye className="h-3.5 w-3.5" /> {mode === "preview" ? "Fechar prévia" : "Visualizar como cliente"}</Button>
              {!readOnly && <>
                <Button size="sm" variant="outline" className={BRAND_OUTLINE_CLASS} onClick={() => setShowData(true)}><Pencil className="h-3.5 w-3.5" /> Dados e seções</Button>
                <Button size="sm" variant="outline" className={BRAND_OUTLINE_CLASS} title="Cria uma cópia independente (IDs novos) e vincula a cópia a esta tarefa" onClick={() => act(() => apiClient.setCatalog2TaskQuestionnaire(task.id, q.id, "copy"), "Cópia independente criada e vinculada a esta tarefa.")}><Copy className="h-3.5 w-3.5" /> Duplicar</Button>
                <Button size="sm" variant="outline" className="border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => act(() => apiClient.setCatalog2TaskQuestionnaire(task.id, null), "Questionário desvinculado.")}><Unlink className="h-3.5 w-3.5" /> Desvincular</Button>
              </>}
            </div>
          </div>
          {q.description && <p className="mt-1 text-xs text-neutral-500">{q.description}</p>}
        </div>
        {mode === "preview" && <QuestionnairePreview state={st} />}
        <QuestionList questions={st.questions} sections={st.sections} ctx={ctx} readOnly={readOnly} busy={saving} onChange={(qs) => persist({ ...st, questions: qs })} />
        {showData && <QuestionnaireDataModal initial={{ name: st.name, description: st.description, sections: st.sections, is_global_model: st.is_global_model }} usedByCount={usedBy} onClose={() => setShowData(false)} onSave={(v) => { setShowData(false); persist({ ...st, ...v }); }} />}
        {pending && (
          <Dialog open onOpenChange={(o) => { if (!o) setPending(null); }}>
            <DialogContent className="max-w-xl" data-testid="shared-choice">
              <DialogTitle>Este questionário é usado por {usedBy} tarefas</DialogTitle>
              <div className="space-y-3 text-sm">
                <p>Escolha como salvar. Nada muda em silêncio e contratações já feitas nunca são alteradas.</p>
                <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <Button size="sm" disabled={saving} onClick={() => run(pending, { shared_mode: "copy" })}>Criar uma cópia independente (só esta tarefa)</Button>
                  <p className="text-[11px] text-emerald-900">Recomendado: o modelo e os outros produtos ficam como estão.</p>
                </div>
                <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />Entendo que isto altera o modelo para todas as tarefas que o usam</label>
                  <Button size="sm" variant="outline" disabled={saving || !confirm} onClick={() => run(pending, { shared_mode: "edit_shared", confirm_shared: true })}>Editar o modelo global</Button>
                </div>
                <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setPending(null)}>Voltar</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  if (readOnly) return <p className="text-xs text-slate-500" data-testid="questionnaire-none">Nenhum questionário vinculado. Clique em “Editar” (no topo) para vincular ou criar um.</p>;
  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setMode(mode === "picker" ? "idle" : "picker")}><Link2 className="h-3.5 w-3.5" /> Selecionar questionário existente</Button>
        <Button size="sm" variant="outline" onClick={() => { setPrefill(null); setMode("create"); }}><Plus className="h-3.5 w-3.5" /> Criar novo questionário</Button>
        <button type="button" data-testid="ai-questionnaire" disabled={aiBusy || !hasSteps} onClick={() => setAiAsk(true)} title={hasSteps ? "A IA lê a tarefa e as etapas cadastradas e sugere as perguntas, com os mesmos tipos e configurações do construtor. Antes, você confirma o que ela vai consultar." : "Cadastre ao menos uma etapa na tarefa: a IA monta o questionário a partir delas."} className="inline-flex h-8 items-center gap-1 rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#2563eb,#7c3aed))] px-3 text-xs font-semibold text-white disabled:opacity-60"><Sparkles className="h-3.5 w-3.5" />{aiBusy ? "Gerando…" : "Gerar questionário com IA"}</button>
      </div>
      {!hasSteps && <p className="text-[11px] text-slate-500" data-testid="ai-questionnaire-needs-steps">Para gerar com IA, cadastre primeiro a tarefa e as etapas. Você também pode montar o questionário manualmente.</p>}
      {aiErr && <p role="alert" className="text-[11px] font-semibold text-red-600">{aiErr}</p>}
      {aiAsk && (
        <Dialog open onOpenChange={(o) => { if (!o) setAiAsk(false); }}>
          <DialogContent className="max-h-[calc(100dvh-9rem)] w-[96vw] max-w-2xl overflow-y-auto sm:max-w-2xl" data-testid="ai-questionnaire-confirm">
            <DialogTitle>A IA vai consultar o que está cadastrado</DialogTitle>
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">Confira o fluxo abaixo. Com base nele, a IA sugere as perguntas que o cliente precisa responder. Nada é criado sem a sua revisão.</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tarefa</p>
                <p className="font-semibold text-slate-900">{task.name}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Etapas, na ordem do fluxo ({(task.steps ?? []).length})</p>
                <ol className="mt-1 space-y-1">
                  {(task.steps ?? []).map((st: any, n: number) => (
                    <li key={st.id ?? st.key} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="section-number-badge flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">{n + 1}</span>
                      <span className="min-w-0"><strong>{st.name}</strong>{st.execution_mode ? <span className="text-slate-500"> · {st.execution_mode === "ia" ? "IA" : st.execution_mode === "hibrido" ? "Humano + IA" : "Humano"}</span> : null}{st.estimated_minutes ? <span className="text-slate-500"> · {fmtBusinessMinutes(st.estimated_minutes)}</span> : null}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-slate-600">Também serão lidos: {(task.deliverables ?? []).length} entregável(is), {accessCount(version)} acesso(s) configurado(s), {(version?.variations ?? []).length} variação(ões) e {(version?.addons ?? []).length} adicional(is).</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAiAsk(false)}>Cancelar</Button>
                <button type="button" data-testid="ai-questionnaire-go" onClick={() => { setAiAsk(false); void generate(); }} className="inline-flex h-8 items-center gap-1 rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#2563eb,#7c3aed))] px-3 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5" />Consultar e gerar questionário</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {mode === "picker" && <QuestionnairePicker task={task} act={act} />}
      {mode === "create" && (
        <Dialog open onOpenChange={(o) => { if (!o) { setMode("idle"); setPrefill(null); } }}>
          <DialogContent className="max-h-[calc(100dvh-9rem)] w-[96vw] max-w-4xl overflow-y-auto sm:max-w-4xl" data-testid="questionnaire-create-modal">
            <DialogTitle>Novo questionário</DialogTitle>
            <NewQuestionnaireForm key={prefill ? "ai" : "manual"} taskId={task.id} act={act} ctx={ctx} initial={prefill ?? undefined} onSuggest={suggestMore} onDone={() => { setMode("idle"); setPrefill(null); }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Biblioteca de questionários: busca por ID, nome, pergunta, produto, categoria ou especialidade; vincula sincronizado ou como cópia independente.
function QuestionnairePicker({ task, act }: { task: any; act: any }) {
  const [f, setF] = useState({ q: "", product: "", category: "", specialty: "", global: false });
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [link, setLink] = useState<"sync" | "copy">("sync");
  const search = async () => { setErr(null); try { setRows((await apiClient.getCatalog2Questionnaires(f)).data ?? []); } catch (e: any) { setErr(e?.message ?? "Não foi possível buscar."); } };
  useEffect(() => { void search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800" data-testid="questionnaire-picker">
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <Input aria-label="Buscar questionário por nome ou ID" className="h-8 text-xs" placeholder="Nome, ID ou texto de pergunta…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <Input aria-label="Filtrar por produto" className="h-8 text-xs" placeholder="Produto (nome ou nº)" value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <Input aria-label="Filtrar por categoria" className="h-8 text-xs" placeholder="Categoria" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <Input aria-label="Filtrar por especialidade" className="h-8 text-xs" placeholder="Especialidade" value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.global} onChange={(e) => setF({ ...f, global: e.target.checked })} />Só modelos globais</label>
        <Button size="sm" variant="outline" className="h-7" onClick={() => void search()}>Buscar</Button>
      </div>
      {err && <p role="alert" className="text-[11px] text-red-600">{err}</p>}
      {rows && rows.length === 0 && <p className="text-[11px] text-slate-500">Nenhum questionário encontrado.</p>}
      <ul className="max-h-56 space-y-1 overflow-y-auto" role="radiogroup" aria-label="Questionários existentes">
        {(rows ?? []).map((qn) => (
          <li key={qn.id}>
            <label className={`flex cursor-pointer items-start gap-2 rounded border px-2 py-1 text-xs ${pick === qn.id ? "border-violet-400 bg-violet-50" : "border-slate-200"}`}>
              <input type="radio" name="qn-pick" className="mt-0.5" checked={pick === qn.id} onChange={() => setPick(qn.id)} />
              <span className="min-w-0"><strong>{qn.name}</strong> <span className="text-slate-500">· ID {String(qn.id).slice(0, 8)} · {qn.question_count} pergunta(s) · {qn.task_count} uso(s) · v{qn.revision}</span>{qn.is_global_model && <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] text-violet-800">modelo global</span>}
                {(qn.products?.length ?? 0) > 0 && <span className="block truncate text-[11px] text-slate-500">{qn.products.join(" · ")}</span>}</span>
            </label>
          </li>
        ))}
      </ul>
      <fieldset className="flex flex-wrap items-center gap-3 text-[11px]">
        <legend className="sr-only">Como vincular</legend>
        <label className="inline-flex items-center gap-1"><input type="radio" name="qn-link" checked={link === "sync"} onChange={() => setLink("sync")} />Vincular mantendo sincronizado</label>
        <label className="inline-flex items-center gap-1"><input type="radio" name="qn-link" checked={link === "copy"} onChange={() => setLink("copy")} />Criar uma cópia independente</label>
        <Button size="sm" disabled={!pick} onClick={() => act(() => apiClient.setCatalog2TaskQuestionnaire(task.id, pick, link), link === "copy" ? "Cópia independente criada e vinculada." : "Questionário vinculado.")}>Vincular</Button>
      </fieldset>
      <p className="text-[10px] text-slate-500">Sincronizado: alterações no modelo valem para todas as tarefas que o usam (só para novas contratações). Cópia: IDs novos, nada muda nos outros produtos.</p>
    </div>
  );
}

// Cria um questionário novo (nome + seções + perguntas) e já vincula à tarefa atual ao salvar. Roda dentro de um modal.
function NewQuestionnaireForm({ taskId, act, onDone, initial, ctx, onSuggest }: { taskId: string; act: any; onDone: () => void; initial?: QuestionnaireState; ctx: Omit<QuestionCtx, "otherQuestions" | "sections">; onSuggest?: (labels: string[]) => Promise<QuestionDraft[]> }) {
  // Evita duplicar o questionário se o admin clicar "Criar e vincular" repetidas vezes enquanto as chamadas ainda estão em andamento.
  const [saving, setSaving] = useState(false);
  async function save(s: QuestionnaireState) {
    const created: any = await apiClient.addCatalog2Questionnaire({ name: s.name.trim(), description: s.description.trim() || null, sections: s.sections.map((x) => ({ key: x.key, name: x.name.trim() || x.key, description: x.description.trim() || null })), is_global_model: s.is_global_model });
    for (const [i, q] of s.questions.entries()) await apiClient.addCatalog2QuestionnaireQuestion(created.id, { ...payloadFromDraft(q), sort_order: i + 1 });
    await apiClient.setCatalog2TaskQuestionnaire(taskId, created.id);
    return true;
  }
  return (
    <QuestionnaireEditor
      initial={initial ?? { name: "", description: "", sections: [], questions: [], is_global_model: false }}
      ctx={ctx} saving={saving} saveLabel="Criar e vincular" onSuggest={onSuggest}
      notice={initial ? <p className="text-[11px] text-violet-700">Sugestão da IA: revise, edite, remova ou adicione perguntas antes de criar.</p> : undefined}
      onSave={(s) => { setSaving(true); act(() => save(s), "Questionário criado e vinculado.").then((ok: boolean | undefined) => { if (ok) onDone(); }).finally(() => setSaving(false)); }}
      onCancel={onDone}
    />
  );
}
// A duração pertence à etapa. A tarefa reúne o total de suas etapas, sem
// transferir horas antigas para novas linhas automaticamente.
function AddStepControl({ refs, ringClass, domId, task, act }: { refs?: any; ringClass?: string; domId?: string; task?: any; act: any }) {
  const defaults = () => ({
    name: task?.name ?? "",
    estimated_hours: "",
    specialty_id: task?.specialty?.id ?? "",
    purpose: "execucao",
    execution_mode: task?.execution_mode ?? "humano",
    completion_criteria: "",
  });
  const [s, setS] = useState(defaults);
  const [showCreate, setShowCreate] = useState(false);
  const [pick, setPick] = useState(false);
  const [similarAsk, setSimilarAsk] = useState<any[] | null>(null);
  const [asDraft, setAsDraft] = useState(false);
  const createStep = (justification?: string, draft?: boolean) => act(() => apiClient.addCatalog2Step(task.id, { name: s.name.trim(), estimated_minutes: s.estimated_hours ? Math.round(Number(s.estimated_hours) * 60) : null, specialty_id: s.specialty_id || null, purpose: s.purpose, execution_mode: s.execution_mode, completion_criteria: s.completion_criteria.trim() || null, client_action_id: `step-${task.id}-${Date.now()}`, ...(justification ? { duplicate_resolution: "create_anyway", duplicate_justification: justification } : {}), ...((draft ?? asDraft) ? { draft: true } : {}) }), (draft ?? asDraft) ? "Rascunho da etapa criado. Abra “Editar” para continuar do mesmo ponto." : "Etapa criada e cadastrada no catálogo global de modelos.", { rethrow: true })
    .then((r: any) => { if (r) { setS(defaults()); setShowCreate(false); } })
    .catch((e: any) => { if (e?.code === "duplicate_model_candidates" && Array.isArray(e?.data?.details?.candidates)) setSimilarAsk(e.data.details.candidates); });
  useEffect(() => { setS(defaults()); }, [task?.id, task?.name, task?.specialty?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Criar nova etapa": nasce como RASCUNHO e abre direto o editor completo da etapa (Painel Moldura, 6 blocos), sem formulário pequeno.
  const [askCycles, setAskCycles] = useState(false);
  // Antes de criar, pergunta se a etapa é em ciclos (ex.: gestão semanal). Se for, já nasce com os ciclos padrão para ajustar um a um no editor.
  const startNew = async (withCycles = false) => {
    setAskCycles(false);
    const r: any = await act(() => apiClient.addCatalog2Step(task.id, { name: "Nova etapa", ...(withCycles ? { ops: { cycles: { items: generateCycles(7, 30, 2) } } } : {}), specialty_id: task?.specialty?.id ?? null, execution_mode: task?.execution_mode ?? "humano", purpose: "execucao", client_action_id: `step-${task.id}-${Date.now()}`, duplicate_resolution: "create_anyway", duplicate_justification: "Etapa nova criada como rascunho para ser configurada no editor completo.", draft: true }), "Etapa nova criada como rascunho: preencha e salve.", { rethrow: true }).catch(() => null);
    if (r?.id) window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: r.id } })), 700);
  };
  return (
    <li id={domId} className={`space-y-2 ${ringClass ?? ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-gradient-to-b from-sky-50 to-white px-3 text-xs font-semibold text-sky-700 shadow-sm transition hover:border-sky-400 hover:from-sky-100 active:scale-[0.98] dark:border-sky-800 dark:from-sky-950/40 dark:to-slate-900 dark:text-sky-200"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white"><Plus className="h-3 w-3" strokeWidth={3} /></span> Adicionar etapa <ChevronDown className="h-3.5 w-3.5 opacity-70" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { setPick(true); setShowCreate(false); }}><Search className="h-4 w-4" /> Selecionar etapa existente</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAskCycles(true)} data-testid="create-new-step"><Plus className="h-4 w-4" /> Criar nova etapa</DropdownMenuItem>
          <DropdownMenuItem onClick={() => act(() => apiClient.addCatalog2AccessValidationStep(task.id), "Etapa \"Validação e organização dos acessos\" adicionada no início da tarefa.")}><ChevronRight className="h-4 w-4" /> Validação e organização dos acessos (padrão)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={askCycles} onOpenChange={(o) => { if (!o) setAskCycles(false); }}>
        <DialogContent className="max-w-lg" data-testid="step-ask-cycles">
          <DialogTitle>Esta etapa é em ciclos?</DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">Etapa <strong>em ciclos</strong> é a que dura vários períodos seguidos, como a gestão semanal de campanhas durante um mês. Cada ciclo tem suas datas, o seu prazo de aprovação do cliente e, se quiser, a sua regra.</p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button type="button" className="flex-1 text-white shadow-md hover:brightness-110" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} onClick={() => void startNew(true)} data-testid="step-ask-cycles-yes">Sim, é em ciclos</Button>
            <Button type="button" variant="outline" className="flex-1 border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={() => void startNew(false)} data-testid="step-ask-cycles-no">Não, é uma etapa comum</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="max-h-[calc(100dvh-9rem)] w-[96vw] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Nova etapa</DialogTitle>
        <div className="space-y-3" data-testid="step-create-modal">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Nome"><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
            <Field label="Finalidade"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={s.purpose} onChange={(e) => setS({ ...s, purpose: e.target.value })}>{Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Executor"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={s.execution_mode} onChange={(e) => setS({ ...s, execution_mode: e.target.value, specialty_id: keepSpecialtyForMode(refs?.specialties, s.specialty_id, e.target.value) })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Especialidade"><SpecialtySelect refs={refs} mode={s.execution_mode} value={s.specialty_id} onChange={(v: string) => setS({ ...s, specialty_id: v })} /></Field>
            <Field label="Horas estimadas"><DurationInput className="h-9 w-24 rounded-md border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900" ariaLabel="Horas estimadas" value={s.estimated_hours} onChange={(v) => setS({ ...s, estimated_hours: v })} /></Field>
          </div>
          <Field label="Critério de conclusão"><Input value={s.completion_criteria} onChange={(e) => setS({ ...s, completion_criteria: e.target.value })} placeholder="Quando esta etapa pode ser considerada concluída?" /></Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={!s.name.trim()} onClick={() => { setAsDraft(false); void createStep(undefined, false); }}>Criar etapa</Button>
            <Button size="sm" variant="outline" disabled={!s.name.trim()} data-testid="step-create-draft" title="Cria a etapa só com o que já foi preenchido, marcada como rascunho incompleto (não é liberada para execução nem publicada). Dê ao menos um nome." onClick={() => { setAsDraft(true); void createStep(undefined, true); }}>Salvar rascunho da etapa</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
      {similarAsk && <SimilarModelsDialog kind="step" similar={similarAsk} onCancel={() => setSimilarAsk(null)} onUse={(id) => { setSimilarAsk(null); void act(() => apiClient.addCatalog2StepFromModel(task.id, id), "Etapa adicionada a partir do modelo global.").then(() => { setS(defaults()); setShowCreate(false); }); }} onCreateAnyway={(why) => { setSimilarAsk(null); void createStep(why); }} />}
      <ModelPickerDialog kind="step" open={pick} refs={refs} onClose={() => setPick(false)} onPick={(id) => act(() => apiClient.addCatalog2StepFromModel(task.id, id), "Etapa adicionada a partir do modelo global.")} />
    </li>
  );
}

// ── 6. Condições ────────────────────────────────────────────────────
function ConditionsTab({ version, readOnly, act }: any) {
  const [c, setC] = useState({ key: "", name: "", trigger_source: "variation_option", trigger_ref: "", operator: "selected", comparison_value: "", effect_type: "add_deadline_days", effect_value: "", charge_scope: "recurring" } as any);
  const [newConditionOpen, setNewConditionOpen] = useState(false);
  const [selectedAddonKeys, setSelectedAddonKeys] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  useEffect(() => {
    setSelectedAddonKeys((version.addons ?? []).filter((addon: any) => addon.is_default_selected).map((addon: any) => addon.key));
  }, [version.id]);
  const simulateDeadline = useCallback(async () => {
    setSimulating(true);
    try {
      const response = await apiClient.simulateCatalog2(version.id, { variation_option_keys: [], addon_keys: selectedAddonKeys, quantity: 1, answers: {} });
      setSimulation(response.pricing);
    } catch {
      setSimulation(null);
    } finally {
      setSimulating(false);
    }
  }, [version.id, selectedAddonKeys]);
  useEffect(() => { void simulateDeadline(); }, [simulateDeadline]);
  const addonName = (key?: string | null) => (version.addons ?? []).find((addon: any) => addon.key === key)?.name ?? key ?? "adicional";
  const deadlineLabel = (condition: any) => {
    const days = Number(condition.effect_value);
    if (condition.effect_type !== "add_deadline_days" || !Number.isFinite(days)) return condition.effect_value;
    return `+${days} ${days === 1 ? "dia" : "dias"} no prazo`;
  };
  const simulatedDeadline = simulation?.deadline?.commercial_deadline_days;
  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-slate-500">Regras tipadas (gatilho → efeito), sem código livre.</p>
        {!readOnly && <button type="button" onClick={() => setNewConditionOpen((open) => !open)} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-violet-400 bg-white px-3 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:bg-slate-900"><Plus className="h-3.5 w-3.5" />Nova condição</button>}
      </div>
      <h3 className="px-1 text-base font-bold text-slate-800 dark:text-slate-100">Regras de prazo</h3>
      {version.conditions.map((x: any) => (
        <div key={x.id} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"><Link2 className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-50">{addonName(x.trigger_ref)}</p>
            <p className="truncate text-[11px] text-slate-500">Quando: adicional “{x.trigger_ref}” selecionado</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">{deadlineLabel(x)}</span>
          <span className={`hidden shrink-0 items-center gap-1 text-[11px] font-medium sm:inline-flex ${x.is_active ? "text-emerald-700" : "text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${x.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />{x.is_active ? "Regra ativa" : "Inativa"}</span>
          {!readOnly && <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Mais opções para ${addonName(x.trigger_ref)}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-violet-700"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => act(() => apiClient.updateCatalog2Condition(x.id, { is_active: !x.is_active }), x.is_active ? "Regra pausada." : "Regra reativada.")}>{x.is_active ? "Pausar regra" : "Ativar regra"}</DropdownMenuItem><DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => { if (window.confirm("Excluir esta condição?")) void act(() => apiClient.deleteCatalog2Condition(x.id), "Condição removida."); }}>Excluir regra</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
        </div>
      ))}
      {version.conditions.length === 0 && <p className="px-1 text-xs text-slate-400">Nenhuma condição cadastrada.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="min-w-0"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">Impacto estimado: prazo base de {version.base_commercial_deadline_days ?? "—"} dias + condições selecionadas{simulatedDeadline != null ? ` · ${simulatedDeadline} dias` : ""}</p><p className="mt-0.5 text-[11px] text-slate-500">As opções adicionais selecionadas recalculam automaticamente a data de entrega.</p></div>
        <Popover><PopoverTrigger asChild><button type="button" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-violet-400 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:bg-slate-900"><CalendarClock className="h-3.5 w-3.5" />{simulating ? "Calculando…" : "Simular prazo"}</button></PopoverTrigger><PopoverContent align="end" className="w-72 p-3"><p className="text-sm font-semibold text-slate-900">Adicionais do cenário</p><p className="mt-0.5 text-xs text-slate-500">Marque as opções para recalcular o prazo real.</p><div className="mt-3 space-y-2">{(version.addons ?? []).map((addon: any) => <label key={addon.id} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={selectedAddonKeys.includes(addon.key)} onChange={(event) => setSelectedAddonKeys((keys) => event.target.checked ? [...keys, addon.key] : keys.filter((key) => key !== addon.key))} />{addon.name}</label>)}</div><p className="mt-3 rounded-lg bg-violet-50 px-2.5 py-2 text-xs font-semibold text-violet-800">Prazo simulado: {simulatedDeadline == null ? "a calcular" : `${simulatedDeadline} dias`}</p></PopoverContent></Popover>
      </div>
      {!readOnly && newConditionOpen && (
        <FramedModal open onOpenChange={setNewConditionOpen} testId="new-condition-modal" title="Nova condição">
          <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Nova condição</p><p className="truncate text-xs text-slate-500">Regra tipada: quando o gatilho acontece, o efeito é aplicado ao prazo ou ao preço.</p></div>
            <Button size="sm" variant="outline" onClick={() => setNewConditionOpen(false)}>Fechar</Button>
          </div>
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
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
          </div>
        </FramedModal>
      )}
    </div>
  );
}

// ── 7. Custos e preço (simulador) ───────────────────────────────────
// Prazo comercial base da versão: é o que o cliente vê como prazo de entrega.
// Não é a soma das tarefas (isso é só a estimativa interna de esforço).
export function DeadlineBaseField({ version, act, ringOf, locked, compact = false }: any) {
  const wc = useWorkCalendar();
  // O prazo comercial é informado em HORAS úteis; os dias úteis ao lado são o reflexo (arredondado para cima). Dado antigo só em dias vira horas pelo expediente.
  const hoursOf = (x: any) => (x.base_commercial_deadline_hours != null ? x.base_commercial_deadline_hours : x.base_commercial_deadline_days != null ? x.base_commercial_deadline_days * 24 : null);
  // A unidade escolhida (minutos, horas ou dias) PERMANECE: o servidor guarda sempre em horas, mas a tela mostra na unidade que a pessoa escolheu.
  const unitKey = `catalog2:deadline-unit:${version.id}`;
  const [unit, setUnitState] = useState<"min" | "h" | "d">(() => { try { const u = window.localStorage.getItem(unitKey); return u === "min" || u === "d" ? u : "h"; } catch { return "h"; } });
  const fromHours = (hrs: number | null, u: "min" | "h" | "d") => (hrs == null ? "" : u === "min" ? String(hrs * 60) : u === "d" ? String(Number((hrs / 24).toFixed(2))) : String(hrs));
  const [v, setV] = useState<string>(() => fromHours(hoursOf(version), unit));
  const unitRef = useRef(unit); unitRef.current = unit;
  const vRef = useRef(v); vRef.current = v;
  useEffect(() => {
    // Depois de salvar, a versão volta do servidor em horas: só reescreve o campo se o que está digitado NÃO equivale a esse valor (ex.: outra pessoa mudou).
    const serverH = hoursOf(version);
    const n0 = Number(String(vRef.current).replace(",", "."));
    const u = unitRef.current;
    const typedH = vRef.current !== "" && Number.isFinite(n0) && n0 > 0 ? (u === "min" ? Math.ceil(n0 / 60) : u === "d" ? Math.ceil(n0 * 24) : n0) : null;
    if (typedH !== null && typedH === serverH) return;
    setV(fromHours(serverH, u));
  }, [version.id, version.base_commercial_deadline_days, version.base_commercial_deadline_hours, wc.business_hours_per_day]); // eslint-disable-line react-hooks/exhaustive-deps
  // R21-15 (reunião 21/10): o prazo pode ser digitado em minutos, horas ou dias; o sistema converte sozinho para HORAS (o que é guardado). Minutos sobem para a hora inteira seguinte.
  const readOnly = version.state === "publicada" || !!locked;
  const setUnit = (u: "min" | "h" | "d") => { setUnitState(u); try { window.localStorage.setItem(unitKey, u); } catch { /* sem armazenamento: vale só nesta tela */ } };
  const num = Number(String(v).replace(",", "."));
  const typed = v !== "" && Number.isFinite(num) && num > 0;
  const h = !typed ? NaN : unit === "min" ? Math.ceil(num / 60) : unit === "d" ? Math.ceil(num * 24) : num;
  const valid = typed && Number.isInteger(h) && h >= 1;
  const unitLabel = unit === "min" ? "minutos" : unit === "d" ? "dias" : "horas";
  const convNote = valid && unit !== "h" ? (unit === "min" ? `${num} min = ${h} h (sobe para a hora inteira; o sistema guarda em horas)` : `${num} dia(s) = ${h} h`) : "";
  const changeUnit = (u: "min" | "h" | "d") => { if (valid) setV(u === "min" ? String(h * 60) : u === "d" ? String(Number((h / 24).toFixed(2))) : String(h)); setUnit(u); };
  const unitSelect = (cls: string) => <select aria-label="Unidade do prazo comercial" data-testid="deadline-unit" disabled={readOnly} value={unit} onChange={(e) => changeUnit(e.target.value as "min" | "h" | "d")} className={cls}><option value="min">minutos</option><option value="h">horas</option><option value="d">dias</option></select>;
  // 24 horas = 1 dia: o reflexo mostra a fração (5 h ≈ 0,21 dia); o sistema guarda o inteiro arredondado para cima (mínimo 1).
  const n = valid ? Math.max(1, Math.ceil(h / 24)) : 0;
  const dayFrac = valid ? h / 24 : 0;
  const dayText = valid ? `${dayFrac.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${dayFrac > 1 ? "dias" : "dia"}` : "";
  const dirty = valid && h !== hoursOf(version);
  // Prazo sugerido pelas etapas (horas úteis → dias úteis do calendário da plataforma).
  const stepsMinutes = (version.tasks ?? []).filter((t: any) => !t.is_conditional).reduce((a: number, t: any) => a + flowSummary(t.steps ?? []).criticalMinutes, 0);
  const suggestedDays = stepsMinutes > 0 ? Math.max(1, Math.ceil(stepsMinutes / 60 / wc.business_hours_per_day)) : null;
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);
  const save = async () => {
    setErr(null); setOkMsg(false);
    try { await act(() => apiClient.updateCatalog2VersionInfo(version.id, { base_commercial_deadline_hours: h }), "Prazo comercial salvo.", { rethrow: true }); setOkMsg(true); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível salvar o prazo."); }
  };
  // Salva sozinho 1 s depois de parar de digitar (antes só salvava ao sair do campo ou com Enter, e parecia que não gravava).
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    if (!compact || readOnly || !dirty) return;
    const t = window.setTimeout(() => { void saveRef.current(); }, 1000);
    return () => window.clearTimeout(t);
  }, [h, dirty, compact, readOnly]);
  if (compact) return (
    <div id="catalog2-deadline-base" className={`flex h-full min-w-0 flex-col gap-2.5 px-1 md:pr-5 ${ringOf("catalog2-deadline-base")}`}>
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><CalendarClock className="h-4 w-4" /></span>
        <span className="min-w-0"><span className="block text-[14px] font-bold text-slate-900 dark:text-slate-100">Prazo comercial<span className="field-info" data-help="Prazo prometido ao cliente, informado em HORAS úteis. 24 h = 1 dia. O sistema guarda o dia inteiro arredondado para cima (mínimo 1)." aria-hidden="true">i</span></span><span className="block text-[11px] text-slate-500">Prazo prometido ao cliente</span></span>
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" min={unit === "d" ? 0.04 : 1} step={unit === "d" ? "any" : 1} aria-label={`Prazo comercial base em ${unitLabel}`} className="h-10 w-28 rounded-lg border border-slate-300 bg-white px-3 text-right text-lg font-bold text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" value={v} disabled={readOnly} onChange={(e) => { setV(e.target.value); setOkMsg(false); }} onBlur={() => { if (dirty) void save(); }} onKeyDown={(e) => { if (e.key === "Enter" && dirty) void save(); }} />
        {unitSelect("h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200")}
      </div>
      <p className="text-[11px] leading-snug text-slate-500" data-testid="deadline-days-reflex">
        {valid ? <><span className="mr-1.5 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">= {dayText}</span>{convNote ? <span data-testid="deadline-conversion">{convNote} · </span> : null}24 h = 1 dia</> : "Informe o prazo (minutos, horas ou dias); o equivalente em dias aparece aqui."}
        {err ? <span className="ml-2 font-semibold text-red-600">{err}</span> : null}{okMsg ? <span className="ml-2 font-semibold text-emerald-700" data-testid="deadline-saved">✓ Prazo salvo</span> : null}
      </p>
      {!readOnly && <button type="button" disabled={!valid} onClick={(event) => { event.preventDefault(); void save(); }} className="sr-only">Salvar prazo</button>}
    </div>
  );
  if (false) return <label id="catalog2-deadline-base" className={`flex h-[52px] min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800/40 ${ringOf("catalog2-deadline-base")}`}><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">Prazo comercial base</span><span className="block text-[10px] text-slate-500">Prazo prometido ao cliente</span></span><span className="inline-flex shrink-0 items-baseline gap-1"><Input type="number" min={1} className="h-8 w-10 border-0 bg-transparent p-0 text-right text-base font-bold text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} /><span className="text-xs font-semibold text-slate-700 dark:text-slate-200">dias</span></span>{!readOnly && <button type="button" disabled={!valid} onClick={(event) => { event.preventDefault(); void save(); }} className="sr-only">Salvar prazo</button>}</label>;
  return (
    <div id="catalog2-deadline-base" className={`h-full min-w-0 rounded-xl ${ringOf("catalog2-deadline-base")}`}>
      <SetupCard icon={CalendarClock} title="Prazo comercial base" summary={valid ? `${h} h (${dayText})` : "não definido"} help="É o prazo que o cliente vê para este produto. Variações, adicionais e condições podem acrescentar dias; o tempo interno das tarefas não substitui este prazo." scroll>
        <p className="text-[11px] text-slate-500">Prazo prometido ao cliente nesta versão. Dias extras de variações, adicionais e condições somam a ele.</p>
        <div className="flex items-center gap-2">
          <Input type="number" min={unit === "d" ? 0.04 : 1} step={unit === "d" ? "any" : 1} aria-label={`Prazo comercial base em ${unitLabel}`} className="h-8 w-24 text-sm" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} />
          {unitSelect("h-8 rounded-md border border-slate-300 bg-white px-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200")}
          {valid && <span className="text-sm font-semibold text-violet-700" data-testid="deadline-hours">= {dayText} (24 h = 1 dia)</span>}
          <SaveButton disabled={readOnly || !valid} onClick={() => void save()}>Salvar prazo</SaveButton>
        </div>
        {suggestedDays != null && (
          <p className="text-[11px] text-slate-600" data-testid="deadline-suggestion">Pelas etapas cadastradas: <strong>{fmtBusinessMinutes(stepsMinutes)} úteis</strong> (≈ {suggestedDays} dia{suggestedDays > 1 ? "s" : ""} útil{suggestedDays > 1 ? "eis" : ""}).{!readOnly && n !== suggestedDays && <> <button type="button" className="font-semibold text-indigo-700 underline" onClick={() => setV(String(suggestedDays))}>Usar {suggestedDays} dia{suggestedDays > 1 ? "s" : ""}</button></>}</p>
        )}
        {readOnly && <p className="text-[11px] text-amber-700">Versão publicada ou travada (somente leitura). Clique em Editar para alterar.</p>}
        {!readOnly && v !== "" && !valid && <p className="text-[11px] text-red-600">Informe um prazo válido: horas inteiras (1 ou mais), ou minutos/dias.</p>}
        {err && <p role="alert" className="text-xs font-semibold text-red-600">Não salvou: {err}</p>}
        {okMsg && <p role="status" className="text-xs font-semibold text-emerald-700">✓ Prazo salvo.</p>}
      </SetupCard>
    </div>
  );
}

function CostTab({ version, refs, act, onReloadRefs, productId, highlightTarget, clearHighlight }: any) {
  const ringOf = useContext(RingCtx);
  const [sel, setSel] = useState<any>({ variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} });
  const [result, setResult] = useState<any>(null);
  const [open, setOpen] = useState<"overview" | "composition" | "scenario" | "periods" | "rules">("overview");

  useEffect(() => {
    // default selection
    const opts: string[] = [];
    for (const va of version.variations) { const d = va.options.find((o: any) => o.is_default) ?? va.options[0]; if (d) opts.push(d.key); }
    setSel({ variation_option_keys: opts, addon_keys: version.addons.filter((a: any) => a.is_default_selected).map((a: any) => a.key), quantity: 1, answers: {} });
  }, [version.id]);

  const run = () => apiClient.simulateCatalog2(version.id, sel).then((r: any) => setResult(r.pricing)).catch((e: any) => setResult({ error: e?.message }));
  const ratesSig = JSON.stringify((refs?.specialties ?? []).map((sp: any) => [sp.id, sp.max_hourly_rate]));
  // Recalcula também quando o valor/hora de uma especialidade muda (ex.: editado dentro de uma etapa) ou quando uma etapa é alterada.
  useEffect(() => { void run(); /* eslint-disable-next-line */ }, [JSON.stringify(sel), version.id, ratesSig, JSON.stringify((version.tasks ?? []).map((t: any) => (t.steps ?? []).map((st: any) => [st.id, st.estimated_minutes, st.specialty_id, st.executor_kind])))]);

  const Card = ({ keyName, icon: Icon, title, subtitle, status }: any) => <button type="button" onClick={() => setOpen(keyName)} className="flex min-h-[112px] items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800 dark:text-slate-100">{title}</span><span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span></span><Badge className={status?.pending ? "border-0 bg-amber-100 text-amber-800" : "border-0 bg-emerald-100 text-emerald-700"}>{status?.text}</Badge><ChevronRight className="h-5 w-5 text-violet-600" /></button>;
  if (open === "overview") return <div id="catalog2-costs" className="mt-3 space-y-2">
    <CostAccordion id="catalog2-composition-card" icon={DollarSign} title="Composição do preço" subtitle="Custos, taxas e margem" status={result?.pending_info?.length ? "Pendente" : "Configurado"} tone={result?.pending_info?.length ? "amber" : "green"}><div className="grid gap-3 md:grid-cols-2"><div>{result?.pending_info?.length > 0 && <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span>Falta uma configuração para fechar o preço.</span><button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="font-semibold text-violet-700">Corrigir</button></div>}{result?.error ? <p className="text-sm text-red-600">Não foi possível calcular este cenário.</p> : result && <PricingPriceSummary r={result} />}{result && !result.error && <div className="mt-3"><ChargeSummary pricing={result} onAdjustStep={(st) => window.dispatchEvent(new CustomEvent(GOTO_STEP_PRICE_EVENT, { detail: { taskKey: st.task_key, stepKey: st.step_key } }))} /></div>}</div><PricingDiagnostics result={result} /></div><PersistDetails persistKey="d3" className="mt-2 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Custos e encargos <ChevronDown className="h-4 w-4 text-slate-400" /></summary>{result && <div className="border-t px-3 py-2"><PricingCostRows r={result} /></div>}</PersistDetails><PersistDetails persistKey="d4" className="mt-2 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Memória de cálculo <ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="border-t px-3 py-2">{result ? <ChargeMemory pricing={result} /> : <span className="text-xs text-slate-500">Bases, taxas e margem aplicadas ao cenário atual.</span>}</div></PersistDetails></CostAccordion>
    <CostAccordion icon={ListChecks} title="Simular cenário" subtitle="Teste variações e adicionais" status="Pronto para simular" tone="green"><div className="grid gap-3 md:grid-cols-2">{version.variations.map((va: any) => <Field key={va.id} label={va.name}><select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm" value={sel.variation_option_keys.find((k: string) => va.options.some((o: any) => o.key === k)) ?? ""} onChange={(e) => setSel({ ...sel, variation_option_keys: [...sel.variation_option_keys.filter((k: string) => !va.options.some((o: any) => o.key === k)), e.target.value] })}>{va.options.map((o: any) => <option key={o.id} value={o.key}>{o.label}</option>)}</select></Field>)}<Field label="Adicionais"><div className="flex flex-wrap gap-2">{version.addons.map((a: any) => <CheckPill key={a.id} checked={sel.addon_keys.includes(a.key)} onChange={(checked) => setSel({ ...sel, addon_keys: checked ? [...sel.addon_keys, a.key] : sel.addon_keys.filter((k: string) => k !== a.key) })}>{a.name}</CheckPill>)}</div></Field><Field label="Quantidade de campanhas"><Input className="h-10" type="number" value={sel.quantity} onChange={(e) => setSel({ ...sel, quantity: Number(e.target.value) || 1 })} /></Field></div>{result && <PricingPriceSummary r={result} showCost />}<Button type="button" onClick={() => void run()} className="mt-3 w-full bg-violet-700 text-white hover:bg-fuchsia-700">Atualizar simulação</Button></CostAccordion>
    <CostAccordion id="catalog2-periods-card" icon={CalendarClock} title="Modalidades por período" subtitle="Entrega recorrente" status="Mensal" tone="green"><ProductPeriodsPanel productId={productId} act={act} /></CostAccordion>
    <CostAccordion icon={FileText} title="Regras comerciais" subtitle="Margem e impostos" status="Configurar" tone="violet"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Margem, impostos e taxas são aplicados automaticamente à composição.</p><button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white">Configurar regras comerciais</button></div></CostAccordion>
  </div>;

  return (
    <div id="catalog2-costs" className="mt-3 space-y-3 scroll-mt-6">
      <button type="button" onClick={() => setOpen("overview")} className="text-xs font-semibold text-violet-700">← Voltar para custos e preço</button>
      {open === "composition" && <div className="grid items-start gap-3 md:grid-cols-2"><section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-3 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><DollarSign className="h-4 w-4" /></span><div><h3 className="font-semibold">Composição do preço</h3><p className="text-xs text-slate-500">Custos, taxas e margem</p></div></div>
        {highlightTarget === "catalog2-costs" && <p className="rounded-lg border border-amber-400 bg-amber-100 p-2 text-sm text-amber-950 dark:bg-amber-900/30 dark:text-amber-100">Há uma pendência comercial de preço ou prazo. Revise o valor que está marcado como “aguardando definição comercial” e salve a alteração.</p>}
        {result?.pending_info?.length > 0 && (
          <div id="catalog2-price-pending" className={`mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 ${ringOf("catalog2-price-pending")}`}><span className="font-semibold">Falta uma configuração para fechar o preço.</span><button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="rounded-lg border border-violet-300 bg-white px-2 py-1 font-semibold text-violet-700">Configurar precificação</button></div>
        )}
        {result?.error ? <p className="text-sm text-red-600">Não foi possível calcular este cenário.</p> : result && <PricingPriceSummary r={result} />}{result && !result.error && <div className="mt-3"><ChargeSummary pricing={result} /></div>}
        <PersistDetails persistKey="d5" className="mt-3 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Custos e encargos <ChevronDown className="h-4 w-4 text-slate-400" /></summary>{result && <div className="border-t px-3 py-2"><PricingCostRows r={result} /></div>}</PersistDetails><PersistDetails persistKey="d6" className="mt-2 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Memória de cálculo <ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="border-t px-3 py-2">{result ? <ChargeMemory pricing={result} /> : <span className="text-xs text-slate-500">Bases, taxas e margem aplicadas ao cenário atual.</span>}</div></PersistDetails>
      </section><PricingDiagnostics result={result} /></div>}

      {open === "scenario" && <section className="grid gap-3 md:grid-cols-2"><section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><div className="mb-3 flex items-center gap-2"><ListChecks className="h-5 w-5 text-violet-600" /><div><h3 className="font-semibold">Simular cenário</h3><p className="text-xs text-slate-500">Teste variações, adicionais e quantidade</p></div></div>
        {version.variations.map((va: any) => (
          <Field key={va.id} label={va.name}>
            <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={sel.variation_option_keys.find((k: string) => va.options.some((o: any) => o.key === k)) ?? ""} onChange={(e) => setSel({ ...sel, variation_option_keys: [...sel.variation_option_keys.filter((k: string) => !va.options.some((o: any) => o.key === k)), e.target.value] })}>
              {va.options.map((o: any) => <option key={o.id} value={o.key}>{o.label}{o.availability && o.availability !== "auto" ? ` — ${availabilityLabel(o.availability)}` : ""}{o.is_active === false ? " (inativa)" : ""}</option>)}
            </select>
          </Field>
        ))}
        <Field label="Adicionais">
          <div className="flex flex-wrap gap-2">
            {version.addons.map((a: any) => (
              <label key={a.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={sel.addon_keys.includes(a.key)} onChange={(e) => setSel({ ...sel, addon_keys: e.target.checked ? [...sel.addon_keys, a.key] : sel.addon_keys.filter((k: string) => k !== a.key) })} />{a.name}
                {a.addon_type === "quantity" && sel.addon_keys.includes(a.key) && (
                  <input aria-label={`Quantidade de ${a.name}`} type="number" min={a.qty_min ?? 1} className="ml-1 h-6 w-14 rounded border border-slate-300 bg-transparent px-1 text-xs" value={sel.addon_selections?.[a.key]?.quantity ?? a.qty_min ?? 1} onChange={(e) => setSel({ ...sel, addon_selections: { ...(sel.addon_selections ?? {}), [a.key]: { quantity: Math.max(0, Math.trunc(Number(e.target.value) || 0)) } } })} />
                )}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Quantidade de campanhas"><Input type="number" value={sel.quantity} onChange={(e) => setSel({ ...sel, quantity: Number(e.target.value) || 1 })} /></Field><Button type="button" onClick={() => void run()} className="mt-3 w-full bg-violet-700 text-white hover:bg-fuchsia-700">Atualizar simulação</Button></section><section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><h3 className="font-semibold">Resultado</h3>{result ? <PricingPriceSummary r={result} showCost /> : <p className="mt-3 text-sm text-slate-500">Ajuste o cenário e atualize a simulação.</p>}</section></section>}
      {open === "periods" && <ProductPeriodsPanel productId={productId} act={act} />}
      {open === "rules" && <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-violet-600" /><div><h3 className="font-semibold">Regras comerciais</h3><p className="text-xs text-slate-500">Margem e impostos aplicados na composição</p></div></div><button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="mt-4 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white">Configurar regras comerciais</button></section>}
    </div>
  );
}

// Passo 4 (Custos e preço): cada bloco é um cartão resumido de UMA linha; clicar em "Ver" abre os dados numa Janela Moldura (sem acordeão).
export const OPEN_COST_CARD_EVENT = "catalog2:open-cost-card";
const CLOSE_COST_CARDS_EVENT = "catalog2:close-cost-cards";
function CostAccordion({ id, icon: Icon, title, subtitle, status, tone, children }: any) {
  const tones: any = { amber: "bg-amber-100 text-amber-800", green: "bg-emerald-100 text-emerald-700", violet: "bg-violet-100 text-violet-700" };
  const [open, setOpen] = usePersistedFlag(`cost-card:${id ?? title}`, false);
  useEffect(() => {
    const on = (e: Event) => { if (id && (e as CustomEvent).detail?.id === id) setOpen(true); };
    const close = () => setOpen(false);
    window.addEventListener(OPEN_COST_CARD_EVENT, on);
    window.addEventListener(CLOSE_COST_CARDS_EVENT, close);
    return () => { window.removeEventListener(OPEN_COST_CARD_EVENT, on); window.removeEventListener(CLOSE_COST_CARDS_EVENT, close); };
  });
  return (
    <div id={id} className="rounded-[14px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="cost-card">
      <div className="flex min-h-[52px] items-center gap-3 px-3 py-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800 dark:text-slate-100">{title}</span><span className="block truncate text-xs text-slate-500">{subtitle}</span></span>
        <Badge className={`border-0 ${tones[tone]}`}>{status}</Badge>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="cost-card-open"><Eye className="h-3.5 w-3.5" />Ver</button>
      </div>
      {open && (
        <FramedPanel open onOpenChange={setOpen} testId="cost-card-panel" title={title}>
          <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
            <div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{title}</p><p className="truncate text-xs text-slate-500">{subtitle}</p></div></div>
            <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={() => setOpen(false)} data-testid="cost-card-close">Fechar</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{children}</div>
        </FramedPanel>
      )}
    </div>
  );
}

function PricingCostRows({ r }: { r: any }) { const money = (n: any) => n == null ? "—" : `${r.currency ?? "R$"} ${Number(n).toFixed(2).replace(".", ",")}`; return <div className="space-y-1 text-xs">{[r.lines?.human_cost, r.lines?.ia_cost, ...(r.lines?.taxes_and_margins ?? [])].filter(Boolean).map((line: any, i: number) => <div key={i} className="flex justify-between gap-3"><span className="text-slate-500">{line.label}</span><span>{money(line.amount)}</span></div>)}</div>; }
function PricingPriceSummary({ r, showCost = false }: { r: any; showCost?: boolean }) { const price = r.lines?.commercial_final_price ?? r.lines?.final_price; const money = (n: any) => n == null ? "A definir" : `${r.currency ?? "R$"} ${Number(n).toFixed(2).replace(".", ",")}`; return <div className="mt-3 space-y-2"><div className="rounded-xl bg-violet-50 px-3 py-3"><span className="text-xs font-semibold text-violet-700">Preço comercial final</span><strong className="block text-2xl text-violet-800">{money(price?.amount)}</strong></div>{showCost && <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">Esforço estimado</span><strong>{r.deadline?.effort_days ?? "—"} dias</strong></div><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">Prazo comercial</span><strong>{r.deadline?.commercial_deadline_days ?? "—"} dias</strong></div></div>}</div>; }
function PricingDiagnostics({ result }: { result: any }) { const pending = !!result?.pending_info?.length; return <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-violet-600" /><div><h3 className="font-semibold">Diagnóstico de precificação</h3><p className="text-xs text-slate-500">Confira o que falta para publicar</p></div></div><div className="mt-3 divide-y rounded-xl border border-slate-100 text-sm"><div className="flex items-center gap-2 p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Custos e encargos configurados</div><div className="flex items-center gap-2 p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Margem comercial configurada</div><div className={`flex items-center gap-2 p-2 ${pending ? "text-amber-700" : "text-emerald-700"}`}>{pending ? <Info className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{pending ? "Há uma pendência de precificação" : "Sem pendências"}</div></div>{pending && <button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="mt-3 w-full rounded-lg bg-violet-700 py-2 text-xs font-semibold text-white">Corrigir pendência</button>}</section>; }

// Item 6 (reunião 2026-09-14, "Modalidades de contratação por período") —
// mecanismo administrativo: SEMPRE mostra os 4 períodos possíveis, cada um
// com "Não configurado" até o admin definir um desconto explícito. Nenhum
// percentual padrão é sugerido — o campo nasce vazio.
function ProductPeriodsPanel({ productId, act }: { productId: string; act: (fn: () => Promise<any>, ok: string) => void }) {
  const ringOf = useContext(RingCtx);
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
    <div className="mt-3">
      <SetupCard icon={CalendarClock} title="Modalidades de contratação por período" summary={deliveryRecurrence === "mensal" ? "entrega mensal recorrente" : "recorrência não definida"} help="Define por quantos meses o cliente pode contratar este produto. Só use entrega mensal recorrente quando um novo ciclo de tarefas realmente precisar ser criado a cada mês.">

      {/* Item 6.1 (reunião 2026-09-14, "Completar a execução dos
          períodos"): pré-requisito — sem isto, NENHUM período fica
          disponível pra contratação, mesmo com desconto configurado. */}
      <div id="catalog2-delivery-recurrence" className={`scroll-mt-6 rounded-md border border-neutral-200 p-3 dark:border-neutral-800 ${ringOf("catalog2-delivery-recurrence")}`}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={deliveryRecurrence === "mensal"}
            onChange={(e) => act(
              () => apiClient.updateCatalog2ProductDeliveryRecurrence(productId, e.target.checked ? "mensal" : null).then(load),
              e.target.checked ? "Produto marcado como entrega mensal recorrente." : "Entrega mensal recorrente desmarcada — períodos ficam indisponíveis até ser definida de novo.",
            )}
          />
          Este produto gera uma nova entrega todo mês
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Cobrança mensal e nova entrega mensal são coisas diferentes. <strong>Assinatura mensal</strong> (Passo 2) é como o cliente paga: todo mês. <strong>Esta caixa</strong> diz se, a cada mês pago, o produto abre um novo ciclo de tarefas e entregas. Para serviço recorrente (ex.: gestão mensal), marque “Sim, gerar novo ciclo/entrega todos os meses”; se o produto só é cobrado todo mês sem nova entrega, deixe desmarcado.
        </p>
        {deliveryRecurrence !== "mensal" && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Defina se a entrega é recorrente antes de ativar uma modalidade por período.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Os períodos e descontos também podem ser configurados direto na Modalidade (Entrega comercial). Todo período autorizado aqui é oferecido ao cliente na contratação (venda dos períodos longos liberada em 25/10).</p>
      <div>
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
              const reservedForFuture = false;
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
      </SetupCard>
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
      <UniversalMemory r={r} />
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
function PreviewTab({ version, readOnly, act, onResolveIssue }: any) {
  const [validation, setValidation] = useState<any>(null);
  useEffect(() => { apiClient.validateCatalog2Version(version.id).then(setValidation).catch(() => setValidation({ ok: false, issues: ["Não foi possível validar esta versão."] })); }, [version.id, version.updated_at]);
  if (!validation) return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Conferindo versão…</div>;
  const issues = validation.issues ?? [];
  // R21-03: o bloqueio "etapa dependente sem variação/adicional" vem PRIMEIRO e com o texto completo (antes tudo virava uma frase genérica e só 3 itens apareciam).
  const isDep = (m: string) => /dependente de variação ou adicional/.test(m);
  const entries = issues.map((issue: string, i: number) => ({ issue, detail: validation.issue_details?.[i] }));
  const ordered = [...entries.filter((e: any) => isDep(e.issue)), ...entries.filter((e: any) => !isDep(e.issue))];
  const groups = ordered.slice(0, 3).map((e: any, index: number) => ({ title: isDep(e.issue) ? "Etapa dependente de variação ou adicional" : index === 0 ? "Precificação" : index === 1 ? "Modalidades" : "Regras comerciais", issue: e.issue, detail: e.detail, text: isDep(e.issue) ? e.issue : reviewIssueText(e.issue) }));
  const done = ["Informações do produto", "Entrega", "Classificação e opções"];
  return <div className="mt-3 grid gap-3 md:grid-cols-[1.35fr_.9fr]">
    <ReviewSurface><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><Eye className="h-4 w-4" /></span><div><h2 className="text-base font-semibold">Pronto para publicar?</h2><p className="text-[11px] text-slate-500">Resolva os itens que liberam a versão.</p></div><Badge className={issues.length ? "ml-auto shrink-0 border-0 bg-red-100 text-red-700" : "ml-auto shrink-0 border-0 bg-emerald-100 text-emerald-700"}>{issues.length ? `${issues.length} bloqueio${issues.length > 1 ? "s" : ""}` : "Sem bloqueios"}</Badge></div>
      <div className="mt-3 space-y-2">{issues.length === 0 ? <ReviewLine icon={<CheckCircle2 className="h-4 w-4" />} title="Versão pronta" text="Todas as configurações necessárias foram concluídas." tone="ok" /> : groups.map((group: any, index: number) => <ReviewLine key={group.issue} icon={index === 0 ? <DollarSign className="h-4 w-4" /> : index === 1 ? <Tag className="h-4 w-4" /> : <FileText className="h-4 w-4" />} title={group.title} text={group.text} tone="block" action={() => onResolveIssue(group.issue, group.detail)} />)}</div>
      {issues.length > 3 && <PersistDetails persistKey="d8" className="mt-2 rounded-xl border border-slate-200"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Ver detalhes dos bloqueios</summary><div className="border-t px-3 py-2 text-xs text-slate-600" data-testid="review-more-issues"><p className="font-semibold">Há mais {issues.length - 3} item(ns) a revisar:</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{ordered.slice(3).map((e: any) => <li key={e.issue}>{e.issue}</li>)}</ul></div></PersistDetails>}
    </ReviewSurface>
    <ReviewSurface><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileText className="h-4 w-4" /></span><div><h2 className="text-base font-semibold">Resumo da versão</h2><p className="text-[11px] text-slate-500">Confira antes de publicar.</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-[11px]"><span className="min-w-0 text-slate-500">Produto<strong className="mt-0.5 block truncate text-xs text-slate-800">{version.title}</strong></span><span className="min-w-0 text-slate-500">Versão<strong className="mt-0.5 block truncate text-xs text-slate-800">v{version.version_number} — {version.state === "publicada" ? "Publicada" : "Rascunho"}</strong></span><span className="text-slate-500">Atualizada<strong className="mt-0.5 block text-slate-800">{new Date(version.updated_at).toLocaleDateString("pt-BR")}</strong></span><span className="text-slate-500">Por<strong className="mt-0.5 block truncate text-slate-800">Vinicius Guardia</strong></span></div><div className="mt-2 space-y-1">{done.map((label) => <ReviewLine key={label} icon={<CheckCircle2 className="h-4 w-4" />} title={label} text="Configurado" tone="ok" compact />)}</div><div className="mt-2"><PublishBtn versionId={version.id} canPublish={!!validation.ok} readOnly={readOnly} summary="" act={act} /></div>{!validation.ok && <p className="mt-1.5 text-[11px] text-slate-500">Disponível após resolver os bloqueios.</p>}</ReviewSurface>
  </div>;
}

function reviewIssueText(issue: string) { const text = issue.toLowerCase(); if (text.includes("ia") || text.includes("custo")) return "Custo de IA pendente para calcular o preço final."; if (text.includes("modalidade") || text.includes("avulso")) return "Revise as modalidades disponíveis para contratação."; if (text.includes("regra") || text.includes("condição")) return "Uma regra comercial ainda precisa ser concluída."; if (text.includes("prazo")) return "Defina o prazo comercial da entrega."; return "Este item precisa ser revisado antes da publicação."; }
function ReviewSurface({ children }: { children: React.ReactNode }) { return <section className="min-w-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">{children}</section>; }
function ReviewLine({ icon, title, text, tone = "neutral", action, compact = false }: { icon: React.ReactNode; title: string; text: string; tone?: "ok" | "block" | "neutral"; action?: () => void; compact?: boolean }) { const colors = tone === "ok" ? "bg-emerald-50 text-emerald-600" : tone === "block" ? "bg-red-50 text-red-600" : "bg-violet-50 text-violet-600"; return <div className={`flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-2.5 ${compact ? "py-1.5" : "py-2"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${colors}`}>{icon}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{title}</strong><span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-500">{text}</span></span>{action ? <Button size="sm" variant="outline" className="h-7 shrink-0 border-violet-300 px-2 text-xs text-violet-700" onClick={action}>Corrigir <ChevronRight className="h-3.5 w-3.5" /></Button> : tone === "ok" ? <Badge className="ml-auto shrink-0 border-0 bg-emerald-100 text-[10px] text-emerald-700">OK</Badge> : null}</div>; }

function CapabilityChip({ capability }: { capability: any }) { const icon = capability.icon_key === "globe" ? <Globe2 className="h-4 w-4" /> : capability.icon_key === "tag" ? <Tag className="h-4 w-4" /> : <Layers className="h-4 w-4" />; return <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700">{capability.media_url ? <img className="h-5 w-5 rounded object-cover" src={capability.media_url} alt="" /> : <span className="text-violet-600">{icon}</span>}{capability.label}</span>; }

function PreviewAccordion({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) { return <PersistDetails persistKey="d9" className="group rounded-xl border border-slate-200"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm [&::-webkit-details-marker]:hidden"><span className="font-semibold">{title}</span><span className="ml-auto text-xs text-slate-500">{summary}</span><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" /></summary><div className="border-t border-slate-100 px-3 py-2">{children}</div></PersistDetails>; }

// ── 9. Versões e histórico ─────────────────────────────────────────
function HistoryTab({ version, product, readOnly, act, onResolveIssue }: any) {
  const [val, setVal] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [copyDraft, setCopyDraft] = useState(true);
  useEffect(() => { apiClient.validateCatalog2Version(version.id).then(setVal).catch(() => setVal(null)); }, [version.id, version.updated_at]);
  const previous = (product.versions ?? []).filter((item: any) => item.id !== version.id).sort((a: any, b: any) => b.version_number - a.version_number).slice(0, 3);
  return <div className="mt-3 grid gap-3 md:grid-cols-2"><ReviewSurface><div className="flex items-center gap-2"><h2 className="text-base font-semibold">Versão atual</h2><Badge className="ml-auto border-0 bg-amber-100 text-amber-800">{version.state === "publicada" ? "Publicada" : "Não publicada"}</Badge></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><select className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={version.id} disabled><option>v{version.version_number} — {version.state === "publicada" ? "Publicada" : "Rascunho"}</option></select><span className="flex items-center text-[11px] text-slate-500"><CalendarClock className="mr-1 h-3.5 w-3.5" />Atualizada em {new Date(version.updated_at).toLocaleDateString("pt-BR")}</span></div><div className="mt-3 flex items-center justify-between px-2 text-[11px]"><span className="font-semibold text-violet-700">Rascunho</span><span className="h-px flex-1 bg-slate-200" /><span className="text-slate-400">Revisão</span><span className="h-px flex-1 bg-slate-200" /><span className="text-slate-400">Publicado</span></div><div className="mt-3 space-y-1"><ReviewLine icon={<FileText className="h-4 w-4" />} title="Resumo da versão" text="Principais configurações desta versão." compact /><ReviewLine icon={<ListChecks className="h-4 w-4" />} title="Alterações pendentes" text={val?.ok ? "Nenhuma pendência" : `${val?.issues?.length ?? 0} pendência(s) a revisar`} tone={val?.ok ? "ok" : "neutral"} compact /><ReviewLine icon={<Info className="h-4 w-4" />} title="Bloqueios para publicar" text={val?.ok ? "Sem bloqueios" : `${val?.issues?.length ?? 0} bloqueio(s)`} tone={val?.ok ? "ok" : "block"} compact /></div><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" className="flex-1" disabled={readOnly} onClick={() => act(() => apiClient.updateCatalog2VersionInfo(version.id, {}), "Rascunho salvo.")}><Save className="h-3.5 w-3.5" />Salvar rascunho</Button><span className="flex-1"><PublishBtn versionId={version.id} canPublish={!!val?.ok} readOnly={readOnly} summary={summary} act={act} /></span></div></ReviewSurface><div className="space-y-3"><ReviewSurface><h2 className="text-base font-semibold">Criar nova versão</h2><p className="mt-1 text-[11px] text-slate-500">Continue evoluindo este produto.</p><Field label="Nome da versão"><Input className="h-9 text-xs" value={`v${(version.version_number ?? 0) + 1} — Nova versão`} disabled /></Field><label className="mt-2 flex items-center gap-2 text-xs"><button type="button" onClick={() => setCopyDraft(!copyDraft)} className={`relative h-5 w-9 rounded-full ${copyDraft ? "bg-violet-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${copyDraft ? "left-4" : "left-0.5"}`} /></button>Copiar dados do rascunho</label><Button size="sm" className="mt-2 w-full bg-[image:var(--app-brand-button,linear-gradient(to_right,#7c3aed,#c026d3))]" onClick={() => act(() => apiClient.newCatalog2Version(product.id), "Nova versão criada.")}><Plus className="h-3.5 w-3.5" />Criar versão</Button></ReviewSurface><ReviewSurface><h3 className="text-sm font-semibold">Versões anteriores</h3><div className="mt-2 space-y-1">{previous.length ? previous.map((item: any) => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"><span className={`h-2 w-2 shrink-0 rounded-full ${item.state === "publicada" ? "bg-emerald-500" : "bg-amber-400"}`} /><span className="truncate font-medium">v{item.version_number} — {item.state === "publicada" ? "Publicada" : "Rascunho"}</span><span className="ml-auto shrink-0 text-[10px] text-slate-500">{new Date(item.updated_at).toLocaleDateString("pt-BR")}</span></div>) : <p className="text-xs text-slate-500">Ainda não há versões anteriores.</p>}</div></ReviewSurface></div></div>;
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

function ReviewHistoryTab({ productId, version }: { productId: string; version: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  useEffect(() => { apiClient.getCatalog2ProductHistory(productId, { page: 1, page_size: 8 }).then((result: any) => setEvents(result.data ?? [])).catch(() => setEvents([])); }, [productId]);
  const filtered = events.filter((event) => (!category || event.category === category) && (!query || `${event.description ?? ""} ${event.event_type ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  const areas = [{ label: "Informações", value: 8, icon: <FileText className="h-5 w-5" />, tone: "text-violet-600 bg-violet-50" }, { label: "Entrega", value: 14, icon: <Layers className="h-5 w-5" />, tone: "text-emerald-600 bg-emerald-50" }, { label: "Classificação", value: 4, icon: <Tag className="h-5 w-5" />, tone: "text-fuchsia-600 bg-fuchsia-50" }, { label: "Custos", value: 3, icon: <DollarSign className="h-5 w-5" />, tone: "text-amber-600 bg-amber-50" }];
  return <div className="mt-3 grid gap-3 md:grid-cols-[1.35fr_.9fr]"><ReviewSurface><h2 className="text-base font-semibold">Histórico da versão</h2><div className="mt-2 grid gap-2 sm:grid-cols-3"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="h-9 pl-9 text-xs" placeholder="Buscar alteração…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todos os eventos</option>{Object.entries(HISTORY_CATEGORY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input className="h-9 text-xs" type="date" aria-label="Filtrar por data" /></div><div className="mt-2 divide-y divide-slate-100">{filtered.slice(0, 4).map((event, index) => <div key={event.id ?? index} className="flex min-w-0 gap-2 py-2"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${index === 0 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{index === 0 ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{event.event_type === "created" ? "Versão criada" : event.description || "Alteração registrada"}</strong><span className="block truncate text-[11px] text-slate-500">{event.description || "Configuração atualizada nesta versão."}</span><span className="mt-0.5 flex gap-2 text-[10px] text-slate-400"><span>{new Date(event.created_at).toLocaleDateString("pt-BR")}</span><span className="truncate">{HISTORY_ACTOR_LABEL[event.actor_kind] ?? "Vinicius Guardia"}</span></span></span><ChevronRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" /></div>)}{!filtered.length && <p className="py-4 text-center text-xs text-slate-500">Nenhum evento encontrado.</p>}</div></ReviewSurface><div className="space-y-3"><ReviewSurface><h2 className="text-base font-semibold">Resumo das alterações</h2><div className="mt-2 grid grid-cols-2 gap-2">{areas.map((area) => <div key={area.label} className={`rounded-xl p-2 ${area.tone}`}><span>{area.icon}</span><span className="mt-1 block text-[11px] text-slate-600">{area.label}</span><strong className="text-base">{area.value}</strong></div>)}</div><PersistDetails persistKey="d10" className="mt-2 rounded-xl border border-violet-100 bg-violet-50"><summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-violet-800">Ver alterações detalhadas</summary><p className="border-t border-violet-100 px-3 py-2 text-[11px] text-violet-700">Detalhes disponíveis na linha do tempo.</p></PersistDetails></ReviewSurface><ReviewSurface><h3 className="text-sm font-semibold">Atividade da versão</h3><div className="mt-2 grid gap-1 text-xs"><Row k="Data de criação" v={new Date(version.created_at ?? version.updated_at).toLocaleDateString("pt-BR")} /><Row k="Última edição" v={new Date(version.updated_at).toLocaleDateString("pt-BR")} /><Row k="Criado por" v="Vinicius Guardia" /><Row k="Status atual" v={<Badge className={version.state === "publicada" ? "border-0 bg-emerald-100 text-emerald-700" : "border-0 bg-amber-100 text-amber-800"}>{version.state === "publicada" ? "Publicado" : "Rascunho"}</Badge>} /></div></ReviewSurface></div></div>;
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
          <div className="flex items-center gap-2 p-4 text-sm text-neutral-500"><ButtonLoader text="Carregando histórico…" /></div>
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

  const reload = useCallback(() => {
    setState("loading");
    apiClient
      .getCatalog2ProductOrigin(productId)
      .then((d: any) => { setData(d); setState("ready"); })
      .catch((e: any) => setState(e?.status === 404 ? "not_imported" : "error"));
  }, [productId]);
  useEffect(() => { reload(); }, [reload]);

  if (state === "loading") return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><ButtonLoader text="Carregando revisão de origem…" /></div>;
  if (state === "not_imported") return <p className="mt-3 rounded bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800">Este produto não veio da importação dos 36 — foi criado manualmente no construtor.</p>;
  if (state === "error" || !data) return <p className="mt-3 text-sm text-red-600">Não foi possível carregar a origem.</p>;

  const hp = data.historical_price ?? {};
  return (
    <div className="mt-3 space-y-4 text-sm">
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
        <h3 className="font-semibold">Pendências da importação</h3>
        <p className="text-[11px] text-neutral-400">Estado de preparo atual: <Badge className="bg-amber-100 text-amber-700">{data.review_state}</Badge>. Somente leitura: o produto é ajustado direto no cadastro.</p>
        {data.pendencies.length === 0 ? (
          <p className="mt-2 text-xs text-emerald-600">Nenhuma pendência aberta — pronto para revisão final.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-xs">{data.pendencies.map((key: string) => <li key={key}>{PENDENCY_LABEL[key] ?? key}</li>)}</ul>
        )}
      </section>

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
  responsaveis: "Responsáveis específicos",
  etapas: "Etapas",
  esforco_tarefas: "Especialidade e horas das etapas",
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
      if (priceBlockedByTasks(note)) out.push("Concluir o ajuste separado: Especialidade e horas das etapas");
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

/** A pendência é "assinatura mensal x entrega mensal recorrente" (cobrança mensal ≠ nova entrega mensal)? Então o campo está no Passo 4. */
export const MONTHLY_ISSUE_RE = /assinatura mensal|entrega mensal recorrente|per[ií]odo mensal|modalidade de compra/i;
/** Abre o cartão "Modalidades por período" do Passo 4 e destaca o campo "Este produto gera uma nova entrega todo mês". */
function revealDeliveryRecurrenceField() {
  const open = () => {
    window.dispatchEvent(new CustomEvent(OPEN_COST_CARD_EVENT, { detail: { id: "catalog2-periods-card" } }));
    document.getElementById("catalog2-delivery-recurrence")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  window.setTimeout(open, 350);
  window.setTimeout(open, 900);
}
export function readinessDestination(key: string, product: any, note?: string): { tab: string; sub?: Record<string, string>; target: string } {
  switch (key) {
    case "conteudo": return { tab: "info", target: "catalog2-field-full-description" };
    case "classificacao": return { tab: "opcoes", sub: { opcoes: "class" }, target: !product?.pillar ? "catalog2-field-pillar" : !product?.category ? "catalog2-field-category" : "catalog2-field-four-f" };
    case "variacoes": return { tab: "opcoes", sub: { opcoes: "var" }, target: "sec-var" };
    case "adicionais": return { tab: "opcoes", sub: { opcoes: "add" }, target: "sec-add" };
    case "tarefas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-create" };
    case "etapas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-tasks" };
    case "responsaveis": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-tasks" };
    case "esforco_tarefas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-effort" };
    case "prazo": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-deadline-base" };
    case "conexoes": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "sec-connections" };
    case "preco": return priceBlockedByTasks(note) ? { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-effort" } : /prazo/i.test(note ?? "") ? { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-deadline-base" } : { tab: "precos", target: "catalog2-price-pending" };
    case "portfolio": return { tab: "info", target: "catalog2-general" };
    case "validacao": return MONTHLY_ISSUE_RE.test(note ?? "") ? { tab: "precos", target: "catalog2-delivery-recurrence" } : { tab: "revisao", sub: { revisao: "hist" }, target: "sec-publicacao" };
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
  responsaveis: "Passo 2 · Responsáveis das tarefas e etapas",
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
  esforco_tarefas: { pendente: "Cada tarefa precisa de especialidade e etapas com horas estimadas reais. Mesmo que já estejam preenchidas, se estiverem marcadas como PROVISÓRIAS (dado de teste) o item continua pendente até você revisar e confirmar os valores reais." },
  preco: { bloqueador: "Resolva os ajustes listados acima. A base de custo usa as horas das etapas e o valor/hora das especialidades; taxas e margens são configuradas em Custos e preço." },
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

function ProductReadinessPanel({ productId, versionId, versionKey, onGo, onGoDetail, onItems, onData, detailFor, detailTargetFor, taskName }: { taskName?: string; productId: string; versionId?: string; versionKey: string; onGo: (key: string) => void; onGoDetail: (key: string, targetId: string) => void; onItems?: (items: Record<string, { level: string; note: string }>) => void; onData?: (d: any) => void; detailFor?: (key: string) => string[]; detailTargetFor?: (key: string, index: number) => string | undefined }) {
  const { sidebarWidth } = useAppFrameMetrics();
  const sidebarWidthPx = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(String(sidebarWidth)) || 0;
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReadinessFilter>("todos");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);

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

  const attention = visible.filter((it) => it.level === "bloqueador" || it.level === "pendente");
  const ready = visible.filter((it) => it.level === "pronto");
  const optional = visible.filter((it) => it.level === "opcional");
  const fallbackKey = (entries.find((it) => it.level === "pendente") ?? entries.find((it) => it.level === "bloqueador"))?.key ?? null;
  const activeKey = selectedKey && entries.some((it) => it.key === selectedKey) ? selectedKey : fallbackKey;
  const active = entries.find((it) => it.key === activeKey) ?? null;
  const stepOf = (key: string) => (READINESS_WHERE[key] ?? "").match(/^Passo \d/)?.[0] ?? "Abrir";
  const isTaskItem = (key: string) => ["tarefas", "etapas", "esforco_tarefas", "prazo", "conexoes"].includes(key);
  const BADGE = "inline-flex h-6 shrink-0 items-center justify-center rounded-full px-2.5 text-[11px] font-semibold";

  const renderRow = (it: { key: string; level: string; note: string }, compact = false) => {
    const meta = LEVEL_META[it.level] ?? LEVEL_META.opcional;
    const Icon = READINESS_ICON[it.key] ?? FileText;
    const isAttention = it.level === "bloqueador" || it.level === "pendente";
    const selected = isAttention && it.key === activeKey;
    return (
      <li key={it.key} data-testid={"readiness-item-" + it.key}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => (isAttention ? setSelectedKey(it.key) : (setOpen(false), onGo(it.key)))}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (isAttention) setSelectedKey(it.key); else { setOpen(false); onGo(it.key); } } }}
          className={"flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2 transition-colors hover:border-violet-300 dark:bg-slate-900 " + (selected ? "border-violet-400 ring-1 ring-violet-300" : "border-slate-200 dark:border-slate-700")}
        >
          <span className={BADGE + " min-w-[72px] " + meta.chip}>{meta.label}</span>
          <Icon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">{READINESS_ITEM_LABEL[it.key] ?? it.key}</span>
            {compact && <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400" title={it.note}>{it.note}</span>}
          </span>
          {!compact && <span className="hidden min-w-0 max-w-[45%] flex-1 truncate text-xs text-slate-500 dark:text-slate-400 md:block" title={it.note}>{it.note}</span>}
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onGo(it.key); }} className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300">
            {stepOf(it.key)} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ver preenchimento do produto" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25" title="Ver o preenchimento do produto">
        <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden xl:inline">Preenchimento</span>
        {data?.error ? <span className="text-red-100">indisponível</span> : loading && !data ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>
          {data?.items && <span className="text-white/80">{readyCount}/{entries.length}</span>}
          {nBlock > 0 ? <span className="rounded-full bg-red-400/90 px-1.5 py-0.5 text-[10px] leading-none text-white">{nBlock}</span> : nPend > 0 ? <span className="rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] leading-none text-amber-950">{nPend}</span> : <Check className="h-3.5 w-3.5 text-emerald-300" />}
        </>}
      </button>
      <FramedPanel open={open} onOpenChange={setOpen} testId="product-readiness-dialog">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar preenchimento" title="Fechar" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
            <DialogTitle className="flex flex-wrap items-center gap-2.5 pr-10 text-base font-bold text-slate-900 dark:text-slate-100">
              <CheckSquare className="h-5 w-5 text-violet-600" aria-hidden="true" />
              Preenchimento do produto
              {data?.items && <span className="text-sm font-medium text-slate-500"><strong className="text-emerald-600">{readyCount} de {entries.length}</strong> campos prontos</span>}
              {nBlock > 0 && <span className={BADGE + " gap-1 bg-red-100 text-red-700"}><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{nBlock} {nBlock === 1 ? "bloqueio" : "bloqueios"}</span>}
              {nPend > 0 && <span className={BADGE + " gap-1 bg-amber-100 text-amber-700"}><Clock className="h-3.5 w-3.5" aria-hidden="true" />{nPend} {nPend === 1 ? "pendência" : "pendências"}</span>}
              {nBlock === 0 && nPend === 0 && data?.items && <span className={BADGE + " bg-emerald-100 text-emerald-700"}>Tudo pronto</span>}
            </DialogTitle>
            {data?.items && <div className="mt-3 flex items-center gap-3"><span className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">{pct}% preenchido</span><span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60" aria-hidden><span className="h-full bg-emerald-500" style={{ width: seg(readyCount) + "%" }} /><span className="h-full bg-pink-300" style={{ width: seg(nPend) + "%" }} /><span className="h-full bg-red-500" style={{ width: seg(nBlock) + "%" }} /></span></div>}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {data?.error ? (
            <p className="text-sm text-red-600">Não foi possível carregar a prontidão.</p>
          ) : !data?.items ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><ButtonLoader text="Carregando prontidão…" /></p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar itens do checklist">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    style={filter === f.id ? { background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" } : undefined}
                    className={"inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-semibold transition-colors " + (filter === f.id ? "border-transparent text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}
                  >
                    {f.label} <span className={"ml-1 " + (filter === f.id ? "text-white/80" : "text-slate-400")}>({f.n})</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">Itens do preenchimento</h3>
                  {visible.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/40">Nenhum item nesta categoria.</p>
                  ) : (
                    <div className="space-y-3">
                      {attention.length > 0 && (
                        <div className="rounded-xl bg-red-50/70 p-2 dark:bg-red-950/20">
                          <p className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-bold text-red-700 dark:text-red-300"><AlertCircle className="h-4 w-4" aria-hidden="true" />Precisa de atenção · {attention.length}</p>
                          <ul className="space-y-1.5">{attention.map((it) => renderRow(it))}</ul>
                        </div>
                      )}
                      {ready.length > 0 && (
                        <div className="rounded-xl bg-emerald-50/70 p-2 dark:bg-emerald-950/20">
                          <p className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Prontos · {ready.length}</p>
                          <ul className="grid gap-1.5 md:grid-cols-2">{ready.map((it) => renderRow(it, true))}</ul>
                        </div>
                      )}
                      {optional.length > 0 && (
                        <ul className="space-y-1.5">{optional.map((it) => renderRow(it, true))}</ul>
                      )}
                    </div>
                  )}
                </div>

                <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" data-testid="readiness-resolve">
                  {active ? (() => {
                    const meta = LEVEL_META[active.level] ?? LEVEL_META.opcional;
                    const configuredDetails = detailFor?.(active.key) ?? [];
                    // A validação final pode reunir várias etapas em uma única
                    // nota do servidor. No painel, cada uma vira uma linha
                    // curta: assim não há parágrafo técnico misturando tudo.
                    const details = configuredDetails.length > 0
                      ? configuredDetails
                      : active.key === "validacao"
                        ? active.note.replace(/^\s*\d+\s+pendência\(s\)\s+para\s+publicar:\s*/i, "").split(/\s+\|\s+/).map((line) => line.trim()).filter(Boolean)
                        : [];
                    const help = (READINESS_HELP[active.key] as any)?.[active.level] as string | undefined;
                    return (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Clock className="h-5 w-5 text-violet-600" aria-hidden="true" />
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Resolver pendência</h3>
                          <span className={BADGE + " " + meta.chip}>{meta.label}</span>
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{READINESS_ITEM_LABEL[active.key] ?? active.key}</p>
                          <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">{details.length > 0 ? `${details.length} item(ns) para revisar antes de publicar.` : active.note}</p>
                        </div>
                        {details.length > 0 && (
                          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                            <p className="mb-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">O que fazer</p>
                            <ul className="space-y-1.5">
                              {details.map((line, i) => {
                                const targetId = detailTargetFor?.(active.key, i);
                                return (
                                  <li key={i}>
                                    <button type="button" disabled={!targetId} onClick={() => { if (targetId) { setOpen(false); onGoDetail(active.key, targetId); } }} className="group flex w-full items-start gap-2.5 text-left text-[13px] text-slate-700 hover:text-violet-700 disabled:cursor-default dark:text-slate-200">
                                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300 bg-white group-hover:border-violet-500 dark:border-slate-600 dark:bg-slate-800" aria-hidden="true" />
                                      <span className="min-w-0 flex-1">{line}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setOpen(false); onGo(active.key); }}
                          style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-md hover:brightness-110"
                          data-testid="readiness-open"
                        >
                          {isTaskItem(active.key) ? "Abrir etapa" : "Ir resolver"} <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {isTaskItem(active.key) && (
                          <button type="button" onClick={() => { setOpen(false); onGoDetail(active.key, "catalog2-tasks"); }} className="mx-auto flex items-center gap-1.5 text-[13px] font-semibold text-violet-700 hover:underline dark:text-violet-300">
                            <FileText className="h-4 w-4" aria-hidden="true" />Ver tarefa{taskName ? " " + taskName : ""} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {help && (
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <button type="button" aria-expanded={howOpen} onClick={() => setHowOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                              <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                              <span className="flex-1">Como resolver</span>
                              <ChevronDown className={"h-4 w-4 text-slate-500 transition-transform " + (howOpen ? "rotate-180" : "")} aria-hidden="true" />
                            </button>
                            {howOpen && <p className="px-3 pb-3 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{help}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <CheckCircle2 className="h-9 w-9 text-emerald-500" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Nada precisa de atenção</p>
                      <p className="text-xs text-slate-500">Todos os itens obrigatórios estão prontos.</p>
                    </div>
                  )}
                </aside>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>tarefas: {data.task_count ?? 0} · etapas: {data.step_count ?? 0}</span>
                <button type="button" className="underline" onClick={reload}>atualizar</button>
              </div>
            </>
          )}
        </div>
      </FramedPanel>
    </>
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
// Abas 3, 4 e 5: sem o container do meio (igual às abas 1 e 2) — só o fundo do painel; blocos separados por 11,25 px.
const TAB_CARD = "mt-2";

// Estado aberto/fechado das seções: lembrado enquanto a página não é recarregada (trocar de aba do produto e voltar mantém como estava; F5 volta tudo fechado).
// Guardado também no sessionStorage: F5 volta tudo exatamente como estava (aberto continua aberto).
const OPEN_STORE_KEY = "allka:product-editor:open";
let openStoreCache: Record<string, boolean> | null = null;
const openStoreAll = (): Record<string, boolean> => {
  if (openStoreCache) return openStoreCache;
  try { openStoreCache = JSON.parse(window.sessionStorage.getItem(OPEN_STORE_KEY) ?? "{}") ?? {}; } catch { openStoreCache = {}; }
  return openStoreCache as Record<string, boolean>;
};
/** Só para testes: esquece o que estava aberto/fechado (a memória do módulo sobrevive entre testes). */
export const resetOpenStoreForTests = () => { openStoreCache = null; };
const storeKey = (k: string) => `${typeof window !== "undefined" ? window.location.pathname : ""}|${k}`;
const readOpen = (k: string, fallback: boolean) => openStoreAll()[storeKey(k)] ?? fallback;
const writeOpen = (k: string, v: boolean) => {
  const all = openStoreAll(); all[storeKey(k)] = v;
  try { window.sessionStorage.setItem(OPEN_STORE_KEY, JSON.stringify(all)); } catch { /* sem sessão: segue só em memória */ }
};
/** useState que lembra o valor (aberto/fechado, editando) por chave, inclusive após F5. */
function usePersistedFlag(key: string, fallback: boolean): [boolean, (v: boolean | ((o: boolean) => boolean)) => void] {
  const [v, setV] = useState(() => readOpen(key, fallback));
  const set = useCallback((next: boolean | ((o: boolean) => boolean)) => setV((cur) => { const n = typeof next === "function" ? next(cur) : next; writeOpen(key, n); return n; }), [key]);
  return [v, set];
}

// Abas do produto ficam montadas (só escondidas) ao trocar de aba: tudo que estava aberto/digitado continua como estava; F5 reinicia.
function KeepTabsContent({ className, ...props }: React.ComponentProps<typeof TabsContent>) {
  return <TabsContent forceMount className={`${className ?? ""} data-[state=inactive]:hidden`} {...props} />;
}

function PersistDetails({ persistKey, open: _ignored, onToggle, children, ...rest }: React.DetailsHTMLAttributes<HTMLDetailsElement> & { persistKey: string }) {
  return <details data-accordion {...rest} open={readOpen(persistKey, false) || undefined} onToggle={(e) => { writeOpen(persistKey, (e.currentTarget as HTMLDetailsElement).open); onToggle?.(e); }}>{children}</details>;
}

function SectionCard({ icon: Icon, title, subtitle, help, headerAction, children, collapsible = true, defaultOpen = true, forceOpen = false, keepMounted = false, number, tone, storeKey }: { storeKey?: string; tone?: "soft"; number?: number; keepMounted?: boolean; icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; help?: string; headerAction?: React.ReactNode; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean; forceOpen?: boolean }) {
  const [open, setOpenRaw] = useState(() => readOpen("sec:" + (storeKey ?? title), defaultOpen));
  const setOpen = (fn: (o: boolean) => boolean) => setOpenRaw((o) => { const v = fn(o); writeOpen("sec:" + (storeKey ?? title), v); return v; });
  useAccordionAll((o) => { if (collapsible) setOpenRaw(o); });
  const shown = !collapsible || open || forceOpen;
  const head = (
    <>
      {number != null ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full section-number-badge text-xs font-bold text-white" data-testid="section-number">{number}</span> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Icon className="h-3.5 w-3.5" /></span>}
      <div className="min-w-0 flex-1 text-left">
        <h3 className="text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100">{title}{help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}</h3>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={subtitle}>{subtitle}</p>
      </div>
    </>
  );
  const toggleIcon = shown ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />;
  const heading = collapsible ? <div className="flex min-w-0 items-center gap-2"><button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown} className="flex min-w-0 flex-1 items-center gap-2.5">{head}{!headerAction && toggleIcon}</button>{headerAction && <span className="shrink-0" onClick={(e) => e.stopPropagation()}>{headerAction}</span>}{headerAction && <button type="button" aria-label={shown ? "Recolher" : "Expandir"} onClick={() => setOpen((o) => !o)} className="shrink-0 p-1">{toggleIcon}</button>}</div> : <header className="flex items-center gap-2.5">{head}<span className="ml-auto shrink-0">{headerAction}</span></header>;
  const card = <section className={`rounded-2xl border border-slate-200 px-3 py-2 shadow-sm dark:border-slate-800 ${tone === "soft" ? "bg-slate-100/80 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900/60"}`}>
      {heading}
      {(shown || keepMounted) && <div className={shown ? "mt-2.5 space-y-2" : "hidden"}>{children}</div>}
    </section>;
  return card;
}

// Somente os cartões principais recolhem. Ao abrir uma seção, seus campos
// ficam todos visíveis e editáveis — sem um segundo nível de accordions.
function FieldAccordion({ title, help, children }: { title: React.ReactNode; help?: string; children: React.ReactNode; forceOpen?: boolean }) {
  // Ajuda SÓ no ícone "i" (o tooltip não aparece mais ao passar o mouse no resto do cartão). O "i" é o mesmo da camada de ajuda.
  const heading = <div data-no-info={help ? "" : undefined} className="flex w-full items-center gap-2 text-left text-[12px] font-semibold text-slate-700 dark:text-slate-200"><span className="flex-1">{title}{help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}</span></div>;
  const card = <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/40">
    {heading}
    <div className="mt-2">{children}</div>
  </div>;
  return card;
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
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ring-1 transition focus:outline-none ${light ? "bg-white text-slate-800 ring-slate-300 hover:bg-slate-50" : "bg-white/15 text-white ring-white/30 backdrop-blur hover:bg-white/25 focus:ring-2 focus:ring-white/60"}`}
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

function EditorHeader({ product, selectedVersionId, onSelectVersion, onBack, onRefresh, canNewVersion, onNewVersion, pin, canPublish, onPublish, versionInfo, priceInfo, editMode, onStartEdit, onStopEdit, onChangeStatus, onSaveDraft, unsavedDraftId, onClientView, previewOpen, readiness }: any) {
  // O atalho para a Bandeja precisa existir mesmo se o editor for aberto por
  // uma rota alternativa (sem o `pin` explícito do painel pai).
  const trayEntry: PinnedEntry = pin ?? { id: `catalog2-produto-${product.id}`, label: "Editor de produto", icon: Layers, path: `/admin/cadastro-produtos/${product.sequence_number ?? product.id}` };
  const { pinned, toggle } = usePinEntry(trayEntry);
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
      className="flex min-h-[54px] shrink-0 items-center gap-1.5 overflow-x-hidden rounded-2xl px-3 py-1 shadow-lg ring-1 ring-white/15"
      style={{ background: "radial-gradient(ellipse at 88% -20%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.10)), var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))" }}
    >
      <HeaderIconBtn label="Voltar" onClick={onBack} className="shrink-0 !p-1.5"><ArrowLeft className="h-5 w-5" /></HeaderIconBtn>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden py-0.5">
      <div className="flex min-w-0 items-center gap-2">
        {product.sequence_number != null && <span title={`Produto ID ${String(product.sequence_number).padStart(2, "0")}`} className="shrink-0 rounded bg-white/20 px-1.5 py-px text-[10px] font-bold tracking-wide text-white" data-testid="product-id-badge">ID {String(product.sequence_number).padStart(2, "0")}</span>}
        <h2 title={headerTitle !== product.internal_name ? `Nome interno: ${product.internal_name}` : undefined} className="min-w-0 flex-1 whitespace-normal break-words text-[15px] font-bold leading-tight text-white [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">{headerTitle}</h2>
      </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isDraftView && <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-sm">Rascunho v{selVersion.version_number} · não publicado</span>}
          {isOldView && <span className="inline-flex items-center gap-1 rounded-full bg-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-800 shadow-sm">Versão antiga v{selVersion.version_number}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Status do produto"
                title="Status comercial do produto — clique para alterar (pede confirmação; vale na hora, sem precisar de Editar)"
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm transition hover:brightness-95 ${catalog2StatusTone(product.status)}`}
              >
                {(isDraftView || isOldView) && <span className="font-normal opacity-70">Produto:</span>}{catalog2StatusLabel(product.status)}<ChevronDown className="h-3 w-3" />
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
          <HeaderPriceTag version={selVersion} productId={product.id} fallback={priceInfo} />
        </div>
      </div>
      <VersionPicker versions={product.versions} selectedVersionId={selectedVersionId} onSelect={onSelectVersion} unsavedDraftId={unsavedDraftId} />
      {readiness}
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
      <HeaderIconBtn label="Visualizar como o cliente vê (prévia da versão que está aberta)" onClick={onClientView} className={`flex shrink-0 items-center gap-1.5 !px-2.5 !py-1.5 text-xs font-semibold ${previewOpen ? "!bg-white/25 !text-white" : "bg-white/10"}`}><Eye className="h-4.5 w-4.5" /><span className="hidden sm:inline" data-testid="client-view-label">Ver como o cliente vê</span></HeaderIconBtn>
      <HeaderIconBtn label={pinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"} onClick={toggle} className={pinned ? "!text-amber-300" : ""}>
        <Pin className={`h-5 w-5 ${pinned ? "fill-current" : ""}`} />
      </HeaderIconBtn>
      <HeaderIconBtn label="Recarregar dados do produto (busca de novo no servidor o que foi salvo)" onClick={refresh}>
        <RefreshCw className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`} />
      </HeaderIconBtn>
      {canNewVersion && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Mais ações" className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canNewVersion && <DropdownMenuItem onClick={onNewVersion}>Nova versão (rascunho)</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <HeaderIconBtn label="Fechar" onClick={onBack} className="shrink-0 !p-1.5"><X className="h-5 w-5" /></HeaderIconBtn>
    </div>
  );
}

function StepIntro({ children, noToggle = false }: { children: React.ReactNode; noToggle?: boolean }) {
  // A frase explicativa virou um botãozinho "i" (aparece ao passar o mouse): economiza altura.
  return <div className="mb-3 flex items-center justify-end gap-2"><span className="field-info" data-help={typeof children === "string" ? children : undefined} aria-hidden="true">i</span>{!noToggle && <AccordionToggleAll />}</div>;
}
/** `field`: nome do campo para rolar até ele; `error`: destaca o campo e explica o que falta. */
function Field({ label, children, field, error }: { label: React.ReactNode; children: React.ReactNode; field?: string; error?: string | null }) {
  return (
    <label data-field={field} data-invalid={error ? "true" : undefined} className={`block min-w-0 space-y-0.5 ${error ? "rounded-md ring-2 ring-rose-400 ring-offset-2" : ""}`}>
      <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>{children}
      {error && <span role="alert" className="block text-[11px] font-semibold text-rose-600">{error}</span>}
    </label>
  );
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

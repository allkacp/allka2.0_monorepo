"use client";

import { Suspense, lazy, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Copy, RefreshCw, Search, Link2, Unlink, FileText, Settings2, Clock, Save, CheckCircle2, MoreVertical, X, Pin, Tag, Layers, ListChecks, CheckSquare, ListOrdered, DollarSign, CalendarClock, Info, Sparkles, UploadCloud, Undo2, Pencil, Lock, Eye, Check, Globe2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { ModelPickerDialog, TaskModelInfoDialog, ModelScopeDialog, SimilarModelsDialog, ModelStatusChips, TaskIndicators, EXEC_LABEL, PURPOSE_LABEL, CYCLE_TYPE_LABEL, REPEAT_RULE_LABEL, IMPLEMENTATION_RULE_LABEL, CONTINUITY_LABEL, ASSET_RULE_LABEL } from "./catalog2-models-ui";
import { TaskOpsForm } from "./catalog2-ops-ui";
import { TaskDeliverablesEditor } from "./catalog2-deliverables-ui";
import { AiConfig } from "./catalog2-ai-ui";
import { CommercialConsistencyBanner } from "./commercial-consistency";
import { CommercialFieldsCard } from "./catalog2-commercial-ui";
import { ConnectionsSection } from "./catalog2-connections-ui";
import { StepChecklistDialog, checklistCount, type ChecklistItem } from "./catalog2-step-checklist-ui";
import { AudienceCard } from "./catalog2-audience-ui";
import { AiFreeChangesCard } from "./catalog2-ai-free-changes";
import { StepAccessPicker } from "./step-access-picker";
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
import { QuestionConfigFields, emptyQuestion, draftFromServer, draftFromSuggestion, payloadFromDraft, questionTypeLabel, type QuestionDraft } from "./catalog2-questions-ui";
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
  ...EFFORT_TYPES,
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
  const [screenNotifications, setScreenNotifications] = useState<{ id: string; content: React.ReactNode }[]>([]);
  const [screenNotificationsOpen, setScreenNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Prontidão navegável (pedido do usuário 2026-09-25): clicar num item leva
  // à aba/sub-aba/campo certo e destaca em amarelo até o item ficar resolvido.
  const [loadCount, setLoadCount] = useState(0);
  const [accessCatalogOpen, setAccessCatalogOpen] = useState(false);
  const [subTabs, setSubTabs] = useState({ opcoes: "class", entrega: "tarefas", revisao: "preview" });
  const entregaInfo = {
    tarefas: { title: "Tarefas e etapas", text: "Roxo identifica tarefas e seus números; azul identifica as etapas. Verde indica modelo global ou configuração válida." },
    cond: { title: "Prazos e condições", text: "Cadastre regras reais de gatilho e efeito. Elas podem alterar prazo, preço, tarefas, etapas ou entregáveis conforme a contratação." },
    aprov: { title: "Aprovações e prazos", text: "Configure quem aprova, em qual momento e os prazos de cada aprovação antes de a entrega avançar." },
  }[subTabs.entrega] ?? { title: "Informações", text: "Informações desta etapa." };
  const [watch, setWatch] = useState<{ key: string; ids: string[] } | null>(null);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  // Ao configurar um custo global a partir de uma tarefa, a pessoa não perde o
  // contexto: o editor guarda a origem e reabre a própria tarefa ao voltar.
  const [pricingReturnTaskId, setPricingReturnTaskId] = useState<string | null>(null);
  const [taskEditRequest, setTaskEditRequest] = useState<string | null>(null);
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
    <FieldHelpLayer>
    <div className="product-editor relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-[#dfe5f6] p-3 dark:bg-slate-950">
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
      <div className={`min-h-0 flex-1 flex-col ${previewOpen ? "hidden" : "flex"}`}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-3">
      <ProductReadinessPanel productId={productId} versionId={selectedVersionId} versionKey={`${selectedVersionId}:${loadCount}`} onGo={goToReadinessItem} onGoDetail={goToReadinessAdjustment} onItems={setReadinessItems} onData={setReadinessData} detailFor={(key: string) => readinessDetailLines(key, product, version, readinessItems?.[key]?.note)} detailTargetFor={(key: string, index: number) => readinessDetailTargets(key, product, version, readinessItems?.[key]?.note)[index]} />

      {version && (
        <Tabs value={editorTab} onValueChange={setEditorTab}>
          {/* Etapas de trabalho (reunião 10/09). As 10 seções originais
              continuam todas aqui — reagrupadas, nada removido. */}
          <Stepper current={editorTab} onSelect={(t: string) => { void flushPending().then(() => setEditorTab(t)); }} items={readinessItems} />

          <KeepTabsContent value="info" className="mt-3">
            <div className="mb-3 space-y-2"><ProductCounts version={version} /><AudienceCard product={product} readOnly={!product} onDone={() => void load()} /><AiFreeChangesCard key={product?.id ?? "novo"} product={product} readOnly={!product} /></div>
            <GeneralTab version={version} readOnly={readOnly} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2VersionInfo(version.id, b), "Informações salvas.", { rethrow: true })} product={product} />
          </KeepTabsContent>

          <KeepTabsContent value="opcoes" className={TAB_CARD}>
            <StepIntro>Como o produto é classificado e as escolhas que o cliente faz na contratação.</StepIntro>
            <Tabs value={subTabs.opcoes} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, opcoes: v }))}>
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="class" className={SUB_TAB}><Tag className="h-3.5 w-3.5" />Classificação</TabsTrigger>
                <TabsTrigger value="var" className={SUB_TAB}><Layers className="h-3.5 w-3.5" />Variações</TabsTrigger>
                <TabsTrigger value="add" className={SUB_TAB}><Plus className="h-3.5 w-3.5" />Adicionais</TabsTrigger>
                <TabsTrigger value="cond" className={SUB_TAB}><Clock className="h-3.5 w-3.5" />Prazos e condições</TabsTrigger>
              </TabsList>
              <KeepTabsContent value="class"><ClassTab product={product} refs={refs} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2Classifications(productId, b), "Classificações salvas.")} /></KeepTabsContent>
              <KeepTabsContent value="var"><div id="sec-var" className={secRing("sec-var")}><VariationsTab version={version} readOnly={readOnly} act={act} /></div></KeepTabsContent>
              <KeepTabsContent value="add"><div id="sec-add" className={secRing("sec-add")}><AddonsTab version={version} readOnly={readOnly} act={act} /></div></KeepTabsContent>
              <KeepTabsContent value="cond"><EmergencyCard version={version} readOnly={readOnly} act={act} /><ConditionsTab version={version} readOnly={readOnly} act={act} /><div className="mt-4 space-y-4"><p className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">Aprovações e prazos GERAIS do produto (implantação, ciclo recorrente, relatório, publicação…). A aprovação e o prazo de cada etapa se configuram dentro da própria etapa (aba Tarefa e etapas).</p><ApprovalGatesSection version={version} readOnly={readOnly} act={act} /><SlaRulesSection version={version} readOnly={readOnly} act={act} /></div></KeepTabsContent>
            </Tabs>
          </KeepTabsContent>

          <KeepTabsContent value="entrega" className="mt-3 space-y-3">
            <div className="mb-3 space-y-3">
              <DeliveryCommercialOverview version={version} readOnly={readOnly} act={act} ringOf={ringOf} locked={!editMode} />
              <AccessCatalogDialog open={accessCatalogOpen} onOpenChange={setAccessCatalogOpen} version={version} readOnly={readOnly} act={act} />
              <PersistDetails persistKey="d1" id="sec-connections" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><summary className="flex min-h-[30px] cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40"><Lock className="h-4 w-4" /></span>Acessos necessários{!readOnly && <button type="button" data-testid="add-access-header" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAccessCatalogOpen(true); }} className="ml-2 inline-flex h-7 items-center gap-1 rounded-lg border border-violet-300 bg-white px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"><Plus className="h-3.5 w-3.5" />Adicionar acesso</button>}<span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-semibold ${accessCount(version) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{accessCount(version) > 0 ? `${accessCount(version)} configurado${accessCount(version) === 1 ? "" : "s"}` : "1 acesso pendente"}</span><ChevronDown className="h-4 w-4 text-slate-500" /></summary><div className="mt-3 min-w-0 space-y-4"><ConnectionsSection version={version} readOnly={readOnly} act={act} /></div></PersistDetails>
            </div>
            <Tabs value={subTabs.entrega} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, entrega: v }))}>
              <div className="flex items-center gap-3">
                <TabsList className={`${SUB_TABS_LIST} !gap-0.5 !p-0.5`}>
                  <TabsTrigger value="tarefas" className={`${SUB_TAB} !px-2.5 !py-1 !text-xs`}><ListOrdered className="h-3.5 w-3.5" />{product?.task_structure === "single" ? "Tarefa e etapas" : "Tarefas e etapas"}</TabsTrigger>
                </TabsList>
                <span className="min-w-0 flex-1 truncate text-[11px] text-violet-900 dark:text-violet-100" data-testid="task-structure-banner" title={product?.task_structure === "single" ? "Produto individual: uma tarefa principal. Todo o trabalho é dividido em etapas dentro da tarefa. Várias tarefas só existem em combos (tela de Combos)." : "Cada tarefa é um bloco de trabalho; as etapas são o passo a passo de cada uma."}><strong>{product?.task_structure === "single" ? "Produto individual: uma tarefa principal." : "Produto composto (combo): várias tarefas."}</strong> {product?.task_structure === "single" ? "Todo o trabalho é dividido em etapas." : "As etapas são o passo a passo de cada tarefa."}</span>
                <div className="ml-auto flex items-center gap-1 text-[11px]">
                  <Tooltip><TooltipTrigger asChild><button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700" aria-label={`Informações: ${entregaInfo.title}`}><Info className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs text-xs"><p className="font-bold">{entregaInfo.title}</p><p className="mt-1">{entregaInfo.text}</p></TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><button type="button" aria-label="Recolher todas as tarefas" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-violet-700" onClick={() => window.dispatchEvent(new Event("catalog2:collapse-tasks"))}><ChevronUp className="h-4 w-4" /></button></TooltipTrigger><TooltipContent side="bottom">Recolher todas</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><button type="button" aria-label="Expandir todas as tarefas" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-violet-700" onClick={() => window.dispatchEvent(new Event("catalog2:expand-tasks"))}><ChevronDown className="h-4 w-4" /></button></TooltipTrigger><TooltipContent side="bottom">Expandir todas</TooltipContent></Tooltip>
                </div>
              </div>
              <KeepTabsContent value="tarefas"><TasksTab taskStructure={product?.task_structure ?? "multiple"} version={version} productId={productId} readOnly={readOnly} refs={refs} act={act} highlightTarget={highlightTarget} highlightTaskIds={highlightTaskIds} clearHighlight={clearPublishHighlight} editTaskId={taskEditRequest} onOpenPricing={openPricingFromTask} /></KeepTabsContent>
            </Tabs>
          </KeepTabsContent>

          <KeepTabsContent value="precos" className={TAB_CARD}>
            <StepIntro>Taxas, margens e valor/hora das especialidades. O preço e o prazo são sempre calculados no servidor.</StepIntro>
            <CostTab version={version} refs={refs} act={act} onReloadRefs={load} productId={productId} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} />
          </KeepTabsContent>

          <TabsContent value="revisao" className={TAB_CARD}>
            <StepIntro>Confira como o produto aparece para o cliente e publique a versão quando estiver pronta.</StepIntro>
            <Tabs value={subTabs.revisao} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, revisao: v }))}>
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="preview" className={SUB_TAB}><Eye className="h-3.5 w-3.5" />Conferência final</TabsTrigger>
                <TabsTrigger value="hist" className={SUB_TAB}><UploadCloud className="h-3.5 w-3.5" />Publicação e versões</TabsTrigger>
                <TabsTrigger value="historico" className={SUB_TAB}><Clock className="h-3.5 w-3.5" />Histórico</TabsTrigger>
              </TabsList>
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
              <Button variant="outline" className="h-8 gap-1 px-2.5 text-xs" disabled={!prev} onClick={() => prev && go(prev.id)}><ArrowLeft className="h-3.5 w-3.5" /> {prev ? "Voltar" : "Início"}</Button>
              <span className="text-xs font-medium text-slate-500">Passo {idx + 1} de {EDITOR_STEPS.length}</span>
              <Button style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="h-8 gap-1 px-2.5 text-xs text-white shadow-md hover:brightness-110 disabled:opacity-55" disabled={!next} onClick={() => next && go(next.id)}>{next ? `Passo ${idx + 2}: ${next.label.split(":")[0]}` : "Fim"} <ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Button variant="outline" onClick={() => setScreenNotificationsOpen((open) => !open)} className="relative h-8 gap-1.5 px-2.5 text-xs" title="Avisos desta tela"><ListChecks className="h-3.5 w-3.5" /> Avisos{screenNotifications.length > 0 && <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">{screenNotifications.length}</span>}</Button>
              {fmtUpdatedAt(version.updated_at ?? product.updated_at) && <span className="hidden text-[11px] text-slate-500 2xl:inline">Atualizado: {fmtUpdatedAt(version.updated_at ?? product.updated_at)}</span>}
              {!editMode ? (
                <Button onClick={() => void startEditing()} className="h-8 gap-1.5 bg-[#1b2559] px-3 text-xs text-white hover:bg-[#253277]"><Pencil className="h-3.5 w-3.5" /> Editar</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => void stopEditing()} className="h-8 gap-1.5 px-2.5 text-xs"><Lock className="h-3.5 w-3.5" /> Travar edição</Button>
                  {version.state !== "publicada" && <Button onClick={() => void saveDraft()} className="h-8 gap-1.5 bg-[#1b2559] px-3 text-xs text-white hover:bg-[#253277]"><Save className="h-3.5 w-3.5" /> Salvar rascunho</Button>}
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
          <Suspense fallback={<div className="flex items-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>}>
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
function AiFieldButton({ label, value, mode = "text", context, onResult, disabled, defaultResearch = true, compact = false }: { label: string; value: string; mode?: "text" | "list"; context: any; onResult: (v: string) => void; disabled?: boolean; defaultResearch?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [approach, setApproach] = useState<"melhorar" | "recriar">(value.trim() ? "melhorar" : "recriar");
  const [length, setLength] = useState<"manter" | "curto" | "medio" | "longo">("manter");
  const [research, setResearch] = useState(defaultResearch);
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
      const r: any = await apiClient.aiImproveProductField({ field_label: label, current_value: value, mode, length, approach, research, context, max_words: maxWords ? Number(maxWords) : null, max_chars: maxChars ? Number(maxChars) : null, min_words: minWords ? Number(minWords) : null, min_chars: minChars ? Number(minChars) : null });
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
            disabled={disabled || tooShort}
            title={tooShort ? "Informe o nome do produto (título comercial) ou escreva algo no campo para liberar a IA." : "Preencher ou melhorar com Inteligência Artificial"}
            className={`inline-flex items-center rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 ${compact ? "h-6 w-6 justify-center" : "gap-1 px-2 py-1 text-[11px]"}`}
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
            <label className="flex flex-col gap-0.5">Máx. caracteres<input type="number" min={1} value={maxChars} onChange={(e) => setMaxChars(e.target.value)} placeholder="sem limite" className="h-7 rounded border border-slate-200 px-1.5 text-xs" aria-label="Limite de caracteres" /></label>
          </div>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} className="mt-0.5" />
            <span>Pesquisar na internet (como o produto é conhecido <strong>hoje</strong>)</span>
          </label>
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

function GeneralTab({ version, readOnly, onSave, product, highlightTarget, clearHighlight }: any) {
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
  async function applyAiDraft(d: any) {
    const patch = draftToVersionPatch(d, f);
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
      <SectionCard icon={FileText} title="Dados principais" subtitle="Nome e descrição comercial do produto." help="Preencha o nome comercial e um resumo curto que explicam este produto para o cliente." defaultOpen={false}>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <div id="catalog2-field-title" className={ringOf("catalog2-field-title")}>
            <FieldAccordion title={<span>Título comercial <Req /></span>} help="O nome que aparece para o cliente ao contratar este produto." forceOpen={ringOf("catalog2-field-title") !== ""}><div className="space-y-1"><div className="relative"><Input aria-label="Título comercial" className="h-[62px] pr-16" disabled={readOnly} value={f.title} onChange={(e) => updateInfo({ title: e.target.value })} /><span className="absolute right-2 top-2"><AiFieldButton compact label="Título comercial" value={f.title} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} onResult={(v) => updateInfo({ title: v.replace(/\n/g, " ").slice(0, 200) })} /></span></div><CharCount value={f.title} max={200} /></div></FieldAccordion>
          </div>
          <FieldAccordion title={<span>Descrição curta <Req /></span>} help="Resumo breve que apresenta o serviço ao cliente."><div className="space-y-1"><div className="relative"><Textarea aria-label="Descrição curta" rows={2} className="min-h-[62px] pr-16" disabled={readOnly} value={f.summary} onChange={(e) => updateInfo({ summary: e.target.value })} /><span className="absolute right-2 top-2"><AiFieldButton compact label="Descrição curta" value={f.summary} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} onResult={(v) => updateInfo({ summary: v.slice(0, 500) })} /></span></div><CharCount value={f.summary} max={500} /></div></FieldAccordion>
        </div>
      </SectionCard>

      <SectionCard icon={FileText} title="Descrição completa" subtitle="Detalhe o produto com informações completas, benefícios e diferenciais." help="Apresente como o produto funciona, seus benefícios, limites e diferenciais de forma clara." collapsible defaultOpen={false} forceOpen={ringOf("catalog2-field-full-description") !== ""}>
        <div id="catalog2-field-full-description" className={ringOf("catalog2-field-full-description")}><FieldAccordion title={<span>Descrição <Req /></span>} help="Explicação completa do produto, com benefícios, funcionamento e diferenciais." forceOpen={ringOf("catalog2-field-full-description") !== ""}><div className="space-y-1"><div className="relative"><Textarea aria-label="Descrição" rows={5} className="pr-16" disabled={readOnly} value={f.full_description} onChange={(e) => updateInfo({ full_description: e.target.value })} /><span className="absolute right-2 top-2"><AiFieldButton compact label="Descrição completa" value={f.full_description} context={{ name: f.title, category: product.category?.name, other_fields: { "Descrição curta": f.summary, "Descrição completa": f.full_description } }} disabled={readOnly} onResult={(v) => updateInfo({ full_description: v.slice(0, 2000) })} /></span></div><CharCount value={f.full_description} max={4000} /></div></FieldAccordion></div>
      </SectionCard>

      <CommercialFieldsCard version={version} readOnly={readOnly} registerFlush={registerFlusher} registerSave={(fn) => { saveCommercialRef.current = fn; return () => { if (saveCommercialRef.current === fn) saveCommercialRef.current = async () => {}; }; }} onSave={(b) => onSave(b)} />

      <SectionCard icon={Clock} title="Resumo da mudança" subtitle="Escrito pela IA a partir do que foi alterado — você pode editar." collapsible defaultOpen={false}>
        <div className="space-y-1">
          <div className="relative"><Textarea rows={2} maxLength={500} className="pr-16" disabled={readOnly} placeholder="Deixe em branco: ao salvar, a IA descreve o que foi alterado (preço, prazo, textos, tarefas…)." value={f.change_summary} onChange={(e) => updateInfo({ change_summary: e.target.value })} /><span className="absolute right-2 top-2"><ChangeSummaryAiButton compact versionId={version.id} disabled={readOnly} onResult={(v) => updateInfo({ change_summary: v.slice(0, 500) })} /></span></div>
          <CharCount value={f.change_summary} max={500} />
        </div>
      </SectionCard>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" data-testid="open-ai-chat" onClick={() => setAiChatOpen(true)} title="A IA conversa com você e preenche o produto inteiro a partir de uma explicação" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"><Sparkles className="h-3.5 w-3.5" />Preencher o produto com IA</button>
          <SaveButton disabled={savingInfo || (f.summary.length > 500 && f.summary !== (version.summary ?? "")) || (f.full_description.length > 4000 && f.full_description !== (version.full_description ?? ""))} onClick={() => void saveInfo()}>{savingInfo ? "Salvando…" : "Salvar informações"}</SaveButton>
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
        className={`inline-flex items-center rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 ${compact ? "h-6 w-6 justify-center" : "gap-1 px-2 py-1 text-[11px]"}`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}{!compact && ` ${busy ? "Analisando…" : "Gerar com IA"}`}
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
  const fourFDescription = (name: string, index: number) => {
    const code = (name.match(/F\s*([1-4])/i)?.[1] ?? String(index + 1));
    return ({ "1": "Estrutura e base", "2": "Aquisição e tráfego", "3": "Oferta e conversão", "4": "Retenção e crescimento" } as Record<string, string>)[code] ?? "Classificação comercial";
  };
  return (
    <div id="catalog2-classification" className="mt-3 scroll-mt-6">
      <SectionCard icon={Layers} title="Classificação do produto" subtitle="Pilar, categoria e classificações 4F" defaultOpen>
      <div className="grid items-start gap-4 md:grid-cols-2">
      <section className="space-y-2 md:border-r md:border-slate-200 md:pr-4 dark:md:border-slate-800">
        <div><h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Base comercial</h4><p className="text-[11px] text-slate-500">Defina o pilar e a categoria do produto.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
        <div id="catalog2-field-pillar" className={ringOf("catalog2-field-pillar")}><Field label="Pilar">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={pillar} onChange={(e) => setPillar(e.target.value)}>
          <option value="">—</option>{refs.pillars.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field></div>
      <div id="catalog2-field-category" className={ringOf("catalog2-field-category")}><Field label="Categoria">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>{refs.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field></div>
        </div>
      </section>
      <section className="space-y-2">
        <div><h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Classificações 4F</h4><p className="text-[11px] text-slate-500">Selecione as classificações que se aplicam ao produto.</p></div>
        <div id="catalog2-field-four-f" className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${ringOf("catalog2-field-four-f")}`}>
          {refs.fourF.map((f: any, index: number) => {
            const selected = fourF.includes(f.id);
            return <label key={f.id} className={`flex min-h-[52px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${selected ? "border-violet-500 bg-violet-50 text-violet-950 shadow-[inset_0_0_0_1px_rgba(124,58,237,.08)] dark:bg-violet-950/30 dark:text-violet-100" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
              <input type="checkbox" className="sr-only" checked={selected} onChange={(e) => setFourF(e.target.checked ? [...fourF, f.id] : fourF.filter((x) => x !== f.id))} />
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"}`}>{selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className="min-w-0"><span className="block text-[12px] font-semibold leading-tight">{f.name}</span><span className="block truncate pt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{fourFDescription(f.name, index)}</span></span>
            </label>
          })}
        </div>
      </section>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
        <span className="font-semibold">Divergência encontrada:</span><span>a classificação da planilha principal precisa de decisão comercial.</span><button type="button" className="font-semibold text-violet-700 underline underline-offset-2 dark:text-violet-300">Ver detalhes</button>
        <span className="ml-auto"><SaveButton onClick={saveClassifications}>Salvar classificação</SaveButton></span>
      </div>
      </SectionCard>
    </div>
  );
}

// ── 3. Variações ─────────────────────────────────────────────────────
function VariationsTab({ version, readOnly, act }: any) {
  const [nv, setNv] = useState({ name: "" });
  const [adding, setAdding] = useState(false);
  const keyFromName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-slate-600 dark:border-violet-900/60 dark:bg-violet-950/20 dark:text-slate-300">
        <Layers className="h-4 w-4 shrink-0 text-violet-600" /><span>As escolhas do cliente atualizam preço, prazo, tarefas, etapas e entregáveis conforme os impactos configurados.</span>
        {!readOnly && <AddBtn onClick={() => setAdding((v) => !v)}>Nova variação</AddBtn>}
      </div>
      {version.variations.map((va: any, vi: number) => (
        <section key={va.id} className="rounded-[14px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex min-h-[58px] items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"><Layers className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{va.name}</span><span className="block text-[11px] text-slate-500">{va.options.length === 1 ? "1 opção disponível" : `${va.options.length} opções disponíveis`}</span></span><Badge className={va.is_required ? "border-0 bg-amber-100 text-amber-800" : "border-0 bg-slate-100 text-slate-600"}>{va.is_required ? "Obrigatória" : "Opcional"}</Badge>{va.options.find((o: any) => o.is_default) && <Badge className="border-0 bg-blue-100 text-blue-700">Padrão: {va.options.find((o: any) => o.is_default)?.label}</Badge>}<Badge className={va.options.some((o: any) => (o.effects ?? []).length > 0) ? "border-0 bg-emerald-100 text-emerald-700" : "border-0 bg-slate-100 text-slate-500"}>{va.options.some((o: any) => (o.effects ?? []).length > 0) ? "Configurada" : "A configurar"}</Badge>{va.is_active === false && <Badge className="border-0 bg-neutral-200 text-neutral-600">Inativa</Badge>}</div>
            <span className="flex items-center gap-1">{!readOnly && <DeleteBtn label="Remover variação?" tip="Remover esta variação" onConfirm={() => act(() => apiClient.deleteCatalog2Variation(va.id), "Variação removida.")} />}</span>
          </div>
          <VariationEditor va={va} index={vi} list={version.variations} version={version} readOnly={readOnly} act={act} />
        </section>
      ))}
      {!readOnly && adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-[14px] border border-dashed border-violet-300 bg-white p-3 dark:border-violet-800 dark:bg-slate-900/60">
          <MiniField label="Nome da nova variação"><Input className="h-9 w-72 max-w-full" placeholder="Ex.: Número de campanhas simultâneas" value={nv.name} onChange={(e) => setNv({ name: e.target.value })} /></MiniField><AddBtn onClick={() => nv.name.trim() && act(() => apiClient.addCatalog2Variation(version.id, { key: keyFromName(nv.name), name: nv.name.trim() }), "Variação criada.").then(() => { setNv({ name: "" }); setAdding(false); })}>Criar variação</AddBtn>
        </div>
      )}
    </div>
  );
}

function EffectChips({ effects }: { effects: any[] }) {
  const labels: Record<string, string> = { add_deadline_days: "Prazo", add_fixed_amount: "Preço", add_percent: "Preço", add_task: "Tarefas", remove_task: "Tarefas", add_step: "Etapas", require_info: "Informações", add_deliverable: "Entregáveis", add_effort_minutes: "Esforço", add_effort_hours: "Esforço", replace_effort_minutes: "Esforço" };
  if (!effects?.length) return <span className="text-[11px] text-slate-400">Sem impactos configurados</span>;
  return <span className="flex flex-wrap gap-1">{effects.map((effect: any) => <Badge key={effect.id} className="border-0 bg-violet-100 text-[10px] font-medium text-violet-800">{labels[effect.effect_type] ?? "Impacto"}</Badge>)}</span>;
}

function VariationEditor({ va, index, list, version, readOnly, act }: any) {
  const [help, setHelp] = useState(va.notes ?? "");
  const [newLabel, setNewLabel] = useState("");
  const putVariation = (body: any, ok: string) => act(() => apiClient.updateCatalog2Variation(va.id, body), ok);
  const type = va.selection_type ?? "single";
  return <div className="space-y-3 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <label className="inline-flex items-center gap-1.5"><span className="font-semibold text-slate-700 dark:text-slate-200">Tipo de escolha</span><select disabled={readOnly} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={type} onChange={(e) => void putVariation({ selection_type: e.target.value }, "Tipo de escolha atualizado.")}><option value="single">Uma opção</option><option value="multiple">Várias opções</option><option value="quantity">Quantidade</option></select></label>
      <CheckPill disabled={readOnly} checked={!!va.is_required} onChange={(v) => void putVariation({ is_required: v }, "Obrigatoriedade atualizada.")}>Obrigatória</CheckPill>
      <CheckPill disabled={readOnly} checked={va.is_active !== false} onChange={(v) => void putVariation({ is_active: v }, "Variação atualizada.")}>Ativa</CheckPill>
      {!readOnly && <span className="ml-auto"><IconBtn label="Reordenar variação" onClick={() => void putVariation({ sort_order: Math.max(1, (va.sort_order ?? index + 1) - 1) }, "Ordem atualizada.")}><ListOrdered className="h-4 w-4" /></IconBtn></span>}
    </div>
    <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Ajuda para o cliente</span><Input disabled={readOnly} className="h-10 text-xs" maxLength={2000} value={help} onChange={(e) => setHelp(e.target.value)} onBlur={() => { if (help !== (va.notes ?? "")) void putVariation({ notes: help.trim() || null }, "Ajuda salva."); }} placeholder="Explique como o cliente deve escolher" /></label>
    <ul className="space-y-2">
      {va.options.map((option: any, optionIndex: number) => <VariationOptionRow key={option.id} option={option} variation={va} index={optionIndex} list={va.options} version={version} readOnly={readOnly} act={act} />)}
    </ul>
    {!readOnly && <div className="flex flex-wrap items-center justify-between gap-2 pt-1"><div className="flex items-center gap-2"><Input className="h-8 w-56 text-xs" placeholder="Título da nova opção" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} /><AddBtn onClick={() => newLabel.trim() && act(() => apiClient.addCatalog2Option(va.id, { key: newLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), label: newLabel.trim() }), "Opção adicionada.").then(() => setNewLabel(""))}>Adicionar opção</AddBtn></div><SaveButton onClick={() => void putVariation({ notes: help.trim() || null }, "Variação salva.")}>Salvar variação</SaveButton></div>}
  </div>;
}

function VariationOptionRow({ option, variation, index, list, version, readOnly, act }: any) {
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
  return <li className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/20">
    <div className="grid items-center gap-2 lg:grid-cols-[20px_40px_20px_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(9rem,1fr)_74px_26px]">
      <span className="cursor-grab text-center text-slate-400" title="A ordem pode ser ajustada pelo menu da opção">⠿</span>
      <TooltipProvider delayDuration={160}><Tooltip><TooltipTrigger asChild><label className="grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white text-slate-400 hover:border-violet-400 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-900"><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={readOnly} onChange={(e) => { const file = e.target.files?.[0]; if (file) saveImage(file); e.currentTarget.value = ""; }} />{option.media_url ? <img className="h-full w-full object-cover" src={option.media_url} alt="Mídia da opção" /> : option.icon_key ? mediaIcon : <UploadCloud className="h-4 w-4" />}<span className="sr-only">Adicionar ícone ou imagem</span></label></TooltipTrigger><TooltipContent side="top" className="text-xs">Adicionar ícone ou imagem</TooltipContent></Tooltip></TooltipProvider>
      <label className="grid h-5 w-5 cursor-pointer place-items-center rounded-full border border-violet-600 bg-white"><input type="radio" className="sr-only" name={`default-${variation.id}`} disabled={readOnly || typeIsQuantity(variation)} checked={!!option.is_default} onChange={() => void put({ is_default: true }, "Opção padrão definida.")} />{option.is_default && <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />}</label>
      <div className="min-w-0"><Input disabled={readOnly} aria-label="Título da opção" className="h-10 text-xs" maxLength={160} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => { if (label.trim() && label !== option.label) void put({ label: label.trim() }, "Título salvo."); }} />{option.is_default && <span className="mt-1 inline-block text-[10px] font-semibold text-violet-700">Padrão</span>}</div>
      <label className="min-w-0"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Disponibilidade</span><select disabled={readOnly} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={option.availability ?? "auto"} onChange={(e) => void put({ availability: e.target.value }, "Disponibilidade atualizada.")}><option value="auto">Contratação automática</option><option value="commercial_review">Exige revisão comercial</option><option value="custom_quote">Orçamento personalizado</option><option value="assisted_only">Só com atendimento</option><option value="unavailable">Indisponível</option></select></label>
      <div className="min-w-0"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Impactos</span><EffectChips effects={option.effects ?? []} /></div>
      <CheckPill disabled={readOnly} checked={option.is_active !== false} onChange={(v) => void put({ is_active: v }, "Opção atualizada.")}>Ativa</CheckPill>
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mais ações da opção"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">{!readOnly && <><DropdownMenuItem onClick={() => void put({ icon_key: "layers", media_url: null }, "Ícone definido.")}>Usar ícone de camadas</DropdownMenuItem><DropdownMenuItem onClick={() => void put({ icon_key: "globe", media_url: null }, "Ícone definido.")}>Usar ícone de globo</DropdownMenuItem><DropdownMenuItem onClick={() => void put({ icon_key: "tag", media_url: null }, "Ícone definido.")}>Usar ícone de etiqueta</DropdownMenuItem>{(option.media_url || option.icon_key) && <DropdownMenuItem onClick={() => void put({ icon_key: null, media_url: null }, "Mídia removida.")}>Manter sem mídia</DropdownMenuItem>}<DropdownMenuItem className="text-red-600" onClick={() => void act(() => apiClient.deleteCatalog2Option(option.id), "Opção removida.")}>Remover opção</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
    </div>
    {customQuote && <label className="mt-2 block pl-[60px]"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Mensagem ao cliente (opcional)</span><Input disabled={readOnly} className="h-8 text-xs" maxLength={1000} placeholder="Explique como o cliente receberá o orçamento" value={message} onChange={(e) => setMessage(e.target.value)} onBlur={() => { if (message !== (option.availability_note ?? "")) void put({ availability_note: message.trim() || null }, "Mensagem salva."); }} /></label>}
    <div className="mt-2 border-t border-slate-200 pt-2"><EffectList version={version} effects={option.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2OptionEffect(option.id, b), "Impacto adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2OptionEffect(id), "Impacto removido.")} /></div>
  </li>;
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
function EffectList({ effects, readOnly, onAdd, onDel, version }: any) {
  const [e, setE] = useState<any>({ effect_type: "add_deadline_days", effect_value: "", charge_scope: "recurring" });
  const money = e.effect_type === "add_fixed_amount" || e.effect_type === "add_percent";
  const effort = isEffortType(e.effect_type);
  return (
    <div className="mt-1 ml-2 border-l-2 border-neutral-200 pl-2 dark:border-neutral-700">
      {(effects ?? []).map((ef: any) => (
        <div key={ef.id} className="flex items-center justify-between text-xs text-neutral-500">
          <span>{isEffortType(ef.effect_type) ? effortEffectSummary(ef, version) : <>{ef.effect_type} = {ef.effect_value}</>}{(ef.effect_type === "add_fixed_amount" || ef.effect_type === "add_percent") && ef.charge_scope ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">{chargeScopeLabel(ef.charge_scope)}{ef.charge_scope === "per_cycle" ? ` (ciclo ${ef.charge_start_cycle}${ef.charge_end_cycle != null ? ` a ${ef.charge_end_cycle}` : "+"})` : ef.charge_scope === "per_quantity" && ef.charge_quantity ? ` ×${ef.charge_quantity}` : ""}</span> : null}</span>
          {!readOnly && <button className="text-red-500" onClick={() => onDel(ef.id)}>×</button>}
        </div>
      ))}
      {!readOnly && (
        <div className="mt-1 flex items-center gap-1">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 text-xs dark:border-neutral-700" value={e.effect_type} onChange={(ev) => setE({ ...e, effect_type: ev.target.value })}>
            {EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input className="h-6 text-xs" value={e.effect_value} onChange={(ev) => setE({ ...e, effect_value: ev.target.value })} placeholder="valor" />
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
      {version.addons.map((a: any, ai: number) => (
        <section key={a.id} className="rounded-[14px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex min-h-[56px] items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 items-center gap-2"><AddonMedia addon={a} readOnly={true} /><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700"><Plus className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{a.name}</span><span className="block text-[11px] text-slate-500">{a.base_cost != null ? `R$ ${Number(a.base_cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Valor pelos impactos"}</span></span><AddonImpactChips effects={a.effects ?? []} compact />{a.is_active === false && <Badge className="border-0 bg-slate-100 text-slate-500">Inativo</Badge>}</div>
            <span className="flex items-center gap-1">{!readOnly && <DeleteBtn label="Remover adicional?" tip="Remover este adicional" onConfirm={() => act(() => apiClient.deleteCatalog2Addon(a.id), "Adicional removido.")} />}</span>
          </div>
          <AddonEditor addon={a} index={ai} list={version.addons} version={version} readOnly={readOnly} act={act} />
        </section>
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

function AddonImpactChips({ effects, compact = false }: { effects: any[]; compact?: boolean }) {
  const label: Record<string, string> = { add_deadline_days: "+ prazo", add_fixed_amount: "+ preço", add_percent: "+ preço", add_task: "Inclui tarefas", add_step: "Inclui etapas", require_info: "Requer acessos", add_deliverable: "Inclui entregáveis", add_effort_minutes: "Esforço" };
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
    <EffectList version={version} effects={addon.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2AddonEffect(addon.id, b), "Impacto adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2AddonEffect(id), "Impacto removido.")} />
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
    <details open={readOpen("setup:" + title, defaultOpen) || undefined} onToggle={(e) => { writeOpen("setup:" + title, (e.currentTarget as HTMLDetailsElement).open); onToggle?.(e); }} className="group h-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><Icon className="h-3.5 w-3.5" /></span>
        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {help && <TooltipProvider delayDuration={120}><Tooltip><TooltipTrigger asChild><span onClick={(e) => e.preventDefault()} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-violet-700"><Info className="h-3.5 w-3.5" /></span></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{help}</TooltipContent></Tooltip></TooltipProvider>}
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

function ContractModesSection({ version, readOnly, act, compact = false }: any) {
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
  const modalidades = [f.accepts_one_time && "Avulso", f.accepts_recurring && "Mensal"].filter(Boolean).join(" e ") || "nenhuma modalidade";
  const summary = `Modalidade: ${modalidades} · ${f.has_initial_implementation ? "com implementação inicial no 1º mês" : "sem implementação inicial"}${f.sell_mode === "package_only" ? " · somente em pacote" : ""}`;
  if (compact) return <><label className="flex h-[52px] min-w-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800/40"><span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Tipo de preço</span><select disabled={readOnly} className="mt-0.5 w-full bg-transparent text-xs text-slate-800 outline-none dark:text-slate-100" value={f.pricing_mode} onChange={(e) => set({ pricing_mode: e.target.value })}><option value="calculated">Calculado pelas tarefas (custo + taxas)</option><option value="manual_fixed">Preço fixo informado</option><option value="on_request">Sob consulta</option></select></label><label className="flex h-[52px] min-w-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800/40"><span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Implementação roda</span><select disabled={readOnly || !f.has_initial_implementation} className="mt-0.5 w-full bg-transparent text-xs text-slate-800 outline-none disabled:opacity-50 dark:text-slate-100" value={f.implementation_rule} onChange={(e) => set({ implementation_rule: e.target.value })}>{Object.entries(IMPLEMENTATION_RULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l as string}</option>)}</select></label><div className="col-span-full mt-1"><p className="mb-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">Modalidades de contratação</p><div className="grid gap-2 sm:grid-cols-3">{([{ key: "accepts_one_time", label: "Avulso", hint: "Compra única" }, { key: "accepts_recurring", label: "Assinatura mensal recorrente", hint: "Contrato contínuo" }, { key: "has_initial_implementation", label: "Implementação inicial", hint: "Configuração e onboarding" }] as const).map((mode) => <label key={mode.key} className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${f[mode.key] ? "border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}><input type="checkbox" disabled={readOnly} checked={!!f[mode.key]} onChange={(e) => set({ [mode.key]: e.target.checked })} className="sr-only" /><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${f[mode.key] ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-transparent"}`}>✓</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{mode.label}</span><span className="block truncate text-[10px] text-slate-500">{mode.hint}</span></span></label>)}</div></div>{!readOnly && <div className="col-span-full mt-1 flex items-center justify-end gap-3"><span className={`text-[11px] ${JSON.stringify(f) === sig ? "text-slate-400" : "text-amber-700"}`}>{JSON.stringify(f) === sig ? "Alterações salvas" : "Alterações não salvas"}</span><Button type="button" onClick={() => void act(() => apiClient.updateCatalog2VersionInfo(version.id, f), "Alterações salvas.")} className="h-8 bg-violet-700 px-3 text-xs text-white hover:bg-fuchsia-700">Salvar alterações</Button></div>}</>;
  return (
    <SetupCard icon={Settings2} title="Modalidades de contratação" summary={summary} help="Define como este produto pode ser contratado e cobrado. Não cria tarefas nem muda o prazo das entregas; essas configurações ficam nas próprias tarefas e etapas.">
      <CommercialConsistencyBanner version={version} readOnly={readOnly} act={act} />
      <p className="mb-2 text-[11px] text-slate-500">
        Três coisas diferentes: <strong>modalidades de compra</strong> (avulso e/ou assinatura mensal — abaixo), <strong>tipo de entrega</strong> (única ou mensal recorrente — Passo 4) e <strong>implementação inicial</strong> (própria regra, não é forma de pagamento).
      </p>
      <div className="grid gap-2 md:grid-cols-2" data-testid="modalities-vs-implementation">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Modalidade de contratação</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <CheckPill disabled={readOnly} checked={f.accepts_one_time} onChange={(v) => set({ accepts_one_time: v })} hint="Compra de um único mês/ciclo, sem renovação">Avulso</CheckPill>
            <CheckPill disabled={readOnly} checked={f.accepts_recurring} onChange={(v) => set({ accepts_recurring: v })} hint="Cobra e renova todo mês. Exige a entrega mensal recorrente marcada (Passo 4) e o período Mensal ativo.">Mensal</CheckPill>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Marque uma ou as duas.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Implementação inicial</p>
          <CheckPill disabled={readOnly} checked={f.has_initial_implementation} onChange={(v) => set({ has_initial_implementation: v })} hint="Implantação, configuração ou diagnóstico no primeiro mês, antes da rotina">Este produto tem implementação no 1º mês</CheckPill>
          <p className="mt-1.5 text-[11px] text-slate-500">Não é forma de pagamento: só informa se existe essa etapa inicial.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
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

function DeliveryCommercialOverview({ version, readOnly, act, ringOf, locked }: any) {
  const [open, setOpen] = useState(false);
  const tasks = version.tasks ?? [];
  const dependencyCount = tasks.reduce((n: number, task: any) => n + (task.depends_on?.length ?? 0), 0);
  const readyParts = [
    { label: "Estrutura comercial", ok: !!version.title && !!version.summary },
    { label: "Tarefas e etapas", ok: tasks.length > 0 },
    { label: "Acessos necessários", ok: accessCount(version) > 0 },
  ];
  const ready = readyParts.filter((part) => part.ok).length;
  const percent = Math.round((ready / readyParts.length) * 100);
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-2.5 text-left">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40"><CalendarClock className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Entrega comercial</span><span className="block text-[11px] text-slate-500">Defina prazo, preço, modalidades, implementação e prontidão.</span></span>
      {open ? <ChevronUp className="mt-2 h-4 w-4 text-slate-500" /> : <ChevronDown className="mt-2 h-4 w-4 text-slate-500" />}
    </button>
    {open && <div className="mt-3 space-y-3">
      <div className="grid items-start gap-2 lg:grid-cols-3"><DeadlineBaseField version={version} act={act} ringOf={ringOf} locked={locked} compact /><ContractModesSection version={version} readOnly={readOnly} act={act} compact /></div>
      <section className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 lg:grid-cols-[auto_minmax(9rem,1fr)_repeat(3,minmax(0,1fr))] lg:items-center">
        <div className="flex items-center gap-2"><span className="flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-500 bg-white text-sm font-extrabold text-slate-900 dark:bg-slate-900 dark:text-slate-100">{percent}%</span><span><span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Prontidão da entrega</span><span className="block text-[10px] text-slate-500">Produto configurado para entrega.</span></span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} /></div>
        {readyParts.map((part) => <div key={part.label} className={`flex min-w-0 items-center gap-1.5 border-l border-emerald-100 pl-2 text-[11px] dark:border-emerald-900/40 ${part.ok ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block truncate">{part.label}</span><strong className="block text-[10px]">{part.ok ? "OK" : "REVISAR"}</strong></span></div>)}
      </section>
    </div>}
  </section>;
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
  const rate = (refs?.specialties ?? []).find((item: any) => item.id === (step.specialty_id ?? task?.specialty?.id))?.max_hourly_rate;
  if ((step.estimated_minutes ?? 0) <= 0 || rate == null) return null;
  return (step.estimated_minutes / 60) * Number(rate);
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

function TasksTab({ version, productId, readOnly, refs, act, highlightTarget, highlightTaskIds, clearHighlight, editTaskId, onOpenPricing, taskStructure }: any) {
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
  const tasks = version.tasks;
  const [advancedTask, setAdvancedTask] = useState<string | null>(null);
  // Acordeão: cada tarefa pode ser recolhida; abre sozinha quando a prontidão aponta para ela.
  const [closed, setClosed] = useState<Set<string>>(() => (single ? new Set<string>() : new Set(tasks.map((task: any) => task.id))));
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
    <div id="catalog2-tasks" className="mt-3 scroll-mt-6 space-y-3">
      {tasks.map((t: any, i: number) => (
        <div id={`catalog2-task-${t.id}`} key={t.id} className="scroll-mt-8 rounded-xl border border-violet-200 border-l-4 border-l-violet-500 bg-white p-3 shadow-sm dark:border-violet-900/60 dark:border-l-violet-500 dark:bg-slate-900/60">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <IconBtn label={closed.has(t.id) && !highlightTaskIds.includes(t.id) ? "Expandir esta tarefa (mostrar etapas e configurações)" : "Recolher esta tarefa (esconder etapas e configurações)"} onClick={() => toggleTask(t.id)}>{closed.has(t.id) && !highlightTaskIds.includes(t.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</IconBtn><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-1 text-xs font-bold text-white">{i + 1}</span><span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t.name}</span>
                {t.task_model_id != null && <button type="button" title="Ver o modelo global desta tarefa" onClick={() => setViewModel(t.task_model_id)} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-200">Tarefa #{t.task_model_id}</button>}
                <ModelStatusChips model={t.model} readOnly={readOnly} onSync={() => act(() => apiClient.syncCatalog2TaskModel(t.id), "Tarefa atualizada para a revisão atual do modelo global.")} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                <MetaChip title="Quem executa">{EXEC_LABEL[t.execution_mode] ?? t.execution_mode}</MetaChip>
                {t.stage_execution === "stage" && <MetaChip title="Cada etapa é qualificada e aprovada antes de liberar a próxima">Execução por etapa</MetaChip>}
                <MetaChip title="Especialidade">{t.specialty?.name ?? "sem especialidade"}</MetaChip>
                <MetaChip title="Total das etapas"><Clock className="h-3 w-3" /> {formatStageHours((t.steps ?? []).reduce((sum: number, step: any) => sum + (step.estimated_minutes ?? 0), 0))} nas etapas</MetaChip>
                {flowSummary(t.steps ?? []).criticalMinutes > 0 && <MetaChip title="Prazo calculado pelas etapas, em horas úteis do calendário da plataforma. Etapas em paralelo contam só a mais longa."><Clock className="h-3 w-3" /> Prazo pelas etapas: {fmtBusinessMinutes(flowSummary(t.steps).criticalMinutes)} úteis (≈ {businessDaysOf(flowSummary(t.steps).criticalMinutes, wc.business_hours_per_day).toLocaleString("pt-BR")} dia(s) útil(eis))</MetaChip>}
                <MetaChip title="Soma do custo estimado de todas as etapas (horas × valor/hora, sem taxas e margem)">Custo total estimado: {taskStagesPrice(t, refs) == null ? "a definir" : brl2(taskStagesPrice(t, refs)!)}</MetaChip>
                <MetaChip title="Etapas desta tarefa">{t.steps.length} etapa{t.steps.length === 1 ? "" : "s"}</MetaChip>
                {t.questionnaire && <MetaChip title="Questionário vinculado">questionário: {t.questionnaire.name}</MetaChip>}
                <TaskIndicators task={t} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!readOnly && <button
                type="button"
                aria-expanded={advancedTask === t.id}
                aria-label={`${advancedTask === t.id ? "Fechar" : "Editar"} tarefa ${t.name}`}
                onClick={() => toggleAdvancedTask(t.id)}
                className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-colors ${advancedTask === t.id ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
              >
                <Pencil className="h-3.5 w-3.5" /> {advancedTask === t.id ? "Fechar edição" : "Editar tarefa"}
              </button>}
              {!readOnly && (
              <div className="flex gap-1">
                {!single && <IconBtn label="Mover tarefa para cima — ela passa a ser executada antes da anterior" disabled={i === 0} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, -1)))}><ChevronUp className="h-4 w-4" /></IconBtn>}
                {!single && <IconBtn label="Mover tarefa para baixo — ela passa a ser executada depois da próxima" disabled={i === tasks.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, 1)))}><ChevronDown className="h-4 w-4" /></IconBtn>}
                {!single && <IconBtn label="Duplicar esta tarefa (cria uma cópia dela neste produto)" onClick={() => act(() => apiClient.duplicateCatalog2Task(t.id), "Tarefa duplicada.")}><Copy className="h-4 w-4" /></IconBtn>}
                <DeleteBtn label="Remover tarefa deste produto?" onConfirm={() => act(() => apiClient.deleteCatalog2Task(t.id), "Tarefa removida do produto.")} />
              </div>
              )}
            </div>
          </div>
          <div className={closed.has(t.id) && !highlightTaskIds.includes(t.id) ? "hidden" : ""}>
           {!readOnly && advancedTask === t.id && <TaskInlineEdit version={version} task={t} refs={refs} act={act} effortHighlighted={(highlightTarget === "catalog2-task-effort" && highlightTaskIds.includes(t.id)) || ringOf("task-effort:" + t.id).includes("amber")} durationHighlighted={(highlightTarget === "catalog2-task-duration" && highlightTaskIds.includes(t.id)) || ringOf("task-duration:" + t.id).includes("amber")} effortDone={ringOf("task-effort:" + t.id).includes("emerald")} durationDone={ringOf("task-duration:" + t.id).includes("emerald")} onSaved={(target: string) => clearHighlight(target)} onOpenPricing={onOpenPricing} />}
          <p className="mt-2 ml-2 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300" data-testid="task-checklist-title">Checklist da tarefa — etapas ({t.steps.length}){t.steps.length === 0 ? " · cadastre ao menos uma etapa" : ""}</p>
          <ul className="mt-1 ml-2 space-y-1 border-l-2 border-sky-200 pl-3 dark:border-sky-900/60">
            {t.steps.map((st: any, si: number) => (
              <StepRow key={st.id} version={version} step={st} index={si} steps={t.steps} taskId={t.id} readOnly={readOnly} act={act} refs={refs} task={t} />
            ))}
            {!readOnly && <AddStepControl ringClass={ringOf("catalog2-step-add:" + t.id)} domId={"catalog2-step-add:" + t.id} refs={refs} task={t} act={act} />}
          </ul>
          <StepFlowEditor task={t} readOnly={readOnly} act={act} />
          </div>
        </div>
      ))}
      {!readOnly && !(single && hasBaseTask) && (
        <div id="catalog2-task-create" className={`space-y-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900/60 dark:bg-violet-950/10 ${ringOf("catalog2-task-create")}`}>
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
              <p className="w-full text-xs text-neutral-500">A nova tarefa recebe um número próprio (Tarefa #ID) e fica disponível no catálogo global para outros produtos. Depois de criada, ajuste executor e especialidade; as horas ficam exclusivamente nas etapas.</p>
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

const SpecialtySelect = ({ refs, value, onChange, emptyLabel, mode }: any) => {
  const all: any[] = refs?.specialties ?? [];
  const list = mode ? specialtiesForMode(all, mode) : all;
  const current = value ? all.find((sp) => sp.id === value) : null;
  const orphan = mode && current && !isSpecialtyCompatible(current, mode) ? current : null;
  return (
    <>
      <select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{emptyLabel}</option>
        {orphan && <option value={orphan.id} disabled>{orphan.name} (tipo {EXEC_KIND_LABEL[specialtyKind(orphan)]} — troque)</option>}
        {list.map((sp: any) => <option key={sp.id} value={sp.id}>{sp.name}{sp.max_hourly_rate == null ? " (sem valor/hora)" : ""}</option>)}
      </select>
      {mode && list.length === 0 && <span className="mt-1 block text-[11px] text-amber-700" data-testid="specialty-empty-hint">{emptySpecialtyHint(mode)}</span>}
    </>
  );
};

function TaskField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex min-w-[8.5rem] flex-col gap-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"><span>{label}</span>{children}</label>;
}

function StepRow({ step, index, steps, taskId, readOnly, act, refs, task, version }: any) {
  const [editing, setEditing] = useState(false);
  const [viewModel, setViewModel] = useState(false);
  const [scopeAsk, setScopeAsk] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
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
  const initial = () => ({ name: step.name, estimated_hours: step.estimated_minutes == null ? "" : String(step.estimated_minutes / 60), specialty_id: step.specialty_id ?? "", purpose: step.purpose ?? "execucao", execution_mode: step.execution_mode ?? "humano", completion_criteria: step.completion_criteria ?? "", first_execution_only: !!step.first_execution_only, skip_when_same_executor: !!step.skip_when_same_executor, description: step.description ?? "", ops: (step.ops ?? {}) as any, executor_kind: step.executor_kind ?? "nomad", leader_mode: step.leader_mode ?? "auto", leader_user_id: step.leader_user_id ?? "", internal_step: !!step.internal_step, requires_qualification: step.requires_qualification !== false, release_next_auto: step.release_next_auto !== false, requires_specialist_qualification: !!step.requires_specialist_qualification, specialist_user_id: step.specialist_user_id ?? "", approval_hours: step.approval_hours == null ? "" : String(step.approval_hours), rework_hours: step.rework_hours == null ? "" : String(step.rework_hours), executor_accept_hours: step.executor_accept_hours == null ? "" : String(step.executor_accept_hours) });
  const [f, setF] = useState(initial);
  const specName = (refs?.specialties ?? []).find((sp: any) => sp.id === (step.specialty_id ?? task?.specialty?.id))?.name;
  const hoursOf = (v: string): number | null | "bad" => { const t = String(v ?? "").trim(); if (t === "") return null; const n = Number(t); return Number.isInteger(n) && n >= 1 ? n : "bad"; };
  const hoursBad = [f.approval_hours, f.rework_hours, f.executor_accept_hours].some((v) => hoursOf(v) === "bad");
  const payload = () => ({ approval_hours: hoursOf(f.approval_hours) === "bad" ? null : hoursOf(f.approval_hours), rework_hours: hoursOf(f.rework_hours) === "bad" ? null : hoursOf(f.rework_hours), executor_accept_hours: step.executor_policy === "prefer_same_as_step" ? (hoursOf(f.executor_accept_hours) === "bad" ? null : hoursOf(f.executor_accept_hours)) : (step.executor_accept_hours ?? null), name: f.name, estimated_minutes: f.estimated_hours === "" ? null : Math.round(Number(f.estimated_hours) * 60), specialty_id: f.specialty_id || null, purpose: f.purpose, execution_mode: f.execution_mode, completion_criteria: f.completion_criteria.trim() ? f.completion_criteria : null, first_execution_only: f.first_execution_only, skip_when_same_executor: f.skip_when_same_executor, description: f.description.trim() ? f.description : null, ops: f.ops, executor_kind: f.executor_kind, leader_mode: f.executor_kind === "leader" ? f.leader_mode : "auto", leader_user_id: f.executor_kind === "leader" && f.leader_mode === "specific" ? f.leader_user_id || null : null, internal_step: f.internal_step, requires_qualification: enforceApprover(f).requires_qualification, release_next_auto: true, requires_specialist_qualification: enforceApprover(f).requires_specialist_qualification, specialist_user_id: enforceApprover(f).requires_specialist_qualification ? f.specialist_user_id || null : null });
  const doSave = (scope?: "product" | "model") => act(() => apiClient.updateCatalog2Step(step.id, { ...payload(), ...(scope ? { scope } : {}), ...(scope === "model" ? { confirm_model_update: true } : {}) }), "Etapa salva.").then(() => setEditing(false));
  const save = () => { if (hoursBad) { void act(() => Promise.reject(new Error("Os prazos em horas precisam ser números inteiros a partir de 1 (ou ficar vazios para usar o padrão).")), ""); return; } return step.step_model_id != null ? setScopeAsk(true) : void doSave(); };
  if (editing) {
    const draftCost = (() => { const h = Number(f.estimated_hours); const sp = (refs?.specialties ?? []).find((x: any) => x.id === (f.specialty_id || task?.specialty?.id)); return f.estimated_hours !== "" && h > 0 && sp?.max_hourly_rate != null ? (h * Number(sp.max_hourly_rate)) : null; })();
    const draftChecklist: ChecklistItem[] = (f.ops?.checklist as ChecklistItem[] | undefined) ?? [];
    const setOps = (patch: Record<string, unknown>) => setF({ ...f, ops: { ...(f.ops ?? {}), ...patch } });
    const CTL = "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900";
    const SECTION = "min-w-0 space-y-2.5 p-4";
    const TITLE = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
    return (
      <li className="relative rounded-xl border border-sky-400 bg-white shadow-sm before:absolute before:-left-[14px] before:top-6 before:h-px before:w-3.5 before:bg-violet-300 after:absolute after:-left-[17px] after:top-[21px] after:h-1.5 after:w-1.5 after:rounded-full after:bg-violet-400 dark:border-sky-700 dark:bg-slate-900/60" data-testid="step-edit-form">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-sky-500 px-1.5 text-xs font-bold text-white">{index + 1}</span>
            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">Etapa {index + 1}</span>
            <span className="h-4 w-px bg-slate-300" />
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{f.name || step.name}</span>
          </div>
          <span className="text-xs text-slate-500">{draftCost == null ? "Custo estimado desta etapa: a definir" : <>Custo estimado desta etapa: <strong className="text-slate-800 dark:text-slate-100">{brl2(draftCost)}</strong></>}</span>
        </div>

        <div className="grid divide-slate-200 md:grid-cols-2 md:divide-x dark:divide-slate-700">
          {/* 1 · O que é esta etapa */}
          <section className={SECTION}>
            <h5 className={TITLE}>1 · O que é esta etapa</h5>
            <Field label="Nome da etapa"><input className={CTL} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={<span className="inline-flex items-center gap-2">Descrição (o que acontece nesta etapa)<AiFieldButton compact label="Descrição (o que acontece nesta etapa)" value={f.description} context={{ name: f.name, other_fields: { "Tarefa": String(task?.name ?? ""), "Critério de conclusão": f.completion_criteria } }} disabled={readOnly} onResult={(v) => setF({ ...f, description: v.slice(0, 8000) })} /></span>}><Textarea rows={3} maxLength={8000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-[88px] text-sm" /></Field>
          </section>
          {/* 2 · Quem faz e quanto tempo leva */}
          <section className={SECTION}>
            <h5 className={TITLE}>2 · Quem faz e quanto tempo leva</h5>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <Field label="Finalidade"><select className={CTL} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Quem executa"><select className={CTL} aria-label="Quem executa" value={f.execution_mode} onChange={(e) => setF(enforceApprover({ ...f, execution_mode: e.target.value, specialty_id: keepSpecialtyForMode(refs?.specialties, f.specialty_id, e.target.value) }))}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Especialidade"><SpecialtySelect refs={refs} mode={f.execution_mode} value={f.specialty_id} onChange={(v: string) => setF({ ...f, specialty_id: v })} emptyLabel="(usa a da tarefa)" /></Field>
              <Field label="Horas estimadas"><input className={CTL} type="number" min="0" step="0.25" value={f.estimated_hours} onChange={(e) => setF({ ...f, estimated_hours: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5" data-testid="step-receiver">
              <Field label="Quem recebe a etapa">
                <select className={CTL} aria-label="Quem recebe a etapa" value={f.executor_kind} onChange={(e) => setF({ ...f, executor_kind: e.target.value, ...(e.target.value !== "leader" ? { leader_mode: "auto", leader_user_id: "" } : {}) })}>
                  <option value="nomad">Nômade da plataforma (oferta e rodízio)</option>
                  <option value="leader">Líder</option>
                  <option value="internal">Equipe interna</option>
                </select>
              </Field>
              {f.executor_kind === "leader" ? (
                <Field label="Qual líder">
                  <select className={CTL} aria-label="Qual líder" value={f.leader_mode === "specific" ? f.leader_user_id : "__auto"} onChange={(e) => setF({ ...f, leader_mode: e.target.value === "__auto" ? "auto" : "specific", leader_user_id: e.target.value === "__auto" ? "" : e.target.value })}>
                    <option value="__auto">Qualquer líder da área (o com menos tarefas abertas)</option>
                    {leaders.map((u) => <option key={u.id} value={u.id}>Sempre {u.name}</option>)}
                  </select>
                </Field>
              ) : <div className="self-end pb-2 text-[11px] text-slate-500">{f.executor_kind === "nomad" ? "A etapa vai para a fila de nômades habilitados na especialidade." : "A equipe interna executa sem passar pela fila de nômades."}</div>}
            </div>
          </section>
        </div>

        <div className="grid divide-slate-200 border-t border-slate-200 md:grid-cols-2 md:divide-x dark:divide-slate-700 dark:border-slate-700">
          {/* 3 · Quando a etapa termina */}
          <section className={SECTION}>
            <h5 className={TITLE}>3 · Quando a etapa termina</h5>
            <Field label={<span className="inline-flex items-center gap-2">Critério de conclusão<AiFieldButton compact label="Critério de conclusão" value={f.completion_criteria} context={{ name: f.name, other_fields: { "Tarefa": String(task?.name ?? ""), "Descrição da etapa": f.description } }} disabled={readOnly} onResult={(v) => setF({ ...f, completion_criteria: v.replace(/\n/g, " ").slice(0, 4000) })} /></span>}><input className={CTL} value={f.completion_criteria} onChange={(e) => setF({ ...f, completion_criteria: e.target.value })} placeholder="Quando esta etapa pode ser considerada concluída?" /></Field>
            <label className="flex items-center gap-2 text-sm" title="Nunca se repete nos ciclos seguintes"><input type="checkbox" className="h-4 w-4" checked={f.first_execution_only} onChange={(e) => setF({ ...f, first_execution_only: e.target.checked })} /> Só na primeira execução</label>
            <label className="flex items-center gap-2 text-sm" title="Se o mesmo executor for mantido no ciclo seguinte, esta etapa é dispensada"><input type="checkbox" className="h-4 w-4" checked={f.skip_when_same_executor} onChange={(e) => setF({ ...f, skip_when_same_executor: e.target.checked })} /> Dispensável quando o mesmo executor continua</label>
            {task?.stage_execution === "stage" && (
              <div className="mt-1 space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/50 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="stage-flags">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Execução por etapa</p>
                <label className="flex items-center gap-2 text-sm" title="O cliente não vê nem aprova esta etapa (ex.: validação de briefing ou de acessos). Se achar um problema, o líder pode avisar o cliente."><input type="checkbox" className="h-4 w-4" checked={f.internal_step} onChange={(e) => setF({ ...f, internal_step: e.target.checked })} /> Etapa interna (o cliente não vê nem aprova)</label>
                <Field label="Quem aprova esta etapa">
                  <select className={CTL} aria-label="Quem aprova esta etapa" data-testid="step-approver" title="Quem qualifica a entrega antes de seguir. Quando a execução é feita por IA (ou híbrida), SEMPRE precisa de um qualificador." value={approverOf(f)} onChange={(e) => setF({ ...f, ...applyApprover(e.target.value as ApproverMode) })}>
                    {APPROVER_OPTIONS.filter((o) => o.value !== "none" || (f.execution_mode === "humano" && approverOf(f) === "none")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                {f.execution_mode !== "humano" && <p className="text-[11px] text-violet-700" data-testid="approver-ai-note">Esta etapa usa IA: um qualificador sempre aprova a entrega.</p>}
                <div className="grid gap-1.5 sm:grid-cols-3" data-testid="stage-hours">
                  <Field label="Prazo de aprovação do cliente (h úteis)"><input type="number" min={1} step={1} aria-label="Prazo de aprovação do cliente (horas úteis)" title="Quantas horas úteis o cliente tem para aprovar esta etapa. Vazio = padrão da plataforma." className={CTL} value={f.approval_hours} onChange={(e) => setF({ ...f, approval_hours: e.target.value })} placeholder="padrão" /></Field>
                  <Field label="Prazo de refação (h úteis)"><input type="number" min={1} step={1} aria-label="Prazo de refação (horas úteis)" title="Quantas horas úteis o executor tem para refazer depois de uma reprovação. Vazio = mantém o prazo anterior." className={CTL} value={f.rework_hours} onChange={(e) => setF({ ...f, rework_hours: e.target.value })} placeholder="mantém" /></Field>
                  {step.executor_policy === "prefer_same_as_step" && <Field label="Prazo de aceite do preferido (h)"><input type="number" min={1} step={1} aria-label="Prazo de aceite do preferido (horas)" title="Quantas horas o executor preferido tem para aceitar antes de a etapa abrir para os demais. Vazio = 2 h." className={CTL} value={f.executor_accept_hours} onChange={(e) => setF({ ...f, executor_accept_hours: e.target.value })} placeholder="2 h" /></Field>}
                </div>
                {hoursBad && <p role="alert" className="text-[11px] font-semibold text-red-600">Use números inteiros a partir de 1 (ou deixe vazio).</p>}
                {f.requires_specialist_qualification && (
                  <Field label="Especialista que qualifica"><select aria-label="Especialista que qualifica" className={CTL} value={f.specialist_user_id} onChange={(e) => setF({ ...f, specialist_user_id: e.target.value })}><option value="">Escolha o especialista…</option>{specialists.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.kind === "nomade" ? "nômade" : u.kind === "admin" ? "administração" : "líder"})</option>)}</select></Field>
                )}
              </div>
            )}
          </section>
          {/* 4 · Checklist, orientações e evidência */}
          <section className={SECTION}>
            <div className="flex items-center justify-between gap-2">
              <h5 className={TITLE}>4 · Checklist, orientações e evidência</h5>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600" data-testid="step-checklist-count">{checklistCount(draftChecklist)} {checklistCount(draftChecklist) === 1 ? "item" : "itens"}</span>
                <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setChecklistOpen(true)} data-testid="open-step-checklist"><ListChecks className="mr-1.5 h-4 w-4" />Gerenciar checklist</Button>
              </div>
            </div>
            <Field label="Orientações para execução"><Textarea rows={2} maxLength={8000} value={f.ops?.instructions ?? ""} onChange={(e) => setOps({ instructions: e.target.value })} className="min-h-[64px] text-sm" placeholder="Como executar esta etapa, passo a passo." /></Field>
            <label className="flex items-center gap-2.5 text-sm font-medium" title="A etapa só pode ser concluída depois de anexar uma evidência.">
              <Switch aria-label="Evidência obrigatória" checked={!!f.ops?.evidence_required} onCheckedChange={(v) => setOps({ evidence_required: !!v })} />
              Evidência obrigatória
            </label>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <Field label="Responsável pela evidência">
                <select className={CTL} value={f.ops?.evidence_owner ?? "executor"} onChange={(e) => setOps({ evidence_owner: e.target.value })}>
                  <option value="executor">Executor da etapa</option><option value="leader">Líder</option><option value="client">Cliente</option>
                </select>
              </Field>
              <Field label="Exemplo de evidência (opcional)"><input className={CTL} maxLength={1000} value={f.ops?.evidence_hint ?? ""} onChange={(e) => setOps({ evidence_hint: e.target.value })} placeholder="Ex.: print da tela com a campanha publicada" /></Field>
            </div>
          </section>
        </div>

        {/* 5 · Conexões e acessos (largura total) */}
        <section className="space-y-2.5 border-t border-slate-200 p-4 dark:border-slate-700">
          <h5 className={TITLE}>5 · Conexões e acessos desta etapa</h5>
          <StepAccessPicker requirements={version?.connection_requirements ?? []} value={f.ops} disabled={readOnly} onChange={(patch) => setOps(patch)} />
          <ConnectionsSection version={version} readOnly={readOnly} act={act} scope={{ kind: "step", task: { key: task.key, name: task.name }, step: { key: step.key, name: step.name } }} />
        </section>

        <StepChecklistDialog open={checklistOpen} title={f.name || step.name} value={draftChecklist} onClose={() => setChecklistOpen(false)} onSave={(list) => { setOps({ checklist: list }); setChecklistOpen(false); }} />

        <div className="sticky bottom-0 flex gap-2 rounded-b-xl border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <SaveButton onClick={save}>Salvar etapa</SaveButton>
          <Button size="sm" variant="ghost" className="h-9" onClick={() => { setF(initial()); setEditing(false); }}>Cancelar</Button>
        </div>
        <ModelScopeDialog open={scopeAsk} kindLabel="etapa" modelId={step.step_model_id} onCancel={() => setScopeAsk(false)} onChoose={(sc) => { setScopeAsk(false); void doSave(sc); }} />
      </li>
    );
  }
  return (
    <li className="relative rounded-lg bg-sky-50/70 px-2.5 py-1.5 text-[13px] before:absolute before:-left-[14px] before:top-1/2 before:h-px before:w-3.5 before:bg-violet-300 after:absolute after:-left-[17px] after:top-[calc(50%-3px)] after:h-1.5 after:w-1.5 after:rounded-full after:bg-violet-400 dark:bg-sky-950/20 dark:before:bg-violet-700 dark:after:bg-violet-500">
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
            {PURPOSE_LABEL[step.purpose] ?? step.purpose} · {EXEC_LABEL[step.execution_mode] ?? step.execution_mode} · {specName ?? "sem especialidade"} · {formatStageHours(step.estimated_minutes)} · <span data-testid="step-cost" title="Custo estimado: horas × valor/hora da especialidade (sem taxas e margem)">{stepCostEstimate(step, task, refs) == null ? "custo a definir" : brl2(stepCostEstimate(step, task, refs)!)}</span>{step.is_conditional ? " · condicional" : ""}
          </div>
          {!readOnly && steps.length > 1 && <StepFlowControls step={step} steps={steps} index={index} taskId={taskId} act={act} />}
          {task?.stage_execution === "stage" && (
            <div className="mt-0.5 flex flex-wrap gap-1" data-testid="stage-chips">
              {step.internal_step && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Interna (cliente não vê)</span>}
              {step.requires_qualification === false && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Sem qualificação do líder</span>}
              {step.requires_specialist_qualification && <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-800">Qualificação do especialista</span>}
              {step.approval_hours != null && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800" title="Prazo do cliente para aprovar">Aprovação: {step.approval_hours} h úteis</span>}
              {step.rework_hours != null && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800" title="Prazo para refazer após reprovação">Refação: {step.rework_hours} h úteis</span>}
              {step.executor_policy === "prefer_same_as_step" && step.executor_accept_hours != null && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800" title="Prazo de aceite do executor preferido">Aceite: {step.executor_accept_hours} h</span>}
              {!readOnly && <span className="text-[10px] text-slate-400">Para alterar, clique em Editar.</span>}
            </div>
          )}
          {(step.executor_kind === "leader" || step.executor_kind === "internal") && <div className="mt-0.5"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800" data-testid="step-receiver-chip">{step.executor_kind === "internal" ? "Equipe interna" : step.leader_mode === "specific" ? "Líder específico" : "Líder da área"}</span></div>}
          {stepFlowChips(step, steps).length > 0 && <div className="mt-0.5 flex flex-wrap gap-1" data-testid="step-flow-chips">{stepFlowChips(step, steps).map((c) => <span key={c} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">{c}</span>)}</div>}
          {step.completion_criteria && <div className="text-xs text-neutral-500">Critério de conclusão: {step.completion_criteria}</div>}
          <StepGovernance step={step} task={task} version={version} readOnly={readOnly} act={act} />
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
            <button type="button" data-testid="step-checklist-btn" title="Ver e cadastrar o checklist desta etapa (execução, aprovação e qualificação)" onClick={() => setChecklistOpen(true)} className="inline-flex h-7 items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900"><ListChecks className="h-3.5 w-3.5" />Checklist ({checklistCount(step.ops?.checklist)})</button>
            <IconBtn label="Editar esta etapa (nome, executor, especialidade, tempo…)" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Mover etapa para cima — ela passa a acontecer antes da anterior" disabled={index === 0} onClick={() => act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, -1)))}><ChevronUp className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Mover etapa para baixo — ela passa a acontecer depois da próxima" disabled={index === steps.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, 1)))}><ChevronDown className="h-3.5 w-3.5" /></IconBtn>
            <DeleteBtn label="Remover etapa desta tarefa?" onConfirm={() => act(() => apiClient.deleteCatalog2Step(step.id), "Etapa removida da tarefa.")} />
          </span>
        )}
      </div>
      {viewModel && step.step_model_id != null && <TaskModelInfoDialog kind="step" id={step.step_model_id} onClose={() => setViewModel(false)} />}
      <StepChecklistDialog open={checklistOpen} title={step.name} readOnly={readOnly} saving={savingChecklist} value={(step.ops?.checklist as ChecklistItem[] | undefined) ?? []} onClose={() => setChecklistOpen(false)}
        onSave={(list) => { setSavingChecklist(true); void act(() => apiClient.updateCatalog2Step(step.id, { ops: { ...(step.ops ?? {}), checklist: list }, scope: "product" }), "Checklist da etapa salvo.").then(() => setChecklistOpen(false)).finally(() => setSavingChecklist(false)); }} />
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
  const doSaveTask = (scope?: "product" | "model") => act(
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
    <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Configurar tarefa <span className="font-normal text-slate-400">(executor, especialidade, ciclo, acessos, questionário…)</span></p>
    <div className="space-y-2 pt-2 text-xs">
      <div className="flex flex-wrap items-end gap-2">
        <TaskField label="Executor">
          <select className="h-8 rounded border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-slate-900" value={t.execution_mode} onChange={(e) => { const keep = keepSpecialtyForMode(refs?.specialties, t.specialty_id, e.target.value); setT({ ...t, execution_mode: e.target.value, specialty_id: keep }); preview({ execution_mode: e.target.value, ...(keep !== t.specialty_id ? { specialty_id: null, specialty: null } : {}) }); }}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </TaskField>
        <TaskField label="Especialidade / conhecimento humano">
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
      {task.task_model_id != null && <ModelScopeDialog open={scopeAsk} kindLabel="tarefa" modelId={task.task_model_id} onCancel={() => setScopeAsk(false)} onChoose={(sc) => { setScopeAsk(false); void doSaveTask(sc); }} />}
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
      <Field label="tipo"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={f.execution_kind} onChange={(e) => setF({ ...f, execution_kind: e.target.value })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
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
  const [prefill, setPrefill] = useState<{ name: string; description: string; questions: QuestionDraft[] } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const q = task.questionnaire;
  // D-7: a IA lê todos os campos cadastrados do produto/tarefa e sugere o questionário; abre já preenchido para revisar e editar.
  const generate = async () => {
    setAiBusy(true); setAiErr(null);
    try {
      const r = await apiClient.suggestCatalog2TaskQuestionnaire(task.id);
      setPrefill({ name: r.name, description: r.description ?? "", questions: r.questions.map(draftFromSuggestion) });
      setShowCreate(true); setShowPicker(false);
    } catch (e: any) { setAiErr(e?.message ?? "Não foi possível usar a IA agora."); } finally { setAiBusy(false); }
  };

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
        <Button size="sm" variant="outline" onClick={() => { setShowCreate((v) => !v); setShowPicker(false); setPrefill(null); }}><Plus className="h-3.5 w-3.5" /> Criar novo questionário</Button>
        <button type="button" data-testid="ai-questionnaire" disabled={aiBusy} onClick={() => void generate()} title="A IA lê tudo o que está cadastrado no produto e sugere as perguntas. Você revisa antes de criar." className="inline-flex h-8 items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"><Sparkles className="h-3.5 w-3.5" />{aiBusy ? "Gerando…" : "Gerar questionário com IA"}</button>
      </div>
      {aiErr && <p role="alert" className="text-[11px] font-semibold text-red-600">{aiErr}</p>}
      {showPicker && (
        <div className="flex items-end gap-2">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={selectId} onChange={(e) => setSelectId(e.target.value)}>
            <option value="">selecione…</option>
            {refs.questionnaires.map((qn: any) => <option key={qn.id} value={qn.id}>{qn.name} ({qn.question_count} pergunta(s))</option>)}
          </select>
          <Button size="sm" disabled={!selectId} onClick={() => act(() => apiClient.setCatalog2TaskQuestionnaire(task.id, selectId), "Questionário vinculado.")}>Vincular</Button>
        </div>
      )}
      {showCreate && <NewQuestionnaireForm key={prefill ? "ai" : "manual"} taskId={task.id} act={act} initial={prefill ?? undefined} onDone={() => { setShowCreate(false); setPrefill(null); }} />}
    </div>
  );
}

// Cria um questionário novo (nome + perguntas com obrigatoriedade) e já
// vincula à tarefa atual ao salvar.
function NewQuestionnaireForm({ taskId, act, onDone, initial }: { taskId: string; act: any; onDone: () => void; initial?: { name: string; description: string; questions: QuestionDraft[] } }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial?.questions ?? []);
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
            <div className="mt-1"><p className="text-[11px] font-semibold text-violet-600">Tipo e configurações da pergunta</p><div className="mt-1"><QuestionConfigFields q={q} onChange={(patch) => updateQuestion(i, patch)} /></div></div>
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
      {initial && <p className="text-[11px] text-violet-700">Sugestão da IA: revise, edite, remova ou adicione perguntas antes de criar.</p>}
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
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function suggestMore() {
    setAiBusy(true); setAiMsg(null);
    try {
      const r = await apiClient.suggestCatalog2TaskQuestionnaire(task.id, questions.map((x) => x.label));
      const taken = new Set(questions.map((x) => x.key));
      const novas = r.questions.map(draftFromSuggestion).map((d) => { let k = d.key; while (taken.has(k)) k += "x"; taken.add(k); return { ...d, key: k }; });
      setQuestions((qs) => [...qs, ...novas]);
      setAiMsg({ ok: true, text: `${novas.length} pergunta(s) sugerida(s) adicionada(s) ao final. Revise antes de salvar.` });
    } catch (e: any) { setAiMsg({ ok: false, text: e?.message ?? "Não foi possível usar a IA agora." }); } finally { setAiBusy(false); }
  }

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
          <div><p className="text-[11px] font-semibold text-violet-600">Tipo: {questionTypeLabel(qItem.question_type)} · configurações</p><div className="mt-1"><QuestionConfigFields q={qItem} onChange={(patch) => updateQuestion(i, patch)} /></div></div>
          </div>
        ))}
        {questions.length === 0 && <p className="text-neutral-400">Nenhuma pergunta — adicione abaixo.</p>}
      </div>
      <div className="flex items-end gap-2">
        <Field label="nova pergunta"><Input value={nq.label} onChange={(e) => setNq({ ...nq, label: e.target.value })} /></Field>
        <label><input type="checkbox" checked={nq.is_required} onChange={(e) => setNq({ ...nq, is_required: e.target.checked })} /> obrigatória</label>
        <Button size="sm" variant="outline" onClick={addQuestion}>Adicionar pergunta</Button>
        <button type="button" data-testid="ai-questionnaire-more" disabled={aiBusy} onClick={() => void suggestMore()} title="A IA lê tudo o que está cadastrado no produto e sugere perguntas que ainda não existem." className="inline-flex h-8 items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"><Sparkles className="h-3.5 w-3.5" />{aiBusy ? "Gerando…" : "Sugerir mais perguntas com IA"}</button>
      </div>
      {aiMsg && <p role={aiMsg.ok ? "status" : "alert"} className={`text-[11px] font-semibold ${aiMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{aiMsg.text}</p>}
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
  const createStep = (justification?: string) => act(() => apiClient.addCatalog2Step(task.id, { name: s.name.trim(), estimated_minutes: s.estimated_hours ? Math.round(Number(s.estimated_hours) * 60) : null, specialty_id: s.specialty_id || null, purpose: s.purpose, execution_mode: s.execution_mode, completion_criteria: s.completion_criteria.trim() || null, client_action_id: `step-${task.id}-${Date.now()}`, ...(justification ? { duplicate_resolution: "create_anyway", duplicate_justification: justification } : {}) }), "Etapa criada e cadastrada no catálogo global de modelos.", { rethrow: true })
    .then((r: any) => { if (r) { setS(defaults()); setShowCreate(false); } })
    .catch((e: any) => { if (e?.code === "duplicate_model_candidates" && Array.isArray(e?.data?.details?.candidates)) setSimilarAsk(e.data.details.candidates); });
  useEffect(() => { setS(defaults()); }, [task?.id, task?.name, task?.specialty?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
            <Field label="Executor"><select className="h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700" value={s.execution_mode} onChange={(e) => setS({ ...s, execution_mode: e.target.value, specialty_id: keepSpecialtyForMode(refs?.specialties, s.specialty_id, e.target.value) })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Especialidade"><SpecialtySelect refs={refs} mode={s.execution_mode} value={s.specialty_id} onChange={(v: string) => setS({ ...s, specialty_id: v })} emptyLabel="(usa a da tarefa)" /></Field>
            <Field label="Horas estimadas"><Input className="w-24" type="number" min="0" step="0.25" value={s.estimated_hours} onChange={(e) => setS({ ...s, estimated_hours: e.target.value })} /></Field>
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
function DeadlineBaseField({ version, act, ringOf, locked, compact = false }: any) {
  const wc = useWorkCalendar();
  // O prazo comercial é informado em HORAS úteis; os dias úteis ao lado são o reflexo (arredondado para cima). Dado antigo só em dias vira horas pelo expediente.
  const hoursOf = (x: any) => (x.base_commercial_deadline_hours != null ? x.base_commercial_deadline_hours : x.base_commercial_deadline_days != null ? x.base_commercial_deadline_days * 24 : null);
  const [v, setV] = useState<string>(hoursOf(version) == null ? "" : String(hoursOf(version)));
  useEffect(() => { setV(hoursOf(version) == null ? "" : String(hoursOf(version))); }, [version.id, version.base_commercial_deadline_days, version.base_commercial_deadline_hours, wc.business_hours_per_day]); // eslint-disable-line react-hooks/exhaustive-deps
  const h = Number(v);
  const valid = v !== "" && Number.isInteger(h) && h >= 1;
  // 24 horas = 1 dia: o reflexo mostra a fração (5 h ≈ 0,21 dia); o sistema guarda o inteiro arredondado para cima (mínimo 1).
  const n = valid ? Math.max(1, Math.ceil(h / 24)) : 0;
  const dayFrac = valid ? h / 24 : 0;
  const dayText = valid ? `${dayFrac.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${dayFrac > 1 ? "dias" : "dia"}` : "";
  const dirty = valid && h !== hoursOf(version);
  // Prazo sugerido pelas etapas (horas úteis → dias úteis do calendário da plataforma).
  const stepsMinutes = (version.tasks ?? []).filter((t: any) => !t.is_conditional).reduce((a: number, t: any) => a + flowSummary(t.steps ?? []).criticalMinutes, 0);
  const suggestedDays = stepsMinutes > 0 ? Math.max(1, Math.ceil(stepsMinutes / 60 / wc.business_hours_per_day)) : null;
  const readOnly = version.state === "publicada" || !!locked;
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);
  const save = async () => {
    setErr(null); setOkMsg(false);
    try { await act(() => apiClient.updateCatalog2VersionInfo(version.id, { base_commercial_deadline_hours: h }), "Prazo comercial salvo.", { rethrow: true }); setOkMsg(true); window.setTimeout(() => setOkMsg(false), 4000); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível salvar o prazo."); }
  };
  if (compact) return (
    <div id="catalog2-deadline-base" className={`flex min-h-[52px] min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/40 ${ringOf("catalog2-deadline-base")}`}>
      <span className="min-w-[120px] flex-1"><span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">Prazo comercial base</span><span className="block text-[10px] text-slate-500">Prazo prometido ao cliente (em horas)</span></span>
      <span className="inline-flex shrink-0 items-baseline gap-1.5">
        <Input type="number" min={1} aria-label="Prazo comercial base em horas" className="h-8 w-20 rounded-md border border-slate-300 bg-white px-2 text-right text-base font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} onBlur={() => { if (dirty) void save(); }} onKeyDown={(e) => { if (e.key === "Enter" && dirty) void save(); }} />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">horas</span>
      </span>
      <span className="w-full text-[11px] font-semibold text-violet-700 dark:text-violet-300" data-testid="deadline-days-reflex">{valid ? `= ${dayText} (24 h = 1 dia)` : "Informe as horas; os dias aparecem aqui."}{err ? <span className="ml-2 text-red-600">{err}</span> : null}{okMsg ? <span className="ml-2 text-emerald-700">✓ salvo</span> : null}</span>
      {!readOnly && <button type="button" disabled={!valid} onClick={(event) => { event.preventDefault(); void save(); }} className="sr-only">Salvar prazo</button>}
    </div>
  );
  if (false) return <label id="catalog2-deadline-base" className={`flex h-[52px] min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800/40 ${ringOf("catalog2-deadline-base")}`}><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">Prazo comercial base</span><span className="block text-[10px] text-slate-500">Prazo prometido ao cliente</span></span><span className="inline-flex shrink-0 items-baseline gap-1"><Input type="number" min={1} className="h-8 w-10 border-0 bg-transparent p-0 text-right text-base font-bold text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} /><span className="text-xs font-semibold text-slate-700 dark:text-slate-200">dias</span></span>{!readOnly && <button type="button" disabled={!valid} onClick={(event) => { event.preventDefault(); void save(); }} className="sr-only">Salvar prazo</button>}</label>;
  return (
    <div id="catalog2-deadline-base" className={`h-full min-w-0 rounded-xl ${ringOf("catalog2-deadline-base")}`}>
      <SetupCard icon={CalendarClock} title="Prazo comercial base" summary={valid ? `${h} h (${dayText})` : "não definido"} help="É o prazo que o cliente vê para este produto. Variações, adicionais e condições podem acrescentar dias; o tempo interno das tarefas não substitui este prazo." scroll>
        <p className="text-[11px] text-slate-500">Prazo prometido ao cliente nesta versão. Dias extras de variações, adicionais e condições somam a ele.</p>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} className="h-8 w-24 text-sm" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} />
          <span className="text-xs text-slate-500">horas</span>
          {valid && <span className="text-sm font-semibold text-violet-700" data-testid="deadline-hours">= {dayText} (24 h = 1 dia)</span>}
          <SaveButton disabled={readOnly || !valid} onClick={() => void save()}>Salvar prazo</SaveButton>
        </div>
        {suggestedDays != null && (
          <p className="text-[11px] text-slate-600" data-testid="deadline-suggestion">Pelas etapas cadastradas: <strong>{fmtBusinessMinutes(stepsMinutes)} úteis</strong> (≈ {suggestedDays} dia{suggestedDays > 1 ? "s" : ""} útil{suggestedDays > 1 ? "eis" : ""}).{!readOnly && n !== suggestedDays && <> <button type="button" className="font-semibold text-indigo-700 underline" onClick={() => setV(String(suggestedDays))}>Usar {suggestedDays} dia{suggestedDays > 1 ? "s" : ""}</button></>}</p>
        )}
        {readOnly && <p className="text-[11px] text-amber-700">Versão publicada ou travada (somente leitura). Clique em Editar para alterar.</p>}
        {!readOnly && v !== "" && !valid && <p className="text-[11px] text-red-600">Informe um número inteiro de horas, 1 ou mais.</p>}
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
  useEffect(() => { void run(); /* eslint-disable-next-line */ }, [JSON.stringify(sel), version.id]);

  const Card = ({ keyName, icon: Icon, title, subtitle, status }: any) => <button type="button" onClick={() => setOpen(keyName)} className="flex min-h-[112px] items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800 dark:text-slate-100">{title}</span><span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span></span><Badge className={status?.pending ? "border-0 bg-amber-100 text-amber-800" : "border-0 bg-emerald-100 text-emerald-700"}>{status?.text}</Badge><ChevronRight className="h-5 w-5 text-violet-600" /></button>;
  if (open === "overview") return <div id="catalog2-costs" className="mt-3 space-y-2">
    <CostAccordion icon={DollarSign} title="Composição do preço" subtitle="Custos, taxas e margem" status={result?.pending_info?.length ? "Pendente" : "Configurado"} tone={result?.pending_info?.length ? "amber" : "green"}><div className="grid gap-3 md:grid-cols-2"><div>{result?.pending_info?.length > 0 && <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span>Falta uma configuração para fechar o preço.</span><button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="font-semibold text-violet-700">Corrigir</button></div>}{result?.error ? <p className="text-sm text-red-600">Não foi possível calcular este cenário.</p> : result && <PricingPriceSummary r={result} />}</div><PricingDiagnostics result={result} /></div><PersistDetails persistKey="d3" className="mt-2 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Custos e encargos <ChevronDown className="h-4 w-4 text-slate-400" /></summary>{result && <div className="border-t px-3 py-2"><PricingCostRows r={result} /></div>}</PersistDetails><PersistDetails persistKey="d4" className="mt-2 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Memória de cálculo <ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="border-t px-3 py-2 text-xs text-slate-500">Bases, taxas e margem aplicadas ao cenário atual.</div></PersistDetails></CostAccordion>
    <CostAccordion icon={ListChecks} title="Simular cenário" subtitle="Teste variações e adicionais" status="Pronto para simular" tone="green"><div className="grid gap-3 md:grid-cols-2">{version.variations.map((va: any) => <Field key={va.id} label={va.name}><select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm" value={sel.variation_option_keys.find((k: string) => va.options.some((o: any) => o.key === k)) ?? ""} onChange={(e) => setSel({ ...sel, variation_option_keys: [...sel.variation_option_keys.filter((k: string) => !va.options.some((o: any) => o.key === k)), e.target.value] })}>{va.options.map((o: any) => <option key={o.id} value={o.key}>{o.label}</option>)}</select></Field>)}<Field label="Adicionais"><div className="flex flex-wrap gap-2">{version.addons.map((a: any) => <CheckPill key={a.id} checked={sel.addon_keys.includes(a.key)} onChange={(checked) => setSel({ ...sel, addon_keys: checked ? [...sel.addon_keys, a.key] : sel.addon_keys.filter((k: string) => k !== a.key) })}>{a.name}</CheckPill>)}</div></Field><Field label="Quantidade de campanhas"><Input className="h-10" type="number" value={sel.quantity} onChange={(e) => setSel({ ...sel, quantity: Number(e.target.value) || 1 })} /></Field></div>{result && <PricingPriceSummary r={result} showCost />}<Button type="button" onClick={() => void run()} className="mt-3 w-full bg-violet-700 text-white hover:bg-fuchsia-700">Atualizar simulação</Button></CostAccordion>
    <CostAccordion icon={CalendarClock} title="Modalidades por período" subtitle="Entrega recorrente" status="Mensal" tone="green"><ProductPeriodsPanel productId={productId} act={act} /></CostAccordion>
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
        {result?.error ? <p className="text-sm text-red-600">Não foi possível calcular este cenário.</p> : result && <PricingPriceSummary r={result} />}
        <PersistDetails persistKey="d5" className="mt-3 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Custos e encargos <ChevronDown className="h-4 w-4 text-slate-400" /></summary>{result && <div className="border-t px-3 py-2"><PricingCostRows r={result} /></div>}</PersistDetails><PersistDetails persistKey="d6" className="mt-2 rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">Memória de cálculo <ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="border-t px-3 py-2 text-xs text-slate-500">Bases, taxas e margem aplicadas ao cenário atual.</div></PersistDetails>
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

function CostAccordion({ icon: Icon, title, subtitle, status, tone, children }: any) { const tones: any = { amber: "bg-amber-100 text-amber-800", green: "bg-emerald-100 text-emerald-700", violet: "bg-violet-100 text-violet-700" }; return <PersistDetails persistKey="d7" className="group rounded-[14px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><summary className="flex min-h-[58px] cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800 dark:text-slate-100">{title}</span><span className="block text-xs text-slate-500">{subtitle}</span></span><Badge className={`border-0 ${tones[tone]}`}>{status}</Badge><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" /></summary><div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">{children}</div></PersistDetails>; }

function PricingCostRows({ r }: { r: any }) { const money = (n: any) => n == null ? "—" : `${r.currency ?? "R$"} ${Number(n).toFixed(2).replace(".", ",")}`; return <div className="space-y-1 text-xs">{[r.lines?.human_cost, r.lines?.ia_cost, ...(r.lines?.taxes_and_margins ?? [])].filter(Boolean).map((line: any, i: number) => <div key={i} className="flex justify-between gap-3"><span className="text-slate-500">{line.label}</span><span>{money(line.amount)}</span></div>)}</div>; }
function PricingPriceSummary({ r, showCost = false }: { r: any; showCost?: boolean }) { const price = r.lines?.commercial_final_price ?? r.lines?.final_price; const money = (n: any) => n == null ? "A definir" : `${r.currency ?? "R$"} ${Number(n).toFixed(2).replace(".", ",")}`; return <div className="mt-3 space-y-2"><div className="rounded-xl bg-violet-50 px-3 py-3"><span className="text-xs font-semibold text-violet-700">Preço comercial final</span><strong className="block text-2xl text-violet-800">{money(price?.amount)}</strong></div>{showCost && <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">Esforço estimado</span><strong>{r.deadline?.effort_days ?? "—"} dias</strong></div><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">Prazo comercial</span><strong>{r.deadline?.commercial_deadline_days ?? "—"} dias</strong></div></div>}</div>; }
function PricingDiagnostics({ result }: { result: any }) { const pending = !!result?.pending_info?.length; return <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-violet-600" /><div><h3 className="font-semibold">Diagnóstico de precificação</h3><p className="text-xs text-slate-500">Confira o que falta para publicar</p></div></div><div className="mt-3 divide-y rounded-xl border border-slate-100 text-sm"><div className="flex items-center gap-2 p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Custos e encargos configurados</div><div className="flex items-center gap-2 p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Margem comercial configurada</div><div className={`flex items-center gap-2 p-2 ${pending ? "text-amber-700" : "text-emerald-700"}`}>{pending ? <Info className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{pending ? "Há uma pendência de precificação" : "Sem pendências"}</div></div>{pending && <button type="button" onClick={() => window.dispatchEvent(new Event("allka:open-pricing"))} className="mt-3 w-full rounded-lg bg-violet-700 py-2 text-xs font-semibold text-white">Corrigir pendência</button>}</section>; }

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
    <div className="mt-3">
      <SetupCard icon={CalendarClock} title="Modalidades de contratação por período" summary={deliveryRecurrence === "mensal" ? "entrega mensal recorrente" : "recorrência não definida"} help="Define por quantos meses o cliente pode contratar este produto. Só use entrega mensal recorrente quando um novo ciclo de tarefas realmente precisar ser criado a cada mês.">

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
          Este produto gera uma nova entrega todo mês
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Marque apenas quando as tarefas precisarem se repetir mensalmente. Assinatura e entrega recorrente são coisas diferentes: um produto pode ser contratado por período sem gerar uma nova entrega a cada mês.
        </p>
        {deliveryRecurrence !== "mensal" && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Defina se a entrega é recorrente antes de ativar uma modalidade por período.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">No momento, apenas o período mensal pode ser ativado. Os demais aparecem para conferência e serão liberados quando essa contratação existir na plataforma.</p>
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
  const groups = issues.slice(0, 3).map((issue: string, index: number) => ({ title: index === 0 ? "Precificação" : index === 1 ? "Modalidades" : "Regras comerciais", issue, text: reviewIssueText(issue) }));
  const done = ["Informações do produto", "Entrega", "Classificação e opções"];
  return <div className="mt-3 grid gap-3 md:grid-cols-[1.35fr_.9fr]">
    <ReviewSurface><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><Eye className="h-4 w-4" /></span><div><h2 className="text-base font-semibold">Pronto para publicar?</h2><p className="text-[11px] text-slate-500">Resolva os itens que liberam a versão.</p></div><Badge className={issues.length ? "ml-auto shrink-0 border-0 bg-red-100 text-red-700" : "ml-auto shrink-0 border-0 bg-emerald-100 text-emerald-700"}>{issues.length ? `${issues.length} bloqueio${issues.length > 1 ? "s" : ""}` : "Sem bloqueios"}</Badge></div>
      <div className="mt-3 space-y-2">{issues.length === 0 ? <ReviewLine icon={<CheckCircle2 className="h-4 w-4" />} title="Versão pronta" text="Todas as configurações necessárias foram concluídas." tone="ok" /> : groups.map((group: any, index: number) => <ReviewLine key={group.issue} icon={index === 0 ? <DollarSign className="h-4 w-4" /> : index === 1 ? <Tag className="h-4 w-4" /> : <FileText className="h-4 w-4" />} title={group.title} text={group.text} tone="block" action={() => onResolveIssue(group.issue, validation.issue_details?.[index])} />)}</div>
      {issues.length > 3 && <PersistDetails persistKey="d8" className="mt-2 rounded-xl border border-slate-200"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Ver detalhes dos bloqueios</summary><div className="border-t px-3 py-2 text-xs text-slate-600">Há mais {issues.length - 3} item(ns) a revisar.</div></PersistDetails>}
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
  return <div className="mt-3 grid gap-3 md:grid-cols-2"><ReviewSurface><div className="flex items-center gap-2"><h2 className="text-base font-semibold">Versão atual</h2><Badge className="ml-auto border-0 bg-amber-100 text-amber-800">{version.state === "publicada" ? "Publicada" : "Não publicada"}</Badge></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><select className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={version.id} disabled><option>v{version.version_number} — {version.state === "publicada" ? "Publicada" : "Rascunho"}</option></select><span className="flex items-center text-[11px] text-slate-500"><CalendarClock className="mr-1 h-3.5 w-3.5" />Atualizada em {new Date(version.updated_at).toLocaleDateString("pt-BR")}</span></div><div className="mt-3 flex items-center justify-between px-2 text-[11px]"><span className="font-semibold text-violet-700">Rascunho</span><span className="h-px flex-1 bg-slate-200" /><span className="text-slate-400">Revisão</span><span className="h-px flex-1 bg-slate-200" /><span className="text-slate-400">Publicado</span></div><div className="mt-3 space-y-1"><ReviewLine icon={<FileText className="h-4 w-4" />} title="Resumo da versão" text="Principais configurações desta versão." compact /><ReviewLine icon={<ListChecks className="h-4 w-4" />} title="Alterações pendentes" text={val?.ok ? "Nenhuma pendência" : `${val?.issues?.length ?? 0} pendência(s) a revisar`} tone={val?.ok ? "ok" : "neutral"} compact /><ReviewLine icon={<Info className="h-4 w-4" />} title="Bloqueios para publicar" text={val?.ok ? "Sem bloqueios" : `${val?.issues?.length ?? 0} bloqueio(s)`} tone={val?.ok ? "ok" : "block"} compact /></div><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" className="flex-1" disabled={readOnly} onClick={() => act(() => apiClient.updateCatalog2VersionInfo(version.id, {}), "Rascunho salvo.")}><Save className="h-3.5 w-3.5" />Salvar rascunho</Button><span className="flex-1"><PublishBtn versionId={version.id} canPublish={!!val?.ok} readOnly={readOnly} summary={summary} act={act} /></span></div></ReviewSurface><div className="space-y-3"><ReviewSurface><h2 className="text-base font-semibold">Criar nova versão</h2><p className="mt-1 text-[11px] text-slate-500">Continue evoluindo este produto.</p><Field label="Nome da versão"><Input className="h-9 text-xs" value={`v${(version.version_number ?? 0) + 1} — Nova versão`} disabled /></Field><label className="mt-2 flex items-center gap-2 text-xs"><button type="button" onClick={() => setCopyDraft(!copyDraft)} className={`relative h-5 w-9 rounded-full ${copyDraft ? "bg-violet-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${copyDraft ? "left-4" : "left-0.5"}`} /></button>Copiar dados do rascunho</label><Button size="sm" className="mt-2 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" onClick={() => act(() => apiClient.newCatalog2Version(product.id), "Nova versão criada.")}><Plus className="h-3.5 w-3.5" />Criar versão</Button></ReviewSurface><ReviewSurface><h3 className="text-sm font-semibold">Versões anteriores</h3><div className="mt-2 space-y-1">{previous.length ? previous.map((item: any) => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"><span className={`h-2 w-2 shrink-0 rounded-full ${item.state === "publicada" ? "bg-emerald-500" : "bg-amber-400"}`} /><span className="truncate font-medium">v{item.version_number} — {item.state === "publicada" ? "Publicada" : "Rascunho"}</span><span className="ml-auto shrink-0 text-[10px] text-slate-500">{new Date(item.updated_at).toLocaleDateString("pt-BR")}</span></div>) : <p className="text-xs text-slate-500">Ainda não há versões anteriores.</p>}</div></ReviewSurface></div></div>;
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
        className="block w-full px-5 py-2.5 text-left"
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
          <span className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60" aria-hidden>
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

// Estado aberto/fechado das seções: lembrado enquanto a página não é recarregada (trocar de aba do produto e voltar mantém como estava; F5 volta tudo fechado).
const openStore = new Map<string, boolean>();
const storeKey = (k: string) => `${typeof window !== "undefined" ? window.location.pathname : ""}|${k}`;
const readOpen = (k: string, fallback: boolean) => openStore.get(storeKey(k)) ?? fallback;
const writeOpen = (k: string, v: boolean) => { openStore.set(storeKey(k), v); };

// Abas do produto ficam montadas (só escondidas) ao trocar de aba: tudo que estava aberto/digitado continua como estava; F5 reinicia.
function KeepTabsContent({ className, ...props }: React.ComponentProps<typeof TabsContent>) {
  return <TabsContent forceMount className={`${className ?? ""} data-[state=inactive]:hidden`} {...props} />;
}

function PersistDetails({ persistKey, open: _ignored, onToggle, children, ...rest }: React.DetailsHTMLAttributes<HTMLDetailsElement> & { persistKey: string }) {
  return <details {...rest} open={readOpen(persistKey, false) || undefined} onToggle={(e) => { writeOpen(persistKey, (e.currentTarget as HTMLDetailsElement).open); onToggle?.(e); }}>{children}</details>;
}

function SectionCard({ icon: Icon, title, subtitle, help, headerAction, children, collapsible = true, defaultOpen = true, forceOpen = false }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; help?: string; headerAction?: React.ReactNode; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean; forceOpen?: boolean }) {
  const [open, setOpenRaw] = useState(() => readOpen("sec:" + title, defaultOpen));
  const setOpen = (fn: (o: boolean) => boolean) => setOpenRaw((o) => { const v = fn(o); writeOpen("sec:" + title, v); return v; });
  const shown = !collapsible || open || forceOpen;
  const head = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1 text-left">
        <h3 className="text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={subtitle}>{subtitle}</p>
      </div>
    </>
  );
  const toggleIcon = shown ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />;
  const heading = collapsible ? <div className="flex min-w-0 items-center gap-2"><button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown} className="flex min-w-0 flex-1 items-center gap-2.5">{head}{!headerAction && toggleIcon}</button>{headerAction && <span className="shrink-0" onClick={(e) => e.stopPropagation()}>{headerAction}</span>}{headerAction && <button type="button" aria-label={shown ? "Recolher" : "Expandir"} onClick={() => setOpen((o) => !o)} className="shrink-0 p-1">{toggleIcon}</button>}</div> : <header className="flex items-center gap-2.5">{head}<span className="ml-auto shrink-0">{headerAction}</span></header>;
  const card = <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      {help ? <TooltipProvider delayDuration={180}><Tooltip><TooltipTrigger asChild>{heading}</TooltipTrigger><TooltipContent side="bottom" sideOffset={7} className="max-w-xs bg-slate-950 px-3 py-2 text-xs leading-relaxed text-white shadow-lg">{help}</TooltipContent></Tooltip></TooltipProvider> : heading}
      {shown && <div className="mt-2.5 space-y-2">{children}</div>}
    </section>;
  return card;
}

// Somente os cartões principais recolhem. Ao abrir uma seção, seus campos
// ficam todos visíveis e editáveis — sem um segundo nível de accordions.
function FieldAccordion({ title, help, children }: { title: React.ReactNode; help?: string; children: React.ReactNode; forceOpen?: boolean }) {
  const heading = <div className="flex w-full items-center gap-2 text-left text-[12px] font-semibold text-slate-700 dark:text-slate-200"><span className="flex-1">{title}</span></div>;
  const card = <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/40">
    {help ? <TooltipProvider delayDuration={180}><Tooltip><TooltipTrigger asChild>{heading}</TooltipTrigger><TooltipContent side="bottom" sideOffset={6} className="max-w-xs bg-slate-950 px-3 py-2 text-xs leading-relaxed text-white shadow-lg">{help}</TooltipContent></Tooltip></TooltipProvider> : heading}
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
      className="flex min-h-[54px] shrink-0 items-center gap-1.5 overflow-x-hidden rounded-2xl px-3 py-1 shadow-lg ring-1 ring-white/15"
      style={{ background: "radial-gradient(ellipse at 88% -20%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.10)), var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))" }}
    >
      <HeaderIconBtn label="Voltar" onClick={onBack} className="shrink-0 !p-1.5"><ArrowLeft className="h-5 w-5" /></HeaderIconBtn>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <h2 title={headerTitle !== product.internal_name ? `Nome interno: ${product.internal_name}` : undefined} className="min-w-0 flex-[2] whitespace-normal break-words text-sm font-bold leading-tight text-white">{headerTitle}</h2>
        <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap 2xl:flex">
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
      <HeaderIconBtn label="Visualizar como o cliente vê (prévia da versão que está aberta)" onClick={onClientView} className={`flex shrink-0 items-center gap-1.5 !px-2.5 !py-1.5 text-xs font-semibold ${previewOpen ? "!bg-white/25 !text-white" : "bg-white/10"}`}><Eye className="h-4.5 w-4.5" /><span className="hidden sm:inline" data-testid="client-view-label">Ver como o cliente vê</span></HeaderIconBtn>
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
      <HeaderIconBtn label="Fechar" onClick={onBack} className="shrink-0 !p-1.5"><X className="h-5 w-5" /></HeaderIconBtn>
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

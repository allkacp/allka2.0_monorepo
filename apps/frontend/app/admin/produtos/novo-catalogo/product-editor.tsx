"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Copy, RefreshCw, Search, Link2, Unlink, FileText, Settings2, Clock, Save, CheckCircle2, MoreVertical, X, Pin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePinEntry, type PinnedEntry } from "@/contexts/open-screens-context";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useIallkaContext } from "@/contexts/iallka-context";
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
const EXEC_MODES = [["humano", "Humano"], ["ia", "IA"], ["hibrido", "Híbrido"]] as const;

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
    setProduct(p);
    setRefs({ pillars: pil.data, fourF: ff.data, categories: cat.data, specialties: sp.data, questionnaires: qn.data });
    setSelectedVersionId((cur) => cur && p.versions.some((v: any) => v.id === cur) ? cur : (p.versions.find((v: any) => v.state === "rascunho")?.id ?? p.versions[0]?.id ?? ""));
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
    const still = level === "pronto" ? [] : readinessPendingIds(watch.key, product, cur, level);
    const finished = watch.ids.filter((id) => !still.includes(id));
    if (finished.length === 0) return;
    setWatch((w) => (w ? { ...w, ids: w.ids.filter((id) => still.includes(id)) } : w));
    setDoneIds((d) => [...d, ...finished]);
    window.setTimeout(() => setDoneIds((d) => d.filter((x) => !finished.includes(x))), 3500);
  }, [product, readinessItems]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToReadinessItem(key: string) {
    const dest = readinessDestination(key, product);
    const level = readinessItems?.[key]?.level;
    const cur = product?.versions.find((v: any) => v.id === selectedVersionId);
    const ids = level === "pronto" ? [] : readinessPendingIds(key, product, cur, level);
    setEditorTab(dest.tab);
    if (dest.sub) setSubTabs((cur2) => ({ ...cur2, ...dest.sub }));
    setHighlightTarget(null);
    setHighlightTaskIds([]);
    setDoneIds([]);
    setWatch(ids.length ? { key, ids } : null);
    window.setTimeout(() => (document.getElementById(ids[0] ?? dest.target) ?? document.getElementById("catalog2-editor-tabs"))?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
  }
  const AMBER = "rounded-lg bg-amber-100 p-2 ring-2 ring-amber-400 dark:bg-amber-900/30";
  const GREEN = "rounded-lg bg-emerald-100 p-2 ring-2 ring-emerald-400 transition-colors dark:bg-emerald-900/30";
  const ringOf = (id: string) => (doneIds.includes(id) ? GREEN : watch?.ids.includes(id) || highlightTarget === id ? AMBER : "");
  const secRing = (id: string) => ringOf(id).replace("rounded-lg", "rounded-2xl").replace("p-2", "p-3");

  const version = useMemo(() => product?.versions.find((v: any) => v.id === selectedVersionId) ?? null, [product, selectedVersionId]);
  const readOnly = version?.state === "publicada";

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
    <div className="product-editor flex min-h-0 min-w-0 flex-1 flex-col">
      <EditorHeader
        product={product}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        onBack={onBack}
        onRefresh={() => void load()}
        canNewVersion={!!product.published_version_id && !product.versions.some((v: any) => v.state === "rascunho")}
        onNewVersion={() => act(() => apiClient.newCatalog2Version(productId), "Nova versão rascunho criada.")}
        pin={pin}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-5 py-4 sm:px-6 dark:bg-slate-900">
      {notice}
      {readOnly && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">Versão publicada — somente leitura. Crie uma nova versão para editar.</p>}
      <ProductReadinessPanel productId={productId} versionKey={`${selectedVersionId}:${loadCount}`} onGo={goToReadinessItem} onItems={setReadinessItems} />
      {msg && <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">{msg}</p>}

      {version && (
        <Tabs value={editorTab} onValueChange={setEditorTab}>
          {/* Etapas de trabalho (reunião 10/09). As 10 seções originais
              continuam todas aqui — reagrupadas, nada removido. */}
          <TabsList className={MAIN_TABS_LIST} data-tour-id="catalog2-editor-tabs">
            <TabsTrigger value="info" className={MAIN_TAB}>Informações do produto</TabsTrigger>
            <TabsTrigger value="opcoes" className={MAIN_TAB}>Classificação e opções</TabsTrigger>
            <TabsTrigger value="entrega" className={MAIN_TAB}>Entrega: tarefas, etapas e prazos</TabsTrigger>
            <TabsTrigger value="precos" className={MAIN_TAB}>Custos e preço</TabsTrigger>
            <TabsTrigger value="revisao" className={MAIN_TAB}>Revisão e publicação</TabsTrigger>
            <TabsTrigger value="origem" className={MAIN_TAB}>
              Origem e importação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className={TAB_CARD}>
            <GeneralTab version={version} readOnly={readOnly} highlightTarget={highlightTarget} clearHighlight={clearPublishHighlight} onSave={(b) => act(() => apiClient.updateCatalog2VersionInfo(version.id, b), "Informações salvas.", { rethrow: true })} product={product} onStatus={(s) => act(() => apiClient.setCatalog2ProductStatus(productId, s), "Status salvo.", { rethrow: true })} />
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
            <Tabs value={subTabs.entrega} onValueChange={(v) => setSubTabs((cur) => ({ ...cur, entrega: v }))}>
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="tarefas" className={SUB_TAB}>Tarefas e etapas</TabsTrigger>
                <TabsTrigger value="cond" className={SUB_TAB}>Prazos e condições</TabsTrigger>
              </TabsList>
              <TabsContent value="tarefas"><TasksTab version={version} readOnly={readOnly} refs={refs} act={act} highlightTarget={highlightTarget} highlightTaskIds={highlightTaskIds} clearHighlight={clearPublishHighlight} /></TabsContent>
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

          <TabsContent value="origem" className={TAB_CARD}>
            <StepIntro>Área secundária: de onde este produto veio na importação e as pendências de decisão. Não altera o produto.</StepIntro>
            <div id="sec-origem" className={secRing("sec-origem")}><OriginReviewTab productId={productId} onChanged={load} /></div>
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
    </RingCtx.Provider>
  );
}

// ── 1. Geral ──────────────────────────────────────────────────────────
const RingCtx = createContext<(id: string) => string>(() => "");

function GeneralTab({ version, readOnly, onSave, product, onStatus, highlightTarget, clearHighlight }: any) {
  const ringOf = useContext(RingCtx);
  const [f, setF] = useState({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" });
  const [draftStatus, setDraftStatus] = useState<string>(product.status ?? "em_preparacao");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  useEffect(() => setF({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" }), [version.id]);
  useEffect(() => setDraftStatus(product.status ?? "em_preparacao"), [product.status]);

  async function saveStatus() {
    if (draftStatus === product.status) return;
    const needsPublishedVersion = ["pre_lancamento", "disponivel", "temporariamente_inativo", "esgotado_temporariamente"].includes(draftStatus) && !product.published_version_id;
    if (needsPublishedVersion) {
      setStatusError("Publique uma versão antes de usar este status, pois ele pode aparecer no catálogo do cliente.");
      return;
    }
    setSavingStatus(true);
    setStatusError(null);
    try {
      await onStatus(draftStatus);
    } catch (e: any) {
      setStatusError(e?.message ?? "Não foi possível salvar o status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveInfo() {
    setSavingInfo(true);
    setInfoSaved(false);
    try {
      await onSave(f);
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
    setInfoSaved(false);
  }

  return (
    <div id="catalog2-general" className="grid scroll-mt-6 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <SectionCard icon={FileText} title="Dados principais" subtitle="Defina as informações básicas do seu produto.">
        <div id="catalog2-field-title" className={ringOf("catalog2-field-title")}>
          <Field label={<>Título comercial<Req /></>}><Input disabled={readOnly} value={f.title} onChange={(e) => updateInfo({ title: e.target.value })} /></Field>
        </div>
        <Field label={<>Descrição curta<Req /></>}>
          <div className="space-y-1">
            <Textarea rows={4} maxLength={500} disabled={readOnly} value={f.summary} onChange={(e) => updateInfo({ summary: e.target.value })} />
            <CharCount value={f.summary} max={500} />
          </div>
        </Field>
        <div id="catalog2-field-full-description" className={ringOf("catalog2-field-full-description")}>
          <Field label={<>Descrição completa<Req /></>}>
            <div className="space-y-1">
              <Textarea rows={5} maxLength={2000} disabled={readOnly} value={f.full_description} onChange={(e) => updateInfo({ full_description: e.target.value })} />
              <CharCount value={f.full_description} max={2000} />
            </div>
          </Field>
        </div>
      </SectionCard>

      <div className="space-y-5">
        <SectionCard icon={Settings2} title="Status do produto" subtitle="Define a disponibilidade deste produto na plataforma.">
          <select aria-label="Status do produto" className="w-full" value={draftStatus} onChange={(e) => { setDraftStatus(e.target.value); setStatusError(null); }}>
            {CATALOG2_STATUSES.map((status) => <option key={status} value={status}>{CATALOG2_STATUS_LABEL[status]}</option>)}
          </select>
          <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{CATALOG2_STATUS_MEANING[draftStatus as Catalog2Status] ?? "Status não reconhecido."}</p>
          {draftStatus !== product.status && (
            <Button size="sm" variant="outline" disabled={savingStatus} onClick={() => void saveStatus()}>
              {savingStatus ? "Salvando status…" : "Salvar status"}
            </Button>
          )}
          {statusError && <p role="alert" className="text-xs text-red-600">{statusError}</p>}
        </SectionCard>

        <SectionCard icon={Clock} title="Resumo da mudança (histórico)" subtitle="Adicione um resumo das alterações realizadas.">
          <div className="space-y-1">
            <Textarea rows={3} maxLength={500} disabled={readOnly} placeholder="Descreva as alterações realizadas neste produto..." value={f.change_summary} onChange={(e) => updateInfo({ change_summary: e.target.value })} />
            <CharCount value={f.change_summary} max={500} />
          </div>
        </SectionCard>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-4">
            <Button className="h-11 gap-2 rounded-xl bg-[#3b2bff] px-6 text-sm font-semibold text-white hover:bg-[#3223d6]" disabled={savingInfo} onClick={() => void saveInfo()}>
              <Save className="h-4 w-4" /> {savingInfo ? "Salvando informações…" : "Salvar informações"}
            </Button>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 className="h-5 w-5" /></span>
              <div className="text-sm">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">Status salvo: {catalog2StatusLabel(product.status)}.</p>
                {infoSaved && <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ Informações salvas.</p>}
                {fmtUpdatedAt(version?.updated_at ?? product.updated_at) && <p className="text-xs text-slate-500">Última atualização: {fmtUpdatedAt(version?.updated_at ?? product.updated_at)}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
    <div id="catalog2-classification" className="mt-3 space-y-3 scroll-mt-6">
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
      <p className="text-xs text-neutral-400">A divergência de classificação entre a planilha principal e a Review Rose não é resolvida aqui — precisa de decisão comercial.</p>
      <Button size="sm" onClick={saveClassifications}>Salvar</Button>
    </div>
  );
}

// ── 3. Variações ─────────────────────────────────────────────────────
function VariationsTab({ version, readOnly, act }: any) {
  const [nv, setNv] = useState({ key: "", name: "" });
  return (
    <div className="mt-3 space-y-4">
      <p className="text-xs text-neutral-500">Escolhas OBRIGATÓRIAS do cliente. Cada opção pode ter efeitos (prazo/custo/tarefa/etapa/entregável/informação).</p>
      {version.variations.map((va: any) => (
        <div key={va.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="font-medium">{va.name} <span className="text-xs text-neutral-400">({va.key}){va.is_required ? " · obrigatória" : " · opcional"}</span></div>
            {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Variation(va.id), "Variação removida.")}><Trash2 className="h-4 w-4" /></Button>}
          </div>
          <ul className="mt-2 space-y-1.5">
            {va.options.map((o: any) => (
              <li key={o.id} className="rounded bg-neutral-50 px-2 py-1.5 text-sm dark:bg-neutral-800">
                <div className="flex items-center justify-between">
                  <span>{o.label} {o.is_default && <Badge className="ml-1 bg-blue-100 text-blue-700">padrão</Badge>}</span>
                  {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Option(o.id), "Opção removida.")}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
                <EffectList effects={o.effects} readOnly={readOnly} onAdd={(b) => act(() => apiClient.addCatalog2OptionEffect(o.id, b), "Efeito adicionado.")} onDel={(id) => act(() => apiClient.deleteCatalog2OptionEffect(id), "Efeito removido.")} />
              </li>
            ))}
            {!readOnly && <AddOptionRow onAdd={(b) => act(() => apiClient.addCatalog2Option(va.id, b), "Opção adicionada.")} />}
          </ul>
        </div>
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
      <Button size="sm" variant="outline" onClick={() => o.key && o.label && (onAdd(o), setO({ key: "", label: "" }))}>Adicionar opção</Button>
    </li>
  );
}
function EffectList({ effects, readOnly, onAdd, onDel }: any) {
  const [e, setE] = useState({ effect_type: "add_deadline_days", effect_value: "" });
  return (
    <div className="mt-1 ml-2 border-l-2 border-neutral-200 pl-2 dark:border-neutral-700">
      {(effects ?? []).map((ef: any) => (
        <div key={ef.id} className="flex items-center justify-between text-xs text-neutral-500">
          <span>{ef.effect_type} = {ef.effect_value}</span>
          {!readOnly && <button className="text-red-500" onClick={() => onDel(ef.id)}>×</button>}
        </div>
      ))}
      {!readOnly && (
        <div className="mt-1 flex items-center gap-1">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 text-xs dark:border-neutral-700" value={e.effect_type} onChange={(ev) => setE({ ...e, effect_type: ev.target.value })}>
            {EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input className="h-6 text-xs" value={e.effect_value} onChange={(ev) => setE({ ...e, effect_value: ev.target.value })} placeholder="valor" />
          <Button size="sm" variant="ghost" className="h-6" onClick={() => e.effect_value && (onAdd(e), setE({ ...e, effect_value: "" }))}><Plus className="h-3 w-3" /></Button>
        </div>
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
      {version.addons.map((a: any) => (
        <div key={a.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>{a.name} <span className="text-xs text-neutral-400">({a.key}){a.base_cost != null ? ` · R$ ${a.base_cost}` : ""}</span></div>
            {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Addon(a.id), "Adicional removido.")}><Trash2 className="h-4 w-4" /></Button>}
          </div>
          <EffectList effects={a.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2AddonEffect(a.id, b), "Efeito adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2AddonEffect(id), "Efeito removido.")} />
        </div>
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
function TasksTab({ version, readOnly, refs, act, highlightTarget, highlightTaskIds, clearHighlight }: any) {
  const ringOf = useContext(RingCtx);
  const [nt, setNt] = useState({ key: "", name: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const tasks = version.tasks;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Modelos do catálogo (não são tarefas de projetos). Ordene pelas setas. Publicada = imutável.</p>
      {tasks.map((t: any, i: number) => (
        <div key={t.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-medium">#{t.sort_order} {t.name}</span>
              <span className="ml-2 text-xs text-neutral-400">{t.execution_mode} · {t.estimated_minutes ?? "?"} min{t.specialty ? ` · ${t.specialty.name}` : ""}{t.is_conditional ? " · condicional" : ""}{t.requires_review ? " · revisão" : ""}{t.questionnaire ? ` · questionário: ${t.questionnaire.name}` : ""}</span>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, -1)))}><ChevronUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" disabled={i === tasks.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, 1)))}><ChevronDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.duplicateCatalog2Task(t.id), "Tarefa duplicada.")}><Copy className="h-4 w-4" /></Button>
                <DeleteBtn label="Excluir tarefa?" onConfirm={() => act(() => apiClient.deleteCatalog2Task(t.id), "Tarefa removida.")} />
              </div>
            )}
          </div>
          {!readOnly && <TaskInlineEdit task={t} refs={refs} act={act} effortHighlighted={(highlightTarget === "catalog2-task-effort" && highlightTaskIds.includes(t.id)) || ringOf("task-effort:" + t.id).includes("amber")} durationHighlighted={(highlightTarget === "catalog2-task-duration" && highlightTaskIds.includes(t.id)) || ringOf("task-duration:" + t.id).includes("amber")} effortDone={ringOf("task-effort:" + t.id).includes("emerald")} durationDone={ringOf("task-duration:" + t.id).includes("emerald")} onSaved={(target: string) => clearHighlight(target)} />}
          <ul className="mt-2 ml-3 space-y-1">
            {t.steps.map((s: any, si: number) => (
              <StepRow key={s.id} step={s} index={si} steps={t.steps} taskId={t.id} readOnly={readOnly} act={act} refs={refs} task={t} />
            ))}
            {!readOnly && <AddStepRow refs={refs} onAdd={(b: any) => act(() => apiClient.addCatalog2Step(t.id, b), "Etapa adicionada.")} />}
          </ul>
        </div>
      ))}
      {!readOnly && (
        <div id="catalog2-task-create" className={`space-y-2 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700 ${ringOf("catalog2-task-create")}`}>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={showSearch ? "outline" : "default"} onClick={() => { setShowSearch((v) => !v); setShowCreate(false); }}>
              <Search className="h-4 w-4" /> Selecionar existente
            </Button>
            <Button size="sm" variant={showCreate ? "outline" : "default"} onClick={() => { setShowCreate((v) => !v); setShowSearch(false); }}>
              <Plus className="h-4 w-4" /> Criar nova
            </Button>
          </div>
          {showSearch && (
            <TaskLibrarySearch
              excludeVersionId={version.id}
              onImport={(taskId: string) => act(() => apiClient.importCatalog2Task(version.id, taskId), "Tarefa importada (cópia).")}
            />
          )}
          {showCreate && (
            <div className="flex items-end gap-2">
              <Field label="key"><Input value={nt.key} onChange={(e) => setNt({ ...nt, key: e.target.value })} /></Field>
              <Field label="nome"><Input value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} /></Field>
              <Button size="sm" onClick={() => nt.key && nt.name && act(() => apiClient.addCatalog2Task(version.id, nt), "Tarefa criada.").then((result) => { if (result) { setNt({ key: "", name: "" }); clearHighlight("catalog2-task-create"); } })}>Criar tarefa</Button>
            </div>
          )}
        </div>
      )}
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
  const [f, setF] = useState({ name: step.name, estimated_minutes: step.estimated_minutes ?? "", specialty_id: step.specialty_id ?? "" });
  const specName = (refs?.specialties ?? []).find((sp: any) => sp.id === (step.specialty_id ?? task?.specialty?.id))?.name;
  if (editing) {
    return (
      <li className="flex items-end gap-2">
        <Field label="nome"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="especialidade"><SpecialtySelect refs={refs} value={f.specialty_id} onChange={(v: string) => setF({ ...f, specialty_id: v })} emptyLabel="(usa a da tarefa)" /></Field>
        <Field label="min"><Input type="number" value={f.estimated_minutes} onChange={(e) => setF({ ...f, estimated_minutes: e.target.value })} /></Field>
        <Button size="sm" variant="outline" onClick={() => act(() => apiClient.updateCatalog2Step(step.id, { name: f.name, estimated_minutes: f.estimated_minutes === "" ? null : Number(f.estimated_minutes), specialty_id: f.specialty_id || null }), "Etapa salva.").then(() => setEditing(false))}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between text-sm">
      <span>{index + 1}. {step.name} <span className="text-xs text-neutral-400">{step.estimated_minutes ?? "?"} min · {specName ?? "sem especialidade"}{step.is_conditional ? " · condicional" : ""}</span></span>
      {!readOnly && (
        <span className="flex gap-1">
          <button className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100" onClick={() => setEditing(true)}>editar</button>
          <button disabled={index === 0} className="disabled:opacity-30" onClick={() => act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, -1)))}><ChevronUp className="h-3.5 w-3.5" /></button>
          <button disabled={index === steps.length - 1} className="disabled:opacity-30" onClick={() => act(() => apiClient.reorderCatalog2Steps(taskId, move(steps.map((x: any) => x.id), index, 1)))}><ChevronDown className="h-3.5 w-3.5" /></button>
          <DeleteBtn label="Excluir etapa?" onConfirm={() => act(() => apiClient.deleteCatalog2Step(step.id), "Etapa removida.")} />
        </span>
      )}
    </li>
  );
}

// Busca tarefas em QUALQUER produto/versão (bloco 3/6 + reunião 2026-09-14).
// Importar sempre COPIA a tarefa encontrada (com etapas + config de IA) pra
// esta versão — nunca altera a tarefa/produto de origem.
function TaskLibrarySearch({ excludeVersionId, onImport }: { excludeVersionId: string; onImport: (taskId: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      apiClient.searchCatalog2Tasks(q.trim(), excludeVersionId)
        .then((r: any) => { if (!cancelled) setResults(r.data); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, excludeVersionId]);
  return (
    <div className="space-y-2">
      <Input placeholder="Buscar tarefa por nome ou key (mín. 2 letras)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading && <p className="text-xs text-neutral-500">Buscando…</p>}
      {!loading && q.trim().length >= 2 && results.length === 0 && <p className="text-xs text-neutral-500">Nenhuma tarefa encontrada.</p>}
      <ul className="space-y-1">
        {results.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-800">
            <div className="min-w-0">
              <div className="truncate font-medium">{r.name} <span className="text-xs text-neutral-400">({r.key})</span></div>
              <div className="truncate text-xs text-neutral-500">
                {r.product_name} · {r.version_label} · {r.step_count} etapa(s){r.specialty_name ? ` · ${r.specialty_name}` : ""}{r.questionnaire ? ` · questionário: ${r.questionnaire.name}` : ""}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onImport(r.id)}>Importar cópia</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
function TaskInlineEdit({ task, refs, act, effortHighlighted, durationHighlighted, effortDone, durationDone, onSaved }: any) {
  const [t, setT] = useState({ execution_mode: task.execution_mode, estimated_minutes: task.estimated_minutes ?? "", specialty_id: task.specialty?.id ?? "", is_conditional: task.is_conditional, requires_review: task.requires_review, requires_client_approval: task.requires_client_approval });
  const [showNewSpecialty, setShowNewSpecialty] = useState(false);
  const saveTask = () => act(
    () => apiClient.updateCatalog2Task(task.id, { ...t, estimated_minutes: t.estimated_minutes === "" ? null : Number(t.estimated_minutes), specialty_id: t.specialty_id || null }),
    "Tarefa salva."
  ).then((result: any) => {
    if (!result) return;
    if (effortHighlighted) onSaved("catalog2-task-effort");
    if (durationHighlighted && t.estimated_minutes !== "" && Number(t.estimated_minutes) >= 0) onSaved("catalog2-task-duration");
  });
  return (
    <div className="mt-2 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.execution_mode} onChange={(e) => setT({ ...t, execution_mode: e.target.value })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.specialty_id} onChange={(e) => setT({ ...t, specialty_id: e.target.value })}><option value="">sem especialidade</option>{refs.specialties.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <button type="button" className="text-neutral-500 underline hover:text-neutral-900 dark:hover:text-neutral-100" onClick={() => setShowNewSpecialty((v) => !v)}>+ nova especialidade</button>
        <label>min <input id={"task-duration:" + task.id} type="number" className={`w-16 rounded border bg-transparent px-1 dark:border-neutral-700 ${durationDone ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : durationHighlighted ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-900/30" : "border-neutral-300"}`} value={t.estimated_minutes} onChange={(e) => setT({ ...t, estimated_minutes: e.target.value })} /></label>
        <label><input type="checkbox" checked={t.is_conditional} onChange={(e) => setT({ ...t, is_conditional: e.target.checked })} /> condicional</label>
        <label><input type="checkbox" checked={t.requires_review} onChange={(e) => setT({ ...t, requires_review: e.target.checked })} /> revisão</label>
        <label><input type="checkbox" checked={t.requires_client_approval} onChange={(e) => setT({ ...t, requires_client_approval: e.target.checked })} /> aprovação cliente</label>
        <Button id={"task-effort:" + task.id} size="sm" variant="outline" className={`h-6 ${effortDone ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400 dark:bg-emerald-900/30" : effortHighlighted ? "border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-400 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-100" : ""}`} onClick={saveTask}>Salvar tarefa</Button>
      </div>
      {effortHighlighted && <p className="text-amber-700 dark:text-amber-300">Dados provisórios de teste: revise os valores já preenchidos e clique em <strong>Salvar tarefa</strong> para confirmá-los como dados reais.</p>}
      {showNewSpecialty && (
        <NewSpecialtyForm
          onCreated={(s: any) => { setT((c) => ({ ...c, specialty_id: s.id })); setShowNewSpecialty(false); }}
          act={act}
        />
      )}
      {(t.execution_mode === "ia" || t.execution_mode === "hibrido") && <AiConfig task={task} act={act} />}
      <QuestionnaireSection task={task} refs={refs} act={act} />
    </div>
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
            <li key={qq.id}>{qq.label} {qq.is_required && <span className="text-red-500">*</span>}</li>
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
  const [questions, setQuestions] = useState<{ key: string; label: string; is_required: boolean }[]>([]);
  const [nq, setNq] = useState({ label: "", is_required: true });
  // Evita duplicar o questionário se o admin clicar "Criar e vincular"
  // repetidas vezes enquanto as chamadas (criar + N perguntas + vincular)
  // ainda estão em andamento.
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    if (!nq.label.trim()) return;
    const key = `p${questions.length + 1}-${nq.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
    setQuestions((qs) => [...qs, { key, label: nq.label.trim(), is_required: nq.is_required }]);
    setNq({ label: "", is_required: true });
  }

  async function save() {
    if (!name.trim() || questions.length === 0) return;
    const created: any = await apiClient.addCatalog2Questionnaire({ name: name.trim(), description: description.trim() || null });
    for (const [i, q] of questions.entries()) {
      await apiClient.addCatalog2QuestionnaireQuestion(created.id, { key: q.key, label: q.label, is_required: q.is_required, sort_order: i + 1 });
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
          <div key={q.key} className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 dark:bg-neutral-900">
            <span>{i + 1}. {q.label} {q.is_required && <span className="text-red-500">*</span>}</span>
            <button type="button" className="text-neutral-400 hover:text-red-500" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
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
  const [questions, setQuestions] = useState<{ key: string; label: string; is_required: boolean }[]>(
    q.questions.map((qq: any) => ({ key: qq.key, label: qq.label, is_required: qq.is_required })),
  );
  const [nq, setNq] = useState({ label: "", is_required: true });
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    if (!nq.label.trim()) return;
    const key = `p${questions.length + 1}-${nq.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
    setQuestions((qs) => [...qs, { key, label: nq.label.trim(), is_required: nq.is_required }]);
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
  function updateQuestion(i: number, patch: Partial<{ label: string; is_required: boolean }>) {
    setQuestions((qs) => qs.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  async function save() {
    return apiClient.updateCatalog2TaskQuestionnaireContent(task.id, {
      name: name.trim(),
      description: description.trim() || null,
      questions,
    });
  }

  return (
    <div className="space-y-2 rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
      <Field label="nome do questionário"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="descrição (opcional)"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="space-y-1">
        {questions.map((qItem, i) => (
          <div key={qItem.key} className="flex items-center gap-2 rounded bg-neutral-50 px-2 py-1 dark:bg-neutral-900">
            <span className="w-4 shrink-0 text-neutral-400">{i + 1}.</span>
            <Input className="flex-1" value={qItem.label} onChange={(e) => updateQuestion(i, { label: e.target.value })} />
            <label className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              <input type="checkbox" checked={qItem.is_required} onChange={(e) => updateQuestion(i, { is_required: e.target.checked })} /> obrigatória
            </label>
            <button type="button" disabled={i === 0} className="disabled:opacity-30" onClick={() => moveQuestion(i, -1)}><ChevronUp className="h-3.5 w-3.5" /></button>
            <button type="button" disabled={i === questions.length - 1} className="disabled:opacity-30" onClick={() => moveQuestion(i, 1)}><ChevronDown className="h-3.5 w-3.5" /></button>
            <button type="button" className="text-neutral-400 hover:text-red-500" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
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
function AiConfig({ task, act }: any) {
  const a = task.ai ?? {};
  const [f, setF] = useState({ est_input_tokens: a.est_input_tokens ?? "", est_output_tokens: a.est_output_tokens ?? "", unit_cost_input_per_1k: a.unit_cost_input_per_1k ?? "", unit_cost_output_per_1k: a.unit_cost_output_per_1k ?? "", est_review_rounds: a.est_review_rounds ?? "" });
  const n = (v: any) => (v === "" ? null : Number(v));
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-neutral-500">IA: tokens e custo</summary>
      <div className="mt-1 flex flex-wrap gap-2">
        {(["est_input_tokens", "est_output_tokens", "unit_cost_input_per_1k", "unit_cost_output_per_1k", "est_review_rounds"] as const).map((k) => (
          <label key={k}>{k}<input type="number" className="w-20 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
        <Button size="sm" variant="outline" className="h-6" onClick={() => act(() => apiClient.updateCatalog2TaskAI(task.id, { est_input_tokens: n(f.est_input_tokens), est_output_tokens: n(f.est_output_tokens), unit_cost_input_per_1k: n(f.unit_cost_input_per_1k), unit_cost_output_per_1k: n(f.unit_cost_output_per_1k), est_review_rounds: n(f.est_review_rounds) }), "IA salva.")}>Salvar IA</Button>
      </div>
    </details>
  );
}
function AddStepRow({ onAdd, refs }: { onAdd: (b: any) => void; refs?: any }) {
  const [s, setS] = useState({ key: "", name: "", estimated_minutes: "", specialty_id: "" });
  return (
    <li className="flex items-end gap-2">
      <Field label="key"><Input value={s.key} onChange={(e) => setS({ ...s, key: e.target.value })} /></Field>
      <Field label="nome"><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
      <Field label="especialidade"><SpecialtySelect refs={refs} value={s.specialty_id} onChange={(v: string) => setS({ ...s, specialty_id: v })} emptyLabel="(usa a da tarefa)" /></Field>
      <Field label="min"><Input type="number" value={s.estimated_minutes} onChange={(e) => setS({ ...s, estimated_minutes: e.target.value })} /></Field>
      <Button size="sm" variant="outline" onClick={() => s.key && s.name && (onAdd({ key: s.key, name: s.name, estimated_minutes: s.estimated_minutes ? Number(s.estimated_minutes) : null, specialty_id: s.specialty_id || null }), setS({ key: "", name: "", estimated_minutes: "", specialty_id: "" }))}>Adicionar etapa</Button>
    </li>
  );
}

// ── 6. Condições ────────────────────────────────────────────────────
function ConditionsTab({ version, readOnly, act }: any) {
  const [c, setC] = useState({ key: "", name: "", trigger_source: "variation_option", trigger_ref: "", operator: "selected", comparison_value: "", effect_type: "add_deadline_days", effect_value: "" });
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Regras tipadas (gatilho → efeito). Sem código livre. O construtor recusa condições incompletas ou que apontem para tarefas/opções inexistentes.</p>
      {version.conditions.map((x: any) => (
        <div key={x.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="font-medium">{x.name} {!x.is_active && <Badge className="ml-1 bg-neutral-200 text-neutral-500">inativa</Badge>}</span>
            {!readOnly && <DeleteBtn label="Excluir condição?" onConfirm={() => act(() => apiClient.deleteCatalog2Condition(x.id), "Condição removida.")} />}
          </div>
          <p className="text-neutral-500">{x.explanation}</p>
        </div>
      ))}
      {!readOnly && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <Field label="key"><Input value={c.key} onChange={(e) => setC({ ...c, key: e.target.value })} /></Field>
            <Field label="nome"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
            <Field label="gatilho"><select className="w-full rounded border border-neutral-300 bg-transparent px-1 py-1 text-sm dark:border-neutral-700" value={c.trigger_source} onChange={(e) => setC({ ...c, trigger_source: e.target.value })}>{TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="referência (key)"><Input value={c.trigger_ref} onChange={(e) => setC({ ...c, trigger_ref: e.target.value })} /></Field>
            <Field label="operador"><select className="w-full rounded border border-neutral-300 bg-transparent px-1 py-1 text-sm dark:border-neutral-700" value={c.operator} onChange={(e) => setC({ ...c, operator: e.target.value })}>{OPERATORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="valor de comparação"><Input value={c.comparison_value} onChange={(e) => setC({ ...c, comparison_value: e.target.value })} /></Field>
            <Field label="efeito"><select className="w-full rounded border border-neutral-300 bg-transparent px-1 py-1 text-sm dark:border-neutral-700" value={c.effect_type} onChange={(e) => setC({ ...c, effect_type: e.target.value })}>{EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="valor do efeito"><Input value={c.effect_value} onChange={(e) => setC({ ...c, effect_value: e.target.value })} /></Field>
          </div>
          <Button size="sm" className="mt-2" onClick={() => c.key && c.name && c.effect_value && act(() => apiClient.addCatalog2Condition(version.id, { ...c, trigger_ref: c.trigger_ref || null, comparison_value: c.comparison_value || null }), "Condição criada.").then(() => setC({ ...c, key: "", name: "", effect_value: "" }))}>Adicionar condição</Button>
        </div>
      )}
    </div>
  );
}

// ── 7. Custos e preço (simulador) ───────────────────────────────────
// Prazo comercial base da versão: é o que o cliente vê como prazo de entrega.
// Não é a soma das tarefas (isso é só a estimativa interna de esforço).
function DeadlineBaseField({ version, act, ringOf }: any) {
  const [v, setV] = useState<string>(version.base_commercial_deadline_days == null ? "" : String(version.base_commercial_deadline_days));
  useEffect(() => { setV(version.base_commercial_deadline_days == null ? "" : String(version.base_commercial_deadline_days)); }, [version.id, version.base_commercial_deadline_days]);
  const n = Number(v);
  const valid = v !== "" && Number.isInteger(n) && n >= 1;
  const readOnly = version.state === "publicada";
  return (
    <div id="catalog2-deadline-base" className={`space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800 ${ringOf("catalog2-deadline-base")}`}>
      <h3 className="text-sm font-semibold">Prazo comercial base (dias)</h3>
      <p className="text-xs text-neutral-500">Prazo de entrega prometido ao cliente para esta versão. Dias extras de variações, adicionais e condições são somados a ele.</p>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} className="w-28" value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} />
        <Button size="sm" disabled={readOnly || !valid} onClick={() => act(() => apiClient.updateCatalog2VersionInfo(version.id, { base_commercial_deadline_days: n }), "Prazo comercial salvo.")}>Salvar prazo</Button>
      </div>
    </div>
  );
}

function CostTab({ version, refs, act, onReloadRefs, productId, highlightTarget, clearHighlight }: any) {
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
    <div id="catalog2-costs" className={`mt-3 grid gap-4 scroll-mt-6 md:grid-cols-2 ${ringOf("catalog2-costs").replace("rounded-lg", "rounded-2xl")}`}>
      <div className="space-y-3">
        {highlightTarget === "catalog2-costs" && <p className="rounded-lg border border-amber-400 bg-amber-100 p-2 text-sm text-amber-950 dark:bg-amber-900/30 dark:text-amber-100">Há uma pendência comercial de preço ou prazo. Revise o valor que está marcado como “aguardando definição comercial” e salve a alteração.</p>}
        <DeadlineBaseField version={version} act={act} ringOf={ringOf} />
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-100">
          <p className="font-semibold">Custos, impostos e valor/hora ficam na Precificação</p>
          <p className="mt-1 text-xs">Valor/hora das especialidades, impostos, comissão, taxas, margem, revisão e ordem são globais e valem para todos os produtos. Aqui você só define o prazo deste produto e escolhe, em cada etapa, a especialidade e as horas.</p>
          <a href="/admin/precificacao" className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Abrir Precificação</a>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Simulador</h3>
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

        {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : result && <PricingResultView r={result} />}
      </div>

      <div className="md:col-span-2">
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
          Este produto tem entrega MENSAL RECORRENTE de verdade (um novo lote de tarefas a cada mês do período pago)
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
                      <Badge className="bg-muted text-muted-foreground">Reservado para o futuro</Badge>
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
      <Button size="sm" variant="outline" disabled={!changed} onClick={() => setConfirmOpen(true)}>Salvar valor/hora</Button>
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
        <Button size="sm" onClick={() => setConfirmOpen(true)}>Salvar taxas e margem</Button>
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
    <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
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
  const [p, setP] = useState<any>(null);
  useEffect(() => { apiClient.previewCatalog2Version(version.id).then(setP).catch(() => setP({ error: true })); }, [version.id]);
  if (!p) return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (p.error) return <p className="mt-3 text-sm text-red-600">Não foi possível carregar.</p>;
  return (
    <div className="mt-3 max-w-lg rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-lg font-semibold">{p.title || p.name}</div>
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
  );
}

// ── 9. Versões e histórico ─────────────────────────────────────────
function HistoryTab({ version, readOnly, act, onResolveIssue }: any) {
  const [val, setVal] = useState<any>(null);
  const [summary, setSummary] = useState("");
  useEffect(() => { apiClient.validateCatalog2Version(version.id).then(setVal).catch(() => setVal(null)); }, [version.id, version.updated_at]);
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Validação para publicar</h3>
        {!val ? "…" : val.ok ? <p className="text-sm text-emerald-600">Tudo certo para publicar.</p> : (
          <ul className="space-y-1 text-sm text-red-600">{val.issues.map((i: string, k: number) => <li key={k}><button type="button" className="text-left underline decoration-red-300 underline-offset-2 hover:text-red-800" onClick={() => onResolveIssue(i, val.issue_details?.[k])}>{i} → corrigir agora</button></li>)}</ul>
        )}
        {val?.pricing_pending && <p className="text-xs text-amber-600">Preço com pendência comercial — pode publicar com “status comercial pendente” somente quando não houver pendência estrutural.</p>}
        {readOnly && <p className="mt-2 text-xs text-neutral-500">Esta versão já está publicada. Crie uma nova versão para editar ou publicar uma alteração.</p>}
        {!readOnly && (
          <div className="mt-2 flex items-end gap-2">
            <Field label="Resumo da mudança"><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          </div>
        )}
        <div className="mt-2"><PublishBtn versionId={version.id} canPublish={!!val?.ok} canForce={!!val?.force_allowed} readOnly={readOnly} summary={summary} act={act} /></div>
      </div>
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
function PublishBtn({ versionId, canPublish, canForce, readOnly, summary, act }: any) {
  const [open, setOpen] = useState(false);
  const clientActionId = useMemo(() => `pub-${versionId}-${Date.now()}`, [versionId, open]);
  return (
    <>
      <Button size="sm" disabled={readOnly || (!canPublish && !canForce)} onClick={() => setOpen(true)}>Publicar versão</Button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Publicar esta versão?"
        message={canPublish ? "A versão ficará imutável. Mudanças futuras exigem uma nova versão." : "Há somente pendências comerciais de preço ou prazo. Publicar assim mesmo com status comercial pendente?"}
        confirmText="Publicar"
        destructive={false}
        onConfirm={() => act(() => apiClient.publishCatalog2Version(versionId, { client_action_id: clientActionId, change_summary: summary, force: canForce && !canPublish ? true : undefined }), "Versão publicada.", { rethrow: true })}
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
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="font-semibold">Planilha principal (fonte da identidade)</h3>
        <p className="text-xs text-neutral-500">#{data.source.index} · {data.source.name} · chave <code>{data.source.key}</code></p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(data.main_fields ?? {}).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-neutral-400">{k}</dt><dd className="truncate">{fmt(v)}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
        <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <h3 className="font-semibold">Textos originais preservados</h3>
          <p className="text-[11px] text-neutral-400">Preservados na íntegra quando não puderam ser estruturados com segurança. Nada foi inventado.</p>
          <dl className="mt-2 space-y-1 text-xs">
            {Object.entries(data.original_texts).map(([k, v]) => v ? (
              <div key={k}><dt className="text-neutral-400">{k}</dt><dd className="whitespace-pre-wrap rounded bg-neutral-50 p-1.5 dark:bg-neutral-800">{fmt(v)}</dd></div>
            ) : null)}
          </dl>
        </section>
      )}

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
        <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
const READINESS_ITEM_LABEL: Record<string, string> = {
  conteudo: "Conteúdo",
  classificacao: "Classificação",
  variacoes: "Variações",
  adicionais: "Adicionais",
  tarefas: "Tarefas",
  etapas: "Etapas",
  esforco_tarefas: "Especialidade e horas das tarefas",
  preco: "Preço / base de custo",
  prazo: "Prazo comercial",
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

// Campos exatos que ainda impedem o item de ficar pronto (ids de elementos).
function readinessPendingIds(key: string, product: any, version: any, level?: string): string[] {
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
    case "esforco_tarefas": {
      const miss = tasks.filter((t) => {
        const sm = (t.steps ?? []).filter((x: any) => (x.estimated_minutes ?? 0) > 0);
        return sm.length > 0 ? sm.some((x: any) => !(x.specialty_id ?? t.specialty?.id)) : (!t.specialty?.id || t.estimated_minutes == null);
      }).map((t) => "task-effort:" + t.id);
      return miss.length ? miss : tasks.map((t) => "task-effort:" + t.id);
    }
    default:
      return [readinessDestination(key, product).target];
  }
}

// Destino de cada item de prontidão: aba, sub-aba e campo a destacar.
function readinessDestination(key: string, product: any): { tab: string; sub?: Record<string, string>; target: string } {
  switch (key) {
    case "conteudo": return { tab: "info", target: "catalog2-field-full-description" };
    case "classificacao": return { tab: "opcoes", sub: { opcoes: "class" }, target: !product?.pillar ? "catalog2-field-pillar" : !product?.category ? "catalog2-field-category" : "catalog2-field-four-f" };
    case "variacoes": return { tab: "opcoes", sub: { opcoes: "var" }, target: "sec-var" };
    case "adicionais": return { tab: "opcoes", sub: { opcoes: "add" }, target: "sec-add" };
    case "tarefas":
    case "etapas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-create" };
    case "esforco_tarefas": return { tab: "entrega", sub: { entrega: "tarefas" }, target: "catalog2-task-effort" };
    case "prazo": return { tab: "precos", target: "catalog2-deadline-base" };
    case "preco": return { tab: "precos", target: "catalog2-costs" };
    case "portfolio":
    case "revisao_rose": return { tab: "origem", target: "sec-origem" };
    case "publicacao": return { tab: "revisao", sub: { revisao: "hist" }, target: "sec-publicacao" };
    default: return { tab: "info", target: "catalog2-general" };
  }
}

const READINESS_WHERE: Record<string, string> = {
  conteudo: "Informações do produto",
  classificacao: "Classificação e opções › Classificação",
  variacoes: "Classificação e opções › Variações",
  adicionais: "Classificação e opções › Adicionais",
  tarefas: "Entrega › Tarefas e etapas",
  etapas: "Entrega › Tarefas e etapas",
  esforco_tarefas: "Entrega › Tarefas e etapas",
  prazo: "Custos e preço › Prazo comercial base",
  preco: "Custos e preço",
  portfolio: "Origem e importação",
  revisao_rose: "Origem e importação",
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
  tarefas: { pendente: "Cadastre pelo menos uma tarefa (o que será executado quando o produto for contratado). Sem tarefas não há operação nem base de custo para calcular o preço." },
  esforco_tarefas: { pendente: "Cada tarefa precisa de especialidade e horas estimadas reais. Mesmo que já estejam preenchidas, se estiverem marcadas como PROVISÓRIAS (dado de teste) o item continua pendente até você revisar e confirmar os valores reais." },
  preco: { bloqueador: "O preço sai de: horas de cada tarefa × valor/hora da especialidade, + revisão humana, + impostos, comissão, taxa operacional e margem, aplicados na ordem definida. O motivo exato aparece na linha acima (ex.: valor/hora de especialidade, percentual de revisão, impostos/margem, ordem de incidência, dados provisórios). Tudo se configura em Custos e preço: coluna da esquerda (taxas e margens; valor/hora das especialidades); horas e especialidade de cada tarefa ficam em Entrega › Tarefas e etapas." },
  prazo: { bloqueador: "O prazo que o cliente vê NÃO é a soma das tarefas: é o \"Prazo comercial base\" da versão, que ainda não foi informado. Preencha o campo em Custos e preço › Prazo comercial base (dias) e salve." },
  portfolio: { pendente: "Ainda não há material de portfólio para este produto. Não impede a venda, mas deixa a página do produto mais pobre. Resolva na aba Origem e importação." },
  revisao_rose: { pendente: "A Rose ainda não marcou este produto como revisado. Confirme a revisão na aba Origem e importação." },
  publicacao: { bloqueador: "O produto nunca foi publicado, então o cliente não o enxerga. Quando os outros bloqueios estiverem resolvidos, publique a versão em Revisão e publicação › Publicação e versões." },
};

const LEVEL_META: Record<string, { label: string; chip: string; border: string; rank: number }> = {
  bloqueador: { label: "Bloqueio", chip: "bg-red-100 text-red-700", border: "border-l-red-500", rank: 0 },
  pendente: { label: "Pendente", chip: "bg-amber-100 text-amber-700", border: "border-l-amber-400", rank: 1 },
  pronto: { label: "Pronto", chip: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500", rank: 2 },
  opcional: { label: "Opcional", chip: "bg-slate-100 text-slate-600", border: "border-l-slate-300", rank: 3 },
};

type ReadinessFilter = "todos" | "pronto" | "bloqueador" | "pendente" | "opcional";

function ProductReadinessPanel({ productId, versionKey, onGo, onItems }: { productId: string; versionKey: string; onGo: (key: string) => void; onItems?: (items: Record<string, { level: string; note: string }>) => void }) {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReadinessFilter>("todos");

  const reload = useCallback(() => {
    setLoading(true);
    apiClient
      .getCatalog2ProductReadiness(productId)
      .then((d: any) => setData(d))
      .catch(() => setData({ error: true }))
      .finally(() => setLoading(false));
  }, [productId]);
  useEffect(() => { reload(); }, [reload, versionKey]);
  useEffect(() => { if (data?.items) onItems?.(data.items); }, [data, onItems]);

  const blockers = data?.blockers ?? [];
  const pendings = data?.pendings ?? [];
  const entries: { key: string; level: string; note: string }[] = data?.items
    ? Object.entries(data.items).map(([key, it]: any) => ({ key, level: it.level, note: it.note }))
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
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="block w-full px-5 py-4 text-left"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Prontidão para publicação ·</span>
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
              <div className="mb-3 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar itens de prontidão">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === f.id ? "border-violet-600 bg-violet-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                  >
                    {f.label} <span className={filter === f.id ? "text-white/80" : "text-slate-400"}>({f.n})</span>
                  </button>
                ))}
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Clique num item para ir direto ao lugar de resolver. O campo aparece em amarelo até ficar pronto.
              </p>
              {visible.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/40">Nenhum item nesta categoria.</p>
              ) : (
                <ul className="space-y-2.5">
                  {visible.map((it) => {
                    const meta = LEVEL_META[it.level] ?? LEVEL_META.opcional;
                    const help = (READINESS_HELP[it.key] as any)?.[it.level] as string | undefined;
                    return (
                      <li key={it.key}>
                        <button
                          type="button"
                          onClick={() => onGo(it.key)}
                          className={`w-full rounded-xl border border-l-4 border-slate-200/80 bg-white p-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-700/60 dark:bg-slate-900 dark:hover:bg-slate-800/50 ${meta.border}`}
                        >
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2.5">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{READINESS_ITEM_LABEL[it.key] ?? it.key}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                              {READINESS_WHERE[it.key] ?? "Abrir"} <ChevronRight className="h-4 w-4" />
                            </span>
                          </span>
                          <span className="mt-1.5 block text-sm text-slate-600 dark:text-slate-300">{it.note}</span>
                          {help && (
                            <span className={`mt-2 block rounded-lg px-3 py-2 text-[13px] leading-relaxed ${it.level === "bloqueador" ? "bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"}`}>
                              <strong>{it.level === "bloqueador" ? "Por que está bloqueado: " : "Por que está pendente: "}</strong>{help}
                            </span>
                          )}
                        </button>
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
const SUB_TABS_LIST = "h-auto w-fit flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800";
const SUB_TAB = "flex-none rounded-lg px-3.5 py-1.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-violet-200";
const TAB_CARD = "mt-5";

function SectionCard({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-900">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </header>
      <div className="space-y-4">{children}</div>
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
function EditorHeader({ product, selectedVersionId, onSelectVersion, onBack, onRefresh, canNewVersion, onNewVersion, pin }: any) {
  const { pinned, toggle } = usePinEntry(pin ?? null);
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
      style={{ background: "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))" }}
    >
      <button type="button" onClick={onBack} aria-label="Voltar" className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white">
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="min-w-0 text-xl font-bold leading-tight text-white">{product.internal_name}</h2>
          <Badge className={catalog2StatusTone(product.status)}>{catalog2StatusLabel(product.status)}</Badge>
          {product.is_new && <Badge className="bg-emerald-100 text-emerald-700">Novo</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-white/75">Editor de produto</p>
      </div>
      <select
        aria-label="Versão do produto"
        className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
        value={selectedVersionId}
        onChange={(ev) => onSelectVersion(ev.target.value)}
      >
        {product.versions.map((v: any) => (
          <option key={v.id} value={v.id}>v{v.version_number} — {v.state}{v.is_published_current ? " (publicada atual)" : ""}</option>
        ))}
      </select>
      <button type="button" onClick={onRefresh} aria-label="Atualizar" className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white">
        <RefreshCw className="h-5 w-5" />
      </button>
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
      <button type="button" onClick={onBack} aria-label="Fechar" className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white">
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}

function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 rounded-xl bg-violet-50/70 px-4 py-2.5 text-sm text-slate-600 dark:bg-violet-950/20 dark:text-slate-300">{children}</p>;
}
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}
function DeleteBtn({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-red-500" onClick={() => setOpen(true)}><Trash2 className="h-3.5 w-3.5" /></button>
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

"use client"

// Formulário de regra de dependência (usado na tela de Pacotes e nos pré-requisitos do
// produto). "A tarefa X do produto A espera <alvo> do produto B — e como espera."
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"

export interface DependencyOptions {
  target_kinds: { key: string; label: string }[]
  behaviors: { key: string; label: string }[]
}

const ACCESS_TYPES: [string, string][] = [
  ["google_ads", "Google Ads"], ["meta_business_manager", "Meta Business Manager"], ["ad_account", "Conta de anúncios"],
  ["pixel_capi", "Pixel / Conversions API"], ["google_analytics", "Google Analytics"], ["google_tag_manager", "Google Tag Manager"],
  ["crm", "CRM"], ["site_landing", "Site / landing page"], ["other", "Outros"],
]

const sel = "h-8 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"

interface ProductLite { id: string; name: string }

/** Carrega as tarefas (e etapas) da última versão de um produto. */
function useProductTasks(productId: string) {
  const [tasks, setTasks] = useState<{ key: string; name: string; steps: { key: string; name: string }[]; deliverables: { key: string; name: string }[] }[]>([])
  useEffect(() => {
    if (!productId) { setTasks([]); return }
    let cancelled = false
    apiClient.getCatalog2Product(productId).then((p: any) => {
      if (cancelled) return
      const v = p.versions?.[0]
      setTasks((v?.tasks ?? []).map((t: any) => ({ key: t.key, name: t.name, steps: (t.steps ?? []).map((s: any) => ({ key: s.key, name: s.name })), deliverables: (t.deliverables ?? []).map((d: any) => ({ key: d.key, name: d.name })) })))
    }).catch(() => setTasks([]))
    return () => { cancelled = true }
  }, [productId])
  return tasks
}

export function DependencyRuleForm({
  products, dependentProductId, options, onSubmit, submitLabel = "Adicionar regra",
}: {
  /** Produtos que podem ser o alvo (do pacote) — e o dependente, quando `dependentProductId` não é fixo. */
  products: ProductLite[]
  dependentProductId?: string
  options: DependencyOptions | null
  onSubmit: (body: Record<string, unknown>) => Promise<void>
  submitLabel?: string
}) {
  const [dependent, setDependent] = useState(dependentProductId ?? products[0]?.id ?? "")
  const [dependentTask, setDependentTask] = useState("")
  const [targetKind, setTargetKind] = useState("task")
  const [targetProduct, setTargetProduct] = useState(products.find((p) => p.id !== (dependentProductId ?? products[0]?.id))?.id ?? "")
  const [targetTask, setTargetTask] = useState("")
  const [targetStep, setTargetStep] = useState("")
  const [assetType, setAssetType] = useState("google_ads")
  const [behavior, setBehavior] = useState("block_start")
  const [appliesTo, setAppliesTo] = useState("all")
  const [targetDeliverable, setTargetDeliverable] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dependentTasks = useProductTasks(dependent)
  const targetTasks = useProductTasks(targetKind === "info_asset" ? "" : targetProduct)
  const needsTask = ["task", "step", "deliverable", "internal_approval", "client_approval"].includes(targetKind)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        dependent_product_id: dependent,
        dependent_task_key: dependentTask || null,
        target_kind: targetKind,
        target_product_id: targetKind === "info_asset" ? null : targetProduct,
        target_task_key: needsTask ? targetTask || null : null,
        target_step_key: targetKind === "step" ? targetStep || null : null,
        target_asset_type: targetKind === "info_asset" ? assetType : null,
        target_deliverable_key: targetKind === "deliverable" ? targetDeliverable || null : null,
        applies_to: appliesTo,
        behavior,
        note: note.trim() || null,
      })
      setNote("")
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível adicionar a regra.")
    } finally {
      setBusy(false)
    }
  }

  if (!options) return <p className="text-xs text-slate-500">Carregando opções…</p>
  return (
    <div className="min-w-0 space-y-2 rounded-lg border border-dashed border-slate-300 p-2.5 text-xs dark:border-slate-700">
      <div className="flex flex-wrap items-end gap-2">
        {!dependentProductId && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Produto que ESPERA
            <select className={`${sel} block`} value={dependent} onChange={(e) => { setDependent(e.target.value); setDependentTask("") }}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Tarefa que espera
          <select className={`${sel} block`} value={dependentTask} onChange={(e) => setDependentTask(e.target.value)}>
            <option value="">Todas as tarefas do produto</option>
            {dependentTasks.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
        </label>
        <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Espera por
          <select className={`${sel} block`} value={targetKind} onChange={(e) => setTargetKind(e.target.value)}>
            {options.target_kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        {targetKind !== "info_asset" && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Do produto
            <select className={`${sel} block`} value={targetProduct} onChange={(e) => { setTargetProduct(e.target.value); setTargetTask("") }}>
              <option value="">— escolha —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {needsTask && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Tarefa alvo
            <select className={`${sel} block`} value={targetTask} onChange={(e) => { setTargetTask(e.target.value); setTargetStep("") }}>
              <option value="">— escolha —</option>
              {targetTasks.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </label>
        )}
        {targetKind === "step" && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Etapa alvo
            <select className={`${sel} block`} value={targetStep} onChange={(e) => setTargetStep(e.target.value)}>
              <option value="">— escolha —</option>
              {(targetTasks.find((t) => t.key === targetTask)?.steps ?? []).map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </label>
        )}
        {targetKind === "deliverable" && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Entregável alvo
            <select className={`${sel} block`} value={targetDeliverable} onChange={(e) => setTargetDeliverable(e.target.value)}>
              <option value="">Qualquer anexo da tarefa</option>
              {(targetTasks.find((t) => t.key === targetTask)?.deliverables ?? []).map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
            </select>
          </label>
        )}
        {targetKind === "info_asset" && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Tipo de acesso
            <select className={`${sel} block`} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              {ACCESS_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        )}
        <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600" title="Em que ciclo da contratação a regra vale">Vale para
          <select className={`${sel} block`} value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)}>
            <option value="all">Todos os ciclos</option>
            <option value="implementacao">Só a implantação</option>
            <option value="recorrencia">Só a rotina (recorrência)</option>
            <option value="revalidacao">Só a revalidação</option>
          </select>
        </label>
        <label className="min-w-[9rem] flex-1 space-y-1 text-xs font-semibold text-slate-600">Como espera
          <select className={`${sel} block`} value={behavior} onChange={(e) => setBehavior(e.target.value)}>
            {options.behaviors.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
        </label>
      </div>
      <input
        className="h-9 w-full rounded border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700"
        placeholder="Explicação que aparece para cliente, executor e líder (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <Button size="sm" disabled={busy || !dependent || (targetKind !== "info_asset" && !targetProduct)} onClick={() => void submit()}>{submitLabel}</Button>
    </div>
  )
}

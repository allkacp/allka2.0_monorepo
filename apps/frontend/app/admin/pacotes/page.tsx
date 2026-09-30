"use client"

// Pacotes de produtos e dependências (Admin Master). Um pacote agrupa 2+ produtos
// contratados juntos; cada produto continua independente, e regras dizem quem espera
// o quê (produto, tarefa, etapa, entregável, aprovação, acesso) e COMO espera.
import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api-client"
import { DependencyRuleForm, type DependencyOptions } from "@/components/dependency-rule-form"

const BEHAVIOR_TONE: Record<string, string> = {
  block_start: "bg-red-100 text-red-800",
  block_final: "bg-orange-100 text-orange-800",
  require_before_delivery: "bg-amber-100 text-amber-800",
  alert_only: "bg-slate-100 text-slate-700",
}

export default function AdminPacotesPage() {
  const [packages, setPackages] = useState<any[]>([])
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [options, setOptions] = useState<DependencyOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [pk, pr, op] = await Promise.all([
        apiClient.getCatalog2Packages(),
        apiClient.getCatalog2Products({ page_size: 100 }),
        apiClient.getCatalog2DependencyOptions(),
      ])
      setPackages(pk.data)
      setProducts(pr.data.map((p: any) => ({ id: p.id, name: `${p.sequence_number != null ? `#${p.sequence_number} · ` : ""}${p.internal_name}` })))
      setOptions(op)
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível carregar os pacotes.")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const nameOf = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products])

  async function create() {
    setBusy(true)
    setError(null)
    try {
      await apiClient.createCatalog2Package({ name: name.trim(), description: description.trim() || null, product_ids: selected })
      setName(""); setDescription(""); setSelected([])
      await load()
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível criar o pacote.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex items-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Package className="h-5 w-5" /> Pacotes e dependências</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Quando um cliente contrata <strong>2 ou mais produtos de um pacote juntos</strong>, as regras abaixo bloqueiam e liberam tarefas automaticamente
          (ex.: a publicação de campanhas espera os criativos serem aprovados). Cada produto continua sendo um item independente.
          Pré-requisitos de <em>um produto só</em> (exigir outro produto já concluído) ficam no próprio cadastro do produto.
        </p>
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-sm font-semibold">Novo pacote</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Nome (ex.: Tráfego Pago + Criativos)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="max-h-48 overflow-y-auto rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="mb-1 text-xs font-semibold text-slate-500">Produtos do pacote ({selected.length} selecionados — mínimo 2)</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected((cur) => (e.target.checked ? [...cur, p.id] : cur.filter((x) => x !== p.id)))} /> {p.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
        <Button size="sm" disabled={busy || name.trim().length < 2 || selected.length < 2} onClick={() => void create()}><Plus className="h-4 w-4" /> Criar pacote</Button>
      </section>

      <section className="space-y-3">
        {packages.length === 0 && <p className="text-sm text-slate-500">Nenhum pacote ainda.</p>}
        {packages.map((pk) => (
          <div key={pk.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{pk.name} {!pk.is_active && <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold">inativo</span>}</p>
                <p className="text-xs text-slate-500">{pk.items.map((i: any) => i.product.internal_name).join(" + ")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === pk.id ? null : pk.id)}>{openId === pk.id ? "Fechar" : `Regras (${pk.rules.filter((r: any) => r.is_active).length})`}</Button>
                <Button size="sm" variant="ghost" onClick={async () => { await apiClient.updateCatalog2Package(pk.id, { is_active: !pk.is_active }); await load() }}>{pk.is_active ? "Desativar" : "Reativar"}</Button>
              </div>
            </div>
            {openId === pk.id && (
              <div className="mt-3 space-y-3">
                <ul className="space-y-1.5">
                  {pk.rules.map((r: any) => (
                    <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 ${r.is_active ? "" : "opacity-50"}`}>
                      <span>
                        <strong>{r.dependent_product.internal_name}</strong>{r.dependent_task_key ? ` › ${r.dependent_task_key}` : " (todas as tarefas)"} espera{" "}
                        <strong>{options?.target_kinds.find((k) => k.key === r.target_kind)?.label ?? r.target_kind}</strong>
                        {r.target_product ? ` de ${r.target_product.internal_name}` : ""}{r.target_task_key ? ` › ${r.target_task_key}` : ""}{r.target_step_key ? ` › ${r.target_step_key}` : ""}{r.target_asset_type ? ` (${r.target_asset_type})` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${BEHAVIOR_TONE[r.behavior] ?? ""}`}>{options?.behaviors.find((b) => b.key === r.behavior)?.label ?? r.behavior}</span>
                        <button className="text-xs text-slate-500 underline" onClick={async () => { await apiClient.setCatalog2DependencyRuleActive(r.id, !r.is_active); await load() }}>{r.is_active ? "desativar" : "reativar"}</button>
                      </span>
                    </li>
                  ))}
                  {pk.rules.length === 0 && <li className="text-xs text-slate-500">Nenhuma regra: os produtos do pacote não esperam um pelo outro.</li>}
                </ul>
                <DependencyRuleForm
                  products={pk.items.map((i: any) => ({ id: i.product.id, name: nameOf.get(i.product.id) ?? i.product.internal_name }))}
                  options={options}
                  onSubmit={async (body) => { await apiClient.addCatalog2PackageRule(pk.id, body); await load() }}
                />
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

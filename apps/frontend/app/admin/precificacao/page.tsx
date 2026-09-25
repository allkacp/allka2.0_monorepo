import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Award, DollarSign, Info, Percent, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient } from "@/lib/api-client";
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";

// Precificação GLOBAL do catálogo (catalog2): tudo o que entra no preço de
// TODOS os produtos fica aqui — valor/hora das especialidades, impostos,
// comissão, taxa operacional, margem, revisão humana e componentes extras
// (que podem ser ligados/desligados). O produto só puxa esses valores.

type Row = {
  key: string; // "tax" | ... | "custom:<slug>"
  label: string;
  builtin: boolean;
  id?: string;
  percent: string;
  active: boolean;
  base: "running" | "subtotal" | "direct_cost";
};

const BUILTIN: { key: string; label: string; field: string }[] = [
  { key: "tax", label: "Impostos (Simples Nacional)", field: "tax_percent" },
  { key: "commission", label: "Comissão", field: "commission_percent" },
  { key: "operational", label: "Taxa operacional", field: "operational_fee_percent" },
  { key: "margin", label: "Margem de lucro", field: "profit_margin_percent" },
];
const BASE_LABEL: Record<string, string> = { running: "Acumulado até aqui", subtotal: "Subtotal", direct_cost: "Custo direto" };

const cardCls = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900";

function buildRows(s: any): Row[] {
  const disabled = new Set<string>(s.disabled_components ?? []);
  const base = s.component_base ?? {};
  const rows: Row[] = [
    ...BUILTIN.map((b) => ({ key: b.key, label: b.label, builtin: true, percent: s[b.field] == null ? "" : String(s[b.field]), active: !disabled.has(b.key), base: (base[b.key] ?? "running") as Row["base"] })),
    ...(s.custom_components ?? []).map((c: any) => ({ key: `custom:${c.key}`, label: c.label, builtin: false, id: c.id, percent: c.percent == null ? "" : String(c.percent), active: !!c.is_active && !disabled.has(`custom:${c.key}`), base: (base[`custom:${c.key}`] ?? "running") as Row["base"] })),
  ];
  const order: string[] = s.component_order?.length ? s.component_order : BUILTIN.map((b) => b.key);
  const pos = (k: string) => { const i = order.indexOf(k); return i === -1 ? 999 : i; };
  return rows.map((r, i) => ({ r, i })).sort((a, b) => pos(a.r.key) - pos(b.r.key) || a.i - b.i).map((x) => x.r);
}

function PrecificacaoPage() {
  const [settings, setSettings] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [review, setReview] = useState("");
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newComp, setNewComp] = useState({ label: "", percent: "" });
  const [newSpec, setNewSpec] = useState({ key: "", name: "", rate: "" });
  const [confirmSave, setConfirmSave] = useState(false);
  const [removeRow, setRemoveRow] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const [s, sp] = await Promise.all([apiClient.getCatalog2PricingSettings(), apiClient.getCatalog2Specialties()]);
    setSettings(s);
    setRows(buildRows(s));
    setReview(s.human_review_percent == null ? "" : String(s.human_review_percent));
    setSpecialties(Array.isArray(sp) ? sp : sp?.data ?? []);
  }, []);
  useEffect(() => { load().catch((e) => setMsg({ ok: false, text: e?.message ?? "Não foi possível carregar." })); }, [load]);

  const run = async (fn: () => Promise<any>, ok: string) => {
    setMsg(null);
    try { await fn(); await load(); setMsg({ ok: true, text: ok }); }
    catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Falha na operação." }); }
  };

  const setRow = (key: string, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: number) => setRows((cur) => { const n = [...cur]; const j = i + d; if (j < 0 || j >= n.length) return cur; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const saveAll = () => run(async () => {
    for (const r of rows.filter((x) => !x.builtin && x.id)) {
      await apiClient.updateCatalog2PricingComponent(r.id!, { label: r.label, percent: num(r.percent), is_active: r.active });
    }
    const body: Record<string, any> = {
      human_review_percent: num(review),
      component_order: rows.map((r) => r.key),
      component_base: Object.fromEntries(rows.map((r) => [r.key, r.base])),
      disabled_components: rows.filter((r) => !r.active).map((r) => r.key),
    };
    for (const b of BUILTIN) body[b.field] = num(rows.find((r) => r.key === b.key)?.percent ?? "");
    await apiClient.updateCatalog2PricingSettings(body);
  }, "Configuração de preço salva. Vale para todos os produtos.");

  const addComponent = () => run(async () => {
    if (!newComp.label.trim()) throw new Error("Informe o nome do imposto/taxa.");
    await apiClient.createCatalog2PricingComponent({ label: newComp.label.trim(), percent: num(newComp.percent) });
    setNewComp({ label: "", percent: "" });
  }, "Componente adicionado. Ele entra no fim da ordem; ajuste a ordem e salve.");

  const addSpecialty = () => run(async () => {
    if (!newSpec.key.trim() || !newSpec.name.trim()) throw new Error("Informe a chave e o nome da especialidade.");
    await apiClient.addCatalog2Specialty({ key: newSpec.key.trim(), name: newSpec.name.trim(), max_hourly_rate: num(newSpec.rate) });
    setNewSpec({ key: "", name: "", rate: "" });
  }, "Especialidade criada. Já aparece para escolher nas etapas dos produtos.");

  const pending = useMemo(() => rows.filter((r) => r.active && r.percent.trim() === "").length + (review.trim() === "" ? 1 : 0) + specialties.filter((s) => s.is_active !== false && s.max_hourly_rate == null).length, [rows, review, specialties]);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="-mb-[11px] shrink-0">
          <StandardPageBanner
            icon={DollarSign}
            title="Precificação"
            description="Valor/hora das especialidades, impostos, comissão, taxas e margem — valem para todos os produtos"
            contentClassName="lg:h-[65px]"
            actions={<PinToTrayButton id="page-precificacao" label="Precificação" icon={DollarSign} path="/admin/precificacao" />}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mt-[5px] space-y-4 p-1">
            <div className="flex items-start gap-2 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-3 text-xs text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p>
                O preço de cada produto = (horas de cada <strong>etapa</strong> × valor/hora da <strong>especialidade</strong> escolhida na etapa) + revisão humana + os componentes abaixo, na ordem definida.
                Componentes <strong>desligados</strong> não entram na soma. Mudou algo aqui, todos os produtos passam a usar.
              </p>
            </div>

            {msg && (
              <p className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>{msg.text}</p>
            )}
            {pending > 0 && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {pending} valor(es) ainda sem definição (campos vazios). Enquanto houver, o preço comercial dos produtos fica "A definir".
              </p>
            )}

            {/* ── Especialidades ── */}
            <section className={cardCls}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-orange-100 p-2"><Award className="h-4 w-4 text-orange-600" /></span>
                <div>
                  <h2 className="text-base font-semibold">Valor/hora das especialidades</h2>
                  <p className="text-xs text-slate-500">Nas etapas dos produtos você escolhe uma dessas especialidades e informa as horas; o valor sai daqui.</p>
                </div>
              </div>
              <div className="space-y-2">
                {specialties.map((s) => <SpecialtyLine key={s.id} s={s} onSave={(rate) => run(() => apiClient.updateCatalog2Specialty(s.id, { max_hourly_rate: rate }), `Valor/hora de ${s.name} salvo.`)} />)}
                {specialties.length === 0 && <p className="text-sm text-slate-500">Nenhuma especialidade cadastrada.</p>}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <label className="text-xs">Chave<Input className="mt-1 w-36" value={newSpec.key} onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })} placeholder="ex.: designer-senior" /></label>
                <label className="text-xs">Nome<Input className="mt-1 w-48" value={newSpec.name} onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })} placeholder="ex.: Designer sênior" /></label>
                <label className="text-xs">Valor/hora (R$)<Input className="mt-1 w-28" type="number" value={newSpec.rate} onChange={(e) => setNewSpec({ ...newSpec, rate: e.target.value })} /></label>
                <Button size="sm" onClick={addSpecialty}><Plus className="h-4 w-4" /> Nova especialidade</Button>
              </div>
            </section>

            {/* ── Componentes ── */}
            <section className={cardCls}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-green-100 p-2"><Percent className="h-4 w-4 text-green-600" /></span>
                <div>
                  <h2 className="text-base font-semibold">Impostos, comissão, taxas e margem</h2>
                  <p className="text-xs text-slate-500">Aplicados nesta ordem (de cima para baixo). Use o interruptor para ligar/desligar sem apagar.</p>
                </div>
              </div>

              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={r.key} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${r.active ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" : "border-dashed border-slate-300 bg-slate-50 opacity-70 dark:bg-slate-800/40"}`}>
                    <span className="w-6 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                    <div className="flex flex-col">
                      <button type="button" className="disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" className="disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="min-w-[10rem] flex-1">
                      {r.builtin ? <span className="text-sm font-medium">{r.label}</span> : <Input value={r.label} onChange={(e) => setRow(r.key, { label: e.target.value })} />}
                      {!r.builtin && <Badge variant="outline" className="mt-1 text-[10px]">personalizado</Badge>}
                    </div>
                    <label className="flex items-center gap-1 text-xs">
                      <Input aria-label={`Percentual: ${r.label}`} className="w-20" type="number" value={r.percent} onChange={(e) => setRow(r.key, { percent: e.target.value })} /> %
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      sobre
                      <select className="rounded border border-slate-300 bg-transparent px-1 py-1 text-xs" value={r.base} onChange={(e) => setRow(r.key, { base: e.target.value as Row["base"] })}>
                        {Object.entries(BASE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={r.active} onCheckedChange={(v) => setRow(r.key, { active: v })} aria-label={`Usar ${r.label} no preço`} />
                      {r.active ? "Entra no preço" : "Desligado"}
                    </label>
                    {r.active && r.percent.trim() === "" && <span className="text-[11px] text-amber-600">aguardando definição</span>}
                    {!r.builtin && <button type="button" className="text-red-500 hover:text-red-700" onClick={() => setRemoveRow(r)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <span className="text-sm font-medium">Revisão humana (% do custo humano)</span>
                <Input aria-label="Percentual de revisão humana" className="w-20" type="number" value={review} onChange={(e) => setReview(e.target.value)} /> %
                {review.trim() === "" && <span className="text-[11px] text-amber-600">aguardando definição</span>}
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <label className="text-xs">Novo imposto/taxa<Input className="mt-1 w-56" value={newComp.label} onChange={(e) => setNewComp({ ...newComp, label: e.target.value })} placeholder="ex.: ISS, taxa de cartão" /></label>
                <label className="text-xs">%<Input className="mt-1 w-20" type="number" value={newComp.percent} onChange={(e) => setNewComp({ ...newComp, percent: e.target.value })} /></label>
                <Button size="sm" variant="outline" onClick={addComponent}><Plus className="h-4 w-4" /> Adicionar</Button>
              </div>

              <div className="mt-5 flex justify-end">
                <Button onClick={() => setConfirmSave(true)}>Salvar configuração de preço</Button>
              </div>
            </section>

            {settings && <InactivationDemo settings={settings} run={run} />}
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Salvar configuração de preço?"
        message="Vale para TODOS os produtos: valores, ordem e componentes ligados/desligados. Cotações já emitidas continuam protegidas pela regra comercial."
        confirmText="Salvar"
        destructive={false}
        onConfirm={saveAll}
      />
      <ConfirmationDialog
        open={!!removeRow}
        onClose={() => setRemoveRow(null)}
        title="Excluir componente?"
        message={`"${removeRow?.label}" deixa de existir e sai do cálculo de todos os produtos. Para só parar de usar por enquanto, prefira desligar.`}
        confirmText="Excluir"
        destructive
        onConfirm={() => run(() => apiClient.deleteCatalog2PricingComponent(removeRow!.id!), "Componente excluído.")}
      />
    </div>
  );
}

function SpecialtyLine({ s, onSave }: { s: any; onSave: (rate: number | null) => void }) {
  const [v, setV] = useState(s.max_hourly_rate == null ? "" : String(s.max_hourly_rate));
  useEffect(() => setV(s.max_hourly_rate == null ? "" : String(s.max_hourly_rate)), [s.id, s.max_hourly_rate]);
  const changed = v !== (s.max_hourly_rate == null ? "" : String(s.max_hourly_rate));
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <span className="min-w-[10rem] flex-1 text-sm font-medium">{s.name}</span>
      <label className="flex items-center gap-1 text-xs">R$
        <Input aria-label={`Valor/hora: ${s.name}`} className="w-28" type="number" value={v} onChange={(e) => setV(e.target.value)} /> /hora
      </label>
      <Button size="sm" variant="outline" disabled={!changed} onClick={() => onSave(v.trim() === "" ? null : Number(v))}>Salvar</Button>
      {s.max_hourly_rate == null && <span className="text-[11px] text-amber-600">aguardando definição</span>}
    </div>
  );
}

function InactivationDemo({ settings, run }: { settings: any; run: (fn: () => Promise<any>, ok: string) => Promise<void> }) {
  const [pct, setPct] = useState(settings.demo_inactivation_compensation_percent == null ? "" : String(settings.demo_inactivation_compensation_percent));
  const [note, setNote] = useState(settings.demo_inactivation_compensation_note ?? "");
  const [base, setBase] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <section className={cardCls}>
      <h2 className="text-base font-semibold">Desconto por inativação — demonstrativo</h2>
      <p className="mb-3 text-xs text-slate-500">Percentual fictício só para simulação. Nunca gera crédito, estorno ou abatimento real.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">Percentual (%)<Input className="mt-1 w-24" type="number" value={pct} onChange={(e) => setPct(e.target.value)} /></label>
        <label className="text-xs">Observação<Input className="mt-1 w-72" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <Button size="sm" variant="outline" onClick={() => run(() => apiClient.updateCatalog2PricingSettings({ demo_inactivation_compensation_percent: pct === "" ? null : Number(pct), demo_inactivation_compensation_note: note || null }), "Demonstrativo salvo.")}>Salvar</Button>
        <label className="text-xs">Base (R$)<Input className="mt-1 w-28" type="number" value={base} onChange={(e) => setBase(e.target.value)} /></label>
        <Button size="sm" variant="ghost" disabled={base === ""} onClick={() => apiClient.simulateCatalog2InactivationCompensation(Number(base)).then(setResult).catch((e: any) => setResult({ error: e?.message }))}>Simular</Button>
      </div>
      {result && <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs dark:bg-slate-800">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}

export default PrecificacaoPage;

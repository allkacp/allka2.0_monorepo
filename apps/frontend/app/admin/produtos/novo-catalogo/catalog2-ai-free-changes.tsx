"use client";

// P-11 (07/10, ajustado em 14/10): alterações por IA grátis agora são definidas em cada ETAPA (campo na própria etapa,
// em Tarefas e etapas). Este card do produto é só leitura: mostra a soma e o detalhamento puxado de cada etapa.
// Depois das grátis de uma etapa, cada alteração é cobrada do saldo da carteira do cliente.
export function parseFreeChanges(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d+$/.test(t)) return { ok: false, error: "Use um número inteiro (0 ou mais)." };
  const n = Number(t);
  return n > 100 ? { ok: false, error: "O máximo é 100." } : { ok: true, value: n };
}

export interface AiFreeStageRow { id: string; task: string; step: string; value: number }

/** Etapas da versão que definem cota (campo preenchido), na ordem de tarefas e etapas. */
export function collectAiFreeStages(version: { tasks?: any[] } | null | undefined): AiFreeStageRow[] {
  const rows: AiFreeStageRow[] = [];
  const tasks = [...(version?.tasks ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const t of tasks) {
    const steps = [...(t.steps ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const s of steps) {
      if (s.ai_free_changes != null) rows.push({ id: String(s.id), task: String(t.name ?? "Tarefa"), step: String(s.name ?? "Etapa"), value: Number(s.ai_free_changes) });
    }
  }
  return rows;
}

export function AiFreeChangesCard({ version }: { version: { tasks?: any[] } | null | undefined }) {
  const rows = collectAiFreeStages(version);
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <div className="rounded-md border bg-card p-3 text-sm" data-testid="ai-free-changes">
      <p className="font-medium" title="Soma das alterações por IA grátis definidas em cada etapa. Para mudar, edite o campo na própria etapa (Tarefas e etapas). Depois das grátis, cada alteração é cobrada do saldo da carteira.">
        Alterações por IA grátis neste produto: <span className="font-bold" data-testid="ai-free-total">{rows.length === 0 ? "—" : total}</span>
      </p>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">Nenhuma etapa define alterações por IA grátis; vale a regra global (Configurações). Para definir, edite a etapa em Tarefas e etapas.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground" data-testid="ai-free-breakdown">
          {rows.map((r) => (
            <li key={r.id}><span className="font-medium text-foreground">{r.step}</span> <span>({r.task})</span>: {r.value} alteraç{r.value === 1 ? "ão" : "ões"} por IA</li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">Definido em cada etapa — aqui é só a soma e o detalhamento.</p>
    </div>
  );
}

"use client";
import { CalendarDays, ClipboardList, Clock, Database, ListChecks, UserCog, Users } from "lucide-react";

// A tarefa NÃO é editada no executor/especialidade: ela só resume o que as etapas fazem. Quem executa e qual especialidade
// são definidos em cada etapa; aqui eles são apenas somados e detalhados.
export const MODE_LABEL: Record<string, string> = { humano: "Humano", ia: "IA", hibrido: "Híbrido" };

export interface StepSummaryRow { id: string; position: number; name: string; mode: string; modeLabel: string; specialty: string | null }
export interface TaskSummary {
  rows: StepSummaryRow[];
  executorLabel: string;
  executorHelp: string;
  specialties: string[];
  specialtiesHelp: string;
  minutes: number;
}

export function summarizeTask(task: any, specialties: any[] = []): TaskSummary {
  const steps: any[] = [...(task?.steps ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const anyExplicit = steps.some((s) => s.execution_mode != null);
  const nameOfSpecialty = (id?: string | null) => (id ? specialties.find((s) => s.id === id)?.name ?? null : null);
  const rows: StepSummaryRow[] = steps.map((s, i) => {
    // Etapa sem executor próprio herda a tarefa só enquanto NENHUMA etapa define o seu (dado antigo); depois disso vale humano.
    const mode = s.execution_mode ?? (anyExplicit ? "humano" : task?.execution_mode ?? "humano");
    // Etapa "Humano ou IA": as duas especialidades (humana + IA) aparecem juntas.
    const human = nameOfSpecialty(s.specialty_id) ?? task?.specialty?.name ?? null;
    const ai = mode === "hibrido" ? nameOfSpecialty(s.ai_specialty_id) : null;
    return {
      id: String(s.id), position: i + 1, name: String(s.name ?? `Etapa ${i + 1}`), mode, modeLabel: MODE_LABEL[mode] ?? mode,
      specialty: ai ? [human, ai].filter(Boolean).join(" + ") : human,
    };
  });
  const modes = Array.from(new Set(rows.map((r) => r.mode)));
  const executorLabel = rows.length === 0 ? (MODE_LABEL[task?.execution_mode] ?? "—") : modes.length === 1 ? MODE_LABEL[modes[0]] ?? modes[0] : `Misto (${modes.map((m) => MODE_LABEL[m] ?? m).join(" + ")})`;
  const uniq = Array.from(new Set(rows.map((r) => r.specialty).filter(Boolean) as string[]));
  return {
    rows,
    executorLabel,
    executorHelp: rows.length === 0 ? "A tarefa ainda não tem etapas. Quem executa é definido em cada etapa." : rows.map((r) => `Etapa ${r.position} — ${r.name}: ${r.modeLabel}`).join("\n"),
    specialties: uniq,
    specialtiesHelp: rows.length === 0 ? "A tarefa ainda não tem etapas. A especialidade é definida em cada etapa." : rows.map((r) => `Etapa ${r.position} — ${r.name}: ${r.specialty ?? "sem especialidade"}`).join("\n"),
    minutes: steps.reduce((n, s) => n + (s.estimated_minutes ?? 0), 0),
  };
}

export interface SummaryMetric { label: string; value: string; help?: string }

// Cada indicador: ícone em quadradinho lilás + rótulo pequeno em maiúsculas + valor em negrito (formato do desenho).
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Quem executa": Users,
  "Especialidades": UserCog,
  "Etapas": ListChecks,
  "Horas das etapas": Clock,
  "Prazo pelas etapas": CalendarDays,
  "Custo total estimado": Database,
  "Questionário": ClipboardList,
};

/**
 * Resumo ÚNICO da tarefa (fica em cima, sempre visível): tudo é calculado pelas etapas cadastradas abaixo. Somente leitura.
 * metrics traz o que o editor já calcula (horas, prazo, custo…); children recebe os indicadores/avisos da tarefa.
 */
export function TaskSummaryCard({ task, specialties, metrics = [], children }: { task: any; specialties: any[]; metrics?: SummaryMetric[]; children?: React.ReactNode }) {
  const s = summarizeTask(task, specialties);
  const Item = ({ label, value, help, testId }: { label: string; value: string; help?: string; testId?: string }) => {
    const Icon = ICONS[label] ?? ListChecks;
    return (
      <div className="flex min-w-[11rem] flex-1 basis-[11rem] items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/60" data-testid="task-summary-item">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase leading-snug tracking-wide text-slate-500 dark:text-slate-400">{label}{help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}</dt>
          <dd className="whitespace-normal break-words text-[15px] font-bold leading-snug text-slate-900 dark:text-slate-100" data-testid={testId} title={value}>{value}</dd>
        </div>
      </div>
    );
  };
  return (
    <section className="w-full" data-testid="task-summary-card">
      <dl className="flex w-full flex-wrap gap-1.5 text-xs">
        <Item label="Quem executa" value={s.executorLabel} help={s.executorHelp} testId="task-summary-executor" />
        <Item label="Especialidades" value={s.specialties.length ? s.specialties.join(", ") : "sem especialidade"} help={s.specialtiesHelp} testId="task-summary-specialties" />
        {metrics.map((m) => <Item key={m.label} label={m.label} value={m.value} help={m.help} />)}
      </dl>
      {children}
    </section>
  );
}

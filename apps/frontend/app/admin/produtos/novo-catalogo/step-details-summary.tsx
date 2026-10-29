"use client";
import { useState } from "react";
import { cyclesSummary } from "./step-cycles";
import { BookOpen, CalendarDays, CalendarRange, CheckCircle2, Flag, Info, KeyRound, ListChecks, Paperclip, Play, ShieldCheck, Sparkles, Target, User } from "lucide-react";

// Ficha compacta e SOMENTE LEITURA do que está configurado numa etapa aberta (sem aparência de formulário).
// Para alterar, só pelo botão Editar da etapa.
const QUALIFIER_LABEL: Record<string, string> = { leader: "Líder", person: "Pessoa específica", leader_person: "Líder e depois a pessoa", nomad_qualifiers: "Nômades qualificadores", nomad_pool: "Nômades qualificadores" };
const EXECUTOR_LABEL: Record<string, string> = { nomad: "Nômade", leader: "Líder", internal: "Equipe interna", agency: "Agência" };
const EVIDENCE_LABEL: Record<string, string> = { arquivo: "Arquivo", link: "Link", print: "Print/imagem", texto: "Texto", video: "Vídeo", file: "Arquivo", image: "Print/imagem", text: "Texto" };

const hours = (m: number | null | undefined) => (m == null ? null : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`);

/** Explicação detalhada de cada item da ficha (aparece no ícone "i"). */
export const SUMMARY_HELP: Record<string, string> = {
  "Descrição": "O que esta etapa faz, em uma ou duas frases. Ajuda quem executa a entender o que se espera dela e a equipe a reconhecer a etapa na lista.",
  "Quem executa": "Quem recebe e faz esta etapa: Nômade (profissional da rede), Líder (líder da área), Equipe interna (só a administração; o cliente não vê) ou Agência.",
  "Visibilidade": "Etapa INTERNA: o cliente não vê nem aprova; só vê que o pedido está em execução. Se a validação interna achar um problema, a equipe pode enviar ao cliente.",
  "Qualificação": "Quem confere a entrega desta etapa antes de ela seguir: Líder, uma Pessoa específica, Líder e depois a pessoa, ou Nômades qualificadores. Etapas com IA sempre passam por qualificação.",
  "Qualificação (se humano executar)": "Na etapa 'Humano ou IA': quem confere a entrega quando um humano executa. Aqui a qualificação pode estar desligada.",
  "Qualificação (se a IA executar)": "Na etapa 'Humano ou IA': quem confere a entrega quando a IA executa. A conferência da IA é sempre obrigatória.",
  "Aprovação do cliente": "Prazo, em horas úteis, que o cliente tem para aprovar ou reprovar a entrega desta etapa. Vazio = regra padrão da plataforma.",
  "Prazo de refação": "Prazo, em horas úteis, para o executor refazer o trabalho depois que a entrega é reprovada.",
  "Aceite do executor": "Prazo, em horas, para o executor preferido aceitar a etapa. Se não aceitar a tempo, ela segue o rodízio normal.",
  "Alterações por IA grátis": "Quantas alterações por IA o cliente pode pedir nesta etapa sem pagar, em cada contratação. Depois disso, cada alteração é cobrada.",
  "Tempo da opção IA": "Tempo estimado se a etapa for feita pela IA (etapas 'Humano ou IA'). Junto com a especialidade de IA, define o custo da opção IA.",
  "Critério de conclusão": "Como saber que a etapa terminou de verdade. É o que o executor e quem qualifica usam para dizer 'está pronto'.",
  "Instruções": "Passo a passo para quem executa a etapa: o que fazer, como e com quais cuidados.",
  "Prompt da IA": "Instrução enviada à IA quando a etapa é executada por ela. Vale para a etapa do projeto e para a execução da IA.",
  "Checklist": "Lista de conferência da etapa (execução, aprovação e qualificação). Mostra quantos itens estão cadastrados.",
  "Evidências": "Tipos de prova que o executor deve anexar (arquivo, link, print, texto, vídeo). É uma orientação: indica o que mostrar ao concluir.",
  "Obrigatório comprovar": "Quando 'Sim', o executor precisa apresentar a evidência para concluir a etapa.",
  "Orientação da evidência": "Texto que explica ao executor que prova apresentar e como (ex.: 'print da campanha publicada').",
  "Acessos": "Quantos acessos (contas, ferramentas, senhas) esta etapa precisa para ser executada. Os detalhes ficam em 'Acessos necessários'.",
  "Só na 1ª execução": "A etapa acontece apenas na primeira vez que o produto é contratado pelo cliente (ex.: configuração inicial); nas renovações ela é pulada.",
  "Dispensável com o mesmo executor": "Se o mesmo profissional da execução anterior assumir de novo, esta etapa pode ser dispensada, porque ele já fez o levantamento.",
  "Ciclos": "Etapa em ciclos: a etapa dura vários períodos seguidos. Cada ciclo termina com uma entrega que o cliente aprova em prazo curto; o ciclo seguinte começa na data certa com ou sem aprovação, e reprovação vira orientação do ciclo seguinte.",
  "Etapa final": "Esta é a última etapa do fluxo: não há etapa seguinte para liberar. Quando ela for concluída (e aprovada, se exigir), a tarefa termina.",
  "Libera a próxima etapa": "Como a etapa seguinte começa quando esta termina: Automaticamente (assim que for qualificada/aprovada) ou Manualmente (alguém libera).",
};

export interface StepSummaryRow { label: string; value: string }

/** Linhas "o que está configurado" (só as que têm valor). Pura para ser testável. */
export function stepSummaryRows(step: any, opts: { isLast?: boolean } = {}): StepSummaryRow[] {
  const ops = (step?.ops ?? {}) as Record<string, any>;
  const rows: StepSummaryRow[] = [];
  const add = (label: string, value: unknown) => { const v = value == null ? "" : String(value).trim(); if (v) rows.push({ label, value: v }); };
  add("Descrição", step?.description);
  add("Quem executa", EXECUTOR_LABEL[step?.executor_kind] ?? step?.executor_kind);
  if (step?.internal_step) add("Visibilidade", "Interna — o cliente não vê nem aprova");
  const qual = step?.requires_qualification === false && !step?.requires_specialist_qualification ? "Sem qualificação" : QUALIFIER_LABEL[step?.qualifier_kind ?? "leader"] ?? "Líder";
  if (step?.execution_mode === "hibrido") {
    add("Qualificação (se humano executar)", qual);
    add("Qualificação (se a IA executar)", QUALIFIER_LABEL[ops.ai_qualifier_kind ?? "leader"] ?? "Líder");
  } else add("Qualificação", qual);
  add("Aprovação do cliente", step?.approval_hours != null ? `${step.approval_hours} h úteis` : "");
  add("Prazo de refação", step?.rework_hours != null ? `${step.rework_hours} h úteis` : "");
  add("Aceite do executor", step?.executor_accept_hours != null ? `${step.executor_accept_hours} h` : "");
  add("Alterações por IA grátis", step?.ai_free_changes);
  add("Tempo da opção IA", hours(step?.ai_estimated_minutes));
  add("Critério de conclusão", step?.completion_criteria);
  add("Instruções", ops.instructions);
  add("Prompt da IA", ops.ai_prompt);
  const checklist = Array.isArray(ops.checklist) ? ops.checklist : [];
  if (checklist.length) add("Checklist", `${checklist.length} ${checklist.length === 1 ? "item" : "itens"}`);
  const ev = Array.isArray(ops.evidence_types) ? ops.evidence_types : [];
  if (ev.length) add("Evidências", ev.map((e: string) => EVIDENCE_LABEL[e] ?? e).join(", "));
  add("Obrigatório comprovar", ops.evidence_required ? "Sim" : "");
  add("Orientação da evidência", ops.evidence_hint);
  const acc = Array.isArray(ops.access_keys) ? ops.access_keys : [];
  if (acc.length) add("Acessos", `${acc.length} ${acc.length === 1 ? "acesso" : "acessos"} necessários`);
  add("Só na 1ª execução", step?.first_execution_only ? "Sim" : "");
  if (ops.multiple_units?.deadline_extra_percent != null) add("Prazo por unidade extra", `+${ops.multiple_units.deadline_extra_percent}% no mesmo lote`);
  add("Dispensável com o mesmo executor", step?.skip_when_same_executor ? "Sim" : "");
  add("Ciclos", cyclesSummary(ops.cycles));
  // A última etapa é a FINAL: não existe próxima etapa para liberar, então a regra de liberação não se aplica.
  if (opts.isLast) add("Etapa final", "Não há próxima etapa: ao concluir (e ser aprovada), a tarefa termina.");
  else add("Libera a próxima etapa", step?.release_next_auto === false ? "Manualmente" : "Automaticamente");
  return rows;
}

// Ordem de leitura no desenho: 3 colunas, cada item com ícone em círculo, rótulo pequeno cinza e valor logo abaixo.
const ORDER = ["Descrição", "Aprovação do cliente", "Quem executa", "Prazo de refação", "Libera a próxima etapa", "Etapa final", "Qualificação", "Qualificação (se humano executar)", "Qualificação (se a IA executar)", "Critério de conclusão", "Ciclos", "Acessos"];
const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Descrição": Target,
  "Aprovação do cliente": CheckCircle2,
  "Quem executa": User,
  "Prazo de refação": CalendarDays,
  "Libera a próxima etapa": Play,
  "Etapa final": Flag,
  "Qualificação": ShieldCheck,
  "Qualificação (se humano executar)": ShieldCheck,
  "Qualificação (se a IA executar)": ShieldCheck,
  "Critério de conclusão": Flag,
  "Acessos": KeyRound,
  "Ciclos": CalendarRange,
  "Checklist": ListChecks,
  "Evidências": Paperclip,
  "Obrigatório comprovar": Paperclip,
  "Orientação da evidência": Paperclip,
  "Instruções": BookOpen,
  "Prompt da IA": Sparkles,
};
const LONG = 110;

function DetailItem({ row }: { row: StepSummaryRow }) {
  const [open, setOpen] = useState(false);
  const Icon = ICON[row.label] ?? Info;
  const long = row.value.length > LONG;
  const help = SUMMARY_HELP[row.label];
  return (
    <div className="flex min-w-0 gap-3" data-testid="step-detail-item">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p data-no-info="" className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{row.label}{help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}</p>
        <p className={`whitespace-pre-wrap break-words text-[13px] font-medium leading-snug text-slate-800 dark:text-slate-100 ${long && !open ? "line-clamp-2" : ""}`}>{row.value}</p>
        {long && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="mt-0.5 text-[12px] font-semibold text-violet-700 hover:underline dark:text-violet-300">
            {open ? "Ver menos" : <>Ver detalhes <span aria-hidden="true">→</span></>}
          </button>
        )}
      </div>
    </div>
  );
}

export function StepDetailsSummary({ step, isLast = false }: { step: any; isLast?: boolean }) {
  const raw = stepSummaryRows(step, { isLast });
  if (raw.length === 0) return null;
  const rank = (l: string) => { const i = ORDER.indexOf(l); return i < 0 ? 100 : i; };
  const rows = [...raw].sort((a, b) => rank(a.label) - rank(b.label));
  const size = Math.ceil(rows.length / 3);
  const cols = [rows.slice(0, size), rows.slice(size, size * 2), rows.slice(size * 2)].filter((c) => c.length > 0);
  return (
    <div className="grid gap-x-8 gap-y-4 px-1 py-2 md:grid-cols-3" data-testid="step-details-summary">
      {cols.map((col, ci) => (
        <div key={ci} className={`min-w-0 space-y-4 ${ci > 0 ? "md:border-l md:border-slate-200 md:pl-6 dark:md:border-slate-700" : ""}`}>
          {col.map((r) => <DetailItem key={r.label} row={r} />)}
        </div>
      ))}
    </div>
  );
}

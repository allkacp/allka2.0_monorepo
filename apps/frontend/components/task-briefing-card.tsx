"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

// Questionário respondido pelo cliente, só leitura — para quem executa a tarefa (nômade de qualquer etapa) e para o líder (A9).
export function briefingRows(data: any): { key: string; question: string; hint?: string; answer: string; links: string[] }[] {
  const questions: any[] = data?.briefing_questions ?? [];
  const answers: any[] = data?.answers ?? [];
  const byKey = new Map(answers.map((a) => [a.question_key, a]));
  const rows = questions.map((q) => {
    const a = byKey.get(q.question_key);
    return { key: String(q.question_key), question: String(q.question_text ?? q.question_key), hint: q.description ? String(q.description) : undefined, answer: a?.answer ? String(a.answer) : "", links: parseList(a?.links) };
  });
  for (const a of answers) if (!questions.some((q) => q.question_key === a.question_key)) rows.push({ key: String(a.question_key), question: String(a.question_text ?? a.question_key), hint: undefined, answer: a.answer ? String(a.answer) : "", links: parseList(a.links) });
  return rows;
}
function parseList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try { const p = JSON.parse(String(raw)); return Array.isArray(p) ? p.map(String) : []; } catch { return []; }
}

export function TaskBriefingCard({ taskId }: { taskId: string }) {
  const [rows, setRows] = useState<ReturnType<typeof briefingRows> | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let live = true;
    setRows(null); setErro(false);
    apiClient.getProjectTaskBriefing(taskId).then((d: any) => { if (live) setRows(briefingRows(d)); }).catch(() => { if (live) setErro(true); });
    return () => { live = false; };
  }, [taskId]);
  if (erro || !rows || rows.length === 0) return null;
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900" data-testid="task-briefing-card" open>
      <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-white">Questionário do cliente</summary>
      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <div key={r.key}>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{r.question}</p>
            {r.hint && <p className="text-[11px] text-slate-400">{r.hint}</p>}
            <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{r.answer || <span className="italic text-slate-400">sem resposta</span>}</p>
            {r.links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" className="block truncate text-violet-700 underline">{l}</a>)}
          </div>
        ))}
      </div>
    </details>
  );
}

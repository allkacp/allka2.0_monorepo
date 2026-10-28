"use client";
import { useEffect, useRef, useState } from "react";

// Campo de duração das etapas: o valor guardado continua sendo em HORAS (texto, como o resto do formulário), mas você digita
// na unidade que preferir — minutos ou horas — à mão, sem setinhas. Vale de 1 minuto para cima (ex.: 1 min = 0,0167 h).
type Unit = "min" | "h";
const toText = (hours: string, unit: Unit): string => {
  const n = Number(String(hours).replace(",", "."));
  if (hours === "" || !Number.isFinite(n)) return "";
  return unit === "min" ? String(Math.round(n * 60)) : String(Number(n.toFixed(4)));
};

export function DurationInput({ value, onChange, className, ariaLabel, disabled }: { value: string; onChange: (hours: string) => void; className?: string; ariaLabel?: string; disabled?: boolean }) {
  const startUnit = (): Unit => { const n = Number(String(value).replace(",", ".")); return value !== "" && Number.isFinite(n) && n > 0 && n < 1 ? "min" : "h"; };
  const [unit, setUnit] = useState<Unit>(startUnit);
  const [text, setText] = useState(() => toText(value, startUnit()));
  const last = useRef(value);
  // Mudou de fora (ex.: carregou outra etapa): reescreve o campo na unidade escolhida.
  useEffect(() => { if (value !== last.current) { last.current = value; setText(toText(value, unit)); } }, [value, unit]);
  const emit = (t: string, u: Unit) => {
    const n = Number(t.replace(",", "."));
    const hours = t.trim() === "" || !Number.isFinite(n) ? "" : u === "min" ? String(n / 60) : String(n);
    last.current = hours; onChange(hours);
  };
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <input className={className} aria-label={ariaLabel} disabled={disabled} type="text" inputMode="decimal" autoComplete="off" value={text}
        onChange={(e) => { const t = e.target.value.replace(/[^0-9.,]/g, ""); setText(t); emit(t, unit); }} />
      <select aria-label={ariaLabel ? `Unidade — ${ariaLabel}` : "Unidade da duração"} disabled={disabled} value={unit} className="h-9 shrink-0 rounded-md border border-slate-300 bg-white px-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        onChange={(e) => { const u = e.target.value as Unit; setUnit(u); setText(toText(value, u)); }}>
        <option value="min">min</option><option value="h">horas</option>
      </select>
    </span>
  );
}

// ── Prazo em HORAS ÚTEIS inteiras (aprovação do cliente, refação, aceite) ────────────────────────────────────────────
// Você digita em minutos, horas ou dias úteis; o sistema guarda sempre em horas úteis INTEIRAS (minutos sobem para a hora cheia; 1 dia útil =
// expediente do calendário da plataforma) e a tradução aparece embaixo do campo.
type BUnit = "min" | "h" | "d";
const unitKeyOf = (k?: string) => `allka:bh-unit:${k ?? "x"}`;
const readUnit = (k?: string): BUnit => { try { const u = window.localStorage.getItem(unitKeyOf(k)); return u === "min" || u === "d" ? u : "h"; } catch { return "h"; } };
const fmtNum = (n: number) => String(Number(n.toFixed(2))).replace(".", ",");

export function BusinessHoursInput({ value, onChange, ariaLabel, unitKey, hoursPerDay = 8, placeholder, className, title }: {
  value: string; onChange: (hours: string) => void; ariaLabel: string; unitKey?: string; hoursPerDay?: number; placeholder?: string; className?: string; title?: string;
}) {
  const perDay = hoursPerDay > 0 ? hoursPerDay : 8;
  const [unit, setUnit] = useState<BUnit>(() => readUnit(unitKey));
  const toText = (hours: string, u: BUnit) => {
    const n = Number(String(hours).replace(",", "."));
    if (hours === "" || !Number.isFinite(n)) return "";
    return u === "min" ? String(Math.round(n * 60)) : u === "d" ? String(Number((n / perDay).toFixed(2))) : String(n);
  };
  const [text, setText] = useState(() => toText(value, readUnit(unitKey)));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setText(toText(value, unit)); } }, [value, unit]); // eslint-disable-line react-hooks/exhaustive-deps
  const toHours = (t: string, u: BUnit): string => {
    const n = Number(t.replace(",", "."));
    if (t.trim() === "" || !Number.isFinite(n) || n <= 0) return t.trim() === "" ? "" : "0";
    const h = u === "min" ? n / 60 : u === "d" ? n * perDay : n;
    return String(u === "h" ? n : Math.max(1, Math.ceil(h - 1e-9)));
  };
  const emit = (t: string, u: BUnit) => { const h = toHours(t, u); last.current = h; onChange(h); };
  const typed = Number(text.replace(",", "."));
  const hours = Number(value);
  let note = "";
  if (text.trim() !== "" && Number.isFinite(typed) && typed > 0 && Number.isFinite(hours) && hours > 0) {
    const days = hours / perDay;
    const dias = (n: number) => `${fmtNum(n)} ${n === 1 ? "dia útil" : "dias úteis"}`;
    const horas = (n: number) => `${n} ${n === 1 ? "h útil" : "h úteis"}`;
    if (unit === "min") note = `${fmtNum(typed)} min = ${horas(hours)}${typed !== hours * 60 ? " (sobe para a hora cheia)" : ""}`;
    else if (unit === "d") note = `${dias(typed)} = ${horas(hours)} (${fmtNum(perDay)} h por dia)`;
    else note = `= ${dias(days)} (${fmtNum(perDay)} h por dia)`; // sempre traduz para dias úteis, mesmo abaixo de 1 dia
  }
  return (
    <span className="block min-w-0">
      <span className="flex min-w-0 items-center gap-1.5">
        <input className={className} aria-label={ariaLabel} title={title} type="text" inputMode="decimal" autoComplete="off" placeholder={placeholder} value={text}
          onChange={(e) => { const t = e.target.value.replace(/[^0-9.,]/g, ""); setText(t); emit(t, unit); }} />
        <select aria-label={`Unidade — ${ariaLabel}`} value={unit} className="h-9 shrink-0 rounded-md border border-slate-300 bg-white px-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          onChange={(e) => { const u = e.target.value as BUnit; setUnit(u); try { window.localStorage.setItem(unitKeyOf(unitKey), u); } catch { /* só nesta tela */ } setText(toText(value, u)); }}>
          <option value="min">min</option><option value="h">horas</option><option value="d">dias</option>
        </select>
      </span>
      {note && <span className="mt-0.5 block text-[10px] text-violet-700 dark:text-violet-300" data-testid="business-hours-note">{note}</span>}
    </span>
  );
}

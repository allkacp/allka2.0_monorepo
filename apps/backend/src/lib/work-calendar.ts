// Calendário de trabalho da plataforma (reunião 2026-10-05, B2): dias úteis, expediente e feriados — configurados UMA vez nas
// configurações gerais, nunca em cada produto. Todos os prazos em horas/dias úteis (SLA) usam este calendário.
// Padrão (sem nada cadastrado) = o que sempre valeu: segunda a sexta, 09:00–17:00, sem feriados.
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface BusinessCalendar {
  /** minutos desde 00:00 em que o expediente começa/termina */
  startMin: number;
  endMin: number;
  /** 0 = domingo … 6 = sábado */
  workDays: number[];
  /** "YYYY-MM-DD" */
  holidays: string[];
}

export const DEFAULT_CALENDAR: BusinessCalendar = { startMin: 9 * 60, endMin: 17 * 60, workDays: [1, 2, 3, 4, 5], holidays: [] };

let current: BusinessCalendar = DEFAULT_CALENDAR;
let loadedAt = 0;
const TTL_MS = 30_000;

export const getBusinessCalendar = (): BusinessCalendar => current;
export function setBusinessCalendar(c: BusinessCalendar | null) { current = c ?? DEFAULT_CALENDAR; loadedAt = Date.now(); }
export function invalidateBusinessCalendar() { loadedAt = 0; }
export const businessMinutesPerDay = (c: BusinessCalendar = current) => Math.max(1, c.endMin - c.startMin);

export function parseTime(v: string | null | undefined, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v ?? "").trim());
  if (!m) return fallback;
  const h = Number(m[1]), min = Number(m[2]);
  return h >= 0 && h <= 24 && min >= 0 && min < 60 ? h * 60 + min : fallback;
}
export const fmtTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
export function parseWorkDays(v: string | null | undefined): number[] {
  const d = [...new Set((v ?? "").split(",").map((x) => x.trim()).filter((x) => x !== "").map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
  return d.length ? d : DEFAULT_CALENDAR.workDays;
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** O dia não é útil: fora dos dias de trabalho ou feriado. */
export function isNonWorkday(d: Date, c: BusinessCalendar = current): boolean {
  return !c.workDays.includes(d.getDay()) || c.holidays.includes(ymd(d));
}
export function validateCalendarInput(i: { work_days: number[]; start_time: string; end_time: string }): string | null {
  if (!i.work_days.length) return "Escolha ao menos um dia útil.";
  const s = parseTime(i.start_time, -1), e = parseTime(i.end_time, -1);
  if (s < 0 || e < 0) return "Horários inválidos (use HH:MM).";
  if (e - s < 60) return "O expediente precisa ter pelo menos 1 hora.";
  if (e > 24 * 60) return "O expediente termina no máximo às 24:00.";
  return null;
}

/** Lê o calendário do banco (com cache curto) e o deixa disponível para a aritmética de prazos. */
export async function ensureWorkCalendar(db: Db, force = false): Promise<BusinessCalendar> {
  if (!force && Date.now() - loadedAt < TTL_MS) return current;
  try {
    const [cfg, holidays] = await Promise.all([
      db.platformWorkCalendar.findUnique({ where: { id: "default" } }),
      db.platformHoliday.findMany({ where: { is_active: true }, select: { date: true } }),
    ]);
    current = cfg
      ? { startMin: parseTime(cfg.start_time, DEFAULT_CALENDAR.startMin), endMin: parseTime(cfg.end_time, DEFAULT_CALENDAR.endMin), workDays: parseWorkDays(cfg.work_days), holidays: holidays.map((h) => h.date) }
      : { ...DEFAULT_CALENDAR, holidays: holidays.map((h) => h.date) };
  } catch {
    current = DEFAULT_CALENDAR;
  }
  loadedAt = Date.now();
  return current;
}

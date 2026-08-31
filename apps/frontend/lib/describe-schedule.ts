/**
 * describeSchedule — traduz os campos crus de uma Alerta Programado
 * (recurrence_type/weekdays/time_of_day/ends_at/occurrence_expires_minutes)
 * em frases em português simples, do jeito que a ata 2026-08 (4º lote) pediu
 * explicitamente: NUNCA cron, NUNCA um dump de campos. Exemplos verbatim da
 * ata: "Todos os dias às 09:00"; "Segunda e sexta às 14:30"; "Uma vez em
 * 30/08/2026 às 10:00"; "Termina em 31/12/2026"; "Cada alerta expira após
 * 8 horas".
 *
 * Função pura — sem I/O, sem Date.now() implícito — pra ser fácil de testar
 * isoladamente e de reaproveitar tanto na listagem quanto no formulário.
 */

export interface ScheduleDescriptionInput {
  recurrence_type: "once" | "daily" | "weekly";
  weekdays: number[]; // 0=domingo..6=sábado
  time_of_day: string; // "HH:MM"
  starts_at: string; // ISO — usado só pra recorrência "once"
  ends_at: string | null;
  occurrence_expires_minutes: number | null;
  /** IANA (ex.: "America/Sao_Paulo") — necessário pra exibir a DATA de
   * `starts_at`/`ends_at` corretamente: são instantes UTC, e um horário
   * local à noite pode cair no dia seguinte em UTC. Sem isso a data exibida
   * fica errada pra qualquer programação depois de ~21h (varia com o
   * offset). Opcional só por compatibilidade com testes antigos — cai pra
   * UTC puro (comportamento anterior) se omitido. */
  timezone?: string;
}

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Ordena domingo..sábado (0..6) e junta com "e" antes do último, vírgula
// entre os demais — "Segunda, quarta e sexta às 14:30".
function joinWeekdays(weekdays: number[]): string {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  const names = sorted.map((d) => WEEKDAY_NAMES[d]).filter((n): n is string => !!n);
  // Só o primeiro nome fica capitalizado (início de frase) — os demais em
  // minúsculo, igual ao exemplo verbatim da ata ("Segunda e sexta às
  // 14:30", nunca "Segunda e Sexta").
  const lowered = names.map((n, i) => (i === 0 ? n : n.toLowerCase()));
  if (lowered.length === 0) return "";
  if (lowered.length === 1) return lowered[0]!;
  if (lowered.length === 2) return `${lowered[0]} e ${lowered[1]}`;
  return `${lowered.slice(0, -1).join(", ")} e ${lowered[lowered.length - 1]}`;
}

function formatBrDate(isoDateTime: string, timeZone?: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;
  if (!timeZone) {
    // Sem timezone informado: só recorta a data UTC (comportamento anterior,
    // usado pelos testes que passam datas "puras" sem hora relevante).
    const [y, m, d] = isoDateTime.slice(0, 10).split("-");
    return y && m && d ? `${d}/${m}/${y}` : isoDateTime;
  }
  // `starts_at`/`ends_at` são instantes UTC — o "dia calendário" correto é o
  // do timezone da programação, nunca o de UTC puro (um horário à noite no
  // Brasil já pode ser o dia seguinte em UTC).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => { if (p.type !== "literal") acc[p.type] = p.value; return acc; }, {});
  return `${parts.day}/${parts.month}/${parts.year}`;
}

/** Frase principal — o "quando" da recorrência. */
export function describeRecurrence(schedule: ScheduleDescriptionInput): string {
  const time = schedule.time_of_day;
  switch (schedule.recurrence_type) {
    case "daily":
      return `Todos os dias às ${time}`;
    case "weekly": {
      const days = joinWeekdays(schedule.weekdays);
      return days ? `${days} às ${time}` : `Semanalmente às ${time}`;
    }
    case "once":
    default:
      return `Uma vez em ${formatBrDate(schedule.starts_at, schedule.timezone)} às ${time}`;
  }
}

/** Frase de término da recorrência, ou null quando não há data final (nunca "once"). */
export function describeEnd(schedule: ScheduleDescriptionInput): string | null {
  if (schedule.recurrence_type === "once") return null;
  if (!schedule.ends_at) return null;
  return `Termina em ${formatBrDate(schedule.ends_at, schedule.timezone)}`;
}

/** Frase de expiração de cada ocorrência gerada, ou null quando não configurada. */
export function describeExpiration(schedule: ScheduleDescriptionInput): string | null {
  const minutes = schedule.occurrence_expires_minutes;
  if (!minutes || minutes <= 0) return null;
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `Cada alerta expira após ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Cada alerta expira após ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
  return `Cada alerta expira após ${minutes} minutos`;
}

/** Todas as linhas de descrição prontas pra exibir (a chamadora decide o layout). */
export function describeSchedule(schedule: ScheduleDescriptionInput): string[] {
  const lines = [describeRecurrence(schedule)];
  const end = describeEnd(schedule);
  if (end) lines.push(end);
  const expiration = describeExpiration(schedule);
  if (expiration) lines.push(expiration);
  return lines;
}

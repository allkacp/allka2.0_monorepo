/**
 * timezone.ts — cálculo de horário zonado (IANA) sem dependência nova (ata
 * 2026-08, 4º lote: Alertas Programados). Auditado antes de implementar:
 * este backend não tem date-fns-tz/luxon/dayjs — só `Intl`, já embutido no
 * Node. As funções aqui usam a técnica padrão de resolver o instante UTC de
 * um horário de parede numa timezone via `Intl.DateTimeFormat`, sem
 * depender do fuso do servidor.
 */

/** Converte ano/mês/dia/hora/minuto LOCAIS (na timezone dada) pro instante UTC correspondente. */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // 1ª aproximação: trata o horário de parede como se já fosse UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = getTimeZoneOffsetMs(guess, timeZone);
  // O offset diz "quanto a timezone está à frente/atrás de UTC nesse
  // instante" — subtrai pra achar o instante UTC real do horário de parede.
  return new Date(guess.getTime() - offsetMs);
}

/** Offset (ms) de `timeZone` em relação a UTC, no instante `date`. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0 (domingo) a 6 (sábado), igual Date.getDay(). */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Lê data/hora/dia-da-semana LOCAIS (na timezone dada) de um instante UTC. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === "24" ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidTimeOfDay(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

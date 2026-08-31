import { describe, expect, it } from "vitest";
import { describeSchedule, type ScheduleDescriptionInput } from "@/lib/describe-schedule";

// describeSchedule (ata 2026-08, 4º lote) — precisa SEMPRE devolver
// português simples, nunca cron/dump de campo. Casos abaixo são os
// exemplos verbatim pedidos na ata.

function base(overrides: Partial<ScheduleDescriptionInput> = {}): ScheduleDescriptionInput {
  return {
    recurrence_type: "daily",
    weekdays: [],
    time_of_day: "09:00",
    starts_at: "2026-08-30T12:00:00.000Z",
    ends_at: null,
    occurrence_expires_minutes: null,
    ...overrides,
  };
}

describe("describeSchedule", () => {
  it("diária: 'Todos os dias às 09:00'", () => {
    expect(describeSchedule(base())).toEqual(["Todos os dias às 09:00"]);
  });

  it("semanal com dias específicos: 'Segunda e sexta às 14:30'", () => {
    const lines = describeSchedule(base({ recurrence_type: "weekly", weekdays: [1, 5], time_of_day: "14:30" }));
    expect(lines[0]).toBe("Segunda e sexta às 14:30");
  });

  it("semanal com três dias usa vírgula + 'e' antes do último", () => {
    const lines = describeSchedule(base({ recurrence_type: "weekly", weekdays: [1, 3, 5], time_of_day: "08:00" }));
    expect(lines[0]).toBe("Segunda, quarta e sexta às 08:00");
  });

  it("única: 'Uma vez em 30/08/2026 às 10:00'", () => {
    const lines = describeSchedule(base({ recurrence_type: "once", time_of_day: "10:00", starts_at: "2026-08-30T10:00:00.000Z" }));
    expect(lines[0]).toBe("Uma vez em 30/08/2026 às 10:00");
  });

  it("única à noite: usa a data do TIMEZONE da programação, não a data UTC (que já seria o dia seguinte)", () => {
    // 22:00 em America/Sao_Paulo (UTC-3) em 2026-08-30 vira 2026-08-31T01:00:00.000Z —
    // sem converter de volta pro timezone, a data exibida ficaria errada (31/08 em vez de 30/08).
    const lines = describeSchedule(
      base({
        recurrence_type: "once",
        time_of_day: "22:00",
        starts_at: "2026-08-31T01:00:00.000Z",
        timezone: "America/Sao_Paulo",
      }),
    );
    expect(lines[0]).toBe("Uma vez em 30/08/2026 às 22:00");
  });

  it("com data final: adiciona 'Termina em 31/12/2026'", () => {
    const lines = describeSchedule(base({ ends_at: "2026-12-31T23:59:00.000Z" }));
    expect(lines).toContain("Termina em 31/12/2026");
  });

  it("sem data final: não adiciona linha de término", () => {
    const lines = describeSchedule(base({ ends_at: null }));
    expect(lines.some((l) => l.startsWith("Termina em"))).toBe(false);
  });

  it("recorrência 'once' nunca mostra linha de término mesmo com ends_at presente", () => {
    const lines = describeSchedule(base({ recurrence_type: "once", ends_at: "2026-12-31T23:59:00.000Z" }));
    expect(lines.some((l) => l.startsWith("Termina em"))).toBe(false);
  });

  it("com expiração em horas: 'Cada alerta expira após 8 horas'", () => {
    const lines = describeSchedule(base({ occurrence_expires_minutes: 480 }));
    expect(lines).toContain("Cada alerta expira após 8 horas");
  });

  it("com expiração em dias: 'Cada alerta expira após 2 dias'", () => {
    const lines = describeSchedule(base({ occurrence_expires_minutes: 2880 }));
    expect(lines).toContain("Cada alerta expira após 2 dias");
  });

  it("com expiração em minutos não redondos: 'Cada alerta expira após 90 minutos'", () => {
    const lines = describeSchedule(base({ occurrence_expires_minutes: 90 }));
    expect(lines).toContain("Cada alerta expira após 90 minutos");
  });

  it("sem expiração configurada: não adiciona linha", () => {
    const lines = describeSchedule(base({ occurrence_expires_minutes: null }));
    expect(lines.some((l) => l.startsWith("Cada alerta expira"))).toBe(false);
  });

  it("nunca retorna cron nem dump de campos — cada linha é texto legível", () => {
    const lines = describeSchedule(
      base({ recurrence_type: "weekly", weekdays: [0, 6], time_of_day: "07:15", ends_at: "2026-11-01T23:59:00.000Z", occurrence_expires_minutes: 60 }),
    );
    for (const line of lines) {
      // Sem asterisco de cron (datas legitimamente usam "/" em DD/MM/AAAA,
      // então só o "*" é indício de sintaxe de cron vazada).
      expect(line).not.toMatch(/\*/);
      expect(line).not.toMatch(/recurrence_type|weekdays|occurrence_expires_minutes/);
    }
    expect(lines[0]).toBe("Domingo e sábado às 07:15");
  });
});

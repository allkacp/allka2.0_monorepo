import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPerformance, summarizeStages, type StageRow } from "./step-performance";

const H = 3600000;
const t0 = new Date("2026-10-01T10:00:00Z");
const row = (o: Partial<StageRow> & { hours?: number; late?: number }): StageRow => ({
  status: "CONCLUIDA", executor_type: "nomad", horas_execucao: 2, valor_nomade: 100, rodada_ajuste: 0, config_snapshot: JSON.stringify({ execution_mode: "humano" }),
  iniciada_em: t0, concluida_em: new Date(t0.getTime() + (o.hours ?? 2) * H), prazo_execucao: new Date(t0.getTime() + (2 + (o.late ? 0 : 1)) * H - (o.late ?? 0) * 0), ...o,
} as StageRow);

describe("Histórico real da etapa", () => {
  it("SP01. etapa nova (sem execuções) não inventa nada", () => {
    const r = buildPerformance([]);
    assert.equal(r.total, 0);
    assert.equal(r.avg_actual_hours, null);
    assert.deepEqual(r.signals, ["Ainda não há execuções concluídas desta etapa."]);
  });

  it("SP02. tempo real x estimado, prazo, refação e custo", () => {
    const rows = [row({ hours: 3 }), row({ hours: 3, rodada_ajuste: 1 }), row({ hours: 3 }), row({ hours: 6, prazo_execucao: new Date(t0.getTime() + 4 * H), rodada_ajuste: 2 })];
    const s = summarizeStages(rows);
    assert.equal(s.concluidas, 4);
    assert.equal(s.avg_actual_hours, 3.75);
    assert.equal(s.avg_estimated_hours, 2);
    assert.equal(s.actual_vs_estimated, 1.88);
    assert.equal(s.late_count, 1, "só a de 6 h passou do prazo de 4 h");
    assert.equal(s.on_time_rate, 0.75);
    assert.equal(s.avg_delay_hours, 2);
    assert.equal(s.rework_rate, 0.5);
    assert.equal(s.avg_cost, 100);
    const sig = buildPerformance(rows).signals.join(" | ");
    assert.match(sig, /a MAIS que o estimado/);
    assert.match(sig, /ajuste\/refação/);
  });

  it("SP03. separa por humano / IA / híbrido e por executor; etapa em andamento só conta como em andamento", () => {
    const rows = [row({}), row({ config_snapshot: JSON.stringify({ execution_mode: "ia" }), hours: 1 }), row({ config_snapshot: JSON.stringify({ execution_mode: "hibrido" }), executor_type: "leader" }), row({ status: "EM_ANDAMENTO", concluida_em: null })];
    const r = buildPerformance(rows);
    assert.deepEqual(Object.keys(r.by_execution).sort(), ["hibrido", "humano", "ia"]);
    assert.equal(r.by_execution.ia.avg_actual_hours, 1);
    assert.equal(r.by_executor.leader.concluidas, 1);
    assert.equal(r.em_andamento, 1);
    assert.equal(r.concluidas, 3);
  });
});

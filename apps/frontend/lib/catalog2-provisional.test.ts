import { describe, expect, it } from "vitest";
import {
  provisionalThumbnail,
  provisionalPrice,
  provisionalDeadlineDays,
  provisionalTaskCount,
  provisionalStepCount,
  provisionalMerchandising,
} from "./catalog2-provisional";

// Reparo 2026-09 ("Cadastro/Catálogo visualmente completos com dados
// provisórios identificados"): cada função precisa ser determinística (o
// mesmo produto não pode mudar de preço/prazo/imagem depois de um F5, já
// que nada é persistido — o valor nasce do próprio id do produto) e sempre
// marcada como provisória, nunca confundível com dado real.

describe("Camada de dados provisórios (catalog2) — determinismo e marcação", () => {
  it("o mesmo id sempre produz o mesmo preço, prazo, tarefas, etapas e miniatura (equivalente a sobreviver a um F5)", () => {
    const id = "prod-estavel-123";
    expect(provisionalPrice(id).value).toBe(provisionalPrice(id).value);
    expect(provisionalDeadlineDays(id).value).toBe(provisionalDeadlineDays(id).value);
    expect(provisionalTaskCount(id).value).toBe(provisionalTaskCount(id).value);
    expect(provisionalThumbnail(id).value).toEqual(provisionalThumbnail(id).value);

    // roda de novo, simulando uma nova sessão/mount — mesmo resultado.
    const again = provisionalPrice(id);
    expect(again.value).toBe(provisionalPrice(id).value);
  });

  it("ids diferentes tendem a produzir valores diferentes (não é uma constante disfarçada)", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `produto-${i}`);
    const prices = new Set(ids.map((id) => provisionalPrice(id).value));
    // não exige que todos sejam únicos (hash pode colidir), só que não é
    // sempre o MESMO valor pra todo mundo.
    expect(prices.size).toBeGreaterThan(1);
  });

  it("todo valor provisório vem marcado com is_provisional:true e um rótulo explicativo — nunca some sem marcação", () => {
    const id = "prod-marcado";
    expect(provisionalPrice(id).is_provisional).toBe(true);
    expect(provisionalPrice(id).label).toMatch(/provisório/i);
    expect(provisionalDeadlineDays(id).is_provisional).toBe(true);
    expect(provisionalDeadlineDays(id).label).toMatch(/provisório/i);
    expect(provisionalTaskCount(id).is_provisional).toBe(true);
    expect(provisionalThumbnail(id).is_provisional).toBe(true);
    expect(provisionalThumbnail(id).label).toMatch(/provisória/i);
  });

  it("preço provisório nunca é zero/negativo e fica numa faixa comercialmente plausível (nunca óbvio como 'fake' demais, nunca extremo)", () => {
    for (let i = 0; i < 30; i++) {
      const p = provisionalPrice(`produto-faixa-${i}`).value;
      expect(p).toBeGreaterThanOrEqual(300);
      expect(p).toBeLessThanOrEqual(4800);
    }
  });

  it("etapas provisórias nunca ficam abaixo da quantidade de tarefas provisórias (coerência estrutural mínima)", () => {
    for (let i = 0; i < 20; i++) {
      const id = `produto-estrutura-${i}`;
      const tasks = provisionalTaskCount(id).value;
      const steps = provisionalStepCount(id, tasks).value;
      expect(steps).toBeGreaterThanOrEqual(tasks);
    }
  });

  it("miniatura provisória nunca é uma foto — só ícone + gradiente de uma paleta fixa", () => {
    const { value } = provisionalThumbnail("prod-img");
    expect(value.gradient).toMatch(/^from-.+ to-.+$/);
    expect(typeof value.iconKey).toBe("string");
  });

  it("badge comercial provisório: determinístico, sempre marcado, e nem todo produto recebe um", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `produto-merch-${i}`);
    const kinds = ids.map((id) => provisionalMerchandising(id).value);
    expect(kinds.some((k) => k === null)).toBe(true); // ~40% sem badge
    expect(kinds.some((k) => k !== null)).toBe(true); // ~60% com algum badge
    for (const id of ids) {
      const first = provisionalMerchandising(id);
      expect(provisionalMerchandising(id).value).toEqual(first.value); // determinístico
      expect(first.is_provisional).toBe(true);
    }
  });
});

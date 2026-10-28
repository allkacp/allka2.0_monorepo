import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// "Melhorar com IA": o texto nunca é cortado em silêncio e o usuário escolhe as fontes (banco interno / internet).
const src = readFileSync(path.join(__dirname, "product-editor.tsx"), "utf8");

describe("Botão de IA dos campos do produto", () => {
  it("não corta o texto da IA na tela (antes a descrição era cortada em 2000 caracteres, embora o campo aceite 4000)", () => {
    expect(src).not.toMatch(/full_description: v\.slice\(0, 2000\)/);
    expect(src).not.toMatch(/onResult=\{\(v\) => updateInfo\(\{ (title|summary|full_description): [^}]*\.slice\(/);
    expect(src).toMatch(/fieldMaxChars=\{4000\} onResult=\{\(v\) => updateInfo\(\{ full_description: v \}\)\}/);
  });
  it("manda o limite do próprio campo e as fontes escolhidas para o servidor", () => {
    expect(src).toMatch(/use_internal_bank: useInternal, field_max_chars: fieldMaxChars/);
    expect(src).toMatch(/aria-label="Usar o banco interno de IA"/);
    expect(src).toMatch(/aria-label="Pesquisar na internet"/);
  });
  it("mostra avisos do servidor (ex.: texto acima do limite) em vez de esconder", () => {
    expect(src).toMatch(/data-testid="ai-field-notes"/);
  });
});

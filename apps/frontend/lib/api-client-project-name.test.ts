import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";

afterEach(() => vi.unstubAllGlobals());
describe("Verificação do nome de projeto: contrato real da API", () => {
  it.each([true, false])("normaliza exists=%s para duplicate", async exists => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ exists }), { status: 200, headers: { "content-type": "application/json" } })));
    expect(await apiClient.checkProjectName({ title: "Nome do projeto" })).toEqual({ duplicate: exists, conflictId: undefined });
  });
});

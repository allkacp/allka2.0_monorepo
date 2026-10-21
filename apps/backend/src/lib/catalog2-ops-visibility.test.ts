import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canSee, expandVisibility, isValidVisibilityValue, normalizeVisibilityValue, normalizeTaskOps, type Visibility } from "./catalog2-ops";

const ALL: Visibility[] = ["internal", "leader", "executor", "agency", "client"];
const who = (v: string) => ALL.filter((p) => canSee(p, v));

// R21-13 (reunião 21/10): "Quem pode ver" por campo = lista de perfis marcados; o nível antigo (hierárquico) continua valendo.
describe("visibilidade dos campos operacionais: lista de perfis", () => {
  it("nível antigo continua hierárquico (agency = admin + líder + executor + agência)", () => {
    assert.deepEqual(who("internal"), ["internal"]);
    assert.deepEqual(who("leader"), ["internal", "leader"]);
    assert.deepEqual(who("executor"), ["internal", "leader", "executor"]);
    assert.deepEqual(who("agency"), ["internal", "leader", "executor", "agency"]);
    assert.deepEqual(who("client"), ALL);
  });

  it("lista de perfis: só quem foi marcado vê; administração sempre vê", () => {
    assert.deepEqual(who("client,executor"), ["internal", "executor", "client"].sort((a, b) => ALL.indexOf(a as Visibility) - ALL.indexOf(b as Visibility)));
    assert.deepEqual(who("agency,client"), ["internal", "agency", "client"]);
    assert.deepEqual(who("leader"), ["internal", "leader"]);
    assert.equal(canSee("client", "executor,agency"), false);
  });

  it("validação e normalização: lista exatamente 'até um nível' volta ao nível; senão fica a lista ordenada", () => {
    assert.equal(isValidVisibilityValue("client,agency"), true);
    assert.equal(isValidVisibilityValue("client,ninguem"), false);
    assert.equal(isValidVisibilityValue(""), false);
    assert.equal(isValidVisibilityValue("agency,agency"), false);
    assert.equal(normalizeVisibilityValue("internal,leader,executor,agency,client"), "client");
    assert.equal(normalizeVisibilityValue("leader,internal"), "leader");
    assert.equal(normalizeVisibilityValue("client,leader"), "internal,leader,client");
    assert.deepEqual([...expandVisibility("agency,client")].sort(), ["agency", "client", "internal"]);
  });

  it("o cadastro da tarefa guarda a visibilidade em lista e ignora valor inválido", () => {
    const ops = normalizeTaskOps({ objective: "Meta", instructions: "Passos", visibility: { objective: "client,executor", instructions: "invalido" } });
    assert.equal(ops?.visibility?.objective, "internal,executor,client");
    assert.equal(ops?.visibility?.instructions, undefined);
  });
});

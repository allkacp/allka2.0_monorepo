import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertCutoverSimulationAllowed, CutoverEnvironmentNotAllowed } from "./environment-guard";

function envWith(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: "mysql://allka:allka_dev@localhost:3306/allka",
    CUTOVER_SIM_ENVIRONMENT: "local",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("assertCutoverSimulationAllowed", () => {
  it("allows 'local' with a normal dev DATABASE_URL", () => {
    assert.equal(assertCutoverSimulationAllowed(envWith({ CUTOVER_SIM_ENVIRONMENT: "local" })), "local");
  });

  it("allows 'qa' with a qa-looking DATABASE_URL", () => {
    assert.equal(
      assertCutoverSimulationAllowed(
        envWith({ CUTOVER_SIM_ENVIRONMENT: "qa", DATABASE_URL: "mysql://allka:pw@qa-host:3306/allka" }),
      ),
      "qa",
    );
  });

  it("throws when CUTOVER_SIM_ENVIRONMENT is missing", () => {
    const env = envWith({});
    delete (env as Record<string, unknown>).CUTOVER_SIM_ENVIRONMENT;
    assert.throws(() => assertCutoverSimulationAllowed(env), CutoverEnvironmentNotAllowed);
    assert.throws(() => assertCutoverSimulationAllowed(env), /obrigatório/i);
  });

  it("throws when CUTOVER_SIM_ENVIRONMENT is 'production'", () => {
    assert.throws(
      () => assertCutoverSimulationAllowed(envWith({ CUTOVER_SIM_ENVIRONMENT: "production" })),
      /não é permitido/i,
    );
  });

  it("throws for any unknown environment value", () => {
    assert.throws(() => assertCutoverSimulationAllowed(envWith({ CUTOVER_SIM_ENVIRONMENT: "staging" })));
  });

  it("throws when DATABASE_URL is missing even with a valid environment", () => {
    const env = envWith({});
    delete (env as Record<string, unknown>).DATABASE_URL;
    assert.throws(() => assertCutoverSimulationAllowed(env), /DATABASE_URL é obrigatório/);
  });

  it("throws when DATABASE_URL looks like production, even if the env var says qa (defense in depth)", () => {
    assert.throws(
      () =>
        assertCutoverSimulationAllowed(
          envWith({ CUTOVER_SIM_ENVIRONMENT: "qa", DATABASE_URL: "mysql://allka:pw@host:3306/allka_producao" }),
        ),
      /produção/i,
    );
  });

  it("redacts the password in the error message for a production-looking URL", () => {
    try {
      assertCutoverSimulationAllowed(
        envWith({ DATABASE_URL: "mysql://allka:supersecret@host:3306/allka_production" }),
      );
      assert.fail("should have thrown");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      assert.doesNotMatch(message, /supersecret/);
    }
  });
});

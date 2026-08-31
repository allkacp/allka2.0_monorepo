import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";

// Preparação pré-deploy QA — garantias do seed:qa-demo: recusa produção,
// é idempotente, e --remove apaga só a fixture (nunca uma busca ampla).
// Roda o script como PROCESSO FILHO de verdade (não importa a função) para
// também comprovar as barreiras de ambiente exatamente como um operador
// real dispararia — `npm run seed:qa-demo` na prática.

const backendRoot = path.resolve(__dirname, "..", "..");
const scriptPath = path.resolve(backendRoot, "src", "scripts", "seed-qa-demo.ts");

function run(args: string[], env: NodeJS.ProcessEnv): { status: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", scriptPath, ...args],
      { cwd: backendRoot, env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { status: 0, output };
  } catch (e: any) {
    return { status: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("seed:qa-demo — garantias de segurança e idempotência", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
  });

  after(async () => {
    run(["--remove"], { SEED_QA_ENVIRONMENT: "local" });
  });

  it("recusa sem SEED_QA_ENVIRONMENT", () => {
    const r = run([], { SEED_QA_ENVIRONMENT: "" });
    assert.notEqual(r.status, 0);
    assert.match(r.output, /SEED_QA_ENVIRONMENT/);
  });

  it("recusa com SEED_QA_ENVIRONMENT=production", () => {
    const r = run([], { SEED_QA_ENVIRONMENT: "production", SEED_QA_PASSWORD: "x" });
    assert.notEqual(r.status, 0);
    assert.match(r.output, /SEED_QA_ENVIRONMENT/);
  });

  it("recusa sem SEED_QA_PASSWORD", () => {
    const r = run([], { SEED_QA_ENVIRONMENT: "local" });
    assert.notEqual(r.status, 0);
    assert.match(r.output, /SEED_QA_PASSWORD/);
  });

  it("nunca imprime a senha no output", () => {
    const secret = "SenhaBemEspecificaDeTeste987";
    const r = run([], { SEED_QA_ENVIRONMENT: "local", SEED_QA_PASSWORD: secret });
    assert.equal(r.status, 0, r.output);
    assert.ok(!r.output.includes(secret), "a senha não pode aparecer no console");
  });

  it("é idempotente — rodar duas vezes não duplica nada, e --remove some com tudo (162 operacionais intactos)", async () => {
    const productsBefore = await prisma.product.count();

    const r1 = run([], { SEED_QA_ENVIRONMENT: "local", SEED_QA_PASSWORD: "Teste123" });
    assert.equal(r1.status, 0, r1.output);
    const usersAfterFirst = await prisma.user.count({ where: { email: { endsWith: "@allka-qa.test" } } });
    assert.equal(usersAfterFirst, 7);
    const projectsAfterFirst = await prisma.project.count({ where: { catalog2_checkout_client_action_id: "qa-demo-checkout" } });
    assert.equal(projectsAfterFirst, 1);
    const changeOrdersAfterFirst = await prisma.catalog2ChangeOrder.count();

    const r2 = run([], { SEED_QA_ENVIRONMENT: "local", SEED_QA_PASSWORD: "Teste123" });
    assert.equal(r2.status, 0, r2.output);
    const usersAfterSecond = await prisma.user.count({ where: { email: { endsWith: "@allka-qa.test" } } });
    assert.equal(usersAfterSecond, 7, "rodar de novo não duplicou usuários");
    const projectsAfterSecond = await prisma.project.count({ where: { catalog2_checkout_client_action_id: "qa-demo-checkout" } });
    assert.equal(projectsAfterSecond, 1, "rodar de novo não duplicou o pedido");
    const changeOrdersAfterSecond = await prisma.catalog2ChangeOrder.count();
    assert.equal(changeOrdersAfterSecond, changeOrdersAfterFirst, "rodar de novo não duplicou o aditivo");

    const productsDuringFixture = await prisma.product.count();
    assert.equal(productsDuringFixture, productsBefore, "os produtos operacionais nunca são tocados pelo seed de QA");

    const rRemove = run(["--remove"], { SEED_QA_ENVIRONMENT: "local" });
    assert.equal(rRemove.status, 0, rRemove.output);
    const usersAfterRemove = await prisma.user.count({ where: { email: { endsWith: "@allka-qa.test" } } });
    assert.equal(usersAfterRemove, 0);
    const productAfterRemove = await prisma.catalog2Product.findUnique({ where: { slug: "teste-qa-servico-completo" } });
    assert.equal(productAfterRemove, null);
    const productsAfterRemove = await prisma.product.count();
    assert.equal(productsAfterRemove, productsBefore, "--remove nunca toca nos produtos operacionais");
  });
});

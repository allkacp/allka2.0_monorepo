import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { checkClientVisibility } from "../lib/catalog2-client";
import { computePricing, defaultSelection } from "../lib/catalog2-pricing";

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
    const nomadDependencyTasks = await prisma.projectTask.findMany({
      where: { generation_key: { in: ["qa-demo-nomad-dependency-first", "qa-demo-nomad-dependency-second"] } },
      include: { stages: true },
      orderBy: { generation_key: "asc" },
    });
    assert.equal(nomadDependencyTasks.length, 2, "o roteiro do Nômade precisa do par demonstrativo de dependência");
    assert.equal(nomadDependencyTasks[0].nomade_responsavel_id, "qa-nomade");
    assert.equal(nomadDependencyTasks[0].stages[0]?.status, "EM_ANDAMENTO");
    assert.equal(nomadDependencyTasks[1].stages[0]?.status, "BLOQUEADA");
    const changeOrdersAfterFirst = await prisma.catalog2ChangeOrder.count();

    const r2 = run([], { SEED_QA_ENVIRONMENT: "local", SEED_QA_PASSWORD: "Teste123" });
    assert.equal(r2.status, 0, r2.output);
    const usersAfterSecond = await prisma.user.count({ where: { email: { endsWith: "@allka-qa.test" } } });
    assert.equal(usersAfterSecond, 7, "rodar de novo não duplicou usuários");
    const projectsAfterSecond = await prisma.project.count({ where: { catalog2_checkout_client_action_id: "qa-demo-checkout" } });
    assert.equal(projectsAfterSecond, 1, "rodar de novo não duplicou o pedido");
    assert.equal(
      await prisma.projectTask.count({ where: { generation_key: { in: ["qa-demo-nomad-dependency-first", "qa-demo-nomad-dependency-second"] } } }),
      2,
      "rodar de novo não duplica o par de dependência do Nômade",
    );
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

  it("produto criado é REALMENTE cotável — mesmo quando catalog2_pricing_settings já existe parcial (como a migration de baseline deixa em produção)", async () => {
    // Reproduz exatamente a condição que causou "Produto indisponível para
    // cotação." em produção (nunca detectada antes porque os testes usam
    // `db push`, que nunca roda o INSERT da migration — o singleton
    // simplesmente não existia nos testes, então o upsert do seed sempre
    // caía no branch `create`, preenchendo tudo certo por acidente). A
    // migration real só garante `currency`, deixando as % comerciais e a
    // ordem de incidência null "aguardando definição comercial" — pré-cria
    // esse mesmo estado parcial aqui antes de rodar o seed.
    await prisma.catalog2PricingSettings.deleteMany({ where: { id: "default" } });
    await prisma.catalog2PricingSettings.create({ data: { id: "default", currency: "BRL" } });

    const r = run([], { SEED_QA_ENVIRONMENT: "local", SEED_QA_PASSWORD: "Teste123" });
    assert.equal(r.status, 0, r.output);

    const settings = await prisma.catalog2PricingSettings.findUniqueOrThrow({ where: { id: "default" } });
    assert.notEqual(settings.tax_percent, null, "seed precisa completar % que a migration deixou pendente, nunca deixar null pra sempre");
    assert.notEqual(settings.commission_percent, null);
    assert.notEqual(settings.operational_fee_percent, null);
    assert.notEqual(settings.profit_margin_percent, null);
    assert.notEqual(settings.human_review_percent, null);
    assert.notEqual(settings.component_order_json, null);

    const product = await prisma.catalog2Product.findUniqueOrThrow({ where: { slug: "teste-qa-servico-completo" } });
    assert.equal(product.status, "disponivel");
    assert.notEqual(product.published_version_id, null);

    // Não basta checar campos isolados — exercita as MESMAS funções reais
    // que o catálogo do cliente usa (é exatamente onde "Produto indisponível
    // para cotação." foi lançado).
    const visibility = await checkClientVisibility(product as any);
    assert.equal(visibility.visible, true, `produto devia estar visível/cotável, motivos: ${visibility.reasons.join("; ")}`);

    const selection = await defaultSelection(product.published_version_id!);
    const pricing = await computePricing(product.published_version_id!, selection);
    assert.equal(pricing.commercial_ready, true, `preço devia estar comercialmente pronto, bloqueios: ${pricing.quote_blockers.join("; ")}`);
  });
});

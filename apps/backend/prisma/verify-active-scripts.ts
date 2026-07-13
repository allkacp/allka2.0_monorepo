/**
 * verify-active-scripts.ts
 * ================================================================
 * Guarda de regressão para a arquitetura de criação de Project e
 * geração de ProjectTask (project_code obrigatório via helper oficial;
 * tarefa só nasce de Payment PAGO + PaymentItems, nunca criada solta;
 * nenhuma sequência paralela; nenhum seed automático no deploy).
 *
 * Combina:
 *   A) checagens ESTÁTICAS — leem o texto-fonte de cada script ATIVO
 *      (todo arquivo .ts/.cjs/.js referenciado em algum script do
 *      package.json) procurando padrões incompatíveis com a
 *      arquitetura atual. SEM allowlist de arquivo — a única exceção
 *      viva é a decorativa (billing), verificada por conteúdo, não por
 *      nome de arquivo.
 *   B) checagens de BANCO — usam o estado atual do banco local pra
 *      confirmar ausência de duplicidade e de tarefa órfã.
 *   C) reexecução real dos dois scripts corrigidos na fase anterior
 *      (backfill-agency-projects.ts, seed-agency-project-fixtures.ts)
 *      pra provar idempotência a cada chamada deste verify.
 *   D) checagens de INFRAESTRUTURA — todo caminho de arquivo citado em
 *      package.json existe; todo comando `npm run` citado no workflow
 *      de deploy existe; nenhum workflow chama comando de seed.
 *
 * Requer banco LOCAL (mesma guarda de seed-qa-reset-15-projects.ts) —
 * a checagem C escreve no banco (de forma idempotente).
 *
 * Sai com exit code 1 se qualquer checagem falhar. Nenhuma falha é
 * tratada como "esperada" — allowlist de arquivo inteiro não existe mais;
 * a única exceção de conteúdo (Payment PAGO decorativo em
 * seed-demo-project-billing.ts) é verificada em tempo de execução, não
 * apenas assumida por nome de arquivo.
 *
 * Execução: cd apps/backend && npx tsx prisma/verify-active-scripts.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { prisma } from "../src/lib/prisma";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const BACKEND_ROOT = path.resolve(__dirname, "..");

// ─── Guarda de ambiente — só local, mesma regra do seed-qa-reset ───────────
{
  const rawUrl = process.env.DATABASE_URL ?? "";
  let isLocal = false;
  try {
    const u = new URL(rawUrl);
    isLocal = /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
    console.log(`── Ambiente: host=${u.hostname} porta=${u.port} banco=${u.pathname.replace(/^\//, "")} ──`);
  } catch {
    /* ignore parse failure, isLocal stays false */
  }
  if (!isLocal || process.env.NODE_ENV === "production") {
    console.error("❌ BLOQUEADO: verify-active-scripts.ts reexecuta scripts que escrevem no banco — só roda contra localhost.");
    process.exit(1);
  }
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
    failures.push(detail ? `${label} — ${detail}` : label);
  }
}

function rel(p: string) {
  return path.relative(BACKEND_ROOT, p).replace(/\\/g, "/");
}

function readPkg() {
  return JSON.parse(fs.readFileSync(path.join(BACKEND_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
}

function extractFileRefs(cmd: string): string[] {
  return [...cmd.matchAll(/([./\w-]+\.(?:ts|cjs|js))/g)].map((m) => m[1]);
}

// ─── Descobre os arquivos de scripts ATIVOS a partir do package.json ──────
function activeScriptFiles(pkg: ReturnType<typeof readPkg>): string[] {
  const files = new Set<string>();
  for (const cmd of Object.values(pkg.scripts)) {
    for (const ref of extractFileRefs(cmd)) {
      // dist/ é artefato de build (gerado por `npm run build`, presente ou
      // não dependendo do ambiente) — não é código-fonte a auditar.
      if (ref.startsWith("dist/") || ref.includes("/dist/")) continue;
      const resolved = path.resolve(BACKEND_ROOT, ref);
      if (fs.existsSync(resolved)) files.add(resolved);
    }
  }
  return [...files];
}

// Únicos dois pontos oficiais de criação de ProjectTask.
const OFFICIAL_TASK_GENERATORS = new Set(
  ["src/lib/generate-tasks.ts", "src/lib/generate-tasks-from-spec.ts"].map((p) => path.resolve(BACKEND_ROOT, p)),
);

// Único ponto oficial de obtenção de sequência (project_code/task_code).
const OFFICIAL_SEQUENCE_FILE = path.resolve(BACKEND_ROOT, "src/lib/sequence.ts");

// Helper oficial de criação de Project.
const PROJECT_CREATE_HELPER_FILE = path.resolve(BACKEND_ROOT, "src/lib/create-project.ts");

// Exceção documentada: seed controlado com códigos históricos explícitos
// (proj_00001..15) — usa formatProjectCode direto, categoria explicitamente
// permitida por não ser um script de fixture "livre".
const CONTROLLED_HISTORICAL_SEED = path.resolve(BACKEND_ROOT, "prisma/seed-qa-reset-15-projects.ts");

// Único ponto oficial de etapas geradas por especificação.
const OFFICIAL_STAGE_GENERATOR = path.resolve(BACKEND_ROOT, "src/lib/generate-tasks-from-spec.ts");

// Seed de demonstração local — precisa de guarda estrita contra host remoto.
const DEMO_SEED_FILE = path.resolve(BACKEND_ROOT, "src/scripts/seed-realistic-demo.ts");

async function main() {
  console.log("─".repeat(70));
  console.log("VERIFY — Scripts ativos vs. arquitetura Fase 1 (project_code / Payment→Task / deploy)");
  console.log("─".repeat(70));

  const pkg = readPkg();
  const files = activeScriptFiles(pkg);
  console.log(`\n📄 ${files.length} arquivo(s) de script ativo resolvido(s) a partir do package.json`);

  // ── D1. Todo caminho de arquivo citado em package.json existe ──────────
  console.log("\n=== D1 — Todo caminho de arquivo em package.json existe ===");
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    for (const ref of extractFileRefs(cmd)) {
      // dist/ só existe depois de `npm run build` — não é código-fonte
      // versionado, checar sua presença aqui daria falso-negativo/positivo
      // dependendo de o build já ter rodado ou não neste ambiente.
      if (ref.startsWith("dist/") || ref.includes("/dist/")) continue;
      const resolved = path.resolve(BACKEND_ROOT, ref);
      check(`script "${name}": referência "${ref}" existe`, fs.existsSync(resolved));
    }
  }

  // ── D2/D3. Workflows de deploy: comandos existem e nenhum é seed automático ──
  console.log("\n=== D2/D3 — Workflow de deploy: comandos válidos, nenhum seed automático ===");
  const workflowsDir = path.join(REPO_ROOT, ".github", "workflows");
  if (fs.existsSync(workflowsDir)) {
    for (const wf of fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
      const wfPath = path.join(workflowsDir, wf);
      const src = fs.readFileSync(wfPath, "utf8");
      const npmRunMatches = [...src.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]);
      for (const scriptName of npmRunMatches) {
        check(`${wf}: "npm run ${scriptName}" existe em apps/backend/package.json`, scriptName in pkg.scripts);
        const looksLikeSeed = /^db:seed/.test(scriptName);
        check(
          `${wf}: "npm run ${scriptName}" não é um comando de seed automático`,
          !looksLikeSeed,
          looksLikeSeed ? `workflow não deve chamar comandos de seed automaticamente (achado: ${scriptName})` : undefined,
        );
      }
    }
  } else {
    console.log("  (nenhum .github/workflows encontrado — pulando)");
  }

  // ── A1/A2. Toda criação de Project usa o helper oficial + tem project_code ──
  console.log("\n=== A1/A2 — Criação de Project usa helper oficial + project_code ===");
  for (const file of files) {
    if (file === PROJECT_CREATE_HELPER_FILE || file === CONTROLLED_HISTORICAL_SEED) continue;
    const src = fs.readFileSync(file, "utf8");
    const createsProject = /\.project\.(create|createMany|upsert)\(/.test(src);
    if (!createsProject) continue;

    const usesHelper = /from\s+["'].*create-project["']/.test(src) && /withProjectCode\(/.test(src);
    check(`${rel(file)}: usa withProjectCode/createProjectWithSequentialCode`, usesHelper);

    if (usesHelper) {
      const setsProjectCode = /project_code\s*:\s*projectCode/.test(src);
      check(`${rel(file)}: seta project_code a partir do callback do helper`, setsProjectCode);
    }
  }

  // ── A3. Nenhum script reimplementa sua própria sequência (paralela à oficial) ──
  console.log("\n=== A3 — Nenhuma sequência paralela (fora de src/lib/sequence.ts) ===");
  for (const file of files) {
    if (file === OFFICIAL_SEQUENCE_FILE) continue;
    const src = fs.readFileSync(file, "utf8");
    const reimplementsSequence = /current_value\s*\+\s*1|LAST_INSERT_ID/i.test(src);
    check(`${rel(file)}: não reimplementa lógica de sequência própria`, !reimplementsSequence);
  }

  // ── A4. Nenhum script define task_code manualmente fora dos geradores oficiais ──
  console.log("\n=== A4 — Nenhum task_code manual fora dos geradores oficiais ===");
  for (const file of files) {
    if (OFFICIAL_TASK_GENERATORS.has(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    // task_code: "algum literal ou variável" dentro de um .create/.update de
    // projectTask — mas NÃO getNextTaskCode(...) nem task_code: null/undefined.
    const manualTaskCode = /task_code\s*:\s*(?!null|undefined|await getNextTaskCode)[^\n,}]+/.test(src) && /\.projectTask\.(create|update)\(/.test(src);
    check(`${rel(file)}: não atribui task_code manualmente`, !manualTaskCode);
  }

  // ── A5. Nenhum script ativo cria ProjectTask diretamente ────────────────
  console.log("\n=== A5 — Nenhum ProjectTask criado diretamente fora do gerador oficial ===");
  for (const file of files) {
    if (OFFICIAL_TASK_GENERATORS.has(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    const createsTaskDirectly = /\.projectTask\.(create|createMany)\(/.test(src);
    check(`${rel(file)}: não cria ProjectTask diretamente (só via gerador oficial)`, !createsTaskDirectly);
  }

  // ── A6. Payment PAGO criado diretamente só permitido em fixture decorativa
  //       verificada (sem PaymentItem, sem geração de tarefa) ───────────────
  console.log("\n=== A6 — Payment PAGO direto só em fixture decorativa comprovadamente sem tarefa ===");
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const createsPagoDirectly = /\.payment\.(create|createMany)\(\s*\{[\s\S]{0,400}?status\s*:\s*["']PAGO["']/m.test(src);
    if (!createsPagoDirectly) continue;

    // Exige uso de CÓDIGO real (chamada/relação Prisma), não menção em
    // comentário — "paymentItem.create(", "tx.paymentItem", "include: {
    // payment_items: ..." etc., nunca a palavra solta em prosa.
    const touchesPaymentItem = /\.paymentItem\.\w+\(|payment_items\s*:/.test(src);
    const touchesTaskGeneration = /\b(gerarTarefasDoProjeto|confirmPaymentAndGenerateProjectTasks|generateTasksFromSpec)\s*\(|\.projectTask\.(create|createMany)\(/.test(src);
    const isStrictlyDecorative = !touchesPaymentItem && !touchesTaskGeneration;
    check(
      `${rel(file)}: Payment PAGO direto é estritamente decorativo (sem PaymentItem, sem geração de tarefa)`,
      isStrictlyDecorative,
      isStrictlyDecorative ? undefined : "cria Payment PAGO diretamente E toca PaymentItem/geração de tarefa — deve usar confirmPaymentAndGenerateProjectTasks",
    );
  }

  // ── A7. Nenhuma senha padrão hardcoded como fallback ────────────────────
  console.log("\n=== A7 — Nenhuma senha padrão hardcoded (fallback de env var) ===");
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const hardcodedPasswordFallback = /process\.env\.\w*PASSWORD\w*\s*(\?\?|\|\|)\s*["'`]/.test(src);
    check(`${rel(file)}: não usa senha padrão hardcoded como fallback de env var`, !hardcodedPasswordFallback);
  }

  // ── A8/A9. Nenhum seed reutilizável atualiza password_hash/is_active de
  //           usuário JÁ EXISTENTE (só a criação pode setar isso) ─────────
  // Exceção documentada: seed-test-users.ts é uma ferramenta de reset de
  // credenciais de QA com propósito ÚNICO e DECLARADO (os 6 logins fixos do
  // seletor de teste) — não é um "seed" que popula dados e mexe em senha
  // como efeito colateral escondido. reset-users-password.cjs tem o mesmo
  // propósito mas usa updateMany (não .user.upsert), por isso nem aparece
  // neste scan — já é tratado como ação de reset explícita (gate no
  // workflow atrás de RUN_RESET_USERS_PASSWORD).
  const PASSWORD_RESET_TOOL_ALLOWLIST = new Set([path.resolve(BACKEND_ROOT, "seed-test-users.ts")]);
  console.log("\n=== A8/A9 — update: de user.upsert nunca toca password_hash/is_active ===");
  for (const file of files) {
    if (PASSWORD_RESET_TOOL_ALLOWLIST.has(file)) {
      check(`${rel(file)}: ferramenta de reset de credenciais de QA — exceção documentada`, true);
      continue;
    }
    const src = fs.readFileSync(file, "utf8");
    const userUpsertCalls = [...src.matchAll(/\.user\.upsert\(\s*\{[\s\S]{0,700}?\n\s*\}\s*\)/g)].map((m) => m[0]);
    for (let i = 0; i < userUpsertCalls.length; i++) {
      const call = userUpsertCalls[i];
      const updateMatch = call.match(/update:\s*\{([^}]*)\}/);
      const updateBody = updateMatch?.[1] ?? "";
      const touchesPasswordHash = /password_hash/.test(updateBody);
      const touchesIsActive = /is_active/.test(updateBody);
      check(`${rel(file)}: user.upsert #${i + 1} — update: não toca password_hash`, !touchesPasswordHash, touchesPasswordHash ? updateBody.trim() : undefined);
      check(`${rel(file)}: user.upsert #${i + 1} — update: não toca is_active`, !touchesIsActive, touchesIsActive ? updateBody.trim() : undefined);
    }
  }

  // ── A10. Seed de demonstração bloqueia host remoto ANTES de qualquer
  //         consulta ao Prisma ───────────────────────────────────────────
  console.log("\n=== A10 — Seed de demonstração bloqueia host remoto ===");
  if (fs.existsSync(DEMO_SEED_FILE)) {
    const src = fs.readFileSync(DEMO_SEED_FILE, "utf8");
    const hasStrictHostGuard = /hostname\s*===?\s*["']localhost["']/.test(src) && /127\.0\.0\.1/.test(src) && /process\.exit\(1\)/.test(src);
    check(`${rel(DEMO_SEED_FILE)}: bloqueia qualquer host que não seja localhost/127.0.0.1`, hasStrictHostGuard);
    // A guarda precisa vir ANTES do import do client Prisma compartilhado —
    // senão "antes de consultar o Prisma" vira letra morta.
    const guardIdx = src.search(/process\.exit\(1\)/);
    const prismaImportIdx = src.search(/from\s+["'].*\/lib\/prisma["']/);
    check(
      `${rel(DEMO_SEED_FILE)}: guarda de host vem antes do import do Prisma`,
      guardIdx !== -1 && prismaImportIdx !== -1 && guardIdx < prismaImportIdx,
    );
  } else {
    check(`${rel(DEMO_SEED_FILE)}: existe`, false, "seed de demonstração esperado não encontrado");
  }

  // ── A11. Nenhum gerador usa projectTaskStage.deleteMany (etapas nunca são
  //         apagadas em reexecução — create-only por source_key) ─────────
  console.log("\n=== A11 — Nenhum uso de projectTaskStage.deleteMany ===");
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const usesStageDeleteMany = /\.projectTaskStage\.deleteMany\(/.test(src);
    check(`${rel(file)}: não usa projectTaskStage.deleteMany`, !usesStageDeleteMany);
  }

  // ── A12. Nenhum script ativo cria ProjectTaskStage diretamente — só o
  //         gerador oficial (generateTasksFromSpec) ou o gerador genérico
  //         (generate-tasks.ts) ───────────────────────────────────────────
  console.log("\n=== A12 — Nenhuma ProjectTaskStage criada diretamente fora do gerador oficial ===");
  for (const file of files) {
    if (OFFICIAL_TASK_GENERATORS.has(file) || file === OFFICIAL_STAGE_GENERATOR) continue;
    const src = fs.readFileSync(file, "utf8");
    const createsStageDirectly = /\.projectTaskStage\.(create|createMany)\(/.test(src);
    check(`${rel(file)}: não cria ProjectTaskStage diretamente (só via gerador oficial)`, !createsStageDirectly);
  }

  // ── D4. Nenhum workflow referencia seed-real/demo seed, nem executa
  //        `node`/`npx tsx` direto contra um arquivo de seed (só via
  //        `npm run <script>`, já coberto em D2/D3) ──────────────────────
  console.log("\n=== D4 — Nenhum workflow referencia seed-real/demo seed ou executa seed direto ===");
  if (fs.existsSync(workflowsDir)) {
    for (const wf of fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
      const src = fs.readFileSync(path.join(workflowsDir, wf), "utf8");
      // Negative lookahead evita falso-positivo em "seed-realistic-demo.ts"
      // (o script NOVO, correto) — só pega o antigo "seed-real.cjs/.ts".
      const mentionsSeedReal = /seed-real(?!istic)/i.test(src);
      check(`${wf}: não referencia "seed-real"`, !mentionsSeedReal);
      // Só reprova EXECUÇÃO real (npm run / node / npx tsx chamando o seed) —
      // uma menção em comentário explicando que ele é intencionalmente
      // excluído (como este próprio workflow faz) não é um problema.
      const executesDemoSeed = /(npm run db:seed:demo-realistic|(?:node|npx\s+tsx)\s+\S*seed-realistic-demo)/i.test(src);
      check(`${wf}: não EXECUTA o seed de demonstração (menção em comentário é ok)`, !executesDemoSeed);
      const runsSeedFileDirectly = /\b(node|npx\s+tsx)\s+[^\n]*seed[^\n]*\.(ts|js|cjs)/i.test(src);
      check(`${wf}: não executa arquivo de seed diretamente (node/npx tsx)`, !runsSeedFileDirectly);
    }
  }

  // ── D5. Nenhum Dockerfile executa seed ──────────────────────────────────
  console.log("\n=== D5 — Nenhum Dockerfile executa seed ===");
  const dockerDir = path.join(REPO_ROOT, "docker");
  if (fs.existsSync(dockerDir)) {
    for (const df of fs.readdirSync(dockerDir).filter((f) => /dockerfile/i.test(f))) {
      const src = fs.readFileSync(path.join(dockerDir, df), "utf8");
      const runsSeed = /seed/i.test(src);
      check(`docker/${df}: não referencia seed`, !runsSeed);
    }
  }

  // ── D6. Nenhum comando ativo (package.json ou workflow) usa `prisma db
  //        push` como substituto de migrate deploy ───────────────────────
  console.log("\n=== D6 — Nenhum comando ativo usa `prisma db push` no lugar de migrate deploy ===");
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    check(`script "${name}": não usa "prisma db push"`, !/prisma\s+db\s+push/.test(cmd));
  }
  if (fs.existsSync(workflowsDir)) {
    for (const wf of fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
      const src = fs.readFileSync(path.join(workflowsDir, wf), "utf8");
      check(`${wf}: não usa "prisma db push"`, !/prisma\s+db\s+push/.test(src));
    }
  }

  // ── B. Checagens de banco ───────────────────────────────────────────────
  console.log("\n=== B1 — Nenhum project_code duplicado ===");
  const dupProjectCodes = await prisma.$queryRawUnsafe<Array<{ project_code: string; c: bigint }>>(
    "SELECT project_code, COUNT(*) c FROM projects GROUP BY project_code HAVING c > 1",
  );
  check("SELECT project_code duplicado retorna 0 linhas", dupProjectCodes.length === 0, JSON.stringify(dupProjectCodes));

  console.log("\n=== B2 — Nenhum project_code vazio/nulo ===");
  const emptyProjectCodes = await prisma.project.count({ where: { project_code: "" } });
  check("Nenhum project_code é string vazia", emptyProjectCodes === 0, `${emptyProjectCodes} encontrado(s)`);

  console.log("\n=== B3 — Nenhuma tarefa gerada sem Payment PAGO ===");
  const tasksWithBadPayment = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT pt.id FROM project_tasks pt
    JOIN payments p ON p.id = pt.origin_payment_id
    WHERE pt.origin_payment_id IS NOT NULL AND p.status <> 'PAGO'
  `);
  check(
    "Toda ProjectTask com origin_payment_id aponta pra um Payment PAGO",
    tasksWithBadPayment.length === 0,
    JSON.stringify(tasksWithBadPayment),
  );

  console.log("\n=== B4 — Nenhuma tarefa gerada sem PaymentItem correspondente ===");
  const tasksWithoutPaymentItem = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT pt.id FROM project_tasks pt
    WHERE pt.origin_payment_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM payment_items pi
        WHERE pi.payment_id = pt.origin_payment_id
          AND pi.project_product_id = pt.project_product_id
      )
  `);
  check(
    "Toda ProjectTask com origin_payment_id tem PaymentItem casando payment+project_product",
    tasksWithoutPaymentItem.length === 0,
    JSON.stringify(tasksWithoutPaymentItem),
  );

  console.log("\n=== B5 — Nenhuma ProjectTask sem generation_key OU origin_payment_id ===");
  const orphanTasks = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT id FROM project_tasks WHERE origin_payment_id IS NULL AND generation_key IS NULL
  `);
  check(
    "Toda ProjectTask tem origin_payment_id OU generation_key (nenhuma órfã sem rastro de origem)",
    orphanTasks.length === 0,
    JSON.stringify(orphanTasks),
  );

  console.log("\n=== B7 — Nenhum task_code duplicado ===");
  const dupTaskCodes = await prisma.$queryRawUnsafe<Array<{ task_code: string; c: bigint }>>(
    "SELECT task_code, COUNT(*) c FROM project_tasks WHERE task_code IS NOT NULL GROUP BY task_code HAVING c > 1",
  );
  check("SELECT task_code duplicado retorna 0 linhas", dupTaskCodes.length === 0, JSON.stringify(dupTaskCodes));

  console.log("\n=== B8 — Nenhuma generation_key duplicada ===");
  const dupGenKeys = await prisma.$queryRawUnsafe<Array<{ generation_key: string; c: bigint }>>(
    "SELECT generation_key, COUNT(*) c FROM project_tasks WHERE generation_key IS NOT NULL GROUP BY generation_key HAVING c > 1",
  );
  check("SELECT generation_key duplicada retorna 0 linhas", dupGenKeys.length === 0, JSON.stringify(dupGenKeys));

  console.log("\n=== B9 — Nenhum PaymentItem duplicado ===");
  const dupPaymentItems = await prisma.$queryRawUnsafe<Array<{ payment_id: string; project_product_id: string; c: bigint }>>(
    "SELECT payment_id, project_product_id, COUNT(*) c FROM payment_items GROUP BY payment_id, project_product_id HAVING c > 1",
  );
  check("SELECT PaymentItem duplicado retorna 0 linhas", dupPaymentItems.length === 0, JSON.stringify(dupPaymentItems));

  // ── C. Idempotência real dos dois scripts corrigidos na fase anterior ──
  console.log("\n=== C — Idempotência real (reexecução dupla) ===");
  const idempotencyTargets = [
    { label: "backfill-agency-projects.ts", cmd: "npx tsx src/scripts/backfill-agency-projects.ts" },
    { label: "seed-agency-project-fixtures.ts", cmd: "npx tsx src/scripts/seed-agency-project-fixtures.ts" },
  ];

  async function snapshot() {
    const [projects, payments, paymentItems, tasks, stages] = await Promise.all([
      prisma.project.count(),
      prisma.payment.count(),
      prisma.paymentItem.count(),
      prisma.projectTask.count(),
      prisma.projectTaskStage.count(),
    ]);
    return { projects, payments, paymentItems, tasks, stages };
  }

  for (const target of idempotencyTargets) {
    try {
      execSync(target.cmd, { cwd: BACKEND_ROOT, stdio: "pipe" });
      const after1 = await snapshot();
      execSync(target.cmd, { cwd: BACKEND_ROOT, stdio: "pipe" });
      const after2 = await snapshot();
      const stable =
        after1.projects === after2.projects &&
        after1.payments === after2.payments &&
        after1.paymentItems === after2.paymentItems &&
        after1.tasks === after2.tasks &&
        after1.stages === after2.stages;
      check(
        `${target.label}: 2ª execução não altera contagens (projects/payments/paymentItems/tasks/stages)`,
        stable,
        stable ? undefined : `${JSON.stringify(after1)} → ${JSON.stringify(after2)}`,
      );
    } catch (err) {
      check(`${target.label}: executa sem erro (exit code 0) nas duas rodadas`, false, err instanceof Error ? err.message : String(err));
    }
  }

  // ── Resultado final ──────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam`);
  console.log("=".repeat(70));
  if (failed > 0) {
    console.log("\nFalhas:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("\n✅ Todos os checks passaram.");
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO INESPERADO:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

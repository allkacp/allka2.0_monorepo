/**
 * diag-demo-project-completeness.ts
 * Diagnóstico local: mostra cobertura de dados por projeto em todas as abas.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FLAGS = [
  "SEM_PRODUTOS", "SEM_TAREFAS", "SEM_ETAPAS", "SEM_BRIEFING",
  "SEM_ANEXOS", "SEM_COFRE", "SEM_FATURAMENTO", "SEM_LOG_DERIVADO",
  "SEM_CRED_LOG",
] as const;

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  DIAGNÓSTICO: Demo Project Completeness                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const projects = await prisma.project.findMany({
    include: { client: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });

  // Bulk aggregations
  const [ppCounts, ptCounts, credCounts, invCounts, payCounts] = await Promise.all([
    prisma.projectProduct.groupBy({ by: ["project_id"], _count: { id: true } }),
    prisma.projectTask.groupBy({ by: ["project_id"], _count: { id: true } }),
    prisma.projectCredential.groupBy({ by: ["project_id"], _count: { id: true } }),
    prisma.invoice.groupBy({ by: ["project_id"], _count: { id: true } }),
    prisma.payment.groupBy({ by: ["project_id"], _count: { id: true } }),
  ]);

  const ppMap   = Object.fromEntries(ppCounts.map((r) => [r.project_id, r._count.id]));
  const ptMap   = Object.fromEntries(ptCounts.map((r) => [r.project_id, r._count.id]));
  const credMap = Object.fromEntries(credCounts.map((r) => [r.project_id, r._count.id]));
  const invMap  = Object.fromEntries(invCounts.map((r) => [r.project_id, r._count.id]));
  const payMap  = Object.fromEntries(payCounts.map((r) => [r.project_id, r._count.id]));

  // Task-level aggregations (stages, briefing, attachments)
  const allTasks = await prisma.projectTask.findMany({
    include: { _count: { select: { stages: true, briefing_answers: true, attachments: true } } },
  });

  const stagesMap: Record<string, number>  = {};
  const briefMap:  Record<string, number>  = {};
  const attMap:    Record<string, number>  = {};
  for (const t of allTasks) {
    stagesMap[t.project_id] = (stagesMap[t.project_id] ?? 0) + t._count.stages;
    briefMap[t.project_id]  = (briefMap[t.project_id]  ?? 0) + t._count.briefing_answers;
    attMap[t.project_id]    = (attMap[t.project_id]    ?? 0) + t._count.attachments;
  }

  // Credential access logs per project
  const credLogs = await prisma.projectCredentialAccessLog.findMany({
    select: { credential: { select: { project_id: true } } },
  });
  const clMap: Record<string, number> = {};
  for (const cl of credLogs) {
    const pid = cl.credential?.project_id;
    if (pid) clMap[pid] = (clMap[pid] ?? 0) + 1;
  }

  // ─── Per-project table ───────────────────────────────────────────────────────
  const header = [
    "PROJECT_ID".padEnd(34),
    "STATUS".padEnd(18),
    "PP", "PT", "St", "Br", "At", "Cr", "CL", "Inv", "Pay",
    "ISSUES",
  ].join(" │ ");

  console.log(header);
  console.log("─".repeat(header.length));

  const problems: { id: string; issues: string[] }[] = [];
  let completeCount = 0;

  for (const pr of projects) {
    const pp  = ppMap[pr.id]   ?? 0;
    const pt  = ptMap[pr.id]   ?? 0;
    const st  = stagesMap[pr.id] ?? 0;
    const br  = briefMap[pr.id]  ?? 0;
    const at  = attMap[pr.id]    ?? 0;
    const cr  = credMap[pr.id]  ?? 0;
    const cl  = clMap[pr.id]    ?? 0;
    const inv = invMap[pr.id]   ?? 0;
    const pay = payMap[pr.id]   ?? 0;

    const issues: string[] = [];
    if (pp === 0)  issues.push("SEM_PRODUTOS");
    if (pt === 0)  issues.push("SEM_TAREFAS");
    if (st === 0)  issues.push("SEM_ETAPAS");
    if (br === 0)  issues.push("SEM_BRIEFING");
    if (at === 0)  issues.push("SEM_ANEXOS");
    if (cr === 0)  issues.push("SEM_COFRE");
    if (inv === 0) issues.push("SEM_FATURAMENTO");
    if (at > 0 || st > 0) {
      // log derivado existe se tem tasks ou attachments
    } else {
      issues.push("SEM_LOG_DERIVADO");
    }
    if (cl === 0)  issues.push("SEM_CRED_LOG");

    const row = [
      pr.id.padEnd(34),
      pr.status.padEnd(18),
      String(pp).padStart(2),
      String(pt).padStart(2),
      String(st).padStart(3),
      String(br).padStart(3),
      String(at).padStart(3),
      String(cr).padStart(3),
      String(cl).padStart(3),
      String(inv).padStart(3),
      String(pay).padStart(3),
      issues.length === 0 ? "✅" : "⚠️  " + issues.join(", "),
    ].join(" │ ");

    console.log(row);

    if (issues.length === 0) {
      completeCount++;
    } else {
      problems.push({ id: pr.id, issues });
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const total = projects.length;
  const hasProducts  = projects.filter((p) => (ppMap[p.id]   ?? 0) >= 1).length;
  const hasTasks     = projects.filter((p) => (ptMap[p.id]   ?? 0) >= 1).length;
  const hasStages    = projects.filter((p) => (stagesMap[p.id] ?? 0) >= 1).length;
  const hasBriefing  = projects.filter((p) => (briefMap[p.id]  ?? 0) >= 1).length;
  const hasAtt       = projects.filter((p) => (attMap[p.id]    ?? 0) >= 1).length;
  const hasCreds     = projects.filter((p) => (credMap[p.id]  ?? 0) >= 1).length;
  const hasCredLogs  = projects.filter((p) => (clMap[p.id]    ?? 0) >= 1).length;
  const hasInvoices  = projects.filter((p) => (invMap[p.id]   ?? 0) >= 1).length;
  const hasPayments  = projects.filter((p) => (payMap[p.id]   ?? 0) >= 1).length;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  COBERTURA GERAL                                            ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  const r = (n: number) => `${n}/${total} (${Math.round((n / total) * 100)}%)`;
  console.log(`║  Total projetos:                      ${String(total).padEnd(22)}║`);
  console.log(`║  Com Produtos (≥1):                   ${r(hasProducts).padEnd(22)}║`);
  console.log(`║  Com Tarefas (≥1):                    ${r(hasTasks).padEnd(22)}║`);
  console.log(`║  Com Etapas (≥1):                     ${r(hasStages).padEnd(22)}║`);
  console.log(`║  Com Briefing (≥1):                   ${r(hasBriefing).padEnd(22)}║`);
  console.log(`║  Com Arquivos (≥1):                   ${r(hasAtt).padEnd(22)}║`);
  console.log(`║  Com Cofre (≥1):                      ${r(hasCreds).padEnd(22)}║`);
  console.log(`║  Com Log Credencial (≥1):             ${r(hasCredLogs).padEnd(22)}║`);
  console.log(`║  Com Faturamento (≥1):                ${r(hasInvoices).padEnd(22)}║`);
  console.log(`║  Com Pagamentos (≥1):                 ${r(hasPayments).padEnd(22)}║`);
  console.log(`║  Completos em todas as abas:          ${r(completeCount).padEnd(22)}║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  if (problems.length === 0) {
    console.log("║  ✅  TODOS OS PROJETOS COMPLETOS                             ║");
  } else {
    console.log(`║  ⚠️   ${problems.length} projetos incompletos:`.padEnd(63) + "║");
    for (const p of problems) {
      const line = `║    • ${p.id}: ${p.issues.join(", ")}`;
      console.log(line.substring(0, 63).padEnd(63) + "║");
    }
  }

  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());

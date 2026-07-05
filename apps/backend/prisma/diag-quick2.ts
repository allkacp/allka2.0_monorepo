import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  // Tasks with stage counts per project
  const tasks = await p.projectTask.findMany({
    include: { _count: { select: { stages: true, briefing_answers: true, attachments: true } } },
    orderBy: { project_id: "asc" },
  });

  // Group by project
  const byProject: Record<string, { stages: number; briefing: number; attachments: number; taskCount: number }> = {};
  for (const t of tasks) {
    if (!byProject[t.project_id]) byProject[t.project_id] = { stages: 0, briefing: 0, attachments: 0, taskCount: 0 };
    byProject[t.project_id].stages += t._count.stages;
    byProject[t.project_id].briefing += t._count.briefing_answers;
    byProject[t.project_id].attachments += t._count.attachments;
    byProject[t.project_id].taskCount++;
  }

  // Payment + Invoice counts per project
  const invCounts2  = await p.invoice.groupBy({ by: ["project_id"], _count: { id: true } });
  const payCounts   = await p.payment.groupBy({ by: ["project_id"], _count: { id: true } });
  const invByProj: Record<string, number> = Object.fromEntries(invCounts2.map((r) => [r.project_id, r._count.id]));
  const payByProj: Record<string, number> = Object.fromEntries(payCounts.map((r) => [r.project_id, r._count.id]));

  // Credential access logs
  const credLogs = await p.projectCredentialAccessLog.findMany({ select: { credential: { select: { project_id: true } } } });
  const credLogByProj: Record<string, number> = {};
  for (const cl of credLogs) { const pid = cl.credential?.project_id; if (pid) credLogByProj[pid] = (credLogByProj[pid] ?? 0) + 1; }

  const projects = await p.project.findMany({ orderBy: { id: "asc" }, select: { id: true, status: true, value: true, budget: true, start_date: true, end_date: true, description: true } });

  console.log("=== DIAGNÓSTICO DETALHADO (" + projects.length + " projetos) ===");
  console.log("id | status | val | stages | briefing | atts | inv | pay | credLogs | desc? | dates?");
  const problems: string[] = [];
  for (const pr of projects) {
    const d = byProject[pr.id] ?? { stages: 0, briefing: 0, attachments: 0, taskCount: 0 };
    const inv = invByProj[pr.id] ?? 0;
    const pay = payByProj[pr.id] ?? 0;
    const cl  = credLogByProj[pr.id] ?? 0;
    const issues: string[] = [];
    if (d.stages === 0) issues.push("SEM_ETAPAS");
    if (d.briefing === 0) issues.push("SEM_BRIEFING");
    if (d.attachments === 0) issues.push("SEM_ANEXOS");
    if (inv === 0) issues.push("SEM_FATURAMENTO");
    if (pay === 0 && pr.status === "completed") issues.push("SEM_PAGAMENTO_COMPLETED");
    if (cl === 0) issues.push("SEM_CRED_LOG");
    if (!pr.description) issues.push("SEM_DESC");
    if (!pr.value || pr.value === 0) issues.push("SEM_VALUE");
    if (!pr.start_date) issues.push("SEM_DATES");
    const line = `${pr.id.padEnd(32)} ${pr.status.padEnd(18)} V=${pr.value?.toFixed(0).padStart(6)} St=${String(d.stages).padStart(3)} Br=${String(d.briefing).padStart(3)} At=${String(d.attachments).padStart(3)} Inv=${inv} Pay=${pay} CL=${cl} ${issues.join(" ")}`;
    console.log(line);
    if (issues.length > 0) problems.push(`  ${pr.id}: ${issues.join(", ")}`);
  }
  if (problems.length === 0) {
    console.log("\n✅ Nenhum problema encontrado");
  } else {
    console.log(`\n⚠️  ${problems.length} projetos com problemas:`);
    problems.forEach((l) => console.log(l));
  }
}
main().catch((e) => console.error("ERR:", e.message, e.stack)).finally(() => p.$disconnect());

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  // Check task briefing_snapshot and catalog_task for T000089/T000090
  const tasks = await p.projectTask.findMany({
    where: { task_code: { in: ["T000089","T000090"] } },
    select: { id: true, title: true, task_code: true, catalog_task_id: true, briefing_snapshot: true, name_snapshot: true, code_snapshot: true, category_snapshot: true,
      briefing_answers: { select: { question_key: true, question_text: true, answer: true } }
    }
  });
  for (const t of tasks) {
    console.log("TASK:", t.task_code, t.title);
    console.log("  catalog_task_id:", t.catalog_task_id);
    console.log("  name_snapshot:", t.name_snapshot);
    console.log("  code_snapshot:", t.code_snapshot);
    console.log("  category_snapshot:", t.category_snapshot);
    const snap = t.briefing_snapshot ? JSON.parse(t.briefing_snapshot) : null;
    console.log("  briefing_snapshot:", JSON.stringify(snap, null, 2));
    console.log("  briefing_answers:", JSON.stringify(t.briefing_answers));
  }
  // Check catalog tasks
  const ct = await p.catalogTask.findMany({
    where: { code: { in: ["DC0001-T01","DC0002-T01","DC0002-T02"] } },
    select: { id: true, code: true, name: true, steps: true, requires_briefing: true }
  });
  for (const c of ct) {
    const steps = c.steps ? JSON.parse(c.steps) : null;
    console.log("CATALOG TASK:", c.code, c.name, "- steps:", steps ? steps.length : 0);
    if (steps) console.log("  steps:", JSON.stringify(steps.map((s: any) => s.titulo || s.title)));
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

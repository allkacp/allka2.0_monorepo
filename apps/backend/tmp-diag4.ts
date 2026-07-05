import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const ct = await p.catalogTask.findMany({
    where: { code: { in: ["DC0001-T01","DC0002-T01","DC0002-T02"] } }
  });
  for (const c of ct) {
    console.log("CT:" + c.code);
    console.log("BQ:" + (c.briefing_questions ? c.briefing_questions.substring(0,200) : "NULL"));
    const steps = c.steps ? JSON.parse(c.steps) : [];
    console.log("STEPS_CNT:" + steps.length);
    console.log("STEPS:" + JSON.stringify(steps.map((s: any) => s.titulo)));
  }
  const u = await p.user.findFirst({
    where: { email: { in: ["partner@allka.test","parceiro@allka.com.vc"] } },
    select: { id: true, email: true, name: true, role: true }
  });
  console.log("PARTNER_USER:" + JSON.stringify(u));
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

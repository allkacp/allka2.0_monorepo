/** Limpeza LOCAL autorizada em 27/10. Simula por padrão; escopo fixo.
 * Não usar seed/baseline-cleanup: não altera senha, produto ou matriz.
 * --apply exige backup com SHA256 validado e servidor local pausado.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { generateNextUserCode } from "../lib/user-code";
import { unavailableSpecificAssignments } from "../lib/specific-assignee-impact";

const KEEP = [
  { id: "cmormdvqj00005p7xiyt3mcrp", old: 1, email: "cp@lamego.com.vc" },
  { id: "cmrp1n8yi0009l7ubypibgzf7", old: 2, email: "rose@lamego.com.vc" },
  { id: "cmrp3leg2000gl7ubs6ojh7ny", old: 4, email: "valderio@lamego.com.vc" },
  { id: "cmrp6d5ly0005em5sub83tea9", old: 5, email: "reynario@lamego.com.vc" },
  { id: "cms3pxah1000o5o8g21yi74b5", old: 7, email: "gabriel@lamego.com.vc" },
  { id: "cmscc4chy000011fhmwqi40ji", old: 9, email: "eron@lamego.com.vc" },
  { id: "cmscc4cmi000211fh3mns0tq0", old: 11, email: "contato@lamego.com.vc" },
];
const REMOVE = ["cmrp2ii57000el7ub7sepfino", "cmrpeaxb5000510t7xe5rixoe", "cms3zlvw60008f17vyukll681", "cmscc4cit000111fhq504y6jf", "cmscc4cna000511fhc7g393q4", "cmt3m4sjy0009zkwnnlasjc9n", "cmt3m4sk6000azkwn9saqvdov", "cmudcyr450000mtiqd5kmrwh6", "cmuepxun5000911eaplmzgcnd", "qa-user-admin-common", "qa-user-admin-master", "qa-user-leader", "qa-user-nomad", "qa-user-agency", "qa-user-company", "qa-user-partner", "empresa-teste-local", "teste-local-d217e56e", "zu_1792157502922", "zu3_1792157192001"];
const AGENCIES = ["qa-agency", "qa-partner-agency"];
const PROJECT_CODES = ["proj_953", "proj_954"];
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function requireTrue(value: unknown, message: string): asserts value { if (!value) throw new Error(`RECUSADO: ${message}`); }

async function main() {
  const url = new URL(config.DATABASE_URL);
  const rehearsal = process.env.CLEANUP_USERS_REHEARSAL === "true" && url.pathname === "/allka_cleanup_rehearsal_20261027";
  requireTrue(config.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "mysql"].includes(url.hostname) && (url.pathname === "/allka" || rehearsal), "somente MySQL allka LOCAL ou ensaio explicitamente identificado.");
  const apply = process.argv.includes("--apply");
  const beforeUsers = await prisma.user.findMany({ orderBy: { id: "asc" } });
  if (beforeUsers.length === 7 && KEEP.every((k, i) => beforeUsers.some(u => u.id === k.id && u.user_code === `user_${i + 1}`))) { console.log("Limpeza já concluída. Nenhuma alteração."); return; }
  requireTrue(beforeUsers.length === 27 && beforeUsers.every(u => KEEP.some(k => k.id === u.id) || REMOVE.includes(u.id)), "o conjunto de usuários mudou; revisar antes de excluir.");
  for (const k of KEEP) requireTrue(beforeUsers.some(u => u.id === k.id && u.user_code === `user_${k.old}` && u.email === k.email), `identidade do usuário ${k.old} divergente.`);
  const projects = await prisma.project.findMany({ where: { project_code: { in: PROJECT_CODES } }, select: { id: true, project_code: true, agency_id: true } });
  requireTrue(projects.length === 2 && projects.every(p => p.agency_id === "qa-agency"), "projetos QA diferentes do autorizado.");
  const projectIds = projects.map(p => p.id);
  const extraProjects = await prisma.project.count({ where: { agency_id: { in: AGENCIES }, id: { notIn: projectIds } } });
  requireTrue(extraProjects === 0, "há outro projeto nas agências QA; não desvincular silenciosamente.");
  const owners = await prisma.agency.findMany({ where: { id: { in: AGENCIES } }, select: { id: true, owner_user_id: true, name: true } });
  requireTrue(owners.length === 2 && owners.every(a => REMOVE.includes(a.owner_user_id) && a.name.startsWith("[TESTE QA]")), "agências fora do escopo QA.");
  const payments = await prisma.payment.findMany({ where: { project_id: { in: projectIds } } });
  requireTrue(payments.every(p => p.gateway === "FAKE_SANDBOX"), "pagamento não sandbox encontrado.");
  const ledgerRefs = await prisma.walletLedger.count({ where: { reference_id: { in: [...projectIds, ...payments.map(p => p.id)] } } });
  requireTrue(ledgerRefs === 0, "há lançamentos financeiros a reconciliar antes da limpeza.");
  requireTrue(await prisma.wallet.count({ where: { owner_id: { in: AGENCIES } } }) === 0, "há carteira QA que exige conciliação.");
  const crossedDependencies = await prisma.taskDependency.count({ where: { project_id: { notIn: projectIds }, depends_on_task: { project_id: { in: projectIds } } } });
  requireTrue(crossedDependencies === 0, "projeto preservado depende de uma tarefa QA.");
  const plan = { mode: apply ? "APLICAR" : "SIMULAÇÃO", users_remove: REMOVE.length, keep: KEEP.map((k, i) => ({ old: k.old, new: i + 1, email: k.email })), agencies: owners, projects, payments: payments.length, chats: await prisma.chatMessage.count({ where: { sender_id: { in: REMOVE } } }) };
  console.log(JSON.stringify(plan, null, 2));
  if (!apply) return;
  const backupPath = process.env.CLEANUP_USERS_BACKUP;
  requireTrue(backupPath && process.env.CLEANUP_USERS_BACKUP_SHA256, "informe backup local validado e seu SHA256.");
  const backup = readFileSync(backupPath);
  requireTrue(backup.length > 10000 && createHash("sha256").update(backup).digest("hex") === process.env.CLEANUP_USERS_BACKUP_SHA256!.toLowerCase(), "backup ausente/divergente.");
  requireTrue(process.env.CLEANUP_USERS_CONFIRM === "EXCLUIR 20 USUARIOS E QA AUTORIZADOS", "confirmação específica ausente.");

  const matrixArgs = {
    orderBy: { id: "asc" as const },
    include: {
      versions: {
        orderBy: { id: "asc" as const },
        include: { tasks: { orderBy: { id: "asc" as const }, include: { steps: { orderBy: { id: "asc" as const } } } } },
      },
    },
  };
  const matrixBefore = digest(await prisma.catalog2Product.findMany(matrixArgs));
  const walletBefore = digest(await prisma.wallet.findMany({ orderBy: { id: "asc" } }));
  const preservedProjects = await prisma.project.findMany({ where: { id: { notIn: projectIds } }, select: { id: true, project_code: true, title: true, agency_id: true, company_id: true, partner_id: true }, orderBy: { id: "asc" } });
  const cleanPreservedUser = (u: (typeof beforeUsers)[number]) => { const { user_code, updated_at, ...data } = u; return data; };
  await prisma.$transaction(async tx => {
    requireTrue(await tx.user.count() === 27, "usuários mudaram durante a preparação.");
    await tx.taskDependency.deleteMany({ where: { project_id: { in: projectIds } } });
    await tx.catalog2ChangeOrder.deleteMany({ where: { project_id: { in: projectIds } } });
    await tx.catalog2Subscription.deleteMany({ where: { project_product: { project_id: { in: projectIds } } } });
    await tx.invoice.deleteMany({ where: { project_id: { in: projectIds } } });
    await tx.paymentItem.deleteMany({ where: { payment: { project_id: { in: projectIds } } } });
    await tx.payment.deleteMany({ where: { project_id: { in: projectIds } } });
    // Cascatas normais, com FKs LIGADAS. Qualquer vínculo impeditivo desfaz tudo.
    await tx.project.deleteMany({ where: { id: { in: projectIds } } });
    await tx.systemAlert.deleteMany({ where: { entity_type: "project", entity_id: { in: projectIds } } });
    await tx.catalog2CartItem.deleteMany({ where: { account_id: { in: AGENCIES } } });
    await tx.matchQueueEntry.deleteMany({ where: { agency_id: { in: AGENCIES } } });
    await tx.agency.deleteMany({ where: { id: { in: AGENCIES } } });
    await tx.chatMessage.deleteMany({ where: { sender_id: { in: REMOVE } } });
    await tx.chatParticipant.deleteMany({ where: { user_id: { in: REMOVE } } });
    // Perfis de execução/histórico não são apagados: deixam de ser elegíveis.
    await tx.nomade.updateMany({ where: { user_id: { in: REMOVE } }, data: { status: "inativo" } });
    const removed = await tx.user.deleteMany({ where: { id: { in: REMOVE } } });
    requireTrue(removed.count === 20, "a quantidade de usuários removidos divergiu.");
    await tx.user.updateMany({ where: { id: { in: KEEP.map(k => k.id) } }, data: { user_code: null } });
    for (let i = 0; i < KEEP.length; i++) await tx.user.update({ where: { id: KEEP[i].id }, data: { user_code: `user_${i + 1}` } });
    const after = await tx.user.findMany({ orderBy: { user_code: "asc" } });
    requireTrue(after.length === 7 && after.every((u, i) => u.id === KEEP[i].id && u.user_code === `user_${i + 1}`), "numeração final divergente.");
    for (const k of KEEP) requireTrue(digest(cleanPreservedUser(beforeUsers.find(u => u.id === k.id)!)) === digest(cleanPreservedUser(after.find(u => u.id === k.id)!)), `dados do usuário ${k.email} mudaram além do código.`);
    const matrixAfter = await tx.catalog2Product.findMany(matrixArgs);
    requireTrue(digest(matrixAfter) === matrixBefore, "produto/matriz foi alterado: desfazendo.");
    requireTrue(digest(await tx.wallet.findMany({ orderBy: { id: "asc" } })) === walletBefore, "carteiras foram alteradas: desfazendo.");
    requireTrue(digest(await tx.project.findMany({ select: { id: true, project_code: true, title: true, agency_id: true, company_id: true, partner_id: true }, orderBy: { id: "asc" } })) === digest(preservedProjects), "projeto preservado mudou: desfazendo.");
    requireTrue(await generateNextUserCode(tx) === "user_8", "próximo código incorreto.");
    console.log("Transação verificada: 7 usuários, produtos/matrizes/carteiras e projetos preservados; próximo usuário = 8.");
  }, { timeout: 60000, maxWait: 10000 });
  console.log(JSON.stringify({ kept: await prisma.user.findMany({ orderBy: { user_code: "asc" }, select: { user_code: true, name: true, email: true } }), unavailable_assignments: await unavailableSpecificAssignments(prisma, await prisma.catalog2Task.findMany({ where: { steps: { some: { leader_user_id: "qa-user-leader" } } }, include: { steps: true } })) }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

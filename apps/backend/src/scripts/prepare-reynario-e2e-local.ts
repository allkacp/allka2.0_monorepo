/** Preparo autorizado do cenário local proj_957. Não é cadastro de produção.
 * Sem senha, CNPJ inventado, termos aceitos, carteira, papel novo ou avanço de tarefa.
 * Simulação por padrão; --apply cria somente o perfil ausente e duas habilitações.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";

const db = new PrismaClient();
async function main() {
  const { database } = assertLocalDatabase(process.env.DATABASE_URL);
  if (database !== "allka") throw new Error("Este preparo é exclusivo do desenvolvimento local allka.");
  if (process.env.NODE_ENV === "production") throw new Error("Recusado em produção.");
  const user = await db.user.findUnique({ where: { email: "reynario@lamego.com.vc" }, select: { id: true, name: true, email: true, account_type: true, role: true, is_active: true } });
  if (!user || user.account_type !== "nomades" || !["nomad", "nomad_admin"].includes(user.role) || !user.is_active) throw new Error("Usuário nômade existente e ativo não confirmado.");
  const tasks = await db.projectTask.findMany({ where: { task_code: { in: ["T015720", "T015721"] } }, select: { task_code: true, name_snapshot: true, catalog2_product_id: true, project: { select: { title: true } }, project_product: { select: { product_category_snapshot: true } } } });
  if (tasks.length !== 2 || tasks.some(t => t.project.title !== "[TESTE CODEX 03-11] Ciclo completo de aprovação" || !t.catalog2_product_id)) throw new Error("As duas tarefas do cenário não foram confirmadas.");
  const skills = tasks.map(t => {
    const category = t.project_product.product_category_snapshot;
    const area = category === "Performance" ? "Performance" : category === "Soluções Web" ? "Web" : null;
    if (!area || !t.name_snapshot) throw new Error("Categoria do cenário desconhecida; não inferir habilitação.");
    return { area, categoria_produto: t.name_snapshot, produto_id: t.catalog2_product_id!, modelo_tarefa_id: null };
  });
  const existing = await db.nomade.findUnique({ where: { email: user.email }, select: { id: true, user_id: true, status: true } });
  if (existing && (existing.user_id !== user.id || existing.status !== "ativo")) throw new Error("Já existe outro vínculo/situação: interromper para revisar, sem sobrescrever.");
  console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "dry-run", user: user.name, existingProfile: existing?.id ?? null, skills, cnpj: "pendente; não preenchido", terms: "não aceitos" }));
  if (!process.argv.includes("--apply")) return;
  await db.$transaction(async tx => {
    const nomade = await tx.nomade.upsert({ where: { email: user.email }, create: { name: user.name, email: user.email, user_id: user.id, status: "ativo", is_leader: false, is_qualifier: false, terms_accepted: false }, update: {} });
    if (nomade.user_id !== user.id || nomade.is_leader) throw new Error("Perfil divergente; nada será gravado.");
    for (const skill of skills) {
      const found = await tx.nomadeHabilidade.findFirst({ where: { nomade_id: nomade.id, ...skill } });
      if (!found) await tx.nomadeHabilidade.create({ data: { nomade_id: nomade.id, ...skill, ativo: true, disponibilidade: "disponivel" } });
    }
    console.log(JSON.stringify({ preparedProfile: nomade.id, habilitacoes: await tx.nomadeHabilidade.count({ where: { nomade_id: nomade.id } }) }));
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());

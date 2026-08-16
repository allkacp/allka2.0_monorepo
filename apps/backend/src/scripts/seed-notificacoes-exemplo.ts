/**
 * seed-notificacoes-exemplo.ts
 * =============================================================
 * Popula a aba "Notificações" (SystemAlert, category="notificacao") com
 * alguns itens reais endereçados ao usuário indicado — hoje essa categoria
 * está vazia em produção local porque os tipos que a alimentam
 * (etapa_atribuida, notificacao_admin) só nascem endereçados a nômades/
 * líderes/agências durante o fluxo real de execução, nunca ao admin.
 *
 * Não é mock: são linhas reais em system_alerts, pelos mesmos tipos e
 * formato que o motor de etapas (stage-engine.ts) e o envio manual
 * (routes/notifications.ts) já geram — só criadas aqui manualmente pra dar
 * o que ver na aba enquanto o fluxo real endereçado ao admin não acontece.
 *
 * IDEMPOTENTE: cada item tem um `type` próprio (prefixo "exemplo_") que não
 * existe no fluxo real — rodar de novo não duplica, só recria o que faltar.
 *
 * Para rodar:
 *   cd apps/backend && npx tsx src/scripts/seed-notificacoes-exemplo.ts [email]
 *   (email opcional, default cp@lamego.com.vc)
 * =============================================================
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";

const EMAIL = process.argv[2] || "cp@lamego.com.vc";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`Usuário não encontrado: ${EMAIL}`);

  const umaTarefa = await prisma.projectTask.findFirst({
    where: { status: { not: "CANCELADA" } },
    select: { id: true, title: true, task_code: true },
    orderBy: { created_at: "desc" },
  });

  const agora = new Date();
  const horasAtras = (h: number) => new Date(agora.getTime() - h * 3600_000);

  const itens = [
    {
      type: "exemplo_etapa_atribuida",
      title: umaTarefa ? `Nova etapa para você: ${umaTarefa.title}` : "Nova etapa para você: Revisão de layout",
      message: umaTarefa
        ? `A etapa da tarefa "${umaTarefa.title}"${umaTarefa.task_code ? ` (${umaTarefa.task_code})` : ""} está liberada para execução.`
        : "A etapa da tarefa está liberada para execução.",
      severity: "info",
      entity_type: umaTarefa ? "project_task" : null,
      entity_id: umaTarefa?.id ?? null,
      action_url: "/admin/tarefas",
      created_at: horasAtras(1),
      is_read: false,
    },
    {
      type: "exemplo_notificacao_admin",
      title: "Bem-vindo à nova aba de Notificações",
      message: "A partir de agora, Notificações e Alertas ficam juntos no mesmo sino — cada aba mostra sua categoria.",
      severity: "info",
      entity_type: null,
      entity_id: null,
      action_url: null,
      created_at: horasAtras(3),
      is_read: false,
    },
    {
      type: "exemplo_etapa_atribuida",
      title: "Entrega aprovada",
      message: "Sua entrega mais recente foi aprovada sem pedido de ajustes.",
      severity: "info",
      entity_type: null,
      entity_id: null,
      action_url: "/admin/tarefas",
      created_at: horasAtras(20),
      is_read: false,
    },
    {
      type: "exemplo_notificacao_admin",
      title: "Novo produto publicado no catálogo",
      message: "Um novo produto ficou disponível no catálogo para contratação.",
      severity: "info",
      entity_type: null,
      entity_id: null,
      action_url: "/admin/catalogo-produtos",
      created_at: horasAtras(30),
      is_read: true,
      read_at: horasAtras(28),
    },
  ];

  let created = 0;
  let skipped = 0;
  for (const item of itens) {
    const existing = await prisma.systemAlert.findFirst({
      where: { type: item.type, user_id: user.id, title: item.title },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.systemAlert.create({
      data: { ...item, category: "notificacao", user_id: user.id },
    });
    created++;
  }

  console.log(`Notificações de exemplo para ${EMAIL}: ${created} criada(s), ${skipped} já existia(m).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

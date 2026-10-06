// TEMPORÁRIO (2026-09-30): dispara 1 aviso de cada tipo para testar os sons no banco LOCAL.
// Tudo criado aqui tem id começando com "tstsom_" e sai com `--cleanup`. Apague este arquivo depois.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ME = process.env.TEST_SOUND_EMAIL ?? "cp@lamego.com.vc";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const P = "tstsom_";

async function guardLocal() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error("DATABASE_URL não é local — abortando.");
}

async function cleanup() {
  const convs = await prisma.conversation.findMany({ where: { id: { startsWith: P } }, select: { id: true } });
  const ids = convs.map((c) => c.id);
  const m = await prisma.chatMessage.deleteMany({ where: { conversation_id: { in: ids } } });
  const pa = await prisma.chatParticipant.deleteMany({ where: { conversation_id: { in: ids } } });
  const c = await prisma.conversation.deleteMany({ where: { id: { in: ids } } });
  const a = await prisma.systemAlert.deleteMany({ where: { id: { startsWith: P } } });
  console.log(`apagado: ${a.count} avisos/alertas, ${c.count} conversa(s), ${pa.count} participante(s), ${m.count} mensagem(ns)`);
}

async function main() {
  await guardLocal();
  if (process.argv.includes("--cleanup")) return cleanup();

  const me = await prisma.user.findFirst({ where: { email: ME } });
  if (!me) throw new Error("usuário não encontrado: " + ME);
  const other = (await prisma.user.findFirst({ where: { email: "agency@allka.com.vc" } })) ?? (await prisma.user.findFirst({ where: { id: { not: me.id } } }));
  if (!other) throw new Error("não achei outro usuário para o chat");
  const stamp = Date.now();
  const alert = (n: string, category: string, severity: string, title: string, message: string) =>
    prisma.systemAlert.create({ data: { id: `${P}${n}_${stamp}`, type: "teste_som", title, message, severity, category, user_id: me.id } });
  const log = (s: string) => console.log(new Date().toLocaleTimeString("pt-BR"), s);

  log("1/5 Notificação (sino)");
  await alert("notif", "notificacao", "info", "[TESTE SOM] Notificação", "Aviso comum no sino — teste de som.");
  await sleep(40_000);

  log("2/5 Mensagem de chat");
  const conv = await prisma.conversation.create({ data: { id: `${P}conv_${stamp}`, type: "direct", title: null, created_by_id: other.id } });
  await prisma.chatParticipant.create({ data: { conversation_id: conv.id, user_id: other.id } });
  await prisma.chatParticipant.create({ data: { conversation_id: conv.id, user_id: me.id } });
  await prisma.chatMessage.create({ data: { id: `${P}msg_${stamp}`, conversation_id: conv.id, sender_id: other.id, content: "[TESTE SOM] Mensagem de chat nova" } });
  await sleep(65_000);

  log("3/5 Alerta verde");
  await alert("verde", "alerta", "info", "[TESTE SOM] Alerta verde", "Informativo, sem urgência.");
  await sleep(65_000);

  log("4/5 Alerta amarelo");
  await alert("amarelo", "alerta", "warning", "[TESTE SOM] Alerta amarelo", "Requer atenção.");
  await sleep(65_000);

  log("5/5 Alerta vermelho");
  await alert("vermelho", "alerta", "error", "[TESTE SOM] Alerta vermelho", "Crítico, exige ação rápida.");
  log("FIM — todos enviados.");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

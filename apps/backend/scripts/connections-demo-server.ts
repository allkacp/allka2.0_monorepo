// Servidor da DEMONSTRAÇÃO descartável do módulo de Conexões (base allka_conn_demo, porta 3011).
// Troca o provedor de IA por um adaptador SIMULADO de QA (texto local, sem custo e sem enviar dados a ninguém), identificado como "simulado".
import { setTaskAIAdapter } from "../src/lib/task-ai";

if (!String(process.env.DATABASE_URL).includes("allka_conn_demo")) throw new Error("Só roda na base descartável allka_conn_demo.");
setTaskAIAdapter(async ({ prompt }) => {
  let ctx: Record<string, any> = {};
  try { ctx = JSON.parse(prompt); } catch { /* texto livre */ }
  const faltas = Array.isArray(ctx.falta) && ctx.falta.length ? ` Falta: ${ctx.falta.join(" ")}` : "";
  return { text: `Resumo em linguagem simples (orientação simulada de QA): ${ctx.resumo ?? "pendência de conexão"}.${faltas} Próximo passo sugerido: ${ctx.proximo_passo ?? "seguir as instruções"}. Eu não valido a conexão nem libero a atividade — isso depende de uma pessoa autorizada.`, missing_information: [], promptTokens: 0, completionTokens: 0 };
}, "simulado-qa");
void import("../src/index");

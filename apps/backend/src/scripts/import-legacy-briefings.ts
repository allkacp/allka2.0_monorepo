/**
 * import-legacy-briefings.ts — Importa as respostas de briefing da plataforma
 * antiga (`task_answered_question`) como TaskBriefingAnswer.
 *
 * É o conteúdo que o cliente preencheu ao lançar cada tarefa: sem ele, a tarefa
 * importada chega ao nômade sem o que executar. Na base antiga são 65.890
 * respostas; aqui entram as das tarefas efetivamente importadas.
 *
 * Anexos: a resposta antiga podia carregar um arquivo (publicUrl/privateUrl).
 * Os binários ficaram no servidor antigo, então só a referência é preservada,
 * no campo `files` — o link pode ou não continuar de pé, mas perder o registro
 * de que havia anexo seria pior.
 *
 * Idempotente: TaskBriefingAnswer tem unique (project_task_id, question_key), e
 * a key é derivada do id da pergunta antiga.
 *   npx tsx src/scripts/import-legacy-briefings.ts [--apply]
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

const LEGACY_DIR = path.resolve(__dirname, "../../../../../allka antigo");
const OPS = JSON.parse(
  fs.readFileSync(path.join(LEGACY_DIR, "operacao-tarefas-legado.json"), "utf8"),
);
const CAT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../../produtos-modelos-questionarios.json"),
    "utf8",
  ),
);

function htmlToText(html: unknown): string {
  if (!html) return "";
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function main() {
  console.log(`▶ Briefings respondidos — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const respostas = OPS.data.task_answered_question ?? [];
  console.log(`respostas na base antiga: ${respostas.length}`);

  // Texto da pergunta: o registro antigo guarda só o questionId.
  const perguntas = new Map<number, any>(CAT.question.map((q: any) => [q.id, q]));

  // Só tarefas que foram importadas têm onde pendurar resposta.
  const tarefas = await prisma.projectTask.findMany({
    where: { legacy_id: { not: null } },
    select: { id: true, legacy_id: true },
  });
  const tarefaPorLegacy = new Map(tarefas.map((t) => [t.legacy_id!, t.id]));
  console.log(`tarefas importadas: ${tarefaPorLegacy.size}`);

  // Agrupa por tarefa+pergunta: a base antiga repete a linha quando a resposta
  // tinha mais de um anexo, e o modelo novo é uma linha por pergunta.
  const porChave = new Map<string, any[]>();
  let semTarefa = 0;
  for (const r of respostas) {
    const taskId = tarefaPorLegacy.get(r.taskId);
    if (!taskId) {
      semTarefa++;
      continue;
    }
    const chave = `${taskId}::q${r.questionId}`;
    porChave.set(chave, [...(porChave.get(chave) ?? []), r]);
  }

  console.log(
    `respostas de tarefas importadas: ${respostas.length - semTarefa} → ${porChave.size} perguntas respondidas`,
  );
  console.log(`descartadas (tarefa fora do escopo importado): ${semTarefa}`);

  if (!APPLY) {
    const exemplo = [...porChave.entries()][0];
    if (exemplo) {
      const q = perguntas.get(exemplo[1][0].questionId);
      console.log(
        `\nexemplo: "${htmlToText(q?.name).slice(0, 60)}…" → "${String(exemplo[1][0].answer).slice(0, 60)}…"`,
      );
    }
    console.log("\n(dry-run — nada foi escrito. Rode com --apply.)");
    return;
  }

  let criadas = 0;
  let atualizadas = 0;
  let lote: any[] = [];

  for (const [chave, linhas] of porChave) {
    const [projectTaskId, qPart] = chave.split("::q");
    const questionId = Number(qPart);
    const q = perguntas.get(questionId);

    const texto = linhas
      .map((l) => String(l.answer ?? "").trim())
      .filter(Boolean)
      .join("\n");
    const arquivos = linhas
      .filter((l) => l.publicUrl || l.privateUrl || l.originalFileName)
      .map((l) => ({
        name: l.originalFileName ?? l.fileName ?? "anexo",
        url: l.publicUrl ?? l.privateUrl ?? null,
        size: l.size ?? null,
        mime_type: l.fileContentType ?? null,
        // Marca a origem: o binário está no servidor antigo, o link pode
        // não responder mais.
        origem: "plataforma-antiga",
      }));

    lote.push({
      project_task_id: projectTaskId,
      question_key: `legacy_q${questionId}`,
      question_text: htmlToText(q?.name) || `Pergunta ${questionId}`,
      answer: texto || null,
      files: arquivos.length ? JSON.stringify(arquivos) : null,
    });

    if (lote.length >= 500) {
      const r = await gravarLote(lote);
      criadas += r.criadas;
      atualizadas += r.atualizadas;
      lote = [];
      process.stdout.write(`\r  gravadas: ${criadas + atualizadas}`);
    }
  }
  if (lote.length) {
    const r = await gravarLote(lote);
    criadas += r.criadas;
    atualizadas += r.atualizadas;
  }

  console.log(`\n\n✅ ${criadas} respostas criadas · ${atualizadas} atualizadas`);
  const comBriefing = await prisma.projectTask.count({
    where: { briefing_answers: { some: {} } },
  });
  console.log(`tarefas com briefing preenchido: ${comBriefing}`);
}

/** createMany ignora duplicata pelo unique; o que sobra é atualizado. */
async function gravarLote(lote: any[]) {
  const res = await prisma.taskBriefingAnswer.createMany({ data: lote, skipDuplicates: true });
  let atualizadas = 0;
  if (res.count < lote.length) {
    for (const item of lote) {
      const existente = await prisma.taskBriefingAnswer.findFirst({
        where: { project_task_id: item.project_task_id, question_key: item.question_key },
      });
      if (existente) {
        await prisma.taskBriefingAnswer.update({
          where: { id: existente.id },
          data: { question_text: item.question_text, answer: item.answer, files: item.files },
        });
        atualizadas++;
      }
    }
  }
  return { criadas: res.count, atualizadas };
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

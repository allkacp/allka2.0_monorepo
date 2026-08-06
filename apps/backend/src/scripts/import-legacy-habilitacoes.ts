/**
 * import-legacy-habilitacoes.ts — traz as habilitações de nômade da plataforma
 * antiga para `NomadeHabilidade`.
 *
 * Por que isso importa: a seleção automática de nômade
 * (src/lib/selecionar-nomade.ts) procura em `NomadeHabilidade` quem pode
 * executar cada tarefa. A tabela está vazia, então nenhuma tarefa encontra
 * candidato — todas caem em AGUARDANDO_NOMADE e precisam de atribuição manual.
 *
 * Fonte: `nomad_enabled_task_template` do dump, já extraída para
 * `../allka antigo/cadastros-legado.json` por scripts/extract-legacy-people.js.
 * Só entram as linhas com `taskTamplateEnabled = 1` — as outras são tentativas
 * de habilitação que não foram concedidas.
 *
 * Mapeamento:
 *   nomadId        → Nomade.legacy_id
 *   taskTemplateId → CatalogTask.legacy_id  (vira `modelo_tarefa_id`)
 *   taskAssignmentStatus 1|2 → disponibilidade "disponivel"|"pausado"
 *
 * A área sai da categoria do modelo, com uma exceção: "Design e Multimedia" do
 * legado é um balaio com Design, Audiovisual E redação dentro (as "Legendas
 * para Redes Sociais" e os "Copy para Vídeo" moram lá). Importar tudo como
 * Design mandaria 693 habilitações de texto para designers, então essa
 * categoria é reclassificada pelo nome do modelo — ver `classificarMultimedia`.
 *
 * Idempotente, mas NÃO por causa da unique do modelo: ela inclui `produto_id`,
 * que aqui é sempre nulo, e no MySQL um índice único trata cada NULL como
 * valor distinto — `skipDuplicates` não pega nada e a reexecução duplicava
 * tudo (verificado: 1.684 viraram 3.368 na segunda rodada). A deduplicação é
 * feita em código, comparando com o que já existe no banco.
 *
 * Uso:
 *   npx tsx src/scripts/import-legacy-habilitacoes.ts           # simulação
 *   npx tsx src/scripts/import-legacy-habilitacoes.ts --apply   # grava
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

const ORIGEM = path.resolve(
  __dirname,
  "../../../../../allka antigo/cadastros-legado.json",
);

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * "Criativo Estático ou Motion": o nome diz que o nômade entrega os dois.
 * Decisão de 2026-08-06 — vai para Design, e o ajuste fino fica para a tela
 * do admin. Verificado antes de decidir: são 17 modelos, 121 habilitações.
 */
const AMBIGUO_VIRA_DESIGN = ["estatico ou motion", "estatico ou animado"];

/** Escrita, mesmo quando o assunto é vídeo — "Copy para Vídeo" é redação. */
const CONTEUDO = [
  "copy", "legenda", "legendas", "redacao", "artigo", "artigos",
  "criacao de conteudo", "palavras", "roteiro", "roteiriza", "texto",
  "newsletter", "e-mail marketing", "blog",
];

/** Produção audiovisual de fato. */
const AUDIOVISUAL = [
  "video", "motion", "animacao", "animado", "animada", "reels", "reel",
  "tiktok", "shorts", "youtube", "captacao", "filmagem", "gravacao",
  "podcast", "audio", "locucao", "trilha", "vinheta", "gif",
  "after effects", "premiere",
];

function classificarMultimedia(nome: string): string {
  const n = normalizar(nome);
  if (AMBIGUO_VIRA_DESIGN.some((p) => n.includes(p))) return "Design";
  // Conteúdo é testado primeiro: senão "Copy para Vídeo" cairia em Audiovisual.
  if (CONTEUDO.some((p) => n.includes(p))) return "Conteúdo";
  if (AUDIOVISUAL.some((p) => n.includes(p))) return "Audiovisual";
  return "Design";
}

/** Categoria do modelo → área canônica (ver routes/habilidades.ts). */
function resolverArea(categoria: string | null, nomeModelo: string): string | null {
  switch (categoria) {
    case "Design e Multimedia":
      return classificarMultimedia(nomeModelo);
    case "Soluções Web":
      return "Web";
    case "Mídias e Conteúdo":
      return "Conteúdo";
    case "Performance e Anúncios Patrocinados":
      return "Performance";
    case "Estratégico e Vendas":
      return "Estratégico";
    default:
      return null;
  }
}

async function main() {
  console.log(`▶ Habilitações da plataforma antiga — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const bruto = JSON.parse(readFileSync(ORIGEM, "utf8"));
  const linhas: any[] = bruto.data?.["nomad_enabled_task_template"] ?? [];
  if (linhas.length === 0) {
    console.error(`❌ Nenhuma linha em ${ORIGEM}. Rode scripts/extract-legacy-people.js.`);
    process.exit(1);
  }

  const concedidas = linhas.filter((l) => String(l.taskTamplateEnabled) === "1");
  console.log(`  linhas na origem: ${linhas.length} (${concedidas.length} concedidas)`);

  const nomades = await prisma.nomade.findMany({
    where: { legacy_id: { not: null } },
    select: { id: true, legacy_id: true },
  });
  const modelos = await prisma.catalogTask.findMany({
    where: { legacy_id: { not: null } },
    select: { id: true, name: true, category: true, legacy_id: true },
  });
  const mapNomade = new Map(nomades.map((n) => [n.legacy_id!, n.id]));
  const mapModelo = new Map(modelos.map((m) => [m.legacy_id!, m]));

  const registros: {
    nomade_id: string;
    area: string;
    categoria_produto: string;
    modelo_tarefa_id: string;
    disponibilidade: string;
    ativo: boolean;
  }[] = [];

  let semNomade = 0;
  let semModelo = 0;
  let semArea = 0;
  const porArea = new Map<string, number>();
  const nomadesAtingidos = new Set<string>();

  for (const l of concedidas) {
    const nomadeId = mapNomade.get(Number(l.nomadId));
    if (!nomadeId) { semNomade++; continue; }
    const modelo = mapModelo.get(Number(l.taskTemplateId));
    if (!modelo) { semModelo++; continue; }
    const area = resolverArea(modelo.category, modelo.name);
    if (!area) { semArea++; continue; }

    registros.push({
      nomade_id: nomadeId,
      area,
      categoria_produto: modelo.category ?? "",
      modelo_tarefa_id: modelo.id,
      // 1 = RECEBER TAREFAS, 2 = PAUSAR RECEBIMENTO (comentário do schema antigo)
      disponibilidade: String(l.taskAssignmentStatus) === "2" ? "pausado" : "disponivel",
      ativo: true,
    });
    porArea.set(area, (porArea.get(area) ?? 0) + 1);
    nomadesAtingidos.add(nomadeId);
  }

  console.log(`\n  descartadas:`);
  console.log(`    sem nômade correspondente: ${semNomade}`);
  console.log(`    sem modelo correspondente: ${semModelo}`);
  console.log(`    categoria sem área: ${semArea}`);

  console.log(`\n  a importar: ${registros.length} habilitações para ${nomadesAtingidos.size} nômades`);
  [...porArea.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([a, n]) => console.log(`    ${String(n).padStart(5)}  ${a}`));

  const pausadas = registros.filter((r) => r.disponibilidade === "pausado").length;
  console.log(`\n  disponíveis: ${registros.length - pausadas} | pausadas: ${pausadas}`);

  const antes = await prisma.nomadeHabilidade.count();
  console.log(`\n  NomadeHabilidade antes: ${antes}`);

  // Deduplicação em código, e não via skipDuplicates: a unique do modelo tem
  // `produto_id` (sempre nulo aqui) e o MySQL considera cada NULL distinto,
  // então o banco aceitaria a mesma habilitação de novo sem reclamar.
  const existentes = await prisma.nomadeHabilidade.findMany({
    select: { nomade_id: true, area: true, categoria_produto: true, modelo_tarefa_id: true },
  });
  const chave = (r: { nomade_id: string; area: string; categoria_produto: string | null; modelo_tarefa_id: string | null }) =>
    `${r.nomade_id}|${r.area}|${r.categoria_produto ?? ""}|${r.modelo_tarefa_id ?? ""}`;
  const jaExiste = new Set(existentes.map(chave));

  const novos = registros.filter((r) => !jaExiste.has(chave(r)));
  console.log(`  já existentes (serão puladas): ${registros.length - novos.length}`);
  console.log(`  realmente novas: ${novos.length}`);

  if (!APPLY) {
    console.log("\n◻ dry-run — nada foi escrito. Rode com --apply.");
    await prisma.$disconnect();
    return;
  }

  // Em lotes: um createMany de 1.700 linhas passa do limite de placeholders.
  const LOTE = 200;
  let gravadas = 0;
  for (let i = 0; i < novos.length; i += LOTE) {
    const r = await prisma.nomadeHabilidade.createMany({ data: novos.slice(i, i + LOTE) });
    gravadas += r.count;
  }

  const depois = await prisma.nomadeHabilidade.count();
  console.log(`\n✅ gravadas: ${gravadas} | NomadeHabilidade agora: ${depois}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌", e);
  await prisma.$disconnect();
  process.exit(1);
});

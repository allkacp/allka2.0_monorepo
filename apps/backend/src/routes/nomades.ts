import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission } from "../middleware/auth";
import { concluirEtapa, atribuirExecutorDaEtapa } from "../lib/stage-engine";
import { validate, parsePagination } from "../middleware/validate";
import { writeAccessAudit } from "../lib/product-feedback-service";
// Lista canônica de áreas — mesma fonte usada pelo cadastro do admin, para a
// tela do nômade não inventar um universo próprio de habilitações.
import { AREAS_CANONICAS } from "./habilidades";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  cnpj: z.string().optional(),
  whatsapp: z.string().optional(),
  avatar: z.string().optional(),
  level: z
    .enum(["bronze", "silver", "gold", "platinum", "diamond", "leader"])
    .default("bronze"),
  status: z
    .enum(["ativo", "inativo", "aguardando_aprovacao", "reprovado", "pausado"])
    .default("aguardando_aprovacao"),
  score: z.number().int().min(0).default(0),
  areas_of_interest: z.string().optional(),
  is_leader: z.boolean().default(false),
  leader_id: z.string().optional(),
  min_monthly_goal: z.number().optional(),
  terms_accepted: z.boolean().default(false),
  user_id: z.string().optional(),
});

const updateSchema = createSchema.partial();

// GET /api/nomades
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const level = req.query.level as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (level) where["level"] = level;
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.nomade.count({ where }),
      prisma.nomade.findMany({
        where,
        include: {
          _count: {
            select: {
              qualifications: true,
              task_executions: true,
              wallet_transactions: true,
            },
          },
          // Áreas em que a pessoa está habilitada. A tela de admin filtrava
          // por "produtos/categorias/tipos de tarefa" que esta rota nunca
          // devolveu — filtros que não filtravam nada. Área é o dado real
          // equivalente, e é o mesmo que a seleção automática usa.
          habilidades: {
            where: { ativo: true },
            select: { area: true, disponibilidade: true },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({
      data: data.map((n) => {
        const { habilidades, ...resto } = n;
        return {
          ...resto,
          // Lista enxuta para a tela: as áreas distintas, e quantas delas
          // estão de fato recebendo tarefa.
          areas: [...new Set(habilidades.map((h) => h.area))].sort(),
          areas_disponiveis: [
            ...new Set(
              habilidades.filter((h) => h.disponibilidade === "disponivel").map((h) => h.area),
            ),
          ].sort(),
        };
      }),
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/nomades/me — perfil do nômade logado (busca por user_id)
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      include: {
        qualifications: true,
        bank_account: true,
        _count: { select: { task_executions: true, wallet_transactions: true } },
      },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }
    res.json(nomade);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/nomades/me ────────────────────────────────────────────────────
// O nômade edita o próprio cadastro.
//
// Schema separado do `updateSchema` de propósito: aquele é o do admin e aceita
// `level`, `score`, `status`, `is_leader`, `leader_id`. Reusá-lo aqui deixaria
// qualquer nômade se promover a Diamond ou se marcar como líder com um PATCH.
// O que a pessoa muda é contato, endereço, chave PIX e preferências — nível e
// pontuação são consequência do trabalho, não campo de formulário.

// `.strict()`: campo fora da lista faz o PATCH inteiro falhar com 400, em vez
// de ser descartado em silêncio. O Zod já protegia (mandar `level: "diamond"`
// nunca promoveu ninguém, a chave era ignorada) — mas responder 200 a um
// pedido que não foi atendido faz quem chamou acreditar que funcionou.
const meuPerfilSchema = z
  .object({
    whatsapp: z.string().optional(),
    avatar: z.string().optional(),
    address: z.string().optional(),
    number: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    pix_key: z.string().optional(),
    pix_key_type: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]).optional(),
    areas_of_interest: z.string().optional(),
    min_monthly_goal: z.number().min(0).nullable().optional(),
  })
  .strict();

router.patch("/me", verifyToken, validate(meuPerfilSchema), async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }

    const atualizado = await prisma.nomade.update({
      where: { id: nomade.id },
      data: req.body,
    });
    res.json(atualizado);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/nomades/me/programa ─────────────────────────────────────────────
// A escada de níveis e onde o nômade está nela.
//
// Os níveis vêm de `NomadeLevel` (mesma fonte do cadastro do admin em
// /api/nomade-levels), não de uma lista fixa na tela — senão a régua que o
// nômade vê pode divergir da que a plataforma aplica. O progresso é calculado
// aqui porque depende de comparar o score dele com as faixas.

router.get("/me/programa", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: {
        id: true,
        level: true,
        score: true,
        tasks_completed_total: true,
        tasks_completed_quarter: true,
        performance_avg_rating: true,
        performance_on_time: true,
        performance_rejection_rate: true,
        registration_date: true,
      },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }

    const levels = await prisma.nomadeLevel.findMany({ orderBy: { min_score: "asc" } });

    // `benefits` e `requirements` são JSON em texto, e com formatos
    // diferentes: benefits é lista de strings, requirements é lista de
    // {label, value}. JSON malformado vira lista vazia em vez de derrubar a
    // tela inteira.
    const parseJson = (raw: string | null): unknown[] => {
      if (!raw) return [];
      try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    };

    const parseBeneficios = (raw: string | null): string[] =>
      parseJson(raw).map((b) => (typeof b === "string" ? b : String((b as any)?.label ?? "")))
        .filter(Boolean);

    const parseRequisitos = (raw: string | null): { label: string; value: string }[] =>
      parseJson(raw)
        .map((r) =>
          typeof r === "string"
            ? { label: r, value: "" }
            : { label: String((r as any)?.label ?? ""), value: String((r as any)?.value ?? "") },
        )
        .filter((r) => r.label);

    const atualIndex = levels.findIndex((l) => l.slug === nomade.level);
    const proximo = atualIndex >= 0 ? levels[atualIndex + 1] : levels[0];

    // Progresso dentro da faixa ATUAL, não do zero: o que interessa é quanto
    // falta para o próximo, não quanto já se andou desde o começo de tudo.
    let progresso = 0;
    if (proximo) {
      const base = atualIndex >= 0 ? levels[atualIndex]!.min_score : 0;
      const alvo = proximo.min_score;
      progresso = alvo > base ? Math.min(100, Math.max(0, ((nomade.score - base) / (alvo - base)) * 100)) : 0;
    } else {
      progresso = 100; // último nível
    }

    res.json({
      nomade: {
        level: nomade.level,
        score: nomade.score,
        tarefas_total: nomade.tasks_completed_total,
        tarefas_trimestre: nomade.tasks_completed_quarter,
        nota_media: nomade.performance_avg_rating,
        no_prazo: nomade.performance_on_time,
        taxa_rejeicao: nomade.performance_rejection_rate,
        membro_desde: nomade.registration_date,
      },
      progresso: {
        percentual: Math.round(progresso),
        pontos_faltando: proximo ? Math.max(0, proximo.min_score - nomade.score) : 0,
        proximo_nivel: proximo?.name ?? null,
      },
      niveis: levels.map((l, i) => ({
        slug: l.slug,
        nome: l.name,
        min_score: l.min_score,
        max_score: l.max_score,
        cor: l.color,
        icone: l.icon,
        beneficios: parseBeneficios(l.benefits),
        requisitos: parseRequisitos(l.requirements),
        atual: l.slug === nomade.level,
        alcancado: atualIndex >= 0 ? i <= atualIndex : false,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/nomades/me/tarefas ──────────────────────────────────────────────
// O trabalho do nômade autenticado.
//
// Existe porque o nômade não tem acesso a /api/project-tasks (getTaskScopeWhere
// nega "nomades" de propósito) e porque, com o motor de etapas, o trabalho dele
// pode estar na ETAPA e não na tarefa: a tarefa é de um produto inteiro, mas
// quem executa o "Layout" é uma pessoa e o "HTML" é outra. Buscar só por
// nomade_responsavel_id esconderia metade do que ele tem para fazer.
//
// Cada tarefa devolvida traz `minhas_etapas` — só as etapas atribuídas a ele —
// e `etapa_atual`, a que está aberta agora, que é onde a ação acontece.

const STATUS_ABERTO = [
  "LIBERADA_PARA_EXECUCAO",
  "EM_EXECUCAO",
  "EM_REVISAO",
  "MELHORIAS_FINAIS",
  "AGUARDANDO_NOMADE",
];

router.get("/me/tarefas", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true, name: true },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }

    const escopo = (req.query.escopo as string) ?? "abertas";

    const where: any = {
      OR: [
        { nomade_responsavel_id: nomade.id },
        { stages: { some: { nomade_id: nomade.id } } },
      ],
    };
    if (escopo === "abertas") where.status = { in: STATUS_ABERTO };
    else if (escopo === "concluidas") where.status = { in: ["CONCLUIDA", "APROVADA"] };

    const tarefas = await prisma.projectTask.findMany({
      where,
      orderBy: [{ due_date: "asc" }, { created_at: "desc" }],
      take: 200,
      include: {
        project: { select: { id: true, project_code: true, title: true } },
        catalog_task: { select: { name: true, category: true } },
        stages: { orderBy: [{ ordem: "asc" }, { created_at: "asc" }] },
      },
    });

    const dados = tarefas.map((t) => {
      const minhas = t.stages.filter((e) => e.nomade_id === nomade.id);
      const atual =
        minhas.find((e) => e.status === "EM_ANDAMENTO") ??
        minhas.find((e) => e.status === "AGUARDANDO_EXECUTOR") ??
        null;
      // Valor do trabalho dele nesta tarefa: soma só das etapas que são dele.
      const valor = minhas.reduce((s, e) => s + (e.valor_nomade ?? 0), 0);
      const { stages, ...tarefa } = t;
      return {
        ...tarefa,
        total_etapas: stages.length,
        minhas_etapas: minhas,
        etapa_atual: atual,
        valor_previsto: valor,
        // Sem etapa própria, o nômade responde pela tarefa inteira (fluxo
        // antigo, ainda válido para tarefa sem etapas).
        responsavel_pela_tarefa: t.nomade_responsavel_id === nomade.id,
      };
    });

    res.json({ data: dados, total: dados.length, nomade });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/nomades/me/etapas/:stageId/concluir ───────────────────────────
// O nômade entrega a etapa dele. Passa pelo mesmo motor usado pelo admin e
// pelo líder — a etapa seguinte abre, herda o executor se for o caso, e a
// tarefa vai para aprovação quando não sobra etapa.

router.patch("/me/etapas/:stageId/concluir", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }

    // A etapa tem de ser dele: sem esta checagem, qualquer nômade autenticado
    // concluiria etapa de qualquer outro.
    const etapa = await prisma.projectTaskStage.findFirst({
      where: { id: req.params.stageId as string, nomade_id: nomade.id },
    });
    if (!etapa) {
      res.status(404).json({ error: "Etapa não encontrada ou não atribuída a você" });
      return;
    }
    if (etapa.status !== "EM_ANDAMENTO") {
      res.status(422).json({
        error: `Etapa com status "${etapa.status}" não pode ser concluída.`,
        current_status: etapa.status,
      });
      return;
    }
    if (etapa.exige_anexo) {
      // Conta o anexo DESTA etapa, não da tarefa: numa tarefa de três etapas,
      // contar por tarefa faria a entrega da primeira liberar a terceira.
      const anexos = await prisma.taskAttachment.count({
        where: { project_task_stage_id: etapa.id, type: "delivery" },
      });
      if (anexos === 0) {
        res.status(422).json({
          error: "Esta etapa exige o arquivo de entrega antes de ser concluída.",
          code: "ANEXO_OBRIGATORIO",
        });
        return;
      }
    }

    const resultado = await prisma.$transaction((tx) =>
      concluirEtapa(tx, etapa.id, { userId: req.user!.id }),
    );
    if (resultado.proxima?.status === "AGUARDANDO_EXECUTOR") {
      atribuirExecutorDaEtapa(resultado.proxima.stageId).catch((err) =>
        console.error("[stage-engine] atribuir executor:", err),
      );
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/nomades/me/resumo ───────────────────────────────────────────────
// Números do nômade para o dashboard, ganhos e histórico.
//
// Tudo é calculado a partir das ETAPAS dele, não das tarefas: é a etapa que
// tem o valor (`valor_nomade`) e é ela que ele executa. Somar por tarefa
// contaria trabalho de outras pessoas.

router.get("/me/resumo", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: {
        id: true,
        name: true,
        level: true,
        status: true,
        score: true,
        performance_avg_rating: true,
        tasks_completed_total: true,
      },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }

    const minhas = await prisma.projectTaskStage.findMany({
      where: { nomade_id: nomade.id },
      select: {
        id: true,
        titulo: true,
        status: true,
        valor_nomade: true,
        horas_execucao: true,
        prazo_execucao: true,
        concluida_em: true,
        project_task: {
          select: {
            task_code: true,
            title: true,
            project: { select: { title: true } },
          },
        },
      },
      orderBy: { concluida_em: "desc" },
    });

    const agora = new Date();
    const concluidas = minhas.filter((e) => e.status === "CONCLUIDA");
    const emAberto = minhas.filter((e) =>
      ["EM_ANDAMENTO", "AGUARDANDO_EXECUTOR"].includes(e.status),
    );
    const atrasadas = emAberto.filter((e) => e.prazo_execucao && e.prazo_execucao < agora);

    const soma = (lista: typeof minhas) =>
      lista.reduce((s, e) => s + (e.valor_nomade ?? 0), 0);

    // "Este mês" pelo mês corrente, não últimos 30 dias: é como a pessoa
    // pensa no próprio ganho.
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const doMes = concluidas.filter((e) => e.concluida_em && e.concluida_em >= inicioMes);

    // Série dos últimos 7 meses. Somada aqui, e não na tela, porque
    // `historico` abaixo sai truncado em 50 itens — agrupar por mês em cima da
    // lista truncada daria um gráfico errado justamente para quem entrega mais.
    // O mês vai como "AAAA-MM"; o rótulo é decisão de quem exibe.
    const porMes = [];
    for (let i = 6; i >= 0; i--) {
      const inicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
      const doPeriodo = concluidas.filter(
        (e) => e.concluida_em && e.concluida_em >= inicio && e.concluida_em < fim,
      );
      porMes.push({
        mes: `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}`,
        valor: soma(doPeriodo),
        etapas: doPeriodo.length,
      });
    }

    res.json({
      nomade,
      etapas: {
        total: minhas.length,
        concluidas: concluidas.length,
        em_aberto: emAberto.length,
        atrasadas: atrasadas.length,
      },
      ganhos: {
        total_concluido: soma(concluidas),
        no_mes: soma(doMes),
        previsto_em_aberto: soma(emAberto),
        horas_concluidas: concluidas.reduce((s, e) => s + (e.horas_execucao ?? 0), 0),
        por_mes: porMes,
      },
      historico: concluidas.slice(0, 50).map((e) => ({
        id: e.id,
        titulo: e.titulo,
        tarefa: e.project_task.title,
        task_code: e.project_task.task_code,
        projeto: e.project_task.project?.title ?? null,
        valor: e.valor_nomade,
        horas: e.horas_execucao,
        concluida_em: e.concluida_em,
        // Prazo vai junto para a tela poder dizer se saiu no prazo. Sem etapa
        // sem prazo definido não dá para afirmar atraso — daí o nulo, que a
        // tela trata como "não avaliável" em vez de "atrasou".
        prazo_execucao: e.prazo_execucao,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/nomades/me/habilidades ──────────────────────────────────────────
// As habilitações do nômade, cruzadas com as áreas que existem na plataforma.
//
// Duas coisas importam aqui e nenhuma é óbvia:
//
// 1. A fonte é `NomadeHabilidade`, não `Qualification`. O modelo Qualification
//    é legado — `selecionar-nomade.ts` só recorre a ele como fallback quando
//    não acha nenhuma habilidade. Ler o legado seria mostrar ao nômade uma
//    situação diferente da que decide se ele recebe tarefa.
//
// 2. "Não habilitado" não é uma linha no banco, é a AUSÊNCIA de linha. Por
//    isso o cruzamento acontece aqui: a tela sozinha não teria como saber
//    quais áreas existem para dizer o que falta. A lista canônica vive em
//    routes/habilidades.ts e é a mesma usada pelo cadastro do admin.

router.get("/me/habilidades", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }

    const minhas = await prisma.nomadeHabilidade.findMany({
      where: { nomade_id: nomade.id },
      orderBy: [{ area: "asc" }, { created_at: "asc" }],
    });

    const areas = AREAS_CANONICAS.map((area) => {
      const daArea = minhas.filter((h) => h.area === area.slug);
      const ativas = daArea.filter((h) => h.ativo);

      // O que vale é poder receber tarefa: ativo E disponível. Uma habilidade
      // ativa mas com disponibilidade "pausado" não entra na seleção
      // automática, então mostrá-la como habilitada enganaria.
      let status: "habilitado" | "pausado" | "indisponivel" | "nao_habilitado";
      if (daArea.length === 0) status = "nao_habilitado";
      else if (ativas.some((h) => h.disponibilidade === "disponivel")) status = "habilitado";
      else if (ativas.some((h) => h.disponibilidade === "pausado")) status = "pausado";
      else status = "indisponivel";

      const notas = ativas.map((h) => h.nota_media).filter((n) => n > 0);

      return {
        slug: area.slug,
        label: area.label,
        categorias: area.categorias,
        status,
        total: daArea.length,
        nota_media: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
        habilidades: daArea.map((h) => ({
          id: h.id,
          categoria_produto: h.categoria_produto,
          nota_media: h.nota_media,
          disponibilidade: h.disponibilidade,
          ativo: h.ativo,
          desde: h.created_at,
        })),
      };
    });

    res.json({
      areas,
      resumo: {
        habilitado: areas.filter((a) => a.status === "habilitado").length,
        pausado: areas.filter((a) => a.status === "pausado").length,
        indisponivel: areas.filter((a) => a.status === "indisponivel").length,
        nao_habilitado: areas.filter((a) => a.status === "nao_habilitado").length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/nomades/me/disponiveis ──────────────────────────────────────────
// O que o nômade pode pegar para executar.
//
// São as etapas que o motor abriu e ficaram sem executor
// (`AGUARDANDO_EXECUTOR`) — a seleção automática não achou ninguém, ou a etapa
// não pedia continuidade. Ficavam paradas até alguém do time atribuir na mão;
// aqui o próprio nômade se candidata.
//
// Filtro por afinidade: só aparecem as etapas cuja categoria bate com as
// habilidades dele. Sem isso a lista viraria um balaio de tudo que está aberto
// na plataforma, inclusive de áreas que ele não executa.

router.get("/me/disponiveis", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: {
        id: true,
        status: true,
        areas_of_interest: true,
        habilidades: { where: { ativo: true }, select: { area: true, categoria_produto: true } },
      },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }
    // Nômade fora de operação não recebe oferta de trabalho.
    if (nomade.status !== "ativo") {
      res.json({ data: [], total: 0, motivo: "cadastro_inativo" });
      return;
    }

    const areas = new Set<string>();
    for (const h of nomade.habilidades) {
      if (h.area) areas.add(h.area.toLowerCase());
      if (h.categoria_produto) areas.add(h.categoria_produto.toLowerCase());
    }
    try {
      for (const a of JSON.parse(nomade.areas_of_interest || "[]")) {
        if (typeof a === "string") areas.add(a.toLowerCase());
      }
    } catch {
      /* areas_of_interest pode estar em texto livre; ignora */
    }

    const abertas = await prisma.projectTaskStage.findMany({
      where: {
        status: "AGUARDANDO_EXECUTOR",
        executor_type: "nomad",
        nomade_id: null,
        project_task: { status: { notIn: ["CANCELADA", "CONCLUIDA"] } },
      },
      orderBy: [{ prazo_execucao: "asc" }, { created_at: "asc" }],
      take: 100,
      include: {
        project_task: {
          select: {
            id: true,
            task_code: true,
            title: true,
            category_snapshot: true,
            due_date: true,
            project: { select: { title: true } },
            catalog_task: { select: { name: true, category: true, description: true } },
          },
        },
      },
    });

    // Sem habilidade cadastrada, mostra tudo: é melhor ver trabalho a mais do
    // que ficar com a tela vazia por falta de cadastro.
    const combina = (e: (typeof abertas)[number]) => {
      if (areas.size === 0) return true;
      const alvo = [
        e.categoria,
        e.project_task.category_snapshot,
        e.project_task.catalog_task?.category,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      return alvo.some((c) => [...areas].some((a) => c.includes(a) || a.includes(c)));
    };

    const dados = abertas.filter(combina).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      descricao: e.descricao ?? e.project_task.catalog_task?.description ?? null,
      categoria: e.categoria ?? e.project_task.catalog_task?.category ?? null,
      prazo_execucao: e.prazo_execucao,
      horas_execucao: e.horas_execucao,
      valor_nomade: e.valor_nomade,
      exige_anexo: e.exige_anexo,
      tarefa: {
        id: e.project_task.id,
        task_code: e.project_task.task_code,
        title: e.project_task.title,
        projeto: e.project_task.project?.title ?? null,
      },
    }));

    res.json({ data: dados, total: dados.length, filtradas_por_afinidade: areas.size > 0 });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/nomades/me/etapas/:stageId/aceitar ────────────────────────────
// O nômade assume uma etapa aberta.

router.patch("/me/etapas/:stageId/aceitar", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true, status: true },
    });
    if (!nomade) {
      res.status(404).json({ error: "Perfil nômade não encontrado" });
      return;
    }
    if (nomade.status !== "ativo") {
      res.status(403).json({ error: "Cadastro inativo não pode assumir tarefas." });
      return;
    }

    // updateMany com as condições no WHERE resolve a corrida entre dois
    // nômades aceitando a mesma etapa: o segundo encontra 0 linhas em vez de
    // sobrescrever o primeiro.
    const r = await prisma.projectTaskStage.updateMany({
      where: { id: req.params.stageId as string, status: "AGUARDANDO_EXECUTOR", nomade_id: null },
      data: { nomade_id: nomade.id, status: "EM_ANDAMENTO", iniciada_em: new Date() },
    });
    if (r.count === 0) {
      res.status(409).json({ error: "Esta etapa já foi assumida por outra pessoa." });
      return;
    }

    const etapa = await prisma.projectTaskStage.findUniqueOrThrow({
      where: { id: req.params.stageId as string },
      include: { project_task: { select: { id: true, status: true } } },
    });

    // Etapa andando ⇒ tarefa em execução.
    if (["LIBERADA_PARA_EXECUCAO", "AGUARDANDO_NOMADE"].includes(etapa.project_task.status)) {
      await prisma.projectTask.update({
        where: { id: etapa.project_task_id },
        data: { status: "EM_EXECUCAO", data_inicio_execucao: new Date() },
      });
    }

    res.json({ id: etapa.id, titulo: etapa.titulo, status: etapa.status });
  } catch (err) {
    next(err);
  }
});

// ── Entregas da etapa (nômade) ───────────────────────────────────────────────
// O sistema não armazena binário: anexo é sempre uma URL (Drive, Figma, etc.),
// mesmo padrão do resto da plataforma. A entrega fica amarrada à ETAPA, e é
// ela que satisfaz `exige_anexo` na hora de concluir.

const entregaSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  observations: z.string().optional(),
  mime_type: z.string().optional(),
  size: z.number().int().optional(),
});

/** A etapa tem de ser do nômade autenticado. */
async function etapaDoNomade(userId: string, stageId: string) {
  const nomade = await prisma.nomade.findUnique({
    where: { user_id: userId },
    select: { id: true, name: true },
  });
  if (!nomade) return null;
  const etapa = await prisma.projectTaskStage.findFirst({
    where: { id: stageId, nomade_id: nomade.id },
    select: { id: true, project_task_id: true, status: true, titulo: true },
  });
  return etapa ? { nomade, etapa } : null;
}

// GET /api/nomades/me/etapas/:stageId/entregas
router.get("/me/etapas/:stageId/entregas", verifyToken, async (req, res, next) => {
  try {
    const ctx = await etapaDoNomade(req.user!.id, req.params.stageId as string);
    if (!ctx) {
      res.status(404).json({ error: "Etapa não encontrada ou não atribuída a você" });
      return;
    }
    const entregas = await prisma.taskAttachment.findMany({
      where: { project_task_stage_id: ctx.etapa.id, type: "delivery" },
      orderBy: { created_at: "desc" },
    });
    res.json({ data: entregas, total: entregas.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/nomades/me/etapas/:stageId/entregas
router.post(
  "/me/etapas/:stageId/entregas",
  verifyToken,
  validate(entregaSchema),
  async (req, res, next) => {
    try {
      const ctx = await etapaDoNomade(req.user!.id, req.params.stageId as string);
      if (!ctx) {
        res.status(404).json({ error: "Etapa não encontrada ou não atribuída a você" });
        return;
      }
      if (ctx.etapa.status !== "EM_ANDAMENTO") {
        res.status(422).json({
          error: "Só é possível anexar entrega em etapa em andamento.",
          current_status: ctx.etapa.status,
        });
        return;
      }

      const criada = await prisma.taskAttachment.create({
        data: {
          project_task_id: ctx.etapa.project_task_id,
          project_task_stage_id: ctx.etapa.id,
          type: "delivery",
          name: req.body.name,
          url: req.body.url,
          observations: req.body.observations ?? null,
          mime_type: req.body.mime_type ?? null,
          size: req.body.size ?? null,
          uploaded_by: ctx.nomade.name,
        },
      });
      res.status(201).json(criada);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/nomades/me/etapas/:stageId/entregas/:anexoId
router.delete("/me/etapas/:stageId/entregas/:anexoId", verifyToken, async (req, res, next) => {
  try {
    const ctx = await etapaDoNomade(req.user!.id, req.params.stageId as string);
    if (!ctx) {
      res.status(404).json({ error: "Etapa não encontrada ou não atribuída a você" });
      return;
    }
    const anexo = await prisma.taskAttachment.findFirst({
      where: { id: req.params.anexoId as string, project_task_stage_id: ctx.etapa.id },
      select: { id: true },
    });
    if (!anexo) {
      res.status(404).json({ error: "Entrega não encontrada" });
      return;
    }
    await prisma.taskAttachment.delete({ where: { id: anexo.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/nomades/:id
// Rota administrativa (vê/edita/remove QUALQUER nômade por id) — exige
// admin + permissão granular. Antes deste lote tinha só `verifyToken`,
// então qualquer conta autenticada (inclusive um Nômade comum) conseguia
// consultar/editar/apagar o perfil de qualquer outro nômade por id — as
// rotas `/me/*` acima é que são o self-service de verdade, escopadas por
// `req.user.id`.
router.get("/:id", verifyToken, requireRole("admin"), requirePermission("nomades", "view"), async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        qualifications: true,
        bank_account: true,
        wallet_transactions: { orderBy: { date: "desc" }, take: 20 },
        // Conta global vinculada — a tela de confirmação precisa saber se o
        // login está ativo e qual o e-mail, sem inventar uma segunda
        // consulta.
        user: { select: { id: true, email: true, is_active: true, status: true } },
        _count: {
          select: {
            task_executions: true,
            withdrawal_requests: true,
            qualifications: true,
            wallet_transactions: true,
          },
        },
      },
    });

    if (!nomade) {
      res.status(404).json({ error: "Nômade não encontrado" });
      return;
    }

    res.json(nomade);
  } catch (err) {
    next(err);
  }
});

// POST /api/nomades
router.post("/", verifyToken, requireRole("admin"), requirePermission("nomades", "create"), validate(createSchema), async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.create({ data: req.body });
    res.status(201).json(nomade);
  } catch (err) {
    next(err);
  }
});

// PUT /api/nomades/:id — edição administrativa geral (nível, pontuação,
// status de aprovação etc.). `user_id` é deliberadamente removido do body
// antes do update: reatribuir a quem um perfil de nômade pertence é uma
// ação distinta e perigosa demais pra caber num payload de edição genérico
// (permitiria uma conta “roubar” o histórico/carteira de outra só
// reapontando o vínculo).
router.put("/:id", verifyToken, requireRole("admin"), requirePermission("nomades", "edit"), validate(updateSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { user_id: _ignoredUserId, ...data } = req.body as Record<string, unknown>;

    const found = await prisma.nomade.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      res.status(404).json({ error: "Nômade não encontrado" });
      return;
    }

    const nomade = await prisma.nomade.update({ where: { id }, data });
    res.json(nomade);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/nomades/:id/status — desativar/reativar (reversível) ──────
// Ação DISTINTA de "remover perfil" (DELETE abaixo): aqui o registro
// `Nomade` inteiro continua intacto (histórico, qualificações, carteira,
// habilidades) — só `status` muda, e a conta global vinculada é
// bloqueada/desbloqueada junto (`User.is_active`), porque hoje o login não
// olha `Nomade.status` (só `User.is_active` bloqueia de verdade) — sem essa
// sincronização, "desativar o nômade" não impediria o login de fato.
const statusToggleSchema = z.object({
  status: z.enum(["ativo", "inativo"]),
  reason: z.string().trim().max(2000).optional(),
});

router.patch(
  "/:id/status",
  verifyToken,
  requireRole("admin"),
  requirePermission("nomades", "edit"),
  validate(statusToggleSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const { status, reason } = req.body as z.infer<typeof statusToggleSchema>;

      const found = await prisma.nomade.findUnique({
        where: { id },
        select: { id: true, user_id: true, status: true },
      });
      if (!found) {
        res.status(404).json({ error: "Nômade não encontrado" });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const n = await tx.nomade.update({ where: { id }, data: { status } });
        if (found.user_id) {
          await tx.user.update({
            where: { id: found.user_id },
            data: { is_active: status === "ativo", status: status === "ativo" ? "ativo" : "inativo" },
          });
        }
        return n;
      });

      if (found.user_id && found.status !== status) {
        await writeAccessAudit({
          actorId: req.user!.id,
          targetUserId: found.user_id,
          action: status === "ativo" ? "nomad_profile.reactivated" : "nomad_profile.deactivated",
          before: { status: found.status },
          after: { status },
          reason,
        });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/nomades/:id — remove SOMENTE o perfil profissional ───────
// Nunca apaga a conta global (`User`) — só o registro `Nomade`. Bloqueado
// (409) quando há histórico real vinculado (carteira, conta bancária,
// qualificações, saques, tarefas executadas): remover o perfil nesse caso
// apagaria histórico de negócio, o que este lote proíbe explicitamente —
// a saída correta pra esses casos é desativar (rota acima), não remover.
// Quando a remoção é permitida (perfil sem histórico), a conta global
// vinculada é desativada na mesma transação — sem isso, a pessoa
// continuaria logando e sendo roteada pro portal Nômade (`account_type`/
// `role` continuam apontando pra lá) sem nenhum perfil por trás.
router.delete("/:id", verifyToken, requireRole("admin"), requirePermission("nomades", "delete"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const nomade = await prisma.nomade.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        user_id: true,
        bank_account: { select: { id: true } },
        _count: {
          select: {
            wallet_transactions: true,
            qualifications: true,
            withdrawal_requests: true,
            task_executions: true,
          },
        },
      },
    });
    if (!nomade) {
      res.status(404).json({ error: "Nômade não encontrado" });
      return;
    }

    const blockers: string[] = [];
    if (nomade._count.wallet_transactions > 0) blockers.push(`${nomade._count.wallet_transactions} lançamento(s) de carteira`);
    if (nomade.bank_account) blockers.push("conta bancária cadastrada");
    if (nomade._count.qualifications > 0) blockers.push(`${nomade._count.qualifications} qualificação(ões)`);
    if (nomade._count.withdrawal_requests > 0) blockers.push(`${nomade._count.withdrawal_requests} solicitação(ões) de saque`);
    if (nomade._count.task_executions > 0) blockers.push(`${nomade._count.task_executions} tarefa(s) executada(s)`);

    if (blockers.length > 0) {
      res.status(409).json({
        error: `Este perfil tem histórico vinculado (${blockers.join(", ")}) e não pode ser removido — desative o Nômade em vez de remover o perfil.`,
      });
      return;
    }

    const reason = typeof (req.body as { reason?: unknown } | undefined)?.reason === "string"
      ? (req.body as { reason?: string }).reason
      : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.nomade.delete({ where: { id } });
      if (nomade.user_id) {
        await tx.user.update({ where: { id: nomade.user_id }, data: { is_active: false, status: "inativo" } });
      }
    });

    if (nomade.user_id) {
      await writeAccessAudit({
        actorId: req.user!.id,
        targetUserId: nomade.user_id,
        action: "nomad_profile.removed",
        before: { nomade_id: nomade.id, name: nomade.name },
        reason,
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/nomades/:id/wallet
router.get("/:id/wallet", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const nomade = await prisma.nomade.findUnique({
      where: { id: (req.params.id as string) },
      select: { id: true, name: true },
    });

    if (!nomade) {
      res.status(404).json({ error: "Nômade não encontrado" });
      return;
    }

    const [transactions, balanceData] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { nomade_id: (req.params.id as string) },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.groupBy({
        by: ["type"],
        where: { nomade_id: (req.params.id as string) },
        _sum: { amount: true },
      }),
    ]);

    const available = balanceData
      .filter((b) => ["credit", "bonus"].includes(b.type))
      .reduce((acc, b) => acc + (b._sum.amount ?? 0), 0);

    const debited = balanceData
      .filter((b) => ["debit", "penalty", "withdrawal"].includes(b.type))
      .reduce((acc, b) => acc + (b._sum.amount ?? 0), 0);

    res.json({
      availableBalance: available - debited,
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/nomades/:id/qualifications
router.get("/:id/qualifications", verifyToken, async (req, res, next) => {
  try {
    const qualifications = await prisma.qualification.findMany({
      where: { nomade_id: (req.params.id as string) },
      orderBy: { created_at: "desc" },
    });
    res.json(qualifications);
  } catch (err) {
    next(err);
  }
});

// PUT /api/nomades/:id/qualifications/:qid
router.put(
  "/:id/qualifications/:qid",
  verifyToken,
  async (req, res, next) => {
    try {
      const allowed = z.object({
        status: z.enum(["habilitado", "pausado", "teste_pendente", "reprovado"]),
        certification_date: z.string().datetime({ offset: true }).optional(),
        paused_date: z.string().datetime({ offset: true }).optional(),
      });

      const parsed = allowed.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
        return;
      }

      const qual = await prisma.qualification.update({
        where: { id: (req.params.qid as string) },
        data: parsed.data,
      });
      res.json(qual);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

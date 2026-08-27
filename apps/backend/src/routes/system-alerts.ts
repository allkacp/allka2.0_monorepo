import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken, requireAdminMaster, evaluateAdminMasterAccess } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import {
  computeNextRun,
  findUnknownVariables,
  isDueSoonTrigger,
  parseRecipientRoles,
  RECIPIENT_CATEGORIES,
  RECIPIENT_CATEGORY_LABELS,
  renderTemplate,
  TRIGGER_ENTITY_TYPE,
} from "../lib/alert-engine";
import {
  BANNER_HEIGHT,
  BANNER_WIDTH,
  MAX_ALERT_IMAGE_BYTES,
  alertImagePath,
  deleteAlertImage,
  detectImageFormat,
  storeAlertImageBuffer,
  validateBannerDimensions,
} from "../lib/alert-image-storage";
import { isValidIanaTimeZone, isValidTimeOfDay, zonedTimeToUtc } from "../lib/timezone";
import { combinedProjectWhere } from "../lib/project-scope";
import { getTaskScopeWhere, applyScope } from "./project-tasks";
import { nestedAlertEventCreate, recordAlertEvent, recordClientTriggeredEventIdempotent } from "../lib/alert-events";

const router = Router();

// ── Imagem/banner de Alerta (ata 2026-08, 4º lote + reparo "banner visual")
// Upload é Admin Master only (mesmo escopo de quem cria Padrão/Programação/
// Avulso com imagem); a validação real é por CONTEÚDO (assinatura de bytes
// em alert-image-storage.ts), nunca por extensão/Content-Type do
// multipart — protege contra arquivo disfarçado. multer em memória (não
// disco) porque o arquivo só é gravado DEPOIS de confirmado o formato real.
//
// Dimensão exata 1200×200 (6:1) é exigida SÓ em upload NOVO — padrão
// definitivo (corrige o 1200×400/3:1 de um lote anterior, achado alto
// demais). Uma imagem já salva fora do padrão atual (1200×400 do lote
// anterior, ou qualquer outra) nunca é apagada, revalidada nem migrada;
// continua sendo servida e exibida normalmente (com `contain`), só não é
// possível re-selecioná-la como se fosse nova (o upload em si é sempre o
// mesmo endpoint, então qualquer envio — inclusive substituição — passa
// pela mesma checagem de dimensão a partir de agora).
const alertImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ALERT_IMAGE_BYTES },
});

router.post(
  "/admin/images",
  verifyToken,
  requireAdminMaster,
  alertImageUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const detected = detectImageFormat(req.file.buffer);
      if (!detected) {
        res.status(400).json({ error: "Formato de imagem inválido — envie JPEG, PNG ou WebP" });
        return;
      }
      const dimensionError = validateBannerDimensions(req.file.buffer, detected);
      if (dimensionError) {
        res.status(400).json({ error: dimensionError });
        return;
      }
      const fileName = storeAlertImageBuffer(req.file.buffer, detected.ext);
      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_image.uploaded",
        after: { file_name: fileName, mime: detected.mime, size: req.file.buffer.length, width: BANNER_WIDTH, height: BANNER_HEIGHT },
      });
      // Nunca base64 dentro do alerta — só o nome físico, resolvido pra URL
      // pela rota de servir abaixo.
      res.status(201).json({ file_name: fileName, url: `/api/system-alerts/admin/images/${fileName}` });
    } catch (err) {
      next(err);
    }
  },
);

// ── Servir imagem — autorização por RECURSO, nunca por nome de arquivo ────
//
// Correção de segurança (ata 2026-08, reparo pós-4º lote): a versão
// anterior servia qualquer imagem pra QUALQUER usuário autenticado que
// soubesse/adivinhasse o nome físico — nome aleatório não é controle de
// acesso. Agora cada tipo de imagem tem sua própria rota, amarrada ao
// registro dono (ocorrência/Padrão/Programação), e a checagem de permissão
// acontece ANTES de tocar no disco — nunca aceita um nome de arquivo vindo
// direto da URL pra decidir o que servir.
//
// `sendAlertImageFile` é o único ponto que efetivamente lê do disco — os
// chamadores já validaram permissão e já sabem o nome físico exato (nunca
// um parâmetro de URL). Path traversal fica estruturalmente impossível: o
// nome nunca vem do cliente aqui.
function sendAlertImageFile(res: Response, fileName: string): boolean {
  const filePath = alertImagePath(fileName);
  if (!fs.existsSync(filePath)) return false;
  // nosniff: o navegador nunca deve tentar "adivinhar" um tipo diferente do
  // Content-Type que a gente manda (mime da extensão que o próprio backend
  // escolheu ao validar o upload por assinatura de bytes).
  res.set("X-Content-Type-Options", "nosniff");
  // Cache privado, nunca compartilhado: a mesma URL pode ter dono diferente
  // dependendo de QUEM pergunta (ex.: dois destinatários de um alerta geral
  // usando o mesmo computador) — nunca cache de proxy/CDN, nunca reuso entre
  // sessões.
  res.set("Cache-Control", "private, no-store");
  res.sendFile(filePath);
  return true;
}

// GET .../admin/images/:fileName — SOMENTE Admin Master, e SOMENTE como
// prévia de um upload ainda não salvo em nenhum Padrão/Programação/Avulso
// (a tela de edição mostra a miniatura antes de clicar em Salvar). Depois
// de salvo, ninguém mais usa esta rota pra exibir a imagem — cada entidade
// passa a ter sua própria rota com dono e checagem de permissão (ver
// abaixo). Nunca é a rota usada pelo destinatário de um alerta.
router.get("/admin/images/:fileName", verifyToken, requireAdminMaster, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileName = req.params.fileName as string;
    if (!/^[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(fileName)) {
      res.status(400).json({ error: "Nome de arquivo inválido" });
      return;
    }
    if (!sendAlertImageFile(res, fileName)) {
      res.status(404).json({ error: "Imagem não encontrada" });
    }
  } catch (err) {
    next(err);
  }
});

// GET /:id/image — imagem de uma OCORRÊNCIA (SystemAlert): Avulso, ou
// gerada a partir de um Padrão/Programação (sempre um snapshot próprio,
// nunca o arquivo administrativo do Padrão/Programação). Autorização:
// EXATAMENTE a mesma regra usada pra abrir o próprio alerta
// (`escopoDoUsuario`) — destinatário direto, ou alerta geral dentro do
// escopo de quem já pode ver alerta geral (Admin), nunca uma regra nova só
// pra imagem. 404 (não 403) quando não autorizado — não revela se o alerta
// existe pra quem não tem acesso a ele.
router.get("/:id/image", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.systemAlert.findFirst({
      where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      select: { image_file_name: true },
    });
    if (!alert || !alert.image_file_name) {
      res.status(404).json({ error: "Imagem não encontrada" });
      return;
    }
    if (!sendAlertImageFile(res, alert.image_file_name)) {
      res.status(404).json({ error: "Imagem não encontrada" });
    }
  } catch (err) {
    next(err);
  }
});

// ── Escopo por destinatário ───────────────────────────────────────────────────
//
// SystemAlert nasceu como mural global do Admin ("nômade não encontrado",
// "tarefa atrasada"): todas as rotas aqui liam e escreviam sem olhar para quem
// era o alerta. Com o motor de etapas passaram a existir avisos endereçados
// (`user_id`, ver migration 20260804160000) — e sem escopo eles ficavam
// invisíveis para o dono e visíveis para todos os outros.
//
//   Admin      → alertas gerais (user_id nulo) + os endereçados a ele
//   Demais     → só os endereçados a ele
//
// O escopo entra em TODAS as rotas, não só na listagem: sem isso qualquer
// usuário marcaria como lido ou apagaria o alerta de outro. O `read-all`, em
// particular, marcava o mural inteiro da plataforma.

function escopoDoUsuario(req: Request): Record<string, unknown> {
  const user = req.user!;
  const ehAdmin = user.role === "admin" || user.account_type === "admin";
  return ehAdmin
    ? { OR: [{ user_id: null }, { user_id: user.id }] }
    : { user_id: user.id };
}

// Regra principal do 10º lote: um alerta vermelho/crítico não pode
// desaparecer só porque alguém dispensou/arquivou — precisa passar por
// "Resolver alerta" primeiro (POST /:id/resolve). Aplicada no BACKEND
// (nunca só escondendo botão no frontend) — a mesma checagem vale pra
// qualquer chamada direta à API, inclusive as rotas administrativas.
function precisaResolverAntes(alert: { severity: string; manual_resolved_at: Date | null }): boolean {
  return alert.severity === "error" && !alert.manual_resolved_at;
}
const MENSAGEM_PRECISA_RESOLVER = "Este alerta crítico precisa ser resolvido antes de ser arquivado ou dispensado.";

// ── Schemas ───────────────────────────────────────────────────────────────────

const listSchema = z.object({
  type: z.string().optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  category: z.enum(["notificacao", "alerta"]).optional(),
  is_read: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
  // Ausente = só ativos (comportamento padrão, "o que precisa resolver").
  // "true"/"false" filtram explicitamente; "all" traz os dois.
  is_archived: z.enum(["true", "false", "all"]).optional(),
  // Resolução formal (ata 2026-08, 10º lote) — filtra por
  // manual_resolved_at, NUNCA pelo resolved_at do motor automático (ver
  // comentário no schema). Ausente = sem filtro por resolução.
  resolved: z.enum(["true", "false"]).optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Feed pessoal (reparo "banner visual" — ata 2026-08): informa que existe
// imagem SEM expor o nome físico do arquivo nem o caminho em disco — só
// `has_image` (booleano) e uma URL LÓGICA baseada no id da própria
// ocorrência (`/api/system-alerts/:id/image`, a mesma rota já autorizada
// por `escopoDoUsuario` — ver a rota de imagem mais abaixo). O frontend
// busca essa URL com fetch autenticado, nunca um <img src> direto.
function withPublicImage<T extends { id: string; image_file_name?: string | null }>(
  alert: T,
): Omit<T, "image_file_name"> & { has_image: boolean; image_url: string | null } {
  const { image_file_name, ...rest } = alert;
  const has_image = !!image_file_name;
  return { ...rest, has_image, image_url: has_image ? `/api/system-alerts/${alert.id}/image` : null };
}

// ── GET /api/system-alerts ────────────────────────────────────────────────────

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({
          error: "Parâmetros inválidos",
          details: query.error.flatten(),
        });
        return;
      }

      const { type, severity, category, is_read, is_archived, resolved, entity_type, entity_id, limit, offset } =
        query.data;

      const filtros: Record<string, unknown> = {};
      if (type) filtros.type = type;
      if (severity) filtros.severity = severity;
      if (category) filtros.category = category;
      if (is_read !== undefined) filtros.is_read = is_read;
      if (entity_type) filtros.entity_type = entity_type;
      if (entity_id) filtros.entity_id = entity_id;
      if (is_archived === "true") filtros.is_archived = true;
      else if (is_archived === "false" || is_archived === undefined) filtros.is_archived = false;
      // is_archived === "all" → sem filtro, traz os dois.
      if (resolved === "true") filtros.manual_resolved_at = { not: null };
      else if (resolved === "false") filtros.manual_resolved_at = null;
      // resolved ausente → sem filtro por resolução.

      // AND explícito: o escopo usa OR internamente (admin vê geral + os seus),
      // e espalhar as duas coisas no mesmo objeto faria um sobrescrever o outro.
      const where = { AND: [filtros, escopoDoUsuario(req)] };

      const [total, alerts, unread] = await Promise.all([
        prisma.systemAlert.count({ where }),
        prisma.systemAlert.findMany({
          where,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.systemAlert.count({
          where: { AND: [filtros, escopoDoUsuario(req), { is_read: false }] },
        }),
      ]);

      // "Resolvidos" (ata 2026-08, 10º lote) mostra "quem resolveu" na
      // própria listagem, compacto — resolvido em lote (nunca N+1), mesmo
      // padrão de attachDestinatarioMany mais abaixo (a Central de
      // Alertas).
      const resolverIds = [...new Set(alerts.map((a) => a.resolved_by_user_id).filter((id): id is string => !!id))];
      const resolvers = resolverIds.length
        ? await prisma.user.findMany({ where: { id: { in: resolverIds } }, select: { id: true, name: true } })
        : [];
      const resolverById = new Map(resolvers.map((u) => [u.id, u]));

      res.json({
        data: alerts.map((a) => ({
          ...withPublicImage(a),
          resolved_by: a.resolved_by_user_id ? (resolverById.get(a.resolved_by_user_id) ?? null) : null,
        })),
        total,
        unread,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/unread-count ──────────────────────────────────────

const unreadCountSchema = z.object({
  category: z.enum(["notificacao", "alerta"]).optional(),
});

router.get(
  "/unread-count",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = unreadCountSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const filtros: Record<string, unknown> = {};
      if (query.data.category) filtros.category = query.data.category;

      const baseWhere = [filtros, { is_read: false }, { is_archived: false }, escopoDoUsuario(req)];
      const count = await prisma.systemAlert.count({ where: { AND: baseWhere } });

      // Quebra por severidade só faz sentido pra alerta (é o que a reunião
      // chama de "criticidade": info→verde, warning→amarelo, error→vermelho
      // — reaproveita o campo já existente, não cria um novo). Some no
      // corpo só quando o pedido já filtrou por category=alerta, pra não
      // sugerir esse conceito pra notificação comum.
      let bySeverity: { info: number; warning: number; error: number } | undefined;
      if (query.data.category === "alerta") {
        const [info, warning, error] = await Promise.all([
          prisma.systemAlert.count({ where: { AND: [...baseWhere, { severity: "info" }] } }),
          prisma.systemAlert.count({ where: { AND: [...baseWhere, { severity: "warning" }] } }),
          prisma.systemAlert.count({ where: { AND: [...baseWhere, { severity: "error" }] } }),
        ]);
        bySeverity = { info, warning, error };
      }

      res.json(bySeverity ? { count, bySeverity } : { count });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/read ────────────────────────────────────────

router.patch(
  "/:id/read",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // findFirst com escopo em vez de findUnique: alerta de outra pessoa tem
      // de responder "não encontrado", não ser marcado como lido.
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      if (precisaResolverAntes(alert)) {
        res.status(409).json({ error: MENSAGEM_PRECISA_RESOLVER, requires_resolution: true });
        return;
      }
      // Já lido -> não regrava evento (clique duplo/re-render não pode
      // duplicar "dispensado" na linha do tempo).
      const jaLido = alert.is_read;
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: {
          is_read: true,
          read_at: new Date(),
          ...(jaLido
            ? {}
            : {
                events: nestedAlertEventCreate({
                  eventType: "dismissed",
                  description: "Alerta dispensado pelo destinatário.",
                  actorUserId: req.user!.id,
                }),
              }),
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/archive ─────────────────────────────────────
// Soft — some da visão padrão ("o que precisa resolver"), mas o dado
// continua existindo e consultável com is_archived=true/all.

router.patch(
  "/:id/archive",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      if (precisaResolverAntes(alert)) {
        res.status(409).json({ error: MENSAGEM_PRECISA_RESOLVER, requires_resolution: true });
        return;
      }
      const jaArquivado = alert.is_archived;
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: {
          is_archived: true,
          archived_at: new Date(),
          ...(jaArquivado
            ? {}
            : {
                events: nestedAlertEventCreate({
                  eventType: "archived",
                  description: "Alerta arquivado pelo destinatário.",
                  actorUserId: req.user!.id,
                }),
              }),
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/unarchive ───────────────────────────────────

router.patch(
  "/:id/unarchive",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const jaAtivo = !alert.is_archived;
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: {
          is_archived: false,
          archived_at: null,
          ...(jaAtivo
            ? {}
            : {
                events: nestedAlertEventCreate({
                  eventType: "unarchived",
                  description: "Alerta restaurado pelo destinatário.",
                  actorUserId: req.user!.id,
                }),
              }),
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/system-alerts/:id/resolve — resolução formal (ata 2026-08,
// 10º lote) ───────────────────────────────────────────────────────────────
// Só alertas vermelhos/críticos passam por isto (severity="error") — verde
// e amarelo continuam usando dispensar/arquivar normalmente. Enumeração
// fechada de ação: nenhuma enumeração equivalente já existia no sistema
// (auditado antes de criar esta). "responsavel_acionado" é tratado aqui
// como resolução CONCLUÍDA do ponto de vista do Alerta (a atenção humana
// pedida pelo alerta aconteceu) — se esse significado for só encaminhamento
// e não conclusão de verdade, é uma descoberta registrada no relatório de
// encerramento, não implementada aqui.
const RESOLUTION_ACTIONS = [
  "correcao_aplicada",
  "responsavel_acionado",
  "processo_ajustado",
  "falso_positivo",
  "outra_acao",
] as const;

const RESOLUTION_ACTION_LABEL: Record<(typeof RESOLUTION_ACTIONS)[number], string> = {
  correcao_aplicada: "Correção aplicada",
  responsavel_acionado: "Responsável acionado",
  processo_ajustado: "Processo ajustado",
  falso_positivo: "Alerta identificado como falso positivo",
  outra_acao: "Outra ação",
};

const resolveAlertSchema = z.object({
  action: z.enum(RESOLUTION_ACTIONS, { errorMap: () => ({ message: "Selecione uma ação realizada" }) }),
  // min(10) depois do trim — nunca aceita só espaços contando pro mínimo.
  description: z
    .string()
    .trim()
    .min(10, "A descrição precisa ter pelo menos 10 caracteres")
    .max(2000, "A descrição pode ter no máximo 2000 caracteres"),
  client_action_id: z.string().trim().min(8).max(100),
});

function serializeResolution(alert: {
  manual_resolved_at: Date | null;
  resolution_action: string | null;
  resolution_description: string | null;
}) {
  return {
    manual_resolved_at: alert.manual_resolved_at,
    resolution_action: alert.resolution_action,
    resolution_description: alert.resolution_description,
    situacao: "resolvido" as const,
  };
}

router.post(
  "/:id/resolve",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = resolveAlertSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      const { action, description, client_action_id } = body.data;

      // Autorização calculada ANTES da busca do alerta: Admin Master
      // administra QUALQUER alerta endereçado a quem for (mesma regra já
      // estabelecida na Central — GET/PATCH /admin/:id/* nunca usam
      // escopoDoUsuario) — então a própria busca precisa ignorar o escopo
      // pessoal pra Master, senão um alerta endereçado a OUTRA pessoa
      // específica (não "Geral") ficaria invisível pra ele aqui mesmo
      // sendo administrável em qualquer outra rota da Central.
      const perfil = await prisma.user
        .findUnique({ where: { id: req.user!.id }, select: { admin_profile: { select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } } } } })
        .then((u) => u?.admin_profile ?? null);
      const isMaster = evaluateAdminMasterAccess(req.user!.account_type, perfil);

      const alert = await prisma.systemAlert.findFirst({
        where: isMaster
          ? { id: req.params.id as string, category: "alerta" }
          : { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      if (alert.severity !== "error") {
        res.status(400).json({ error: "Somente alertas de criticidade vermelha passam por resolução formal." });
        return;
      }

      // Fora de Master, só o destinatário direto do próprio alerta
      // resolve (alertas "Geral", user_id nulo, exigem Master — não há
      // hoje uma permissão granular de "Alertas" pra um admin comum
      // resolver um alerta geral; auditado, não existe, não inventada
      // aqui).
      const isDestinatarioDireto = !!alert.user_id && alert.user_id === req.user!.id;
      if (!isMaster && !isDestinatarioDireto) {
        res.status(403).json({ error: "Você não tem autorização para resolver este alerta." });
        return;
      }

      // Idempotência (fast-path): repetir a MESMA requisição (mesmo
      // client_action_id) devolve o resultado já existente, sem duplicar.
      const existingByClientId = await prisma.systemAlert.findUnique({
        where: { resolution_client_action_id: client_action_id },
        select: { id: true, manual_resolved_at: true, resolution_action: true, resolution_description: true },
      });
      if (existingByClientId) {
        res.status(200).json({ ok: true, duplicate: true, ...serializeResolution(existingByClientId) });
        return;
      }

      // Já resolvido por outra requisição (client_action_id diferente) —
      // nunca sobrescreve a resolução original.
      if (alert.manual_resolved_at) {
        res.status(409).json({
          error: "Este alerta já foi resolvido.",
          already_resolved: true,
          ...serializeResolution(alert),
        });
        return;
      }

      const now = new Date();
      let raceLost = false;
      let finalAlert: Awaited<ReturnType<typeof prisma.systemAlert.findUnique>> = null;
      try {
        finalAlert = await prisma.$transaction(async (tx) => {
          // Compare-and-swap real: só grava se AINDA não resolvido nesse
          // exato momento — protege contra duas requisições concorrentes
          // com client_action_id DIFERENTES resolvendo o mesmo alerta ao
          // mesmo tempo (o findFirst acima sozinho não bastaria).
          const cas = await tx.systemAlert.updateMany({
            where: { id: alert.id, manual_resolved_at: null },
            data: {
              manual_resolved_at: now,
              resolved_by_user_id: req.user!.id,
              resolution_action: action,
              resolution_description: description,
              resolution_client_action_id: client_action_id,
            },
          });
          if (cas.count === 0) return null;
          await tx.systemAlertEvent.create({
            data: {
              alert_id: alert.id,
              event_type: "resolved",
              description: `Alerta resolvido. Ação: ${RESOLUTION_ACTION_LABEL[action]}.`,
              actor_user_id: req.user!.id,
              metadata_json: JSON.stringify({ action }),
            },
          });
          return tx.systemAlert.findUnique({ where: { id: alert.id } });
        });
        if (!finalAlert) raceLost = true;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          raceLost = true;
        } else {
          throw err;
        }
      }

      if (raceLost) {
        const current = await prisma.systemAlert.findUnique({ where: { id: alert.id } });
        const mesmoClientId = current?.resolution_client_action_id === client_action_id;
        res
          .status(mesmoClientId ? 200 : 409)
          .json({
            ok: mesmoClientId,
            duplicate: mesmoClientId,
            already_resolved: !mesmoClientId,
            ...(current ? serializeResolution(current) : {}),
            ...(mesmoClientId ? {} : { error: "Este alerta já foi resolvido." }),
          });
        return;
      }

      res.status(201).json({ ok: true, duplicate: false, ...serializeResolution(finalAlert!) });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/read-all ────────────────────────────────────────

router.patch(
  "/read-all",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = unreadCountSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const filtros: Record<string, unknown> = {};
      if (query.data.category) filtros.category = query.data.category;

      // Mesma regra de "vermelho sem resolução não dispensa" (ata 2026-08,
      // 10º lote) — sem isto, "Dispensar todos" seria uma brecha real pra
      // pular a checagem que PATCH /:id/read já aplica um por um.
      const naoExigeResolucao = {
        OR: [{ severity: { not: "error" } }, { manual_resolved_at: { not: null } }],
      };
      const result = await prisma.systemAlert.updateMany({
        where: { AND: [filtros, { is_read: false }, naoExigeResolucao, escopoDoUsuario(req)] },
        data: { is_read: true, read_at: new Date() },
      });
      res.json({ updated: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/system-alerts/:id ────────────────────────────────────────────

router.delete(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
        select: { id: true },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      await prisma.systemAlert.delete({ where: { id: alert.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Central de Alertas (ata 2026-08: "criar uma central para o cadastro e
// gestão de alertas... Admin Master deve ter a capacidade de criar,
// modificar ou reclassificar alertas... sem depender de alterações no
// código"). Gerencia os mesmos SystemAlert de sempre — nenhuma tabela nova,
// nenhum motor de regras/templates. Tudo abaixo exige requireAdminMaster
// (estritamente is_master, sem a regra do avô de requirePermission — ver
// comentário em middleware/auth.ts) e opera SEM o escopoDoUsuario de cima:
// o Admin Master administra qualquer alerta, endereçado a quem for, não só
// o que já era visível pra ele.
// ═══════════════════════════════════════════════════════════════════════════

const CRITICALITY_TYPE = "alerta_admin_manual";

// SystemAlert.user_id é um escalar solto, sem relação Prisma pro lado do
// User (nenhum @relation declarado) — criar uma exigiria migration (FK
// nova numa coluna que já existe sem constraint) só pra poder usar
// `include`. Mais simples e sem tocar no schema: buscar os usuários à parte
// e anexar como "destinatario" na resposta.
type DestinatarioInfo = { id: string; name: string; email: string } | null;

// Deriva a URL servível a partir do nome físico — nunca expõe caminho de
// disco, nunca base64.
function withImageUrl<T extends { id: string; image_file_name?: string | null }>(alert: T): T & { image_url: string | null } {
  // Rota amarrada ao ID da ocorrência, não ao nome do arquivo — quem pedir
  // precisa passar pela MESMA checagem de escopo usada pra abrir o alerta
  // (ver GET /:id/image acima). Nunca a rota administrativa de imagem.
  return { ...alert, image_url: alert.image_file_name ? `/api/system-alerts/${alert.id}/image` : null };
}

async function attachDestinatario<T extends { id: string; user_id: string | null; image_file_name?: string | null }>(
  alert: T,
): Promise<T & { destinatario: DestinatarioInfo; image_url: string | null }> {
  const withImg = withImageUrl(alert);
  if (!alert.user_id) return { ...withImg, destinatario: null };
  const user = await prisma.user.findUnique({
    where: { id: alert.user_id },
    select: { id: true, name: true, email: true },
  });
  return { ...withImg, destinatario: user ?? null };
}

async function attachDestinatarioMany<T extends { id: string; user_id: string | null; image_file_name?: string | null }>(
  alerts: T[],
): Promise<(T & { destinatario: DestinatarioInfo; image_url: string | null })[]> {
  const ids = [...new Set(alerts.map((a) => a.user_id).filter((id): id is string => !!id))];
  const withImgs = alerts.map(withImageUrl);
  if (ids.length === 0) return withImgs.map((a) => ({ ...a, destinatario: null }));
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return withImgs.map((a) => ({ ...a, destinatario: a.user_id ? (byId.get(a.user_id) ?? null) : null }));
}

async function auditSystemAlert(input: {
  actorId: string;
  action: string;
  alertId: string;
  before?: unknown;
  after?: unknown;
}) {
  await writeAccessAudit({
    actorId: input.actorId,
    action: input.action,
    before: input.before !== undefined ? { system_alert_id: input.alertId, ...(input.before as object) } : { system_alert_id: input.alertId },
    after: input.after !== undefined ? { system_alert_id: input.alertId, ...(input.after as object) } : undefined,
  });
}

// ── GET /api/system-alerts/admin — lista completa pra central administrativa

const adminListSchema = z.object({
  search: z.string().trim().max(200).optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  is_archived: z.enum(["true", "false", "all"]).default("false"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get(
  "/admin",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = adminListSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const { search, severity, is_archived, limit, offset } = query.data;

      const filtros: Record<string, unknown> = { category: "alerta" };
      if (severity) filtros.severity = severity;
      if (is_archived === "true") filtros.is_archived = true;
      else if (is_archived === "false") filtros.is_archived = false;
      // "all" → sem filtro de arquivado.
      if (search) {
        filtros.OR = [
          { title: { contains: search } },
          { message: { contains: search } },
        ];
      }

      const [total, alerts] = await Promise.all([
        prisma.systemAlert.count({ where: filtros }),
        prisma.systemAlert.findMany({
          where: filtros,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
      ]);

      res.json({ data: await attachDestinatarioMany(alerts), total });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/admin/destination-options — busca pro seletor ─────
// "Destino opcional" do Avulso (ata 2026-08, 6º lote): a pessoa nunca digita
// URL/id técnico, só busca por nome/código entre registros reais. Leve e
// paginado de propósito — o próprio Bug 1 deste lote nasceu de uma listagem
// sem paginação, não repete o erro aqui. Sempre Admin Master (mesmo escopo
// de quem cria o Avulso), então busca sem filtro de escopo — a validação de
// que o DESTINATÁRIO final consegue acessar o registro acontece em POST
// /admin, não aqui (aqui é só a busca pra popular o combobox).
const destinationOptionsSchema = z.object({
  type: z.enum(["project", "task"]),
  search: z.string().trim().max(200).optional(),
});

router.get(
  "/admin/destination-options",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = destinationOptionsSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const { type, search } = query.data;

      if (type === "project") {
        const projects = await prisma.project.findMany({
          where: search ? { title: { contains: search } } : {},
          select: { id: true, title: true, project_code: true },
          orderBy: { created_at: "desc" },
          take: 20,
        });
        res.json({
          data: projects.map((p) => ({
            id: p.id,
            label: p.title,
            sublabel: p.project_code,
          })),
        });
        return;
      }

      const tasks = await prisma.projectTask.findMany({
        where: search
          ? {
              OR: [
                { title: { contains: search } },
                { task_code: { contains: search } },
              ],
            }
          : {},
        select: {
          id: true,
          title: true,
          task_code: true,
          project: { select: { title: true } },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });
      res.json({
        data: tasks.map((t) => ({
          id: t.id,
          label: t.title,
          sublabel: [t.task_code, t.project?.title].filter(Boolean).join(" — "),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/system-alerts/admin — criação manual ───────────────────────────

const createAdminAlertSchema = z
  .object({
    title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(200, "Título deve ter no máximo 200 caracteres"),
    message: z.string().trim().min(3, "Mensagem deve ter no mínimo 3 caracteres").max(2000, "Mensagem deve ter no máximo 2000 caracteres"),
    severity: z.enum(["info", "warning", "error"], { errorMap: () => ({ message: "Criticidade inválida" }) }),
    // Ausente/null = alerta geral (visível a todo Admin) — conceito que já
    // existia (user_id nulo), não inventado aqui. Presente = destinatário
    // específico, validado abaixo (precisa existir e estar ativo).
    user_id: z.string().trim().min(1).nullable().optional(),
    // Imagem opcional (ata 2026-08, 4º lote) — `image_file_name` só aceita o
    // nome devolvido por POST /admin/images (nunca um caminho arbitrário);
    // validado contra o disco abaixo, além do formato aqui.
    image_file_name: z.string().trim().min(1).nullable().optional(),
    image_alt: z.string().trim().max(300).nullable().optional(),
    expires_at: z.string().datetime().nullable().optional(),
    // Destino opcional (ata 2026-08, 6º lote — reparo "Ver alerta" no
    // Avulso): "none" (padrão) = alerta informativo, sem botão "Ver".
    // "project"/"task" exigem destination_id, sempre um id real escolhido
    // no seletor buscável acima — nunca URL/id técnico digitado à mão.
    // Nunca "stage" aqui: etapa continua exclusiva do motor automático.
    destination_type: z.enum(["none", "project", "task"]).default("none"),
    destination_id: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => !data.image_file_name || !!data.image_alt, {
    message: "Texto alternativo é obrigatório quando há imagem",
    path: ["image_alt"],
  })
  .refine((data) => data.destination_type === "none" || !!data.destination_id, {
    message: "Selecione um registro para o destino escolhido",
    path: ["destination_id"],
  });

router.post(
  "/admin",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createAdminAlertSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      const { title, message, severity, user_id, image_file_name, image_alt, expires_at, destination_type, destination_id } = body.data;

      // Destinatário nunca aceito só porque o frontend mandou um id — tem
      // que existir de verdade e estar ativo, igual a qualquer outro fluxo
      // administrativo desta plataforma.
      let destinatario: { id: string; is_active: boolean; account_type: string; role: string } | null = null;
      if (user_id) {
        destinatario = await prisma.user.findUnique({
          where: { id: user_id },
          select: { id: true, is_active: true, account_type: true, role: true },
        });
        if (!destinatario || !destinatario.is_active) {
          res.status(400).json({ error: "Destinatário inválido ou inexistente" });
          return;
        }
      }

      // Mesma regra do upload: o nome só é aceito se realmente existir em
      // disco (não confia cegamente no que veio no corpo).
      if (image_file_name && !fs.existsSync(alertImagePath(image_file_name))) {
        res.status(400).json({ error: "Imagem inválida — envie novamente" });
        return;
      }

      const expiresAtDate = expires_at ? new Date(expires_at) : null;
      if (expiresAtDate && expiresAtDate.getTime() <= Date.now()) {
        res.status(400).json({ error: "Expiração precisa ser no futuro" });
        return;
      }

      // Destino opcional (ata 2026-08, 6º lote): revalidado no servidor,
      // nunca confia no que o formulário mandou. "none" = alerta
      // informativo (entity_type/entity_id ficam nulos, comportamento já
      // existente). "project"/"task" exigem que o registro exista de
      // verdade e, quando há um destinatário específico (não "Geral"), que
      // ELE consiga acessá-lo — nunca um alerta cujo botão "Ver" leva a
      // tela sem permissão pra quem recebeu.
      let entityType: string | null = null;
      let entityId: string | null = null;
      if (destination_type === "project") {
        const project = await prisma.project.findUnique({
          where: { id: destination_id! },
          select: { id: true },
        });
        if (!project) {
          res.status(400).json({ error: "Projeto selecionado não existe" });
          return;
        }
        if (destinatario) {
          const { where: scopeWhere } = await combinedProjectWhere(prisma, destinatario.id, destinatario.account_type);
          if (scopeWhere === null) {
            res.status(400).json({ error: "O destinatário selecionado não tem acesso a este projeto" });
            return;
          }
          const accessible = Object.keys(scopeWhere).length === 0
            ? true
            : !!(await prisma.project.findFirst({ where: { AND: [{ id: destination_id! }, scopeWhere] }, select: { id: true } }));
          if (!accessible) {
            res.status(400).json({ error: "O destinatário selecionado não tem acesso a este projeto" });
            return;
          }
        }
        entityType = "project";
        entityId = destination_id!;
      } else if (destination_type === "task") {
        const task = await prisma.projectTask.findUnique({
          where: { id: destination_id! },
          select: { id: true },
        });
        if (!task) {
          res.status(400).json({ error: "Tarefa selecionada não existe" });
          return;
        }
        if (destinatario) {
          const scopeWhere = await getTaskScopeWhere(destinatario.id, destinatario.account_type, destinatario.role);
          if (scopeWhere === null) {
            res.status(400).json({ error: "O destinatário selecionado não tem acesso a esta tarefa" });
            return;
          }
          const accessible = Object.keys(scopeWhere).length === 0
            ? true
            : !!(await prisma.projectTask.findFirst({ where: applyScope({ id: destination_id! }, scopeWhere), select: { id: true } }));
          if (!accessible) {
            res.status(400).json({ error: "O destinatário selecionado não tem acesso a esta tarefa" });
            return;
          }
        }
        entityType = "project_task";
        entityId = destination_id!;
      }

      const created = await prisma.systemAlert.create({
        data: {
          type: CRITICALITY_TYPE,
          title,
          message,
          severity,
          category: "alerta",
          user_id: user_id ?? null,
          image_file_name: image_file_name ?? null,
          image_alt: image_file_name ? (image_alt ?? null) : null,
          expires_at: expiresAtDate,
          entity_type: entityType,
          entity_id: entityId,
          created_by_user_id: req.user!.id,
          events: nestedAlertEventCreate({
            eventType: "created",
            description: "Alerta avulso criado manualmente.",
            actorUserId: req.user!.id,
          }),
        },
      });

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.created",
        alertId: created.id,
        after: { title, severity, user_id: user_id ?? null, has_image: !!image_file_name, expires_at: expiresAtDate, entity_type: entityType, entity_id: entityId },
      });

      res.status(201).json(await attachDestinatario(created));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id — editar título/mensagem ──────────────

const editAdminAlertSchema = z
  .object({
    title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(200, "Título deve ter no máximo 200 caracteres").optional(),
    message: z.string().trim().min(3, "Mensagem deve ter no mínimo 3 caracteres").max(2000, "Mensagem deve ter no máximo 2000 caracteres").optional(),
    // Presente = trocar/definir imagem; null explícito = remover; ausente =
    // não mexer na imagem atual.
    image_file_name: z.string().trim().min(1).nullable().optional(),
    image_alt: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => data.image_file_name === undefined || !data.image_file_name || !!data.image_alt, {
    message: "Texto alternativo é obrigatório quando há imagem",
    path: ["image_alt"],
  });

router.patch(
  "/admin/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editAdminAlertSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe título, mensagem e/ou imagem para editar" });
        return;
      }

      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, title: true, message: true, image_file_name: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      const { image_file_name, image_alt, ...rest } = body.data;
      const imageChanging = image_file_name !== undefined;
      if (imageChanging && image_file_name && !fs.existsSync(alertImagePath(image_file_name))) {
        res.status(400).json({ error: "Imagem inválida — envie novamente" });
        return;
      }

      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(imageChanging
            ? { image_file_name: image_file_name ?? null, image_alt: image_file_name ? (image_alt ?? null) : null }
            : {}),
          events: nestedAlertEventCreate({
            eventType: "admin_updated",
            description: "Título/mensagem/imagem alterados por um administrador.",
            actorUserId: req.user!.id,
          }),
        },
      });

      // Substituição/remoção — o arquivo antigo (se havia um e mudou) some
      // do disco só DEPOIS do banco confirmar a troca, nunca antes.
      if (imageChanging && before.image_file_name && before.image_file_name !== image_file_name) {
        deleteAlertImage(before.image_file_name);
        await writeAccessAudit({
          actorId: req.user!.id,
          action: image_file_name ? "alert_image.replaced" : "alert_image.removed",
          after: { system_alert_id: before.id },
        });
      }

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.updated",
        alertId: before.id,
        before: { title: before.title, message: before.message },
        after: body.data,
      });

      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id/severity — reclassificar criticidade ──

const reclassifySchema = z.object({
  severity: z.enum(["info", "warning", "error"], { errorMap: () => ({ message: "Criticidade inválida" }) }),
});

router.patch(
  "/admin/:id/severity",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = reclassifySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }

      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, severity: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      // Mesmo registro, sempre — reclassificar nunca cria uma ocorrência
      // nova nem duplica: é um único UPDATE no id já existente.
      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: {
          severity: body.data.severity,
          events: nestedAlertEventCreate({
            eventType: "admin_updated",
            description: `Criticidade alterada de ${before.severity} para ${body.data.severity} por um administrador.`,
            actorUserId: req.user!.id,
            metadata: { from_severity: before.severity, to_severity: body.data.severity },
          }),
        },
      });

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.severity_changed",
        alertId: before.id,
        before: { severity: before.severity },
        after: { severity: body.data.severity },
      });

      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id/archive|unarchive — arquivamento ──────
// administrativo. Distinto do /:id/archive de cima: aquele é escopoDoUsuario
// (só o que já é visível pra quem chama); este é Admin Master administrando
// QUALQUER alerta, endereçado a quem for. Mesmo soft-delete de sempre —
// nunca physical delete.

router.patch(
  "/admin/:id/archive",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, is_archived: true, severity: true, manual_resolved_at: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      if (precisaResolverAntes(before)) {
        res.status(409).json({ error: MENSAGEM_PRECISA_RESOLVER, requires_resolution: true });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: {
          is_archived: true,
          archived_at: new Date(),
          ...(before.is_archived
            ? {}
            : {
                events: nestedAlertEventCreate({
                  eventType: "archived",
                  description: "Alerta arquivado por um administrador.",
                  actorUserId: req.user!.id,
                }),
              }),
        },
      });
      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.archived",
        alertId: before.id,
        before: { is_archived: before.is_archived },
        after: { is_archived: true },
      });
      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/admin/:id/unarchive",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, is_archived: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: {
          is_archived: false,
          archived_at: null,
          ...(before.is_archived
            ? {
                events: nestedAlertEventCreate({
                  eventType: "unarchived",
                  description: "Alerta restaurado por um administrador.",
                  actorUserId: req.user!.id,
                }),
              }
            : {}),
        },
      });
      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.unarchived",
        alertId: before.id,
        before: { is_archived: before.is_archived },
        after: { is_archived: false },
      });
      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Padrões e Regras (ata 2026-08, 2º lote) — Padrão → Regra → Verificação
// automática → Ocorrência. As ocorrências continuam sendo criadas só pelo
// motor (src/lib/alert-engine.ts); estas rotas só administram o CONTEÚDO
// (Padrão) e o COMPORTAMENTO (Regra), nunca criam SystemAlert diretamente.
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/system-alerts/admin/standards ────────────────────────────────

router.get(
  "/admin/standards",
  verifyToken,
  requireAdminMaster,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const standards = await prisma.alertStandard.findMany({ orderBy: { created_at: "asc" } });
      res.json({
        data: standards.map((s) => ({
          ...s,
          allowed_variables: JSON.parse(s.allowed_variables_json) as string[],
          image_url: s.image_file_name ? `/api/system-alerts/admin/standards/${s.id}/image` : null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/standards/:id — nunca a key ───────────

const editStandardSchema = z
  .object({
    name: z.string().trim().min(3).max(200).optional(),
    title: z.string().trim().min(3).max(200).optional(),
    message: z.string().trim().min(3).max(2000).optional(),
    default_severity: z.enum(["info", "warning", "error"]).optional(),
    is_active: z.boolean().optional(),
    image_file_name: z.string().trim().min(1).nullable().optional(),
    image_alt: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => data.image_file_name === undefined || !data.image_file_name || !!data.image_alt, {
    message: "Texto alternativo é obrigatório quando há imagem",
    path: ["image_alt"],
  });

router.patch(
  "/admin/standards/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editStandardSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe ao menos um campo para editar" });
        return;
      }

      const before = await prisma.alertStandard.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Padrão não encontrado" });
        return;
      }

      // Variável fora da allowlist deste padrão nunca é aceita em título/
      // mensagem — nunca texto livre representando código.
      const allowed = JSON.parse(before.allowed_variables_json) as string[];
      const titleToCheck = body.data.title ?? before.title;
      const messageToCheck = body.data.message ?? before.message;
      const unknown = [...findUnknownVariables(titleToCheck, allowed), ...findUnknownVariables(messageToCheck, allowed)];
      if (unknown.length > 0) {
        res.status(400).json({ error: `Variável não permitida: ${[...new Set(unknown)].join(", ")}` });
        return;
      }

      const { image_file_name, image_alt, ...rest } = body.data;
      const imageChanging = image_file_name !== undefined;
      if (imageChanging && image_file_name && !fs.existsSync(alertImagePath(image_file_name))) {
        res.status(400).json({ error: "Imagem inválida — envie novamente" });
        return;
      }

      const updated = await prisma.alertStandard.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(imageChanging
            ? { image_file_name: image_file_name ?? null, image_alt: image_file_name ? (image_alt ?? null) : null }
            : {}),
          updated_by_id: req.user!.id,
        },
      });

      // Trocar/remover a imagem do Padrão nunca apaga o arquivo de uma
      // Ocorrência já criada — cada Ocorrência tem sua PRÓPRIA cópia física
      // (ver snapshotAlertImage em alert-engine.ts), então só o arquivo do
      // próprio Padrão é removido aqui.
      if (imageChanging && before.image_file_name && before.image_file_name !== image_file_name) {
        deleteAlertImage(before.image_file_name);
        await writeAccessAudit({
          actorId: req.user!.id,
          action: image_file_name ? "alert_image.replaced" : "alert_image.removed",
          after: { alert_standard_id: before.id },
        });
      }

      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_standard.updated",
        before: { alert_standard_id: before.id, name: before.name, title: before.title, message: before.message, default_severity: before.default_severity, is_active: before.is_active },
        after: { alert_standard_id: before.id, ...rest },
      });

      res.json({ ...updated, allowed_variables: allowed });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/system-alerts/admin/standards/:id/preview — nunca cria alerta

router.post(
  "/admin/standards/:id/preview",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const standard = await prisma.alertStandard.findUnique({ where: { id: req.params.id as string } });
      if (!standard) {
        res.status(404).json({ error: "Padrão não encontrado" });
        return;
      }
      const allowed = JSON.parse(standard.allowed_variables_json) as string[];
      // Dados fictícios claramente identificados — nunca lê tarefa real.
      const fixture: Record<string, string> = {
        etapa: "[EXEMPLO] Etapa de demonstração",
        tarefa: "[EXEMPLO] Tarefa de demonstração",
        prazo: "31/12/2026",
        projeto: "[EXEMPLO] Projeto de demonstração",
      };
      res.json({
        title: renderTemplate(standard.title, fixture, allowed),
        message: renderTemplate(standard.message, fixture, allowed),
        severity: standard.default_severity,
        image_url: standard.image_file_name ? `/api/system-alerts/admin/standards/${standard.id}/image` : null,
        image_alt: standard.image_alt,
        fictitious: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /admin/standards/:id/image — arquivo ADMINISTRATIVO do Padrão. Só
// Admin Master (mesma checagem de quem edita/visualiza o Padrão) — usuário
// comum nunca chega aqui, mesmo sabendo o id. Uma ocorrência gerada a
// partir deste Padrão usa seu PRÓPRIO snapshot (GET /:id/image), nunca
// esta rota.
router.get(
  "/admin/standards/:id/image",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const standard = await prisma.alertStandard.findUnique({
        where: { id: req.params.id as string },
        select: { image_file_name: true },
      });
      if (!standard || !standard.image_file_name) {
        res.status(404).json({ error: "Imagem não encontrada" });
        return;
      }
      if (!sendAlertImageFile(res, standard.image_file_name)) {
        res.status(404).json({ error: "Imagem não encontrada" });
      }
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/admin/rules ────────────────────────────────────

router.get(
  "/admin/rules",
  verifyToken,
  requireAdminMaster,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await prisma.alertRule.findMany({
        orderBy: { created_at: "asc" },
        include: { standard: { select: { id: true, key: true, name: true, default_severity: true } } },
      });
      const lastRuns = await prisma.systemAlert.groupBy({
        by: ["rule_id"],
        where: { rule_id: { in: rules.map((r) => r.id) } },
        _max: { created_at: true },
      });
      const lastRunByRule = new Map(lastRuns.map((r) => [r.rule_id, r._max.created_at]));

      // "algumas entidades estão sem responsável" (ata 2026-08) — só
      // calculado quando alguma regra ativa realmente usa a categoria
      // admin_responsavel, pra não fazer a contagem à toa.
      const usesAdminResponsavel = rules.some((r) => (parseRecipientRoles(r.recipient_roles_json) ?? []).includes("admin_responsavel"));
      let projectsMissingAdminResponsavel = 0;
      if (usesAdminResponsavel) {
        const [tasks, stages] = await Promise.all([
          prisma.projectTask.findMany({
            where: { due_date: { not: null }, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
            select: { project_id: true },
          }),
          prisma.projectTaskStage.findMany({
            where: { prazo_execucao: { not: null }, status: { notIn: ["CONCLUIDA", "BLOQUEADA"] } },
            select: { project_task: { select: { project_id: true } } },
          }),
        ]);
        const activeProjectIds = new Set<string>([
          ...tasks.map((t) => t.project_id),
          ...stages.map((s) => s.project_task?.project_id).filter((id): id is string => !!id),
        ]);
        if (activeProjectIds.size > 0) {
          projectsMissingAdminResponsavel = await prisma.project.count({
            where: { id: { in: [...activeProjectIds] }, admin_responsible_user_id: null },
          });
        }
      }

      res.json({
        // "regra geral" nunca é opcional na resposta — toda regra sempre se
        // aplica a TODOS os registros do entity_type do gatilho, nunca a um
        // registro específico (não existe seletor de tarefa/etapa aqui).
        recipient_category_options: RECIPIENT_CATEGORIES.map((value) => ({ value, label: RECIPIENT_CATEGORY_LABELS[value] })),
        projects_missing_admin_responsavel: projectsMissingAdminResponsavel,
        data: rules.map((r) => ({
          ...r,
          entity_type: TRIGGER_ENTITY_TYPE[r.trigger_type] ?? null,
          recipient_roles: parseRecipientRoles(r.recipient_roles_json) ?? [],
          last_triggered_at: lastRunByRule.get(r.id) ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/rules/:id ──────────────────────────────

const editRuleSchema = z.object({
  is_active: z.boolean().optional(),
  lead_time_minutes: z.number().int().min(1).max(30 * 24 * 60).optional().nullable(),
  severity_override: z.enum(["info", "warning", "error"]).nullable().optional(),
  // Categorias (papéis/relações) — nunca um id de usuário individual. Isso é
  // exclusivo do Alerta Avulso; uma regra geral escolhe QUEM PODE receber,
  // nunca UMA pessoa específica.
  recipient_roles: z.array(z.enum(RECIPIENT_CATEGORIES)).min(1, "Selecione ao menos uma categoria de destinatário").optional(),
});

router.patch(
  "/admin/rules/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editRuleSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe ao menos um campo para editar" });
        return;
      }

      const before = await prisma.alertRule.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Regra não encontrada" });
        return;
      }

      // Antecedência só faz sentido pra gatilhos "due_soon" — não deixa
      // configurar à toa num gatilho de atraso, que nunca a usa.
      if (body.data.lead_time_minutes !== undefined && !isDueSoonTrigger(before.trigger_type)) {
        res.status(400).json({ error: "Este gatilho não usa antecedência" });
        return;
      }

      const { recipient_roles, ...rest } = body.data;
      const updated = await prisma.alertRule.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(recipient_roles ? { recipient_roles_json: JSON.stringify([...new Set(recipient_roles)]) } : {}),
          updated_by_id: req.user!.id,
        },
      });

      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_rule.updated",
        before: {
          alert_rule_id: before.id,
          is_active: before.is_active,
          lead_time_minutes: before.lead_time_minutes,
          severity_override: before.severity_override,
          recipient_roles: parseRecipientRoles(before.recipient_roles_json),
        },
        after: { alert_rule_id: before.id, ...rest, ...(recipient_roles ? { recipient_roles } : {}) },
      });

      res.json({
        ...updated,
        entity_type: TRIGGER_ENTITY_TYPE[updated.trigger_type] ?? null,
        recipient_roles: parseRecipientRoles(updated.recipient_roles_json) ?? [],
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Alertas Programados (ata 2026-08, 4º lote) — estrutura própria e explícita
// (nunca cron livre digitado pelo Admin). Cada disparo vira um SystemAlert
// comum (ver src/lib/alert-engine.ts). Nunca misturado com Regras de
// tarefa/etapa — programação é por data/horário, regra é por gatilho.
// ═══════════════════════════════════════════════════════════════════════════

function scheduleWithImageUrl<T extends { id: string; image_file_name: string | null }>(schedule: T) {
  // Arquivo ADMINISTRATIVO da Programação — só Admin Master (ver GET
  // /admin/schedules/:id/image abaixo). O destinatário de uma ocorrência
  // gerada por esta Programação nunca vê esta URL; ele recebe a URL do
  // PRÓPRIO snapshot da ocorrência, via withImageUrl.
  return { ...schedule, image_url: schedule.image_file_name ? `/api/system-alerts/admin/schedules/${schedule.id}/image` : null };
}

router.get(
  "/admin/schedules",
  verifyToken,
  requireAdminMaster,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const schedules = await prisma.alertSchedule.findMany({ orderBy: { created_at: "desc" } });
      const userIds = [...new Set(schedules.map((s) => s.user_id).filter((id): id is string => !!id))];
      const users = userIds.length
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : [];
      const byId = new Map(users.map((u) => [u.id, u]));
      res.json({
        data: schedules.map((s) => ({
          ...scheduleWithImageUrl(s),
          weekdays: s.weekdays_json ? JSON.parse(s.weekdays_json) : [],
          destinatario: s.user_id ? (byId.get(s.user_id) ?? null) : null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

const scheduleObjectSchema = z.object({
  name: z.string().trim().min(3).max(200),
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(2000),
  severity: z.enum(["info", "warning", "error"]),
  user_id: z.string().trim().min(1).nullable().optional(),
  image_file_name: z.string().trim().min(1).nullable().optional(),
  image_alt: z.string().trim().max(300).nullable().optional(),
  recurrence_type: z.enum(["once", "daily", "weekly"]),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  time_of_day: z.string().refine(isValidTimeOfDay, "Horário inválido — use HH:MM"),
  timezone: z.string().refine(isValidIanaTimeZone, "Timezone inválida"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  occurrence_expires_minutes: z.number().int().positive().max(30 * 24 * 60).nullable().optional(),
});

const scheduleBaseSchema = scheduleObjectSchema
  .refine((d) => !d.image_file_name || !!d.image_alt, { message: "Texto alternativo é obrigatório quando há imagem", path: ["image_alt"] })
  .refine((d) => d.recurrence_type !== "weekly" || (d.weekdays && d.weekdays.length > 0), {
    message: "Selecione ao menos um dia da semana",
    path: ["weekdays"],
  });

async function validateScheduleRecipientAndImage(body: {
  user_id?: string | null;
  image_file_name?: string | null;
}): Promise<string | null> {
  if (body.user_id) {
    const user = await prisma.user.findUnique({ where: { id: body.user_id }, select: { is_active: true } });
    if (!user || !user.is_active) return "Destinatário inválido ou inexistente";
  }
  if (body.image_file_name && !fs.existsSync(alertImagePath(body.image_file_name))) {
    return "Imagem inválida — envie novamente";
  }
  return null;
}

function buildScheduleDates(data: z.infer<typeof scheduleBaseSchema>) {
  const [y, m, d] = data.start_date.split("-").map(Number);
  const [hh, mm] = data.time_of_day.split(":").map(Number);
  const startsAt = zonedTimeToUtc(y!, m!, d!, hh!, mm!, data.timezone);
  let endsAt: Date | null = null;
  if (data.end_date) {
    const [ey, em, ed] = data.end_date.split("-").map(Number);
    endsAt = zonedTimeToUtc(ey!, em!, ed!, 23, 59, data.timezone);
  }
  return { startsAt, endsAt };
}

router.post(
  "/admin/schedules",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = scheduleBaseSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      const validationError = await validateScheduleRecipientAndImage(body.data);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const { startsAt, endsAt } = buildScheduleDates(body.data);
      if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
        res.status(400).json({ error: "Data final precisa ser depois da inicial" });
        return;
      }

      const scheduleForCalc = {
        id: "pending",
        recurrence_type: body.data.recurrence_type,
        weekdays_json: body.data.weekdays ? JSON.stringify(body.data.weekdays) : null,
        time_of_day: body.data.time_of_day,
        timezone: body.data.timezone,
        starts_at: startsAt,
        ends_at: endsAt,
      } as Parameters<typeof computeNextRun>[0];
      const nextRun = computeNextRun(scheduleForCalc, new Date(Date.now() - 1));

      const created = await prisma.alertSchedule.create({
        data: {
          name: body.data.name,
          title: body.data.title,
          message: body.data.message,
          severity: body.data.severity,
          image_file_name: body.data.image_file_name ?? null,
          image_alt: body.data.image_file_name ? (body.data.image_alt ?? null) : null,
          user_id: body.data.user_id ?? null,
          recurrence_type: body.data.recurrence_type,
          weekdays_json: body.data.weekdays ? JSON.stringify(body.data.weekdays) : null,
          time_of_day: body.data.time_of_day,
          timezone: body.data.timezone,
          starts_at: startsAt,
          ends_at: endsAt,
          occurrence_expires_minutes: body.data.occurrence_expires_minutes ?? null,
          next_run_at: nextRun,
          created_by_id: req.user!.id,
        },
      });

      await writeAccessAudit({ actorId: req.user!.id, action: "alert_schedule.created", after: { alert_schedule_id: created.id, name: created.name } });

      res.status(201).json({ ...scheduleWithImageUrl(created), weekdays: body.data.weekdays ?? [] });
    } catch (err) {
      next(err);
    }
  },
);

const editScheduleSchema = scheduleObjectSchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.patch(
  "/admin/schedules/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editScheduleSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe ao menos um campo para editar" });
        return;
      }

      const before = await prisma.alertSchedule.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Programação não encontrada" });
        return;
      }

      const validationError = await validateScheduleRecipientAndImage(body.data);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const { is_active, weekdays, start_date, end_date, image_file_name, image_alt, ...rest } = body.data;
      const imageChanging = image_file_name !== undefined;

      // Recalcula a próxima execução sempre que horário/dias/timezone/
      // recorrência/datas mudarem — nunca duplica a execução anterior
      // (last_run_at fica intocado; ocorrências já geradas não são tocadas).
      const scheduleChanged =
        rest.recurrence_type !== undefined || weekdays !== undefined || rest.time_of_day !== undefined ||
        rest.timezone !== undefined || start_date !== undefined || end_date !== undefined;

      let starts_at = before.starts_at;
      let ends_at = before.ends_at;
      if (scheduleChanged) {
        const merged = {
          recurrence_type: rest.recurrence_type ?? before.recurrence_type,
          time_of_day: rest.time_of_day ?? before.time_of_day,
          timezone: rest.timezone ?? before.timezone,
          start_date: start_date ?? null,
          end_date: end_date === undefined ? null : end_date,
          weekdays: weekdays ?? (before.weekdays_json ? JSON.parse(before.weekdays_json) : []),
        };
        if (start_date) {
          const dates = buildScheduleDates({ ...merged, start_date: merged.start_date! } as z.infer<typeof scheduleBaseSchema>);
          starts_at = dates.startsAt;
          if (end_date !== undefined) ends_at = dates.endsAt;
        } else if (end_date !== undefined) {
          if (end_date === null) {
            ends_at = null;
          } else {
            const [ey, em, ed] = end_date.split("-").map(Number);
            ends_at = zonedTimeToUtc(ey!, em!, ed!, 23, 59, merged.timezone);
          }
        }
      }

      const updated = await prisma.alertSchedule.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(weekdays !== undefined ? { weekdays_json: JSON.stringify(weekdays) } : {}),
          ...(scheduleChanged ? { starts_at, ends_at } : {}),
          ...(is_active !== undefined ? { is_active } : {}),
          ...(imageChanging ? { image_file_name: image_file_name ?? null, image_alt: image_file_name ? (image_alt ?? null) : null } : {}),
          updated_by_id: req.user!.id,
        },
      });

      if (imageChanging && before.image_file_name && before.image_file_name !== image_file_name) {
        deleteAlertImage(before.image_file_name);
      }

      // Reativar (is_active volta a true) ou qualquer mudança de padrão
      // sempre recalcula next_run_at a partir de agora — nunca reaproveita
      // um valor congelado de quando estava pausada/desatualizada.
      if (scheduleChanged || is_active === true) {
        const nextRun = updated.is_active
          ? computeNextRun(
              {
                id: updated.id,
                recurrence_type: updated.recurrence_type,
                weekdays_json: updated.weekdays_json,
                time_of_day: updated.time_of_day,
                timezone: updated.timezone,
                starts_at: updated.starts_at,
                ends_at: updated.ends_at,
              } as Parameters<typeof computeNextRun>[0],
              new Date(),
            )
          : null;
        await prisma.alertSchedule.update({ where: { id: updated.id }, data: { next_run_at: nextRun } });
        updated.next_run_at = nextRun;
      } else if (is_active === false) {
        await prisma.alertSchedule.update({ where: { id: updated.id }, data: { next_run_at: null } });
        updated.next_run_at = null;
      }

      await writeAccessAudit({
        actorId: req.user!.id,
        action: is_active !== undefined ? (is_active ? "alert_schedule.activated" : "alert_schedule.deactivated") : "alert_schedule.updated",
        before: { alert_schedule_id: before.id, is_active: before.is_active, next_run_at: before.next_run_at },
        after: { alert_schedule_id: before.id, is_active: updated.is_active, next_run_at: updated.next_run_at },
      });

      res.json({ ...scheduleWithImageUrl(updated), weekdays: updated.weekdays_json ? JSON.parse(updated.weekdays_json) : [] });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/admin/schedules/:id/archive",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await prisma.alertSchedule.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Programação não encontrada" });
        return;
      }
      const updated = await prisma.alertSchedule.update({
        where: { id: before.id },
        data: { is_archived: true, is_active: false, archived_at: new Date(), next_run_at: null },
      });
      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_schedule.archived",
        before: { alert_schedule_id: before.id },
        after: { alert_schedule_id: before.id },
      });
      res.json({ ...scheduleWithImageUrl(updated), weekdays: updated.weekdays_json ? JSON.parse(updated.weekdays_json) : [] });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/schedules/:id/preview",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await prisma.alertSchedule.findUnique({ where: { id: req.params.id as string } });
      if (!schedule) {
        res.status(404).json({ error: "Programação não encontrada" });
        return;
      }
      res.json({
        title: schedule.title,
        message: schedule.message,
        severity: schedule.severity,
        image_url: schedule.image_file_name ? `/api/system-alerts/admin/schedules/${schedule.id}/image` : null,
        image_alt: schedule.image_alt,
        fictitious: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /admin/schedules/:id/image — arquivo ADMINISTRATIVO da Programação.
// Só Admin Master. O destinatário de uma ocorrência gerada por esta
// Programação acessa o PRÓPRIO snapshot da ocorrência (GET /:id/image),
// nunca este arquivo administrativo.
router.get(
  "/admin/schedules/:id/image",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await prisma.alertSchedule.findUnique({
        where: { id: req.params.id as string },
        select: { image_file_name: true },
      });
      if (!schedule || !schedule.image_file_name) {
        res.status(404).json({ error: "Imagem não encontrada" });
        return;
      }
      if (!sendAlertImageFile(res, schedule.image_file_name)) {
        res.status(404).json({ error: "Imagem não encontrada" });
      }
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/:id — visualização detalhada + histórico ─────────
// (ata 2026-08, 8º lote: "Detalhes" na Central de Alertas). Mesmo escopo de
// isolamento do feed pessoal (escopoDoUsuario) — um usuário não consegue
// consultar o histórico de outro alterando o ID na URL; 404 tanto pra
// inexistente quanto pra fora de escopo, nunca revelando qual dos dois é.
// Nunca expõe token/segredo — IDs técnicos só aparecem em campos próprios
// (`_debug_ids`), nunca como o rótulo principal de nada.

function isAdminReq(req: Request): boolean {
  return req.user!.role === "admin" || req.user!.account_type === "admin";
}

async function resolveDestinatario(userId: string | null): Promise<
  | { kind: "geral" }
  | { kind: "pessoa"; id: string; name: string; email: string }
  | { kind: "indisponivel" }
> {
  if (!userId) return { kind: "geral" };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  return user ? { kind: "pessoa", ...user } : { kind: "indisponivel" };
}

type DestinationInfo = {
  entity_type: string;
  label: string;
  name: string | null;
  code: string | null;
  status: "disponivel" | "removido" | "sem_acesso";
};

// Reaproveita os MESMOS helpers de escopo já usados pra validar o destino
// do Avulso na criação (getTaskScopeWhere/combinedProjectWhere) — nunca uma
// checagem de acesso paralela e potencialmente divergente.
async function resolveDestinationForDetail(
  entityType: string,
  entityId: string,
  entityParentId: string | null,
  viewer: { id: string; account_type: string; role: string },
): Promise<DestinationInfo | null> {
  if (entityType === "project_task" || entityType === "project_task_stage") {
    const taskId = entityType === "project_task_stage" ? entityParentId : entityId;
    if (!taskId) return null;
    const scopeWhere = await getTaskScopeWhere(viewer.id, viewer.account_type, viewer.role);
    if (scopeWhere === null) {
      return { entity_type: entityType, label: entityType === "project_task_stage" ? "Etapa" : "Tarefa", name: null, code: null, status: "sem_acesso" };
    }
    const task = await prisma.projectTask.findFirst({
      where: Object.keys(scopeWhere).length === 0 ? { id: taskId } : applyScope({ id: taskId }, scopeWhere),
      select: { id: true, title: true, task_code: true },
    });
    if (!task) {
      // Existe mas fora de escopo, ou realmente não existe — mesma
      // checagem de existência bruta (sem escopo) só pra escolher a
      // mensagem certa, nunca pra revelar dado de outro escopo.
      const existsAnywhere = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { id: true } });
      return {
        entity_type: entityType,
        label: entityType === "project_task_stage" ? "Etapa" : "Tarefa",
        name: null,
        code: null,
        status: existsAnywhere ? "sem_acesso" : "removido",
      };
    }
    return {
      entity_type: entityType,
      label: entityType === "project_task_stage" ? "Etapa (tarefa vinculada)" : "Tarefa",
      name: task.title,
      code: task.task_code,
      status: "disponivel",
    };
  }

  if (entityType === "project") {
    const { where: scopeWhere } = await combinedProjectWhere(prisma, viewer.id, viewer.account_type);
    if (scopeWhere === null) {
      return { entity_type: "project", label: "Projeto", name: null, code: null, status: "sem_acesso" };
    }
    const project = await prisma.project.findFirst({
      where: Object.keys(scopeWhere).length === 0 ? { id: entityId } : { AND: [{ id: entityId }, scopeWhere] },
      select: { id: true, title: true, project_code: true },
    });
    if (!project) {
      const existsAnywhere = await prisma.project.findUnique({ where: { id: entityId }, select: { id: true } });
      return { entity_type: "project", label: "Projeto", name: null, code: null, status: existsAnywhere ? "sem_acesso" : "removido" };
    }
    return { entity_type: "project", label: "Projeto", name: project.title, code: project.project_code, status: "disponivel" };
  }

  // Tipo não reconhecido (ex.: "alert_schedule" — nunca teve tela própria)
  // — não é "destino", é só metadado de origem; ver origin_type.
  return null;
}

router.get(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      const viewer = { id: req.user!.id, account_type: req.user!.account_type, role: req.user!.role };
      const isAdmin = isAdminReq(req);

      const [destinatario, destination, events] = await Promise.all([
        resolveDestinatario(alert.user_id),
        alert.entity_type && alert.entity_id
          ? resolveDestinationForDetail(alert.entity_type, alert.entity_id, alert.entity_parent_id, viewer)
          : Promise.resolve(null),
        prisma.systemAlertEvent.findMany({
          where: { alert_id: alert.id },
          orderBy: { created_at: "asc" },
        }),
      ]);

      // Origem: derivada só de campos reais, nunca adivinhada (ver
      // comentário no schema — as 4 origens são mutuamente exclusivas na
      // prática de como cada uma é criada).
      let origin: Record<string, unknown>;
      if (alert.schedule_id) {
        const schedule = await prisma.alertSchedule.findUnique({
          where: { id: alert.schedule_id },
          select: { id: true, name: true },
        });
        origin = {
          type: "programado",
          // Nome administrativo da programação nunca aparece pro
          // destinatário (mesma regra já estabelecida no schema) — só
          // visível pra quem administra a Central.
          schedule_name: isAdmin ? (schedule?.name ?? null) : null,
        };
      } else if (alert.rule_id || alert.standard_id) {
        const [rule, standard] = await Promise.all([
          alert.rule_id ? prisma.alertRule.findUnique({ where: { id: alert.rule_id }, select: { name: true } }) : null,
          alert.standard_id ? prisma.alertStandard.findUnique({ where: { id: alert.standard_id }, select: { name: true } }) : null,
        ]);
        origin = { type: "padrao_regra", rule_name: rule?.name ?? null, standard_name: standard?.name ?? null };
      } else if (alert.type === CRITICALITY_TYPE) {
        const criador = alert.created_by_user_id
          ? await prisma.user.findUnique({ where: { id: alert.created_by_user_id }, select: { id: true, name: true } })
          : null;
        origin = { type: "avulso", created_by: criador };
      } else {
        origin = { type: "automatico" };
      }

      // Situação atual em texto — a interface nunca decide isto sozinha a
      // partir de booleanos soltos. Reparo (ata 2026-08, 10º lote):
      // `resolved_at` é do MOTOR automático (expiração/regra, ver schema) —
      // usá-lo aqui fazia um alerta EXPIRADO aparecer como "resolvido" no
      // detalhe, um bug real. `manual_resolved_at` é a resolução humana
      // deste lote, campo novo e distinto. "dispensado" é novo aqui
      // também (is_read=true, nem resolvido nem arquivado) — antes não
      // tinha rótulo próprio nenhum.
      const situacao = alert.manual_resolved_at
        ? "resolvido"
        : alert.is_archived
          ? "arquivado"
          : alert.expires_at && alert.expires_at.getTime() <= Date.now()
            ? "expirado"
            : alert.is_read
              ? "dispensado"
              : "ativo";

      const resolution = alert.manual_resolved_at
        ? {
            resolved_at: alert.manual_resolved_at,
            action: alert.resolution_action,
            description: alert.resolution_description,
            resolved_by: alert.resolved_by_user_id
              ? await prisma.user.findUnique({ where: { id: alert.resolved_by_user_id }, select: { id: true, name: true } })
              : null,
          }
        : null;

      res.json({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        category: alert.category,
        situacao,
        resolution,
        created_at: alert.created_at,
        expires_at: alert.expires_at,
        has_image: !!alert.image_file_name,
        image_url: alert.image_file_name ? `/api/system-alerts/${alert.id}/image` : null,
        image_alt: alert.image_alt,
        origin,
        destinatario,
        // entity_type/entity_id/entity_parent_id crus — só pra montar o
        // link de "Ver origem" no frontend, reaproveitando o MESMO
        // systemAlertLink() já usado no feed (nunca uma segunda lógica de
        // link). `destination` acima é a versão pra EXIBIÇÃO (nome/status).
        entity_type: alert.entity_type,
        entity_id: alert.entity_id,
        entity_parent_id: alert.entity_parent_id,
        destination,
        events: events.map((e) => ({
          id: e.id,
          event_type: e.event_type,
          description: e.description,
          created_at: e.created_at,
          // actor_user_id nunca exposto direto — só pra Admin, resolvido
          // adiante se algum dia for preciso mostrar "por quem"; por ora a
          // `description` já é gerada no servidor com o suficiente.
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/system-alerts/:id/events — eventos de visualização ────────────
// "detalhes abertos" e "origem clicada" não mudam estado nenhum da
// ocorrência — são ações do destinatário que só fazem sentido registradas
// quando o próprio destinatário as realiza intencionalmente (nunca
// disparadas por polling, pré-carregamento ou re-render). O corpo aceita só
// os dois tipos abaixo — nunca um event_type arbitrário vindo do cliente
// (os demais tipos da linha do tempo só nascem no servidor, amarrados a uma
// mudança de estado real).
//
// client_event_id (ata 2026-08, 9º lote — reparo idempotência): obrigatório
// aqui, nunca opcional — é a garantia REAL contra clique duplo, retry de
// rede, Strict Mode e efeitos concorrentes (ver
// recordClientTriggeredEventIdempotent, protegida por índice único no
// banco). Um `useRef` no frontend continua existindo como otimização (evita
// a chamada de rede na maioria dos casos), mas nunca é a única linha de
// defesa.
const postEventSchema = z.object({
  event_type: z.enum(["details_opened", "origin_clicked"]),
  client_event_id: z.string().trim().min(8).max(100),
});

router.post(
  "/:id/events",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = postEventSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
        select: { id: true },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const { duplicate } = await recordClientTriggeredEventIdempotent(alert.id, {
        eventType: body.data.event_type,
        description: body.data.event_type === "details_opened" ? "Detalhes abertos." : "Origem acessada (\"Ver origem\").",
        actorUserId: req.user!.id,
        clientEventId: body.data.client_event_id,
      });
      res.status(duplicate ? 200 : 201).json({ ok: true, duplicate });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

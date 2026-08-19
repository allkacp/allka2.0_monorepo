import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import sanitizeHtml from "sanitize-html";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { computeDashboardWidgetsMetrics } from "../lib/dashboard-widgets";
import { resolveDashboardScopeExtras } from "../lib/dashboard-scope";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "../lib/file-storage";

const router = Router();

// ─── Resolução por token OU slug ────────────────────────────────────────────
// Ponto único de convergência: o segmento público da URL (":token" nas
// rotas abaixo — o nome do param é histórico, o valor pode ser o token
// opaco OU a URL amigável em ShareLink.slug) é resolvido aqui pra um
// ShareLink, e só então TODAS as checagens de segurança de sempre
// (revoked_at/expires_at/deleted_at/PIN/permission/escopo) rodam
// normalmente — o slug nunca decide autorização, só localiza o registro.
// Ver criação/edição do slug em routes/dashboard-shares.ts.
function shareLinkByIdentifierWhere(identifier: string) {
  return { OR: [{ token: identifier }, { slug: identifier }] };
}

// ─── GET /api/share/:token/meta — metadados públicos (sem dados sensíveis) ─
// Usado pela página pública pra saber o que renderizar (título, permissão,
// se pede PIN, se está expirado/revogado) SEM decodificar nada no cliente —
// o token agora é opaco.
router.get("/:token/meta", async (req, res, next) => {
  try {
    const link = await prisma.shareLink.findFirst({
      where: shareLinkByIdentifierWhere(req.params.token),
      select: {
        target_id: true,
        target_type: true,
        target_title: true,
        permission: true,
        pin_hash: true,
        profile: true,
        period_type: true,
        period_from: true,
        period_to: true,
        period_label: true,
        allow_filter_changes: true,
        expires_at: true,
        revoked_at: true,
        deleted_at: true,
        created_at: true,
      },
    });

    if (!link || link.deleted_at) {
      res.status(404).json({ status: "invalid" });
      return;
    }
    if (link.revoked_at) {
      res.status(410).json({ status: "revoked" });
      return;
    }
    if (link.expires_at && link.expires_at < new Date()) {
      res.status(410).json({ status: "expired" });
      return;
    }

    res.json({
      status: "ok",
      target: { id: link.target_id, type: link.target_type, title: link.target_title },
      permission: link.permission,
      pinRequired: !!link.pin_hash,
      profile: link.profile,
      period: link.period_type
        ? {
            type: link.period_type,
            from: link.period_from?.toISOString(),
            to: link.period_to?.toISOString(),
            label: link.period_label,
          }
        : null,
      allowFilterChanges: link.allow_filter_changes,
      issuedAt: link.created_at.toISOString(),
      expiresAt: link.expires_at?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/share/:token/verify-pin — checagem de PIN (pública) ─────────
router.post("/:token/verify-pin", async (req, res, next) => {
  try {
    const { pin } = req.body as { pin?: string };
    const link = await prisma.shareLink.findFirst({
      where: shareLinkByIdentifierWhere(req.params.token),
      select: { pin_hash: true, revoked_at: true, expires_at: true, deleted_at: true },
    });
    if (!link || link.deleted_at || link.revoked_at || (link.expires_at && link.expires_at < new Date())) {
      res.status(404).json({ valid: false });
      return;
    }
    if (!link.pin_hash) {
      res.json({ valid: true });
      return;
    }
    const valid = !!pin && (await bcrypt.compare(pin, link.pin_hash));
    res.json({ valid });
  } catch (err) {
    next(err);
  }
});

// ─── Comentários ────────────────────────────────────────────────────────────
// Resolve o ShareLink real (validando revogação/expiração/permissão) a
// partir só do token da URL — nunca aceita um id de dashboard/share vindo
// do corpo da requisição, exatamente pra impedir que o token de um
// compartilhamento seja usado pra comentar em outro.
type ResolvedLink =
  | { error: number; body: { error: string } }
  | { link: NonNullable<Awaited<ReturnType<typeof prisma.shareLink.findUnique>>> };

async function resolveCommentableLink(identifier: string): Promise<ResolvedLink> {
  const link = await prisma.shareLink.findFirst({ where: shareLinkByIdentifierWhere(identifier) });
  if (!link || link.deleted_at) return { error: 404, body: { error: "Token inválido" } };
  if (link.revoked_at) return { error: 410, body: { error: "Link cancelado" } };
  if (link.expires_at && link.expires_at < new Date())
    return { error: 410, body: { error: "Link expirado" } };
  return { link };
}

/**
 * Se o VISITANTE (não o link) estiver logado na própria plataforma no mesmo
 * navegador, o Authorization: Bearer do comentário é a sessão DELE — nunca
 * o token do compartilhamento, que já vai na URL. Nome/e-mail nesse caso
 * vêm do banco a partir do JWT, nunca do corpo (evita spoofing de autoria).
 * Ausência de header = visitante anônimo, tratado pelos campos do corpo —
 * agora nome TAMBÉM é obrigatório pro visitante (antes só e-mail).
 */
async function resolveCommentAuthor(
  req: import("express").Request,
  body: { authorName?: string; authorEmail?: string; authorWhatsapp?: string },
): Promise<
  | {
      ok: true;
      user_id: string | null;
      author_name: string | null;
      author_email: string;
      author_whatsapp: string | null;
    }
  | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), config.JWT_SECRET) as {
        id: string;
        email: string;
      };
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, name: true, email: true, phone: true },
      });
      if (user) {
        return {
          ok: true,
          user_id: user.id,
          author_name: user.name,
          author_email: user.email,
          // Telefone cadastrado na conta, se houver — nunca inventado.
          author_whatsapp: user.phone ?? null,
        };
      }
      // Token presente mas usuário não existe mais (conta removida) — cai
      // pro fluxo de visitante abaixo em vez de travar o comentário.
    } catch {
      // Token de sessão inválido/expirado — mesmo fallback: trata como visitante.
    }
  }

  const email = body.authorEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "E-mail é obrigatório para identificar o comentário." };
  }
  const name = body.authorName?.trim();
  if (!name) {
    return { ok: false, status: 400, error: "Nome é obrigatório para identificar o comentário." };
  }
  // WhatsApp: opcional; guardamos só dígitos (mesmo padrão de
  // normalizePhoneDigits em routes/client-records.ts) — aceita qualquer
  // formatação de entrada, sem validar DDD/tamanho estrito.
  const whatsappDigits = body.authorWhatsapp?.replace(/\D/g, "") ?? "";
  const author_whatsapp = whatsappDigits.length >= 8 ? whatsappDigits : null;

  return { ok: true, user_id: null, author_name: name, author_email: email, author_whatsapp };
}

const COMMENT_MAX_LENGTH = 500;

// Paleta fixa — nunca CSS arbitrário. Mesma paleta usada tanto pelo campo
// legado `color` (comentário plain inteiro) quanto pelas classes
// `ac-color-*` dentro do HTML rico (ver sanitizeRichContent) — uma fonte só.
const COMMENT_COLORS = ["default", "slate", "blue", "green", "amber", "red", "purple", "pink"] as const;
type CommentColor = (typeof COMMENT_COLORS)[number];
function sanitizeColor(value: unknown): CommentColor {
  return (COMMENT_COLORS as readonly string[]).includes(value as string)
    ? (value as CommentColor)
    : "default";
}

// Tamanhos controlados — igual à cor, só uma classe de uma lista fechada.
const COMMENT_SIZES = ["sm", "base", "lg"] as const;

// ── Sanitização do HTML rico (autoritativa — a validação do editor no
// frontend é só UX, isto aqui é o que de fato decide o que é persistido) ──
const richContentSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "span"],
  allowedAttributes: { span: ["class"] },
  allowedClasses: {
    span: [
      ...COMMENT_COLORS.map((c) => `ac-color-${c}`),
      ...COMMENT_SIZES.map((s) => `ac-size-${s}`),
    ],
  },
  // Nenhum link, nenhum atributo de evento, nenhum style — não estão nem
  // na lista de tags/atributos permitidos, então já saem por omissão; isto
  // aqui é só reforço explícito contra qualquer whitelist futura desatenta.
  disallowedTagsMode: "discard",
  allowedSchemes: [],
};

function sanitizeRichContent(html: string): string {
  return sanitizeHtml(html, richContentSanitizeOptions).trim();
}

/** Texto puro (sem tags nenhuma) — usado pra checar "está vazio?" e pra
 * antiduplicação, nos dois formatos (plain e html). */
function plainTextOf(content: string, format: string): string {
  if (format !== "html") return content;
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
}

// Mesmo padrão de apps/backend/src/lib/file-storage.ts + multer usado por
// ProjectAttachment (routes/projects.ts) — sem storage novo.
const ATTACHMENT_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const commentAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACHMENT_MAX_SIZE, files: 4 },
}).array("attachments", 4);

function serializeComment(c: {
  id: string;
  content: string | null;
  content_format: string;
  color: string;
  author_name: string | null;
  author_email: string;
  author_whatsapp: string | null;
  created_at: Date;
  attachments: { id: string; filename: string; mime_type: string; size: number }[];
}) {
  return {
    id: c.id,
    content: c.content ?? "",
    contentFormat: c.content_format === "html" ? "html" : "plain",
    color: c.color,
    authorName: c.author_name,
    authorEmail: c.author_email,
    authorWhatsapp: c.author_whatsapp,
    createdAt: c.created_at.toISOString(),
    attachments: c.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mime_type,
      size: a.size,
    })),
  };
}

const COMMENT_SELECT = {
  id: true,
  content: true,
  content_format: true,
  color: true,
  author_name: true,
  author_email: true,
  author_whatsapp: true,
  created_at: true,
  attachments: { select: { id: true, filename: true, mime_type: true, size: true } },
} as const;

// GET /api/share/:token/comments — lista (pública, só quando permission="comment")
router.get("/:token/comments", async (req, res, next) => {
  try {
    const resolved = await resolveCommentableLink(String(req.params.token));
    if ("error" in resolved) {
      res.status(resolved.error).json(resolved.body);
      return;
    }
    if (resolved.link.permission !== "comment") {
      res.status(403).json({ error: "Este link não permite comentários." });
      return;
    }
    const comments = await prisma.shareComment.findMany({
      where: { share_link_id: resolved.link.id, status: "visible" },
      orderBy: { created_at: "asc" },
      select: COMMENT_SELECT,
    });
    res.json({ comments: comments.map(serializeComment) });
  } catch (err) {
    next(err);
  }
});

// POST /api/share/:token/comments — cria (pública, só quando permission="comment")
// multipart/form-data: campos de texto + até 4 arquivos em "attachments".
router.post("/:token/comments", commentAttachmentUpload, async (req, res, next) => {
  try {
    const resolved = await resolveCommentableLink(String(req.params.token));
    if ("error" in resolved) {
      res.status(resolved.error).json(resolved.body);
      return;
    }
    if (resolved.link.permission !== "comment") {
      res.status(403).json({ error: "Este link não permite comentários." });
      return;
    }

    const { content, contentFormat, authorName, authorEmail, authorWhatsapp, color } = req.body as {
      content?: string;
      contentFormat?: string;
      authorName?: string;
      authorEmail?: string;
      authorWhatsapp?: string;
      color?: string;
    };
    const format = contentFormat === "html" ? "html" : "plain";
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    // HTML sempre passa pelo sanitizador ANTES de qualquer outra coisa — o
    // que sobra depois disso é o único conteúdo que existe daqui pra
    // frente; nada do que o cliente mandou de "cru" é usado outra vez.
    const storedContent = format === "html" ? sanitizeRichContent(content ?? "") : (content?.trim() ?? "");
    const plainText = plainTextOf(storedContent, format).trim();

    if (!plainText && files.length === 0) {
      res.status(400).json({ error: "Escreva um comentário ou anexe um arquivo." });
      return;
    }
    if (plainText.length > COMMENT_MAX_LENGTH) {
      res.status(400).json({ error: `Comentário excede ${COMMENT_MAX_LENGTH} caracteres.` });
      return;
    }
    for (const file of files) {
      if (!ATTACHMENT_ALLOWED_MIME.includes(file.mimetype)) {
        res.status(400).json({ error: `Tipo de arquivo não permitido: ${file.mimetype}` });
        return;
      }
      // multer.limits.fileSize já corta no meio do upload, mas o corte dele
      // gera um erro genérico — validar aqui de novo dá uma mensagem clara.
      if (file.size > ATTACHMENT_MAX_SIZE) {
        res.status(400).json({ error: `Arquivo "${file.originalname}" excede 10 MB.` });
        return;
      }
    }

    const author = await resolveCommentAuthor(req, { authorName, authorEmail, authorWhatsapp });
    if (!author.ok) {
      res.status(author.status).json({ error: author.error });
      return;
    }

    // ── Antiduplicação ──────────────────────────────────────────────────
    // Mesmo link + mesmo autor (user_id se autenticado, senão e-mail) +
    // mesmo conteúdo normalizado (trim, espaços colapsados, case-insensitive)
    // + enviado nos últimos 30s → reutiliza o comentário existente em vez
    // de criar outro. Só se aplica quando há texto (anexo sozinho sempre
    // passa: duas fotos diferentes não têm "conteúdo" pra comparar).
    if (plainText) {
      const normalized = plainText.toLowerCase().replace(/\s+/g, " ");
      const since = new Date(Date.now() - 30_000);
      const recentCandidates = await prisma.shareComment.findMany({
        where: {
          share_link_id: resolved.link.id,
          status: "visible",
          created_at: { gte: since },
          ...(author.user_id
            ? { user_id: author.user_id }
            : { user_id: null, author_email: author.author_email }),
        },
        select: { ...COMMENT_SELECT },
        orderBy: { created_at: "desc" },
      });
      // Compara o texto puro extraído de cada candidato (não o HTML cru) —
      // dois comentários visualmente iguais com formatação diferente contam
      // como duplicata.
      const dup = recentCandidates.find(
        (c) =>
          plainTextOf(c.content ?? "", c.content_format).trim().toLowerCase().replace(/\s+/g, " ") ===
          normalized,
      );
      if (dup) {
        res.status(200).json({ ...serializeComment(dup), duplicate: true });
        return;
      }
    }

    const created = await prisma.shareComment.create({
      data: {
        share_link_id: resolved.link.id,
        // "plain": texto puro, escapado na renderização como sempre.
        // "html": já passou por sanitizeRichContent acima — o que está
        // aqui é o único HTML que existirá pra este comentário dali em
        // diante.
        content: storedContent || null,
        content_format: format,
        color: sanitizeColor(color),
        author_name: author.author_name,
        author_email: author.author_email,
        author_whatsapp: author.author_whatsapp,
        user_id: author.user_id,
      },
      select: { id: true },
    });

    if (files.length > 0) {
      const dir = ensureUploadDir(`share-comments/${created.id}`);
      await Promise.all(
        files.map(async (file) => {
          const storageKey = generateStoredFileName(file.originalname);
          await fs.promises.writeFile(path.join(dir, storageKey), file.buffer);
          await prisma.shareCommentAttachment.create({
            data: {
              comment_id: created.id,
              filename: file.originalname,
              mime_type: file.mimetype,
              size: file.size,
              storage_key: storageKey,
            },
          });
        }),
      );
    }

    const full = await prisma.shareComment.findUniqueOrThrow({
      where: { id: created.id },
      select: COMMENT_SELECT,
    });
    res.status(201).json(serializeComment(full));
  } catch (err) {
    next(err);
  }
});

// GET /api/share/:token/comments/attachments/:attachmentId — download público
// (mesmo padrão res.download já usado em routes/projects.ts), validado
// contra o MESMO token/permissão do comentário — nunca serve um anexo de
// outro compartilhamento.
router.get("/:token/comments/attachments/:attachmentId", async (req, res, next) => {
  try {
    const resolved = await resolveCommentableLink(String(req.params.token));
    if ("error" in resolved) {
      res.status(resolved.error).json(resolved.body);
      return;
    }
    if (resolved.link.permission !== "comment") {
      res.status(403).json({ error: "Este link não permite comentários." });
      return;
    }
    const attachment = await prisma.shareCommentAttachment.findFirst({
      where: {
        id: String(req.params.attachmentId),
        comment: { share_link_id: resolved.link.id },
      },
    });
    if (!attachment) {
      res.status(404).json({ error: "Anexo não encontrado" });
      return;
    }
    const filePath = uploadedFilePath(`share-comments/${attachment.comment_id}`, attachment.storage_key);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Arquivo não encontrado em disco" });
      return;
    }
    res.setHeader("Content-Type", attachment.mime_type);
    res.download(filePath, attachment.filename);
  } catch (err) {
    next(err);
  }
});

// ─── Date range helper ───────────────────────────────────────────────────────
function getDateRange(
  periodType: string,
  dateFrom?: string,
  dateTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const sub = (d: Date, days: number) =>
    new Date(d.getTime() - days * 86_400_000);

  switch (periodType) {
    case "today": {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: s, to: new Date(s.getTime() + 86_400_000 - 1) };
    }
    case "yesterday": {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return { from: s, to: new Date(s.getTime() + 86_400_000 - 1) };
    }
    case "last_7_days":
      return { from: sub(now, 7), to: now };
    case "last_30_days":
      return { from: sub(now, 30), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "last_quarter":
    case "last_90_days":
      return { from: sub(now, 90), to: now };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "custom":
      return {
        from: dateFrom ? new Date(dateFrom) : sub(now, 30),
        to: dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : now,
      };
    default:
      return { from: sub(now, 30), to: now };
  }
}

// ─── POST /api/share/data — dados do dashboard compartilhado (pública) ─────
// Pública de propósito (link precisa funcionar fora da sessão do criador),
// mas toda config vem do banco via token opaco — nada é aceito do corpo da
// requisição além do próprio token e dos filtros de período (quando o link
// permite alterá-los).
router.post("/data", async (req, res, next) => {
  try {
    const { token, filters } = req.body as {
      token?: string;
      filters?: {
        periodType?: string;
        dateFrom?: string;
        dateTo?: string;
        status?: string;
      };
    };

    if (!token) {
      res.status(400).json({ error: "Token obrigatório" });
      return;
    }

    const link = await prisma.shareLink.findFirst({ where: shareLinkByIdentifierWhere(token) });
    if (!link || link.deleted_at) {
      res.status(400).json({ error: "Token inválido" });
      return;
    }
    if (link.revoked_at) {
      res.status(410).json({ error: "Link cancelado" });
      return;
    }
    if (link.expires_at && link.expires_at < new Date()) {
      res.status(410).json({ error: "Link expirado" });
      return;
    }

    // Filtro do visitante só é aceito se o link permite alterar filtros —
    // senão, sempre usa o período travado no momento da criação.
    const periodType = link.allow_filter_changes
      ? (filters?.periodType ?? link.period_type ?? "last_30_days")
      : (link.period_type ?? "last_30_days");
    const dateFromRaw = link.allow_filter_changes
      ? (filters?.dateFrom ?? link.period_from?.toISOString().slice(0, 10))
      : link.period_from?.toISOString().slice(0, 10);
    const dateToRaw = link.allow_filter_changes
      ? (filters?.dateTo ?? link.period_to?.toISOString().slice(0, 10))
      : link.period_to?.toISOString().slice(0, 10);

    const { from, to } =
      dateFromRaw && dateToRaw
        ? { from: new Date(dateFromRaw), to: new Date(`${dateToRaw}T23:59:59.999Z`) }
        : getDateRange(periodType, dateFromRaw, dateToRaw);

    // ── Escopo — resolvido e travado na criação do link (created_by), nunca
    // pelo visitante. Ver resolveOwnScopeId em lib/dashboard-scope.ts. A
    // MESMA função (resolveDashboardScopeExtras) monta os filtros aqui e no
    // dashboard autenticado normal (routes/dashboard.ts, POST /widgets) —
    // ponto único de convergência pra impedir os dois fluxos de divergirem
    // de novo (causa raiz original dos widgets zerados no compartilhado).
    const profile = link.profile;
    const scopeId = link.scope_id;
    const scopeExtras = await resolveDashboardScopeExtras(prisma, profile, scopeId);

    const metrics = await computeDashboardWidgetsMetrics(prisma, from, to, scopeExtras);

    const {
      revenue,
      revenueRec,
      revenueOne,
      revenueCp,
      avgTicket,
      outstanding,
      projectsTotal,
      projectsInProgress,
      projectsDelivered,
      projectsCancelled,
      pendingProjects,
      tasksTotal,
      tasksApproved,
      tasksInProgress,
      tasksPending,
      completionRate,
      nomadsActive,
      nomadsTotal,
      nomadsNew,
      companiesActive,
      companiesTrial,
      companiesSuspended,
      companiesCancelled,
      companiesTotal,
      partnersActive,
    } = metrics;

    const trendBase = (revenue: number) =>
      [0.7, 0.78, 0.84, 0.9, 0.96, 1].map((f) => Math.round(revenue * f));

    res.json({
      _meta: {
        profile,
        periodType,
        from: from.toISOString(),
        to: to.toISOString(),
        isRealData: true,
      },
      revenue: {
        total: revenue,
        growth: 0,
        creditPlan: revenueCp,
        recurring: revenueRec,
        oneTime: revenueOne,
        projected: Math.round(revenue * 1.1),
      },
      mrr: { value: revenue, growth: 0, trendData: trendBase(revenue) },
      churn: {
        rate: 0,
        inactiveAccounts: companiesSuspended + companiesCancelled,
        cancelledProjects: projectsCancelled,
        revenueChurn: 0,
        revenueChurnRate: 0,
      },
      averageTicket: {
        general: avgTicket,
        growth: 0,
        perProject: avgTicket,
        trendData: Array(6).fill(avgTicket),
      },
      ltv: {
        value: avgTicket * 12,
        agencies: 0,
        leadPremium: 0,
        nomades: 0,
        hist0to1k: 0,
        hist1kto5k: 0,
        hist5kto15k: companiesActive,
        hist15kplus: 0,
      },
      activeProjects: {
        total: projectsTotal,
        inProgress: projectsInProgress,
        delivered: projectsDelivered,
        pending: pendingProjects,
        growth: 0,
      },
      tasks: {
        total: tasksTotal,
        done: tasksApproved,
        inProgress: tasksInProgress,
        pending: tasksPending,
        completionRate,
      },
      accountsReceivable: {
        total: outstanding + revenue,
        creditPlans: 0,
        postPaid: outstanding + revenue,
        others: 0,
        received: revenue,
        growth: 0,
      },
      nomads: {
        total: nomadsTotal,
        active: nomadsActive,
        newThisMonth: nomadsNew,
        growth: 0,
        avgRating: 0,
      },
      partnerProgram: {
        activePartners: partnersActive,
        totalReferrals: 0,
        conversionRate: 0,
        partnerRevenue: 0,
      },
      statusOverview: {
        active: companiesActive,
        trial: companiesTrial,
        suspended: companiesSuspended,
        cancelled: companiesCancelled,
        total: companiesTotal,
      },
      creditPlans: { active: 0, totalValue: 0, avgValue: 0, overdue: 0 },
      platformActivities: {
        logins: 0,
        projectsCreated: projectsTotal,
        tasksCompleted: tasksApproved,
        messagesExchanged: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

// ─── Público-alvo (Allkademy) ──────────────────────────────────────────────
// Course.audience_profiles é uma string com valores separados por vírgula,
// dentre os tokens abaixo. "all" libera o curso para qualquer perfil.
const AUDIENCE_VALUES = ["all", "company", "agency", "nomades", "leader", "partner"] as const;
type AudienceValue = (typeof AUDIENCE_VALUES)[number];

function parseAudienceProfiles(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Resolve qual token de audiência corresponde ao usuário logado, a partir
// de account_type/role — mapeamento confirmado contra o uso real no
// restante do backend (ver auth.ts:32-33, lider.ts:13, users.ts:109/197).
function resolveAudienceProfile(user?: { role?: string; account_type?: string }): AudienceValue | null {
  if (!user) return null;
  if (user.account_type === "empresas") return "company";
  if (user.account_type === "agencias") return "agency";
  if (user.account_type === "nomades" || user.role === "nomad") return "nomades";
  if (user.role === "lider" || user.account_type === "lider") return "leader";
  if (user.account_type === "parceiro" || user.role === "partner") return "partner";
  return null;
}

function isAdminUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "admin" || user?.account_type === "admin";
}

// Curso é visível para o usuário se: ele é admin, OU o curso está publicado
// E (audience_profiles contém "all" OU contém o perfil resolvido do usuário).
function courseVisibleToUser(
  course: { is_published: boolean; audience_profiles: string },
  user?: { role?: string; account_type?: string },
): boolean {
  if (isAdminUser(user)) return true;
  if (!course.is_published) return false;
  const tokens = parseAudienceProfiles(course.audience_profiles);
  if (tokens.includes("all")) return true;
  const profile = resolveAudienceProfile(user);
  return !!profile && tokens.includes(profile);
}

const audienceProfilesSchema = z
  .string()
  .refine(
    (val) => {
      const tokens = parseAudienceProfiles(val);
      return tokens.length > 0 && tokens.every((t) => (AUDIENCE_VALUES as readonly string[]).includes(t));
    },
    { message: `audience_profiles deve ser uma lista separada por vírgula contendo apenas: ${AUDIENCE_VALUES.join(", ")}` },
  )
  .optional();

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  thumbnail: z.string().optional(),
  duration: z.number().int().optional(),
  is_published: z.boolean().default(false),
  is_free: z.boolean().default(true),
  audience_profiles: audienceProfilesSchema,
});

const moduleSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().default(0),
});

const lessonSchema = z.object({
  title: z.string().min(1),
  content_type: z.enum(["video", "text", "quiz"]).default("video"),
  content_url: z.string().optional(),
  duration: z.number().int().optional(),
  order: z.number().int().default(0),
});

// GET /api/allkademy/courses
router.get("/courses", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const category = req.query.category as string | undefined;
    const is_published = req.query.is_published;
    const admin = isAdminUser(req.user);

    const where: Record<string, unknown> = {};
    if (category) where["category"] = category;

    if (admin) {
      // Admin pode listar todos os cursos, inclusive rascunhos, e filtrar
      // por is_published explicitamente se quiser.
      if (is_published !== undefined) where["is_published"] = is_published === "true";
    } else {
      // Usuário comum só vê cursos publicados e liberados para o perfil dele
      // (ou liberados para "all"). Filtro aplicado no banco, não só na tela.
      where["is_published"] = true;
      const profile = resolveAudienceProfile(req.user);
      where["OR"] = [
        { audience_profiles: { contains: "all" } },
        ...(profile ? [{ audience_profiles: { contains: profile } }] : []),
      ];
    }

    const [total, data] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        include: {
          _count: { select: { modules: true, enrollments: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/allkademy/courses/:id
router.get("/courses/:id", verifyToken, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        modules: {
          include: { lessons: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      res.status(404).json({ error: "Curso não encontrado" });
      return;
    }

    if (!courseVisibleToUser(course, req.user)) {
      res.status(403).json({ error: "Curso não disponível para o seu perfil" });
      return;
    }

    res.json(course);
  } catch (err) {
    next(err);
  }
});

// POST /api/allkademy/courses — admin only
router.post("/courses", verifyToken, requireRole("admin"), validate(courseSchema), async (req, res, next) => {
  try {
    const course = await prisma.course.create({ data: req.body });
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allkademy/courses/:id — admin only
router.put(
  "/courses/:id",
  verifyToken,
  requireRole("admin"),
  validate(courseSchema.partial()),
  async (req, res, next) => {
    try {
      const course = await prisma.course.update({
        where: { id: (req.params.id as string) },
        data: req.body,
      });
      res.json(course);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/allkademy/courses/:id — admin only
router.delete("/courses/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.course.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/allkademy/courses/:id/modules — admin only
router.post(
  "/courses/:id/modules",
  verifyToken,
  requireRole("admin"),
  validate(moduleSchema),
  async (req, res, next) => {
    try {
      const module_ = await prisma.courseModule.create({
        data: { ...req.body, course_id: (req.params.id as string) },
        include: { lessons: true },
      });
      res.status(201).json(module_);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/allkademy/modules/:id/lessons — admin only
router.post(
  "/modules/:id/lessons",
  verifyToken,
  requireRole("admin"),
  validate(lessonSchema),
  async (req, res, next) => {
    try {
      const lesson = await prisma.lesson.create({
        data: { ...req.body, module_id: (req.params.id as string) },
      });
      res.status(201).json(lesson);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/allkademy/courses/:id/enroll
router.post("/courses/:id/enroll", verifyToken, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: (req.params.id as string) },
      select: { is_published: true, audience_profiles: true },
    });

    if (!course) {
      res.status(404).json({ error: "Curso não encontrado" });
      return;
    }

    if (!courseVisibleToUser(course, req.user)) {
      res.status(403).json({ error: "Curso não disponível para o seu perfil" });
      return;
    }

    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        course_id_user_id: {
          course_id: (req.params.id as string),
          user_id: req.user!.id,
        },
      },
      create: {
        course_id: (req.params.id as string),
        user_id: req.user!.id,
      },
      update: {},
    });
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

// GET /api/allkademy/enrollments (my enrollments)
router.get("/enrollments", verifyToken, async (req, res, next) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { user_id: req.user!.id },
      include: {
        course: { select: { id: true, title: true, category: true, thumbnail: true, duration: true } },
      },
      orderBy: { enrolled_at: "desc" },
    });
    res.json(enrollments);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allkademy/enrollments/:course_id/progress
router.put("/enrollments/:course_id/progress", verifyToken,
  validate(z.object({ progress: z.number().min(0).max(100) })),
  async (req, res, next) => {
    try {
      const { progress } = req.body as { progress: number };

      const enrollment = await prisma.courseEnrollment.update({
        where: {
          course_id_user_id: {
            course_id: (req.params.course_id as string),
            user_id: req.user!.id,
          },
        },
        data: {
          progress,
          completed_at: progress >= 100 ? new Date() : null,
        },
      });

      res.json(enrollment);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

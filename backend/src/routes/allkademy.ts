import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  thumbnail: z.string().optional(),
  duration: z.number().int().optional(),
  is_published: z.boolean().default(false),
  is_free: z.boolean().default(true),
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

    const where: Record<string, unknown> = {};
    if (category) where["category"] = category;
    if (is_published !== undefined) where["is_published"] = is_published === "true";

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
      where: { id: req.params.id },
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

    res.json(course);
  } catch (err) {
    next(err);
  }
});

// POST /api/allkademy/courses
router.post("/courses", verifyToken, validate(courseSchema), async (req, res, next) => {
  try {
    const course = await prisma.course.create({ data: req.body });
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allkademy/courses/:id
router.put("/courses/:id", verifyToken, validate(courseSchema.partial()), async (req, res, next) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(course);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/allkademy/courses/:id
router.delete("/courses/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/allkademy/courses/:id/modules
router.post("/courses/:id/modules", verifyToken, validate(moduleSchema), async (req, res, next) => {
  try {
    const module_ = await prisma.courseModule.create({
      data: { ...req.body, course_id: req.params.id },
      include: { lessons: true },
    });
    res.status(201).json(module_);
  } catch (err) {
    next(err);
  }
});

// POST /api/allkademy/modules/:id/lessons
router.post("/modules/:id/lessons", verifyToken, validate(lessonSchema), async (req, res, next) => {
  try {
    const lesson = await prisma.lesson.create({
      data: { ...req.body, module_id: req.params.id },
    });
    res.status(201).json(lesson);
  } catch (err) {
    next(err);
  }
});

// POST /api/allkademy/courses/:id/enroll
router.post("/courses/:id/enroll", verifyToken, async (req, res, next) => {
  try {
    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        course_id_user_id: {
          course_id: req.params.id,
          user_id: req.user!.id,
        },
      },
      create: {
        course_id: req.params.id,
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
            course_id: req.params.course_id,
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

// Calendário de trabalho da plataforma (B2): dias úteis, expediente e feriados. Leitura para qualquer usuário autenticado
// (as telas convertem horas em dias com ele); escrita só do administrador. Ver lib/work-calendar.ts.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser } from "../lib/project-scope";
import { businessMinutesPerDay, ensureWorkCalendar, fmtTime, invalidateBusinessCalendar, validateCalendarInput } from "../lib/work-calendar";

const router = Router();
router.use(verifyToken);

class CalError extends Error { constructor(message: string, public httpStatus = 422, public code = "work_calendar") { super(message); } }
function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof CalError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}
const adminOnly = (req: Request) => { if (!isAdminUser(req.user!)) throw new CalError("Só a administração altera o calendário de trabalho.", 403, "forbidden"); };

async function view() {
  const cal = await ensureWorkCalendar(prisma, true);
  const holidays = await prisma.platformHoliday.findMany({ orderBy: { date: "asc" } });
  return {
    work_days: cal.workDays, start_time: fmtTime(cal.startMin), end_time: fmtTime(cal.endMin),
    business_minutes_per_day: businessMinutesPerDay(cal), business_hours_per_day: Math.round((businessMinutesPerDay(cal) / 60) * 100) / 100,
    holidays: holidays.map((h) => ({ id: h.id, date: h.date, name: h.name, is_active: h.is_active })),
  };
}

router.get("/", async (_req, res, next) => { try { res.json(await view()); } catch (e) { handle(e, res, next); } });

router.put("/", async (req, res, next) => {
  try {
    adminOnly(req);
    const d = z.object({ work_days: z.array(z.number().int().min(0).max(6)).min(1).max(7), start_time: z.string().regex(/^\d{1,2}:\d{2}$/), end_time: z.string().regex(/^\d{1,2}:\d{2}$/) }).parse(req.body);
    const err = validateCalendarInput(d);
    if (err) throw new CalError(err);
    const data = { work_days: [...new Set(d.work_days)].sort().join(","), start_time: d.start_time.padStart(5, "0"), end_time: d.end_time.padStart(5, "0"), updated_by_user_id: req.user!.id };
    await prisma.platformWorkCalendar.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    invalidateBusinessCalendar();
    res.json(await view());
  } catch (e) { handle(e, res, next); }
});

router.post("/holidays", async (req, res, next) => {
  try {
    adminOnly(req);
    const d = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().trim().min(2).max(120) }).parse(req.body);
    if (Number.isNaN(new Date(`${d.date}T12:00:00`).getTime())) throw new CalError("Data inválida.");
    if (await prisma.platformHoliday.findUnique({ where: { date: d.date } })) throw new CalError("Este feriado já está cadastrado.", 409, "holiday_exists");
    await prisma.platformHoliday.create({ data: { date: d.date, name: d.name } });
    invalidateBusinessCalendar();
    res.status(201).json(await view());
  } catch (e) { handle(e, res, next); }
});

router.delete("/holidays/:id", async (req, res, next) => {
  try {
    adminOnly(req);
    const h = await prisma.platformHoliday.findUnique({ where: { id: req.params.id as string } });
    if (!h) throw new CalError("Feriado não encontrado.", 404, "not_found");
    await prisma.platformHoliday.delete({ where: { id: h.id } });
    invalidateBusinessCalendar();
    res.json(await view());
  } catch (e) { handle(e, res, next); }
});

export default router;

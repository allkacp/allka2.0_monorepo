import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { isAdminUser } from "../lib/project-scope";
import { canViewLaunchSession as canViewProjectForRelease, canManageLaunchSession as canManageProjectForRelease } from "../lib/launch-permissions";
import { addTaskDependency, removeTaskDependency, listTaskDependencies, DependencyValidationError, DependencyInUseError } from "../lib/task-dependency-graph";
import {
  getTaskGateStatus,
  satisfyManualApprovalTrigger,
  satisfySelectionTrigger,
  applyAdminDependencyOverride,
  tryReleaseTask,
  TaskReleaseError,
} from "../lib/task-release-service";

const router = Router();

// ─── Dependências, gatilhos e liberação de tarefa (bloco 4/4) ──────────────
// Nunca confia em id de conta vindo do navegador — toda relação
// (projeto/company/agência) é resolvida no backend a partir da tarefa real.

function handleServiceError(err: unknown, res: any, next: any): boolean {
  if (err instanceof DependencyValidationError || err instanceof TaskReleaseError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  if (err instanceof DependencyInUseError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  next(err);
  return true;
}

async function loadTaskProject(taskId: string) {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { id: true, project_id: true, title: true, status: true } });
  return task;
}

async function assertTaskView(req: any, res: any, taskId: string) {
  const task = await loadTaskProject(taskId);
  if (!task) {
    res.status(404).json({ error: "Tarefa não encontrada" });
    return null;
  }
  const access = await canViewProjectForRelease(prisma, req.user!, task.project_id);
  if (!access.exists || !access.allowed) {
    res.status(404).json({ error: "Tarefa não encontrada" });
    return null;
  }
  return task;
}

async function assertTaskManage(req: any, res: any, taskId: string) {
  const task = await assertTaskView(req, res, taskId);
  if (!task) return null;
  const canManage = await canManageProjectForRelease(prisma, req.user!, task.project_id);
  if (!canManage) {
    res.status(403).json({ error: "Você não tem autorização para gerenciar a liberação desta tarefa." });
    return null;
  }
  return task;
}

// GET /api/task-release/tasks/:taskId/gates — bloqueadores da tarefa (visão:
// qualquer um com acesso ao projeto, inclusive Nômade vendo os bloqueadores
// das próprias tarefas, sem poder ignorá-los).
router.get("/tasks/:taskId/gates", verifyToken, async (req, res, next) => {
  try {
    const task = await assertTaskView(req, res, req.params.taskId as string);
    if (!task) return;
    const gate = await getTaskGateStatus(task.id);
    const events = await prisma.taskReleaseEvent.findMany({ where: { task_id: task.id }, orderBy: { created_at: "desc" } });
    res.json({ gate, events });
  } catch (err) {
    next(err);
  }
});

// GET /api/task-release/tasks/:taskId/dependencies
router.get("/tasks/:taskId/dependencies", verifyToken, async (req, res, next) => {
  try {
    const task = await assertTaskView(req, res, req.params.taskId as string);
    if (!task) return;
    const dependencies = await listTaskDependencies(task.id);
    res.json({ dependencies });
  } catch (err) {
    next(err);
  }
});

// POST /api/task-release/tasks/:taskId/dependencies — body: { depends_on_task_id }
router.post("/tasks/:taskId/dependencies", verifyToken, async (req, res, next) => {
  try {
    const task = await assertTaskManage(req, res, req.params.taskId as string);
    if (!task) return;
    const dependsOnTaskId = String(req.body?.depends_on_task_id ?? "");
    if (!dependsOnTaskId) {
      res.status(400).json({ error: "depends_on_task_id é obrigatório" });
      return;
    }
    const dependency = await addTaskDependency({ taskId: task.id, dependsOnTaskId, actorUserId: req.user!.id });
    res.status(201).json({ dependency });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// DELETE /api/task-release/tasks/:taskId/dependencies/:dependencyId
router.delete("/tasks/:taskId/dependencies/:dependencyId", verifyToken, async (req, res, next) => {
  try {
    const task = await assertTaskManage(req, res, req.params.taskId as string);
    if (!task) return;
    const dependency = await removeTaskDependency(req.params.dependencyId as string, req.user!.id);
    if (!dependency || dependency.task_id !== task.id) {
      res.status(404).json({ error: "Dependência não encontrada" });
      return;
    }
    // Remover um pré-requisito pode destravar a própria tarefa — reavalia
    // (nunca ignora OUTROS bloqueadores: tryReleaseTask só libera se
    // allSatisfied continuar true depois da remoção).
    await tryReleaseTask(task.id);
    res.json({ success: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// POST /api/task-release/triggers/:triggerId/manual-approval — body: { note }
router.post("/triggers/:triggerId/manual-approval", verifyToken, async (req, res, next) => {
  try {
    const trigger = await prisma.taskReleaseTrigger.findUnique({ where: { id: req.params.triggerId as string } });
    if (!trigger) {
      res.status(404).json({ error: "Gatilho não encontrado" });
      return;
    }
    const task = await assertTaskManage(req, res, trigger.task_id);
    if (!task) return;
    await satisfyManualApprovalTrigger({ triggerId: trigger.id, actorUserId: req.user!.id, note: String(req.body?.note ?? "") });
    const gate = await getTaskGateStatus(task.id);
    res.json({ gate });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// POST /api/task-release/triggers/:triggerId/selection — body: { specialty_id? , responsible_user_id? }
router.post("/triggers/:triggerId/selection", verifyToken, async (req, res, next) => {
  try {
    const trigger = await prisma.taskReleaseTrigger.findUnique({ where: { id: req.params.triggerId as string } });
    if (!trigger) {
      res.status(404).json({ error: "Gatilho não encontrado" });
      return;
    }
    const task = await assertTaskManage(req, res, trigger.task_id);
    if (!task) return;
    await satisfySelectionTrigger({
      triggerId: trigger.id,
      actorUserId: req.user!.id,
      specialtyId: req.body?.specialty_id ? String(req.body.specialty_id) : undefined,
      responsibleUserId: req.body?.responsible_user_id ? String(req.body.responsible_user_id) : undefined,
    });
    const gate = await getTaskGateStatus(task.id);
    res.json({ gate });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// POST /api/task-release/tasks/:taskId/admin-override — body: { reason }.
// "Somente permissão elevada oficial" — Admin Master de verdade, nunca só
// dono de projeto/gestor comum.
router.post("/tasks/:taskId/admin-override", verifyToken, async (req, res, next) => {
  try {
    const task = await assertTaskView(req, res, req.params.taskId as string);
    if (!task) return;
    if (!isAdminUser(req.user)) {
      res.status(403).json({ error: "Somente um administrador pode aplicar uma exceção de dependência." });
      return;
    }
    const reason = String(req.body?.reason ?? "");
    await applyAdminDependencyOverride({ taskId: task.id, actorUserId: req.user!.id, reason });
    const gate = await getTaskGateStatus(task.id);
    res.json({ gate });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

export default router;

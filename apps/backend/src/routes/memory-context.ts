import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { checkMemoryAccess } from "../lib/memory-permissions";
import { createContextSnapshotPreview, getContextSnapshot } from "../lib/context-snapshot-service";

const router = Router();

// ─── Compilador hierárquico de memória — prévia real (bloco 2/4) ───────────
// "Visualizar contexto que a IA utilizará": compila as 3 camadas (Projeto >
// Company > Agência) e registra um AIContextSnapshot imutável — nenhuma IA
// externa é chamada aqui. Mesma checagem de acesso da memória do bloco 1
// (canViewMemory sobre o escopo "project"): quem pode ver a memória do
// projeto pode ver a prévia do contexto compilado a partir dela.

// POST /api/memory-context/:projectId/preview
router.post("/:projectId/preview", verifyToken, async (req, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const access = await checkMemoryAccess(prisma, req.user!, "project", projectId, "view");
    if (!access.ok) {
      res.status(access.status).json({ error: access.status === 404 ? "Projeto não encontrado" : "Acesso negado" });
      return;
    }

    const { createClientActionId } = (req.body ?? {}) as { createClientActionId?: string };
    const { snapshot, compiled, duplicate } = await createContextSnapshotPreview({
      projectId,
      requestedByUserId: req.user!.id,
      createClientActionId: createClientActionId ?? null,
    });

    res.status(duplicate ? 200 : 201).json({
      snapshot_id: snapshot.id,
      duplicate,
      checksum: snapshot.checksum,
      created_at: snapshot.created_at,
      // `compiled` só vem null no caminho de duplicata (mesmo createClientActionId
      // já processado) — nesse caso devolvemos o texto já persistido no snapshot.
      text: compiled?.text ?? snapshot.compiled_text,
      layers: compiled?.layers ?? JSON.parse(snapshot.structured_json),
      missing_layers: compiled?.missingLayers ?? JSON.parse(snapshot.missing_layers ?? "[]"),
      approved_task_refs: compiled?.approvedTaskRefs ?? JSON.parse(snapshot.approved_task_refs ?? "[]"),
      truncation_notes: compiled?.truncationNotes ?? [],
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/memory-context/:projectId/snapshots/:snapshotId — investigação
// administrativa/histórica: mesma checagem de visibilidade do projeto (o
// snapshot em si é imutável; a permissão de VER é sempre calculada no
// momento do acesso, sobre o vínculo atual do projeto).
router.get("/:projectId/snapshots/:snapshotId", verifyToken, async (req, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const snapshotId = req.params.snapshotId as string;
    const access = await checkMemoryAccess(prisma, req.user!, "project", projectId, "view");
    if (!access.ok) {
      res.status(access.status).json({ error: access.status === 404 ? "Projeto não encontrado" : "Acesso negado" });
      return;
    }

    const snapshot = await getContextSnapshot(snapshotId);
    if (!snapshot || snapshot.project_id !== projectId) {
      res.status(404).json({ error: "Snapshot não encontrado" });
      return;
    }

    res.json({
      id: snapshot.id,
      project_id: snapshot.project_id,
      requested_by_user_id: snapshot.requested_by_user_id,
      action: snapshot.action,
      provider: snapshot.provider,
      model: snapshot.model,
      checksum: snapshot.checksum,
      text: snapshot.compiled_text,
      layers: JSON.parse(snapshot.structured_json),
      missing_layers: JSON.parse(snapshot.missing_layers ?? "[]"),
      approved_task_refs: JSON.parse(snapshot.approved_task_refs ?? "[]"),
      status: snapshot.status,
      created_at: snapshot.created_at,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

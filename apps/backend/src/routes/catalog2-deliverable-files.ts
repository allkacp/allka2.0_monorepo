// Download do modelo/exemplo anexado a um item do "Resumo dos entregáveis" (catálogo novo).
// Exige usuário autenticado; o identificador do arquivo é um UUID não adivinhável. Sempre baixa como anexo
// (nunca abre no navegador) e com nosniff, então um arquivo enviado nunca é executado/renderizado pelo site.
import { Router } from "express";
import fs from "fs";
import path from "path";
import { verifyToken } from "../middleware/auth";
import { DELIVERABLE_FILES_SUBPATH, isStoredId } from "../lib/catalog2-deliverable-files";
import { uploadedFilePath } from "../lib/file-storage";

const router = Router();

router.get("/:id", verifyToken, (req, res) => {
  const id = String(req.params.id ?? "");
  if (!isStoredId(id)) { res.status(404).json({ error: "Arquivo não encontrado." }); return; }
  const filePath = uploadedFilePath(DELIVERABLE_FILES_SUBPATH, id);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Arquivo não encontrado." }); return; }
  const wanted = String(req.query.name ?? "").trim();
  const downloadName = (wanted ? path.basename(wanted) : id).replace(/[\r\n"]/g, "").slice(0, 200) || id;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
  fs.createReadStream(filePath).pipe(res);
});

export default router;

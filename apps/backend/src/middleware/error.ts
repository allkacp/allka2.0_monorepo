import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Dados inválidos",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    // Prisma unique constraint
    if ((err as NodeJS.ErrnoException & { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Registro já existe (campo único duplicado)" });
      return;
    }

    // Prisma record not found
    if ((err as NodeJS.ErrnoException & { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Registro não encontrado" });
      return;
    }

    res.status(500).json({ error: err.message });
    return;
  }

  console.error(`[ERROR] ${req.method} ${req.path}: unknown error`, err);
  res.status(500).json({ error: "Erro interno do servidor" });
}

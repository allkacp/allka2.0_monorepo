import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Arquivo excede o tamanho máximo permitido" : err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Dados inválidos",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    const statusCode = Number(
      (err as Error & { statusCode?: number; status?: number }).statusCode ??
        (err as Error & { statusCode?: number; status?: number }).status,
    );
    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600) {
      res.status(statusCode).json({ error: err.message });
      return;
    }

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

    // Prisma foreign key violation — achado do usuário 2026-09-23: o
    // dump bruto do Prisma ("Invalid `tx.project.create()` invocation...")
    // estava indo direto pra tela de checkout. Nunca mais: mensagem clara
    // em português, o detalhe técnico completo só no log do servidor.
    if ((err as NodeJS.ErrnoException & { code?: string }).code === "P2003") {
      console.error(`[ERROR] ${req.method} ${req.path}: P2003 (foreign key)`, err);
      res.status(409).json({ error: "Não foi possível concluir: um dado vinculado a esta ação não foi encontrado ou está incompleto. Tente novamente ou fale com o suporte." });
      return;
    }

    // Qualquer outro erro inesperado: nunca vaza o dump técnico bruto do
    // Prisma/stack interno pro usuário (segurança + UX) — detalhe completo
    // sempre no log do servidor, mensagem segura e em português na tela.
    const looksLikeRawInternalDump = err.message.includes("\n") || err.message.length > 300 || /invocation in|PrismaClient|node_modules/i.test(err.message);
    res.status(500).json({ error: looksLikeRawInternalDump ? "Erro interno inesperado. Tente novamente ou fale com o suporte." : err.message });
    return;
  }

  console.error(`[ERROR] ${req.method} ${req.path}: unknown error`, err);
  res.status(500).json({ error: "Erro interno do servidor" });
}

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../lib/prisma";

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  account_type: string;
}

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export type PermissionAction = "view" | "edit" | "create" | "delete";

/**
 * Autorização por perfil de acesso (AdminProfile + AdminPermission).
 *
 * O sistema de perfis já existia no banco e nas rotas de /api/permissions,
 * mas nada o consultava: a coluna `User.admin_profile_id` não era lida por
 * ninguém. Este middleware é o elo que faltava.
 *
 * Regra de liberação, nesta ordem:
 *   1. usuário SEM perfil atribuído  → passa (mantém o acesso que já tinha)
 *   2. perfil `is_master`            → passa
 *   3. perfil tem (module, action)   → passa
 *   4. caso contrário                → 403
 *
 * O passo 1 é deliberado: atribuir um perfil é o que ativa a restrição. Sem
 * isso, introduzir o sistema trancaria de uma vez todos os admins que hoje
 * trabalham só com a role — o oposto do que se quer ao ligar controle de
 * acesso numa plataforma em uso.
 */
export function requirePermission(module: string, action: PermissionAction) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          admin_profile: {
            select: {
              is_master: true,
              is_active: true,
              permissions: { select: { module: true, action: true } },
            },
          },
        },
      });

      const perfil = user?.admin_profile;
      // Sem perfil, ou com perfil desativado, vale o comportamento anterior.
      if (!perfil || !perfil.is_active) {
        next();
        return;
      }
      if (perfil.is_master) {
        next();
        return;
      }

      const temPermissao = perfil.permissions.some(
        (p) => p.module === module && p.action === action,
      );
      if (!temPermissao) {
        res.status(403).json({
          error: `Seu perfil de acesso não permite ${action} em ${module}.`,
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export type AdminProfileLike = {
  is_master: boolean;
  is_active: boolean;
  permissions: { module: string; action: string }[];
} | null | undefined;

/**
 * Pure decision core of requireAnyPermission() — same rule as
 * requirePermission(), but passes if the profile has ANY one of the given
 * (module, action) pairs. Kept separate from the Express wrapper (which
 * fetches `perfil` from Prisma) so it's testable without mocking the
 * database, mirroring lib/product-feedback-access-decision.ts's pattern.
 */
export function evaluateAnyPermission(
  perfil: AdminProfileLike,
  checks: Array<[string, PermissionAction]>,
): boolean {
  if (!perfil || !perfil.is_active || perfil.is_master) return true;
  return checks.some(([module, action]) =>
    perfil.permissions.some((p) => p.module === module && p.action === action),
  );
}

/**
 * Same rule as requirePermission(), but passes if the profile has ANY one
 * of the given (module, action) pairs — for features a founder wants to
 * hand to a narrower group (e.g. "central_chamados") without also handing
 * out the broader module that already covers it (e.g. "sistema").
 */
export function requireAnyPermission(checks: Array<[string, PermissionAction]>) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          admin_profile: {
            select: {
              is_master: true,
              is_active: true,
              permissions: { select: { module: true, action: true } },
            },
          },
        },
      });

      if (!evaluateAnyPermission(user?.admin_profile, checks)) {
        res.status(403).json({ error: "Seu perfil de acesso não permite esta ação." });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Permissão insuficiente" });
      return;
    }
    next();
  };
}

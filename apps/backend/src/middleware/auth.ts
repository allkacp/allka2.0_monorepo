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
 * Decision core specifically for "who can use the Allka -> Roadmap SSO
 * handoff" (routes/roadmap-sso.ts, and the frontend's mirror in
 * lib/admin-permissions.ts). Deliberately NOT the same rule as
 * evaluateAnyPermission()'s generic "no profile = full access" grandfather:
 *
 * - That grandfather exists only because "sistema" is a module every
 *   existing admin implicitly relied on before the granular permission
 *   system existed — removing it would have locked out working admins.
 *   It was never meant to apply to any account_type other than "admin".
 * - "central_chamados" is a brand-new module with no legacy expectation at
 *   all. It always requires an explicit, active grant — for every
 *   account_type, including "admin". Grandfathering it too would silently
 *   let every account that has never been assigned a profile through,
 *   which for non-admin account_types (empresas/agencias/nomades/lider) is
 *   effectively everyone — exactly the "usuário comum vê" bug this
 *   function exists to prevent.
 */
export function evaluateRoadmapSsoAccess(
  accountType: string,
  perfil: AdminProfileLike,
): boolean {
  if (accountType === "admin") {
    if (!perfil || !perfil.is_active || perfil.is_master) return true;
    if (perfil.permissions.some((p) => p.module === "sistema" && p.action === "view")) return true;
  }
  if (!perfil || !perfil.is_active) return false;
  if (perfil.is_master) return true;
  return perfil.permissions.some((p) => p.module === "central_chamados" && p.action === "view");
}

export function requireRoadmapSsoAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  prisma.user
    .findUnique({
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
    })
    .then((user) => {
      if (!evaluateRoadmapSsoAccess(req.user!.account_type, user?.admin_profile)) {
        res.status(403).json({ error: "Seu perfil de acesso não permite abrir a Central de roadmap e chamados." });
        return;
      }
      next();
    })
    .catch(next);
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

/**
 * Decisão pura para "quem pode abrir a Central de Alertas" (ata 2026-08:
 * "criar uma central para o cadastro e gestão de alertas... Admin Master
 * deve ter a capacidade de criar, modificar ou reclassificar alertas").
 *
 * Deliberadamente NÃO usa a regra do avô de requirePermission() (perfil não
 * atribuído → libera) nem aceita uma permissão granular no lugar de
 * is_master — mesmo raciocínio de evaluateRoadmapSsoAccess() pra módulo
 * novo: "Somente Admin Master" na ata é uma restrição estrita, e "outros
 * administradores não recebem automaticamente acesso de escrita" descarta
 * de propósito tanto o avô quanto uma permissão explícita de outro perfil.
 * Só passa quem realmente tem admin_profile.is_master === true.
 */
export function evaluateAdminMasterAccess(
  accountType: string,
  perfil: AdminProfileLike,
): boolean {
  if (accountType !== "admin") return false;
  return !!perfil && perfil.is_active && perfil.is_master === true;
}

export function requireAdminMaster(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  prisma.user
    .findUnique({
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
    })
    .then((user) => {
      if (!evaluateAdminMasterAccess(req.user!.account_type, user?.admin_profile)) {
        res.status(403).json({ error: "Somente o Admin Master pode gerenciar a central de alertas." });
        return;
      }
      next();
    })
    .catch(next);
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

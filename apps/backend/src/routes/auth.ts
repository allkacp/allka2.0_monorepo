import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** Optional access-type selected by the user on the login screen.
   *  When provided, the backend validates that the user's role/account_type
   *  grants access to that panel. */
  accessType: z
    .enum(["ADMIN", "AGENCY", "NOMAD", "COMPANY", "PARTNER", "LEADER"])
    .optional(),
});

/** Maps an accessType value to a permission check function. */
const ACCESS_TYPE_RULES: Record<
  string,
  (user: { role: string; account_type: string }) => boolean
> = {
  ADMIN: (u) => u.role === "admin",
  AGENCY: (u) => u.account_type === "agencias",
  NOMAD: (u) => u.account_type === "nomades" || u.role === "nomad",
  COMPANY: (u) => u.account_type === "empresas",
  PARTNER: (u) => u.account_type === "parceiro" || u.role === "partner",
  LEADER: (u) => u.role === "lider",
};

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password, accessType } = req.body as {
      email: string;
      password: string;
      accessType?: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.is_active) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    // ── Access-type permission check ───────────────────────────────────────
    if (accessType) {
      const rule = ACCESS_TYPE_RULES[accessType];
      if (rule && !rule(user)) {
        res.status(403).json({ error: "ACCESS_FORBIDDEN" });
        return;
      }
    }

    // ── Pausa por inatividade (>=90 dias sem login) ─────────────────────────
    // Mesmo limiar do bucket "inactive_90" calculado no frontend
    // (computeInactivityBucket). Usa o last_login ANTES deste login pra
    // decidir — nunca o valor recém-atualizado. Login de usuário nunca
    // ativo (last_login null) não conta como "pausado" — mesma regra que o
    // frontend já aplicava (bucket "never" ≠ "inactive_90").
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const wasPausedByInactivity =
      !!user.last_login && now.getTime() - user.last_login.getTime() >= NINETY_DAYS_MS;
    // "Grudento": mesmo que este login registre last_login=now (deixando de
    // parecer "90+ dias" numa PRÓXIMA tentativa), reactivation_review_required
    // já sinalizado continua bloqueando — só um Admin limpa essa flag.
    const isPausedByInactivity = wasPausedByInactivity || user.reactivation_review_required === true;

    if (isPausedByInactivity) {
      // Registra a tentativa (não é um login bem-sucedido, mas o admin
      // precisa ver que houve atividade recente) e NUNCA emite token —
      // is_active não é tocado, a conta não é reativada automaticamente.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          last_login: now,
          inactivity_paused_accessed_at: now,
          inactivity_paused_access_count: { increment: 1 },
          reactivation_review_required: true,
        },
      });
      res.status(403).json({
        error:
          "Conta pausada por inatividade. Identificamos uma tentativa recente de acesso. Aguarde revisão administrativa ou entre em contato com o suporte.",
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { last_login: now },
    });

    const token = jwt.sign(
      {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        account_type: updated.account_type,
      },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const { password_hash: _pw, ...safeUser } = updated;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.json({ message: "Logout realizado com sucesso" });
});

// GET /api/auth/me
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        account_type: true,
        avatar: true,
        phone: true,
        is_active: true,
        created_at: true,
        owned_agency: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            email: true,
            phone: true,
            partner_level: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    // Resposta sempre expôs a agência sob a chave "agency" (consumido por
    // apps/frontend/contexts/agencia-context.tsx e sidebar-context.tsx via
    // currentUser.agency.name) — campo Prisma virou "owned_agency", contrato
    // externo não muda.
    const { owned_agency, ...restUser } = user;
    res.json({ ...restUser, agency: owned_agency });
  } catch (err) {
    next(err);
  }
});

export default router;

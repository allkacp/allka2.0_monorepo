import { Router } from "express";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { resolveMyAgencyId } from "../lib/project-scope";

const router = Router();

// Status do PartnerProfile da Agency a que este usuário pertence (via
// User.agency_id) — usado só pra decidir se o front libera as rotas
// /partner/*, que agora dependem da Agency ter aceito o convite (não de um
// account_type separado). null quando o usuário não é de uma agência ou a
// agência nunca recebeu convite.
async function resolvePartnerStatus(userId: string): Promise<string | null> {
  const agencyId = await resolveMyAgencyId(prisma, userId);
  if (!agencyId) return null;
  const partner = await prisma.partnerProfile.findUnique({
    where: { agency_id: agencyId },
    select: { status: true },
  });
  return partner?.status ?? null;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** Optional access-type selected by the user on the login screen.
   *  When provided, the backend validates that the user's role/account_type
   *  grants access to that panel. */
  // Não existe mais accessType "PARTNER" — Partner não é um portal de login
  // separado, é um upgrade da própria Agency (ver PartnerProfile no
  // schema.prisma). Quem se torna Partner continua entrando por AGENCY.
  accessType: z
    .enum(["ADMIN", "AGENCY", "NOMAD", "COMPANY", "LEADER"])
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

    // Situação da conta decidida pelo admin (ver migration
    // 20260807120000_status_do_usuario). Pausada/suspensa também tem
    // is_active=false, então precisa passar pelo gate abaixo para receber o
    // motivo certo — que só é revelado depois da senha conferida, para não
    // permitir descobrir quais e-mails existem.
    const bloqueadaPelaSituacao =
      user?.status === "pausado" || user?.status === "suspenso";

    if (!user || (!user.is_active && !bloqueadaPelaSituacao)) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    // Usuário que ainda precisa definir a senha (importado da plataforma
    // antiga, ou criado sem senha) não entra por aqui — nem com tentativa e
    // erro, já que o hash guardado é aleatório e inutilizável. A resposta é
    // deliberadamente distinta de "credenciais inválidas": não é erro do
    // usuário, é uma etapa que falta.
    if (user.must_set_password) {
      res.status(403).json({
        error: "FIRST_ACCESS_REQUIRED",
        message:
          "Esta conta ainda não tem senha definida. Use o link de primeiro acesso para criar a sua.",
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    // Senha certa, mas a conta não está liberada.
    if (bloqueadaPelaSituacao) {
      res.status(403).json({
        error:
          user.status === "pausado"
            ? "Conta pausada pela administração. Entre em contato com o suporte para reativar."
            : "Conta suspensa. Entre em contato com o suporte.",
      });
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
    const partner_status = await resolvePartnerStatus(updated.id);
    res.json({ token, user: { ...safeUser, partner_status } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.json({ message: "Logout realizado com sucesso" });
});

// ─── Primeiro acesso ────────────────────────────────────────────────────────
// Fluxo para quem não tem senha: usuário importado da plataforma antiga e
// nômade cadastrado sem login. O projeto não envia e-mail, então o link é
// gerado pela operação (ver scripts/preparar-primeiro-acesso.ts) e entregue por
// fora. O token trafega em texto na URL e é guardado só como hash sha256.

/** Mesmo hash usado na geração do link — ver preparar-primeiro-acesso.ts. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const definirSenhaSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

// GET /api/auth/primeiro-acesso/:token — valida o link antes de mostrar o form
router.get("/primeiro-acesso/:token", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { password_setup_token: hashToken(String(req.params.token)) },
      select: { name: true, email: true, password_setup_expires_at: true, must_set_password: true },
    });

    if (!user || !user.must_set_password) {
      res.status(404).json({ error: "Link inválido ou já utilizado" });
      return;
    }
    if (user.password_setup_expires_at && user.password_setup_expires_at < new Date()) {
      res.status(410).json({ error: "Link expirado. Peça um novo ao administrador." });
      return;
    }

    // Devolve só o suficiente pra tela dar as boas-vindas — nada sensível.
    res.json({ name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/primeiro-acesso — grava a senha escolhida e libera o acesso
router.post("/primeiro-acesso", validate(definirSenhaSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const user = await prisma.user.findUnique({
      where: { password_setup_token: hashToken(token) },
    });

    if (!user || !user.must_set_password) {
      res.status(404).json({ error: "Link inválido ou já utilizado" });
      return;
    }
    if (user.password_setup_expires_at && user.password_setup_expires_at < new Date()) {
      res.status(410).json({ error: "Link expirado. Peça um novo ao administrador." });
      return;
    }

    const atualizado = await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: await bcrypt.hash(password, 10),
        must_set_password: false,
        // Token é de uso único: some assim que a senha é definida.
        password_setup_token: null,
        password_setup_expires_at: null,
        last_login: new Date(),
      },
    });

    // Já entrega o token de sessão: a pessoa acabou de provar quem é e não
    // precisa digitar a senha de novo na sequência.
    const jwtToken = jwt.sign(
      {
        id: atualizado.id,
        email: atualizado.email,
        role: atualizado.role,
        account_type: atualizado.account_type,
      },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const { password_hash: _pw, password_setup_token: _t, ...safeUser } = atualizado;
    res.json({ token: jwtToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        user_code: true,
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
    const partner_status = await resolvePartnerStatus(user.id);
    res.json({ ...restUser, agency: owned_agency, partner_status });
  } catch (err) {
    next(err);
  }
});

export default router;

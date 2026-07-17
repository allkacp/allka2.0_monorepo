import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { parsePagination, validate } from "../middleware/validate";

// Rota admin-only pra listar TODOS os usuários de acesso/login da plataforma
// (tela Admin > Usuários). Deliberadamente separada de GET /api/users, que
// já é usado sem restrição de role por outras telas (ex.: picker de
// consultor em project-create-new-panel.tsx, chamado por Company/Agency) —
// travar aquela rota pra admin-only quebraria esses fluxos existentes.
const router = Router();

const ALLOWED_SORT = ["name", "email", "created_at", "last_login", "role", "account_type", "user_code"] as const;

const enrichedSelect = {
  id: true,
  user_code: true,
  email: true,
  username: true,
  name: true,
  role: true,
  account_type: true,
  is_active: true,
  avatar: true,
  phone: true,
  company_id: true,
  last_login: true,
  inactivity_paused_accessed_at: true,
  inactivity_paused_access_count: true,
  reactivation_review_required: true,
  created_at: true,
  updated_at: true,
  company: { select: { id: true, name: true } },
  // partner_profile aninhado: Partner não é mais um vínculo próprio do
  // User (owned_partner não existe mais) — é um upgrade da Agency que este
  // usuário é dono, então o status de Partner vem daqui.
  owned_agency: {
    select: {
      id: true,
      name: true,
      partner_profile: { select: { id: true, status: true } },
    },
  },
  nomade: { select: { id: true, name: true } },
  lider_areas: { select: { id: true, area_nome: true, ativo: true } },
  profile: {
    select: {
      social_name: true,
      birth_date: true,
      gender: true,
      cpf: true,
      rg: true,
      whatsapp: true,
      phone_secondary: true,
      zip_code: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      country: true,
      admin_notes: true,
      internal_notes: true,
    },
  },
  // LGPD: consentimento real = ao menos 1 aceite (term_acceptances) de um
  // Term atualmente ativo. Não é flag fake — reflete o banco.
  term_acceptances: {
    where: { term: { is_active: true } },
    select: { accepted_at: true },
    orderBy: { accepted_at: "desc" as const },
    take: 1,
  },
};

type EnrichedUser = Prisma.UserGetPayload<{ select: typeof enrichedSelect }>;

// Compartilhado entre GET / (listagem) e PUT /:id/link (retorno após
// vincular/desvincular) — mesma forma enriquecida em ambos, pra UI poder
// atualizar a linha da tabela sem precisar recarregar a lista inteira.
function mapUser(u: EnrichedUser) {
  const activeLiderAreas = u.lider_areas.filter((a) => a.ativo);

  // has_profile_link/profile_link_* — regra fixa por account_type
  // conhecido; account_type fora dessa lista fica null (não false),
  // pra distinguir "tipo sem regra" de "tipo conhecido sem vínculo".
  let has_profile_link: boolean | null;
  let profile_link_type: string | null;
  let profile_link_name: string | null;
  let profile_link_status: string | null = null;

  if (u.account_type === "admin") {
    has_profile_link = true;
    profile_link_type = "admin";
    profile_link_name = "Admin";
  } else if (u.account_type === "agencias") {
    has_profile_link = !!u.owned_agency;
    profile_link_type = "agency";
    profile_link_name = u.owned_agency?.name ?? null;
  } else if (u.account_type === "empresas") {
    has_profile_link = !!u.company;
    profile_link_type = "company";
    profile_link_name = u.company?.name ?? null;
  } else if (u.account_type === "lider") {
    has_profile_link = activeLiderAreas.length > 0;
    profile_link_type = "leader";
    profile_link_name = activeLiderAreas.map((a) => a.area_nome).join(", ") || null;
  } else if (u.account_type === "nomades") {
    has_profile_link = !!u.nomade;
    profile_link_type = "nomad";
    profile_link_name = u.nomade?.name ?? null;
  } else {
    has_profile_link = null;
    profile_link_type = "unknown";
    profile_link_name = null;
  }

  const lgpdAcceptance = u.term_acceptances[0] ?? null;
  const has_lgpd_consent = !!lgpdAcceptance;

  return {
    id: u.id,
    user_code: u.user_code,
    email: u.email,
    username: u.username,
    name: u.name,
    role: u.role,
    account_type: u.account_type,
    is_active: u.is_active,
    avatar: u.avatar,
    phone: u.phone,
    company_id: u.company_id,
    last_login: u.last_login,
    // Pausa por inatividade: accessed_after_inactivity_pause é o fato ("já
    // aconteceu alguma vez"); reactivation_review_required é a pendência
    // ("ainda não foi revisado por um Admin") — hoje sempre iguais porque
    // não existe ação de "marcar como revisado", mas são colunas
    // independentes no banco para permitir isso no futuro sem migração.
    accessed_after_inactivity_pause: u.inactivity_paused_accessed_at !== null,
    inactivity_paused_accessed_at: u.inactivity_paused_accessed_at,
    reactivation_review_required: u.reactivation_review_required,
    created_at: u.created_at,
    updated_at: u.updated_at,
    agency_id: u.owned_agency?.id ?? null,
    agency_name: u.owned_agency?.name ?? null,
    company_name: u.company?.name ?? null,
    // Partner agora é um status da própria Agency (não um account_type
    // separado) — só populado quando o usuário é dono de uma agência que
    // tem um PartnerProfile.
    partner_profile_id: u.owned_agency?.partner_profile?.id ?? null,
    partner_status: u.owned_agency?.partner_profile?.status ?? null,
    nomad_id: u.nomade?.id ?? null,
    nomad_name: u.nomade?.name ?? null,
    leader_areas: activeLiderAreas.map((a) => a.area_nome),
    has_profile_link,
    profile_link_type,
    profile_link_name,
    profile_link_status,
    has_lgpd_consent,
    lgpd_consent_at: lgpdAcceptance?.accepted_at ?? null,
    lgpd_consent_label: has_lgpd_consent
      ? "Consentimento LGPD registrado"
      : "Consentimento LGPD pendente",
    // Dados pessoais/endereço (UserProfile) — achatados pro nível raiz,
    // mesmo padrão de GET /api/users (ver flattenProfile em users.ts).
    ...(u.profile || {}),
  };
}

// GET /api/admin/users — admin-only
router.get("/", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const account_type = req.query.account_type as string | undefined;
    const is_active = req.query.is_active as string | undefined;
    const sortByRaw = req.query.sortBy as string | undefined;
    const sortDirRaw = req.query.sortDir as string | undefined;
    const sortByExplicit = (ALLOWED_SORT as readonly string[]).includes(sortByRaw ?? "")
      ? (sortByRaw as (typeof ALLOWED_SORT)[number])
      : undefined;
    const sortDir = sortDirRaw === "asc" ? "asc" : "desc";
    // Sem sortBy explícito: user_code asc primeiro (nulls por último), com
    // created_at desc como desempate — cobre tanto os 12 QA com código
    // quanto qualquer usuário futuro ainda sem user_code atribuído.
    const orderBy = sortByExplicit
      ? { [sortByExplicit]: sortDir }
      : [{ user_code: { sort: "asc" as const, nulls: "last" as const } }, { created_at: "desc" as const }];

    const where: Record<string, unknown> = {};
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) where["role"] = role;
    if (account_type) where["account_type"] = account_type;
    if (is_active === "true") where["is_active"] = true;
    if (is_active === "false") where["is_active"] = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: enrichedSelect,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const data = users.map(mapUser);

    res.json({ data, total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// Só "company" é suportado por enquanto — vincular a Agency/Partner/Nomad
// exigiria decidir conversão de account_type, o que este endpoint
// deliberadamente recusa fazer silenciosamente (ver regra abaixo).
const linkSchema = z.object({
  link_type: z.literal("company").nullable(),
  company_id: z.string().nullable(),
});

// PUT /api/admin/users/:id/link — admin-only. Vincula/desvincula/troca a
// empresa de um usuário. Nunca deleta Company nem User.
router.put("/:id/link", verifyToken, requireRole("admin"), validate(linkSchema), async (req, res, next) => {
  try {
    const { link_type, company_id } = req.body as { link_type: "company" | null; company_id: string | null };

    const target = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, account_type: true },
    });
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    if (link_type === null) {
      // Desvincular: mantém account_type como está (estratégia documentada
      // — usuário empresa sem company_id aparece como "Sem empresa
      // vinculada" e continua account_type "empresas").
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: { company_id: null },
        select: enrichedSelect,
      });
      res.json(mapUser(updated));
      return;
    }

    // link_type === "company"
    if (!company_id) {
      res.status(400).json({ error: "company_id é obrigatório quando link_type = company" });
      return;
    }
    if (target.account_type !== "empresas") {
      res.status(400).json({
        error: `Usuário é do tipo "${target.account_type}" — vincular a uma empresa exigiria trocar o tipo de conta, o que este endpoint não faz automaticamente. Ajuste o tipo de conta manualmente antes de vincular.`,
      });
      return;
    }
    const company = await prisma.company.findUnique({ where: { id: company_id }, select: { id: true } });
    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { company_id },
      select: enrichedSelect,
    });
    res.json(mapUser(updated));
  } catch (err) {
    next(err);
  }
});

export default router;

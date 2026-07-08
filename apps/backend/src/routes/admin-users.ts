import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { parsePagination } from "../middleware/validate";

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
  created_at: true,
  updated_at: true,
  company: { select: { id: true, name: true } },
  agency: { select: { id: true, name: true } },
  partner: { select: { id: true, status: true } },
  nomade: { select: { id: true, name: true } },
  lider_areas: { select: { id: true, area_nome: true, ativo: true } },
};

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

    const data = users.map((u) => {
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
        has_profile_link = !!u.agency;
        profile_link_type = "agency";
        profile_link_name = u.agency?.name ?? null;
      } else if (u.account_type === "empresas") {
        has_profile_link = !!u.company;
        profile_link_type = "company";
        profile_link_name = u.company?.name ?? null;
      } else if (u.account_type === "parceiro") {
        has_profile_link = !!u.partner;
        profile_link_type = "partner";
        profile_link_name = u.partner ? u.name : null;
        profile_link_status = u.partner?.status ?? null;
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
        created_at: u.created_at,
        updated_at: u.updated_at,
        agency_id: u.agency?.id ?? null,
        agency_name: u.agency?.name ?? null,
        company_name: u.company?.name ?? null,
        partner_profile_id: u.partner?.id ?? null,
        partner_status: u.partner?.status ?? null,
        partner_name: u.partner ? u.name : null,
        nomad_id: u.nomade?.id ?? null,
        nomad_name: u.nomade?.name ?? null,
        leader_areas: activeLiderAreas.map((a) => a.area_nome),
        has_profile_link,
        profile_link_type,
        profile_link_name,
        profile_link_status,
      };
    });

    res.json({ data, total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

export default router;

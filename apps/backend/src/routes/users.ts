import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { generateNextUserCode } from "../lib/user-code";
import { claimFreedSequenceNumber } from "../lib/company-sequence";

const router = Router();

// Campos de UserProfile (dados pessoais + endereço) — tabela separada de
// User (ver comentário no schema.prisma), mas aceitos no mesmo payload de
// criação/edição de usuário pra não exigir um segundo endpoint no frontend.
const profileFieldsSchema = {
  social_name: z.string().optional(),
  birth_date: z.string().optional(), // ISO date string; convertido pro Prisma no handler
  gender: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  whatsapp: z.string().optional(),
  phone_secondary: z.string().optional(),
  zip_code: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  admin_notes: z.string().optional(),
  internal_notes: z.string().optional(),
};
const PROFILE_FIELD_KEYS = Object.keys(profileFieldsSchema) as Array<keyof typeof profileFieldsSchema>;

// Campos próprios de cada entidade (Company/Agency/Nomade/PartnerProfile) —
// cada um com seu próprio prefixo de propósito, pra não colidir nem entre
// si nem com os campos de perfil pessoal do usuário responsável acima (que
// já usam whatsapp/number/neighborhood/city/state/zip_code para o próprio
// usuário) — ver nota no handler POST sobre por que isso importa de verdade
// (profileFieldsSchema.whatsapp nunca é filtrado antes do tx.user.create,
// então reaproveitar esse nome aqui quebraria a criação).
const companyFieldsSchema = {
  company_cnpj: z.string().optional(),
  company_phone: z.string().optional(),
  company_website: z.string().optional(),
  company_segment: z.string().optional(),
  company_status: z.enum(["ativo", "inativo", "prospecto", "inadimplente"]).optional(),
  company_address: z.string().optional(),
  company_number: z.string().optional(),
  company_neighborhood: z.string().optional(),
  company_city: z.string().optional(),
  company_state: z.string().optional(),
  company_zip_code: z.string().optional(),
  company_pix_key: z.string().optional(),
  company_pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).optional(),
  company_description: z.string().optional(),
  company_logo: z.string().optional(),
};

const agencyFieldsSchema = {
  agency_cnpj: z.string().optional(),
  agency_phone: z.string().optional(),
  agency_status: z.enum(["ativo", "inativo", "pendente"]).optional(),
  agency_address: z.string().optional(),
  agency_number: z.string().optional(),
  agency_neighborhood: z.string().optional(),
  agency_city: z.string().optional(),
  agency_state: z.string().optional(),
  agency_zip_code: z.string().optional(),
  agency_pix_key: z.string().optional(),
  agency_pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).optional(),
};

// Nomade é pessoa física, mas precisa de CNPJ válido pra prestar serviços à
// plataforma (obrigatoriedade de negócio, não de schema — ver validação
// manual em POST /api/users, já que nomad_cnpj só é obrigatório quando
// account_type === "nomades", e os 4 tipos compartilham este mesmo schema).
const nomadFieldsSchema = {
  nomad_cnpj: z.string().optional(),
  nomad_whatsapp: z.string().optional(),
  nomad_level: z.enum(["bronze", "silver", "gold", "platinum", "diamond"]).optional(),
  nomad_status: z.enum(["ativo", "inativo", "aguardando_aprovacao", "reprovado", "pausado"]).optional(),
  nomad_avatar: z.string().optional(),
  nomad_address: z.string().optional(),
  nomad_number: z.string().optional(),
  nomad_neighborhood: z.string().optional(),
  nomad_city: z.string().optional(),
  nomad_state: z.string().optional(),
  nomad_zip_code: z.string().optional(),
  nomad_pix_key: z.string().optional(),
  nomad_pix_key_type: z.enum(["cpf", "email", "phone", "random"]).optional(),
};

// Partner não é mais criado por aqui — não existe account_type "parceiro".
// Partner nasce de um convite feito a uma Agency já existente (ver
// POST /api/agencies/:id/partner-invite em agencies.ts), nunca de um
// cadastro de usuário do zero.

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  username: z.string().optional(),
  role: z.string().default("company_user"),
  account_type: z.string().default("empresas"),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  company_id: z.string().optional(),
  // Vincula a uma Agency já existente (mesmo padrão de company_id acima) —
  // usado quando o admin cria um colaborador de dentro do detalhe de uma
  // Agency específica (admin/empresas > Agency > Usuários), em vez de
  // fundar uma Agency nova.
  agency_id: z.string().optional(),
  // Nome da organização (Agency/Company) sendo criada — distinto do nome do
  // usuário principal. Opcional por retrocompatibilidade com chamadores que
  // ainda não enviam isto (nesse caso cai no fallback antigo: nome do
  // usuário).
  organization_name: z.string().min(1).optional(),
  ...profileFieldsSchema,
  ...companyFieldsSchema,
  ...agencyFieldsSchema,
  ...nomadFieldsSchema,
});

const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })
  .extend({
    password: z.string().min(6).optional(),
    is_active: z.boolean().optional(),
  });

const safeSelect = {
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
  agency_id: true,
  last_login: true,
  created_at: true,
  updated_at: true,
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
};

// Achata user.profile.* pro nível raiz do objeto — o frontend lê esses
// campos como se fossem do próprio User (mesmo padrão de name/email/phone),
// sem precisar saber que vêm de uma tabela relacionada.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenProfile<T extends { profile?: Record<string, any> | null }>(user: T) {
  const { profile, ...rest } = user;
  return { ...rest, ...(profile || {}) };
}

// GET /api/users
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const company_id = req.query.company_id as string | undefined;
    const account_type = req.query.account_type as string | undefined;
    const role = req.query.role as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (company_id) where["company_id"] = company_id;
    if (account_type) where["account_type"] = account_type;
    if (role) where["role"] = role;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: safeSelect,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data: users.map(flattenProfile), total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req.params.id as string) },
      select: safeSelect,
    });

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    res.json(flattenProfile(user));
  } catch (err) {
    next(err);
  }
});

// ─── Role defaults per account_type ─────────────────────────────────────────

const DEFAULT_ROLE: Record<string, string> = {
  agencias: "agency_admin",
  empresas: "company_admin",
  nomades:  "nomad",
  lider:    "lider",
  admin:    "admin",
};

// POST /api/users
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  validate(createUserSchema),
  async (req, res, next) => {
    try {
      const {
        password,
        role: rawRole,
        account_type,
        company_id,
        agency_id,
        organization_name,
        ...rest
      } = req.body as {
        password: string;
        role: string;
        account_type: string;
        company_id?: string;
        agency_id?: string;
        organization_name?: string;
        [key: string]: unknown;
      };

      // Campos próprios de Company/Agency/Nomade/PartnerProfile (prefixados,
      // ver os *FieldsSchema acima) — extraídos programaticamente pra um
      // bucket `ef` (entityFields) e removidos de `rest`, que só deve
      // sobrar com campos de verdade do User/UserProfile antes do
      // tx.user.create abaixo.
      const ef: Record<string, unknown> = {};
      for (const key of [
        ...Object.keys(companyFieldsSchema),
        ...Object.keys(agencyFieldsSchema),
        ...Object.keys(nomadFieldsSchema),
      ]) {
        if (key in rest) {
          ef[key] = (rest as Record<string, unknown>)[key];
          delete (rest as Record<string, unknown>)[key];
        }
      }

      // CNPJ é obrigatório pra Nomad prestar serviços à plataforma — regra de
      // negócio, não de schema (por isso não dá pra usar zod .min(1) direto:
      // os 4 tipos de organização compartilham createUserSchema, e
      // nomad_cnpj só se aplica a account_type === "nomades").
      if (account_type === "nomades" && !(ef.nomad_cnpj as string | undefined)?.trim()) {
        res.status(400).json({ error: "CNPJ é obrigatório para cadastrar um nômade" });
        return;
      }

      const password_hash = await bcrypt.hash(password, 10);

      // Normalize role: usa o role explícito quando ele não é o default "não
      // informado" do zod (company_user); caso contrário, decide pelo
      // company_id, não pelo valor ambíguo de rawRole — zod sempre entrega
      // "company_user" quando o chamador não manda nada, então usar
      // "rawRole === company_user" pra decidir "é uma empresa nova?" (bug
      // real encontrado na Tarefa 9: toda empresa nova virava company_user
      // órfão, sem Company nenhuma criada, porque a condição nunca batia).
      // Com company_id presente → adicionando a uma empresa existente,
      // default company_user. Sem company_id → fundando organização nova,
      // default é sempre o *_admin daquele account_type.
      const resolvedRole =
        rawRole && rawRole !== "company_user"
          ? rawRole
          : company_id || agency_id
            ? (rawRole || "company_user")
            : (DEFAULT_ROLE[account_type] || rawRole || "company_user");

      const user = await prisma.$transaction(async (tx) => {
        // 1. Create the User record
        const user_code = await generateNextUserCode(tx);
        const created = await tx.user.create({
          data: {
            ...(rest as object),
            account_type,
            role: resolvedRole,
            password_hash,
            user_code,
            ...(company_id ? { company_id } : {}),
            ...(agency_id ? { agency_id } : {}),
          } as Parameters<typeof tx.user.create>[0]["data"],
          select: { ...safeSelect, id: true },
        });

        // 2. Create the profile entity matching account_type, and — pro
        // usuário principal, que é sempre criado atomicamente junto com a
        // organização — o vínculo de membro (User.agency_id/company_id) é
        // preenchido na mesma transação. É esse vínculo, não a propriedade
        // (owner_user_id), que passa a definir o escopo de acesso (ver
        // resolveMyAgencyId). Não existe mais um branch "parceiro" aqui —
        // Partner nasce de convite a uma Agency já existente, nunca de um
        // cadastro de usuário novo (ver resolveMyPartnerId).
        if (account_type === "agencias" && !agency_id) {
          const existing = await tx.agency.findUnique({ where: { owner_user_id: created.id } });
          const agency =
            existing ??
            (await tx.agency.create({
              data: {
                owner_user_id: created.id,
                name: organization_name || (rest.name as string) || "Nova Agência",
                email: rest.email as string | undefined,
                status: (ef.agency_status as string) || "ativo",
                partner_level: "bronze",
                cnpj: (ef.agency_cnpj as string) || undefined,
                phone: (ef.agency_phone as string) || undefined,
                address: (ef.agency_address as string) || undefined,
                number: (ef.agency_number as string) || undefined,
                neighborhood: (ef.agency_neighborhood as string) || undefined,
                city: (ef.agency_city as string) || undefined,
                state: (ef.agency_state as string) || undefined,
                zip_code: (ef.agency_zip_code as string) || undefined,
                pix_key: (ef.agency_pix_key as string) || undefined,
                pix_key_type: (ef.agency_pix_key_type as string) || undefined,
              },
            }));
          await tx.user.update({ where: { id: created.id }, data: { agency_id: agency.id } });
        } else if (account_type === "nomades") {
          const existing = await tx.nomade.findUnique({ where: { user_id: created.id } });
          if (!existing) {
            await tx.nomade.create({
              data: {
                user_id: created.id,
                name: (rest.name as string) || "Novo Nômade",
                email: rest.email as string,
                cnpj: ef.nomad_cnpj as string,
                status: (ef.nomad_status as string) || "aguardando_aprovacao",
                whatsapp: (ef.nomad_whatsapp as string) || undefined,
                level: (ef.nomad_level as string) || "bronze",
                avatar: (ef.nomad_avatar as string) || undefined,
                address: (ef.nomad_address as string) || undefined,
                number: (ef.nomad_number as string) || undefined,
                neighborhood: (ef.nomad_neighborhood as string) || undefined,
                city: (ef.nomad_city as string) || undefined,
                state: (ef.nomad_state as string) || undefined,
                zip_code: (ef.nomad_zip_code as string) || undefined,
                pix_key: (ef.nomad_pix_key as string) || undefined,
                pix_key_type: (ef.nomad_pix_key_type as string) || undefined,
              },
            });
          }
        } else if (account_type === "lider") {
          const existing = await tx.liderArea.findFirst({ where: { user_id: created.id } });
          if (!existing) {
            await tx.liderArea.create({
              data: {
                user_id: created.id,
                area_nome: "Geral",
                ativo: true,
                categorias_permitidas: JSON.stringify([]),
                produtos_permitidos: JSON.stringify([]),
              },
            });
          }
        } else if (account_type === "empresas" && !company_id && resolvedRole !== "company_user") {
          // Create a new Company for company_admin users without an existing company link.
          // owner_user_id marca o usuário principal (propriedade); company_id
          // no User marca o vínculo de membro (escopo) — o mesmo usuário
          // recebe os dois, já que é ele quem acabou de fundar a empresa.
          const freedSequenceNumber = await claimFreedSequenceNumber(tx);
          const company = await tx.company.create({
            data: {
              ...(freedSequenceNumber !== undefined
                ? { sequence_number: freedSequenceNumber }
                : {}),
              owner_user_id: created.id,
              name: organization_name || (rest.name as string) || "Nova Empresa",
              email: rest.email as string | undefined,
              status: (ef.company_status as string) || "ativo",
              cnpj: (ef.company_cnpj as string) || undefined,
              phone: (ef.company_phone as string) || undefined,
              website: (ef.company_website as string) || undefined,
              segment: (ef.company_segment as string) || undefined,
              address: (ef.company_address as string) || undefined,
              number: (ef.company_number as string) || undefined,
              neighborhood: (ef.company_neighborhood as string) || undefined,
              city: (ef.company_city as string) || undefined,
              state: (ef.company_state as string) || undefined,
              zip_code: (ef.company_zip_code as string) || undefined,
              pix_key: (ef.company_pix_key as string) || undefined,
              pix_key_type: (ef.company_pix_key_type as string) || undefined,
              description: (ef.company_description as string) || undefined,
              logo: (ef.company_logo as string) || undefined,
            },
          });
          await tx.user.update({
            where: { id: created.id },
            data: { company_id: company.id },
          });
        }

        return tx.user.findUnique({ where: { id: created.id }, select: safeSelect });
      });

      res.status(201).json(user);
    } catch (err: any) {
      if (err?.code === "P2002") {
        const field = err?.meta?.target as string | string[] | undefined;
        const targets = Array.isArray(field) ? field : [field ?? ""];
        if (targets.some((f) => f.includes("email"))) {
          res.status(409).json({ error: "Este e-mail já está cadastrado" });
          return;
        }
        if (targets.some((f) => f.includes("username"))) {
          res.status(409).json({ error: "Este usuário já está cadastrado" });
          return;
        }
        if (targets.some((f) => f.includes("cpf"))) {
          res.status(409).json({ error: "Este CPF já está cadastrado" });
          return;
        }
        res.status(409).json({ error: "Registro duplicado" });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/users/:id
router.put("/:id", verifyToken, validate(updateUserSchema), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body as {
      password?: string;
      [key: string]: unknown;
    };

    // Separa os campos de UserProfile (tabela relacionada) do resto —
    // eles não existem na tabela users, então não podem ir direto pro
    // prisma.user.update.
    const profileData: Record<string, unknown> = {};
    for (const key of PROFILE_FIELD_KEYS) {
      if (rest[key] !== undefined) {
        profileData[key] = key === "birth_date" && rest[key] ? new Date(rest[key] as string) : rest[key];
        delete rest[key];
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = { ...rest };
    if (password) {
      data["password_hash"] = await bcrypt.hash(password, 10);
    }

    const id = req.params.id as string;
    const user = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id }, data });
      }
      if (Object.keys(profileData).length > 0) {
        await tx.userProfile.upsert({
          where: { user_id: id },
          create: { user_id: id, ...profileData },
          update: profileData,
        });
      }
      return tx.user.findUnique({ where: { id }, select: safeSelect });
    });

    res.json(flattenProfile(user!));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete(
  "/:id",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      await prisma.user.delete({ where: { id: (req.params.id as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;

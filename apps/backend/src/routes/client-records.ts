import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { resolveMyAgencyId } from "../lib/project-scope";

const router = Router();

// Rota paralela da entidade real Client — NÃO confundir com /api/clients
// (legado, que na verdade opera sobre Company). Client é uma entidade
// própria, vinculada a Agency/Company/Partner via ClientLink. GET e POST
// (criação) já implementados; PUT/DELETE/endpoints dedicados de vínculo
// ficam para um próximo bloco.
//
// Valores reais de role/account_type confirmados via grep no código
// existente (auth.ts, allkademy.ts, partners.ts, clients.ts) — não assumidos:
//   admin   → role === "admin" (às vezes account_type === "admin" também)
//   leader  → role === "lider" (valor em português; account_type também
//             pode vir "lider", ver seed-test-users.ts)
//   agency  → account_type === "agencias" (Partner é um upgrade DESTE
//             mesmo account_type — não existe mais "parceiro" separado;
//             ver resolveMyPartnerId em lib/project-scope.ts)
//   company → account_type === "empresas"
//   nomad   → account_type === "nomades" || role === "nomad"

function isAdminUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "admin" || user?.account_type === "admin";
}
function isLeaderUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "lider" || user?.account_type === "lider";
}
function isAgencyUser(user?: { account_type?: string }): boolean {
  return user?.account_type === "agencias";
}
function isCompanyUser(user?: { account_type?: string }): boolean {
  return user?.account_type === "empresas";
}
function isNomadUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.account_type === "nomades" || user?.role === "nomad";
}

// Quem pode criar Client: Admin (com ou sem vínculo), Agency (vinculado à
// própria Agency) e Company (vinculado à própria Company). Partner não é
// mais um account_type separado (é a própria Agency com PartnerProfile
// ativo — já coberto por isAgencyUser). Leader é read-only; Nomad não cria.
function canCreateClient(user?: { role?: string; account_type?: string }): boolean {
  return isAdminUser(user) || isAgencyUser(user) || isCompanyUser(user);
}

function normalizeDocument(doc: string): string | undefined {
  const digits = doc.replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

// Mesma normalização de documento (só dígitos) — nome próprio só pra
// deixar claro no call-site que é telefone, não CPF/CNPJ.
const normalizePhoneDigits = normalizeDocument;

// trim + lowercase + colapsa espaços repetidos + remove acentos (NFD e
// descarta os diacríticos). Usado só para comparação de duplicidade em
// memória — não é persistido normalizado (mudaria o dado exibido).
function normalizeName(name: string): string {
  const noDiacritics = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f; // descarta marcas diacríticas combinantes
    })
    .join("");
  return noDiacritics;
}

// true se o client já está vinculado ao mesmo dono (agency/company/partner)
// do usuário que está tentando criar o duplicado. Sub-user de agência
// (role agency_user) só "enxerga" o que ele mesmo criou — mesma regra do
// GET / e GET /:id — então pra ele o match só conta como "própria carteira"
// se created_by_user_id também bater; senão cai no fluxo de outra
// organização (mensagem genérica, sem revelar o registro que ele não pode ver).
function candidateMatchesOwnScope(
  client: ClientWithLinks,
  scope: { kind: "agency" | "company" | "partner"; id: string } | null,
  user?: { id: string; role?: string },
): boolean {
  if (!scope) return false;
  const linked = client.links.some((l) => {
    if (scope.kind === "agency") return l.agency_id === scope.id;
    if (scope.kind === "company") return l.company_id === scope.id;
    return l.partner_id === scope.id;
  });
  if (!linked) return false;
  if (scope.kind === "agency" && user?.role === "agency_user") {
    return client.created_by_user_id === user.id;
  }
  return true;
}

// Preprocessors rodam ANTES da validação de formato do zod (ex.: .email()),
// não depois — é isso que corrige o caso de " Novo.Agency@Teste.com " sendo
// rejeitado como "Invalid email" só por causa dos espaços nas pontas. String
// vazia depois do trim vira undefined (equivalente a "não informado" —
// Prisma grava null pra campo opcional sem valor).
function trimToUndefined(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
function trimLowerToUndefined(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Variantes usadas só no PUT (edição): aqui uma string vazia enviada de
// propósito precisa virar `null` (limpa o campo de verdade), não `undefined`
// (que no handler do PUT significa "campo nem foi enviado, não mexe nele").
// É essa distinção que implementa "strings vazias viram null" sem apagar
// campos que o formulário simplesmente não mandou.
function trimToNullable(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function trimLowerToNullable(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

const createClientSchema = z.object({
  name: z.preprocess(trimToUndefined, z.string().min(1, "name é obrigatório")),
  type: z.preprocess(trimLowerToUndefined, z.enum(["pj", "pf"]).default("pj")),
  // document só recebe trim aqui — a remoção de pontuação (normalizeDocument)
  // acontece depois da validação, no handler, igual já fazia antes.
  document: z.preprocess(trimToUndefined, z.string().optional()),
  email: z.preprocess(trimLowerToUndefined, z.string().email().optional()),
  phone: z.preprocess(trimToUndefined, z.string().optional()),
  website: z.preprocess(trimToUndefined, z.string().optional()),
  segment: z.preprocess(trimToUndefined, z.string().optional()),
  status: z.preprocess(trimLowerToUndefined, z.enum(["active", "inactive", "prospect"]).default("active")),
  address: z.preprocess(trimToUndefined, z.string().optional()),
  number: z.preprocess(trimToUndefined, z.string().optional()),
  neighborhood: z.preprocess(trimToUndefined, z.string().optional()),
  city: z.preprocess(trimToUndefined, z.string().optional()),
  state: z.preprocess(trimToUndefined, z.string().optional()),
  zip_code: z.preprocess(trimToUndefined, z.string().optional()),
  avatar: z.preprocess(trimToUndefined, z.string().optional()),
  notes: z.preprocess(trimToUndefined, z.string().optional()),
  description: z.preprocess(trimToUndefined, z.string().optional()),
  // Só admin pode de fato usar estes — Agency tem os seus ignorados de
  // propósito (o vínculo dela vem sempre do próprio usuário logado).
  agency_id: z.preprocess(trimToUndefined, z.string().optional()),
  company_id: z.preprocess(trimToUndefined, z.string().optional()),
  partner_id: z.preprocess(trimToUndefined, z.string().optional()),
});

// Schema do PUT /:id — todos os campos opcionais (edição parcial). Chave
// ausente no body = não mexe no campo. Chave presente e vazia = limpa pra
// null (ver trimToNullable/trimLowerToNullable acima). Sem vínculo aqui —
// isso é só no PUT /:id/link.
const updateClientSchema = z.object({
  name: z.preprocess(trimToUndefined, z.string().min(1, "name não pode ficar vazio").optional()),
  type: z.preprocess(trimLowerToUndefined, z.enum(["pj", "pf"]).optional()),
  document: z.preprocess(trimToNullable, z.string().nullable().optional()),
  email: z.preprocess(trimLowerToNullable, z.string().email().nullable().optional()),
  phone: z.preprocess(trimToNullable, z.string().nullable().optional()),
  website: z.preprocess(trimToNullable, z.string().nullable().optional()),
  segment: z.preprocess(trimToNullable, z.string().nullable().optional()),
  status: z.preprocess(trimLowerToUndefined, z.enum(["active", "inactive", "prospect"]).optional()),
  address: z.preprocess(trimToNullable, z.string().nullable().optional()),
  number: z.preprocess(trimToNullable, z.string().nullable().optional()),
  neighborhood: z.preprocess(trimToNullable, z.string().nullable().optional()),
  city: z.preprocess(trimToNullable, z.string().nullable().optional()),
  state: z.preprocess(trimToNullable, z.string().nullable().optional()),
  zip_code: z.preprocess(trimToNullable, z.string().nullable().optional()),
  avatar: z.preprocess(trimToNullable, z.string().nullable().optional()),
  notes: z.preprocess(trimToNullable, z.string().nullable().optional()),
  description: z.preprocess(trimToNullable, z.string().nullable().optional()),
});

// Schema do PUT /:id/link — vínculo é tratado à parte do resto dos campos
// de propósito (é a operação mais sensível: muda quem enxerga o Client).
const updateLinkSchema = z.object({
  agency_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  partner_id: z.string().nullable().optional(),
});

type ClientWithLinks = {
  id: string;
  sequence_number: number;
  name: string;
  type: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  segment: string | null;
  status: string;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  avatar: string | null;
  notes: string | null;
  description: string | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  links: { id: string; agency_id: string | null; company_id: string | null; partner_id: string | null; status: string }[];
};

function toClientDTO(c: ClientWithLinks) {
  return {
    id: c.id,
    sequence_number: c.sequence_number,
    name: c.name,
    type: c.type,
    document: c.document,
    email: c.email,
    phone: c.phone,
    website: c.website,
    segment: c.segment,
    status: c.status,
    address: c.address,
    number: c.number,
    neighborhood: c.neighborhood,
    city: c.city,
    state: c.state,
    zip_code: c.zip_code,
    avatar: c.avatar,
    notes: c.notes,
    description: c.description,
    created_by_user_id: c.created_by_user_id,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
    links: c.links.map((l) => ({
      id: l.id,
      agency_id: l.agency_id,
      company_id: l.company_id,
      partner_id: l.partner_id,
      status: l.status,
    })),
  };
}

const CLIENT_INCLUDE = {
  links: {
    select: { id: true, agency_id: true, company_id: true, partner_id: true, status: true },
  },
} as const;

// Resolve o id do próprio perfil (Agency/Company/Partner) do usuário logado,
// usado pra escopar a listagem/leitura só ao que está vinculado a ele.
async function resolveOwnScopeId(
  user: { id: string; account_type?: string; role?: string },
): Promise<{ kind: "agency" | "company" | "partner"; id: string | null } | null> {
  if (isAgencyUser(user)) {
    return { kind: "agency", id: await resolveMyAgencyId(prisma, user.id) };
  }
  if (isCompanyUser(user)) {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { company_id: true } });
    return { kind: "company", id: u?.company_id ?? null };
  }
  return null;
}

// GET /api/client-records
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;

    if (isNomadUser(user)) {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    // sortBy/sortDir são opcionais — sem eles o comportamento não muda pra
    // ninguém (continua created_at desc). Usado pelo Admin pra listar a
    // partir de cli_00001 (sequence_number asc) sem afetar Agency/Company/
    // Partner/Leader, que não mandam esses params.
    const sortByRaw = req.query.sortBy as string | undefined;
    const sortDirRaw = req.query.sortDir as string | undefined;
    const sortBy = sortByRaw === "sequence_number" || sortByRaw === "name" ? sortByRaw : "created_at";
    const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (type) where["type"] = type;
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { document: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { segment: { contains: search } },
      ];
    }

    if (!isAdminUser(user) && !isLeaderUser(user)) {
      const scope = await resolveOwnScopeId(user);
      if (!scope) {
        res.status(403).json({ error: "Acesso não autorizado" });
        return;
      }
      if (!scope.id) {
        res.json({ data: [], total: 0, page, limit, totalPages: 0 });
        return;
      }
      where["links"] = { some: { [`${scope.kind}_id`]: scope.id } };
      // Sub-user de agência (role agency_user) só vê o que ele mesmo criou;
      // o principal (agency_admin) continua vendo tudo da agência, como
      // sempre. Company/Partner não têm essa distinção nesta etapa.
      if (scope.kind === "agency" && user.role === "agency_user") {
        where["created_by_user_id"] = user.id;
      }
    }
    // Admin e Leader: sem filtro extra, veem tudo. Leader é somente-leitura
    // (não há POST/PUT/DELETE nesta rota ainda de qualquer forma).

    const [total, data] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: CLIENT_INCLUDE,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
    ]);

    res.json({
      data: data.map(toClientDTO),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/client-records
// Admin: cria sem vínculo, ou com exatamente um de agency_id/company_id/
// partner_id (valida que o id existe; 400 se mandar mais de um).
// Agency/Company/Partner: sempre criam vinculados ao próprio perfil logado —
// qualquer agency_id/company_id/partner_id enviado no body é ignorado de
// propósito. Leader/Nomad: 403. Nada de Project é tocado aqui.
router.post("/", verifyToken, validate(createClientSchema), async (req, res, next) => {
  try {
    const user = req.user!;

    if (!canCreateClient(user)) {
      res.status(403).json({ error: "Permissão insuficiente" });
      return;
    }

    const body = req.body as z.infer<typeof createClientSchema>;
    // body.email já chega trim+lowercase (preprocess do schema). document só
    // chega com trim — a remoção de pontuação é feita aqui.
    const document = body.document ? normalizeDocument(body.document) : undefined;
    const email = body.email;
    const phoneNorm = body.phone ? normalizePhoneDigits(body.phone) : undefined;
    const nameNorm = normalizeName(body.name);

    // Resolve o escopo do usuário ANTES da checagem de duplicidade (não só
    // depois, pra montar o vínculo) — precisamos saber se um eventual
    // duplicado encontrado é "meu" ou "de outra organização" pra decidir
    // qual dos dois dados a resposta pode revelar.
    let callerScope: { kind: "agency" | "company" | "partner"; id: string } | null = null;
    if (isAgencyUser(user) || isCompanyUser(user)) {
      const resolved = await resolveOwnScopeId(user);
      if (!resolved || !resolved.id) {
        const label = isAgencyUser(user) ? "Agência" : "Company";
        res.status(403).json({ error: `${label} não encontrada para o usuário logado` });
        return;
      }
      callerScope = { kind: resolved.kind, id: resolved.id };
    }

    // ── Verificação global de duplicidade (toda a plataforma, qualquer
    // Agency/Company/Partner) ────────────────────────────────────────────
    // document/email já são persistidos normalizados (dígitos / lowercase
    // — ver preprocessors do schema e normalizeDocument acima), então dá
    // pra comparar direto no banco. phone e name NÃO são normalizados em
    // repouso nesta etapa (fora de escopo — exigiria migration pra coluna
    // normalizada), então são comparados em memória contra todos os
    // clients; seguro com o volume atual (~70 registros), mas não escala —
    // se a base crescer muito, revisitar com coluna normalizada + índice.
    const exactOr: Record<string, unknown>[] = [];
    if (document) exactOr.push({ document });
    if (email) exactOr.push({ email });

    const [exactMatches, allClients] = await Promise.all([
      exactOr.length > 0
        ? prisma.client.findMany({ where: { OR: exactOr }, include: CLIENT_INCLUDE })
        : Promise.resolve([] as ClientWithLinks[]),
      prisma.client.findMany({ include: CLIENT_INCLUDE }),
    ]);

    const duplicates = new Map<string, ClientWithLinks>();
    for (const c of exactMatches) duplicates.set(c.id, c);
    for (const c of allClients) {
      const phoneHit = phoneNorm && c.phone ? normalizePhoneDigits(c.phone) === phoneNorm : false;
      const nameHit = normalizeName(c.name) === nameNorm;
      if (phoneHit || nameHit) duplicates.set(c.id, c);
    }

    if (duplicates.size > 0) {
      const candidates = Array.from(duplicates.values());
      const sameScopeMatch = candidates.find((c) => candidateMatchesOwnScope(c, callerScope, user));

      if (sameScopeMatch) {
        // Mesma Agency/Company/Partner do usuário logado: pode ver os
        // dados, já que é o dono do registro — nenhuma informação nova é
        // exposta além do que ele já enxerga via GET /:id ou na listagem.
        res.status(409).json({
          error: "Este cliente já está cadastrado na sua carteira.",
          code: "CLIENT_ALREADY_REGISTERED_SAME_AGENCY",
          client: toClientDTO(sameScopeMatch),
        });
        return;
      }

      // Duplicado pertence a outra organização (ou está sem vínculo, ou o
      // usuário é Admin/Leader sem escopo próprio) — mensagem genérica,
      // sem nome, id ou qualquer dado da outra organização. O código
      // prepara o frontend para futuramente oferecer "Solicitar ajuda"
      // (chamado ao Admin), que NÃO é implementado nesta etapa.
      res.status(409).json({
        error:
          "Não foi possível cadastrar este cliente porque já existe um cadastro correspondente na plataforma. Caso precise de ajuda, solicite uma análise ao suporte.",
        code: "CLIENT_ALREADY_REGISTERED_OTHER_AGENCY",
        supportRequestAvailable: true,
      });
      return;
    }

    let linkAgencyId: string | undefined;
    let linkCompanyId: string | undefined;
    let linkPartnerId: string | undefined;

    if (callerScope) {
      // Vínculo sempre automático ao próprio perfil logado — qualquer
      // agency_id/company_id/partner_id enviado no body é ignorado de
      // propósito (não dá pra Agency/Company/Partner escolher outro dono).
      if (callerScope.kind === "agency") linkAgencyId = callerScope.id;
      else if (callerScope.kind === "company") linkCompanyId = callerScope.id;
      else linkPartnerId = callerScope.id;
    } else {
      // Admin: no máximo um vínculo, e só se o id informado existir de fato.
      const providedCount = [body.agency_id, body.company_id, body.partner_id].filter(Boolean).length;
      if (providedCount > 1) {
        res.status(400).json({ error: "Informe no máximo um vínculo: agency_id, company_id ou partner_id" });
        return;
      }
      if (body.agency_id) {
        const exists = await prisma.agency.findUnique({ where: { id: body.agency_id }, select: { id: true } });
        if (!exists) {
          res.status(400).json({ error: "Agency não encontrada" });
          return;
        }
        linkAgencyId = body.agency_id;
      } else if (body.company_id) {
        const exists = await prisma.company.findUnique({ where: { id: body.company_id }, select: { id: true } });
        if (!exists) {
          res.status(400).json({ error: "Company não encontrada" });
          return;
        }
        linkCompanyId = body.company_id;
      } else if (body.partner_id) {
        const exists = await prisma.partnerProfile.findUnique({ where: { id: body.partner_id }, select: { id: true } });
        if (!exists) {
          res.status(400).json({ error: "Partner não encontrado" });
          return;
        }
        linkPartnerId = body.partner_id;
      }
    }

    const createdId = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: body.name,
          type: body.type,
          document,
          email,
          phone: body.phone,
          website: body.website,
          segment: body.segment,
          status: body.status,
          address: body.address,
          number: body.number,
          neighborhood: body.neighborhood,
          city: body.city,
          state: body.state,
          zip_code: body.zip_code,
          avatar: body.avatar,
          notes: body.notes,
          description: body.description,
          created_by_user_id: user.id,
        },
      });

      // Exactly-one já garantido acima (um único dos três, ou nenhum pro
      // admin) — só cria o ClientLink se houver de fato um vínculo a gravar.
      if (linkAgencyId || linkCompanyId || linkPartnerId) {
        await tx.clientLink.create({
          data: {
            client_id: client.id,
            agency_id: linkAgencyId,
            company_id: linkCompanyId,
            partner_id: linkPartnerId,
            status: "active",
          },
        });
      }

      return client.id;
    });

    const created = await prisma.client.findUnique({ where: { id: createdId }, include: CLIENT_INCLUDE });
    res.status(201).json(toClientDTO(created!));
  } catch (err) {
    next(err);
  }
});

// PUT /api/client-records/:id — admin-only, edita os campos principais do
// Client. NÃO mexe em vínculo (ver PUT /:id/link) — Leader/Agency/Company/
// Partner/Nomad não editam neste bloco (403).
router.put("/:id", verifyToken, validate(updateClientSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: "Permissão insuficiente" });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }

    const body = req.body as z.infer<typeof updateClientSchema>;

    // document: normaliza pontuação só quando um valor real foi enviado;
    // null explícito (campo limpo no form) passa direto.
    let document: string | null | undefined;
    if (body.document !== undefined) {
      document = body.document === null ? null : (normalizeDocument(body.document) ?? null);
      if (document) {
        const dup = await prisma.client.findFirst({ where: { document, NOT: { id } }, select: { id: true } });
        if (dup) {
          res.status(409).json({ error: "Cliente já existe com este documento" });
          return;
        }
      }
    }

    const email = body.email;
    if (email !== undefined && email !== null) {
      const dup = await prisma.client.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
      if (dup) {
        res.status(409).json({ error: "Cliente já existe com este e-mail" });
        return;
      }
    }

    const data: Record<string, unknown> = {};
    const passthroughFields = [
      "name", "type", "phone", "website", "segment", "status",
      "address", "number", "neighborhood", "city", "state", "zip_code", "avatar",
      "notes", "description",
    ] as const;
    for (const key of passthroughFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (document !== undefined) data.document = document;
    if (email !== undefined) data.email = email;

    const updated = await prisma.client.update({ where: { id }, data, include: CLIENT_INCLUDE });
    res.json(toClientDTO(updated));
  } catch (err) {
    next(err);
  }
});

// PUT /api/client-records/:id/link — admin-only, define ou remove o vínculo
// do Client. Envie exatamente um de agency_id/company_id/partner_id pra
// vincular, ou todos ausentes/null pra desvincular. Simplificação
// deliberada: substitui qualquer vínculo existente por este único (não é
// um CRUD de múltiplos vínculos simultâneos — isso fica pra um bloco
// futuro se vier a ser necessário).
router.put("/:id/link", verifyToken, validate(updateLinkSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: "Permissão insuficiente" });
      return;
    }

    const id = req.params.id as string;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }

    const body = req.body as z.infer<typeof updateLinkSchema>;
    const providedCount = [body.agency_id, body.company_id, body.partner_id].filter(Boolean).length;
    if (providedCount > 1) {
      res.status(400).json({ error: "Informe no máximo um vínculo: agency_id, company_id ou partner_id" });
      return;
    }

    let agencyId: string | undefined;
    let companyId: string | undefined;
    let partnerId: string | undefined;

    if (body.agency_id) {
      const exists = await prisma.agency.findUnique({ where: { id: body.agency_id }, select: { id: true } });
      if (!exists) {
        res.status(400).json({ error: "Agency não encontrada" });
        return;
      }
      agencyId = body.agency_id;
    } else if (body.company_id) {
      const exists = await prisma.company.findUnique({ where: { id: body.company_id }, select: { id: true } });
      if (!exists) {
        res.status(400).json({ error: "Company não encontrada" });
        return;
      }
      companyId = body.company_id;
    } else if (body.partner_id) {
      const exists = await prisma.partnerProfile.findUnique({ where: { id: body.partner_id }, select: { id: true } });
      if (!exists) {
        res.status(400).json({ error: "Partner não encontrado" });
        return;
      }
      partnerId = body.partner_id;
    }

    await prisma.$transaction(async (tx) => {
      await tx.clientLink.deleteMany({ where: { client_id: id } });
      if (agencyId || companyId || partnerId) {
        await tx.clientLink.create({
          data: { client_id: id, agency_id: agencyId, company_id: companyId, partner_id: partnerId, status: "active" },
        });
      }
    });

    const updated = await prisma.client.findUnique({ where: { id }, include: CLIENT_INCLUDE });
    res.json(toClientDTO(updated!));
  } catch (err) {
    next(err);
  }
});

// GET /api/client-records/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;

    if (isNomadUser(user)) {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: req.params.id as string },
      include: CLIENT_INCLUDE,
    });

    if (!client) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }

    if (isAdminUser(user) || isLeaderUser(user)) {
      res.json(toClientDTO(client));
      return;
    }

    const scope = await resolveOwnScopeId(user);
    if (!scope || !scope.id) {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }
    const hasLink = client.links.some((l) => {
      if (scope.kind === "agency") return l.agency_id === scope.id;
      if (scope.kind === "company") return l.company_id === scope.id;
      return l.partner_id === scope.id;
    });
    if (!hasLink) {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }
    // Sub-user de agência só abre o que ele mesmo criou — mesma regra do
    // GET / e da checagem de duplicidade no POST.
    if (scope.kind === "agency" && user.role === "agency_user" && client.created_by_user_id !== user.id) {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    res.json(toClientDTO(client));
  } catch (err) {
    next(err);
  }
});

export default router;

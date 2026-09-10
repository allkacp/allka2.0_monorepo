// Manifesto de retenção — bloco "manifesto de retenção e simulador de
// virada limpa" (segue a auditoria de preparação da virada limpa).
//
// Resolve cada uma das quatro contas retidas pelo E-MAIL (nunca por id
// suposto) e devolve só o que é indispensável para login/identidade —
// nunca projetos, tarefas, produtos, compras, alertas, chat, histórico ou
// qualquer outro dado de negócio dessas contas, mesmo que vinculado a elas.
//
// Toda leitura passa pelo client informado pelo chamador (o script real usa
// o client com attachReadOnlyGuard — ver read-only-guard.ts). Este módulo
// não decide fazer nenhuma escrita em nenhuma hipótese: só tem `findUnique`.

export const RETAINED_ACCOUNT_EMAILS = [
  "cp@lamego.com.vc",
  "gabriel@lamego.com.vc",
  "valderio@lamego.com.vc",
  "nomad@allka.com.vc",
] as const;

export type RetainedAccountEmail = (typeof RETAINED_ACCOUNT_EMAILS)[number];

export class RetentionManifestError extends Error {
  constructor(
    public readonly email: string,
    message: string,
  ) {
    super(message);
    this.name = "RetentionManifestError";
  }
}

// ── Formas de dados (nunca inclui password_hash/tokens) ────────────────────

export interface RawUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  account_type: string;
  status: string;
  is_active: boolean;
  company_id: string | null;
  agency_id: string | null;
  admin_profile_id: string | null;
}

export interface RawOrgRow {
  id: string;
  name: string;
  status: string;
}

export interface RawAdminProfileRow {
  id: string;
  name: string;
}

export interface RawPartnerProfileRow {
  id: string;
  agency_id: string;
  status: string;
}

export interface RawAccountRows {
  user: RawUserRow | null;
  memberAgency: RawOrgRow | null;
  ownedAgency: RawOrgRow | null;
  memberCompany: RawOrgRow | null;
  ownedCompany: RawOrgRow | null;
  adminProfile: RawAdminProfileRow | null;
  nomade: RawOrgRow | null;
  partnerProfile: RawPartnerProfileRow | null;
}

export interface RetainedAccountManifestEntry {
  email: string;
  user_id: string;
  name: string;
  role: string;
  account_type: string;
  status: string;
  /** Registros mínimos que precisam sobreviver ao reset para esta conta continuar logando. */
  minimal_required_records: string[];
  /** O que NÃO é preservado automaticamente — sempre presente, mesmo vazio seria enganoso. */
  not_automatically_retained: string[];
  /** Ids estruturais vinculados (uso interno do plano de domínios — nunca exibidos como dado sensível). */
  linked_agency_id: string | null;
  linked_company_id: string | null;
  linked_nomade_id: string | null;
}

export type RetentionManifest = RetainedAccountManifestEntry[];

// ── Lógica pura (testável sem banco) ────────────────────────────────────────

const NOT_AUTOMATICALLY_RETAINED = [
  "projetos criados, arquivados ou de responsabilidade desta conta",
  "tarefas de projeto e etapas onde esta conta é responsável",
  "produtos, compras, cotações, faturas e carteira ligados a esta conta",
  "alertas, notificações, chat e presença desta conta",
  "campanhas, cupons e histórico de uso desta conta",
  "qualquer outro dado de negócio — só identidade/autenticação/vínculo estrutural é preservado aqui",
];

/**
 * Avalia os dados já buscados (fetchAccountRawRows) para uma conta e decide
 * o registro mínimo a reter, OU lança RetentionManifestError com uma
 * mensagem clara se a conta não existe ou tem vínculo ambíguo/quebrado.
 * Pura — não faz nenhuma leitura/escrita própria.
 */
export function evaluateRetainedAccount(email: string, raw: RawAccountRows): RetainedAccountManifestEntry {
  const { user } = raw;
  if (!user) {
    throw new RetentionManifestError(email, `Conta de retenção não encontrada: ${email}. Nada foi criado ou apagado.`);
  }

  if (user.company_id && user.agency_id) {
    throw new RetentionManifestError(
      email,
      `Vínculo ambíguo para ${email}: o usuário tem company_id e agency_id preenchidos ao mesmo tempo ` +
        "(o schema espera no máximo um dos dois). Resolva a ambiguidade no cadastro antes de simular a retenção desta conta.",
    );
  }

  if (user.agency_id && !raw.memberAgency) {
    throw new RetentionManifestError(
      email,
      `Vínculo quebrado para ${email}: users.agency_id aponta para uma agência que não existe (${user.agency_id}).`,
    );
  }
  if (user.company_id && !raw.memberCompany) {
    throw new RetentionManifestError(
      email,
      `Vínculo quebrado para ${email}: users.company_id aponta para uma empresa que não existe (${user.company_id}).`,
    );
  }
  if (user.admin_profile_id && !raw.adminProfile) {
    throw new RetentionManifestError(
      email,
      `Vínculo quebrado para ${email}: users.admin_profile_id aponta para um perfil de admin que não existe (${user.admin_profile_id}).`,
    );
  }

  if (raw.ownedAgency && raw.memberAgency && raw.ownedAgency.id !== raw.memberAgency.id) {
    throw new RetentionManifestError(
      email,
      `Vínculo ambíguo para ${email}: a conta é dona de uma agência (${raw.ownedAgency.id}) e membro de outra ` +
        `agência diferente (${raw.memberAgency.id}). Resolva qual é o vínculo real antes de reter esta conta.`,
    );
  }
  if (raw.ownedCompany && raw.memberCompany && raw.ownedCompany.id !== raw.memberCompany.id) {
    throw new RetentionManifestError(
      email,
      `Vínculo ambíguo para ${email}: a conta é dona de uma empresa (${raw.ownedCompany.id}) e membro de outra ` +
        `empresa diferente (${raw.memberCompany.id}). Resolva qual é o vínculo real antes de reter esta conta.`,
    );
  }
  if (raw.ownedAgency && raw.ownedCompany) {
    throw new RetentionManifestError(
      email,
      `Vínculo ambíguo para ${email}: a conta é dona de uma agência E de uma empresa ao mesmo tempo — ` +
        "papel de retenção indefinido. Resolva manualmente antes de reter esta conta.",
    );
  }
  if (raw.nomade && (raw.ownedAgency || raw.ownedCompany)) {
    throw new RetentionManifestError(
      email,
      `Vínculo ambíguo para ${email}: a conta tem perfil de nômade e também é dona de agência/empresa ao mesmo ` +
        "tempo — não é um papel válido no modelo atual. Resolva manualmente antes de reter esta conta.",
    );
  }

  const minimal: string[] = [`users.${user.id} (${email}) — identidade e autenticação`];

  if (user.admin_profile_id && raw.adminProfile) {
    minimal.push(`admin_profiles.${raw.adminProfile.id} (${raw.adminProfile.name}) — permissão de admin (estrutural, compartilhado)`);
  }

  const agency = raw.ownedAgency ?? raw.memberAgency;
  if (agency) {
    const papel = raw.ownedAgency ? "dono" : "membro";
    minimal.push(`agencies.${agency.id} (${agency.name}) — vínculo de ${papel}`);
  }

  const company = raw.ownedCompany ?? raw.memberCompany;
  if (company) {
    const papel = raw.ownedCompany ? "dono" : "membro";
    minimal.push(`companies.${company.id} (${company.name}) — vínculo de ${papel}`);
  }

  if (raw.partnerProfile) {
    minimal.push(`partner_profiles.${raw.partnerProfile.id} — vínculo de parceiro da agência retida`);
  }

  if (raw.nomade) {
    minimal.push(`nomades.${raw.nomade.id} (${raw.nomade.name}) — perfil de nômade (só identidade, sem histórico/carteira)`);
  }

  return {
    email,
    user_id: user.id,
    name: user.name,
    role: user.role,
    account_type: user.account_type,
    status: user.status,
    minimal_required_records: minimal,
    not_automatically_retained: [...NOT_AUTOMATICALLY_RETAINED],
    linked_agency_id: agency?.id ?? null,
    linked_company_id: company?.id ?? null,
    linked_nomade_id: raw.nomade?.id ?? null,
  };
}

// ── Camada de I/O (Prisma) ──────────────────────────────────────────────────

/** Superfície mínima do Prisma Client usada para buscar as linhas cruas — puramente leitura. */
export interface RetentionManifestDb {
  user: {
    findUnique(args: { where: { email: string }; select: Record<string, boolean> }): Promise<RawUserRow | null>;
  };
  agency: {
    findUnique(args: {
      where: { id?: string; owner_user_id?: string };
      select: Record<string, boolean>;
    }): Promise<RawOrgRow | null>;
  };
  company: {
    findUnique(args: {
      where: { id?: string; owner_user_id?: string };
      select: Record<string, boolean>;
    }): Promise<RawOrgRow | null>;
  };
  adminProfile: {
    findUnique(args: { where: { id: string }; select: Record<string, boolean> }): Promise<RawAdminProfileRow | null>;
  };
  nomade: {
    findUnique(args: { where: { user_id: string }; select: Record<string, boolean> }): Promise<RawOrgRow | null>;
  };
  partnerProfile: {
    findUnique(args: { where: { agency_id: string }; select: Record<string, boolean> }): Promise<RawPartnerProfileRow | null>;
  };
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  account_type: true,
  status: true,
  is_active: true,
  company_id: true,
  agency_id: true,
  admin_profile_id: true,
} as const;

const ORG_SELECT = { id: true, name: true, status: true } as const;

export async function fetchAccountRawRows(db: RetentionManifestDb, email: string): Promise<RawAccountRows> {
  const user = await db.user.findUnique({ where: { email }, select: USER_SELECT });
  if (!user) {
    return {
      user: null,
      memberAgency: null,
      ownedAgency: null,
      memberCompany: null,
      ownedCompany: null,
      adminProfile: null,
      nomade: null,
      partnerProfile: null,
    };
  }

  const [memberAgency, ownedAgency, memberCompany, ownedCompany, adminProfile, nomade] = await Promise.all([
    user.agency_id ? db.agency.findUnique({ where: { id: user.agency_id }, select: ORG_SELECT }) : null,
    db.agency.findUnique({ where: { owner_user_id: user.id }, select: ORG_SELECT }),
    user.company_id ? db.company.findUnique({ where: { id: user.company_id }, select: ORG_SELECT }) : null,
    db.company.findUnique({ where: { owner_user_id: user.id }, select: ORG_SELECT }),
    user.admin_profile_id ? db.adminProfile.findUnique({ where: { id: user.admin_profile_id }, select: { id: true, name: true } }) : null,
    db.nomade.findUnique({ where: { user_id: user.id }, select: ORG_SELECT }),
  ]);

  const agencyForPartnerLookup = ownedAgency ?? memberAgency;
  const partnerProfile = agencyForPartnerLookup
    ? await db.partnerProfile.findUnique({
        where: { agency_id: agencyForPartnerLookup.id },
        select: { id: true, agency_id: true, status: true },
      })
    : null;

  return { user, memberAgency, ownedAgency, memberCompany, ownedCompany, adminProfile, nomade, partnerProfile };
}

export async function resolveRetainedAccount(db: RetentionManifestDb, email: string): Promise<RetainedAccountManifestEntry> {
  const raw = await fetchAccountRawRows(db, email);
  return evaluateRetainedAccount(email, raw);
}

/**
 * Constrói o manifesto completo para as quatro contas de RETAINED_ACCOUNT_EMAILS
 * (ou a lista informada). Falha na primeira conta com problema, com uma
 * mensagem clara — nada é criado nem apagado em nenhuma hipótese, mesmo em
 * caso de falha, porque este módulo só lê.
 */
export async function buildRetentionManifest(
  db: RetentionManifestDb,
  emails: readonly string[] = RETAINED_ACCOUNT_EMAILS,
): Promise<RetentionManifest> {
  const manifest: RetentionManifest = [];
  for (const email of emails) {
    manifest.push(await resolveRetainedAccount(db, email));
  }
  return manifest;
}

/**
 * import-legacy-platform.ts — Importa da plataforma antiga tudo que está ATIVO,
 * adaptando para os modelos novos.
 *
 * Fontes (gerados por scripts/extract-legacy-*.js, ficam em "../allka antigo/"):
 *   - cadastros-legado.json ....... contas, usuários, agências, clientes, nômades, líderes
 *   - operacao-tarefas-legado.json  projetos, produtos do projeto, tarefas, etapas
 *   - produtos-modelos-questionarios.json .. catálogo (pra resolver produto legado → novo)
 *
 * Fases (nesta ordem, por dependência):
 *   1 usuários · 2 agências · 3 clientes · 4 nômades · 5 líderes
 *   6 produtos legados não catalogados · 7 projetos · 8 produtos do projeto · 9 tarefas
 *
 * Rastreabilidade: todo registro importado grava `legacy_id` com o id numérico
 * do sistema antigo (migration 20260802120000_add_legacy_tracking). A numeração
 * exibida (user_N, emp_N, proj_N, T000001…) segue a sequência NOVA da
 * plataforma — o id antigo é só referência de consulta.
 *
 * Tarefas: as que já foram lançadas no modelo antigo entram com
 * `legacy_model = true`. As que ainda vão ser lançadas entram adaptadas ao
 * produto novo quando dá, e com `legacy_model = true` quando não dá.
 *
 * Fora do escopo: relatórios (não funcionavam no sistema antigo), dados de
 * pagamento (cartão/banco), logs e integrações.
 *
 * Idempotente (upsert por legacy_id). Dry-run por padrão.
 *   npx tsx src/scripts/import-legacy-platform.ts [--apply] [--fase=N]
 *   [--incluir-expiradas]   também importa as 12.064 tarefas EXPIRADAS
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { formatProjectCode, formatTaskCode } from "../lib/sequence";

const APPLY = process.argv.includes("--apply");
const INCLUIR_EXPIRADAS = process.argv.includes("--incluir-expiradas");
const FASE = (() => {
  const a = process.argv.find((x) => x.startsWith("--fase="));
  return a ? Number(a.split("=")[1]) : null;
})();

const LEGACY_DIR = path.resolve(__dirname, "../../../../../allka antigo");
const readJson = (f: string) =>
  JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, f), "utf8"));

const CAD = readJson("cadastros-legado.json");
const OPS = readJson("operacao-tarefas-legado.json");
const CAT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../../produtos-modelos-questionarios.json"),
    "utf8",
  ),
);

// ── Helpers ─────────────────────────────────────────────────────────────────

function htmlToText(html: unknown): string {
  if (!html) return "";
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s && s !== "0000-00-00" ? s : null;
};

/** Datas antigas vinham como "YYYY-MM-DD HH:mm:ss", com zeros inválidos. */
function toDate(v: unknown): Date | null {
  const s = clean(v);
  if (!s || s.startsWith("0000")) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "") || null;

interface Stats {
  [fase: string]: { criados: number; atualizados: number; pulados: number; notas: string[] };
}
const stats: Stats = {};
function st(fase: string) {
  return (stats[fase] ??= { criados: 0, atualizados: 0, pulados: 0, notas: [] });
}
function nota(fase: string, msg: string) {
  const s = st(fase);
  if (s.notas.length < 12) s.notas.push(msg);
}

const rodar = (n: number) => FASE === null || FASE === n;

// ── Cadastros referenciados pelos projetos ativos ───────────────────────────
// "Puxar o que está ativo" deixaria buracos: há projeto ativo de agência já
// inativa, e tarefa executada por nômade que depois saiu. Esses cadastros
// entram também, porém marcados como inativos — sem eles o projeto ficaria sem
// dono e a tarefa sem executor, perdendo justamente a informação que a
// importação existe pra preservar.

function projetosAtivosRaw() {
  return OPS.data.project.filter((p: any) => p.status === 3 && p.archived === 0);
}

const agenciasNecessarias = new Set<number>(
  projetosAtivosRaw().map((p: any) => p.agencyId).filter(Boolean),
);
const clientesNecessarios = new Set<number>(
  projetosAtivosRaw().map((p: any) => p.clientId).filter(Boolean),
);
const idsProjetosAtivos = new Set<number>(projetosAtivosRaw().map((p: any) => p.id));
const nomadesNecessarios = new Set<number>(
  OPS.data.task
    .filter((t: any) => idsProjetosAtivos.has(t.projectId) && t.nomadId)
    .map((t: any) => t.nomadId as number),
);
const usuariosNecessarios = new Set<number>(
  projetosAtivosRaw().map((p: any) => p.accountableUserId).filter(Boolean),
);
for (const au of CAD.data.agency_user) {
  if (agenciasNecessarias.has(au.agencyId)) usuariosNecessarios.add(au.userId);
}

// ── Mapas de id legado → id novo (preenchidos ao longo das fases) ───────────

const mapUser = new Map<number, string>();
const mapAgency = new Map<number, string>();
const mapClient = new Map<number, string>();
const mapNomade = new Map<number, string>();
const mapProduct = new Map<number, { id: string; variationId?: string }>();
const mapProject = new Map<number, string>();
const mapProjectProduct = new Map<string, string>(); // `${projectId}:${productId}` → id

// ── Fase 1: usuários ────────────────────────────────────────────────────────

// userType do sistema antigo → (role, account_type) do modelo novo
const USER_TYPE: Record<number, { role: string; account_type: string }> = {
  1: { role: "admin", account_type: "admin" },
  2: { role: "company_admin", account_type: "empresas" },
  3: { role: "agency_admin", account_type: "agencias" },
  4: { role: "nomad", account_type: "nomades" },
  5: { role: "lider", account_type: "nomades" },
};

async function faseUsuarios() {
  const F = "1 usuários";
  const ativos = CAD.data.user.filter(
    (u: any) => clean(u.email) && (u.status === 1 || usuariosNecessarios.has(u.id)),
  );
  let seq = await proximoUserSeq();

  for (const u of ativos) {
    const email = String(u.email).trim().toLowerCase();
    const existentePorLegacy = await prisma.user.findFirst({ where: { legacy_id: u.id } });
    const existentePorEmail = await prisma.user.findUnique({ where: { email } });

    if (!existentePorLegacy && existentePorEmail) {
      // E-mail já usado por uma conta NATIVA da plataforma nova (ex.: as contas
      // de teste). Esta conta não é tocada de forma alguma — nem pra gravar
      // legacy_id.
      //
      // Gravar o legacy_id aqui parece inofensivo, mas não é: na execução
      // seguinte a conta passaria a ser encontrada pelo legacy_id, cairia no
      // caminho de atualização abaixo e teria senha e nome sobrescritos pelos
      // do sistema antigo — foi exatamente assim que o admin local perdeu o
      // acesso em 2026-08-02. O vínculo fica só em memória, pro resto da
      // importação conseguir referenciar o usuário.
      mapUser.set(u.id, existentePorEmail.id);
      st(F).pulados++;
      nota(F, `conta nativa preservada, não tocada: ${email} (legado #${u.id})`);
      continue;
    }

    const tipo = USER_TYPE[u.userType] ?? USER_TYPE[2];
    const nome = [clean(u.firstName), clean(u.lastName)].filter(Boolean).join(" ") || email;
    const dados = {
      email,
      name: nome,
      role: tipo.role,
      account_type: tipo.account_type,
      // Hash bcrypt do sistema antigo é preservado: a senha antiga continua
      // valendo. Não geramos senha nova nem forçamos reset.
      password_hash: String(u.password || ""),
      phone: clean(u.phone),
      // Usuário inativo no sistema antigo entra desativado — está aqui só
      // porque é dono de agência ou responsável por projeto ativo.
      is_active: u.status === 1,
      // last_login fica NULO de propósito: é o último acesso à plataforma
      // ANTIGA, e trazer essa data faz o login bater na pausa por inatividade
      // (>=90 dias, ver POST /api/auth/login) já na primeira tentativa —
      // pior, a flag reactivation_review_required é grudenta e só um Admin
      // limpa. Nulo = "nunca acessou esta plataforma", que é a verdade e é
      // explicitamente tratado como não-pausado.
      last_login: null,
      legacy_id: u.id,
    };

    if (existentePorLegacy) {
      // Credencial é create-only: reimportar NUNCA reescreve senha nem e-mail
      // de quem já está no banco (a pessoa pode já ter trocado a senha aqui).
      const { password_hash: _senha, email: _email, ...atualizaveis } = dados;
      if (APPLY) {
        await prisma.user.update({ where: { id: existentePorLegacy.id }, data: atualizaveis });
      }
      mapUser.set(u.id, existentePorLegacy.id);
      st(F).atualizados++;
    } else {
      const id = APPLY
        ? (await prisma.user.create({ data: { ...dados, user_code: `user_${seq++}` } })).id
        : `dry_user_${u.id}`;
      mapUser.set(u.id, id);
      st(F).criados++;
    }
  }
}

async function proximoUserSeq(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { user_code: { startsWith: "user_" } },
    select: { user_code: true },
  });
  let max = 0;
  for (const u of users) {
    const m = u.user_code?.match(/^user_(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// ── Fase 2: agências ────────────────────────────────────────────────────────

async function faseAgencias() {
  const F = "2 agências";
  const contas = new Map<number, any>(CAD.data.account.map((a: any) => [a.id, a]));
  const usuariosDaAgencia = new Map<number, number[]>();
  for (const au of CAD.data.agency_user) {
    const lista = usuariosDaAgencia.get(au.agencyId) ?? [];
    lista.push(au.userId);
    usuariosDaAgencia.set(au.agencyId, lista);
  }

  const estaAtiva = (a: any) =>
    a.status === 1 && contas.get(a.accountId)?.status === "ativo";
  const ativas = CAD.data.agency.filter(
    (a: any) => estaAtiva(a) || agenciasNecessarias.has(a.id),
  );
  let seq = (await prisma.agency.aggregate({ _max: { sequence_number: true } }))._max
    .sequence_number ?? 0;

  for (const a of ativas) {
    // Agência que já foi convertida em empresa (Sebrae/Brivia/Able — ver
    // migrar-agencias-para-empresas.ts) não pode ser recriada aqui: a
    // reimportação a traria de volta como Agency, duplicando a organização.
    const virouEmpresa = await prisma.company.findFirst({ where: { legacy_id: a.id } });
    if (virouEmpresa) {
      st(F).pulados++;
      nota(F, `${a.name} já foi convertida em empresa — mantida como está`);
      continue;
    }

    const existente = await prisma.agency.findFirst({ where: { legacy_id: a.id } });

    // Agency.owner_user_id é obrigatório: usa o primeiro usuário vinculado que
    // foi importado; se nenhum veio (usuário inativo), a agência é pulada e
    // registrada — criar dono sintético inventaria uma pessoa.
    const donoLegacy = (usuariosDaAgencia.get(a.id) ?? []).find((uid) => mapUser.has(uid));
    if (!donoLegacy && !existente) {
      st(F).pulados++;
      nota(F, `sem usuário ativo vinculado: ${a.name} (legacy ${a.id})`);
      continue;
    }
    const ownerId = donoLegacy ? mapUser.get(donoLegacy)! : existente!.owner_user_id;

    const cnpj = onlyDigits(a.fiscalNumber);
    const colisaoCnpj = cnpj
      ? await prisma.agency.findFirst({ where: { cnpj, NOT: { legacy_id: a.id } } })
      : null;

    const dados = {
      name: String(a.name || "").trim() || `Agência ${a.id}`,
      cnpj: colisaoCnpj ? null : cnpj,
      email: clean(a.responsibleEmail),
      phone: clean(a.phone),
      // Inativa quando entrou só por ser dona de projeto ativo.
      status: estaAtiva(a) ? "ativo" : "inativo",
      address: clean(a.addressStreet),
      legacy_id: a.id,
    };

    if (existente) {
      if (APPLY) await prisma.agency.update({ where: { id: existente.id }, data: dados });
      mapAgency.set(a.id, existente.id);
      st(F).atualizados++;
    } else {
      const id = APPLY
        ? (
            await prisma.agency.create({
              data: { ...dados, owner_user_id: ownerId!, sequence_number: ++seq },
            })
          ).id
        : `dry_agency_${a.id}`;
      mapAgency.set(a.id, id);
      st(F).criados++;
      // O dono passa a ser agency_admin da agência importada.
      if (APPLY && donoLegacy) {
        await prisma.user.update({
          where: { id: ownerId! },
          data: { agency_id: id, role: "agency_admin", account_type: "agencias" },
        });
      }
    }
  }
}

// ── Fase 3: clientes ────────────────────────────────────────────────────────

async function faseClientes() {
  const F = "3 clientes";
  const ativos = CAD.data.client.filter(
    (c: any) => c.status === 1 || clientesNecessarios.has(c.id),
  );
  const agenciasDoCliente = new Map<number, number[]>();
  for (const ca of CAD.data.client_agency) {
    const lista = agenciasDoCliente.get(ca.clientId) ?? [];
    lista.push(ca.agencyId);
    agenciasDoCliente.set(ca.clientId, lista);
  }

  for (const c of ativos) {
    const existente = await prisma.client.findFirst({ where: { legacy_id: c.id } });
    const doc = onlyDigits(c.fiscalNumber);
    const colisaoDoc = doc
      ? await prisma.client.findFirst({ where: { document: doc, NOT: { legacy_id: c.id } } })
      : null;

    const dados = {
      name: String(c.name || "").trim() || `Cliente ${c.id}`,
      type: c.clientType === 2 ? "pf" : "pj",
      document: colisaoDoc ? null : doc,
      email: clean(c.responsibleEmail),
      phone: clean(c.phone),
      status: c.status === 1 ? "active" : "inactive",
      address: clean(c.addressStreet),
      number: clean(c.addressNumber),
      neighborhood: clean(c.addressDistrict),
      city: clean(c.addressCity),
      state: clean(c.addressState),
      zip_code: clean(c.addressZipcode),
      legacy_id: c.id,
    };

    let id: string;
    if (existente) {
      if (APPLY) await prisma.client.update({ where: { id: existente.id }, data: dados });
      id = existente.id;
      st(F).atualizados++;
    } else {
      id = APPLY ? (await prisma.client.create({ data: dados })).id : `dry_client_${c.id}`;
      st(F).criados++;
    }
    mapClient.set(c.id, id);

    // ClientLink: o cliente antigo era atendido por uma ou mais agências.
    for (const agLegacy of agenciasDoCliente.get(c.id) ?? []) {
      const agencyId = mapAgency.get(agLegacy);
      if (!agencyId || !APPLY) continue;
      const jaExiste = await prisma.clientLink.findFirst({
        where: { client_id: id, agency_id: agencyId },
      });
      if (!jaExiste) {
        await prisma.clientLink.create({
          data: { client_id: id, agency_id: agencyId, status: "active" },
        });
      }
    }
  }
}

// ── Fase 4: nômades ─────────────────────────────────────────────────────────

// level numérico antigo (0–5, ver nomad_level_config) → faixa do modelo novo
const NIVEL_NOMADE = ["bronze", "bronze", "prata", "ouro", "diamante", "diamante"];

async function faseNomades() {
  const F = "4 nômades";
  const ativos = CAD.data.nomad.filter(
    (n: any) => clean(n.email) && (n.status === 1 || nomadesNecessarios.has(n.id)),
  );
  const usuarioDoNomade = new Map<number, number>(
    CAD.data.nomad_user.map((nu: any) => [nu.nomadId, nu.userId]),
  );
  const interessesPorNomade = new Map<number, string[]>();
  const categorias = new Map<number, string>(
    OPS.data.task_category.map((c: any) => [c.id, c.name]),
  );
  for (const i of CAD.data.nomad_task_category_interest ?? []) {
    const lista = interessesPorNomade.get(i.nomadId) ?? [];
    const nome = categorias.get(i.taskCategoryId);
    if (nome) lista.push(nome);
    interessesPorNomade.set(i.nomadId, lista);
  }

  for (const n of ativos) {
    const email = String(n.email).trim().toLowerCase();
    const existente = await prisma.nomade.findFirst({ where: { legacy_id: n.id } });
    const colisaoEmail = await prisma.nomade.findFirst({
      where: { email, NOT: { legacy_id: n.id } },
    });
    if (colisaoEmail && !existente) {
      st(F).pulados++;
      nota(F, `e-mail de nômade já existente: ${email}`);
      continue;
    }

    const cnpj = onlyDigits(n.fiscalNumber);
    const colisaoCnpj = cnpj
      ? await prisma.nomade.findFirst({ where: { cnpj, NOT: { legacy_id: n.id } } })
      : null;
    const userLegacy = usuarioDoNomade.get(n.id);
    const userId = userLegacy ? mapUser.get(userLegacy) : undefined;
    const userJaVinculado = userId
      ? await prisma.nomade.findFirst({ where: { user_id: userId, NOT: { legacy_id: n.id } } })
      : null;

    const dados = {
      name: String(n.name || "").trim() || email,
      email,
      whatsapp: clean(n.whatsapp) ?? clean(n.phone),
      cnpj: colisaoCnpj ? null : cnpj,
      level: NIVEL_NOMADE[Number(n.level) || 0] ?? "bronze",
      // Inativo quando entrou só por ter executado tarefa de projeto ativo.
      status: n.status === 1 ? "ativo" : "inativo",
      address: clean(n.address),
      areas_of_interest: JSON.stringify(interessesPorNomade.get(n.id) ?? []),
      terms_accepted: true,
      legacy_id: n.id,
    };

    // user_id fica FORA do update quando não temos um usuário para vincular:
    // gravar null aqui desfazia vínculos criados depois da importação (foi o
    // que aconteceu com os 235 usuários gerados por
    // preparar-primeiro-acesso.ts — os nômades voltaram a ficar sem login).
    const vinculo = userJaVinculado ? {} : userId ? { user_id: userId } : {};

    if (existente) {
      if (APPLY) await prisma.nomade.update({ where: { id: existente.id }, data: { ...dados, ...vinculo } });
      mapNomade.set(n.id, existente.id);
      st(F).atualizados++;
    } else {
      const id = APPLY ? (await prisma.nomade.create({ data: { ...dados, ...vinculo } })).id : `dry_nomade_${n.id}`;
      mapNomade.set(n.id, id);
      st(F).criados++;
    }
  }
}

// ── Fase 5: líderes ─────────────────────────────────────────────────────────

async function faseLideres() {
  const F = "5 líderes";
  const ativos = CAD.data.leader.filter((l: any) => l.status === 1 && clean(l.email));
  const usuarioDoLider = new Map<number, number>(
    CAD.data.leader_user.map((lu: any) => [lu.leaderId, lu.userId]),
  );
  const categorias = new Map<number, string>(
    OPS.data.task_category.map((c: any) => [c.id, c.name]),
  );

  for (const l of ativos) {
    const userLegacy = usuarioDoLider.get(l.id);
    const userId = userLegacy ? mapUser.get(userLegacy) : undefined;
    if (!userId) {
      st(F).pulados++;
      nota(F, `líder sem usuário ativo: ${l.name}`);
      continue;
    }
    const area = categorias.get(l.taskCategoryId) ?? "Geral";
    if (APPLY) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "lider", account_type: "nomades" },
      });
      const ja = await prisma.liderArea.findFirst({ where: { user_id: userId, area_nome: area } });
      if (!ja) {
        await prisma.liderArea.create({
          data: {
            user_id: userId,
            area_nome: area,
            categorias_permitidas: JSON.stringify([area]),
            ativo: true,
          },
        });
      }
    }
    st(F).criados++;
  }
}

// ── Fase 6: produtos legados ainda não catalogados ──────────────────────────

/** Resolve produto antigo → produto novo (consolidado) + variação. */
async function montarMapaDeProdutos() {
  const novos = await prisma.product.findMany({
    select: { id: true, metadata: true, legacy_id: true, variations: { select: { id: true } } },
  });
  for (const p of novos) {
    if (p.legacy_id != null) mapProduct.set(p.legacy_id, { id: p.id });
    let meta: any = {};
    try {
      meta = JSON.parse(p.metadata || "{}");
    } catch {
      /* ignora */
    }
    const ids: number[] = meta.legacyIds ?? [];
    const internos = meta.variationsInternal ?? {};
    ids.forEach((legacyId, i) => {
      // variationsInternal guarda legacyProductId por variação — casa a
      // variação certa quando o produto antigo virou uma faixa do novo.
      const entrada = Object.entries(internos).find(
        ([, v]: any) => v?.legacyProductId === legacyId,
      );
      mapProduct.set(legacyId, {
        id: p.id,
        variationId: entrada ? entrada[0] : p.variations[i]?.id,
      });
    });
  }
}

async function faseProdutosLegados(idsNecessarios: number[]) {
  const F = "6 produtos legados";
  const catalogo = new Map<number, any>(CAT.product.map((p: any) => [p.id, p]));
  const categorias = new Map<number, string>(
    CAT.product_category.map((c: any) => [c.id, c.name]),
  );

  for (const legacyId of idsNecessarios) {
    if (mapProduct.has(legacyId)) continue;
    const p = catalogo.get(legacyId);
    if (!p) {
      st(F).pulados++;
      nota(F, `produto ${legacyId} não existe nem no dump do catálogo`);
      continue;
    }
    const existente = await prisma.product.findFirst({ where: { legacy_id: legacyId } });
    const dados = {
      name: String(p.name || `Produto legado ${legacyId}`).trim(),
      description: htmlToText(p.description),
      short_description: htmlToText(p.descriptionSummary),
      category: categorias.get(p.productCategoryId) ?? "Legado",
      base_price: Number(p.price) || 0,
      completion_time: p.deliveryTimeHours ? `${p.deliveryTimeHours} dias` : null,
      // Entra INATIVO de propósito: é produto descontinuado no catálogo antigo,
      // só existe aqui pra que os projetos/tarefas que o referenciam não fiquem
      // órfãos. Não deve aparecer pra contratação.
      is_active: false,
      legacy_id: legacyId,
      metadata: JSON.stringify({
        _origem: "Produto da plataforma antiga fora do catálogo ativo, importado só para sustentar projetos/tarefas existentes.",
        _legacyNaoCatalogado: true,
        legacyIds: [legacyId],
        legacyCategory: categorias.get(p.productCategoryId) ?? null,
      }),
    };

    if (existente) {
      if (APPLY) await prisma.product.update({ where: { id: existente.id }, data: dados });
      mapProduct.set(legacyId, { id: existente.id });
      st(F).atualizados++;
    } else {
      const id = APPLY
        ? (await prisma.product.create({ data: dados })).id
        : `dry_product_${legacyId}`;
      mapProduct.set(legacyId, { id });
      st(F).criados++;
    }
  }
}

// ── Fase 7: projetos ────────────────────────────────────────────────────────

const projetosAtivos = projetosAtivosRaw;

async function faseProjetos() {
  const F = "7 projetos";
  let seq = await proximoProjectSeq();
  const precos = new Map<number, number>();
  for (const pp of OPS.data.project_product) {
    if (pp.status !== 1) continue;
    precos.set(
      pp.projectId,
      (precos.get(pp.projectId) ?? 0) + Number(pp.price || 0) * Number(pp.quantity || 1),
    );
  }

  for (const p of projetosAtivos()) {
    const existente = await prisma.project.findFirst({ where: { legacy_id: p.id } });
    const agencyId = mapAgency.get(p.agencyId);
    const criador = mapUser.get(p.accountableUserId);
    const valor = precos.get(p.id) ?? 0;

    const dados = {
      title: String(p.name || `Projeto ${p.id}`).trim(),
      description: htmlToText(p.description) || null,
      status: "in-progress",
      lifecycle: Number(p.frequencyInDays) > 0 ? "mensal" : "avulso",
      agency_id: agencyId ?? null,
      created_by_user_id: criador ?? null,
      value: valor,
      budget: valor,
      portfolio_permission: Boolean(p.allowsPortfolio),
      start_date: toDate(p.createdAt),
      legacy_id: p.id,
      legacy_client_id: p.clientId ?? null,
    };

    if (existente) {
      if (APPLY) await prisma.project.update({ where: { id: existente.id }, data: dados });
      mapProject.set(p.id, existente.id);
      st(F).atualizados++;
    } else {
      const id = APPLY
        ? (
            await prisma.project.create({
              data: { ...dados, project_code: formatProjectCode(seq++) },
            })
          ).id
        : `dry_project_${p.id}`;
      mapProject.set(p.id, id);
      st(F).criados++;
    }
    if (!agencyId) nota(F, `projeto ${p.id} sem agência ativa correspondente`);
  }

  if (APPLY) await ajustarSequencia("project", seq - 1);
}

async function proximoProjectSeq(): Promise<number> {
  const todos = await prisma.project.findMany({ select: { project_code: true } });
  let max = 0;
  for (const p of todos) {
    const m = p.project_code?.match(/^proj_0*(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Deixa a EntitySequence à frente do que a importação consumiu. */
async function ajustarSequencia(key: string, valor: number) {
  const atual = await prisma.entitySequence.findUnique({ where: { key } });
  if (!atual) {
    await prisma.entitySequence.create({ data: { key, current_value: valor } });
  } else if (atual.current_value < valor) {
    await prisma.entitySequence.update({ where: { key }, data: { current_value: valor } });
  }
}

// ── Fase 8: produtos dos projetos ───────────────────────────────────────────

const catalogoLegado = new Map<number, any>(CAT.product.map((p: any) => [p.id, p]));
const categoriasLegado = new Map<number, string>(
  CAT.product_category.map((c: any) => [c.id, c.name]),
);

/**
 * Garante o ProjectProduct de um par (projeto novo, produto antigo).
 * Usado pela fase 8 (linhas de project_product) e pela fase 9 — há tarefas
 * cujo produto já tinha sido removido do projeto (project_product.status = 3),
 * e sem esta linha a tarefa ficaria órfã, já que ProjectTask exige o vínculo.
 */
async function garantirProjectProduct(
  F: string,
  projectId: string,
  legacyProductId: number,
  origem: { price?: number; quantity?: number; frequency?: number; createdAt?: string } = {},
  ativo = true,
): Promise<string | null> {
  const alvo = mapProduct.get(legacyProductId);
  if (!alvo) return null;

  const jaMapeado = mapProjectProduct.get(`${projectId}:${alvo.id}`);
  if (jaMapeado) {
    mapProjectProduct.set(`${projectId}:legacy:${legacyProductId}`, jaMapeado);
    return jaMapeado;
  }

  const legado = catalogoLegado.get(legacyProductId);
  const preco = Number(origem.price ?? legado?.price ?? 0);
  const dados = {
    variation_id: alvo.variationId ?? null,
    product_name_snapshot: String(legado?.name ?? `Produto ${legacyProductId}`),
    product_category_snapshot: categoriasLegado.get(legado?.productCategoryId) ?? "Legado",
    product_price_snapshot: preco,
    preco_final_cliente_snapshot: preco * Number(origem.quantity ?? 1),
    recurrence_snapshot: Number(origem.frequency ?? 0) > 0 ? "mensal" : "avulso",
    // ENCERRADO = produto que já não estava mais ativo no projeto antigo, mas
    // cujas tarefas existem e precisam de vínculo.
    status: ativo ? "ATIVO" : "ENCERRADO",
    start_date: toDate(origem.createdAt),
  };

  const existente = await prisma.projectProduct.findFirst({
    where: { project_id: projectId, product_id: alvo.id },
  });

  let id: string;
  if (existente) {
    if (APPLY) await prisma.projectProduct.update({ where: { id: existente.id }, data: dados });
    id = existente.id;
    st(F).atualizados++;
  } else {
    id = APPLY
      ? (
          await prisma.projectProduct.create({
            data: { ...dados, project_id: projectId, product_id: alvo.id },
          })
        ).id
      : `dry_pp_${projectId}_${legacyProductId}`;
    st(F).criados++;
  }

  mapProjectProduct.set(`${projectId}:${alvo.id}`, id);
  mapProjectProduct.set(`${projectId}:legacy:${legacyProductId}`, id);
  return id;
}

async function faseProdutosDoProjeto() {
  const F = "8 produtos do projeto";
  const idsAtivos = new Set(projetosAtivos().map((p: any) => p.id));

  const linhas = OPS.data.project_product.filter(
    (pp: any) => idsAtivos.has(pp.projectId) && pp.status === 1,
  );

  for (const pp of linhas) {
    const projectId = mapProject.get(pp.projectId);
    if (!projectId) {
      st(F).pulados++;
      continue;
    }
    const alvo = mapProduct.get(pp.productId);
    if (alvo && mapProjectProduct.has(`${projectId}:${alvo.id}`)) {
      // Dois produtos antigos do mesmo projeto viraram o MESMO produto novo
      // (eram variações). O @@unique([project_id, product_id]) não permite
      // duplicar — mantém o primeiro e registra o vínculo do segundo.
      mapProjectProduct.set(
        `${projectId}:legacy:${pp.productId}`,
        mapProjectProduct.get(`${projectId}:${alvo.id}`)!,
      );
      st(F).pulados++;
      nota(F, `projeto ${pp.projectId}: produtos antigos consolidados no mesmo novo`);
      continue;
    }
    const id = await garantirProjectProduct(F, projectId, pp.productId, pp, true);
    if (!id) st(F).pulados++;
  }
}

// ── Fase 9: tarefas ─────────────────────────────────────────────────────────

// status antigo (task_status) → status do ProjectTask novo
const STATUS_TAREFA: Record<number, string> = {
  1: "PARA_LANCAMENTO", // LANÇAMENTO
  2: "LIBERADA_PARA_EXECUCAO", // ENVIADA PARA EXECUÇÃO
  3: "AGUARDANDO_NOMADE", // DEVOLVIDA
  4: "CANCELADA",
  5: "EM_EXECUCAO",
  6: "EM_APROVACAO", // APROVAÇÃO PENDENTE - AGÊNCIA
  7: "EM_APROVACAO", // APROVAÇÃO PENDENTE - CLIENTE
  8: "EM_REVISAO", // APROVADA (aguardando arquivos finais)
  9: "CONCLUIDA",
  10: "CANCELADA", // EXPIRADA
  11: "EM_EXECUCAO", // REPROVADA (volta pro executor)
  12: "PARA_LANCAMENTO", // RASCUNHO
  13: "EM_APROVACAO",
  14: "CONCLUIDA", // APROVAÇÃO AUTOMÁTICA
  15: "AGUARDANDO_INFORMACOES", // ALTERAÇÃO SOLICITADA
  16: "AGUARDANDO_INFORMACOES", // PAUSADA
};

// status de etapa antigo → status do ProjectTaskStage novo
const STATUS_ETAPA: Record<number, string> = {
  1: "PENDENTE", // AGUARDANDO ETAPA
  2: "PENDENTE", // ENVIADA PARA EXECUÇÃO
  3: "EM_ANDAMENTO",
  4: "EM_ANDAMENTO", // APROVAÇÃO PENDENTE - AGÊNCIA
  5: "EM_ANDAMENTO", // APROVAÇÃO PENDENTE - CLIENTE
  6: "EM_ANDAMENTO", // REPROVADA
  7: "CONCLUIDA", // APROVADA
  8: "CONCLUIDA",
  9: "BLOQUEADA", // EXPIRADA
  10: "CONCLUIDA", // APROVAÇÃO AUTOMÁTICA
  11: "BLOQUEADA", // CANCELADA
  12: "BLOQUEADA", // PAUSADA
};

const NAO_LANCADAS = new Set([1, 12]); // LANÇAMENTO, RASCUNHO

async function faseTarefas() {
  const F = "9 tarefas";
  const idsAtivos = new Set(projetosAtivos().map((p: any) => p.id));
  const etapasPorTarefa = new Map<number, any[]>();
  for (const e of OPS.data.task_stage) {
    const lista = etapasPorTarefa.get(e.taskId) ?? [];
    lista.push(e);
    etapasPorTarefa.set(e.taskId, lista);
  }

  // A tarefa antiga guarda o taskTemplateId que a originou — com os modelos já
  // importados (import-legacy-task-catalog), dá pra ligar cada tarefa ao seu
  // CatalogTask exato, em vez de inferir pelo produto.
  const modelos = await prisma.catalogTask.findMany({
    where: { legacy_id: { not: null } },
    select: { id: true, legacy_id: true, is_active: true, briefing_questions: true, steps: true },
  });
  const modeloPorLegacy = new Map(modelos.map((m) => [m.legacy_id!, m]));

  // Fallback: modelo único do produto, pra tarefa antiga sem template.
  const vinculos = await prisma.productCatalogTask.findMany({
    where: { catalog_task: { is_active: true } },
    select: { product_id: true, catalog_task_id: true },
  });
  const catalogPorProduto = new Map<string, string[]>();
  for (const v of vinculos) {
    const lista = catalogPorProduto.get(v.product_id) ?? [];
    lista.push(v.catalog_task_id);
    catalogPorProduto.set(v.product_id, lista);
  }

  let tarefas = OPS.data.task.filter((t: any) => idsAtivos.has(t.projectId));
  if (!INCLUIR_EXPIRADAS) {
    tarefas = tarefas.filter((t: any) => t.taskStatusId !== 10);
  }

  let seq = await proximoTaskSeq();
  let adaptadas = 0;

  for (const t of tarefas) {
    const projectId = mapProject.get(t.projectId);
    const alvo = t.productId != null ? mapProduct.get(t.productId) : undefined;
    if (!projectId || !alvo) {
      st(F).pulados++;
      nota(F, `tarefa ${t.id} sem projeto/produto resolvível (produto ${t.productId})`);
      continue;
    }

    // A tarefa pode referenciar um produto que já saiu do projeto — nesse caso
    // o vínculo é criado agora, como ENCERRADO, pra tarefa não ficar órfã.
    const projectProductId =
      mapProjectProduct.get(`${projectId}:legacy:${t.productId}`) ??
      // Credita na fase 8 de propósito: o que está sendo criado é vínculo de
      // produto, não tarefa — senão a contagem da fase 9 mistura os dois.
      (await garantirProjectProduct("8 produtos do projeto", projectId, t.productId, {}, false));
    if (!projectProductId) {
      st(F).pulados++;
      continue;
    }

    const naoLancada = NAO_LANCADAS.has(t.taskStatusId);
    const catalogIds = catalogPorProduto.get(alvo.id) ?? [];
    // Modelo exato pelo template de origem; se a tarefa antiga não tinha
    // template, cai no modelo único do produto (quando houver só um).
    const modelo =
      (t.taskTemplateId ? modeloPorLegacy.get(t.taskTemplateId) : undefined) ??
      (catalogIds.length === 1
        ? modelos.find((m) => m.id === catalogIds[0])
        : undefined);

    // Adaptar = a tarefa passa a ser conduzida pelo motor novo. Só vale para a
    // que ainda NÃO foi lançada e tem modelo ATIVO: tarefa já lançada foi
    // executada no fluxo antigo e continua marcada como modelo antigo, mesmo
    // tendo modelo vinculado (o vínculo serve de rastreio).
    const podeAdaptar = naoLancada && Boolean(modelo?.is_active);
    if (podeAdaptar) adaptadas++;

    const existente = await prisma.projectTask.findFirst({ where: { legacy_id: t.id } });
    const etapas = etapasPorTarefa.get(t.id) ?? [];

    const dados = {
      title: String(t.name || `Tarefa ${t.id}`).trim(),
      description: htmlToText(t.description) || null,
      status: STATUS_TAREFA[t.taskStatusId] ?? "PARA_LANCAMENTO",
      name_snapshot: String(t.name || `Tarefa ${t.id}`).trim(),
      // Vínculo com o modelo sempre que existir — inclusive nas tarefas que
      // continuam no modelo antigo, onde serve de rastreio.
      catalog_task_id: modelo?.id ?? null,
      // A tarefa adaptada precisa dos snapshots do modelo pra ser lançada pelo
      // fluxo novo (o drawer de lançamento lê o briefing daqui).
      briefing_snapshot: podeAdaptar ? modelo?.briefing_questions ?? null : null,
      nomade_responsavel_id: t.nomadId ? (mapNomade.get(t.nomadId) ?? null) : null,
      due_date: toDate(t.deadline),
      start_date: toDate(t.executionDeadline),
      completed_at: t.taskStatusId === 9 ? toDate(t.modifiedAt) : null,
      // O prazo de lançamento antigo (`startDeadline`) está todo no passado — o
      // dump é de 23/04. Trazê-lo faria a tarefa ser CANCELADA automaticamente
      // na primeira tentativa de lançar (ver PATCH /:id/launch), que foi o que
      // aconteceu no teste ponta a ponta. Tarefa ainda por lançar ganha janela
      // nova a partir da importação; o resto não usa este campo.
      lancamento_expires_at: naoLancada
        ? new Date(Date.now() + 30 * 86400000)
        : toDate(t.startDeadline),
      // Tarefa lançada no sistema antigo, ou não adaptável ao produto novo:
      // fica marcada para a UI sinalizar e o motor novo não assumir nada.
      legacy_model: !podeAdaptar,
      observations: t.executionInstructions ? htmlToText(t.executionInstructions) : null,
      steps_snapshot: etapas.length
        ? JSON.stringify(
            etapas
              .sort((a, b) => a.number - b.number)
              .map((e) => ({
                number: e.number,
                name: e.name,
                legacyStageId: e.id,
                keepNomadOnNextStage: Boolean(e.keepNomadOnNextStage),
                executionDeadline: e.executionDeadline,
                approvalDeadline: e.approvalDeadline,
                legacyStatusId: e.taskStageStatusId,
                legacyDelegationStatusId: e.taskDelegationStatusId,
              })),
          )
        : null,
      legacy_id: t.id,
    };

    let id: string;
    if (existente) {
      if (APPLY) await prisma.projectTask.update({ where: { id: existente.id }, data: dados });
      id = existente.id;
      st(F).atualizados++;
    } else {
      id = APPLY
        ? (
            await prisma.projectTask.create({
              data: {
                ...dados,
                project_id: projectId,
                project_product_id: projectProductId,
                product_id: alvo.id,
                task_code: formatTaskCode(seq++),
              },
            })
          ).id
        : `dry_task_${t.id}`;
      st(F).criados++;
    }

    // Etapas: preserva a estrutura do motor antigo como ProjectTaskStage.
    if (APPLY && etapas.length) {
      for (const e of etapas.sort((a, b) => a.number - b.number)) {
        const sourceKey = `legacy:stage:${e.id}`;
        const ja = await prisma.projectTaskStage.findFirst({
          where: { project_task_id: id, source_key: sourceKey },
        });
        const dadosEtapa = {
          titulo: String(e.name || `Etapa ${e.number}`).trim(),
          ordem: Number(e.number) || 0,
          status: STATUS_ETAPA[e.taskStageStatusId] ?? "PENDENTE",
          obrigatoria: true,
          depende_da_etapa_anterior: true,
        };
        if (ja) {
          await prisma.projectTaskStage.update({ where: { id: ja.id }, data: dadosEtapa });
        } else {
          await prisma.projectTaskStage.create({
            data: { ...dadosEtapa, project_task_id: id, source_key: sourceKey },
          });
        }
      }
    }
  }

  if (APPLY) await ajustarSequencia("project_task", seq - 1);
  nota(F, `adaptadas ao modelo novo: ${adaptadas} · marcadas como modelo antigo: ${st(F).criados + st(F).atualizados - adaptadas}`);
}

async function proximoTaskSeq(): Promise<number> {
  const todas = await prisma.projectTask.findMany({ select: { task_code: true } });
  let max = 0;
  for (const t of todas) {
    const m = t.task_code?.match(/^T0*(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// ── Execução ────────────────────────────────────────────────────────────────

/**
 * Recarrega do banco os vínculos legado → novo já existentes.
 *
 * Sem isso, rodar uma fase isolada (--fase=9) não enxergaria o que as fases
 * anteriores criaram em execuções passadas — elas montavam os mapas só em
 * memória — e tudo seria pulado por "sem projeto/produto resolvível".
 */
async function hidratarMapas() {
  const [usuarios, agencias, clientes, nomades, projetos] = await Promise.all([
    prisma.user.findMany({ where: { legacy_id: { not: null } }, select: { id: true, legacy_id: true } }),
    prisma.agency.findMany({ where: { legacy_id: { not: null } }, select: { id: true, legacy_id: true } }),
    prisma.client.findMany({ where: { legacy_id: { not: null } }, select: { id: true, legacy_id: true } }),
    prisma.nomade.findMany({ where: { legacy_id: { not: null } }, select: { id: true, legacy_id: true } }),
    prisma.project.findMany({ where: { legacy_id: { not: null } }, select: { id: true, legacy_id: true } }),
  ]);
  usuarios.forEach((u) => mapUser.set(u.legacy_id!, u.id));
  agencias.forEach((a) => mapAgency.set(a.legacy_id!, a.id));
  clientes.forEach((c) => mapClient.set(c.legacy_id!, c.id));
  nomades.forEach((n) => mapNomade.set(n.legacy_id!, n.id));
  projetos.forEach((p) => mapProject.set(p.legacy_id!, p.id));

  // ProjectProduct não tem legacy_id (a tabela antiga usa chave composta), então
  // o índice é reconstruído pelo par projeto+produto, incluindo a chave pelo id
  // do produto ANTIGO, que é como a tarefa referencia.
  const vinculos = await prisma.projectProduct.findMany({
    select: { id: true, project_id: true, product_id: true },
  });
  const legadosDoProduto = new Map<string, number[]>();
  const produtos = await prisma.product.findMany({
    select: { id: true, legacy_id: true, metadata: true },
  });
  for (const p of produtos) {
    const ids: number[] = [];
    if (p.legacy_id != null) ids.push(p.legacy_id);
    try {
      for (const l of JSON.parse(p.metadata || "{}").legacyIds ?? []) ids.push(l);
    } catch {
      /* ignora */
    }
    legadosDoProduto.set(p.id, [...new Set(ids)]);
  }
  for (const v of vinculos) {
    mapProjectProduct.set(`${v.project_id}:${v.product_id}`, v.id);
    for (const legacyProductId of legadosDoProduto.get(v.product_id) ?? []) {
      mapProjectProduct.set(`${v.project_id}:legacy:${legacyProductId}`, v.id);
    }
  }
}

async function main() {
  console.log(
    `▶ Importação da plataforma antiga — ${APPLY ? "APPLY" : "DRY-RUN"}` +
      `${FASE ? ` (só fase ${FASE})` : ""}${INCLUIR_EXPIRADAS ? " +expiradas" : ""}\n`,
  );

  await hidratarMapas();

  if (rodar(1)) await faseUsuarios();
  if (rodar(2)) await faseAgencias();
  if (rodar(3)) await faseClientes();
  if (rodar(4)) await faseNomades();
  if (rodar(5)) await faseLideres();

  await montarMapaDeProdutos();
  const idsAtivos = new Set(projetosAtivos().map((p: any) => p.id));
  const produtosNecessarios = [
    ...new Set<number>(
      OPS.data.project_product
        .filter((pp: any) => idsAtivos.has(pp.projectId) && pp.status === 1)
        .map((pp: any) => pp.productId as number)
        .concat(
          OPS.data.task
            .filter((t: any) => idsAtivos.has(t.projectId))
            .map((t: any) => t.productId as number),
        ),
    ),
  ].filter((id) => id != null);

  if (rodar(6)) await faseProdutosLegados(produtosNecessarios);
  if (rodar(7)) await faseProjetos();
  if (rodar(8)) await faseProdutosDoProjeto();
  if (rodar(9)) await faseTarefas();

  console.log("\n┌─ Resultado ─────────────────────────────────────────────");
  for (const [fase, s] of Object.entries(stats)) {
    console.log(
      `│ ${fase.padEnd(24)} criados ${String(s.criados).padStart(5)} · atualizados ${String(s.atualizados).padStart(5)} · pulados ${String(s.pulados).padStart(5)}`,
    );
    for (const n of s.notas) console.log(`│    ↳ ${n}`);
  }
  console.log("└─────────────────────────────────────────────────────────");
  if (!APPLY) console.log("\n(dry-run — nada foi escrito. Rode com --apply.)");
}

main()
  .catch((e) => {
    console.error("❌ Erro na importação:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

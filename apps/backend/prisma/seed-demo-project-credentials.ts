/**
 * seed-demo-project-credentials.ts
 * Cria credenciais de demo para todos os projetos seed.
 *
 * IDEMPOTENTE: usa @@unique([project_id, title]) via upsert.
 * NÃO usa senha real — todas as senhas contêm "DEMO".
 * NÃO usa URLs reais — todas as URLs terminam em .test
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-project-credentials -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-project-credentials
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Hash determinístico ────────────────────────────────────────────────────────
function dh(idx: number, seed: number = 1): number {
  return ((idx * 2654435761 + seed * 40503) >>> 0);
}
function pick<T>(arr: T[], idx: number, seed: number = 1): T {
  return arr[dh(idx, seed) % arr.length];
}
function inRange(idx: number, min: number, max: number, seed: number = 1): number {
  if (min >= max) return min;
  return min + (dh(idx, seed) % (max - min + 1));
}

// ── Pools de dados ────────────────────────────────────────────────────────────
const NOMAD_IDS = [
  "nomade-test-001",
  "nomade-test-002",
  "nomade-test-003",
  "nomade-test-004",
];

interface CredDef {
  title: string;
  service: string;
  url: string;
  username: string;
  password_demo: string;
  notes: string;
  category: string;
}

const CRED_POOL: CredDef[] = [
  // CMS
  {
    title: "WordPress Admin",
    service: "WordPress",
    url: "https://cms.cliente.test/wp-admin",
    username: "admin_demo",
    password_demo: "DEMO-CMS-001!",
    notes: "Acesso ao painel principal do CMS.",
    category: "cms",
  },
  {
    title: "Webflow Editor",
    service: "Webflow",
    url: "https://webflow.test/dashboard",
    username: "editor@cliente.test",
    password_demo: "DEMO-CMS-002!",
    notes: "Conta de editor do Webflow.",
    category: "cms",
  },
  // HOSTING
  {
    title: "cPanel Hospedagem",
    service: "cPanel",
    url: "https://cpanel.host.test:2083",
    username: "clientehost",
    password_demo: "DEMO-HOST-001!",
    notes: "Painel de controle de hospedagem compartilhada.",
    category: "hosting",
  },
  {
    title: "FTP Servidor",
    service: "FTP",
    url: "ftp://ftp.cliente.test",
    username: "ftp_user",
    password_demo: "DEMO-HOST-002!",
    notes: "Acesso FTP para upload de arquivos.",
    category: "hosting",
  },
  {
    title: "VPS SSH Root",
    service: "SSH",
    url: "ssh://vps.cliente.test:22",
    username: "root",
    password_demo: "DEMO-HOST-003!",
    notes: "Acesso root ao servidor VPS. Usar com cuidado.",
    category: "hosting",
  },
  // EMAIL
  {
    title: "Google Workspace Admin",
    service: "Google Workspace",
    url: "https://admin.google.test",
    username: "admin@cliente.test",
    password_demo: "DEMO-EMAIL-001!",
    notes: "Conta super admin do Google Workspace.",
    category: "email",
  },
  {
    title: "SMTP Relay",
    service: "SendGrid",
    url: "https://sendgrid.test/login",
    username: "apikey",
    password_demo: "DEMO-EMAIL-002!",
    notes: "API key de envio transacional. Não compartilhar.",
    category: "email",
  },
  // SOCIAL
  {
    title: "Meta Business Suite",
    service: "Meta",
    url: "https://business.meta.test",
    username: "social@cliente.test",
    password_demo: "DEMO-SOCIAL-001!",
    notes: "Acesso à conta de negócios do Meta.",
    category: "social",
  },
  {
    title: "Instagram Creator",
    service: "Instagram",
    url: "https://instagram.test",
    username: "@clientedemo",
    password_demo: "DEMO-SOCIAL-002!",
    notes: "Conta creator do Instagram para publicação.",
    category: "social",
  },
  {
    title: "LinkedIn Company Page",
    service: "LinkedIn",
    url: "https://linkedin.test/company/cliente",
    username: "admin@cliente.test",
    password_demo: "DEMO-SOCIAL-003!",
    notes: "Acesso de administrador à página da empresa.",
    category: "social",
  },
  // ANALYTICS
  {
    title: "Google Analytics 4",
    service: "Google Analytics",
    url: "https://analytics.google.test",
    username: "analytics@cliente.test",
    password_demo: "DEMO-ANALYTICS-001!",
    notes: "Propriedade GA4 do site principal.",
    category: "analytics",
  },
  {
    title: "Google Search Console",
    service: "Google Search Console",
    url: "https://search.google.test/console",
    username: "seo@cliente.test",
    password_demo: "DEMO-ANALYTICS-002!",
    notes: "Monitoramento de indexação e performance de busca.",
    category: "analytics",
  },
  {
    title: "Hotjar",
    service: "Hotjar",
    url: "https://hotjar.test",
    username: "ux@cliente.test",
    password_demo: "DEMO-ANALYTICS-003!",
    notes: "Heatmaps e gravações de sessão.",
    category: "analytics",
  },
  // ADS
  {
    title: "Google Ads",
    service: "Google Ads",
    url: "https://ads.google.test",
    username: "ads@cliente.test",
    password_demo: "DEMO-ADS-001!",
    notes: "Conta de anúncios Google. MCC vinculado.",
    category: "ads",
  },
  {
    title: "Meta Ads Manager",
    service: "Meta Ads",
    url: "https://adsmanager.meta.test",
    username: "ads@cliente.test",
    password_demo: "DEMO-ADS-002!",
    notes: "Gerenciador de anúncios Facebook/Instagram.",
    category: "ads",
  },
  {
    title: "TikTok Ads",
    service: "TikTok for Business",
    url: "https://ads.tiktok.test",
    username: "tiktok@cliente.test",
    password_demo: "DEMO-ADS-003!",
    notes: "Conta de anúncios TikTok Business.",
    category: "ads",
  },
  // API / INTEGRATIONS
  {
    title: "API Key Integração Principal",
    service: "API Interna",
    url: "https://api.cliente.test",
    username: "api_key",
    password_demo: "DEMO-API-001!",
    notes: "Chave de API para integração com sistema interno.",
    category: "api",
  },
  {
    title: "Webhook Secret",
    service: "Webhooks",
    url: "https://hooks.cliente.test",
    username: "webhook",
    password_demo: "DEMO-API-002!",
    notes: "Secret para validação de webhooks recebidos.",
    category: "api",
  },
  // CRM
  {
    title: "HubSpot CRM",
    service: "HubSpot",
    url: "https://app.hubspot.test",
    username: "crm@cliente.test",
    password_demo: "DEMO-CRM-001!",
    notes: "Conta HubSpot para gestão de leads.",
    category: "crm",
  },
  {
    title: "RD Station",
    service: "RD Station",
    url: "https://rdstation.test",
    username: "marketing@cliente.test",
    password_demo: "DEMO-CRM-002!",
    notes: "Automação de marketing e CRM.",
    category: "crm",
  },
  // OTHER
  {
    title: "Namecheap DNS",
    service: "Namecheap",
    url: "https://namecheap.test",
    username: "domain_admin",
    password_demo: "DEMO-OTHER-001!",
    notes: "Gestão de domínios e DNS.",
    category: "other",
  },
  {
    title: "Cloudflare CDN",
    service: "Cloudflare",
    url: "https://dash.cloudflare.test",
    username: "devops@cliente.test",
    password_demo: "DEMO-OTHER-002!",
    notes: "Painel Cloudflare para CDN, DNS e segurança.",
    category: "other",
  },
];

// ── Contagem de credenciais por status ───────────────────────────────────────
function credCountForStatus(status: string, projIdx: number): number {
  switch (status) {
    case "draft":         return inRange(projIdx, 0, 1, 10);
    case "negotiation":   return inRange(projIdx, 0, 1, 11);
    case "awaiting-payment": return inRange(projIdx, 1, 2, 12);
    case "planning":      return inRange(projIdx, 2, 3, 13);
    case "in-progress":   return inRange(projIdx, 3, 5, 14);
    case "paused":        return inRange(projIdx, 2, 4, 15);
    case "completed":     return inRange(projIdx, 2, 4, 16);
    default:              return 1;
  }
}

// ── Status da credencial por projeto status e índice da cred ─────────────────
function credStatus(
  projStatus: string,
  credIdx: number,
  projIdx: number,
): { status: string; requires_rotation: boolean; rotation_reason?: string } {
  const seed = projIdx * 100 + credIdx;

  if (projStatus === "completed") {
    // Completed: alternância entre archived e rotation_required
    if (dh(seed, 20) % 2 === 0) {
      return {
        status: "archived",
        requires_rotation: true,
        rotation_reason: "Projeto concluído — credenciais devem ser rotacionadas.",
      };
    }
    return {
      status: "rotation_required",
      requires_rotation: true,
      rotation_reason: "Projeto encerrado. Trocar senhas por segurança.",
    };
  }

  if (projStatus === "paused") {
    if (dh(seed, 21) % 3 === 0) {
      return {
        status: "rotation_required",
        requires_rotation: true,
        rotation_reason: "Projeto pausado há mais de 30 dias.",
      };
    }
    return { status: "active", requires_rotation: false };
  }

  if (projStatus === "in-progress") {
    // Maioria ativa, alguns em rotation_required
    if (dh(seed, 22) % 5 === 0) {
      return {
        status: "rotation_required",
        requires_rotation: true,
        rotation_reason: "Senha próxima do vencimento.",
      };
    }
    return { status: "active", requires_rotation: false };
  }

  return { status: "active", requires_rotation: false };
}

// ── Compartilhamento com nômade (somente in-progress) ────────────────────────
function sharedNomad(
  projStatus: string,
  credIdx: number,
  projIdx: number,
): string | null {
  if (projStatus !== "in-progress") return null;
  const seed = projIdx * 100 + credIdx;
  // ~1 em cada 3 credenciais de in-progress fica shared
  if (dh(seed, 30) % 3 !== 0) return null;
  return pick(NOMAD_IDS, seed, 31);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔐 Seed Demo Project Credentials — ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      status: true,
      project_tasks: { select: { id: true }, take: 2, orderBy: { created_at: "asc" } },
      products: { select: { id: true }, take: 2, orderBy: { created_at: "asc" } },
    },
    orderBy: { created_at: "asc" },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let projIdx = 0; projIdx < projects.length; projIdx++) {
    const proj = projects[projIdx];
    const count = credCountForStatus(proj.status, projIdx);

    if (count === 0) {
      skipped++;
      continue;
    }

    const firstTask = proj.project_tasks[0]?.id ?? null;
    const secondTask = proj.project_tasks[1]?.id ?? null;
    const firstProduct = proj.products[0]?.id ?? null;
    const secondProduct = proj.products[1]?.id ?? null;

    for (let credIdx = 0; credIdx < count; credIdx++) {
      const poolIdx = dh(projIdx * 10 + credIdx, 40) % CRED_POOL.length;
      const tpl = CRED_POOL[poolIdx];

      const { status, requires_rotation, rotation_reason } = credStatus(proj.status, credIdx, projIdx);
      const nomadId = sharedNomad(proj.status, credIdx, projIdx);
      const isShared = nomadId !== null;
      const finalStatus = isShared ? "shared" : status;

      // Shared until: 30 dias a partir de hoje (apenas se shared)
      const sharedUntil = isShared ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

      // Expiração: ~30% das credenciais têm data de expiração
      const hasExpiry = dh(projIdx * 10 + credIdx, 50) % 3 === 0;
      const expiresAt = hasExpiry
        ? new Date(Date.now() + inRange(projIdx * 10 + credIdx, 15, 90, 51) * 24 * 60 * 60 * 1000)
        : null;

      // Link task/product para ~30% das credenciais
      const linkSeed = dh(projIdx * 10 + credIdx, 60);
      const linkTask = linkSeed % 4 === 0 ? firstTask : linkSeed % 4 === 1 ? secondTask : null;
      const linkProduct = linkSeed % 5 === 0 ? firstProduct : linkSeed % 5 === 1 ? secondProduct : null;

      // Personalizar título com sufixo se pool colidir (mesmo título no mesmo projeto)
      const title = count > 1 && credIdx > 0
        ? `${tpl.title}${credIdx > 1 ? ` (${credIdx + 1})` : ""}`
        : tpl.title;

      const data = {
        service: tpl.service,
        url: tpl.url,
        username: tpl.username,
        password_demo: tpl.password_demo,
        notes: tpl.notes,
        category: tpl.category,
        status: finalStatus,
        is_demo: true,
        requires_rotation,
        rotation_reason: rotation_reason ?? null,
        expires_at: expiresAt,
        shared_until: sharedUntil,
        shared_with_nomad_id: nomadId,
        shared_with_user_id: null,
        project_task_id: linkTask,
        project_product_id: linkProduct,
        created_by: "seed",
      };

      if (DRY_RUN) {
        console.log(
          `  [DRY] ${proj.id} | "${title}" | ${tpl.category} | ${finalStatus}${nomadId ? ` → nomad:${nomadId}` : ""}`,
        );
        created++;
        continue;
      }

      const result = await prisma.projectCredential.upsert({
        where: { project_id_title: { project_id: proj.id, title } },
        create: { project_id: proj.id, title, ...data },
        update: data,
      });

      const wasCreated = result.created_at.getTime() === result.updated_at.getTime();
      if (wasCreated) {
        created++;
        console.log(`  ✓ criado  ${proj.id} | "${title}" | ${tpl.category} | ${finalStatus}`);
      } else {
        updated++;
        console.log(`  ↺ updated ${proj.id} | "${title}" | ${tpl.category} | ${finalStatus}`);
      }
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   Projetos processados : ${projects.length}`);
  console.log(`   Credenciais criadas  : ${created}`);
  console.log(`   Credenciais atualizadas: ${updated}`);
  console.log(`   Projetos sem cred    : ${skipped}`);
  if (DRY_RUN) console.log("\n   ⚠️  DRY RUN — nenhuma alteração feita.");
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

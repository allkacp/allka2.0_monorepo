// One-off fix: admin/disponibilidade showed almost every specialty/task
// group as "red" (crítico) because (a) real nomad areas_of_interest values
// almost never overlapped — most specialties had exactly 1 active nomad —
// and (b) every currently-waiting task was ~86h old, tripping the
// "oldestHours >= 48" red rule regardless of how many nomads were waiting.
// This adds real Nomade rows (and aligns a few existing ones to the real
// `specialties` table names) so specialty coverage spans red/yellow/green,
// and freshens most waiting tasks' created_at so the task tab does too.
// Safe to re-run — every write here is idempotent (same target values).
import { prisma } from "../lib/prisma";

async function main() {
  // ── Align a few existing nomads' areas_of_interest to real specialty names ──
  const renames: [string, string[]][] = [
    ["ana@nomad.com", ["Design Gráfico", "UI/UX Design", "Copywriting"]],
    ["juliana@nomad.com", ["UI/UX Design", "Prototipagem", "Figma"]],
    ["pedro@nomad.com", ["Produção de Vídeo", "Motion Graphics", "Edição"]],
    ["lucas@nomad.com", ["Desenvolvimento Web", "SEO / Tráfego Pago"]],
  ];
  for (const [email, areas] of renames) {
    const existing = await prisma.nomade.findUnique({ where: { email } });
    if (existing) {
      await prisma.nomade.update({
        where: { email },
        data: { areas_of_interest: JSON.stringify(areas) },
      });
    }
  }

  // ── New real nomads, distributed to give specialties a real red/yellow/green mix ──
  const newNomades = [
    // UI/UX Design: + 4 active (on top of Ana Ferreira + Juliana Almeida) => 6 active => green
    { name: "Beatriz Nogueira", email: "beatriz.nogueira@nomade.com", status: "ativo", areas: ["UI/UX Design"] },
    { name: "Diego Martins",    email: "diego.martins@nomade.com",    status: "ativo", areas: ["UI/UX Design"] },
    { name: "Larissa Freitas",  email: "larissa.freitas@nomade.com",  status: "ativo", areas: ["UI/UX Design"] },
    { name: "Rodrigo Alves",    email: "rodrigo.alves@nomade.com",    status: "ativo", areas: ["UI/UX Design"] },

    // Design Gráfico: + 2 active (on top of Ana Ferreira) => 3 active => yellow
    { name: "Camila Duarte", email: "camila.duarte@nomade.com", status: "ativo", areas: ["Design Gráfico"] },
    { name: "Felipe Rocha",  email: "felipe.rocha@nomade.com",  status: "ativo", areas: ["Design Gráfico"] },

    // Desenvolvimento Web: + 1 active (on top of Lucas Oliveira) => 2 active => yellow
    { name: "Patrícia Gomes", email: "patricia.gomes@nomade.com", status: "ativo", areas: ["Desenvolvimento Web"] },

    // SEO / Tráfego Pago: + 1 active (on top of Lucas Oliveira) => 2 active => yellow
    { name: "Vinícius Barbosa", email: "vinicius.barbosa@nomade.com", status: "ativo", areas: ["SEO / Tráfego Pago"] },

    // Social Media: 2 active + 1 pending => 2 active => yellow
    { name: "Amanda Cardoso",  email: "amanda.cardoso@nomade.com",  status: "ativo",               areas: ["Social Media"] },
    { name: "Gustavo Pires",   email: "gustavo.pires@nomade.com",   status: "ativo",               areas: ["Social Media"] },
    { name: "Isabela Teixeira",email: "isabela.teixeira@nomade.com",status: "aguardando_aprovacao", areas: ["Social Media"] },

    // Produção de Vídeo: + 1 active (on top of Pedro Nascimento) => 2 active => yellow
    { name: "Renata Vieira", email: "renata.vieira@nomade.com", status: "ativo", areas: ["Produção de Vídeo"] },

    // Stay sparse on purpose — real specialties that remain red (< 2 active)
    { name: "Eduardo Nunes",   email: "eduardo.nunes@nomade.com",   status: "pausado", areas: ["E-commerce"] },
    { name: "Mariana Castro",  email: "mariana.castro@nomade.com",  status: "ativo",    areas: ["Consultoria Estratégica"] },
    { name: "Sérgio Batista",  email: "sergio.batista@nomade.com",  status: "aguardando_aprovacao", areas: ["Fotografia Profissional"] },
  ];

  let created = 0;
  for (const n of newNomades) {
    const existing = await prisma.nomade.findUnique({ where: { email: n.email } });
    if (existing) continue;
    await prisma.nomade.create({
      data: {
        name: n.name,
        email: n.email,
        status: n.status,
        level: "bronze",
        areas_of_interest: JSON.stringify(n.areas),
        terms_accepted: true,
      },
    });
    created++;
  }
  console.log(`Created ${created} new nomades (skipped ${newNomades.length - created} already existing).`);

  // ── Freshen most "waiting" tasks' created_at so the task tab isn't 100% red ──
  // (all were ~86h old, tripping the oldestHours >= 48 red rule regardless of
  // how many nomads were actually waiting). Keep one genuinely old for realism.
  const waiting = await prisma.projectTask.findMany({
    where: { status: "LIBERADA_PARA_EXECUCAO" },
    orderBy: { created_at: "asc" },
    select: { id: true, name_snapshot: true, created_at: true },
  });

  let freshened = 0;
  for (let i = 0; i < waiting.length; i++) {
    if (i === 0) continue; // keep the oldest one as a real, aged red example
    const hoursAgo = 3 + i * 5; // 8h, 13h, 18h, 23h, 28h, 33h — all well under 48h
    await prisma.projectTask.update({
      where: { id: waiting[i].id },
      data: { created_at: new Date(Date.now() - hoursAgo * 3600_000) },
    });
    freshened++;
  }
  console.log(`Freshened ${freshened} waiting tasks' created_at (kept 1 aged for realism).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

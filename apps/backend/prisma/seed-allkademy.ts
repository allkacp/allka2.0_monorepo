// Seed de cursos de teste da Allkademy — um curso publicado por perfil, mais
// um curso liberado para "all". Idempotente (usa upsert por título).
//
// Rodar com:
//   cd apps/backend
//   npx tsx prisma/seed-allkademy.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedLesson {
  title: string;
  content_type: "video" | "text" | "quiz";
  content_url?: string;
  duration?: number;
}

interface SeedCourse {
  title: string;
  description: string;
  category: string;
  duration: number;
  audience_profiles: string;
  lessons: SeedLesson[];
}

const COURSES: SeedCourse[] = [
  {
    title: "Boas práticas de uso da plataforma Allka",
    description: "Introdução geral à Allka: navegação, papéis, e como cada perfil se encaixa no fluxo de um projeto.",
    category: "gestao",
    duration: 45,
    audience_profiles: "all",
    lessons: [
      { title: "Visão geral da plataforma", content_type: "video", content_url: "https://example.com/allkademy/geral-visao-geral", duration: 20 },
      { title: "Papéis e responsabilidades", content_type: "text", duration: 25 },
    ],
  },
  {
    title: "Como aprovar entregas e acompanhar projetos na Allka",
    description: "Para empresas clientes: como revisar entregas, aprovar tarefas e acompanhar o andamento dos projetos contratados.",
    category: "gestao",
    duration: 40,
    audience_profiles: "company",
    lessons: [
      { title: "Acompanhando o andamento do projeto", content_type: "video", content_url: "https://example.com/allkademy/company-acompanhamento", duration: 20 },
      { title: "Como aprovar ou solicitar ajustes numa entrega", content_type: "video", content_url: "https://example.com/allkademy/company-aprovacao", duration: 20 },
    ],
  },
  {
    title: "Gestão de clientes e projetos na Allka",
    description: "Para agências: como organizar carteira de clientes, montar projetos a partir do catálogo e acompanhar o financeiro da operação.",
    category: "gestao",
    duration: 50,
    audience_profiles: "agency",
    lessons: [
      { title: "Organizando sua carteira de clientes", content_type: "video", content_url: "https://example.com/allkademy/agency-carteira", duration: 25 },
      { title: "Montando um projeto a partir do catálogo", content_type: "video", content_url: "https://example.com/allkademy/agency-catalogo", duration: 25 },
    ],
  },
  {
    title: "Como executar tarefas e enviar entregas corretamente",
    description: "Para nômades: como se candidatar a tarefas, seguir o briefing e enviar entregas dentro do padrão esperado.",
    category: "tecnologia",
    duration: 35,
    audience_profiles: "nomades",
    lessons: [
      { title: "Se candidatando a uma tarefa disponível", content_type: "video", content_url: "https://example.com/allkademy/nomade-candidatura", duration: 15 },
      { title: "Enviando uma entrega dentro do padrão", content_type: "text", duration: 20 },
    ],
  },
  {
    title: "Revisão, devolutiva e qualificação de tarefas",
    description: "Para líderes de área: como revisar entregas antes de liberar para o cliente, devolver com uma boa devolutiva e qualificar nômades.",
    category: "gestao",
    duration: 40,
    audience_profiles: "leader",
    lessons: [
      { title: "Critérios de qualificação de uma entrega", content_type: "text", duration: 20 },
      { title: "Como escrever uma devolutiva útil", content_type: "video", content_url: "https://example.com/allkademy/leader-devolutiva", duration: 20 },
    ],
  },
  {
    title: "Como acompanhar indicações, comissões e saques",
    description: "Para parceiros: como indicar agências/empresas, acompanhar o MRR gerado e solicitar saque das comissões.",
    category: "negocios",
    duration: 30,
    audience_profiles: "partner",
    lessons: [
      { title: "Indicando uma nova agência ou empresa", content_type: "video", content_url: "https://example.com/allkademy/partner-indicacao", duration: 15 },
      { title: "Acompanhando comissões e solicitando saque", content_type: "text", duration: 15 },
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Este seed não pode rodar em produção.");
    process.exit(1);
  }

  console.log("🌱 Seed Allkademy — cursos de teste por perfil...");

  for (const c of COURSES) {
    const existing = await prisma.course.findFirst({ where: { title: c.title } });

    const course = existing
      ? await prisma.course.update({
          where: { id: existing.id },
          data: {
            description: c.description,
            category: c.category,
            duration: c.duration,
            is_published: true,
            is_free: true,
            audience_profiles: c.audience_profiles,
          },
        })
      : await prisma.course.create({
          data: {
            title: c.title,
            description: c.description,
            category: c.category,
            duration: c.duration,
            is_published: true,
            is_free: true,
            audience_profiles: c.audience_profiles,
          },
        });

    // Módulo único por curso de teste — recria do zero pra manter o seed
    // idempotente sem duplicar aulas a cada execução.
    await prisma.courseModule.deleteMany({ where: { course_id: course.id } });
    await prisma.courseModule.create({
      data: {
        course_id: course.id,
        title: "Módulo 1",
        order: 0,
        lessons: {
          create: c.lessons.map((l, i) => ({
            title: l.title,
            content_type: l.content_type,
            content_url: l.content_url,
            duration: l.duration,
            order: i,
          })),
        },
      },
    });

    console.log(`  ✔ ${course.title} (público: ${c.audience_profiles})`);
  }

  console.log("✅ Seed Allkademy concluído.");
}

main()
  .catch((err) => {
    console.error("❌ Erro no seed Allkademy:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

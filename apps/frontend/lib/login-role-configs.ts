import type { AccessTypeId, LoginRoleConfig } from "@/components/login-page-template";
import { devLoginPrefill } from "@/lib/dev-login-credentials";

// Configs de cada perfil de login, centralizadas aqui para que
// LoginPageTemplate possa trocar de perfil dinamicamente (auto-detecção por
// e-mail) sem duplicar a tela em si — ver app/*/login/page.tsx, que agora só
// escolhem o `initialAccessType` inicial (usado antes do e-mail ser
// identificado, ou como fallback para e-mails desconhecidos).

const devAdmin = devLoginPrefill("ADMIN");
const devNomad = devLoginPrefill("NOMAD");
const devAgency = devLoginPrefill("AGENCY");
const devPartner = devLoginPrefill("AGENCY_PARTNER");
const devCompany = devLoginPrefill("COMPANY");
const devLeader = devLoginPrefill("LEADER");

export const LOGIN_ROLE_CONFIGS: Record<AccessTypeId, LoginRoleConfig> = {
  ADMIN: {
    gradient: "linear-gradient(135deg, #000000 0%, #1a2a6f 50%, #c81a7f 100%)",
    defaultEmail: devAdmin?.email,
    defaultPassword: devAdmin?.password,
    redirectPath: "/admin/dashboard",
    accessType: "ADMIN",
    translations: {
      pt: {
        tag: "Marketing On-Demand",
        headlineLines: [
          { text: "EQUIPE DE MARKETING" },
          { text: " SOB DEMANDA: " },
          { text: "O PODER DA", outlined: true },
          { text: "ESCALABILIDADE", outlined: true },
          { text: "EM SUAS MÃOS.", outlined: true },
        ],
        subtext:
          "Plataforma que permite agências e departamentos de marketing contratar centenas de tarefas especializadas com prazo, preço e processos garantidos.",
        stats: [
          { value: "500+", label: "Profissionais" },
          { value: "12k+", label: "Tarefas entregues" },
          { value: "98%", label: "Satisfação" },
        ],
      },
      en: {
        tag: "On-Demand Marketing",
        headlineLines: [
          { text: "YOUR MARKETING TEAM" },
          { text: " ON DEMAND: " },
          { text: "THE POWER OF", outlined: true },
          { text: "SCALABILITY", outlined: true },
          { text: "IN YOUR HANDS.", outlined: true },
        ],
        subtext:
          "The platform that lets agencies and marketing teams hire hundreds of specialized tasks with guaranteed deadlines, pricing, and processes.",
        stats: [
          { value: "500+", label: "Professionals" },
          { value: "12k+", label: "Tasks delivered" },
          { value: "98%", label: "Satisfaction" },
        ],
      },
      es: {
        tag: "Marketing On-Demand",
        headlineLines: [
          { text: "TU EQUIPO DE MARKETING" },
          { text: " BAJO DEMANDA: " },
          { text: "EL PODER DE LA", outlined: true },
          { text: "ESCALABILIDAD", outlined: true },
          { text: "EN TUS MANOS.", outlined: true },
        ],
        subtext:
          "Plataforma que permite a agencias y equipos de marketing contratar cientos de tareas especializadas con plazos, precios y procesos garantizados.",
        stats: [
          { value: "500+", label: "Profesionales" },
          { value: "12k+", label: "Tareas entregadas" },
          { value: "98%", label: "Satisfacción" },
        ],
      },
      zh: {
        tag: "按需营销",
        headlineLines: [
          { text: "您的营销团队" },
          { text: " 按需服务：" },
          { text: "扩展的力量", outlined: true },
          { text: "尽在", outlined: true },
          { text: "您手中。", outlined: true },
        ],
        subtext:
          "让代理机构和营销团队以保证的截止日期、定价和流程雇用数百项专业任务的平台。",
        stats: [
          { value: "500+", label: "专业人士" },
          { value: "12k+", label: "已交付任务" },
          { value: "98%", label: "满意度" },
        ],
      },
    },
  },
  NOMAD: {
    gradient: "linear-gradient(135deg, #000000 0%, #c81a7f 60%, #1a2a6f 100%)",
    defaultEmail: devNomad?.email,
    defaultPassword: devNomad?.password,
    redirectPath: "/nomad/dashboard",
    accessType: "NOMAD",
    translations: {
      pt: {
        tag: "Nômades Allka",
        headlineLines: [
          { text: "TRABALHE NO SEU TEMPO:" },
          { text: " GANHE E CRESÇA" },
          { text: "SEM NENHUM", outlined: true },
          { text: "LIMITE", outlined: true },
          { text: "DE RENDA.", outlined: true },
        ],
        subtext:
          "Execute tarefas de marketing para agências e empresas de todo o Brasil. Ganhe por entrega, evolua por desempenho.",
        stats: [
          { value: "500+", label: "Nômades ativos" },
          { value: "12k+", label: "Tarefas entregues" },
          { value: "R$2M+", label: "Pagos aos nômades" },
        ],
      },
      en: {
        tag: "Allka Nomads",
        headlineLines: [
          { text: "WORK ON YOUR TERMS:" },
          { text: " EARN & GROW" },
          { text: "WITHOUT ANY", outlined: true },
          { text: "INCOME", outlined: true },
          { text: "LIMITS.", outlined: true },
        ],
        subtext:
          "Execute marketing tasks for agencies and companies. Get paid per delivery, level up through performance.",
        stats: [
          { value: "500+", label: "Active nomads" },
          { value: "12k+", label: "Tasks delivered" },
          { value: "R$2M+", label: "Paid to nomads" },
        ],
      },
      es: {
        tag: "Nómadas Allka",
        headlineLines: [
          { text: "TRABAJA A TU RITMO:" },
          { text: " GANA Y CRECE" },
          { text: "SIN NINGÚN", outlined: true },
          { text: "LÍMITE", outlined: true },
          { text: "DE INGRESOS.", outlined: true },
        ],
        subtext:
          "Ejecuta tareas de marketing para agencias y empresas. Cobra por entrega, evoluciona por desempeño.",
        stats: [
          { value: "500+", label: "Nómadas activos" },
          { value: "12k+", label: "Tareas entregadas" },
          { value: "R$2M+", label: "Pagado a nómadas" },
        ],
      },
      zh: {
        tag: "Allka 游牧者",
        headlineLines: [
          { text: "按你的节奏工作：" },
          { text: " 赚錢并成长" },
          { text: "收入", outlined: true },
          { text: "完全", outlined: true },
          { text: "没有上限。", outlined: true },
        ],
        subtext: "为机构和公司执行营销任务。按交付获得报酬，通过表现模式升级。",
        stats: [
          { value: "500+", label: "活跃游牧者" },
          { value: "12k+", label: "已交付任务" },
          { value: "R$2M+", label: "支付给游牧者" },
        ],
      },
    },
  },
  AGENCY: {
    gradient:
      "linear-gradient(135deg, #000000 0%, #1a2a6f 40%, #c81a7f 75%, #1a2a6f 100%)",
    defaultEmail: devAgency?.email,
    defaultPassword: devAgency?.password,
    redirectPath: "/agency/dashboard",
    accessType: "AGENCY",
    perfis: [
      {
        id: "agency",
        label: "Agência",
        email: devAgency?.email ?? "",
        redirectPath: "/agency/dashboard",
        descricao: "Painel padrão da agência",
      },
      {
        id: "partner",
        label: "Partner",
        email: devPartner?.email ?? "",
        redirectPath: "/partner/dashboard",
        descricao: "Agência com programa de parceria",
      },
    ],
    translations: {
      pt: {
        tag: "Allka Agency",
        headlineLines: [
          { text: "EXPANDA SUA AGÊNCIA:" },
          { text: " ENTREGUE MUITO MAIS" },
          { text: "SEM AUMENTAR", outlined: true },
          { text: "SUA EQUIPE", outlined: true },
          { text: "DE JEITO NENHUM.", outlined: true },
        ],
        subtext:
          "Terceirize tarefas especializadas para nômades certificados e entregue mais projetos sem ampliar sua folha.",
        stats: [
          { value: "100+", label: "Agências parceiras" },
          { value: "8k+", label: "Entregas realizadas" },
          { value: "3x", label: "Capacidade de entrega" },
        ],
      },
      en: {
        tag: "Allka Agency",
        headlineLines: [
          { text: "GROW YOUR AGENCY:" },
          { text: " DELIVER WAY MORE" },
          { text: "WITHOUT GROWING", outlined: true },
          { text: "YOUR TEAM", outlined: true },
          { text: "AT ALL.", outlined: true },
        ],
        subtext:
          "Outsource specialized tasks to certified nomads and ship more projects without expanding your payroll.",
        stats: [
          { value: "100+", label: "Partner agencies" },
          { value: "8k+", label: "Deliveries completed" },
          { value: "3x", label: "Delivery capacity" },
        ],
      },
      es: {
        tag: "Allka Agency",
        headlineLines: [
          { text: "EXPANDE TU AGENCIA:" },
          { text: " ENTREGA MUCHO MÁS" },
          { text: "SIN AMPLIAR", outlined: true },
          { text: "TU EQUIPO", outlined: true },
          { text: "EN ABSOLUTO.", outlined: true },
        ],
        subtext:
          "Externaliza tareas especializadas a nómadas certificados y entrega más proyectos sin ampliar tu nómina.",
        stats: [
          { value: "100+", label: "Agencias socias" },
          { value: "8k+", label: "Entregas realizadas" },
          { value: "3x", label: "Capacidad de entrega" },
        ],
      },
      zh: {
        tag: "Allka 代理机构",
        headlineLines: [
          { text: "发展您的机构：" },
          { text: " 交付更多" },
          { text: "无需", outlined: true },
          { text: "扩大团队", outlined: true },
          { text: "规模。", outlined: true },
        ],
        subtext:
          "将专业任务外包给经过认证的游牧者，无需扩大编制即可交付更多项目。",
        stats: [
          { value: "100+", label: "合作机构" },
          { value: "8k+", label: "已完成交付" },
          { value: "3x", label: "交付能力" },
        ],
      },
    },
  },
  COMPANY: {
    gradient: "linear-gradient(135deg, #000000 0%, #1a2a6f 55%, #c81a7f 100%)",
    defaultEmail: devCompany?.email,
    defaultPassword: devCompany?.password,
    redirectPath: "/company/dashboard",
    accessType: "COMPANY",
    translations: {
      pt: {
        tag: "Allka Company",
        headlineLines: [
          { text: "MARKETING SOB DEMANDA:" },
          { text: " ESCALE SUA EQUIPE" },
          { text: "SEM CONTRATAR", outlined: true },
          { text: "UMA PESSOA", outlined: true },
          { text: "SEQUER.", outlined: true },
        ],
        subtext:
          "Acesse uma rede de profissionais qualificados para seus projetos de marketing. Prazo garantido, preço fixo.",
        stats: [
          { value: "200+", label: "Empresas parceiras" },
          { value: "5k+", label: "Projetos concluídos" },
          { value: "40%", label: "Economia média" },
        ],
      },
      en: {
        tag: "Allka Company",
        headlineLines: [
          { text: "ON-DEMAND MARKETING:" },
          { text: " SCALE YOUR TEAM" },
          { text: "WITHOUT HIRING", outlined: true },
          { text: "A SINGLE", outlined: true },
          { text: "PERSON.", outlined: true },
        ],
        subtext:
          "Access a network of certified professionals for your marketing projects. Guaranteed deadlines, fixed pricing.",
        stats: [
          { value: "200+", label: "Partner companies" },
          { value: "5k+", label: "Projects completed" },
          { value: "40%", label: "Average savings" },
        ],
      },
      es: {
        tag: "Allka Company",
        headlineLines: [
          { text: "MARKETING BAJO DEMANDA:" },
          { text: " ESCALA TU EQUIPO" },
          { text: "SIN CONTRATAR", outlined: true },
          { text: "A UNA SOLA", outlined: true },
          { text: "PERSONA.", outlined: true },
        ],
        subtext:
          "Accede a una red de profesionales certificados para tus proyectos de marketing. Plazos garantizados, precio fijo.",
        stats: [
          { value: "200+", label: "Empresas socias" },
          { value: "5k+", label: "Proyectos completados" },
          { value: "40%", label: "Ahorro promedio" },
        ],
      },
      zh: {
        tag: "Allka 企业",
        headlineLines: [
          { text: "按需营销：" },
          { text: " 扩展您的团队" },
          { text: "无需", outlined: true },
          { text: "招聘", outlined: true },
          { text: "任何人。", outlined: true },
        ],
        subtext:
          "访问经过认证的专业人士网络，用于您的营销项目。保证截止日期，固定定价。",
        stats: [
          { value: "200+", label: "合作企业" },
          { value: "5k+", label: "已完成项目" },
          { value: "40%", label: "平均节省" },
        ],
      },
    },
  },
  LEADER: {
    gradient: "linear-gradient(135deg, #0f766e 0%, #0e7490 50%, #1d4ed8 100%)",
    defaultEmail: devLeader?.email,
    defaultPassword: devLeader?.password,
    redirectPath: "/leader/dashboard",
    accessType: "LEADER",
    translations: {
      pt: {
        tag: "Allka Líder",
        headlineLines: [
          { text: "QUALIFIQUE, APROVE" },
          { text: " E GARANTA A" },
          { text: "EXCELÊNCIA", outlined: true },
          { text: "DAS", outlined: true },
          { text: "ENTREGAS.", outlined: true },
        ],
        subtext:
          "Supervisione tarefas do seu domínio, qualifique entregas de nômades e garanta o padrão de qualidade da plataforma.",
        stats: [
          { value: "75+", label: "Tarefas ativas" },
          { value: "98%", label: "Taxa de aprovação" },
          { value: "24h", label: "Prazo de qualificação" },
        ],
      },
      en: {
        tag: "Allka Leader",
        headlineLines: [
          { text: "QUALIFY, APPROVE" },
          { text: " AND ENSURE" },
          { text: "DELIVERY", outlined: true },
          { text: "EXCELLENCE", outlined: true },
          { text: "EVERY TIME.", outlined: true },
        ],
        subtext:
          "Supervise tasks in your domain, qualify nomad deliveries, and uphold the platform's quality standard.",
        stats: [
          { value: "75+", label: "Active tasks" },
          { value: "98%", label: "Approval rate" },
          { value: "24h", label: "Qualification deadline" },
        ],
      },
      es: {
        tag: "Allka Líder",
        headlineLines: [
          { text: "CALIFICA, APRUEBA" },
          { text: " Y GARANTIZA LA" },
          { text: "EXCELENCIA", outlined: true },
          { text: "EN CADA", outlined: true },
          { text: "ENTREGA.", outlined: true },
        ],
        subtext:
          "Supervisa las tareas de tu dominio, califica las entregas de nómadas y mantén el estándar de calidad de la plataforma.",
        stats: [
          { value: "75+", label: "Tareas activas" },
          { value: "98%", label: "Tasa de aprobación" },
          { value: "24h", label: "Plazo de calificación" },
        ],
      },
      zh: {
        tag: "Allka 领导者",
        headlineLines: [
          { text: "审核、批准并" },
          { text: " 确保每次" },
          { text: "交付", outlined: true },
          { text: "卓越", outlined: true },
          { text: "无误。", outlined: true },
        ],
        subtext:
          "监督您职责范围内的任务，审核游牧者的交付成果，维护平台质量标准。",
        stats: [
          { value: "75+", label: "活跃任务" },
          { value: "98%", label: "审批率" },
          { value: "24h", label: "审核截止时间" },
        ],
      },
    },
  },
};

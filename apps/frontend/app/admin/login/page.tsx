import {
  LoginPageTemplate,
  type LoginRoleConfig,
} from "@/components/login-page-template";

const config: LoginRoleConfig = {
  gradient: "linear-gradient(135deg, #000000 0%, #1a2a6f 50%, #c81a7f 100%)",
  defaultEmail: "cp@lamego.com.vc",
  defaultPassword: "123456",
  redirectPath: "/admin/dashboard",
  accessType: "ADMIN",
  devUser: { email: "cp@lamego.com.vc" },
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
};

export default function AdminLoginPage() {
  return <LoginPageTemplate config={config} />;
}

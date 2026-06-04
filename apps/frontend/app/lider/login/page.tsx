import {
  LoginPageTemplate,
  type LoginRoleConfig,
} from "@/components/login-page-template";

const config: LoginRoleConfig = {
  gradient: "linear-gradient(135deg, #0f766e 0%, #0e7490 50%, #1d4ed8 100%)",
  defaultEmail: "lider.performance@allka.test",
  defaultPassword: "123456",
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
};

export default function LiderLoginPage() {
  return <LoginPageTemplate config={config} />;
}

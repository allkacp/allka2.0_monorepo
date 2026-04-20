import { LoginPageTemplate, type LoginRoleConfig } from "@/components/login-page-template"

const config: LoginRoleConfig = {
  gradient: "linear-gradient(135deg, #000000 0%, #c81a7f 60%, #1a2a6f 100%)",
  defaultEmail: "nomade@allka.com.vc",
  redirectPath: "/nomades/dashboard",
  translations: {
    pt: {
      tag: "Nômades Allka",
      headlineLines: [
        { text: "TRABALHE NO SEU TEMPO:" },
        { text: " GANHE E CRESÇA" },
        { text: "SEM LIMITES.", outlined: true },
      ],
      subtext: "Execute tarefas de marketing para agências e empresas de todo o Brasil. Ganhe por entrega, evolua por desempenho.",
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
        { text: "WITHOUT LIMITS.", outlined: true },
      ],
      subtext: "Execute marketing tasks for agencies and companies. Get paid per delivery, level up through performance.",
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
        { text: "SIN LÍMITES.", outlined: true },
      ],
      subtext: "Ejecuta tareas de marketing para agencias y empresas. Cobra por entrega, evoluciona por desempeño.",
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
        { text: "没有限制。", outlined: true },
      ],
      subtext: "为机构和公司执行营销任务。按交付获得报酬，通过表现模式升级。",
      stats: [
        { value: "500+", label: "活跃游牧者" },
        { value: "12k+", label: "已交付任务" },
        { value: "R$2M+", label: "支付给游牧者" },
      ],
    },
  },
}

export default function NomadeLoginPage() {
  return <LoginPageTemplate config={config} />
}

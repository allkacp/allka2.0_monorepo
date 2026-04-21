import { LoginPageTemplate, type LoginRoleConfig } from "@/components/login-page-template"

const config: LoginRoleConfig = {
  gradient: "linear-gradient(135deg, #000000 0%, #1a2a6f 40%, #c81a7f 75%, #1a2a6f 100%)",
  defaultEmail: "agencia@allka.com.vc",
  redirectPath: "/agencia/dashboard",
  devUser: { email: "joao.costa@agenciacriativa.com.br" },
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
      subtext: "Terceirize tarefas especializadas para nômades certificados e entregue mais projetos sem ampliar sua folha.",
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
      subtext: "Outsource specialized tasks to certified nomads and ship more projects without expanding your payroll.",
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
      subtext: "Externaliza tareas especializadas a nómadas certificados y entrega más proyectos sin ampliar tu nómina.",
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
      subtext: "将专业任务外包给经过认证的游牧者，无需扩大编制即可交付更多项目。",
      stats: [
        { value: "100+", label: "合作机构" },
        { value: "8k+", label: "已完成交付" },
        { value: "3x", label: "交付能力" },
      ],
    },
  },
}

export default function AgenciaLoginPage() {
  return <LoginPageTemplate config={config} />
}

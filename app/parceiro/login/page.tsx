import { LoginPageTemplate, type LoginRoleConfig } from "@/components/login-page-template"

const config: LoginRoleConfig = {
  gradient: "linear-gradient(135deg, #000000 0%, #c81a7f 50%, #000000 100%)",
  defaultEmail: "parceiro@allka.com.vc",
  redirectPath: "/parceiro/dashboard",
  devUser: { email: "bruno.martins@parceiro.com" },
  translations: {
    pt: {
      tag: "Allka Partner",
      headlineLines: [
        { text: "INDIQUE, GANHE E CRESÇA:" },
        { text: " COMISSÕES RECORRENTES" },
        { text: "PARA SEMPRE", outlined: true },
        { text: "E SEM NENHUM", outlined: true },
        { text: "ESFORÇO.", outlined: true },
      ],
      subtext: "Indique agências e empresas para a Allka e receba comissões recorrentes enquanto eles usarem a plataforma.",
      stats: [
        { value: "300+", label: "Parceiros ativos" },
        { value: "R$800k+", label: "Pago em comissões" },
        { value: "25%", label: "Comissão média" },
      ],
    },
    en: {
      tag: "Allka Partner",
      headlineLines: [
        { text: "REFER, EARN & GROW:" },
        { text: " RECURRING COMMISSIONS" },
        { text: "FOREVER AND", outlined: true },
        { text: "COMPLETELY", outlined: true },
        { text: "EFFORTLESSLY.", outlined: true },
      ],
      subtext: "Refer agencies and companies to Allka and earn recurring commissions for as long as they use the platform.",
      stats: [
        { value: "300+", label: "Active partners" },
        { value: "R$800k+", label: "Paid in commissions" },
        { value: "25%", label: "Average commission" },
      ],
    },
    es: {
      tag: "Allka Partner",
      headlineLines: [
        { text: "REFIERE, GANA Y CRECE:" },
        { text: " COMISIONES RECURRENTES" },
        { text: "PARA SIEMPRE", outlined: true },
        { text: "Y SIN NINGÚN", outlined: true },
        { text: "ESFUERZO.", outlined: true },
      ],
      subtext: "Refiere agencias y empresas a Allka y recibe comisiones recurrentes mientras usen la plataforma.",
      stats: [
        { value: "300+", label: "Socios activos" },
        { value: "R$800k+", label: "Pagado en comisiones" },
        { value: "25%", label: "Comisión promedio" },
      ],
    },
    zh: {
      tag: "Allka 合作伙伴",
      headlineLines: [
        { text: "推荐、赚錢并成长：" },
        { text: " 持续佣金" },
        { text: "永远", outlined: true },
        { text: "完全", outlined: true },
        { text: "轻松持续。", outlined: true },
      ],
      subtext: "将代理机构和公司推荐给 Allka，只要他们使用该平台，您就能持续获得佣金。",
      stats: [
        { value: "300+", label: "活跃合作伙伴" },
        { value: "R$800k+", label: "已支付佣金" },
        { value: "25%", label: "平均佣金" },
      ],
    },
  },
}

export default function ParceiroLoginPage() {
  return <LoginPageTemplate config={config} />
}

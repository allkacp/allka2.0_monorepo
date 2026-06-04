import {
  LoginPageTemplate,
  type LoginRoleConfig,
} from "@/components/login-page-template";

const config: LoginRoleConfig = {
  gradient: "linear-gradient(135deg, #000000 0%, #1a2a6f 55%, #c81a7f 100%)",
  defaultEmail: "company@allka.test",
  defaultPassword: "123456",
  redirectPath: "/empresa/dashboard",
  accessType: "COMPANY",
  devUser: { email: "empresa@allka.com" },
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
};

export default function EmpresaLoginPage() {
  return <LoginPageTemplate config={config} />;
}

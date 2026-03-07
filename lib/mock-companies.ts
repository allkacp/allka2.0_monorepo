// Shared mock data for company-scoped selects.
// IDs match companyId values in lib/mock-projects.ts.

export interface MockCompanyItem {
  id: number
  name: string
}

export interface MockClientItem {
  id: number
  name: string
  email: string
  cnpj?: string
}

export interface MockUserItem {
  id: number
  name: string
  email: string
  role: string
}

// ── Companies list ────────────────────────────────────────────────────────────
export const mockCompaniesList: MockCompanyItem[] = [
  { id: 1,  name: "Coca-Cola Brasil" },
  { id: 2,  name: "Starbucks Coffee" },
  { id: 3,  name: "Fundação Wikimedia" },
  { id: 4,  name: "Agência Criativa Hub" },
  { id: 5,  name: "Nomade Freelancer Co" },
  { id: 7,  name: "Studio Mídias Sociais" },
  { id: 10, name: "Meta Business" },
  { id: 12, name: "Nômade Criativo 360" },
  { id: 13, name: "Google Brasil" },
  { id: 14, name: "MarcaForte Agência" },
  { id: 15, name: "Slack do Brasil" },
  { id: 17, name: "Conecta Agências" },
]

// ── Clients per company ───────────────────────────────────────────────────────
export const mockClientsByCompany: Record<number, MockClientItem[]> = {
  1:  [
    { id: 101, name: "Florescer Idosos",    email: "contato@florescer.com",    cnpj: "12.345.678/0001-90" },
    { id: 102, name: "Rede Saúde Plus",     email: "comercial@saudeplus.com",  cnpj: "23.456.789/0001-01" },
    { id: 103, name: "MercadoFácil LTDA",   email: "ti@mercadofacil.com",      cnpj: "34.567.890/0001-12" },
  ],
  2:  [
    { id: 201, name: "Startup ABC",         email: "hi@startabc.com",          cnpj: "98.765.432/0001-10" },
    { id: 202, name: "Bolt Digital",        email: "oi@boltdigital.com.br",    cnpj: "87.654.321/0001-20" },
    { id: 203, name: "Nuvem Soluções",      email: "ola@nuvemsolucoes.com",    cnpj: "76.543.210/0001-30" },
  ],
  3:  [
    { id: 301, name: "FoodCorp",            email: "mkt@foodcorp.com.br",      cnpj: "11.222.333/0001-44" },
    { id: 302, name: "Gourmet Plus",        email: "hello@gourmetplus.com",    cnpj: "22.333.444/0001-55" },
  ],
  4:  [
    { id: 401, name: "RetailXpress",        email: "geral@retailxpress.com",   cnpj: "55.444.333/0001-66" },
    { id: 402, name: "ModaAtual",           email: "contato@modaatual.com.br", cnpj: "44.333.222/0001-77" },
    { id: 403, name: "TechBrasil",          email: "ops@techbrasil.com",       cnpj: "33.222.111/0001-88" },
  ],
  5:  [
    { id: 501, name: "HealthTech Pro",      email: "dev@healthtechpro.com",    cnpj: "66.777.888/0001-99" },
    { id: 502, name: "EduPrime",            email: "contato@eduprime.com.br",  cnpj: "77.888.999/0001-00" },
  ],
  7:  [
    { id: 701, name: "Viva Bem",            email: "social@vivabem.com",       cnpj: "88.999.000/0001-11" },
    { id: 702, name: "Esporte Total",       email: "mkt@esportetotal.com",     cnpj: "99.000.111/0001-22" },
    { id: 703, name: "Mídia Club",          email: "hello@midiaclub.com.br",   cnpj: "10.203.040/0001-33" },
  ],
  10: [
    { id: 1001, name: "AdsTech LTDA",       email: "ads@adstech.com",          cnpj: "20.304.050/0001-44" },
    { id: 1002, name: "Commerce Hub",       email: "ops@commercehub.com.br",   cnpj: "30.405.060/0001-55" },
  ],
  12: [
    { id: 1201, name: "Criativo360 Clientes", email: "cl@criativo360.com",    cnpj: "40.506.070/0001-66" },
    { id: 1202, name: "Artes 3D LTDA",      email: "arte@artes3d.com.br",     cnpj: "50.607.080/0001-77" },
  ],
  13: [
    { id: 1301, name: "SaaS Global",        email: "hello@saasglobal.com",     cnpj: "60.708.090/0001-88" },
    { id: 1302, name: "Cloud First",        email: "oi@cloudfirst.com.br",     cnpj: "70.809.010/0001-99" },
    { id: 1303, name: "DataFlow Analytics", email: "data@dataflow.com",        cnpj: "80.910.020/0001-00" },
  ],
  14: [
    { id: 1401, name: "BrandStar",          email: "brand@brandstar.com",      cnpj: "90.011.022/0001-11" },
    { id: 1402, name: "Visual Pro",         email: "oi@visualpro.com.br",      cnpj: "01.122.033/0001-22" },
  ],
  15: [
    { id: 1501, name: "Comm Solutions",     email: "info@commsolutions.com",   cnpj: "11.233.044/0001-33" },
    { id: 1502, name: "OfficePro LTDA",     email: "ti@officepro.com.br",      cnpj: "22.344.055/0001-44" },
  ],
  17: [
    { id: 1701, name: "AgênciasUnidas",     email: "geral@agenciasunidas.com", cnpj: "33.455.066/0001-55" },
    { id: 1702, name: "ParceirosBR",        email: "info@parceirosbr.com.br",  cnpj: "44.566.077/0001-66" },
    { id: 1703, name: "WebConnect",         email: "hello@webconnect.com",     cnpj: "55.677.088/0001-77" },
  ],
}

// ── Users per company ─────────────────────────────────────────────────────────
export const mockUsersByCompany: Record<number, MockUserItem[]> = {
  1:  [
    { id: 1001, name: "Carlos Mendes",     email: "carlos@cocacola.com.br",   role: "Consultor" },
    { id: 1002, name: "Patrícia Lima",     email: "patricia@cocacola.com.br", role: "Gerente" },
    { id: 1003, name: "Roberto Alves",     email: "roberto@cocacola.com.br",  role: "Analista" },
  ],
  2:  [
    { id: 2001, name: "Renata Ferreira",   email: "renata@starbucks.com.br",  role: "Consultora" },
    { id: 2002, name: "Felipe Costa",      email: "felipe@starbucks.com.br",  role: "Gerente" },
  ],
  3:  [
    { id: 3001, name: "Ana Beatriz",       email: "ana@wikimedia.org",        role: "Consultora" },
    { id: 3002, name: "Marcos Costa",      email: "marcos@wikimedia.org",     role: "Analista" },
  ],
  4:  [
    { id: 4001, name: "Juliana Rocha",     email: "juliana@agenciacriativa.com", role: "Diretora" },
    { id: 4002, name: "Lucas Mota",        email: "lucas@agenciacriativa.com",   role: "Consultor" },
    { id: 4003, name: "Clara Duarte",      email: "clara@agenciacriativa.com",   role: "Analista" },
  ],
  5:  [
    { id: 5001, name: "Bruno Souza",       email: "bruno@nomade.com",         role: "Consultor" },
    { id: 5002, name: "Fernanda Lima",     email: "fer@nomade.com",           role: "Designer" },
  ],
  7:  [
    { id: 7001, name: "Tatiana Braga",     email: "tatiana@studiomidias.com", role: "Diretora" },
    { id: 7002, name: "Rafael Moura",      email: "rafael@studiomidias.com",  role: "Consultor" },
  ],
  10: [
    { id: 10001, name: "Daniela Castro",   email: "daniela@meta.com",         role: "Gerente" },
    { id: 10002, name: "André Santos",     email: "andre@meta.com",           role: "Consultor" },
  ],
  12: [
    { id: 12001, name: "Cíntia Frade",     email: "cintia@criativo360.com",   role: "Consultora" },
    { id: 12002, name: "Pedro Neves",      email: "pedro@criativo360.com",    role: "Analista" },
  ],
  13: [
    { id: 13001, name: "Mariana Gomes",    email: "mariana@google.com",       role: "Gerente" },
    { id: 13002, name: "Thiago Prado",     email: "thiago@google.com",        role: "Consultor" },
    { id: 13003, name: "Giovanna Reis",    email: "giovanna@google.com",      role: "Analista" },
  ],
  14: [
    { id: 14001, name: "Otávio Lemos",     email: "otavio@marcaforte.com",    role: "Diretor" },
    { id: 14002, name: "Simone Pires",     email: "simone@marcaforte.com",    role: "Consultora" },
  ],
  15: [
    { id: 15001, name: "Eduardo Barros",   email: "edu@slack.com",            role: "Gerente" },
    { id: 15002, name: "Natália Vieira",   email: "nat@slack.com",            role: "Consultora" },
  ],
  17: [
    { id: 17001, name: "Vinícius Lago",    email: "vinicius@conecta.com",     role: "Diretor" },
    { id: 17002, name: "Laís Freitas",     email: "lais@conecta.com",         role: "Consultora" },
    { id: 17003, name: "Samuel Borges",    email: "samuel@conecta.com",       role: "Analista" },
  ],
}

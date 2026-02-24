// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Users, Search, Plus, Eye, Trash2, ChevronLeft, ChevronRight, Filter, X, Copy, Activity, FolderOpen, Mail, Hash, TrendingUp, TrendingDown, Info, Pencil, GripVertical, CheckCircle, PauseCircle, Clock, Cog } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { CompanyCreateSlidePanel } from "@/components/company-create-slide-panel"
import { CompanyEditSlidePanel } from "@/components/company-edit-slide-panel"
import { CompanyViewSlidePanel } from "@/components/company-view-slide-panel"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { useSidebar } from "@/contexts/sidebar-context"

const gradientMap: Record<string, string> = {
  "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900": "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
  "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900": "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
  "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800": "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
  "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900": "linear-gradient(to bottom right, #14532d, #065f46, #134e4a)",
  "bg-gradient-to-b from-emerald-900 via-green-800 to-cyan-900": "linear-gradient(to bottom, #064e3b, #166534, #164e63)",
  "bg-gradient-to-tr from-teal-900 via-emerald-800 to-green-800": "linear-gradient(to top right, #134e4a, #065f46, #166534)",
  "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900": "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
  "bg-gradient-to-b from-indigo-900 via-purple-800 to-fuchsia-900": "linear-gradient(to bottom, #312e81, #6b21a8, #701a75)",
  "bg-gradient-to-tr from-violet-900 via-purple-800 to-pink-900": "linear-gradient(to top right, #4c1d95, #6b21a8, #831843)",
  "bg-gradient-to-br from-red-900 via-orange-800 to-amber-900": "linear-gradient(to bottom right, #7f1d1d, #9a3412, #78350f)",
  "bg-gradient-to-b from-orange-900 via-red-800 to-rose-900": "linear-gradient(to bottom, #7c2d12, #991b1b, #881337)",
  "bg-gradient-to-tr from-rose-900 via-red-800 to-pink-900": "linear-gradient(to top right, #881337, #991b1b, #831843)",
  "bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900": "linear-gradient(to bottom right, #0f172a, #1f2937, #18181b)",
  "bg-gradient-to-b from-neutral-900 via-stone-800 to-slate-900": "linear-gradient(to bottom, #171717, #292524, #0f172a)",
  "bg-gradient-to-tr from-black via-slate-900 to-gray-900": "linear-gradient(to top right, #000000, #0f172a, #111827)",
}

type CompanyType = "all" | "company" | "agency" | "nomad"
type CompanyStatus = "all" | "active" | "inactive" | "pending"

type Company = {
  id: number
  name: string
  legal_name?: string
  type: CompanyType
  email: string
  phone: string
  phone_secondary?: string
  whatsapp?: string
  website?: string
  document: string
  ie?: string
  location: string
  account_type?: string
  partner_level?: string
  status: CompanyStatus
  users_count: number
  users_online: number
  projects_count: number
  created_at: string
  mau: number
  dau: number
  bitrix_id?: string
  asaas_id?: string
  avatar?: string
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
  pix_key?: string
  pix_type?: string
  bank_name?: string
  bank_agency?: string
  bank_account?: string
  bank_account_type?: string
  admin_notes?: string
  internal_notes?: string
  social_links?: { id: string; platform: string; url: string }[]
}

const mockCompanies: Company[] = [
  {
    id: 1,
    name: "Coca-Cola Brasil",
    legal_name: "Coca-Cola Indústrias LTDA",
    type: "company",
    email: "contact@cocacola.com.br",
    phone: "+55 11 98412-7630",
    phone_secondary: "+55 11 3294-5000",
    whatsapp: "+55 11 98412-7630",
    website: "https://www.cocacola.com.br",
    document: "12.345.678/0001-90",
    ie: "123.456.789.000",
    location: "São Paulo, SP",
    account_type: "Premium",
    partner_level: "growth",
    status: "active",
    users_count: 45,
    users_online: 12,
    projects_count: 23,
    created_at: "2023-01-15",
    mau: 1340,
    dau: 310,
    bitrix_id: "BT-82741",
    asaas_id: "AS-114903",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/200px-Coca-Cola_logo.svg.png",
    zip_code: "01310-200",
    street: "Avenida Paulista",
    number: "1374",
    complement: "Bloco A, 12º andar",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    pix_key: "12.345.678/0001-90",
    pix_type: "cnpj",
    bank_name: "Itaú Unibanco",
    bank_agency: "0042",
    bank_account: "123456-7",
    bank_account_type: "corrente",
    admin_notes: "Cliente estratégico. Negociação de contrato anual em andamento.",
    internal_notes: "Revisar SLA em março/2026. Contato direto: Carlos Mendes (diretoria).",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/cocacolabrasil" },
      { id: "sl2", platform: "LinkedIn", url: "https://linkedin.com/company/coca-cola-brasil" },
    ],
  },
  {
    id: 2,
    name: "Starbucks Coffee",
    legal_name: "Starbucks Cafés do Brasil S.A.",
    type: "agency",
    email: "info@starbucks.com.br",
    phone: "+55 21 97203-5581",
    phone_secondary: "+55 21 3521-8900",
    whatsapp: "+55 21 97203-5581",
    website: "https://www.starbucks.com.br",
    document: "98.765.432/0001-10",
    ie: "98.765.432-1",
    location: "Rio de Janeiro, RJ",
    account_type: "Standard",
    partner_level: "standard",
    status: "active",
    users_count: 14,
    users_online: 3,
    projects_count: 38,
    created_at: "2023-02-20",
    mau: 290,
    dau: 74,
    avatar: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/200px-Starbucks_Corporation_Logo_2011.svg.png",
    zip_code: "22290-040",
    street: "Rua Visconde de Pirajá",
    number: "580",
    complement: "Sala 301",
    neighborhood: "Ipanema",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    pix_key: "info@starbucks.com.br",
    pix_type: "email",
    bank_name: "Bradesco",
    bank_agency: "1822",
    bank_account: "654321-0",
    bank_account_type: "corrente",
    admin_notes: "Agência parceira com foco em campanhas sazonais.",
    internal_notes: "Renovação de plano prevista para abril/2026.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/starbucksbrasil" },
    ],
  },
  {
    id: 3,
    name: "Fundação Wikimedia",
    legal_name: "Wikimedia Foundation Brasil",
    type: "company",
    email: "contato@wikimedia.org.br",
    phone: "+55 31 96554-0218",
    phone_secondary: "+55 31 3215-6700",
    whatsapp: "+55 31 96554-0218",
    website: "https://www.wikimedia.org.br",
    document: "23.456.789/0001-01",
    ie: "Isento",
    location: "Belo Horizonte, MG",
    account_type: "Premium",
    partner_level: "enterprise",
    status: "active",
    users_count: 167,
    users_online: 41,
    projects_count: 72,
    created_at: "2022-03-17",
    mau: 3820,
    dau: 940,
    bitrix_id: "BT-33019",
    asaas_id: "AS-556781",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Wikimedia-logo.svg/200px-Wikimedia-logo.svg.png",
    zip_code: "30130-110",
    street: "Rua Espírito Santo",
    number: "1000",
    complement: "5º andar",
    neighborhood: "Centro",
    city: "Belo Horizonte",
    state: "MG",
    country: "Brasil",
    pix_key: "+55 31 96554-0218",
    pix_type: "phone",
    bank_name: "Banco do Brasil",
    bank_agency: "4501",
    bank_account: "987654-3",
    bank_account_type: "corrente",
    admin_notes: "Organização sem fins lucrativos. Contrato especial ONG.",
    internal_notes: "Desconto de 40% aplicado. Verificar renovação anual em março.",
    social_links: [
      { id: "sl1", platform: "Twitter/X", url: "https://twitter.com/wikimediabr" },
      { id: "sl2", platform: "Facebook", url: "https://facebook.com/WikimediaBrasil" },
    ],
  },
  {
    id: 4,
    name: "Agência Criativa Hub",
    legal_name: "Criativa Hub Comunicação EIRELI",
    type: "agency",
    email: "hello@criativahub.com.br",
    phone: "+55 41 99061-3477",
    phone_secondary: "+55 41 3362-4500",
    whatsapp: "+55 41 99061-3477",
    website: "https://www.criativahub.com.br",
    document: "34.567.890/0001-22",
    ie: "34.567.890-0",
    location: "Curitiba, PR",
    account_type: "Standard",
    partner_level: "start",
    status: "active",
    users_count: 8,
    users_online: 2,
    projects_count: 54,
    created_at: "2023-07-28",
    mau: 185,
    dau: 53,
    zip_code: "80020-010",
    street: "Rua XV de Novembro",
    number: "700",
    complement: "Conjunto 82",
    neighborhood: "Centro",
    city: "Curitiba",
    state: "PR",
    country: "Brasil",
    pix_key: "hello@criativahub.com.br",
    pix_type: "email",
    bank_name: "Sicoob",
    bank_agency: "0301",
    bank_account: "112233-4",
    bank_account_type: "corrente",
    admin_notes: "Agência crescendo rápido. Acompanhar upsell para plano Growth.",
    internal_notes: "Último contato: Jan/2026. Cliente satisfeito.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/criativahub" },
      { id: "sl2", platform: "LinkedIn", url: "https://linkedin.com/company/criativa-hub" },
    ],
  },
  {
    id: 5,
    name: "Nomade Freelancer Co",
    legal_name: "Nomade Freelancer Serviços ME",
    type: "nomad",
    email: "oi@nomadefreelancer.io",
    phone: "+55 85 98274-1650",
    whatsapp: "+55 85 98274-1650",
    website: "https://nomadefreelancer.io",
    document: "45.678.901/0001-33",
    ie: "Não contribuinte",
    location: "Fortaleza, CE",
    account_type: "Basic",
    partner_level: "lite",
    status: "active",
    users_count: 1,
    users_online: 1,
    projects_count: 7,
    created_at: "2024-04-11",
    mau: 47,
    dau: 18,
    zip_code: "60140-120",
    street: "Avenida Beira Mar",
    number: "3212",
    complement: "Apto 204",
    neighborhood: "Meireles",
    city: "Fortaleza",
    state: "CE",
    country: "Brasil",
    pix_key: "oi@nomadefreelancer.io",
    pix_type: "email",
    bank_name: "Nubank",
    bank_agency: "0001",
    bank_account: "445566-7",
    bank_account_type: "corrente",
    admin_notes: "Nômade digital. Opera 100% remoto.",
    internal_notes: "Verificar se deseja upgrar plano em breve.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/nomadefreelancer" },
    ],
  },
  {
    id: 6,
    name: "Notion Workspace",
    legal_name: "Notion Workspace Tecnologia LTDA",
    type: "company",
    email: "comercial@notionworkspace.com.br",
    phone: "+55 51 93708-2946",
    phone_secondary: "+55 51 3214-7700",
    whatsapp: "+55 51 93708-2946",
    website: "https://www.notionworkspace.com.br",
    document: "56.789.012/0001-44",
    ie: "056/7890120",
    location: "Porto Alegre, RS",
    account_type: "Enterprise",
    partner_level: "enterprise",
    status: "inactive",
    users_count: 93,
    users_online: 0,
    projects_count: 61,
    created_at: "2021-11-02",
    mau: 0,
    dau: 0,
    bitrix_id: "BT-10582",
    asaas_id: "AS-223047",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    zip_code: "90010-272",
    street: "Rua dos Andradas",
    number: "1234",
    complement: "10º andar",
    neighborhood: "Centro Histórico",
    city: "Porto Alegre",
    state: "RS",
    country: "Brasil",
    pix_key: "56.789.012/0001-44",
    pix_type: "cnpj",
    bank_name: "Banrisul",
    bank_agency: "2010",
    bank_account: "778899-0",
    bank_account_type: "corrente",
    admin_notes: "Contrato suspenso por inadimplência. Aguardando regularização.",
    internal_notes: "Débito de R$4.500 em aberto desde out/2025. Cobrar jurídico.",
    social_links: [
      { id: "sl1", platform: "LinkedIn", url: "https://linkedin.com/company/notion-workspace-br" },
    ],
  },
  {
    id: 7,
    name: "Studio Mídias Sociais",
    legal_name: "Studio MS Comunicação Digital ME",
    type: "agency",
    email: "studio@midiassociais.net",
    phone: "+55 71 94190-8823",
    whatsapp: "+55 71 94190-8823",
    website: "https://www.studiomidiassociais.net",
    document: "67.890.123/0001-55",
    ie: "Não contribuinte",
    location: "Salvador, BA",
    account_type: "Standard",
    partner_level: "start",
    status: "pending",
    users_count: 5,
    users_online: 0,
    projects_count: 0,
    created_at: "2025-12-03",
    mau: 0,
    dau: 0,
    zip_code: "40020-020",
    street: "Rua da Ajuda",
    number: "89",
    complement: "Sala 05",
    neighborhood: "Comércio",
    city: "Salvador",
    state: "BA",
    country: "Brasil",
    pix_key: "+55 71 94190-8823",
    pix_type: "phone",
    bank_name: "Caixa Econômica Federal",
    bank_agency: "0527",
    bank_account: "001122-3",
    bank_account_type: "corrente",
    admin_notes: "Novo cliente. Aguardando confirmação de pagamento para ativação.",
    internal_notes: "Onboarding agendado para 05/03/2026.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/studiomidiassociais" },
      { id: "sl2", platform: "TikTok", url: "https://tiktok.com/@studiomidias" },
    ],
  },
  {
    id: 8,
    name: "Spotify Brasil",
    legal_name: "Spotify Tecnologia e Entretenimento LTDA",
    type: "company",
    email: "ops@spotify.com.br",
    phone: "+55 62 98830-4712",
    phone_secondary: "+55 62 3091-5500",
    whatsapp: "+55 62 98830-4712",
    website: "https://www.spotify.com.br",
    document: "78.901.234/0001-66",
    ie: "789.012.345.100",
    location: "Goiânia, GO",
    account_type: "Premium",
    partner_level: "scale",
    status: "active",
    users_count: 249,
    users_online: 88,
    projects_count: 137,
    created_at: "2020-07-19",
    mau: 6470,
    dau: 1820,
    bitrix_id: "BT-74039",
    asaas_id: "AS-389120",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/200px-Spotify_logo_without_text.svg.png",
    zip_code: "74010-010",
    street: "Avenida Goiás",
    number: "812",
    complement: "Torre Sul, 15º andar",
    neighborhood: "Setor Central",
    city: "Goiânia",
    state: "GO",
    country: "Brasil",
    pix_key: "78.901.234/0001-66",
    pix_type: "cnpj",
    bank_name: "Santander",
    bank_agency: "3901",
    bank_account: "556677-8",
    bank_account_type: "corrente",
    admin_notes: "Grande conta. Negociação de expansão de licenças em andamento.",
    internal_notes: "Reunião trimestral prevista para fev/2026.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/spotifybrasil" },
      { id: "sl2", platform: "Twitter/X", url: "https://twitter.com/spotify_br" },
      { id: "sl3", platform: "LinkedIn", url: "https://linkedin.com/company/spotify" },
    ],
  },
  {
    id: 9,
    name: "FreelanceFlow",
    legal_name: "FreelanceFlow Serviços Digitais ME",
    type: "nomad",
    email: "ola@freelanceflow.dev",
    phone: "+55 11 95047-3196",
    whatsapp: "+55 11 95047-3196",
    website: "https://freelanceflow.dev",
    document: "89.012.345/0001-77",
    ie: "Não contribuinte",
    location: "São Paulo, SP",
    account_type: "Basic",
    partner_level: "lite",
    status: "inactive",
    users_count: 1,
    users_online: 0,
    projects_count: 3,
    created_at: "2024-09-05",
    mau: 0,
    dau: 0,
    zip_code: "04101-300",
    street: "Rua Domingos de Morais",
    number: "2187",
    complement: "Apto 112",
    neighborhood: "Vila Mariana",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    pix_key: "ola@freelanceflow.dev",
    pix_type: "email",
    bank_name: "Inter",
    bank_agency: "0001",
    bank_account: "334455-6",
    bank_account_type: "corrente",
    admin_notes: "Conta inativa por falta de uso. Verificar reativação.",
    internal_notes: "Plano vencido há 3 meses. Enviar e-mail de recuperação.",
    social_links: [],
  },
  {
    id: 10,
    name: "Meta Business",
    legal_name: "Meta Platforms Brasil Tecnologia LTDA",
    type: "company",
    email: "rh@metabusiness.com.br",
    phone: "+55 81 97362-0854",
    phone_secondary: "+55 81 3425-9900",
    whatsapp: "+55 81 97362-0854",
    website: "https://www.metabusiness.com.br",
    document: "90.123.456/0001-88",
    ie: "901.234.567.200",
    location: "Recife, PE",
    account_type: "Enterprise",
    partner_level: "squad",
    status: "active",
    users_count: 412,
    users_online: 97,
    projects_count: 214,
    created_at: "2019-05-30",
    mau: 11300,
    dau: 3190,
    bitrix_id: "BT-92013",
    asaas_id: "AS-667452",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png",
    zip_code: "50020-050",
    street: "Avenida Conde da Boa Vista",
    number: "1462",
    complement: "8º andar",
    neighborhood: "Boa Vista",
    city: "Recife",
    state: "PE",
    country: "Brasil",
    pix_key: "90.123.456/0001-88",
    pix_type: "cnpj",
    bank_name: "Bradesco",
    bank_agency: "2210",
    bank_account: "889900-1",
    bank_account_type: "corrente",
    admin_notes: "Cliente VIP. Atendimento dedicado com CS especializado.",
    internal_notes: "Contato principal: Ana Rodrigues (VP Latam). Tel direto disponível no CRM.",
    social_links: [
      { id: "sl1", platform: "LinkedIn", url: "https://linkedin.com/company/meta" },
      { id: "sl2", platform: "Instagram", url: "https://instagram.com/metaforbusiness" },
      { id: "sl3", platform: "Facebook", url: "https://facebook.com/metabusiness" },
    ],
  },
  {
    id: 11,
    name: "Pixel & Cia Design",
    legal_name: "Pixel e Cia Estúdio Criativo EIRELI",
    type: "agency",
    email: "arte@pixelecia.design",
    phone: "+55 48 96615-8043",
    whatsapp: "+55 48 96615-8043",
    website: "https://pixelecia.design",
    document: "01.234.567/0001-99",
    ie: "Não contribuinte",
    location: "Florianópolis, SC",
    account_type: "Standard",
    partner_level: "start",
    status: "pending",
    users_count: 4,
    users_online: 0,
    projects_count: 0,
    created_at: "2026-01-22",
    mau: 0,
    dau: 0,
    zip_code: "88010-000",
    street: "Rua Tenente Silveira",
    number: "210",
    complement: "Sala 14",
    neighborhood: "Centro",
    city: "Florianópolis",
    state: "SC",
    country: "Brasil",
    pix_key: "+55 48 96615-8043",
    pix_type: "phone",
    bank_name: "Sicredi",
    bank_agency: "0092",
    bank_account: "221133-4",
    bank_account_type: "corrente",
    admin_notes: "Novo cadastro. Aguardando documentação para ativação.",
    internal_notes: "Portfólio interessante. Potencial para network de agências.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/pixelecia.design" },
      { id: "sl2", platform: "Behance", url: "https://behance.net/pixelecia" },
    ],
  },
  {
    id: 12,
    name: "Nômade Criativo 360",
    legal_name: "Nômade Criativo Serviços ME",
    type: "nomad",
    email: "eu@nomadecriativo.me",
    phone: "+55 92 98103-7265",
    whatsapp: "+55 92 98103-7265",
    website: "https://nomadecriativo.me",
    document: "11.222.333/0001-44",
    ie: "Não contribuinte",
    location: "Manaus, AM",
    account_type: "Basic",
    partner_level: "lite",
    status: "active",
    users_count: 1,
    users_online: 1,
    projects_count: 4,
    created_at: "2025-05-14",
    mau: 29,
    dau: 9,
    zip_code: "69010-040",
    street: "Rua Marcílio Dias",
    number: "495",
    complement: "Apto 302",
    neighborhood: "Praça 14 de Janeiro",
    city: "Manaus",
    state: "AM",
    country: "Brasil",
    pix_key: "eu@nomadecriativo.me",
    pix_type: "email",
    bank_name: "Nubank",
    bank_agency: "0001",
    bank_account: "667788-9",
    bank_account_type: "corrente",
    admin_notes: "Freelancer criativo com foco em vídeo e motion.",
    internal_notes: "Interesse demonstrado em plano Start. Fazer follow-up.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/nomadecriativo360" },
      { id: "sl2", platform: "YouTube", url: "https://youtube.com/@nomadecriativo" },
    ],
  },
  {
    id: 13,
    name: "Google Brasil",
    legal_name: "Google Brasil Internet LTDA",
    type: "company",
    email: "negocios@google.com.br",
    phone: "+55 61 99480-6127",
    phone_secondary: "+55 61 3030-4000",
    whatsapp: "+55 61 99480-6127",
    website: "https://www.google.com.br",
    document: "22.333.444/0001-55",
    ie: "223.334.445.300",
    location: "Brasília, DF",
    account_type: "Premium",
    partner_level: "growth",
    status: "active",
    users_count: 61,
    users_online: 19,
    projects_count: 33,
    created_at: "2023-10-08",
    mau: 970,
    dau: 268,
    bitrix_id: "BT-40871",
    asaas_id: "AS-781936",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/200px-Google_2015_logo.svg.png",
    zip_code: "70070-912",
    street: "SHS Quadra 6 Conjunto A",
    number: "12",
    complement: "Torre Brasil, 14º andar",
    neighborhood: "Setor Hoteleiro Sul",
    city: "Brasília",
    state: "DF",
    country: "Brasil",
    pix_key: "22.333.444/0001-55",
    pix_type: "cnpj",
    bank_name: "Citibank",
    bank_agency: "0010",
    bank_account: "990011-2",
    bank_account_type: "corrente",
    admin_notes: "Conta gerenciada pelo time enterprise.",
    internal_notes: "Reunião de Q1/2026 agendada para 20/fev. Preparar relatório de performance.",
    social_links: [
      { id: "sl1", platform: "LinkedIn", url: "https://linkedin.com/company/google" },
      { id: "sl2", platform: "Twitter/X", url: "https://twitter.com/googlebrasil" },
    ],
  },
  {
    id: 14,
    name: "MarcaForte Agência",
    legal_name: "MarcaForte Comunicação e Marketing LTDA",
    type: "agency",
    email: "ola@marcaforteagencia.com.br",
    phone: "+55 27 93872-5104",
    phone_secondary: "+55 27 3340-8800",
    whatsapp: "+55 27 93872-5104",
    website: "https://www.marcaforte.com.br",
    document: "33.444.555/0001-66",
    ie: "334.445.556.000",
    location: "Vitória, ES",
    account_type: "Standard",
    partner_level: "start",
    status: "inactive",
    users_count: 7,
    users_online: 0,
    projects_count: 11,
    created_at: "2022-08-30",
    mau: 0,
    dau: 0,
    zip_code: "29010-100",
    street: "Avenida Jeronimo Monteiro",
    number: "600",
    complement: "Sala 203",
    neighborhood: "Centro",
    city: "Vitória",
    state: "ES",
    country: "Brasil",
    pix_key: "33.444.555/0001-66",
    pix_type: "cnpj",
    bank_name: "Banco Espirito Santo",
    bank_agency: "0081",
    bank_account: "113344-5",
    bank_account_type: "corrente",
    admin_notes: "Contrato encerrado. Aguardando possível retorno.",
    internal_notes: "Saíram por redução de budget. Manter contato para reativação em 2026.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/marcaforteagencia" },
      { id: "sl2", platform: "Facebook", url: "https://facebook.com/marcaforteagencia" },
    ],
  },
  {
    id: 15,
    name: "Slack do Brasil",
    legal_name: "Slack Technologies Brasil LTDA",
    type: "company",
    email: "ti@slack.com.br",
    phone: "+55 19 98527-3041",
    phone_secondary: "+55 19 3200-9500",
    whatsapp: "+55 19 98527-3041",
    website: "https://slack.com/intl/pt-br",
    document: "44.555.666/0001-77",
    ie: "445.556.667.400",
    location: "Campinas, SP",
    account_type: "Enterprise",
    partner_level: "squad",
    status: "active",
    users_count: 538,
    users_online: 214,
    projects_count: 291,
    created_at: "2018-09-14",
    mau: 17600,
    dau: 5430,
    bitrix_id: "BT-61248",
    asaas_id: "AS-904567",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/200px-Slack_icon_2019.svg.png",
    zip_code: "13013-001",
    street: "Rua Regente Feijó",
    number: "1195",
    complement: "Torre Inovação, 20º andar",
    neighborhood: "Centro",
    city: "Campinas",
    state: "SP",
    country: "Brasil",
    pix_key: "44.555.666/0001-77",
    pix_type: "cnpj",
    bank_name: "JPMorgan",
    bank_agency: "0001",
    bank_account: "556600-9",
    bank_account_type: "corrente",
    admin_notes: "Cliente platinum. Atendimento VIP exclusivo.",
    internal_notes: "Interessados em solução white-label. Direcionar para produto enterprise.",
    social_links: [
      { id: "sl1", platform: "LinkedIn", url: "https://linkedin.com/company/slack" },
      { id: "sl2", platform: "Twitter/X", url: "https://twitter.com/slack" },
    ],
  },
  {
    id: 16,
    name: "Minha Startup SaaS",
    legal_name: "Minha Startup SaaS Tecnologia ME",
    type: "company",
    email: "founder@minhasaas.io",
    phone: "+55 11 94361-8720",
    whatsapp: "+55 11 94361-8720",
    website: "https://minhasaas.io",
    document: "55.666.777/0001-88",
    ie: "Não contribuinte",
    location: "São Paulo, SP",
    account_type: "Basic",
    partner_level: "lite",
    status: "pending",
    users_count: 2,
    users_online: 0,
    projects_count: 0,
    created_at: "2026-02-01",
    mau: 0,
    dau: 0,
    zip_code: "01406-002",
    street: "Rua Augusta",
    number: "2338",
    complement: "Apto 51",
    neighborhood: "Consolação",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    pix_key: "founder@minhasaas.io",
    pix_type: "email",
    bank_name: "Nubank",
    bank_agency: "0001",
    bank_account: "778800-2",
    bank_account_type: "corrente",
    admin_notes: "Startup em estágio inicial. Acompanhar crescimento.",
    internal_notes: "Fundador interessado em parceria. Apresentar plano Start em reunião.",
    social_links: [
      { id: "sl1", platform: "LinkedIn", url: "https://linkedin.com/company/minha-startup-saas" },
    ],
  },
  {
    id: 17,
    name: "Conecta Agências",
    legal_name: "Conecta Agências e Parcerias LTDA",
    type: "agency",
    email: "parcerias@conectaagencias.com",
    phone: "+55 84 97014-5392",
    phone_secondary: "+55 84 3232-7100",
    whatsapp: "+55 84 97014-5392",
    website: "https://www.conectaagencias.com",
    document: "66.777.888/0001-99",
    ie: "667.778.889.500",
    location: "Natal, RN",
    account_type: "Standard",
    partner_level: "standard",
    status: "active",
    users_count: 11,
    users_online: 4,
    projects_count: 28,
    created_at: "2024-11-17",
    mau: 324,
    dau: 87,
    zip_code: "59020-001",
    street: "Avenida Rio Branco",
    number: "954",
    complement: "Sala 410",
    neighborhood: "Petrópolis",
    city: "Natal",
    state: "RN",
    country: "Brasil",
    pix_key: "parcerias@conectaagencias.com",
    pix_type: "email",
    bank_name: "Banco do Nordeste",
    bank_agency: "0144",
    bank_account: "990022-3",
    bank_account_type: "corrente",
    admin_notes: "Rede de agências parceiras do Nordeste. Potencial de expansão.",
    internal_notes: "Reunião de parceria trimestral em março/2026.",
    social_links: [
      { id: "sl1", platform: "Instagram", url: "https://instagram.com/conectaagencias" },
      { id: "sl2", platform: "LinkedIn", url: "https://linkedin.com/company/conecta-agencias" },
    ],
  },
]

const companyInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()

const avatarColors = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-pink-500 to-rose-700",
]
const avatarColor = (id: number) => avatarColors[id % avatarColors.length]

function CompanyAvatar({ company }: { company: Company }) {
  const [err, setErr] = React.useState(false)
  if (company.avatar && !err) {
    return (
      <div className="w-9 h-9 rounded-xl flex-shrink-0 shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <img
          src={company.avatar}
          alt={company.name}
          className="w-full h-full object-contain p-1"
          onError={() => setErr(true)}
        />
      </div>
    )
  }
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(company.id)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-xs font-bold text-white">{companyInitials(company.name)}</span>
    </div>
  )
}

export default function EmpresasPage() {
  const { sidebarWidth, sidebarSettings, previewTheme } = useSidebar()
  const appliedTheme = previewTheme || sidebarSettings
  const themeBg = appliedTheme.backgroundColor
  const getHeaderStyle = (): React.CSSProperties => {
    if (!themeBg || themeBg === "bg-slate-900") return { background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)" }
    if (themeBg.startsWith("custom-gradient:")) return { background: themeBg.replace("custom-gradient:", "") }
    if (themeBg.includes("gradient")) return { background: gradientMap[themeBg] || "#0f172a" }
    return {}
  }
  const [headerHeight, setHeaderHeight] = useState(64)
  const [footerHeight, setFooterHeight] = useState(40)

  // ── Column visibility ──────────────────────────────────────────
  type ColKey = "empresa" | "contato" | "cnpj" | "status" | "plano" | "tipo" | "acoes"
  const allColumns: { key: ColKey; label: string; required?: boolean }[] = [
    { key: "empresa",  label: "Empresa",          required: true },
    { key: "contato",  label: "Contato" },
    { key: "cnpj",     label: "CNPJ · Usuários" },
    { key: "status",   label: "Status" },
    { key: "plano",    label: "Plano" },
    { key: "tipo",     label: "Tipo" },
    { key: "acoes",    label: "Ações",             required: true },
  ]
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(allColumns.map(c => c.key)))
  const [colConfigOpen, setColConfigOpen] = useState(false)
  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }
  const visibleColumnsList = allColumns.filter(c => visibleCols.has(c.key))

  // ── Column resize ──────────────────────────────────────────────
  const allDefaultWidths: Record<ColKey, number> = { empresa: 280, contato: 240, cnpj: 210, status: 145, plano: 145, tipo: 130, acoes: 68 }
  const allMinWidths: Record<ColKey, number>     = { empresa: 200, contato: 180, cnpj: 180, status: 110, plano: 110, tipo: 100, acoes: 60 }
  const defaultColWidths = visibleColumnsList.map(c => allDefaultWidths[c.key])
  const minColWidths     = visibleColumnsList.map(c => allMinWidths[c.key])
  const [colWidths, setColWidths] = useState<number[]>(defaultColWidths)

  // Reset widths when visible columns change
  useEffect(() => {
    setColWidths(visibleColumnsList.map(c => allDefaultWidths[c.key]))
  }, [visibleCols.size])
  const dragState = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null)

  const onResizeMouseDown = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault()
    dragState.current = { colIndex, startX: e.clientX, startWidth: colWidths[colIndex] }
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      const delta = ev.clientX - dragState.current.startX
      const newWidth = Math.max(minColWidths[dragState.current.colIndex], dragState.current.startWidth + delta)
      setColWidths(prev => { const next = [...prev]; next[dragState.current!.colIndex] = newWidth; return next })
    }
    const onMouseUp = () => {
      dragState.current = null
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [colWidths])
  useEffect(() => {
    const measure = () => {
      const h = document.querySelector("header")
      const f = document.querySelector("footer")
      if (h) setHeaderHeight(h.offsetHeight)
      if (f) setFooterHeight(f.offsetHeight)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const [companies, setCompanies] = useState<Company[]>(mockCompanies)
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>(companies)
  const [searchQuery, setSearchQuery] = useState("")
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const [editPanelOpen, setEditPanelOpen] = useState(false)
  const [viewPanelOpen, setViewPanelOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; companyId: number | null; companyName: string }>({
    open: false,
    companyId: null,
    companyName: "",
  })
  
  // Filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    whatsapp: "",
    location: "",
    types: [] as string[],
    statuses: [] as string[],
    accountTypes: [] as string[],
    partnerLevels: [] as string[],
    minUsers: "",
    maxUsers: "",
    minProjects: "",
    maxProjects: "",
    hasBitrixId: false,
    hasAsaasId: false,
    registrationDateFrom: "",
    registrationDateTo: "",
  })

  // Gerenciamento de filtros salvos
  const [savedFilters, setSavedFilters] = useState<Array<{id: string, name: string, filters: any}>>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [isEditingFilter, setIsEditingFilter] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [saveAsFilter, setSaveAsFilter] = useState(false)
  const [isDuplicatingFilter, setIsDuplicatingFilter] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [filterNameInput, setFilterNameInput] = useState("")
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null)
  const [editingFilterName, setEditingFilterName] = useState("")
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null)
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null)
  const [visibleFields, setVisibleFields] = useState<string[]>(["nome","status","tipo","plano","parceiro","data_cadastro"])
  const [showFieldPicker, setShowFieldPicker] = useState(false)

  useEffect(() => {
    let filtered = companies

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (company) =>
          company.name.toLowerCase().includes(q) ||
          company.email.toLowerCase().includes(q) ||
          company.document.includes(searchQuery) ||
          (company.phone && company.phone.replace(/\D/g, "").includes(searchQuery.replace(/\D/g, ""))) ||
          (company.location && company.location.toLowerCase().includes(q)),
      )
    }

    // Aplicar filtros avançados
    if (advancedFilters.name) {
      filtered = filtered.filter((company) =>
        company.name.toLowerCase().includes(advancedFilters.name.toLowerCase())
      )
    }

    if (advancedFilters.cnpj) {
      filtered = filtered.filter((company) =>
        company.document.includes(advancedFilters.cnpj)
      )
    }

    if (advancedFilters.email) {
      filtered = filtered.filter((company) =>
        company.email.toLowerCase().includes(advancedFilters.email.toLowerCase())
      )
    }

    if (advancedFilters.phone) {
      filtered = filtered.filter((company) =>
        company.phone.includes(advancedFilters.phone)
      )
    }

    if (advancedFilters.types.length > 0) {
      filtered = filtered.filter((company) =>
        advancedFilters.types.includes(company.type)
      )
    }

    if (advancedFilters.statuses.length > 0) {
      filtered = filtered.filter((company) =>
        advancedFilters.statuses.includes(company.status)
      )
    }

    if (advancedFilters.location) {
      filtered = filtered.filter((company) =>
        company.location.toLowerCase().includes(advancedFilters.location.toLowerCase())
      )
    }

    if (advancedFilters.accountTypes.length > 0) {
      filtered = filtered.filter((company) =>
        company.account_type ? advancedFilters.accountTypes.includes(company.account_type) : false
      )
    }

    if (advancedFilters.partnerLevels.length > 0) {
      filtered = filtered.filter((company) =>
        company.partner_level ? advancedFilters.partnerLevels.includes(company.partner_level) : false
      )
    }

    if (advancedFilters.minUsers) {
      filtered = filtered.filter((company) => company.users_count >= Number(advancedFilters.minUsers))
    }
    if (advancedFilters.maxUsers) {
      filtered = filtered.filter((company) => company.users_count <= Number(advancedFilters.maxUsers))
    }
    if (advancedFilters.minProjects) {
      filtered = filtered.filter((company) => company.projects_count >= Number(advancedFilters.minProjects))
    }
    if (advancedFilters.maxProjects) {
      filtered = filtered.filter((company) => company.projects_count <= Number(advancedFilters.maxProjects))
    }

    if (advancedFilters.hasBitrixId) {
      filtered = filtered.filter((company) => !!company.bitrix_id)
    }
    if (advancedFilters.hasAsaasId) {
      filtered = filtered.filter((company) => !!company.asaas_id)
    }

    if (advancedFilters.registrationDateFrom) {
      filtered = filtered.filter((company) =>
        new Date(company.created_at) >= new Date(advancedFilters.registrationDateFrom)
      )
    }

    if (advancedFilters.registrationDateTo) {
      filtered = filtered.filter((company) =>
        new Date(company.created_at) <= new Date(advancedFilters.registrationDateTo)
      )
    }

    setFilteredCompanies(filtered)
    setCurrentPage(1)
  }, [searchQuery, companies, advancedFilters])

  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const totalPages = Math.ceil(filteredCompanies.length / pageSize)

  // Função para renderizar números de página
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const halfVisible = Math.floor(maxVisible / 2)

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i)
        }
        if (totalPages > maxVisible) pages.push("...")
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push("...")
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push("...")
        for (let i = currentPage - halfVisible; i <= currentPage + halfVisible; i++) {
          pages.push(i)
        }
        pages.push("...")
      }
    }
    return pages
  }

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === "active").length,
    totalUsers: companies.reduce((acc, c) => acc + c.users_count, 0),
    totalProjects: companies.reduce((acc, c) => acc + c.projects_count, 0),
  }

  const handleCreateCompany = (data: any) => {
    console.log("Creating company:", data)
    setCreatePanelOpen(false)
  }

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company)
    setEditPanelOpen(true)
  }

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company)
    setViewPanelOpen(true)
  }

  const handleSaveCompany = (data: any) => {
    console.log("Saving company:", data)
    setEditPanelOpen(false)
    setSelectedCompany(null)
  }

  const handleDeleteCompany = (id: number) => {
    const company = companies.find((c) => c.id === id)
    setDeleteDialog({ open: true, companyId: id, companyName: company?.name ?? "" })
  }

  const handleConfirmDelete = () => {
    if (deleteDialog.companyId !== null) {
      setCompanies(companies.filter((c) => c.id !== deleteDialog.companyId))
    }
    setDeleteDialog({ open: false, companyId: null, companyName: "" })
  }

  const getTypeLabel = (type: CompanyType) => {
    const labels = {
      all: "Todos",
      company: "Empresa",
      agency: "Agência",
      nomad: "Nômade",
    }
    return labels[type]
  }

  const getStatusColor = (status: CompanyStatus) => {
    const colors = {
      all: "default",
      active: "default",
      inactive: "secondary",
      pending: "outline",
    }
    return colors[status] as any
  }

  // Sparkline & stats history data
  const statsHistory = {
    total:    { data: [6, 8, 7, 10, 9, 11, 14, 13, 15, 16, 17, stats.total], prev: 17, label: "mês passado" },
    active:   { data: [4, 5, 5, 7, 6, 8, 9, 9, 11, 12, 13, stats.active], prev: 13, label: "mês passado" },
    users:    { data: [30, 38, 42, 50, 55, 60, 62, 65, 64, 68, 70, stats.totalUsers], prev: 70, label: "mês passado" },
    projects: { data: [10, 15, 18, 22, 25, 26, 28, 30, 32, 34, 36, stats.totalProjects], prev: 36, label: "mês passado" },
  }

  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const w = 80, h = 16
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${x},${y}`
    }).join(" ")
    return (
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
          style={{ opacity: 0.9 }}
        />
        <circle
          cx={(data.length - 1) / (data.length - 1) * w}
          cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}
          r="2.5"
          fill="white"
          opacity="0.9"
        />
      </svg>
    )
  }

  const StatCard = ({
    label, value, prevValue, prevLabel, icon: Icon, gradient, sparkKey, trendColor,
  }: {
    label: string
    value: number
    prevValue: number
    prevLabel: string
    icon: React.ElementType
    gradient: string
    sparkKey: keyof typeof statsHistory
    trendColor: string
  }) => {
    const [hovered, setHovered] = useState(false)
    const diff = value - prevValue
    const pct = prevValue > 0 ? Math.round(Math.abs(diff / prevValue) * 100) : 0
    const up = diff >= 0

    return (
      <div
        className={`relative rounded-xl overflow-hidden shadow-sm cursor-default transition-all duration-200 ${hovered ? "shadow-lg scale-[1.02]" : ""} bg-gradient-to-br ${gradient}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Info tooltip */}
        <div
          className={`absolute top-2 right-2 z-10 transition-opacity duration-150 ${hovered ? "opacity-100" : "opacity-0"}`}
        >
          <TooltipProvider>
            <Tooltip open={hovered}>
              <TooltipTrigger asChild>
                <div className="bg-white/25 hover:bg-white/35 rounded-md p-0.5 cursor-pointer transition-colors">
                  <Info className="h-2.5 w-2.5 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-slate-900 border-slate-700 text-white p-3 rounded-xl shadow-xl"
              >
                <div className="min-w-[130px]">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className="text-xs text-slate-300">Atual</span>
                    <span className="text-sm font-bold text-white">{value}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs text-slate-300">{prevLabel}</span>
                    <span className="text-sm font-semibold text-slate-300">{prevValue}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${up ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs font-semibold">{up ? "+" : "-"}{pct}% vs {prevLabel}</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-medium text-white/70 leading-tight truncate">{label}</p>
            <div className="bg-white/20 rounded-md p-1 flex-shrink-0 ml-1">
              <Icon className="h-3 w-3 text-white" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xl font-bold text-white leading-none">{value}</p>
              <div className="inline-flex items-center gap-0.5 mt-0.5">
                {up ? <TrendingUp className="h-2.5 w-2.5 text-white/80" /> : <TrendingDown className="h-2.5 w-2.5 text-white/80" />}
                <span className="text-[9px] font-semibold text-white/80">{up ? "+" : "-"}{pct}%</span>
              </div>
            </div>
            {/* Sparkline */}
            <div className="flex-shrink-0">
              <Sparkline data={statsHistory[sparkKey].data} color={trendColor} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // avatar helpers are module-scope (companyInitials / avatarColor / CompanyAvatar)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Empresas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie todas as empresas cadastradas na plataforma
          </p>
        </div>
        <Button
          onClick={() => setCreatePanelOpen(true)}
          className="h-9 gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-md shadow-blue-200 dark:shadow-blue-900/40 text-white border-0"
        >
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total de Empresas"
          value={stats.total}
          prevValue={statsHistory.total.prev}
          prevLabel={statsHistory.total.label}
          icon={Building2}
          gradient="from-blue-500 to-blue-700"
          sparkKey="total"
          trendColor="blue"
        />
        <StatCard
          label="Empresas Ativas"
          value={stats.active}
          prevValue={statsHistory.active.prev}
          prevLabel={statsHistory.active.label}
          icon={Activity}
          gradient="from-emerald-500 to-teal-600"
          sparkKey="active"
          trendColor="emerald"
        />
        <StatCard
          label="Total de Usuários"
          value={stats.totalUsers}
          prevValue={statsHistory.users.prev}
          prevLabel={statsHistory.users.label}
          icon={Users}
          gradient="from-violet-500 to-purple-700"
          sparkKey="users"
          trendColor="violet"
        />
        <StatCard
          label="Total de Projetos"
          value={stats.totalProjects}
          prevValue={statsHistory.projects.prev}
          prevLabel={statsHistory.projects.label}
          icon={FolderOpen}
          gradient="from-orange-500 to-rose-600"
          sparkKey="projects"
          trendColor="orange"
        />
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Card Top Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nome, e-mail, CNPJ, telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Items per page + result count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}
              variant="top"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredCompanies.length !== companies.length
                ? <>de <span className="font-semibold text-blue-500">{filteredCompanies.length}</span> de {companies.length} empresa{companies.length !== 1 ? "s" : ""}</>
                : <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{companies.length}</span> empresa{companies.length !== 1 ? "s" : ""}</>
              }
            </span>
          </div>

          {/* Filter Button */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3.5 text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </Button>

          {/* Column config */}
          <Popover open={colConfigOpen} onOpenChange={setColConfigOpen}>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center justify-center h-7 w-7 rounded-md border transition-colors flex-shrink-0 ${
                  colConfigOpen
                    ? "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700"
                    : "text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
                title="Configurar colunas"
              >
                <Cog className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-[260px] p-0">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Colunas visíveis</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Selecione quais colunas exibir na tabela</p>
              </div>
              <div className="p-2 space-y-0.5 max-h-[280px] overflow-y-auto">
                {allColumns.map(col => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      visibleCols.has(col.key)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    } ${col.required ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <Checkbox
                      checked={visibleCols.has(col.key)}
                      onCheckedChange={() => !col.required && toggleCol(col.key)}
                      disabled={col.required}
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{col.label}</span>
                    {col.required && <span className="text-[9px] text-slate-400 ml-auto">obrigatória</span>}
                  </label>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => setVisibleCols(new Set(allColumns.map(c => c.key)))}
                  className="text-[10px] font-medium text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Mostrar todas
                </button>
                <span className="text-[10px] text-slate-400">
                  {visibleCols.size} de {allColumns.length}
                </span>
              </div>
            </PopoverContent>
          </Popover>

          {/* Pagination */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
              ) : (
                <button
                  key={index}
                  onClick={() => setCurrentPage(Number(page))}
                  className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    page === currentPage
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: "fixed", width: "100%", minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                {visibleColumnsList.map((col, i) => (
                  <th
                    key={col.key}
                    className="py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none relative"
                    style={{
                      paddingLeft: 20,
                      paddingRight: 20,
                      textAlign: col.key === "acoes" ? "right" : "left",
                      borderRight: "1px solid",
                      borderRightColor: "rgba(148,163,184,0.25)",
                    }}
                  >
                    {col.label}
                    {col.key !== "acoes" && (
                      <span
                        onMouseDown={(e) => onResizeMouseDown(e, i)}
                        className="absolute top-0 right-0 h-full w-2.5 flex items-center justify-center cursor-col-resize z-10 group"
                        style={{ transform: "translateX(50%)" }}
                      >
                        <span className="h-4 w-px bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors" />
                      </span>
                    )}
                  </th>
                ))}

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="group hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  {/* Company */}
                  {visibleCols.has("empresa") && (
                  <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    <div className="flex items-center gap-3">
                      <CompanyAvatar company={company} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{company.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{company.location}</p>
                      </div>
                    </div>
                  </td>
                  )}

                  {/* Contact */}
                  {visibleCols.has("contato") && (
                  <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    <div className="space-y-1">
                      <a
                        href={`mailto:${company.email}`}
                        className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group w-fit"
                      >
                        <Mail className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                        <span className="group-hover:underline underline-offset-2">{company.email}</span>
                      </a>
                      <a
                        href={`https://wa.me/${company.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group w-fit"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3 fill-current text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span className="group-hover:underline underline-offset-2">{company.phone}</span>
                      </a>
                    </div>
                  </td>
                  )}

                  {/* CNPJ + Users */}
                  {visibleCols.has("cnpj") && (
                  <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-slate-400" />
                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{company.document}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <Users className="h-3 w-3 text-slate-400" />
                        {company.users_count} usuários
                      </div>
                    </div>
                  </td>
                  )}

                  {/* Status */}
                  {visibleCols.has("status") && (
                  <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        company.status === "active"
                          ? "bg-emerald-500 text-white"
                          : company.status === "inactive"
                          ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {company.status === "active" && <CheckCircle className="h-3.5 w-3.5" />}
                      {company.status === "inactive" && <PauseCircle className="h-3.5 w-3.5" />}
                      {company.status === "pending" && <Clock className="h-3.5 w-3.5" />}
                      {company.status === "active" ? "Ativo" : company.status === "inactive" ? "Inativo" : "Pendente"}
                    </span>
                  </td>
                  )}

                  {/* Plan */}
                  {visibleCols.has("plano") && (
                  <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    {(() => {
                      const planMap: Record<string, { name: string; price: string; discount: string; info: string; color: string }> = {
                        lite:       { name: "Lite",       price: "R$ 300/mês",   discount: "—",   info: "Ativa conta agency na plataforma",              color: "bg-slate-100 text-slate-600 border-slate-200" },
                        start:      { name: "Start",      price: "R$ 500/mês",   discount: "5%",  info: "5% de desconto em todos os produtos",           color: "bg-green-100 text-green-700 border-green-200" },
                        standard:   { name: "Standard",   price: "R$ 1.000/mês", discount: "10%", info: "10% de desconto em todos os produtos",          color: "bg-blue-100 text-blue-700 border-blue-200" },
                        growth:     { name: "Growth",     price: "R$ 1.500/mês", discount: "15%", info: "15% de desconto em todos os produtos",          color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
                        scale:      { name: "Scale",      price: "R$ 3.000/mês", discount: "20%", info: "20% de desconto em todos os produtos",          color: "bg-violet-100 text-violet-700 border-violet-200" },
                        squad:      { name: "Squad",      price: "R$ 5.000/mês", discount: "20%", info: "Agências — 20% desconto + pós pago + squad dedicado", color: "bg-orange-100 text-orange-700 border-orange-200" },
                        enterprise: { name: "Enterprise", price: "R$ 5.000/mês", discount: "—",   info: "Empresas — pós pago + atendimento exclusivo + squad dedicado", color: "bg-purple-100 text-purple-700 border-purple-200" },
                        // backwards compat
                        basic:    { name: "Lite",       price: "R$ 300/mês",   discount: "—",   info: "Ativa conta agency na plataforma",              color: "bg-slate-100 text-slate-600 border-slate-200" },
                        starter:  { name: "Start",      price: "R$ 500/mês",   discount: "5%",  info: "5% de desconto em todos os produtos",           color: "bg-green-100 text-green-700 border-green-200" },
                        premium:  { name: "Standard",   price: "R$ 1.000/mês", discount: "10%", info: "10% de desconto em todos os produtos",          color: "bg-blue-100 text-blue-700 border-blue-200" },
                        gold:     { name: "Growth",     price: "R$ 1.500/mês", discount: "15%", info: "15% de desconto em todos os produtos",          color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
                        silver:   { name: "Lite",       price: "R$ 300/mês",   discount: "—",   info: "Ativa conta agency na plataforma",              color: "bg-slate-100 text-slate-600 border-slate-200" },
                        platinum: { name: "Enterprise", price: "R$ 5.000/mês", discount: "—",   info: "Empresas — pós pago + atendimento exclusivo + squad dedicado", color: "bg-purple-100 text-purple-700 border-purple-200" },
                      }
                      const key = ((company.partner_level || company.account_type) ?? "").toLowerCase()
                      const plan = planMap[key]
                      if (!plan) return <span className="text-xs text-slate-400">—</span>
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border w-fit cursor-default ${plan.color}`}>
                                {plan.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px] space-y-1 p-2.5">
                              <p className="font-bold">{plan.name}</p>
                              <p className="text-slate-300">{plan.price}</p>
                              {plan.discount !== "—" && <p className="text-green-400">{plan.discount} de desconto em produtos</p>}
                              <p className="text-slate-400 leading-snug">{plan.info}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })()}
                  </td>
                  )}

                  {/* Type */}
                  {visibleCols.has("tipo") && (
                  <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      company.type === "company"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                        : company.type === "agency"
                        ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
                        : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
                    }`}>
                      {getTypeLabel(company.type)}
                    </span>
                  </td>
                  )}

                  {/* Actions */}
                  {visibleCols.has("acoes") && (
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCompany(company)}
                              className="h-5 w-5 p-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            >
                              <Eye className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Ver Detalhes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCompany(company.id)}
                              className="h-5 w-5 p-0 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Excluir</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  )}

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedCompanies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Building2 className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhuma empresa encontrada</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tente ajustar os filtros ou busca</p>
          </div>
        )}

        {/* Bottom Pagination */}
        {filteredCompanies.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-center gap-2">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}
                variant="bottom"
              />
              <span className="text-xs text-slate-400">
                de {filteredCompanies.length} empresa{filteredCompanies.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
                ) : (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(Number(page))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      page === currentPage
                        ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Advanced Filters Modal */}
      {isFilterModalOpen && (() => {
        const allFilterFields = [
          { id: "nome",         label: "Nome da Empresa",      section: "identificacao" },
          { id: "cnpj",         label: "CNPJ",                 section: "identificacao" },
          { id: "email",        label: "E-mail",               section: "identificacao" },
          { id: "telefone",     label: "Telefone / WhatsApp",  section: "identificacao" },
          { id: "localizacao",  label: "Cidade / Estado",      section: "identificacao" },
          { id: "tipo",         label: "Tipo de conta",        section: "tipo_status" },
          { id: "status",       label: "Status",               section: "tipo_status" },
          { id: "plano",        label: "Plano",                section: "plano_parceiro" },
          { id: "parceiro",     label: "Nível de Parceiro",   section: "plano_parceiro" },
          { id: "usuarios",     label: "Usuários",             section: "volumes" },
          { id: "projetos",     label: "Projetos",             section: "volumes" },
          { id: "data_cadastro",label: "Data de Cadastro",     section: "data" },
          { id: "bitrix",       label: "Bitrix ID",            section: "integracoes" },
          { id: "asaas",        label: "Asaas ID",             section: "integracoes" },
        ]
        const has = (id: string) => visibleFields.includes(id)
        const hasSection = (...ids: string[]) => ids.some(id => has(id))
        const handleDrop = (targetId: string) => {
          if (!draggingFilterId || draggingFilterId === targetId) return
          const from = savedFilters.findIndex(f => f.id === draggingFilterId)
          const to = savedFilters.findIndex(f => f.id === targetId)
          if (from === -1 || to === -1) return
          const reordered = [...savedFilters]
          const [moved] = reordered.splice(from, 1)
          reordered.splice(to, 0, moved)
          setSavedFilters(reordered)
          setDraggingFilterId(null)
          setDragOverFilterId(null)
        }
        return (
          <div
            className="fixed z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
            style={{ left: sidebarWidth, top: headerHeight, bottom: footerHeight, right: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (unsavedChanges && !window.confirm("Alterações não salvas. Deseja sair?")) return
                setIsFilterModalOpen(false); setSelectedFilterId(null); setIsEditingFilter(false); setUnsavedChanges(false)
                setShowFieldPicker(false)
              }
            }}
          >

            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
              {/* Header — follows sidebar theme */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={getHeaderStyle()}>
                <div>
                  <h2 className="text-sm font-bold text-white">Filtros Avançados</h2>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {unsavedChanges ? "• Alterações não salvas" : selectedFilterId && !isEditingFilter ? "Filtro carregado" : "Configure e aplique filtros"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (unsavedChanges && !window.confirm("Alterações não salvas. Deseja sair?")) return
                    setIsFilterModalOpen(false); setSelectedFilterId(null); setIsEditingFilter(false); setUnsavedChanges(false)
                    setShowFieldPicker(false)
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Left — Saved Filters */}
                <div className="w-44 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1 flex-shrink-0">
                    <Filter className="h-3 w-3" /> Filtros Salvos
                  </p>
                  <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                    {savedFilters.length === 0 ? (
                      <div className="text-center py-8">
                        <Filter className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Nenhum filtro salvo</p>
                      </div>
                    ) : (
                      savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          draggable
                          onDragStart={() => setDraggingFilterId(filter.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverFilterId(filter.id) }}
                          onDrop={() => handleDrop(filter.id)}
                          onDragEnd={() => { setDraggingFilterId(null); setDragOverFilterId(null) }}
                          onClick={() => {
                            if (editingFilterId) return
                            setAdvancedFilters(filter.filters)
                            setSelectedFilterId(filter.id)
                            setIsEditingFilter(false)
                            setUnsavedChanges(false)
                          }}
                          className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                            dragOverFilterId === filter.id && draggingFilterId !== filter.id ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" :
                            draggingFilterId === filter.id ? "opacity-40" :
                            selectedFilterId === filter.id
                              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                              : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                          }`}
                        >
                          {/* Drag handle */}
                          <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />

                          {editingFilterId === filter.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={editingFilterName}
                              onChange={(e) => setEditingFilterName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === "Enter" && editingFilterName.trim()) {
                                  setSavedFilters(savedFilters.map(f => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f))
                                  setEditingFilterId(null)
                                } else if (e.key === "Escape") setEditingFilterId(null)
                              }}
                              onBlur={() => {
                                if (editingFilterName.trim())
                                  setSavedFilters(savedFilters.map(f => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f))
                                setEditingFilterId(null)
                              }}
                              className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200"
                            />
                          ) : (
                            <span className="flex-1 truncate">{filter.name}</span>
                          )}

                          {/* Action icons — shown on hover */}
                          {editingFilterId !== filter.id && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingFilterId(filter.id)
                                  setEditingFilterName(filter.name)
                                }}
                                title="Renomear"
                                className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400 transition-all"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSavedFilters(savedFilters.filter(f => f.id !== filter.id))
                                  if (selectedFilterId === filter.id) setSelectedFilterId(null)
                                }}
                                title="Excluir"
                                className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400 transition-all"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right — Filter config */}
                <div className="flex-1 min-h-0 flex flex-col relative">

                  {/* Field-picker dropdown */}
                  {showFieldPicker && (
                    <div
                      className="absolute top-10 left-3 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-[520px] animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Campos disponíveis</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setVisibleFields(allFilterFields.map(f => f.id))} className="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors">Selecionar todos</button>
                          <button onClick={() => setVisibleFields([])} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors">Limpar</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {allFilterFields.map(field => {
                          const checked = visibleFields.includes(field.id)
                          return (
                            <label key={field.id} className="flex items-center gap-2 py-1 cursor-pointer group">
                              <div
                                onClick={() => setVisibleFields(checked ? visibleFields.filter(f => f !== field.id) : [...visibleFields, field.id])}
                                className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                                  checked ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600 group-hover:border-blue-400"
                                }`}
                              >
                                {checked && (
                                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[2]">
                                    <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[12px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">{field.label}</span>
                            </label>
                          )
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => setVisibleFields(["nome","status","tipo","plano","parceiro","data_cadastro"])}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >Recuperar campos padrão</button>
                        <button
                          onClick={() => setShowFieldPicker(false)}
                          className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                        >Confirmar</button>
                      </div>
                    </div>
                  )}

                  {/* "Adicionar campo" link bar */}
                  <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <button
                      onClick={() => setShowFieldPicker(!showFieldPicker)}
                      className={`text-[12px] font-medium transition-colors ${
                        showFieldPicker ? "text-blue-600" : "text-blue-500 hover:text-blue-700"
                      }`}
                    >
                      + Adicionar campo
                    </button>
                    {visibleFields.length > 0 && (
                      <span className="text-[11px] text-slate-400">{visibleFields.length} campo{visibleFields.length !== 1 ? "s" : ""} ativo{visibleFields.length !== 1 ? "s" : ""}</span>
                    )}
                    {showFieldPicker && (
                      <button onClick={() => setShowFieldPicker(false)} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter fields */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Identificação */}
                    {hasSection("nome","cnpj","email","telefone","localizacao") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Identificação</p>
                        <div className="grid grid-cols-2 gap-2">
                          {has("nome") && <Input placeholder="Nome da Empresa" value={advancedFilters.name} onChange={(e) => { setAdvancedFilters({...advancedFilters, name: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />}
                          {has("cnpj") && <Input placeholder="CNPJ" value={advancedFilters.cnpj} onChange={(e) => { setAdvancedFilters({...advancedFilters, cnpj: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />}
                          {has("email") && <Input placeholder="E-mail" value={advancedFilters.email} onChange={(e) => { setAdvancedFilters({...advancedFilters, email: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />}
                          {has("telefone") && <Input placeholder="Telefone / WhatsApp" value={advancedFilters.phone} onChange={(e) => { setAdvancedFilters({...advancedFilters, phone: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />}
                          {has("localizacao") && <Input placeholder="Cidade / Estado" value={advancedFilters.location} onChange={(e) => { setAdvancedFilters({...advancedFilters, location: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs col-span-2" />}
                        </div>
                      </div>
                    )}

                    {/* Tipo e Status */}
                    {hasSection("tipo","status") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo · Status</p>
                        <div className="space-y-2">
                          {has("tipo") && (
                            <div className="flex flex-wrap gap-1.5">
                              {[{v:"company",l:"Empresa"},{v:"agency",l:"Agência"},{v:"nomad",l:"Nômade"}].map(({v,l}) => (
                                <button key={v} onClick={() => { const t = advancedFilters.types.includes(v) ? advancedFilters.types.filter(x=>x!==v) : [...advancedFilters.types,v]; setAdvancedFilters({...advancedFilters, types: t}); if (selectedFilterId) setUnsavedChanges(true) }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.types.includes(v) ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          )}
                          {has("status") && (
                            <div className="flex flex-wrap gap-1.5">
                              {[{v:"active",l:"Ativo"},{v:"inactive",l:"Inativo"},{v:"pending",l:"Pendente"}].map(({v,l}) => (
                                <button key={v} onClick={() => { const s = advancedFilters.statuses.includes(v) ? advancedFilters.statuses.filter(x=>x!==v) : [...advancedFilters.statuses,v]; setAdvancedFilters({...advancedFilters, statuses: s}); if (selectedFilterId) setUnsavedChanges(true) }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.statuses.includes(v) ? (v==="active"?"bg-emerald-500 text-white border-emerald-500":v==="inactive"?"bg-red-500 text-white border-red-500":"bg-amber-500 text-white border-amber-500") : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Plano e Parceiro */}
                    {hasSection("plano","parceiro") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Plano · Nível de Parceiro</p>
                        <div className="space-y-2">
                          {has("plano") && (
                            <div className="flex flex-wrap gap-1.5">
                              {["Basic","Standard","Premium","Enterprise"].map((v) => (
                                <button key={v} onClick={() => { const a = advancedFilters.accountTypes.includes(v) ? advancedFilters.accountTypes.filter(x=>x!==v) : [...advancedFilters.accountTypes,v]; setAdvancedFilters({...advancedFilters, accountTypes: a}); if (selectedFilterId) setUnsavedChanges(true) }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.accountTypes.includes(v) ? "bg-violet-500 text-white border-violet-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300"}`}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                          {has("parceiro") && (
                            <div className="flex flex-wrap gap-1.5">
                              {["Bronze","Silver","Gold","Platinum"].map((v) => (
                                <button key={v} onClick={() => { const p = advancedFilters.partnerLevels.includes(v) ? advancedFilters.partnerLevels.filter(x=>x!==v) : [...advancedFilters.partnerLevels,v]; setAdvancedFilters({...advancedFilters, partnerLevels: p}); if (selectedFilterId) setUnsavedChanges(true) }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.partnerLevels.includes(v) ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-amber-300"}`}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Volume */}
                    {hasSection("usuarios","projetos") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Volumes</p>
                        <div className="grid grid-cols-2 gap-2">
                          {has("usuarios") && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-500">Usuários</p>
                              <div className="flex items-center gap-1">
                                <Input placeholder="Mín" type="number" value={advancedFilters.minUsers} onChange={(e) => { setAdvancedFilters({...advancedFilters, minUsers: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />
                                <span className="text-slate-300 text-xs">–</span>
                                <Input placeholder="Máx" type="number" value={advancedFilters.maxUsers} onChange={(e) => { setAdvancedFilters({...advancedFilters, maxUsers: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />
                              </div>
                            </div>
                          )}
                          {has("projetos") && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-500">Projetos</p>
                              <div className="flex items-center gap-1">
                                <Input placeholder="Mín" type="number" value={advancedFilters.minProjects} onChange={(e) => { setAdvancedFilters({...advancedFilters, minProjects: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />
                                <span className="text-slate-300 text-xs">–</span>
                                <Input placeholder="Máx" type="number" value={advancedFilters.maxProjects} onChange={(e) => { setAdvancedFilters({...advancedFilters, maxProjects: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Data de Cadastro */}
                    {has("data_cadastro") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data de Cadastro</p>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={advancedFilters.registrationDateFrom} onChange={(e) => { setAdvancedFilters({...advancedFilters, registrationDateFrom: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                          <span className="text-slate-300 text-xs flex-shrink-0">até</span>
                          <Input type="date" value={advancedFilters.registrationDateTo} onChange={(e) => { setAdvancedFilters({...advancedFilters, registrationDateTo: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                        </div>
                      </div>
                    )}

                    {/* Integrações */}
                    {hasSection("bitrix","asaas") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Integrações</p>
                        <div className="flex gap-2">
                          {has("bitrix") && (
                            <button onClick={() => { setAdvancedFilters({...advancedFilters, hasBitrixId: !advancedFilters.hasBitrixId}); if (selectedFilterId) setUnsavedChanges(true) }}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.hasBitrixId ? "bg-cyan-500 text-white border-cyan-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-cyan-300"}`}>
                              Com Bitrix ID
                            </button>
                          )}
                          {has("asaas") && (
                            <button onClick={() => { setAdvancedFilters({...advancedFilters, hasAsaasId: !advancedFilters.hasAsaasId}); if (selectedFilterId) setUnsavedChanges(true) }}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.hasAsaasId ? "bg-teal-500 text-white border-teal-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-teal-300"}`}>
                              Com Asaas ID
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {visibleFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Filter className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-xs text-center">Nenhum campo ativo.<br/>Clique em <span className="text-blue-500">+ Adicionar campo</span> para configurar.</p>
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                <button
                  onClick={() => {
                    setAdvancedFilters({ name:"",cnpj:"",email:"",phone:"",whatsapp:"",location:"",types:[],statuses:[],accountTypes:[],partnerLevels:[],minUsers:"",maxUsers:"",minProjects:"",maxProjects:"",hasBitrixId:false,hasAsaasId:false,registrationDateFrom:"",registrationDateTo:"" })
                    setUnsavedChanges(false)
                  }}
                  className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>

                <div className="flex items-center gap-2">
                  {/* Save / update filter */}
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        value={filterNameInput}
                        onChange={(e) => setFilterNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && filterNameInput.trim()) {
                            const newId = `filter-${Date.now()}`
                            setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: advancedFilters }])
                            setSelectedFilterId(newId); setUnsavedChanges(false); setShowSaveInput(false); setFilterNameInput("")
                          }
                          if (e.key === "Escape") { setShowSaveInput(false); setFilterNameInput("") }
                        }}
                        placeholder={`Filtro ${savedFilters.length + 1}`}
                        className="h-7 px-2 rounded-md text-[11px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                      />
                      <button
                        disabled={!filterNameInput.trim()}
                        onClick={() => {
                          const newId = `filter-${Date.now()}`
                          setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: advancedFilters }])
                          setSelectedFilterId(newId); setUnsavedChanges(false); setShowSaveInput(false); setFilterNameInput("")
                        }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                      >OK</button>
                      <button onClick={() => { setShowSaveInput(false); setFilterNameInput("") }}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-[11px] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : selectedFilterId && unsavedChanges ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSavedFilters(savedFilters.map(f => f.id === selectedFilterId ? { ...f, filters: advancedFilters } : f))
                          setUnsavedChanges(false)
                        }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all shadow-sm"
                      >
                        Atualizar filtro
                      </button>
                      <button
                        onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length + 1}`); setShowSaveInput(true) }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium border border-emerald-400 text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        Salvar como novo
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length + 1}`); setShowSaveInput(true) }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                    >
                      Salvar filtro
                    </button>
                  )}

                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

                  <button
                    onClick={() => {
                      setIsFilterModalOpen(false); setSelectedFilterId(null); setIsEditingFilter(false); setUnsavedChanges(false); setShowFieldPicker(false)
                    }}
                    className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { setIsFilterModalOpen(false); setShowFieldPicker(false) }}
                    className="h-7 px-4 rounded-md text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white transition-all shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      <CompanyCreateSlidePanel
        open={createPanelOpen}
        onOpenChange={setCreatePanelOpen}
        onCreate={handleCreateCompany}
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, companyId: null, companyName: "" })}
        onConfirm={handleConfirmDelete}
        title="Excluir empresa"
        message={`Tem certeza que deseja excluir "${deleteDialog.companyName}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive
      />

      {selectedCompany && (
        <>
        <CompanyViewSlidePanel
          open={viewPanelOpen}
          onClose={() => {
            setViewPanelOpen(false)
            setSelectedCompany(null)
          }}
          company={selectedCompany}
          onCompanyUpdate={(updatedCompany) => {
            // Update the companies list with the new data
            setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c))
            // Update the selected company to reflect changes
            setSelectedCompany(updatedCompany)
          }}
        />
          <CompanyEditSlidePanel
            open={editPanelOpen}
            onClose={() => {
              setEditPanelOpen(false)
              setSelectedCompany(null)
            }}
            company={selectedCompany}
            onSave={handleSaveCompany}
          />
        </>
      )}
    </div>
  )
}

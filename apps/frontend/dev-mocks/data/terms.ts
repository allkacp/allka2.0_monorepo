// Mock terms of service — shape matches ApiTerm from useTerms hook
export type TermType = "uso" | "privacidade" | "nomade" | "empresa" | "parceiro";

export interface MockTerm {
  id: string;
  title: string;
  type: TermType;
  version: string;
  content: string;
  is_active: boolean;
  required: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockTermAcceptance {
  id: string;
  term_id: string;
  term_title: string;
  term_version: string;
  user_id: string;
  user_name: string;
  user_email: string;
  accepted_at: string;
  ip_address: string | null;
}

export const mockTerms: MockTerm[] = [
  {
    id: "1",
    title: "Termos de Uso da Plataforma",
    type: "uso",
    version: "2.1.0",
    content: `# Termos de Uso da Plataforma Allka

**Versão 2.1.0 — vigência a partir de 01/01/2026**

## 1. Aceitação dos Termos
Ao acessar e utilizar a Plataforma Allka, você concorda com os presentes Termos de Uso.

## 2. Descrição do Serviço
A Allka é uma plataforma de conexão entre empresas e profissionais nômades digitais.

## 3. Obrigações do Usuário
O usuário compromete-se a fornecer informações verdadeiras e manter a confidencialidade de suas credenciais.

## 4. Propriedade Intelectual
Todo o conteúdo da plataforma é de propriedade exclusiva da Allka Tecnologia Ltda.

## 5. Limitação de Responsabilidade
A Allka não se responsabiliza por perdas decorrentes do uso inadequado da plataforma.`,
    is_active: true,
    required: true,
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2025-12-15T10:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    title: "Política de Privacidade",
    type: "privacidade",
    version: "1.3.0",
    content: `# Política de Privacidade — Allka

**Versão 1.3.0 — vigência a partir de 01/01/2026**

## 1. Coleta de Dados
Coletamos apenas dados necessários para o funcionamento da plataforma, em conformidade com a LGPD.

## 2. Uso dos Dados
Os dados são utilizados exclusivamente para prestação dos serviços da plataforma.

## 3. Compartilhamento
Não compartilhamos seus dados com terceiros sem consentimento explícito.

## 4. Direitos do Titular
Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento.

## 5. Contato
Para solicitações relacionadas à privacidade: privacidade@allka.com.vc`,
    is_active: true,
    required: true,
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2025-12-15T10:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "3",
    title: "Contrato de Nômade Digital",
    type: "nomade",
    version: "1.0.0",
    content: `# Contrato de Nômade Digital

**Versão 1.0.0 — vigência a partir de 15/03/2026**

## 1. Relação Contratual
O nômade digital atua como prestador autônomo de serviços, sem vínculo empregatício com a Allka.

## 2. Comissionamento
A Allka retém 15% do valor bruto de cada projeto concluído.

## 3. Pagamentos
Os pagamentos são realizados em até 5 dias úteis após aprovação do cliente.

## 4. Qualidade e SLA
O nômade compromete-se a entregar os projetos dentro dos prazos acordados com qualidade satisfatória.

## 5. Sigilo
É vedada a divulgação de informações confidenciais dos clientes da plataforma.`,
    is_active: true,
    required: true,
    published_at: "2026-03-15T00:00:00Z",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-15T00:00:00Z",
  },
];

export const mockTermAcceptances: MockTermAcceptance[] = [
  {
    id: "1",
    term_id: "1",
    term_title: "Termos de Uso da Plataforma",
    term_version: "2.1.0",
    user_id: "1",
    user_name: "Lucas Ferreira",
    user_email: "lucas.ferreira@nomade.allka.com",
    accepted_at: "2026-01-02T08:15:00Z",
    ip_address: "187.45.23.10",
  },
  {
    id: "2",
    term_id: "2",
    term_title: "Política de Privacidade",
    term_version: "1.3.0",
    user_id: "1",
    user_name: "Lucas Ferreira",
    user_email: "lucas.ferreira@nomade.allka.com",
    accepted_at: "2026-01-02T08:15:45Z",
    ip_address: "187.45.23.10",
  },
  {
    id: "3",
    term_id: "3",
    term_title: "Contrato de Nômade Digital",
    term_version: "1.0.0",
    user_id: "1",
    user_name: "Lucas Ferreira",
    user_email: "lucas.ferreira@nomade.allka.com",
    accepted_at: "2026-03-15T10:30:00Z",
    ip_address: "187.45.23.10",
  },
  {
    id: "4",
    term_id: "1",
    term_title: "Termos de Uso da Plataforma",
    term_version: "2.1.0",
    user_id: "3",
    user_name: "Rafael Mendes",
    user_email: "rafael.mendes@nomade.allka.com",
    accepted_at: "2026-01-05T09:00:00Z",
    ip_address: "177.32.11.50",
  },
  {
    id: "5",
    term_id: "2",
    term_title: "Política de Privacidade",
    term_version: "1.3.0",
    user_id: "3",
    user_name: "Rafael Mendes",
    user_email: "rafael.mendes@nomade.allka.com",
    accepted_at: "2026-01-05T09:00:30Z",
    ip_address: "177.32.11.50",
  },
];

import type { BadgeColor } from "@/lib/badge-styles";

export type CompanyType = "company" | "agency" | "nomad" | "partner";

/**
 * The Company.type DB column stores Portuguese values ("empresa" | "agencia"
 * | "nomade" | "parceiro" — see the 20260703230000_add_company_type
 * migration). admin/empresas/page.tsx normalizes this to English right
 * after fetching; other pages that call the API directly (e.g.
 * admin/clientes) get the raw Portuguese value instead. Normalize both
 * here so every caller gets a consistent English type regardless of which
 * shape it was handed.
 */
function normalizeType(type: string): CompanyType {
  switch (type) {
    case "agencia":
    case "agency":
      return "agency";
    case "nomade":
    case "nomad":
      return "nomad";
    case "parceiro":
    case "partner":
      return "partner";
    default:
      return "company";
  }
}

const TYPE_LABELS: Record<CompanyType, string> = {
  company: "Company",
  agency: "Agency",
  nomad: "Nomad",
  partner: "Partner",
};

const TYPE_INFO: Record<CompanyType, string> = {
  company: "Empresa cliente direta, sem vínculo com agência ou parceiro.",
  agency: "Empresa vinculada a um projeto conduzido por uma agência parceira.",
  nomad: "Empresa atendida por um nômade (freelancer) da plataforma.",
  partner: "Empresa indicada por um parceiro de indicação (referral).",
};

const TYPE_COLORS: Record<CompanyType, BadgeColor> = {
  company: "blue",
  agency: "violet",
  partner: "pink",
  nomad: "orange",
};

export function getCompanyTypeLabel(type: string): string {
  return TYPE_LABELS[normalizeType(type)];
}

export function getCompanyTypeInfo(type: string): string {
  return TYPE_INFO[normalizeType(type)];
}

export function getCompanyTypeColor(type: string): BadgeColor {
  return TYPE_COLORS[normalizeType(type)];
}

export function formatCompanySequenceId(sequenceNumber?: number | null): string {
  return `emp_${String(sequenceNumber ?? "").padStart(5, "0")}`;
}

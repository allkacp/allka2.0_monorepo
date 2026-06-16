// ─── Indicator & Report Type System ──────────────────────────────────────────
// Central type definitions for the Allka Reports & Indicators catalog.
// Consumed by the catalog, the frontend rendering layer and the backend
// access-control layer.

// ─── Profiles ─────────────────────────────────────────────────────────────────

export type IndicatorProfile =
  | "admin"
  | "agency"
  | "company"
  | "nomad"
  | "partner"
  | "leader";

// ─── Categories ───────────────────────────────────────────────────────────────

export type IndicatorCategory =
  | "financial"          // Revenue, MRR, invoices, churn, margins
  | "projects"           // Project pipeline, status distribution
  | "tasks"              // Task execution, delivery quality
  | "nomads"             // Nomad base, performance, remuneration
  | "clients"            // Agency/company clients, activity
  | "gamification"       // Score, levels, ranking
  | "leads"              // Lead pipeline and conversion
  | "activity"           // Platform usage, sessions
  | "partner_mgmt";      // Partner → led agencies management

// ─── Visual Types ─────────────────────────────────────────────────────────────

export type IndicatorVisualType =
  | "kpi"                // Single-value card
  | "kpi_comparison"     // KPI card + delta vs. previous period
  | "kpi_line"           // KPI card + sparkline chart
  | "kpi_alert"          // KPI card with warning badge
  | "line_chart"         // Time-series line
  | "area_chart"         // Time-series area
  | "bar_chart"          // Categorical bars
  | "donut_chart"        // Status/share distribution
  | "table"              // Full tabular report
  | "drill_list";        // Card that opens a detail list/drawer

// ─── Data Availability ────────────────────────────────────────────────────────

export type DataAvailability =
  | "available"   // Can be fully computed from existing Prisma models
  | "partial"     // Data exists but requires derivation logic or has gaps
  | "missing";    // Requires new models, events or third-party integrations

// ─── Data Scopes ──────────────────────────────────────────────────────────────

export type IndicatorScope =
  | "GLOBAL"              // All data (admin only)
  | "OWN_AGENCY_SCOPE"    // Agency-level data
  | "OWN_COMPANY_SCOPE"   // Company/client-level data
  | "OWN_NOMAD_SCOPE"     // Nomad own data
  | "OWN_PARTNER_SCOPE"   // Partner + agencies they lead
  | "OWN_LEADER_SCOPE";   // Leader + tasks under their leadership

// ─── Prisma Model References ──────────────────────────────────────────────────
// Declares which DB models feed each indicator. Used for cache invalidation
// and backend route planning.

export type PrismaModelRef =
  | "Invoice"
  | "Project"
  | "ProjectProduct"
  | "ProjectTask"
  | "TaskExecution"
  | "Nomade"
  | "NomadeLevel"
  | "Agency"
  | "AgencyLeadership"
  | "AgencyReport"
  | "Company"
  | "User"
  | "Wallet"
  | "WalletLedger"
  | "WalletTransaction"
  | "WithdrawalRequest"
  | "PartnerProfile"
  | "PartnerCommission"
  | "Campaign"
  | "SquadConfig"
  | "SquadCycle"
  | "Expense"
  | "LiderArea";

// ─── KPI Indicator Definition ─────────────────────────────────────────────────

export interface IndicatorDefinition {
  id: string;
  name: string;
  description: string;
  purpose: string;

  profiles: IndicatorProfile[];
  category: IndicatorCategory;
  visualType: IndicatorVisualType | IndicatorVisualType[];
  allowedScopes: IndicatorScope[];

  allowsComparison: boolean;   // Can compare vs. same period previously
  allowsDrillDown: boolean;    // Clicking opens a detail drawer/modal
  allowsExport: boolean;
  allowsFilter: boolean;       // Has its own dimension filter (e.g. by category)

  dependencies: PrismaModelRef[];
  dataAvailability: DataAvailability;
  missingFields?: string[];    // Specific missing fields / events needed
  notes?: string;              // Implementation notes, edge cases, business rules
}

// ─── Tabular Report Column Definition ─────────────────────────────────────────

export interface ReportColumnDef {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "date" | "badge" | "percentage" | "duration";
  sortable?: boolean;
  filterable?: boolean;
  hiddenByDefault?: boolean;
}

// ─── Tabular Report Definition ────────────────────────────────────────────────

export interface TabularReportDefinition {
  id: string;
  name: string;
  description: string;

  profiles: IndicatorProfile[];
  category: IndicatorCategory;
  columns: ReportColumnDef[];

  allowsExport: boolean;
  exportFormats: ("PDF" | "XLSX")[];
  allowsFilter: boolean;

  dependencies: PrismaModelRef[];
  dataAvailability: DataAvailability;
  missingFields?: string[];
  notes?: string;
}

// ─── Combined Catalog Entry ───────────────────────────────────────────────────

export type CatalogEntry =
  | (IndicatorDefinition & { kind: "indicator" })
  | (TabularReportDefinition & { kind: "report" });

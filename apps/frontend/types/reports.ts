export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: "performance" | "financial" | "operational" | "analytics"
  type: "standard" | "custom"
  columns: ReportColumn[]
  filters: ReportFilter[]
  charts: ReportChart[]
  export_formats: ("excel" | "pdf" | "csv")[]
  access_levels: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ReportColumn {
  id: string
  name: string
  field: string
  type: "text" | "number" | "date" | "currency" | "percentage" | "status"
  width?: number
  sortable: boolean
  filterable: boolean
  aggregation?: "sum" | "avg" | "count" | "min" | "max"
}

export interface ReportFilter {
  id: string
  name: string
  field: string
  type: "date_range" | "select" | "multiselect" | "text" | "number_range"
  options?: { value: string; label: string }[]
  default_value?: any
  required: boolean
}

export interface ReportChart {
  id: string
  type: "line" | "bar" | "pie" | "area" | "scatter"
  title: string
  x_axis: string
  y_axis: string
  data_source: string
  config: Record<string, any>
}

export interface ReportExecution {
  id: string
  template_id: string
  name: string
  filters: Record<string, any>
  status: "pending" | "running" | "completed" | "failed"
  data?: any[]
  charts_data?: Record<string, any>
  file_url?: string
  executed_by: string
  executed_at: string
  completed_at?: string
  error_message?: string
}

export interface StandardReports {
  agency_performance: ReportTemplate
  sales_billing: ReportTemplate
  leads_revenue: ReportTemplate
  wallet_reconciliation: ReportTemplate
  costs_projects: ReportTemplate
  tasks_nomades: ReportTemplate
  clients_plans: ReportTemplate
}

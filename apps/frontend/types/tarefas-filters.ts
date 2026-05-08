// ─── Filter state for the Tarefas screen ─────────────────────────────────────

export interface FilterValues {
  // Identification
  idQuery: string;
  codeQuery: string;
  nameQuery: string;
  // Status
  status: string;
  group: string;
  priority: string;
  // Relationships
  project: string;
  empresa: string;
  product: string;
  nomade: string;
  agencia: string;
  lider: string;
  nomadeQualificador: string;
  categoria: string;
  // Qualification / analysis
  statusAnalise: string;
  qualificacao: string;
  minReprovacoes: string;
  // Date ranges (ISO date string "YYYY-MM-DD" or "")
  startDateFrom: string;
  startDateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  execDateFrom: string;
  execDateTo: string;
  createdFrom: string;
  createdTo: string;
  completedFrom: string;
  completedTo: string;
  // Alert flags
  overdue: boolean;
  prestesVencerLancamento: boolean;
  prestesVencerAprovacao: boolean;
  prestesAtrasar: boolean;
  execucaoAtrasada: boolean;
  aprovacaoAtrasada: boolean;
  qualificacaoAtrasada: boolean;
  revisaoAtrasada: boolean;
  emergencial: boolean;
  desqualificada: boolean;
}

export const EMPTY_FILTERS: FilterValues = {
  idQuery: "",
  codeQuery: "",
  nameQuery: "",
  status: "all",
  group: "all",
  priority: "all",
  project: "all",
  empresa: "all",
  product: "all",
  nomade: "all",
  agencia: "all",
  lider: "all",
  nomadeQualificador: "all",
  categoria: "all",
  statusAnalise: "all",
  qualificacao: "all",
  minReprovacoes: "",
  startDateFrom: "",
  startDateTo: "",
  dueDateFrom: "",
  dueDateTo: "",
  execDateFrom: "",
  execDateTo: "",
  createdFrom: "",
  createdTo: "",
  completedFrom: "",
  completedTo: "",
  overdue: false,
  prestesVencerLancamento: false,
  prestesVencerAprovacao: false,
  prestesAtrasar: false,
  execucaoAtrasada: false,
  aprovacaoAtrasada: false,
  qualificacaoAtrasada: false,
  revisaoAtrasada: false,
  emergencial: false,
  desqualificada: false,
};

export function countActiveFilters(f: FilterValues): number {
  let n = 0;
  if (f.idQuery) n++;
  if (f.codeQuery) n++;
  if (f.nameQuery) n++;
  if (f.status !== "all") n++;
  if (f.group !== "all") n++;
  if (f.priority !== "all") n++;
  if (f.project !== "all") n++;
  if (f.empresa !== "all") n++;
  if (f.product !== "all") n++;
  if (f.nomade !== "all") n++;
  if (f.agencia !== "all") n++;
  if (f.lider !== "all") n++;
  if (f.nomadeQualificador !== "all") n++;
  if (f.categoria !== "all") n++;
  if (f.statusAnalise !== "all") n++;
  if (f.qualificacao !== "all") n++;
  if (f.minReprovacoes) n++;
  if (f.startDateFrom || f.startDateTo) n++;
  if (f.dueDateFrom || f.dueDateTo) n++;
  if (f.execDateFrom || f.execDateTo) n++;
  if (f.createdFrom || f.createdTo) n++;
  if (f.completedFrom || f.completedTo) n++;
  if (f.overdue) n++;
  if (f.prestesVencerLancamento) n++;
  if (f.prestesVencerAprovacao) n++;
  if (f.prestesAtrasar) n++;
  if (f.execucaoAtrasada) n++;
  if (f.aprovacaoAtrasada) n++;
  if (f.qualificacaoAtrasada) n++;
  if (f.revisaoAtrasada) n++;
  if (f.emergencial) n++;
  if (f.desqualificada) n++;
  return n;
}

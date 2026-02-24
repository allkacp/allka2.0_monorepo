
import { EmpresasDashboard } from "@/components/dashboards/empresas-dashboard"
import { PageHeader } from "@/components/page-header"

export default function InHouseDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl bg-slate-200 px-0 py-0 mx-0 space-y-0">
        

        <div className="px-0">
          <EmpresasDashboard />
        </div>
      </div>
    </div>
  )
}

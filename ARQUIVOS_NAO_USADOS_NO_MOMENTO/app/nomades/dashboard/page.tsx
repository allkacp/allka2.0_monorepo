
import { NomadesDashboard } from "@/components/dashboards/nomades-dashboard"
import { PageHeader } from "@/components/page-header"

export default function NomadesDashboardPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader title="Dashboard" description="Visão geral das suas atividades e estatísticas" />
      <NomadesDashboard />
    </div>
  )
}

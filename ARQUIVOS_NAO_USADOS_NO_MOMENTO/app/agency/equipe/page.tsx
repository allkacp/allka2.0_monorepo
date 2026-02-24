import { Suspense } from "react"
import { AgencyTeam } from "@/components/agency/agency-team"
import { Skeleton } from "@/components/ui/skeleton"

function TeamLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function AgencyEquipePage() {
  console.log("[v0] AgencyEquipePage rendered")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10">
      <div className="container mx-auto pt-6 px-6">
        <Suspense fallback={<TeamLoadingSkeleton />}>
          <AgencyTeam />
        </Suspense>
      </div>
    </div>
  )
}

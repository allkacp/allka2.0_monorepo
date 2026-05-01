import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Spinner } from "@/components/ui/loading";

interface PageLoadingSkeletonProps {
  /** Number of stat cards at the top */
  statCards?: number;
  /** Number of table rows */
  tableRows?: number;
  /** Number of table columns */
  tableColumns?: number;
  /** Show stat cards section */
  showStats?: boolean;
  /** Show table section */
  showTable?: boolean;
  /** Optional label shown below spinner */
  text?: string;
}

export function PageLoadingSkeleton({
  statCards = 4,
  tableRows = 8,
  tableColumns = 6,
  showStats = true,
  showTable = true,
  text = "Carregando dados…",
}: PageLoadingSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Allka brand loading indicator */}
      <div className="flex items-center gap-3 pb-2">
        <Spinner size="sm" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide">
          {text}
        </span>
        <span className="flex gap-1 ml-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
              style={{
                animation: `allka-pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </span>
      </div>

      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: statCards }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Search / filter bar skeleton */}
      {showTable && (
        <>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1 max-w-sm rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>

          {/* Table skeleton */}
          <TableSkeleton rows={tableRows} columns={tableColumns} />
        </>
      )}
    </div>
  );
}

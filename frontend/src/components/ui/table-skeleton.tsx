import { cn } from "@/lib/utils";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
};

const widthPattern = ["w-full", "w-4/5", "w-3/5", "w-2/3", "w-1/2", "w-3/4"];

function SkeletonCell({ rowIndex, colIndex, narrow }: { rowIndex: number; colIndex: number; narrow?: boolean }) {
  const width = widthPattern[(rowIndex + colIndex) % widthPattern.length];
  return <div className={cn("app-skeleton h-3.5", narrow ? "w-6" : width)} />;
}

export function TableSkeleton({
  rows = 6,
  columns = 6,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("app-table-wrap", className)}>
      <table className="app-table">
        {showHeader ? (
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index}>
                  <div className={cn("app-skeleton h-3 w-16", index === 0 && "w-8")} />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex}>
                  <SkeletonCell rowIndex={rowIndex} colIndex={colIndex} narrow={colIndex === 0} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CardListSkeletonProps = {
  rows?: number;
  className?: string;
};

export function CardListSkeleton({ rows = 4, className }: CardListSkeletonProps) {
  return (
    <div className={cn("grid gap-3 p-3 lg:hidden", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="app-surface--inset rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="app-skeleton h-4 w-2/5" />
              <div className="app-skeleton h-3 w-3/5" />
            </div>
            <div className="app-skeleton h-6 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="app-skeleton h-3 w-full" />
            <div className="app-skeleton h-3 w-4/5" />
            <div className="app-skeleton h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

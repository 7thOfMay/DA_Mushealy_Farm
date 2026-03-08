import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton rounded-[8px] bg-[#E2E8E4]",
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-8 h-8 rounded-[8px]" />
        <Skeleton className="w-12 h-5 rounded-[4px]" />
      </div>
      <Skeleton className="w-20 h-9 mb-2" />
      <Skeleton className="w-28 h-3.5" />
    </div>
  );
}

export function GardenCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-1 rounded-none" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Skeleton className="w-32 h-5 mb-2" />
            <Skeleton className="w-20 h-4" />
          </div>
          <Skeleton className="w-16 h-5 rounded-[4px]" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#F7F8F6] rounded-[8px] p-3">
              <Skeleton className="w-3 h-3 mb-2 rounded" />
              <Skeleton className="w-12 h-6 mb-1" />
              <Skeleton className="w-16 h-3" />
            </div>
          ))}
        </div>
        <Skeleton className="w-full h-2 rounded-full" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#E2E8E4]">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? "w-24" : "w-16"}`} />
        </td>
      ))}
    </tr>
  );
}

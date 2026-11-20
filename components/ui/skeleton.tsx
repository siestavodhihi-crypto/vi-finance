import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border)]",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-40" />
      </div>
      <CardSkeleton />
      <div className="card p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="card p-5 space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="space-y-2">
          <TransactionRowSkeleton />
          <TransactionRowSkeleton />
          <TransactionRowSkeleton />
        </div>
      </div>
    </div>
  );
}

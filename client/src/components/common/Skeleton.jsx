export default function Skeleton({ className = '', rows = 1 }) {
  if (rows > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`skeleton h-4 ${i === rows - 1 ? 'w-3/4' : 'w-full'} ${className}`} />
        ))}
      </div>
    )
  }
  return <div className={`skeleton ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-3" aria-busy>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card h-48 opacity-60" />
      ))}
    </div>
  )
}

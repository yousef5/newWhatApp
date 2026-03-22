interface EmptyStateProps {
  title: string
  subtitle?: string
}

export default function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8">
      <h2 className="text-xl font-semibold text-text-primary mb-2">{title}</h2>
      {subtitle && (
        <p className="text-sm text-text-secondary text-center max-w-md">{subtitle}</p>
      )}
    </div>
  )
}

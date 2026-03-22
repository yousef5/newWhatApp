interface EmptyStateProps {
  title: string
  subtitle?: string
}

export default function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 border-2 border-border-primary m-4">
      <h2 className="text-xl font-bold text-text-primary mb-2 uppercase font-mono tracking-widest">{title}</h2>
      {subtitle && (
        <p className="text-sm text-text-secondary text-center max-w-md font-mono uppercase">{subtitle}</p>
      )}
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
      <div className="bg-bg-secondary border-2 border-accent-red p-5 max-w-sm w-full mx-4">
        <h3 className="text-sm font-bold text-text-primary font-mono uppercase tracking-widest mb-3">
          {title}
        </h3>
        <p className="text-xs text-text-muted font-mono leading-relaxed mb-5">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-[11px] text-text-primary border-2 border-border-secondary hover:bg-bg-tertiary cursor-pointer font-mono font-bold uppercase"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-[11px] text-white bg-accent-red border-2 border-accent-red hover:brightness-110 cursor-pointer font-mono font-bold uppercase"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

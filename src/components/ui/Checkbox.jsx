import { cn } from '@/lib/cn'

export function Checkbox({ label, className, ref, ...props }) {
  return (
    <label className={cn('flex min-h-8 cursor-pointer items-center gap-2 text-sm text-texto', className)}>
      <input ref={ref} type="checkbox" className="size-4 shrink-0 accent-[var(--marca)]" {...props} />
      {label}
    </label>
  )
}

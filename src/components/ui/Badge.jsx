import { cn } from '@/lib/cn'

// Badge de interface. Para prioridade clínica use o PrioridadeBadge (cores de Manchester),
// nunca este componente.
const tons = {
  neutro: 'bg-superficie-2 text-texto-suave',
  marca: 'bg-marca-suave text-marca-forte',
  ok: 'bg-ok-suave text-ok-texto',
  aviso: 'bg-aviso-suave text-aviso-texto',
  perigo: 'bg-perigo-suave text-perigo',
}

export function Badge({ tom = 'neutro', icone: Icone, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tons[tom],
        className,
      )}
    >
      {Icone && <Icone className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

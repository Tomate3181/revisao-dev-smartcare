import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const variantes = {
  primaria: 'bg-marca text-marca-texto hover:bg-marca-forte',
  secundaria: 'bg-superficie text-texto border border-borda hover:bg-superficie-2',
  fantasma: 'text-texto hover:bg-superficie-2',
  perigo: 'bg-perigo text-texto-inverso hover:opacity-90',
}

const tamanhos = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icone: 'h-10 w-10 justify-center',
}

export function Button({
  variante = 'primaria',
  tamanho = 'md',
  carregando = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-ui font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    >
      {carregando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

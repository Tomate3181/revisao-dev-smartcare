import { cn } from '@/lib/cn'

export function Card({ className, children, ...props }) {
  return (
    <section className={cn('rounded-ui border border-borda bg-superficie shadow-ui', className)} {...props}>
      {children}
    </section>
  )
}

export function CardCabecalho({ titulo, descricao, acoes, className }) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-borda p-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-texto">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-texto-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  )
}

export function CardConteudo({ className, children }) {
  return <div className={cn('p-4', className)}>{children}</div>
}

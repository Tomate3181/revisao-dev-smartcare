import { cn } from '@/lib/cn'

// Tabela com rolagem horizontal própria, para não estourar a página em 375px.
export function Table({ className, children, legenda }) {
  return (
    <div className="w-full overflow-x-auto rounded-ui border border-borda">
      <table className={cn('w-full border-collapse text-sm', className)}>
        {legenda && <caption className="sr-only">{legenda}</caption>}
        {children}
      </table>
    </div>
  )
}

export function Th({ className, children, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-borda bg-superficie-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-texto-suave',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...props }) {
  return (
    <td className={cn('border-b border-borda px-3 py-2 align-middle', className)} {...props}>
      {children}
    </td>
  )
}

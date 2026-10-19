import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Envolve um controle com rótulo visível, dica e mensagem de erro ligados por aria (RNF03).
 * `children` é uma função que recebe as props de acessibilidade para o controle.
 */
export function Campo({ label, erro, dica, obrigatorio, className, children }) {
  const id = useId()
  const idDica = dica ? `${id}-dica` : undefined
  const idErro = erro ? `${id}-erro` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {label}
        {obrigatorio && (
          <span className="text-perigo" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': [idDica, idErro].filter(Boolean).join(' ') || undefined,
        'aria-required': obrigatorio || undefined,
      })}
      {dica && !erro && (
        <p id={idDica} className="text-xs text-texto-suave">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} role="alert" className="text-xs font-medium text-perigo">
          {erro}
        </p>
      )}
    </div>
  )
}

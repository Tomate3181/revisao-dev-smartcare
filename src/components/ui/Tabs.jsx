import { useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Abas no padrão WAI-ARIA: Tab entra na aba ativa, setas ←/→ (e Home/End) trocam de aba.
 * O painel é renderizado por quem usa, com id `painel-${id}` e aria-labelledby `aba-${id}`.
 */
export function Tabs({ abas, ativa, onChange, rotulo }) {
  const refs = useRef({})

  function onKeyDown(e) {
    const i = abas.findIndex((a) => a.id === ativa)
    const destino = {
      ArrowRight: (i + 1) % abas.length,
      ArrowLeft: (i - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    onChange(abas[destino].id)
    refs.current[abas[destino].id]?.focus()
  }

  return (
    <div role="tablist" aria-label={rotulo} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-borda [scrollbar-width:none]">
      {abas.map(({ id, rotulo: texto, icone: Icone }) => {
        const selecionada = id === ativa
        return (
          <button
            key={id}
            ref={(el) => (refs.current[id] = el)}
            id={`aba-${id}`}
            role="tab"
            type="button"
            aria-selected={selecionada}
            aria-controls={`painel-${id}`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              '-mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors',
              selecionada ? 'border-marca text-marca-forte' : 'border-transparent text-texto-suave hover:text-texto',
            )}
          >
            {Icone && <Icone className="size-4" aria-hidden="true" />}
            {texto}
          </button>
        )
      })}
    </div>
  )
}

export function PainelAba({ id, children }) {
  return (
    <div role="tabpanel" id={`painel-${id}`} aria-labelledby={`aba-${id}`} className="pt-4">
      {children}
    </div>
  )
}

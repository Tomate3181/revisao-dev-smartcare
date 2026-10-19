import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/**
 * Modal sobre o <dialog> nativo: o navegador já cuida de prender o foco, fechar com Esc
 * e devolver o foco ao elemento que abriu (RNF03).
 */
export function Modal({ aberto, onFechar, titulo, descricao, rodape, tamanho = 'md', children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (aberto && !dialog.open) dialog.showModal()
    if (!aberto && dialog.open) dialog.close()
  }, [aberto])

  const largura = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }[tamanho]

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      // clique no fundo escurecido fecha
      onClick={(e) => e.target === ref.current && onFechar?.()}
      aria-labelledby="modal-titulo"
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-ui border border-borda bg-superficie p-0 text-texto shadow-ui',
        'backdrop:bg-black/50',
        largura,
      )}
    >
      {aberto && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-borda p-4">
            <div>
              <h2 id="modal-titulo" className="text-base font-semibold">
                {titulo}
              </h2>
              {descricao && <p className="mt-0.5 text-sm text-texto-suave">{descricao}</p>}
            </div>
            <Button variante="fantasma" tamanho="icone" onClick={onFechar} aria-label="Fechar" className="-m-2">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </header>
          <div className="overflow-y-auto p-4">{children}</div>
          {rodape && <footer className="flex justify-end gap-2 border-t border-borda p-4">{rodape}</footer>}
        </div>
      )}
    </dialog>
  )
}

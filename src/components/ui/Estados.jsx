import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

// Estados padrão de toda tela que busca dados: carregando, vazio e erro (RNF03).

export function Spinner({ className, rotulo = 'Carregando' }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-texto-suave', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{rotulo}…</span>
    </span>
  )
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-ui bg-superficie-2', className)} />
}

export function EstadoVazio({ icone: Icone = Inbox, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Icone className="size-8 text-texto-suave" aria-hidden="true" />
      <p className="font-medium text-texto">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-texto-suave">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

export function EstadoErro({ titulo = 'Não foi possível carregar os dados', descricao, onTentarNovamente }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <AlertTriangle className="size-8 text-perigo" aria-hidden="true" />
      <p className="font-medium text-texto">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-texto-suave">{descricao}</p>}
      {onTentarNovamente && (
        <Button variante="secundaria" tamanho="sm" onClick={onTentarNovamente} className="mt-2">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

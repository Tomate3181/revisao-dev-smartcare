import { AlertOctagon, AlertTriangle, CheckCircle, Clock, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { DADOS_MANCHESTER } from '@/lib/manchester'

const ICONES_MANCHESTER = {
  vermelho: ShieldAlert,
  laranja: AlertOctagon,
  amarelo: AlertTriangle,
  verde: CheckCircle,
  azul: Info,
}

/**
 * Badge de Prioridade clínica do Protocolo de Manchester (RNF03).
 * Garante acessibilidade comunicando a gravidade por COR, TEXTO e ÍCONE simultaneamente.
 */
export function PrioridadeBadge({
  prioridade,
  tamanho = 'md',
  comTempo = false,
  comNivel = false,
  className,
}) {
  const chave = prioridade?.toLowerCase()
  const info = DADOS_MANCHESTER[chave]

  const dados = info
    ? { ...info, icone: ICONES_MANCHESTER[chave] || Clock }
    : {
        rotulo: prioridade || 'Não triado',
        nivel: 'Pendente',
        tempoLimite: null,
        tempoTexto: '—',
        icone: Clock,
        estilo:
          'bg-neutro-200 text-neutro-800 border-neutro-300 dark:bg-neutro-800 dark:text-neutro-200 dark:border-neutro-700',
      }

  const Icone = dados.icone

  const classesTamanho = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }

  const classesIcone = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border shadow-xs select-none tracking-wide font-medium',
        dados.estilo,
        classesTamanho[tamanho],
        className,
      )}
      role="status"
      aria-label={`Prioridade Manchester: ${dados.rotulo}${dados.tempoLimite !== null ? `, tempo limite: ${dados.tempoTexto}` : ''}`}
    >
      <Icone className={classesIcone[tamanho]} aria-hidden="true" />
      <span>{dados.rotulo}</span>
      {comNivel && <span className="opacity-90">• {dados.nivel}</span>}
      {comTempo && dados.tempoLimite !== null && (
        <span className="opacity-90 font-mono">({dados.tempoTexto})</span>
      )}
    </span>
  )
}

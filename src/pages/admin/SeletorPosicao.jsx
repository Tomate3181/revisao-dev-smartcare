import { cn } from '@/lib/cn'

/**
 * Escolha da célula do leito na planta da ala (RF02 → base do mapa do RF06).
 * Células ocupadas por outros leitos aparecem com o código e ficam desabilitadas.
 * Sempre há uma linha extra no fim para a planta poder crescer.
 */
export function SeletorPosicao({ ala, leitos, leitoId, valor, onChange, erro }) {
  if (!ala) {
    return <p className="text-sm text-texto-suave">Selecione a ala para escolher a posição na planta.</p>
  }

  const outros = leitos.filter((l) => l.ala_id === ala.id && l.id !== leitoId)
  const ocupadas = new Map(outros.map((l) => [`${l.pos_x},${l.pos_y}`, l.codigo]))
  const maiorLinha = Math.max(ala.planta_linhas - 1, ...outros.map((l) => l.pos_y), valor.y ?? 0)
  const linhas = maiorLinha + 2
  const colunas = ala.planta_colunas

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Posição na planta</legend>
      <p className="mb-2 text-xs text-texto-suave">
        Coluna {valor.x + 1}, linha {valor.y + 1}. Clique numa célula livre para mudar.
      </p>
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(3.25rem, 1fr))` }}>
          {Array.from({ length: linhas * colunas }, (_, i) => {
            const x = i % colunas
            const y = Math.floor(i / colunas)
            const codigo = ocupadas.get(`${x},${y}`)
            const selecionada = valor.x === x && valor.y === y
            return (
              <button
                key={i}
                type="button"
                disabled={Boolean(codigo)}
                aria-pressed={selecionada}
                aria-label={codigo ? `Coluna ${x + 1}, linha ${y + 1}: ocupada por ${codigo}` : `Coluna ${x + 1}, linha ${y + 1}`}
                onClick={() => onChange({ x, y })}
                className={cn(
                  'num h-10 rounded-ui border text-[0.7rem] transition-colors',
                  codigo && 'cursor-not-allowed border-borda bg-superficie-2 text-texto-suave',
                  !codigo && !selecionada && 'border-dashed border-borda-forte hover:bg-marca-suave',
                  selecionada && 'border-marca bg-marca text-marca-texto',
                )}
              >
                {codigo ?? (selecionada ? 'aqui' : '')}
              </button>
            )
          })}
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-perigo">
          {erro}
        </p>
      )}
    </fieldset>
  )
}

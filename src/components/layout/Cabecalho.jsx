// Título padrão das páginas: h1 + descrição + ações à direita.
export function Cabecalho({ titulo, descricao, acoes }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-texto">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-texto-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}

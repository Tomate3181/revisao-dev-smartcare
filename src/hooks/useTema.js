import { useCallback, useEffect, useState } from 'react'

const CHAVE = 'smartcare:tema'

function temaInicial() {
  // O script em index.html já aplicou o tema antes do React montar; aqui só lemos o resultado.
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      // navegação anônima ou storage bloqueado: o tema só não fica salvo
    }
  }, [tema])

  const alternarTema = useCallback(() => setTema((t) => (t === 'escuro' ? 'claro' : 'escuro')), [])

  return { tema, setTema, alternarTema }
}

// Geometria da planta baixa: cada ala é uma grade de colunas × linhas e cada leito ocupa uma célula.

/** Primeira célula livre da ala (para posicionar um leito novo automaticamente). */
export function primeiraCelulaLivre(ala, leitos, leitoId) {
  if (!ala) return { x: 0, y: 0 }
  const ocupadas = new Set(leitos.filter((l) => l.ala_id === ala.id && l.id !== leitoId).map((l) => `${l.pos_x},${l.pos_y}`))
  for (let i = 0; ; i++) {
    const x = i % ala.planta_colunas
    const y = Math.floor(i / ala.planta_colunas)
    if (!ocupadas.has(`${x},${y}`)) return { x, y }
  }
}

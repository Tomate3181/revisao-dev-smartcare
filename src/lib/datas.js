// Datas do banco no formato 'AAAA-MM-DD' (colunas date). Tratadas como texto para não
// sofrer deslocamento de fuso horário (meia-noite UTC vira o dia anterior no Brasil).

export function formatarData(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dias de hoje até a data (negativo = já passou). */
export function diasAte(iso) {
  if (!iso) return null
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const alvo = Date.UTC(a, m - 1, d)
  const [ha, hm, hd] = hojeISO().split('-').map(Number)
  return Math.round((alvo - Date.UTC(ha, hm - 1, hd)) / 86_400_000)
}

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

/** Formata data/hora ISO para HH:mm */
export function formatarHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Retorna tempo decorrido amigável (ex.: 12 min, 1h 25m) */
export function tempoDecorrido(iso) {
  if (!iso) return '—'
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMin < 1) return 'Agora'
  if (diffMin < 60) return `${diffMin} min`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return `${h}h ${m}m`
}

/** Calcula a idade em anos a partir de data ISO (AAAA-MM-DD) */
export function calcularIdade(dataNasc) {
  if (!dataNasc) return '—'
  const [a, m, d] = dataNasc.slice(0, 10).split('-').map(Number)
  const hoje = new Date()
  let idade = hoje.getFullYear() - a
  const mesAtual = hoje.getMonth() + 1
  if (mesAtual < m || (mesAtual === m && hoje.getDate() < d)) idade--
  return `${idade} ${idade === 1 ? 'ano' : 'anos'}`
}

/** Formata string de 11 dígitos para 000.000.000-00 */
export function formatarCpf(cpf) {
  if (!cpf) return '—'
  const limpo = String(cpf).replace(/\D/g, '')
  if (limpo.length !== 11) return cpf
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}


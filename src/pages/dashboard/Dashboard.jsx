import { EmPreparacao } from '@/components/layout/EmPreparacao'

export default function Dashboard() {
  return (
    <EmPreparacao
      titulo="Dashboard gerencial"
      descricao="Indicadores da unidade"
      conteudo="Aqui ficarão os indicadores de prazo, espera, ocupação e permanência, com exportação em PDF e Excel."
    />
  )
}

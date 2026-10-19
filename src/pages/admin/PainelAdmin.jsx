import { useSearchParams } from 'react-router-dom'
import { BedDouble, Building2, UserRound } from 'lucide-react'
import { Cabecalho } from '@/components/layout/Cabecalho'
import { PainelAba, Tabs } from '@/components/ui'
import { AbaAlas } from './AbaAlas'
import { AbaLeitos } from './AbaLeitos'
import { AbaProfissionais } from './AbaProfissionais'

const ABAS = [
  { id: 'leitos', rotulo: 'Leitos e salas', icone: BedDouble, Componente: AbaLeitos },
  { id: 'profissionais', rotulo: 'Profissionais', icone: UserRound, Componente: AbaProfissionais },
  { id: 'alas', rotulo: 'Alas', icone: Building2, Componente: AbaAlas },
]

// RF02 e RF03 — cadastros da infraestrutura e do corpo clínico.
// A aba fica na URL (?aba=profissionais) para dar para compartilhar o link e usar o "voltar".
export default function PainelAdmin() {
  const [params, setParams] = useSearchParams()
  const ativa = ABAS.some((a) => a.id === params.get('aba')) ? params.get('aba') : ABAS[0].id
  const { Componente } = ABAS.find((a) => a.id === ativa)

  return (
    <>
      <Cabecalho titulo="Administração" descricao="Cadastro de leitos, consultórios, alas e profissionais de saúde" />
      <Tabs rotulo="Cadastros" abas={ABAS} ativa={ativa} onChange={(id) => setParams({ aba: id }, { replace: true })} />
      <PainelAba id={ativa}>
        <Componente />
      </PainelAba>
    </>
  )
}

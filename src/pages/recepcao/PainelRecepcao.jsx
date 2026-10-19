import { useSearchParams } from 'react-router-dom'
import { ClipboardList, FileUp, UserPlus } from 'lucide-react'
import { Cabecalho } from '@/components/layout/Cabecalho'
import { PainelAba, Tabs } from '@/components/ui'
import { AbaFila } from './AbaFila'
import { AbaNovaFicha } from './AbaNovaFicha'
import { AbaImportarCsv } from './AbaImportarCsv'

const ABAS = [
  { id: 'fila', rotulo: 'Fila de espera', icone: ClipboardList, Componente: AbaFila },
  { id: 'nova-ficha', rotulo: 'Nova ficha', icone: UserPlus, Componente: AbaNovaFicha },
  { id: 'importar-csv', rotulo: 'Importar CSV', icone: FileUp, Componente: AbaImportarCsv },
]

/**
 * RF04 — Módulo de Recepção e Acolhimento de Pacientes.
 * Permite cadastrar novas fichas de atendimento, visualizar a fila viva de pacientes
 * aguardando classificação e importar lotes de pacientes com validação por linha.
 */
export default function PainelRecepcao() {
  const [params, setParams] = useSearchParams()
  const ativa = ABAS.some((a) => a.id === params.get('aba')) ? params.get('aba') : ABAS[0].id
  const { Componente } = ABAS.find((a) => a.id === ativa)

  function navegarParaAba(id) {
    setParams({ aba: id }, { replace: true })
  }

  return (
    <>
      <Cabecalho
        titulo="Recepção e Acolhimento"
        descricao="Entrada de pacientes na unidade, cadastro de novas fichas e importação em lote para triagem"
      />
      <Tabs
        rotulo="Módulos da Recepção"
        abas={ABAS}
        ativa={ativa}
        onChange={navegarParaAba}
      />
      <PainelAba id={ativa}>
        <Componente
          onIrParaAba={navegarParaAba}
          onConcluido={() => navegarParaAba('fila')}
        />
      </PainelAba>
    </>
  )
}

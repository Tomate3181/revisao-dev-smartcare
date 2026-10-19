import { Construction } from 'lucide-react'
import { Card, EstadoVazio } from '@/components/ui'
import { Cabecalho } from './Cabecalho'

// Página provisória de um painel cujas funções ainda serão implementadas.
export function EmPreparacao({ titulo, descricao, conteudo }) {
  return (
    <>
      <Cabecalho titulo={titulo} descricao={descricao} />
      <Card>
        <EstadoVazio icone={Construction} titulo="Área em preparação" descricao={conteudo} />
      </Card>
    </>
  )
}

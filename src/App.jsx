// Página TEMPORÁRIA (Passo 1): vitrine dos tokens e componentes ui/.
// No Passo 5 este arquivo passa a montar as rotas protegidas por perfil.
import { useState } from 'react'
import { Moon, Sun, CheckCircle2, Database } from 'lucide-react'
import { toast } from 'sonner'

import { useTema } from '@/hooks/useTema'
import { supabaseConfigurado } from '@/lib/supabase'
import {
  Badge,
  Button,
  Card,
  CardCabecalho,
  CardConteudo,
  EstadoVazio,
  Input,
  Modal,
  Select,
  Skeleton,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui'

const manchester = [
  { cor: 'vermelho', nome: 'Emergência', tempo: '0 min', classe: 'bg-manchester-vermelho text-manchester-vermelho-texto' },
  { cor: 'laranja', nome: 'Muito urgente', tempo: '10 min', classe: 'bg-manchester-laranja text-manchester-laranja-texto' },
  { cor: 'amarelo', nome: 'Urgente', tempo: '60 min', classe: 'bg-manchester-amarelo text-manchester-amarelo-texto' },
  { cor: 'verde', nome: 'Pouco urgente', tempo: '120 min', classe: 'bg-manchester-verde text-manchester-verde-texto' },
  { cor: 'azul', nome: 'Não urgente', tempo: '240 min', classe: 'bg-manchester-azul text-manchester-azul-texto' },
]

export default function App() {
  const { tema, alternarTema } = useTema()
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Smart Care</h1>
          <p className="text-sm text-texto-suave">Design tokens e componentes base</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tom={supabaseConfigurado ? 'ok' : 'aviso'} icone={Database}>
            {supabaseConfigurado ? 'Supabase configurado' : 'Sem .env do Supabase'}
          </Badge>
          <Button
            variante="secundaria"
            tamanho="icone"
            onClick={alternarTema}
            aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
          >
            {tema === 'escuro' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </header>

      <Card>
        <CardCabecalho titulo="Cores de Manchester" descricao="Exclusivas da classificação de risco — sempre com texto junto da cor." />
        <CardConteudo className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {manchester.map((m) => (
            <div key={m.cor} className={`rounded-ui p-3 ${m.classe}`}>
              <p className="text-sm font-semibold capitalize">{m.cor}</p>
              <p className="text-xs">{m.nome}</p>
              <p className="num text-xs">até {m.tempo}</p>
            </div>
          ))}
        </CardConteudo>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardCabecalho titulo="Botões e badges" />
          <CardConteudo className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.success('Paciente encaminhado')}>Mostrar toast</Button>
              <Button variante="secundaria" onClick={() => setModalAberto(true)}>
                Abrir modal
              </Button>
              <Button variante="fantasma">Fantasma</Button>
              <Button variante="perigo">Excluir</Button>
              <Button carregando>Salvando</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Neutro</Badge>
              <Badge tom="marca">Marca</Badge>
              <Badge tom="ok" icone={CheckCircle2}>
                Ativo
              </Badge>
              <Badge tom="aviso">Vence em 15 dias</Badge>
              <Badge tom="perigo">Vencido</Badge>
            </div>
          </CardConteudo>
        </Card>

        <Card>
          <CardCabecalho titulo="Formulário" />
          <CardConteudo className="flex flex-col gap-3">
            <Input label="Nome do paciente" obrigatorio placeholder="Ex.: Maria da Silva" />
            <Input label="SpO₂ (%)" type="number" erro="Informe um valor entre 50 e 100" />
            <Select
              label="Convênio"
              dica="Selecione SUS se não houver convênio"
              placeholder="Selecione"
              defaultValue=""
              opcoes={[
                { valor: 'sus', rotulo: 'SUS' },
                { valor: 'particular', rotulo: 'Particular' },
              ]}
            />
          </CardConteudo>
        </Card>
      </div>

      <Card>
        <CardCabecalho titulo="Tabela e estados" />
        <CardConteudo className="flex flex-col gap-4">
          <Table legenda="Exemplo de tabela">
            <thead>
              <tr>
                <Th>Leito</Th>
                <Th>Ala</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td className="num">UTI-01</Td>
                <Td>UTI Adulto</Td>
                <Td>
                  <Badge>Higienização</Badge>
                </Td>
              </tr>
            </tbody>
          </Table>
          <div className="flex flex-wrap items-center gap-4">
            <Spinner />
            <Skeleton className="h-6 w-40" />
          </div>
          <EstadoVazio titulo="Nenhum paciente na fila" descricao="Quando a recepção cadastrar uma ficha, ela aparece aqui." />
        </CardConteudo>
      </Card>

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Excluir leito UTI-01?"
        descricao="Essa ação não pode ser desfeita."
        rodape={
          <>
            <Button variante="secundaria" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button variante="perigo" onClick={() => setModalAberto(false)}>
              Excluir UTI-01
            </Button>
          </>
        }
      >
        <p className="text-sm">O Esc fecha, e o foco volta para o botão que abriu.</p>
      </Modal>
    </div>
  )
}

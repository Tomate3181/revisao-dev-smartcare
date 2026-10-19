import { useQuery } from '@tanstack/react-query'
import { History, RefreshCw } from 'lucide-react'
import { PrioridadeBadge } from '@/components/PrioridadeBadge'
import { calcularIdade, formatarCpf, formatarHora, tempoDecorrido } from '@/lib/datas'
import { triagemService } from '@/services/triagem'
import {
  Badge,
  BotaoIcone,
  Card,
  CardCabecalho,
  CardConteudo,
  EstadoErro,
  EstadoVazio,
  Skeleton,
  Table,
  Td,
  Th,
} from '@/components/ui'

export function HistoricoTriados() {
  const {
    data: triados = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['triados_recentes'],
    queryFn: () => triagemService.listarTriadosRecentes(),
  })

  return (
    <Card>
      <CardCabecalho
        titulo="Atendimentos Triados Recentemente"
        descricao="Histórico dos últimos pacientes classificados e encaminhados para atendimento médico."
        acoes={
          <BotaoIcone
            icone={RefreshCw}
            rotulo="Atualizar histórico"
            className={isFetching ? 'animate-spin' : ''}
            onClick={() => refetch()}
          />
        }
      />
      <CardConteudo>
        {isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : isError ? (
          <EstadoErro
            titulo="Erro ao carregar histórico"
            descricao={error?.message || 'Não foi possível carregar os atendimentos triados.'}
            onTentarNovamente={() => refetch()}
          />
        ) : triados.length === 0 ? (
          <EstadoVazio
            icone={History}
            titulo="Nenhum atendimento triado recente"
            descricao="Assim que você classificar pacientes na fila de triagem, eles aparecerão registrados aqui."
          />
        ) : (
          <Table legenda="Pacientes triados recentemente">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Triado às</Th>
                <Th>Classificação Manchester</Th>
                <Th>Origem</Th>
                <Th>Médico Alocado</Th>
                <Th>Leito / Sala</Th>
              </tr>
            </thead>
            <tbody>
              {triados.map((item) => (
                <tr key={item.id} className="hover:bg-neutro-50/50 dark:hover:bg-neutro-900/40">
                  <Td>
                    <p className="font-medium text-texto">{item.paciente?.nome}</p>
                    <p className="text-xs text-texto-suave">
                      {calcularIdade(item.paciente?.data_nascimento)} ({item.paciente?.sexo}) • {formatarCpf(item.paciente?.cpf)}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <p className="font-medium text-texto">{formatarHora(item.triagem_em)}</p>
                    <p className="text-xs text-texto-suave">há {tempoDecorrido(item.triagem_em)}</p>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <PrioridadeBadge prioridade={item.prioridade} tamanho="sm" comTempo />
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Badge tom={item.classificacao_origem === 'manual' ? 'aviso' : 'neutro'}>
                      {item.classificacao_origem === 'manual' ? 'Alterado (Manual)' : 'Motor Local'}
                    </Badge>
                  </Td>
                  <Td>
                    <p className="text-xs font-medium text-texto">
                      {item.medico?.nome ?? 'Aguardando médico'}
                    </p>
                    {item.medico?.especialidade && (
                      <p className="text-[11px] text-texto-suave">{item.medico.especialidade}</p>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {item.leito?.codigo ? (
                      <span className="font-mono text-xs font-medium">
                        {item.leito.codigo} ({item.leito.tipo})
                      </span>
                    ) : (
                      <span className="text-xs italic text-texto-suave">Sala de espera</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardConteudo>
    </Card>
  )
}

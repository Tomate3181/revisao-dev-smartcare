import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Brain,
  CheckCircle,
  History,
  RefreshCw,
  Search,
  Syringe,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PrioridadeBadge } from '@/components/PrioridadeBadge'
import { classificarManchester } from '@/lib/manchester'
import { calcularIdade, formatarCpf, formatarHora, tempoDecorrido } from '@/lib/datas'
import { Cabecalho } from '@/components/layout/Cabecalho'
import {
  BotaoIcone,
  Button,
  Card,
  CardCabecalho,
  CardConteudo,
  EstadoErro,
  EstadoVazio,
  Input,
  PainelAba,
  Skeleton,
  Table,
  Tabs,
  Td,
  Th,
} from '@/components/ui'
import { triagemService } from '@/services/triagem'
import { FichaTriagemModal } from './FichaTriagemModal'
import { HistoricoTriados } from './HistoricoTriados'

export default function PainelTriagem() {
  const [params, setParams] = useSearchParams()
  const abaAtiva = params.get('aba') || 'fila'
  const queryClient = useQueryClient()

  const [busca, setBusca] = useState('')
  const [triandoAtendimento, setTriandoAtendimento] = useState(null)

  // Consulta da fila de espera para triagem
  const {
    data: fila = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['fila_triagem_enfermeiro'],
    queryFn: () => triagemService.listarFila(),
    refetchInterval: 10_000,
  })

  // Consulta dos recursos disponíveis (médicos, leitos e atendimentos ativos)
  const { data: recursos } = useQuery({
    queryKey: ['recursos_alocacao'],
    queryFn: () => triagemService.buscarRecursosAlocacao(),
  })

  // Realtime para atualizar a fila automaticamente
  useEffect(() => {
    const canal = supabase
      .channel('fila_triagem_mudancas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atendimentos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['fila_triagem_enfermeiro'] })
          queryClient.invalidateQueries({ queryKey: ['triados_recentes'] })
          queryClient.invalidateQueries({ queryKey: ['recursos_alocacao'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [queryClient])

  // Filtro de busca na fila
  const filaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const termoNumeros = termo.replace(/\D/g, '')
    if (!termo) return fila

    return fila.filter((item) => {
      const nome = item.paciente?.nome?.toLowerCase() ?? ''
      const cpf = item.paciente?.cpf ?? ''
      const queixa = item.queixa_principal?.toLowerCase() ?? ''
      return nome.includes(termo) || cpf.includes(termoNumeros) || queixa.includes(termo)
    })
  }, [fila, busca])

  const ABAS = [
    {
      id: 'fila',
      rotulo: `Aguardando triagem (${fila.length})`,
      icone: Users,
    },
    {
      id: 'historico',
      rotulo: 'Triados recentemente',
      icone: History,
    },
  ]

  return (
    <>
      <Cabecalho
        titulo="Triagem de Manchester"
        descricao="Classificação de gravidade clínica, estimativa de tempo-limite e alocação de equipe médica e leitos"
      />

      <Tabs
        rotulo="Módulos da Triagem"
        abas={ABAS}
        ativa={abaAtiva}
        onChange={(id) => setParams({ aba: id }, { replace: true })}
      />

      <PainelAba id={abaAtiva}>
        {abaAtiva === 'fila' ? (
          <Card>
            <CardCabecalho
              titulo="Fila de Acolhimento — Aguardando Classificação de Risco"
              descricao="Selecione um paciente para abrir a ficha clínica, aferir os parâmetros vitais e validar a prioridade de Manchester."
              acoes={
                <div className="flex items-center gap-2">
                  <BotaoIcone
                    icone={RefreshCw}
                    rotulo="Atualizar fila"
                    className={isFetching ? 'animate-spin' : ''}
                    onClick={() => refetch()}
                  />
                </div>
              }
            />
            <CardConteudo>
              {/* Barra de busca e informações de retaguarda */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-3 py-1 text-xs font-semibold text-marca-700 dark:bg-marca-950/50 dark:text-marca-300">
                    <Users className="size-3.5" aria-hidden="true" />
                    {fila.length} {fila.length === 1 ? 'paciente na fila' : 'pacientes na fila'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-texto-suave">
                    <Brain className="size-3.5" />
                    Motor Local de Decisão Ativo
                  </span>
                </div>
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Buscar por paciente, CPF ou queixa..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    aria-label="Buscar na fila de triagem"
                  />
                </div>
              </div>

              {isPending ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : isError ? (
                <EstadoErro
                  titulo="Erro ao carregar fila de triagem"
                  descricao={error?.message || 'Falha ao buscar os atendimentos da recepção.'}
                  onTentarNovamente={() => refetch()}
                />
              ) : fila.length === 0 ? (
                <EstadoVazio
                  icone={CheckCircle}
                  titulo="Fila de triagem vazia"
                  descricao="Não há pacientes aguardando triagem neste momento. Novos pacientes cadastrados na recepção aparecerão aqui em tempo real."
                />
              ) : filaFiltrada.length === 0 ? (
                <EstadoVazio
                  icone={Search}
                  titulo="Nenhum paciente localizado"
                  descricao={`Nenhum atendimento na fila corresponde à busca "${busca}".`}
                  acao={
                    <Button variante="secundaria" onClick={() => setBusca('')}>
                      Limpar filtro
                    </Button>
                  }
                />
              ) : (
                <Table legenda="Pacientes aguardando triagem">
                  <thead>
                    <tr>
                      <Th>Paciente</Th>
                      <Th>Chegada / Espera</Th>
                      <Th>Queixa Principal</Th>
                      <Th>Prévia do Motor</Th>
                      <Th className="text-right">Ação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filaFiltrada.map((item) => {
                      const p = item.paciente
                      const sv = item.sinais_vitais?.[0] || {}

                      // Pré-classificação do motor com os sinais iniciais da recepção
                      const previa = classificarManchester({
                        queixa: item.queixa_principal,
                        sintomas: item.sintomas,
                        sinaisVitais: sv,
                      })

                      return (
                        <tr key={item.id} className="hover:bg-neutro-50/50 dark:hover:bg-neutro-900/40">
                          <Td>
                            <p className="font-semibold text-texto">{p?.nome}</p>
                            <p className="text-xs text-texto-suave">
                              {calcularIdade(p?.data_nascimento)} ({p?.sexo}) • {formatarCpf(p?.cpf)}
                            </p>
                          </Td>
                          <Td className="whitespace-nowrap">
                            <p className="font-medium text-texto">{formatarHora(item.chegada_em)}</p>
                            <p className="text-xs text-texto-suave">espera: {tempoDecorrido(item.chegada_em)}</p>
                          </Td>
                          <Td>
                            <p className="line-clamp-2 text-sm text-texto" title={item.queixa_principal}>
                              {item.queixa_principal}
                            </p>
                          </Td>
                          <Td className="whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <PrioridadeBadge prioridade={previa.cor} tamanho="sm" comTempo />
                              <span className="text-[11px] text-texto-suave">
                                {previa.especialidade}
                              </span>
                            </div>
                          </Td>
                          <Td className="text-right whitespace-nowrap">
                            <Button onClick={() => setTriandoAtendimento(item)}>
                              <Syringe className="size-4" aria-hidden="true" />
                              Triar paciente
                            </Button>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardConteudo>
          </Card>
        ) : (
          <HistoricoTriados />
        )}
      </PainelAba>

      {/* Modal interativo de classificação de Manchester */}
      {triandoAtendimento && (
        <FichaTriagemModal
          atendimento={triandoAtendimento}
          recursos={recursos}
          onFechar={() => setTriandoAtendimento(null)}
          onSucesso={() => {
            setTriandoAtendimento(null)
            queryClient.invalidateQueries({ queryKey: ['fila_triagem_enfermeiro'] })
            queryClient.invalidateQueries({ queryKey: ['triados_recentes'] })
            queryClient.invalidateQueries({ queryKey: ['recursos_alocacao'] })
          }}
        />
      )}
    </>
  )
}

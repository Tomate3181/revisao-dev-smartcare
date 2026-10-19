import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp, Plus, RefreshCw, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcularIdade, formatarCpf, formatarHora, tempoDecorrido } from '@/lib/datas'
import { recepcaoService } from '@/services/recepcao'
import {
  Badge,
  BotaoIcone,
  Button,
  Card,
  CardCabecalho,
  CardConteudo,
  EstadoErro,
  EstadoVazio,
  Input,
  Skeleton,
  Table,
  Td,
  Th,
} from '@/components/ui'

export function AbaFila({ onIrParaAba }) {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')

  const {
    data: fila = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['fila_triagem'],
    queryFn: () => recepcaoService.listarFila(),
    refetchInterval: 15_000, // Atualização periódica de retaguarda
  })

  // Inscrição em tempo real (Realtime) nas alterações de atendimentos
  useEffect(() => {
    const canal = supabase
      .channel('fila_recepcao_mudancas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atendimentos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['fila_triagem'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [queryClient])

  // Filtro por nome ou CPF
  const filaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace(/\D/g, '')
    const termoTexto = busca.trim().toLowerCase()
    if (!termoTexto) return fila

    return fila.filter((item) => {
      const nome = item.paciente?.nome?.toLowerCase() ?? ''
      const cpf = item.paciente?.cpf ?? ''
      const queixa = item.queixa_principal?.toLowerCase() ?? ''
      return nome.includes(termoTexto) || cpf.includes(termo) || queixa.includes(termoTexto)
    })
  }, [fila, busca])

  return (
    <Card>
      <CardCabecalho
        titulo="Fila de Acolhimento — Aguardando Triagem"
        descricao="Pacientes que deram entrada na recepção e aguardam classificação de risco pelo Protocolo de Manchester."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <BotaoIcone
              icone={RefreshCw}
              rotulo="Atualizar fila"
              className={isFetching ? 'animate-spin' : ''}
              onClick={() => refetch()}
            />
            <Button variante="secundaria" onClick={() => onIrParaAba('importar-csv')}>
              <FileUp className="size-4" aria-hidden="true" /> Importar CSV
            </Button>
            <Button onClick={() => onIrParaAba('nova-ficha')}>
              <Plus className="size-4" aria-hidden="true" /> Nova ficha
            </Button>
          </div>
        }
      />
      <CardConteudo>
        {/* Barra de estatísticas e busca rápida */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-3 py-1 text-xs font-semibold text-marca-700 dark:bg-marca-950/50 dark:text-marca-300">
              <Users className="size-3.5" aria-hidden="true" />
              {fila.length} {fila.length === 1 ? 'paciente aguardando' : 'pacientes aguardando'}
            </span>
            {busca && (
              <span className="text-xs text-texto-suave">
                ({filaFiltrada.length} encontrado{filaFiltrada.length === 1 ? '' : 's'})
              </span>
            )}
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Buscar por nome, CPF ou queixa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar na fila"
            />
          </div>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : isError ? (
          <EstadoErro
            titulo="Não foi possível carregar a fila de triagem"
            descricao={error?.message || 'Ocorreu um erro ao consultar os atendimentos.'}
            onTentarNovamente={() => refetch()}
          />
        ) : fila.length === 0 ? (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum paciente aguardando triagem"
            descricao="Todos os pacientes que deram entrada já foram triados ou a unidade está sem novas chegadas."
            acao={
              <Button onClick={() => onIrParaAba('nova-ficha')}>
                <Plus className="size-4" aria-hidden="true" /> Cadastrar nova ficha
              </Button>
            }
          />
        ) : filaFiltrada.length === 0 ? (
          <EstadoVazio
            icone={Search}
            titulo="Nenhum paciente encontrado"
            descricao={`Nenhum atendimento em espera corresponde ao filtro "${busca}".`}
            acao={
              <Button variante="secundaria" onClick={() => setBusca('')}>
                Limpar filtro
              </Button>
            }
          />
        ) : (
          <Table legenda="Fila de pacientes aguardando triagem">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Chegada / Espera</Th>
                <Th>Convênio</Th>
                <Th>Queixa Principal</Th>
                <Th>Sinais Vitais Iniciais</Th>
                <Th className="text-center">Origem</Th>
              </tr>
            </thead>
            <tbody>
              {filaFiltrada.map((item) => {
                const p = item.paciente
                const sv = item.sinais_vitais?.[0]
                const temSinais = sv && (sv.pa_sistolica || sv.temperatura || sv.frequencia_cardiaca || sv.saturacao)

                return (
                  <tr key={item.id} className="hover:bg-neutro-50/50 dark:hover:bg-neutro-900/40">
                    <Td>
                      <div>
                        <p className="font-medium text-texto">{p?.nome ?? 'Não identificado'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
                          <span>{p?.data_nascimento ? `${calcularIdade(p.data_nascimento)} (${p.sexo})` : '—'}</span>
                          <span>•</span>
                          <span className="font-mono">{formatarCpf(p?.cpf)}</span>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <p className="font-medium text-texto">{formatarHora(item.chegada_em)}</p>
                      <p className="text-xs text-texto-suave">espera: {tempoDecorrido(item.chegada_em)}</p>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <p className="text-sm font-medium">{p?.convenio ?? 'SUS'}</p>
                      {p?.numero_carteirinha && (
                        <p className="font-mono text-xs text-texto-suave">Cartão: {p.numero_carteirinha}</p>
                      )}
                    </Td>
                    <Td>
                      <p className="line-clamp-2 text-sm text-texto" title={item.queixa_principal}>
                        {item.queixa_principal}
                      </p>
                      {item.sintomas?.length > 0 && (
                        <p className="mt-0.5 text-xs text-texto-suave">
                          Sintomas: {item.sintomas.join(', ')}
                        </p>
                      )}
                    </Td>
                    <Td>
                      {temSinais ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {sv.pa_sistolica && sv.pa_diastolica && (
                            <span className="inline-flex items-center rounded bg-neutro-100 px-1.5 py-0.5 font-mono text-neutro-800 dark:bg-neutro-800 dark:text-neutro-200">
                              PA {sv.pa_sistolica}/{sv.pa_diastolica}
                            </span>
                          )}
                          {sv.temperatura && (
                            <span className="inline-flex items-center rounded bg-neutro-100 px-1.5 py-0.5 font-mono text-neutro-800 dark:bg-neutro-800 dark:text-neutro-200">
                              {Number(sv.temperatura).toFixed(1)}°C
                            </span>
                          )}
                          {sv.frequencia_cardiaca && (
                            <span className="inline-flex items-center rounded bg-neutro-100 px-1.5 py-0.5 font-mono text-neutro-800 dark:bg-neutro-800 dark:text-neutro-200">
                              {sv.frequencia_cardiaca} bpm
                            </span>
                          )}
                          {sv.saturacao && (
                            <span className="inline-flex items-center rounded bg-neutro-100 px-1.5 py-0.5 font-mono text-neutro-800 dark:bg-neutro-800 dark:text-neutro-200">
                              SpO₂ {sv.saturacao}%
                            </span>
                          )}
                          {sv.dor !== null && sv.dor !== undefined && (
                            <span className="inline-flex items-center rounded bg-neutro-100 px-1.5 py-0.5 font-mono text-neutro-800 dark:bg-neutro-800 dark:text-neutro-200">
                              Dor {sv.dor}/10
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs italic text-texto-suave">Aferição na triagem</span>
                      )}
                    </Td>
                    <Td className="text-center whitespace-nowrap">
                      <Badge tom={item.origem === 'csv' ? 'neutro' : 'marca'}>
                        {item.origem === 'csv' ? 'CSV' : 'Manual'}
                      </Badge>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </CardConteudo>
    </Card>
  )
}

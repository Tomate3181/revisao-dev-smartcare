import { useState } from 'react'
import Papa from 'papaparse'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Upload,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { formatarCpf } from '@/lib/datas'
import { recepcaoService, validarLinhaCsv } from '@/services/recepcao'
import {
  Badge,
  Button,
  Card,
  CardCabecalho,
  CardConteudo,
  EstadoVazio,
  Table,
  Td,
  Th,
} from '@/components/ui'

export function AbaImportarCsv({ onConcluido }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [arquivoNome, setArquivoNome] = useState('')
  const [analise, setAnalise] = useState(null)
  const [importando, setImportando] = useState(false)
  const [resultadoFinal, setResultadoFinal] = useState(null)

  // Processa o conteúdo CSV e valida linha por linha
  function processarCsvTexto(texto, nome = 'arquivo.csv') {
    setArquivoNome(nome)
    setResultadoFinal(null)

    Papa.parse(texto, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          toast.error('O arquivo CSV selecionado está vazio ou ilegível.')
          setAnalise(null)
          return
        }

        const linhasAnalisadas = results.data.map((linha, idx) =>
          validarLinhaCsv(linha, idx + 2),
        )

        const validas = linhasAnalisadas.filter((l) => l.valida)
        const invalidas = linhasAnalisadas.filter((l) => !l.valida)

        setAnalise({
          total: linhasAnalisadas.length,
          linhas: linhasAnalisadas,
          validas,
          invalidas,
        })

        toast.info(
          `Arquivo analisado: ${validas.length} linhas válidas e ${invalidas.length} com inconsistências.`,
        )
      },
      error: (err) => {
        toast.error(`Falha ao ler o arquivo CSV: ${err.message}`)
      },
    })
  }

  // Upload manual de arquivo
  function onArquivoSelecionado(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      processarCsvTexto(event.target.result, file.name)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  // Carrega automaticamente o arquivo de exemplo de demonstração
  async function carregarExemploDemo() {
    try {
      const resp = await fetch('/pacientes_exemplo.csv')
      if (!resp.ok) throw new Error('Arquivo de exemplo não encontrado.')
      const texto = await resp.text()
      processarCsvTexto(texto, 'pacientes_exemplo.csv')
    } catch (err) {
      toast.error(`Não foi possível carregar o exemplo: ${err.message}`)
    }
  }

  // Executa a importação dos registros válidos
  async function executarImportacao() {
    if (!analise || analise.validas.length === 0) return

    setImportando(true)
    try {
      const linhasParaImportar = analise.validas.map((v) => v.dados)
      const res = await recepcaoService.importarLote(linhasParaImportar, profile?.id)

      queryClient.invalidateQueries({ queryKey: ['fila_triagem'] })

      setResultadoFinal(res)
      toast.success(`${res.sucessos} pacientes importados e enviados para a fila de triagem!`)
    } catch (err) {
      toast.error(`Erro ao importar pacientes: ${err.message}`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardCabecalho
          titulo="Importação de Pacientes em Lote (CSV)"
          descricao="Carregue listas de pacientes para admissão em massa na recepção. O sistema pré-visualiza os dados, valida cada linha e permite importar apenas as linhas válidas."
        />
        <CardConteudo>
          {/* Instruções e ações de upload */}
          <div className="flex flex-col gap-4 rounded-lg border border-neutro-200 bg-neutro-50/50 p-5 dark:border-neutro-800 dark:bg-neutro-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-texto">Selecione o arquivo CSV</h2>
                <p className="text-xs text-texto-suave">
                  Colunas esperadas: nome, cpf, data_nascimento, sexo, telefone, convenio, numero_carteirinha, queixa_principal, sinais vitais.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variante="secundaria"
                  onClick={carregarExemploDemo}
                  desabilitado={importando}
                >
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  Carregar pacientes_exemplo.csv
                </Button>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-marca-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-marca-700 focus:outline-none focus:ring-2 focus:ring-marca-500 focus:ring-offset-2">
                  <Upload className="size-4" aria-hidden="true" />
                  Escolher arquivo CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={onArquivoSelecionado}
                    disabled={importando}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Resultado pós-importação */}
          {resultadoFinal && (
            <div className="mt-6 rounded-lg border border-ok-200 bg-ok-50 p-4 text-ok-900 dark:border-ok-800 dark:bg-ok-950/40 dark:text-ok-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-ok-600 dark:text-ok-400" />
                  <span className="font-semibold">
                    Importação concluída com sucesso: {resultadoFinal.sucessos} pacientes adicionados à fila de triagem.
                  </span>
                </div>
                {onConcluido && (
                  <Button onClick={onConcluido}>
                    Ver fila de espera
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Pré-visualização da análise */}
          {analise ? (
            <div className="mt-6 flex flex-col gap-4">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-neutro-200 p-4 dark:border-neutro-800">
                  <p className="text-xs text-texto-suave">Arquivo analisado</p>
                  <p className="text-lg font-semibold text-texto">{arquivoNome}</p>
                  <p className="text-xs text-texto-suave">{analise.total} linhas no total</p>
                </div>
                <div className="rounded-lg border border-ok-200 bg-ok-50/50 p-4 dark:border-ok-900 dark:bg-ok-950/20">
                  <p className="text-xs text-ok-700 dark:text-ok-300">Linhas válidas para importação</p>
                  <p className="text-2xl font-bold text-ok-600 dark:text-ok-400">{analise.validas.length}</p>
                  <p className="text-xs text-ok-700 dark:text-ok-300">Prontas para entrar na fila</p>
                </div>
                <div className="rounded-lg border border-perigo-200 bg-perigo-50/50 p-4 dark:border-perigo-900 dark:bg-perigo-950/20">
                  <p className="text-xs text-perigo-700 dark:text-perigo-300">Linhas com inconsistência</p>
                  <p className="text-2xl font-bold text-perigo-600 dark:text-perigo-400">{analise.invalidas.length}</p>
                  <p className="text-xs text-perigo-700 dark:text-perigo-300">Serão ignoradas na importação</p>
                </div>
              </div>

              {/* Botão de confirmação de importação */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-y border-neutro-200 py-3 dark:border-neutro-800">
                <div className="text-xs text-texto-suave">
                  {analise.validas.length > 0
                    ? `Clique no botão ao lado para importar os ${analise.validas.length} pacientes válidos. As ${analise.invalidas.length} linhas com erro serão descartadas.`
                    : 'Nenhuma linha válida encontrada para importar. Corrija o arquivo e tente novamente.'}
                </div>
                <Button
                  onClick={executarImportacao}
                  carregando={importando}
                  desabilitado={analise.validas.length === 0 || importando}
                >
                  <FileUp className="size-4" aria-hidden="true" />
                  Importar {analise.validas.length} pacientes válidos
                </Button>
              </div>

              {/* Tabela detalhada de conferência de linhas */}
              <Table legenda="Pré-visualização e validação das linhas do CSV">
                <thead>
                  <tr>
                    <Th className="w-16 text-center">Linha</Th>
                    <Th>Status</Th>
                    <Th>Paciente</Th>
                    <Th>CPF</Th>
                    <Th>Queixa Principal</Th>
                    <Th>Diagnóstico / Inconsistências</Th>
                  </tr>
                </thead>
                <tbody>
                  {analise.linhas.map((item) => (
                    <tr
                      key={item.numeroLinha}
                      className={
                        item.valida
                          ? 'hover:bg-ok-50/30 dark:hover:bg-ok-950/10'
                          : 'bg-perigo-50/30 hover:bg-perigo-50/50 dark:bg-perigo-950/20 dark:hover:bg-perigo-950/30'
                      }
                    >
                      <Td className="text-center font-mono text-xs">{item.numeroLinha}</Td>
                      <Td>
                        {item.valida ? (
                          <Badge tom="ok">
                            <CheckCircle2 className="mr-1 size-3" /> Válida
                          </Badge>
                        ) : (
                          <Badge tom="perigo">
                            <XCircle className="mr-1 size-3" /> Inválida
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        <p className="font-medium text-texto">{item.dados.nome || <span className="italic text-perigo-600 dark:text-perigo-400">[Nome ausente]</span>}</p>
                        <p className="text-xs text-texto-suave">
                          {item.dados.data_nascimento || '—'} ({item.dados.sexo || '—'}) • {item.dados.convenio || 'SUS'}
                        </p>
                      </Td>
                      <Td className="font-mono text-xs">
                        {item.dados.cpf ? formatarCpf(item.dados.cpf) : <span className="italic text-perigo-600">[Vazio]</span>}
                      </Td>
                      <Td>
                        <p className="line-clamp-2 text-xs text-texto">{item.dados.queixa_principal || <span className="italic text-perigo-600">[Vazio]</span>}</p>
                      </Td>
                      <Td>
                        {item.valida ? (
                          <span className="text-xs text-ok-700 dark:text-ok-300">Pronto para cadastro</span>
                        ) : (
                          <ul className="list-inside list-disc text-xs text-perigo-700 dark:text-perigo-300">
                            {item.erros.map((e, idx) => (
                              <li key={idx}>{e}</li>
                            ))}
                          </ul>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="mt-4">
              <EstadoVazio
                icone={FileSpreadsheet}
                titulo="Nenhum arquivo CSV carregado"
                descricao="Envie uma planilha .csv do seu computador ou use o botão 'Carregar pacientes_exemplo.csv' para testar a validação e importação em lote."
                acao={
                  <Button variante="secundaria" onClick={carregarExemploDemo}>
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    Carregar arquivo de demonstração
                  </Button>
                }
              />
            </div>
          )}
        </CardConteudo>
      </Card>
    </div>
  )
}

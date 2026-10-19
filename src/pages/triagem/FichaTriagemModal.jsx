import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { PrioridadeBadge } from '@/components/PrioridadeBadge'
import { classificarManchester, TEMPOS_MANCHESTER } from '@/lib/manchester'
import { recomendarAlocacao } from '@/lib/alocacao'
import { calcularIdade, formatarCpf, formatarHora } from '@/lib/datas'
import { triagemService } from '@/services/triagem'
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/ui'

const CORES_MANCHESTER = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul']

export function FichaTriagemModal({
  atendimento,
  recursos,
  onFechar,
  onSucesso,
}) {
  const { profile } = useAuth()
  const p = atendimento.paciente
  const svInicial = atendimento.sinais_vitais?.[0] || {}

  // Idade calculada para o discriminador pediátrico
  const idadeNumero = p?.data_nascimento
    ? parseInt(calcularIdade(p.data_nascimento), 10) || null
    : null

  // Estado dos sinais vitais editáveis na triagem
  const [sinais, setSinais] = useState({
    pa_sistolica: svInicial.pa_sistolica ?? '',
    pa_diastolica: svInicial.pa_diastolica ?? '',
    frequencia_cardiaca: svInicial.frequencia_cardiaca ?? '',
    frequencia_respiratoria: svInicial.frequencia_respiratoria ?? '',
    temperatura: svInicial.temperatura ?? '',
    saturacao: svInicial.saturacao ?? '',
    dor: svInicial.dor ?? '',
    glasgow: svInicial.glasgow ?? 15,
    glicemia: svInicial.glicemia ?? '',
  })

  function atualizarSinal(campo, valor) {
    setSinais((prev) => ({ ...prev, [campo]: valor }))
  }

  // 1. Motor Local de Decisão de Manchester (atualiza instantaneamente offline)
  const classificacaoSugerida = useMemo(() => {
    return classificarManchester({
      queixa: atendimento.queixa_principal,
      sintomas: atendimento.sintomas,
      sinaisVitais: sinais,
      idade: idadeNumero,
    })
  }, [atendimento.queixa_principal, atendimento.sintomas, sinais, idadeNumero])

  // Estado da classificação escolhida pelo enfermeiro
  const [prioridadeEscolhida, setPrioridadeEscolhida] = useState(null)
  const prioridadeFinal = prioridadeEscolhida || classificacaoSugerida.cor
  const [motivoAlteracao, setMotivoAlteracao] = useState('')

  // 2. Motor de Alocação Clínica (recomenda médico e leito)
  const alocacaoSugerida = useMemo(() => {
    return recomendarAlocacao({
      prioridade: prioridadeFinal,
      especialidade: classificacaoSugerida.especialidade,
      profissionais: recursos?.profissionais ?? [],
      leitos: recursos?.leitos ?? [],
      atendimentosAtivos: recursos?.atendimentosAtivos ?? [],
    })
  }, [prioridadeFinal, classificacaoSugerida.especialidade, recursos])

  // Estados de médico e leito alocados
  const [medicoSelecionado, setMedicoSelecionado] = useState(null)
  const [leitoSelecionado, setLeitoSelecionado] = useState(null)

  const medicoFinal = medicoSelecionado !== null ? medicoSelecionado : alocacaoSugerida.medicoId
  const leitoFinal = leitoSelecionado !== null ? leitoSelecionado : alocacaoSugerida.leitoId

  const foiAlterada = prioridadeFinal !== classificacaoSugerida.cor
  const [salvando, setSalvando] = useState(false)

  // Submissão da triagem
  async function confirmarTriagem() {
    if (foiAlterada && (!motivoAlteracao || motivoAlteracao.trim().length < 3)) {
      toast.error('Informe a justificativa clínica para alterar a cor sugerida pelo protocolo.')
      return
    }

    setSalvando(true)
    try {
      await triagemService.concluirTriagem({
        atendimentoId: atendimento.id,
        prioridadeSugerida: classificacaoSugerida.cor,
        prioridadeFinal: prioridadeFinal,
        classificacaoOrigem: foiAlterada ? 'manual' : 'motor_local',
        justificativaTriagem: classificacaoSugerida.justificativa,
        motivoAlteracao: foiAlterada ? motivoAlteracao.trim() : null,
        tempoLimiteMin: TEMPOS_MANCHESTER[prioridadeFinal],
        medicoId: medicoFinal || null,
        leitoId: leitoFinal || null,
        sinaisVitais: sinais,
        enfermeiroId: profile?.id,
      })

      toast.success(`Triagem de ${p?.nome} concluída com prioridade ${prioridadeFinal.toUpperCase()}!`)
      if (onSucesso) onSucesso()
    } catch (err) {
      toast.error(`Falha ao registrar triagem: ${err.message}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      tamanho="xl"
      titulo={`Classificação de Risco — ${p?.nome ?? 'Paciente'}`}
      descricao={`Chegada às ${formatarHora(atendimento.chegada_em)} • Protocolo de Manchester`}
      rodape={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-texto-suave">Classificação final:</span>
            <PrioridadeBadge prioridade={prioridadeFinal} tamanho="sm" comTempo />
          </div>
          <div className="flex items-center gap-2">
            <Button variante="secundaria" onClick={onFechar} desabilitado={salvando}>
              Cancelar
            </Button>
            <Button onClick={confirmarTriagem} carregando={salvando}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Concluir triagem e encaminhar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 text-sm">
        {/* Identificação e Alertas do Paciente */}
        <div className="rounded-lg border border-neutro-200 bg-neutro-50/50 p-4 dark:border-neutro-800 dark:bg-neutro-900/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-texto">{p?.nome}</p>
              <p className="text-xs text-texto-suave">
                {calcularIdade(p?.data_nascimento)} ({p?.sexo}) • CPF: {formatarCpf(p?.cpf)} • Convênio: {p?.convenio ?? 'SUS'}
              </p>
            </div>
            {p?.alergias?.length > 0 && (
              <div className="flex items-center gap-1 rounded bg-perigo-100 px-2 py-0.5 text-xs font-semibold text-perigo-800 dark:bg-perigo-950 dark:text-perigo-300">
                <ShieldAlert className="size-3.5" />
                Alergias: {p.alergias.join(', ')}
              </div>
            )}
          </div>
          <div className="mt-2 border-t border-neutro-200 pt-2 dark:border-neutro-800">
            <p className="text-xs font-medium text-texto">Queixa Principal Relatada:</p>
            <p className="text-xs text-texto-suave">{atendimento.queixa_principal}</p>
          </div>
          {p?.comorbidades?.length > 0 && (
            <p className="mt-1 text-xs text-texto-suave">
              Comorbidades: {p.comorbidades.join(', ')}
            </p>
          )}
        </div>

        {/* 1. Sinais Vitais Aferidos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-texto">
              <HeartPulse className="size-4 text-marca-600" />
              Sinais Vitais (Aferição na Triagem)
            </h3>
            <span className="text-xs text-texto-suave">Altere os valores para reavaliar os discriminadores</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            <Input
              label="PAS (mmHg)"
              type="number"
              placeholder="120"
              value={sinais.pa_sistolica}
              onChange={(e) => atualizarSinal('pa_sistolica', e.target.value)}
            />
            <Input
              label="PAD (mmHg)"
              type="number"
              placeholder="80"
              value={sinais.pa_diastolica}
              onChange={(e) => atualizarSinal('pa_diastolica', e.target.value)}
            />
            <Input
              label="Temp (°C)"
              type="number"
              step="0.1"
              placeholder="36.5"
              value={sinais.temperatura}
              onChange={(e) => atualizarSinal('temperatura', e.target.value)}
            />
            <Input
              label="FC (bpm)"
              type="number"
              placeholder="80"
              value={sinais.frequencia_cardiaca}
              onChange={(e) => atualizarSinal('frequencia_cardiaca', e.target.value)}
            />
            <Input
              label="FR (rpm)"
              type="number"
              placeholder="16"
              value={sinais.frequencia_respiratoria}
              onChange={(e) => atualizarSinal('frequencia_respiratoria', e.target.value)}
            />
            <Input
              label="SpO₂ (%)"
              type="number"
              placeholder="98"
              value={sinais.saturacao}
              onChange={(e) => atualizarSinal('saturacao', e.target.value)}
            />
            <Input
              label="Dor (0–10)"
              type="number"
              min="0"
              max="10"
              placeholder="0"
              value={sinais.dor}
              onChange={(e) => atualizarSinal('dor', e.target.value)}
            />
            <Input
              label="Glasgow (3–15)"
              type="number"
              min="3"
              max="15"
              placeholder="15"
              value={sinais.glasgow}
              onChange={(e) => atualizarSinal('glasgow', e.target.value)}
            />
          </div>
        </div>

        {/* 2. Sugestão do Motor Manchester (RNF06 - 100% Offline) */}
        <div className="rounded-lg border border-neutro-200 p-4 dark:border-neutro-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutro-200 pb-3 dark:border-neutro-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-texto-suave">
                Sugestão do Motor Manchester:
              </span>
              <PrioridadeBadge prioridade={classificacaoSugerida.cor} tamanho="lg" comTempo comNivel />
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-neutro-100 px-2 py-0.5 text-xs font-medium text-neutro-700 dark:bg-neutro-800 dark:text-neutro-300">
              <Brain className="size-3.5" />
              100% Offline (Motor Local)
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium text-texto">Justificativa Clínica e Discriminadores:</p>
            <p className="mt-0.5 text-xs text-texto-suave">{classificacaoSugerida.justificativa}</p>
          </div>

          {/* Seleção e Decisão do Enfermeiro */}
          <div className="mt-4 border-t border-neutro-200 pt-3 dark:border-neutro-800">
            <p className="mb-2 text-xs font-semibold text-texto">
              Decisão do Enfermeiro (Confirme a sugestão ou selecione outra cor se houver julgamento clínico):
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {CORES_MANCHESTER.map((cor) => {
                const selecionada = prioridadeFinal === cor
                const ehSugerida = classificacaoSugerida.cor === cor

                return (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setPrioridadeEscolhida(cor)}
                    className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      selecionada
                        ? 'border-marca-600 bg-marca-50 text-marca-900 shadow-xs ring-2 ring-marca-500/30 dark:bg-marca-950/40 dark:text-marca-200'
                        : 'border-neutro-300 bg-white text-texto hover:bg-neutro-50 dark:border-neutro-700 dark:bg-neutro-900 dark:hover:bg-neutro-800'
                    }`}
                  >
                    <PrioridadeBadge prioridade={cor} tamanho="sm" />
                    {ehSugerida && (
                      <span className="rounded bg-neutro-200 px-1 text-[10px] text-neutro-800 dark:bg-neutro-700 dark:text-neutro-200">
                        Sugerida
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Motivo obrigatório se alterou */}
            {foiAlterada && (
              <div className="mt-3 rounded-lg border border-aviso-200 bg-aviso-50/50 p-3 dark:border-aviso-800 dark:bg-aviso-950/20">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-aviso-texto">
                  <AlertTriangle className="size-3.5" />
                  Motivo da alteração clínica (obrigatório para rastreabilidade legal)
                </div>
                <Textarea
                  placeholder="Descreva o motivo clínico que justifica a alteração da prioridade sugerida pelo protocolo..."
                  rows={2}
                  value={motivoAlteracao}
                  onChange={(e) => setMotivoAlteracao(e.target.value)}
                  obrigatorio
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Alocação de Recursos (Médico e Leito) */}
        <div className="rounded-lg border border-neutro-200 p-4 dark:border-neutro-800">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-texto">
              <Stethoscope className="size-4 text-marca-600" />
              Alocação Clínica (Médico e Leito)
            </h3>
            <span className="text-xs text-texto-suave">
              Especialidade indicada: <strong>{classificacaoSugerida.especialidade}</strong>
            </span>
          </div>

          <div className="mb-3 rounded bg-neutro-100 p-2 text-xs text-texto-suave dark:bg-neutro-800">
            <strong>Recomendação do sistema:</strong> {alocacaoSugerida.justificativa}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Select
                label="Médico responsável"
                obrigatorio
                opcoes={[
                  { valor: '', rotulo: 'Selecione um médico...' },
                  ...(recursos?.profissionais ?? [])
                    .filter((m) => m.ativo && m.tipo_registro === 'CRM')
                    .map((m) => ({
                      valor: m.id,
                      rotulo: `${m.nome} (${m.especialidade})`,
                    })),
                ]}
                value={medicoFinal ?? ''}
                onChange={(e) => setMedicoSelecionado(e.target.value || null)}
              />
            </div>
            <div>
              <Select
                label="Leito ou consultório de destino"
                opcoes={[
                  { valor: '', rotulo: 'Nenhum leito / Sala de espera' },
                  ...(recursos?.leitos ?? []).map((l) => ({
                    valor: l.id,
                    rotulo: `${l.codigo} · ${l.tipo} (${l.status === 'livre' ? 'Livre' : l.status})`,
                  })),
                ]}
                value={leitoFinal ?? ''}
                onChange={(e) => setLeitoSelecionado(e.target.value || null)}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

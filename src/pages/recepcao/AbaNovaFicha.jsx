import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, HeartPulse, Sparkles, User, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { CONVENIOS, OPCOES_SEXO } from '@/lib/dominio'
import { comoNumero, esquemaRecepcao } from '@/lib/esquemas'
import { hojeISO } from '@/lib/datas'
import { mensagemErro } from '@/lib/erros'
import { recepcaoService } from '@/services/recepcao'
import {
  Button,
  Card,
  CardCabecalho,
  CardConteudo,
  Input,
  Select,
  Textarea,
} from '@/components/ui'

const VALORES_PADRAO = {
  nome: '',
  cpf: '',
  data_nascimento: '',
  sexo: 'F',
  telefone: '',
  convenio: 'SUS',
  numero_carteirinha: '',
  alergias_texto: '',
  comorbidades_texto: '',
  queixa_principal: '',
  pa_sistolica: null,
  pa_diastolica: null,
  temperatura: null,
  frequencia_cardiaca: null,
  frequencia_respiratoria: null,
  saturacao: null,
  dor: null,
  glicemia: null,
}

export function AbaNovaFicha({ onConcluido }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaRecepcao),
    mode: 'onBlur',
    defaultValues: VALORES_PADRAO,
  })

  const convenioAtual = useWatch({ control, name: 'convenio' })

  const mutacao = useMutation({
    mutationFn: (dados) => {
      // Separação de alergias e comorbidades
      const parseLista = (txt) =>
        txt ? txt.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : []

      return recepcaoService.cadastrarFicha({
        dadosPaciente: {
          nome: dados.nome,
          cpf: dados.cpf,
          data_nascimento: dados.data_nascimento,
          sexo: dados.sexo,
          telefone: dados.telefone,
          convenio: dados.convenio,
          numero_carteirinha: dados.numero_carteirinha,
          alergias: parseLista(dados.alergias_texto),
          comorbidades: parseLista(dados.comorbidades_texto),
        },
        dadosAtendimento: {
          queixa_principal: dados.queixa_principal,
          origem: 'manual',
        },
        sinaisVitais: {
          pa_sistolica: dados.pa_sistolica,
          pa_diastolica: dados.pa_diastolica,
          temperatura: dados.temperatura,
          frequencia_cardiaca: dados.frequencia_cardiaca,
          frequencia_respiratoria: dados.frequencia_respiratoria,
          saturacao: dados.saturacao,
          dor: dados.dor,
          glicemia: dados.glicemia,
        },
        recepcionistaId: profile?.id,
      })
    },
    onSuccess: (_, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['fila_triagem'] })
      toast.success(`Paciente ${variaveis.nome} acolhido(a) e encaminhado(a) para triagem!`)
      reset(VALORES_PADRAO)
      if (onConcluido) onConcluido()
    },
    onError: (err) => {
      toast.error(mensagemErro(err, { duplicado: 'Já existe um paciente cadastrado com este CPF.' }))
    },
  })

  const onSubmit = handleSubmit((dados) => mutacao.mutate(dados))

  return (
    <Card>
      <CardCabecalho
        titulo="Nova Ficha de Atendimento"
        descricao="Preencha os dados de identificação, cobertura do convênio, queixa relatada e sinais vitais iniciais se aferidos no acolhimento."
      />
      <CardConteudo>
        <form onSubmit={onSubmit} className="flex flex-col gap-8">
          {/* SEÇÃO 1: Identificação do Paciente */}
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-neutro-200 pb-2 dark:border-neutro-800">
              <User className="size-4 text-marca-600 dark:text-marca-400" aria-hidden="true" />
              <h2 className="text-base font-semibold text-texto">1. Identificação do Paciente</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Nome completo"
                obrigatorio
                className="sm:col-span-2"
                placeholder="Ex.: Maria da Silva"
                erro={errors.nome?.message}
                {...register('nome')}
              />
              <Input
                label="CPF"
                obrigatorio
                placeholder="000.000.000-00"
                dica="11 dígitos (apenas números)"
                erro={errors.cpf?.message}
                {...register('cpf')}
              />
              <Input
                label="Data de nascimento"
                type="date"
                obrigatorio
                max={hojeISO()}
                erro={errors.data_nascimento?.message}
                {...register('data_nascimento')}
              />
              <Select
                label="Sexo biológico"
                obrigatorio
                opcoes={OPCOES_SEXO}
                erro={errors.sexo?.message}
                {...register('sexo')}
              />
              <Input
                label="Telefone / WhatsApp"
                placeholder="(12) 99999-0000"
                erro={errors.telefone?.message}
                {...register('telefone')}
              />
            </div>
          </div>

          {/* SEÇÃO 2: Convênio e Histórico */}
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-neutro-200 pb-2 dark:border-neutro-800">
              <Activity className="size-4 text-marca-600 dark:text-marca-400" aria-hidden="true" />
              <h2 className="text-base font-semibold text-texto">2. Convênio e Histórico Clínico</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Convênio"
                obrigatorio
                opcoes={CONVENIOS.map((c) => ({ valor: c, rotulo: c }))}
                erro={errors.convenio?.message}
                {...register('convenio')}
              />
              <Input
                label="Nº da carteirinha"
                placeholder={convenioAtual === 'SUS' ? 'Cartão SUS (opcional)' : 'Nº da carteirinha'}
                desabilitado={convenioAtual === 'SUS'}
                erro={errors.numero_carteirinha?.message}
                {...register('numero_carteirinha')}
              />
              <Input
                label="Alergias conhecidas"
                placeholder="Ex.: Dipirona, Penicilina, AAS"
                dica="Separar por vírgula ou ponto e vírgula"
                erro={errors.alergias_texto?.message}
                {...register('alergias_texto')}
              />
              <Input
                label="Comorbidades prévias"
                placeholder="Ex.: Hipertensão, Diabetes, Asma"
                dica="Separar por vírgula ou ponto e vírgula"
                erro={errors.comorbidades_texto?.message}
                {...register('comorbidades_texto')}
              />
            </div>
          </div>

          {/* SEÇÃO 3: Queixa Principal */}
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-neutro-200 pb-2 dark:border-neutro-800">
              <HeartPulse className="size-4 text-marca-600 dark:text-marca-400" aria-hidden="true" />
              <h2 className="text-base font-semibold text-texto">3. Motivo do Atendimento</h2>
            </div>
            <Textarea
              label="Queixa principal relatada pelo paciente"
              obrigatorio
              rows={3}
              placeholder="Descreva detalhadamente os sintomas relatados pelo paciente, início do quadro e evolução..."
              erro={errors.queixa_principal?.message}
              {...register('queixa_principal')}
            />
          </div>

          {/* SEÇÃO 4: Sinais Vitais Iniciais (Acolhimento) */}
          <div className="rounded-lg border border-neutro-200 bg-neutro-50/50 p-4 dark:border-neutro-800 dark:bg-neutro-900/40">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-marca-600 dark:text-marca-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-texto">4. Sinais Vitais Iniciais (Acolhimento · Opcional)</h2>
              </div>
              <span className="text-xs text-texto-suave">
                Se não aferidos agora, serão registrados obrigatoriamente na Triagem
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <Input
                label="PA Sistólica"
                type="number"
                placeholder="120"
                dica="mmHg"
                erro={errors.pa_sistolica?.message}
                {...register('pa_sistolica', comoNumero)}
              />
              <Input
                label="PA Diastólica"
                type="number"
                placeholder="80"
                dica="mmHg"
                erro={errors.pa_diastolica?.message}
                {...register('pa_diastolica', comoNumero)}
              />
              <Input
                label="Temp."
                type="number"
                step="0.1"
                placeholder="36.5"
                dica="°C"
                erro={errors.temperatura?.message}
                {...register('temperatura', comoNumero)}
              />
              <Input
                label="Freq. Cardíaca"
                type="number"
                placeholder="80"
                dica="bpm"
                erro={errors.frequencia_cardiaca?.message}
                {...register('frequencia_cardiaca', comoNumero)}
              />
              <Input
                label="Freq. Resp."
                type="number"
                placeholder="18"
                dica="rpm"
                erro={errors.frequencia_respiratoria?.message}
                {...register('frequencia_respiratoria', comoNumero)}
              />
              <Input
                label="SpO₂"
                type="number"
                placeholder="98"
                dica="%"
                erro={errors.saturacao?.message}
                {...register('saturacao', comoNumero)}
              />
              <Input
                label="Escala de Dor"
                type="number"
                min="0"
                max="10"
                placeholder="0–10"
                dica="0 a 10"
                erro={errors.dor?.message}
                {...register('dor', comoNumero)}
              />
              <Input
                label="Glicemia"
                type="number"
                placeholder="95"
                dica="mg/dL"
                erro={errors.glicemia?.message}
                {...register('glicemia', comoNumero)}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variante="secundaria"
              onClick={() => reset(VALORES_PADRAO)}
              desabilitado={mutacao.isPending}
            >
              Limpar formulário
            </Button>
            <Button type="submit" carregando={mutacao.isPending}>
              <UserPlus className="size-4" aria-hidden="true" />
              Cadastrar e enviar para triagem
            </Button>
          </div>
        </form>
      </CardConteudo>
    </Card>
  )
}

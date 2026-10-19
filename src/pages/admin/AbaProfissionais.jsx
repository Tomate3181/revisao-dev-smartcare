import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { useCadastro } from '@/hooks/useCadastro'
import { alasService, leitosService, profissionaisService } from '@/services/cadastros'
import { esquemaProfissional } from '@/lib/esquemas'
import { mensagemErro } from '@/lib/erros'
import { diasAte, formatarData } from '@/lib/datas'
import { DIAS_AVISO_REGISTRO, ESPECIALIDADES, ROTULO_TURNO, TIPOS_REGISTRO, UFS, opcoes } from '@/lib/dominio'
import {
  Badge, BotaoIcone, Button, Card, CardCabecalho, CardConteudo, Checkbox, EstadoErro, EstadoVazio, Input, Select, Skeleton, Table, Td, Th,
} from '@/components/ui'
import { FormularioModal } from '@/components/FormularioModal'
import { ConfirmarExclusao } from '@/components/ConfirmarExclusao'

/** Situação do CRM/COREN: base do alerta "registro a vencer" (RF11). */
function situacaoRegistro(validade) {
  const dias = diasAte(validade)
  if (dias < 0) return { tom: 'perigo', texto: `Vencido há ${-dias} d` }
  if (dias <= DIAS_AVISO_REGISTRO) return { tom: 'aviso', texto: dias === 0 ? 'Vence hoje' : `Vence em ${dias} d` }
  return { tom: 'ok', texto: 'Válido' }
}

function FormProfissional({ profissional, alas, consultorios, onFechar, salvar }) {
  const p = profissional
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaProfissional),
    mode: 'onBlur',
    defaultValues: {
      nome: p?.nome ?? '',
      tipo_registro: p?.tipo_registro ?? 'CRM',
      registro: p?.registro ?? '',
      registro_uf: p?.registro_uf ?? 'SP',
      registro_validade: p?.registro_validade ?? '',
      especialidade: p?.especialidade ?? '',
      email: p?.email ?? '',
      telefone: p?.telefone ?? '',
      turno: p?.turno ?? 'manha',
      ala_id: p?.ala_id ?? '',
      consultorio_id: p?.consultorio_id ?? '',
      ativo: p?.ativo ?? true,
    },
  })

  const onSubmit = handleSubmit((dados) =>
    salvar.mutate(
      { id: p?.id, ...dados },
      {
        onSuccess: () => {
          toast.success(p ? `${dados.nome} atualizado(a)` : `${dados.nome} cadastrado(a)`)
          onFechar()
        },
        onError: (e) =>
          toast.error(mensagemErro(e, { duplicado: `Já existe um profissional com ${dados.tipo_registro} ${dados.registro}/${dados.registro_uf}.` })),
      },
    ),
  )

  return (
    <FormularioModal
      aberto
      onFechar={onFechar}
      titulo={p ? `Editar ${p.nome}` : 'Novo profissional'}
      onSubmit={onSubmit}
      salvando={salvar.isPending}
      rotuloSalvar={p ? 'Salvar alterações' : 'Cadastrar profissional'}
    >
      <Input label="Nome completo" obrigatorio className="sm:col-span-2" erro={errors.nome?.message} {...register('nome')} />
      <div className="grid grid-cols-[6rem_1fr_5.5rem] gap-3 sm:col-span-2">
        <Select label="Conselho" obrigatorio opcoes={TIPOS_REGISTRO.map((t) => ({ valor: t, rotulo: t }))} erro={errors.tipo_registro?.message} {...register('tipo_registro')} />
        <Input label="Número do registro" obrigatorio inputMode="numeric" erro={errors.registro?.message} {...register('registro')} />
        <Select label="UF" obrigatorio opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))} erro={errors.registro_uf?.message} {...register('registro_uf')} />
      </div>
      <Input label="Validade do registro" type="date" obrigatorio erro={errors.registro_validade?.message} {...register('registro_validade')} />
      <Input label="Especialidade" obrigatorio list="lista-especialidades" erro={errors.especialidade?.message} {...register('especialidade')} />
      <datalist id="lista-especialidades">
        {ESPECIALIDADES.map((e) => <option key={e} value={e} />)}
      </datalist>
      <Input label="E-mail" type="email" autoComplete="off" erro={errors.email?.message} {...register('email')} />
      <Input label="Telefone" type="tel" placeholder="(12) 99999-0000" erro={errors.telefone?.message} {...register('telefone')} />
      <Select label="Turno / disponibilidade" obrigatorio opcoes={opcoes(ROTULO_TURNO)} erro={errors.turno?.message} {...register('turno')} />
      <Select
        label="Ala de atendimento"
        opcoes={[{ valor: '', rotulo: 'Sem vínculo' }, ...alas.map((a) => ({ valor: a.id, rotulo: a.nome }))]}
        {...register('ala_id')}
      />
      <Select
        label="Consultório fixo"
        dica="Opcional — usado na alocação do médico"
        opcoes={[{ valor: '', rotulo: 'Nenhum' }, ...consultorios.map((c) => ({ valor: c.id, rotulo: `${c.codigo} · ${c.especialidade ?? ''}` }))]}
        {...register('consultorio_id')}
      />
      <Checkbox label="Ativo (disponível para alocação)" className="self-end pb-2" {...register('ativo')} />
    </FormularioModal>
  )
}

export function AbaProfissionais() {
  const { consulta, salvar, excluir } = useCadastro('profissionais', profissionaisService)
  const alas = useCadastro('alas', alasService).consulta.data ?? []
  const leitos = useCadastro('leitos', leitosService).consulta.data ?? []
  const consultorios = leitos.filter((l) => l.tipo === 'consultorio')
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [busca, setBusca] = useState('')
  const [soVencendo, setSoVencendo] = useState(false)

  const profissionais = useMemo(() => consulta.data ?? [], [consulta.data])
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return profissionais.filter(
      (p) =>
        (!termo || p.nome.toLowerCase().includes(termo) || p.registro.includes(termo) || p.especialidade.toLowerCase().includes(termo)) &&
        (!soVencendo || diasAte(p.registro_validade) <= DIAS_AVISO_REGISTRO),
    )
  }, [profissionais, busca, soVencendo])
  const vencendo = profissionais.filter((p) => diasAte(p.registro_validade) <= DIAS_AVISO_REGISTRO).length

  function confirmarExclusao() {
    excluir.mutate(excluindo.id, {
      onSuccess: () => {
        toast.success(`${excluindo.nome} excluído(a)`)
        setExcluindo(null)
      },
      onError: (e) => toast.error(mensagemErro(e)),
    })
  }

  return (
    <Card>
      <CardCabecalho
        titulo="Profissionais de saúde"
        descricao={`${profissionais.length} cadastrados · ${vencendo} com registro vencido ou a vencer em ${DIAS_AVISO_REGISTRO} dias`}
        acoes={
          <Button onClick={() => setEditando({})}>
            <Plus className="size-4" aria-hidden="true" /> Novo profissional
          </Button>
        }
      />
      <CardConteudo className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-[2.375rem] size-4 text-texto-suave" aria-hidden="true" />
            <Input
              label="Buscar"
              type="search"
              placeholder="Nome, registro ou especialidade"
              classeCampo="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Checkbox label="Só registros vencidos ou a vencer" className="pb-1" checked={soVencendo} onChange={(e) => setSoVencendo(e.target.checked)} />
        </div>

        {consulta.isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : consulta.isError ? (
          <EstadoErro descricao={mensagemErro(consulta.error)} onTentarNovamente={consulta.refetch} />
        ) : profissionais.length === 0 ? (
          <EstadoVazio icone={UserRound} titulo="Nenhum profissional cadastrado" acao={<Button onClick={() => setEditando({})}>Cadastrar o primeiro</Button>} />
        ) : filtrados.length === 0 ? (
          <EstadoVazio
            icone={Search}
            titulo="Ninguém encontrado com esses filtros"
            acao={
              <Button variante="secundaria" onClick={() => { setBusca(''); setSoVencendo(false) }}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <Table legenda="Profissionais de saúde">
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Registro</Th>
                <Th>Validade</Th>
                <Th>Especialidade</Th>
                <Th>Turno</Th>
                <Th>Vínculo</Th>
                <Th className="w-24 text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const sit = situacaoRegistro(p.registro_validade)
                return (
                  <tr key={p.id} className={p.ativo ? undefined : 'opacity-60'}>
                    <Td>
                      <p className="font-medium">{p.nome}</p>
                      {!p.ativo && <Badge>Inativo</Badge>}
                    </Td>
                    <Td className="num whitespace-nowrap">
                      {p.tipo_registro} {p.registro}/{p.registro_uf}
                    </Td>
                    <Td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="num">{formatarData(p.registro_validade)}</span>
                        <Badge tom={sit.tom}>{sit.texto}</Badge>
                      </span>
                    </Td>
                    <Td>{p.especialidade}</Td>
                    <Td className="whitespace-nowrap">{ROTULO_TURNO[p.turno]}</Td>
                    <Td className="text-sm">
                      {p.consultorio?.codigo ?? p.ala?.nome ?? <span className="text-texto-suave">—</span>}
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <BotaoIcone icone={Pencil} rotulo={`Editar ${p.nome}`} onClick={() => setEditando(p)} />
                      <BotaoIcone icone={Trash2} rotulo={`Excluir ${p.nome}`} onClick={() => setExcluindo(p)} />
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </CardConteudo>

      {editando && (
        <FormProfissional
          profissional={editando.id ? editando : null}
          alas={alas}
          consultorios={consultorios}
          onFechar={() => setEditando(null)}
          salvar={salvar}
        />
      )}
      <ConfirmarExclusao
        tipo="o profissional"
        item={excluindo?.nome}
        aviso={`${excluindo?.nome} deixa de aparecer na alocação. O histórico de atendimentos é mantido. Para afastamentos temporários, prefira desmarcar "Ativo".`}
        onConfirmar={confirmarExclusao}
        onFechar={() => setExcluindo(null)}
        excluindo={excluir.isPending}
      />
    </Card>
  )
}

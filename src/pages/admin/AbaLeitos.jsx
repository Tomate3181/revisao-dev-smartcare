import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BedDouble, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { useCadastro } from '@/hooks/useCadastro'
import { alasService, leitosService } from '@/services/cadastros'
import { esquemaLeito } from '@/lib/esquemas'
import { mensagemErro } from '@/lib/erros'
import { diasAte, formatarData } from '@/lib/datas'
import {
  DIAS_AVISO_MANUTENCAO, EQUIPAMENTOS, ESPECIALIDADES, ROTULO_STATUS_LEITO, ROTULO_TIPO_LEITO, TOM_STATUS_LEITO, opcoes,
} from '@/lib/dominio'
import {
  Badge, BotaoIcone, Button, Card, CardCabecalho, CardConteudo, Checkbox, EstadoErro, EstadoVazio, Input, Select, Skeleton, Table, Td, Textarea, Th,
} from '@/components/ui'
import { FormularioModal } from '@/components/FormularioModal'
import { ConfirmarExclusao } from '@/components/ConfirmarExclusao'
import { primeiraCelulaLivre } from '@/lib/planta'
import { SeletorPosicao } from './SeletorPosicao'

const opcoesEspecialidade = ESPECIALIDADES.filter((e) => !e.startsWith('Enfermagem')).map((e) => ({ valor: e, rotulo: e }))

function FormLeito({ leito, alas, leitos, onFechar, salvar }) {
  const alaInicial = leito?.ala_id ?? alas[0]?.id ?? ''
  const posInicial = leito ? { x: leito.pos_x, y: leito.pos_y } : primeiraCelulaLivre(alas.find((a) => a.id === alaInicial), leitos)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaLeito),
    mode: 'onBlur',
    defaultValues: {
      codigo: leito?.codigo ?? '',
      ala_id: alaInicial,
      tipo: leito?.tipo ?? 'observacao',
      especialidade: leito?.especialidade ?? '',
      equipamentos: leito?.equipamentos ?? [],
      status: leito?.status ?? 'livre',
      proxima_manutencao: leito?.proxima_manutencao ?? '',
      pos_x: posInicial.x,
      pos_y: posInicial.y,
      observacoes: leito?.observacoes ?? '',
    },
  })
  const [alaId, tipo, posX, posY] = useWatch({ control, name: ['ala_id', 'tipo', 'pos_x', 'pos_y'] })
  const ala = alas.find((a) => a.id === alaId)

  function mudarPosicao({ x, y }) {
    setValue('pos_x', x, { shouldDirty: true })
    setValue('pos_y', y, { shouldDirty: true })
  }

  const alaRegistrada = register('ala_id')
  const onSubmit = handleSubmit((dados) =>
    salvar.mutate(
      { id: leito?.id, ...dados, especialidade: dados.tipo === 'consultorio' ? dados.especialidade : null },
      {
        onSuccess: () => {
          toast.success(leito ? `Leito ${dados.codigo} atualizado` : `Leito ${dados.codigo} cadastrado`)
          onFechar()
        },
        onError: (e) => toast.error(mensagemErro(e, { duplicado: `Já existe um leito com o código ${dados.codigo}.` })),
      },
    ),
  )

  return (
    <FormularioModal
      aberto
      onFechar={onFechar}
      titulo={leito ? `Editar leito ${leito.codigo}` : 'Novo leito ou sala'}
      onSubmit={onSubmit}
      salvando={salvar.isPending}
      rotuloSalvar={leito ? 'Salvar alterações' : 'Cadastrar leito'}
    >
      <Input label="Código" obrigatorio placeholder="UTI-13" dica="Letras, números e hífen" erro={errors.codigo?.message} {...register('codigo')} />
      <Select
        label="Ala / setor"
        obrigatorio
        opcoes={alas.map((a) => ({ valor: a.id, rotulo: a.nome }))}
        erro={errors.ala_id?.message}
        {...alaRegistrada}
        onChange={(e) => {
          alaRegistrada.onChange(e)
          // trocou de ala: reposiciona na primeira célula livre da nova planta
          mudarPosicao(primeiraCelulaLivre(alas.find((a) => a.id === e.target.value), leitos, leito?.id))
        }}
      />
      <Select label="Tipo" obrigatorio opcoes={opcoes(ROTULO_TIPO_LEITO)} erro={errors.tipo?.message} {...register('tipo')} />
      {tipo === 'consultorio' ? (
        <Select
          label="Especialidade do consultório"
          obrigatorio
          placeholder="Selecione"
          opcoes={opcoesEspecialidade}
          dica="Usada na alocação automática da triagem"
          erro={errors.especialidade?.message}
          {...register('especialidade')}
        />
      ) : (
        <div className="hidden sm:block" />
      )}
      <Select label="Status" obrigatorio opcoes={opcoes(ROTULO_STATUS_LEITO)} erro={errors.status?.message} {...register('status')} />
      <Input label="Próxima manutenção preventiva" type="date" erro={errors.proxima_manutencao?.message} {...register('proxima_manutencao')} />

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">Equipamentos disponíveis</legend>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          {EQUIPAMENTOS.map((eq) => (
            <Checkbox key={eq} label={eq} value={eq} {...register('equipamentos')} />
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <SeletorPosicao
          ala={ala}
          leitos={leitos}
          leitoId={leito?.id}
          valor={{ x: posX, y: posY }}
          onChange={mudarPosicao}
          erro={errors.pos_x?.message}
        />
      </div>
      <Textarea label="Observações" className="sm:col-span-2" rows={2} erro={errors.observacoes?.message} {...register('observacoes')} />
    </FormularioModal>
  )
}

function BadgeManutencao({ data }) {
  const dias = diasAte(data)
  if (dias === null) return <span className="text-texto-suave">—</span>
  const proxima = dias <= DIAS_AVISO_MANUTENCAO
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="num">{formatarData(data)}</span>
      {proxima && (
        <Badge tom={dias < 0 ? 'perigo' : 'aviso'} icone={Wrench}>
          {dias < 0 ? 'atrasada' : dias === 0 ? 'hoje' : `em ${dias} d`}
        </Badge>
      )}
    </span>
  )
}

export function AbaLeitos() {
  const { consulta, salvar, excluir } = useCadastro('leitos', leitosService, { afeta: ['alas', 'profissionais'] })
  const alas = useCadastro('alas', alasService).consulta.data ?? []
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [filtro, setFiltro] = useState({ busca: '', ala: '', status: '' })

  const leitos = useMemo(() => consulta.data ?? [], [consulta.data])
  const filtrados = useMemo(() => {
    const busca = filtro.busca.trim().toUpperCase()
    return leitos.filter(
      (l) =>
        (!busca || l.codigo.includes(busca)) &&
        (!filtro.ala || l.ala_id === filtro.ala) &&
        (!filtro.status || l.status === filtro.status),
    )
  }, [leitos, filtro])

  function confirmarExclusao() {
    excluir.mutate(excluindo.id, {
      onSuccess: () => {
        toast.success(`Leito ${excluindo.codigo} excluído`)
        setExcluindo(null)
      },
      onError: (e) => toast.error(mensagemErro(e)),
    })
  }

  const novo = () => (alas.length ? setEditando({}) : toast.info('Cadastre uma ala antes de cadastrar leitos.'))

  return (
    <Card>
      <CardCabecalho
        titulo="Leitos e consultórios"
        descricao={`${leitos.length} cadastrados · ${leitos.filter((l) => l.status === 'livre').length} livres agora`}
        acoes={
          <Button onClick={novo}>
            <Plus className="size-4" aria-hidden="true" /> Novo leito
          </Button>
        }
      />
      <CardConteudo className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-[2.375rem] size-4 text-texto-suave" aria-hidden="true" />
            <Input
              label="Buscar por código"
              type="search"
              placeholder="UTI-01"
              classeCampo="pl-9"
              value={filtro.busca}
              onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))}
            />
          </div>
          <Select
            label="Ala"
            opcoes={[{ valor: '', rotulo: 'Todas' }, ...alas.map((a) => ({ valor: a.id, rotulo: a.nome }))]}
            value={filtro.ala}
            onChange={(e) => setFiltro((f) => ({ ...f, ala: e.target.value }))}
          />
          <Select
            label="Status"
            opcoes={[{ valor: '', rotulo: 'Todos' }, ...opcoes(ROTULO_STATUS_LEITO)]}
            value={filtro.status}
            onChange={(e) => setFiltro((f) => ({ ...f, status: e.target.value }))}
          />
        </div>

        {consulta.isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : consulta.isError ? (
          <EstadoErro descricao={mensagemErro(consulta.error)} onTentarNovamente={consulta.refetch} />
        ) : leitos.length === 0 ? (
          <EstadoVazio icone={BedDouble} titulo="Nenhum leito cadastrado" acao={<Button onClick={novo}>Cadastrar o primeiro leito</Button>} />
        ) : filtrados.length === 0 ? (
          <EstadoVazio
            icone={Search}
            titulo="Nenhum leito com esses filtros"
            acao={
              <Button variante="secundaria" onClick={() => setFiltro({ busca: '', ala: '', status: '' })}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <Table legenda="Leitos e consultórios">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Ala</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th>Próx. manutenção</Th>
                <Th>Equipamentos</Th>
                <Th className="w-24 text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id}>
                  <Td className="num font-medium">{l.codigo}</Td>
                  <Td>{l.ala?.nome}</Td>
                  <Td>
                    {ROTULO_TIPO_LEITO[l.tipo]}
                    {l.especialidade && <span className="block text-xs text-texto-suave">{l.especialidade}</span>}
                  </Td>
                  <Td>
                    <Badge tom={TOM_STATUS_LEITO[l.status]}>{ROTULO_STATUS_LEITO[l.status]}</Badge>
                  </Td>
                  <Td>
                    <BadgeManutencao data={l.proxima_manutencao} />
                  </Td>
                  <Td className="text-xs text-texto-suave" title={l.equipamentos.join(', ')}>
                    {l.equipamentos.length ? `${l.equipamentos.length} itens` : '—'}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <BotaoIcone icone={Pencil} rotulo={`Editar ${l.codigo}`} onClick={() => setEditando(l)} />
                    <BotaoIcone icone={Trash2} rotulo={`Excluir ${l.codigo}`} onClick={() => setExcluindo(l)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardConteudo>

      {editando && (
        <FormLeito leito={editando.id ? editando : null} alas={alas} leitos={leitos} onFechar={() => setEditando(null)} salvar={salvar} />
      )}
      <ConfirmarExclusao
        tipo="o leito"
        item={excluindo?.codigo}
        aviso={
          excluindo?.status === 'ocupado'
            ? `Atenção: ${excluindo.codigo} está ocupado agora. O histórico de atendimentos é mantido, mas perde o vínculo com este leito.`
            : `O leito ${excluindo?.codigo} sai do mapa de ocupação. O histórico de atendimentos é mantido.`
        }
        onConfirmar={confirmarExclusao}
        onFechar={() => setExcluindo(null)}
        excluindo={excluir.isPending}
      />
    </Card>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCadastro } from '@/hooks/useCadastro'
import { alasService } from '@/services/cadastros'
import { comoNumero, esquemaAla } from '@/lib/esquemas'
import { mensagemErro } from '@/lib/erros'
import { BotaoIcone, Button, Card, CardCabecalho, CardConteudo, EstadoErro, EstadoVazio, Input, Skeleton, Table, Td, Textarea, Th } from '@/components/ui'
import { FormularioModal } from '@/components/FormularioModal'
import { ConfirmarExclusao } from '@/components/ConfirmarExclusao'

const NOVA = { nome: '', descricao: '', andar: 0, planta_colunas: 6, planta_linhas: 2 }

function FormAla({ ala, onFechar, salvar }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaAla),
    mode: 'onBlur',
    defaultValues: ala ? { ...NOVA, ...ala, descricao: ala.descricao ?? '' } : NOVA,
  })

  const onSubmit = handleSubmit((dados) =>
    salvar.mutate(
      { id: ala?.id, ...dados },
      {
        onSuccess: () => {
          toast.success(ala ? `Ala ${dados.nome} atualizada` : `Ala ${dados.nome} cadastrada`)
          onFechar()
        },
        onError: (e) => toast.error(mensagemErro(e, { duplicado: `Já existe uma ala chamada ${dados.nome}.` })),
      },
    ),
  )

  return (
    <FormularioModal
      aberto
      onFechar={onFechar}
      titulo={ala ? `Editar ala ${ala.nome}` : 'Nova ala'}
      descricao="A grade (colunas × linhas) define o desenho da planta no mapa de ocupação."
      onSubmit={onSubmit}
      salvando={salvar.isPending}
      rotuloSalvar={ala ? 'Salvar alterações' : 'Cadastrar ala'}
    >
      <Input label="Nome" obrigatorio className="sm:col-span-2" erro={errors.nome?.message} {...register('nome')} />
      <Textarea label="Descrição" className="sm:col-span-2" erro={errors.descricao?.message} {...register('descricao')} />
      <Input label="Andar" type="number" dica="0 = térreo" erro={errors.andar?.message} {...register('andar', comoNumero)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Colunas da planta" type="number" min={1} max={20} obrigatorio erro={errors.planta_colunas?.message} {...register('planta_colunas', comoNumero)} />
        <Input label="Linhas da planta" type="number" min={1} max={20} obrigatorio erro={errors.planta_linhas?.message} {...register('planta_linhas', comoNumero)} />
      </div>
    </FormularioModal>
  )
}

export function AbaAlas() {
  const { consulta, salvar, excluir } = useCadastro('alas', alasService)
  const [editando, setEditando] = useState(null) // null = fechado; {} = nova; objeto = edição
  const [excluindo, setExcluindo] = useState(null)

  function confirmarExclusao() {
    excluir.mutate(excluindo.id, {
      onSuccess: () => {
        toast.success(`Ala ${excluindo.nome} excluída`)
        setExcluindo(null)
      },
      onError: (e) =>
        toast.error(mensagemErro(e, { emUso: `A ala ${excluindo.nome} ainda tem leitos. Mova ou exclua os leitos antes.` })),
    })
  }

  const alas = consulta.data ?? []

  return (
    <Card>
      <CardCabecalho
        titulo="Alas e setores"
        descricao="Agrupam os leitos e consultórios no mapa da unidade."
        acoes={
          <Button onClick={() => setEditando({})}>
            <Plus className="size-4" aria-hidden="true" /> Nova ala
          </Button>
        }
      />
      <CardConteudo>
        {consulta.isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : consulta.isError ? (
          <EstadoErro descricao={mensagemErro(consulta.error)} onTentarNovamente={consulta.refetch} />
        ) : alas.length === 0 ? (
          <EstadoVazio
            icone={Building2}
            titulo="Nenhuma ala cadastrada"
            descricao="Cadastre as alas antes dos leitos: todo leito pertence a uma ala."
            acao={<Button onClick={() => setEditando({})}>Cadastrar a primeira ala</Button>}
          />
        ) : (
          <Table legenda="Alas cadastradas">
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Andar</Th>
                <Th>Planta</Th>
                <Th>Leitos</Th>
                <Th className="w-24 text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {alas.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <p className="font-medium">{a.nome}</p>
                    {a.descricao && <p className="text-xs text-texto-suave">{a.descricao}</p>}
                  </Td>
                  <Td className="num">{a.andar === 0 ? 'Térreo' : (a.andar ?? '—')}</Td>
                  <Td className="num">{a.planta_colunas} × {a.planta_linhas}</Td>
                  <Td className="num">{a.leitos?.[0]?.count ?? 0}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <BotaoIcone icone={Pencil} rotulo={`Editar ${a.nome}`} onClick={() => setEditando(a)} />
                    <BotaoIcone icone={Trash2} rotulo={`Excluir ${a.nome}`} onClick={() => setExcluindo(a)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardConteudo>

      {editando && <FormAla ala={editando.id ? editando : null} onFechar={() => setEditando(null)} salvar={salvar} />}
      <ConfirmarExclusao
        tipo="a ala"
        item={excluindo?.nome}
        aviso={excluindo?.leitos?.[0]?.count ? `Esta ala tem ${excluindo.leitos[0].count} leitos; o sistema só permite excluir alas vazias.` : undefined}
        onConfirmar={confirmarExclusao}
        onFechar={() => setExcluindo(null)}
        excluindo={excluir.isPending}
      />
    </Card>
  )
}

import { useId } from 'react'
import { Button, Modal } from '@/components/ui'

/**
 * Modal com formulário de criar/editar. O botão de salvar fica no rodapé e envia o <form>
 * pelo atributo form=, então Enter dentro de qualquer campo também salva.
 */
export function FormularioModal({ aberto, onFechar, titulo, descricao, onSubmit, salvando, rotuloSalvar = 'Salvar', tamanho = 'lg', children }) {
  const idForm = useId()
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      descricao={descricao}
      tamanho={tamanho}
      rodape={
        <>
          <Button variante="secundaria" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" form={idForm} carregando={salvando}>
            {rotuloSalvar}
          </Button>
        </>
      }
    >
      <form id={idForm} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {children}
      </form>
    </Modal>
  )
}

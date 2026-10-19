import { Button, Modal } from '@/components/ui'

/**
 * Confirmação de exclusão sempre com o nome do item no título e no botão,
 * para ninguém apagar a coisa errada num clique apressado.
 */
export function ConfirmarExclusao({ item, tipo, aviso, onConfirmar, onFechar, excluindo }) {
  return (
    <Modal
      aberto={Boolean(item)}
      onFechar={onFechar}
      tamanho="sm"
      titulo={`Excluir ${tipo} ${item ?? ''}?`}
      descricao="Esta ação não pode ser desfeita."
      rodape={
        <>
          <Button variante="secundaria" onClick={onFechar} autoFocus>
            Cancelar
          </Button>
          <Button variante="perigo" onClick={onConfirmar} carregando={excluindo}>
            Excluir {item}
          </Button>
        </>
      }
    >
      <p className="text-sm text-texto-suave">{aviso ?? `O cadastro de ${item} será removido do sistema.`}</p>
    </Modal>
  )
}

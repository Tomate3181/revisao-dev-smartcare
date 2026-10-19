import { Button } from './Button'

// Botão só com ícone: sempre com nome acessível (aria-label) e dica ao passar o mouse.
export function BotaoIcone({ icone: Icone, rotulo, ...props }) {
  return (
    <Button variante="fantasma" tamanho="icone" aria-label={rotulo} title={rotulo} {...props}>
      <Icone className="size-4" aria-hidden="true" />
    </Button>
  )
}

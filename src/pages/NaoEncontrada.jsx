import { Link } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'

export default function NaoEncontrada() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <MapPinOff className="size-10 text-texto-suave" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-texto-suave">O endereço pode ter mudado. Use o menu ou volte ao início.</p>
      <Link
        to="/"
        className="mt-2 inline-flex h-10 items-center rounded-ui bg-marca px-4 text-sm font-medium text-marca-texto hover:bg-marca-forte"
      >
        Ir para o início
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PAINEL_POR_PERFIL, ROTULO_PERFIL } from '@/lib/perfis'

// Exibida quando um usuário logado abre a tela de outro perfil (RF01).
export default function AcessoNegado() {
  const { profile } = useAuth()
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <ShieldAlert className="size-10 text-perigo" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Acesso restrito</h1>
      <p className="max-w-md text-sm text-texto-suave">
        Esta tela não faz parte do perfil <strong>{ROTULO_PERFIL[profile.perfil]}</strong>. Se você precisa deste acesso,
        fale com o administrador do sistema.
      </p>
      <Link
        to={PAINEL_POR_PERFIL[profile.perfil]}
        className="mt-2 inline-flex h-10 items-center rounded-ui bg-marca px-4 text-sm font-medium text-marca-texto hover:bg-marca-forte"
      >
        Voltar ao meu painel
      </Link>
    </div>
  )
}

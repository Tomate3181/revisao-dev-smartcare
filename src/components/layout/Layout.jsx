import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { HeartPulse, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useTema } from '@/hooks/useTema'
import { ROTULO_PERFIL } from '@/lib/perfis'
import { cn } from '@/lib/cn'
import { sair } from '@/services/auth'
import { menuDoPerfil } from '@/routes/menu'
import { Button } from '@/components/ui'

function Marca() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="grid size-8 place-items-center rounded-ui bg-marca text-marca-texto">
        <HeartPulse className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold">Smart Care</span>
    </div>
  )
}

function Navegacao({ perfil, onNavegar }) {
  return (
    <nav aria-label="Menu principal">
      <ul className="flex flex-col gap-1">
        {menuDoPerfil(perfil).map(({ caminho, rotulo, icone: Icone }) => (
          <li key={caminho}>
            <NavLink
              to={caminho}
              onClick={onNavegar}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-ui px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-marca-suave text-marca-forte' : 'text-texto-suave hover:bg-superficie-2 hover:text-texto',
                )
              }
            >
              <Icone className="size-4.5 shrink-0" aria-hidden="true" />
              {rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Usuario({ profile, onSair, saindo }) {
  return (
    <div className="flex items-center gap-2 border-t border-borda px-2 pt-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile.nome}</p>
        <p className="truncate text-xs text-texto-suave">{ROTULO_PERFIL[profile.perfil]}</p>
      </div>
      <Button variante="fantasma" tamanho="icone" onClick={onSair} carregando={saindo} aria-label="Sair do sistema" title="Sair">
        {!saindo && <LogOut className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  )
}

export function Layout() {
  const { profile } = useAuth()
  const { tema, alternarTema } = useTema()
  const navigate = useNavigate()
  const location = useLocation()
  const [saindo, setSaindo] = useState(false)
  const gaveta = useRef(null)
  const principal = useRef(null)
  const primeiraRenderizacao = useRef(true)

  // A cada troca de tela o foco vai para o conteúdo, para leitor de tela e teclado
  // não ficarem "presos" no menu (RNF03).
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    principal.current?.focus()
  }, [location.pathname])

  async function handleSair() {
    setSaindo(true)
    try {
      await sair()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Não foi possível sair agora. Tente novamente.')
      setSaindo(false)
    }
  }

  const fecharGaveta = () => gaveta.current?.close()
  const BotaoTema = (
    <Button
      variante="fantasma"
      tamanho="icone"
      onClick={alternarTema}
      aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
      title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
    >
      {tema === 'escuro' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </Button>
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ui focus:bg-superficie focus:px-4 focus:py-2 focus:shadow-ui"
      >
        Pular para o conteúdo
      </a>

      {/* Desktop: sidebar fixa */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-borda bg-superficie p-3 lg:flex">
        <div className="flex items-center justify-between pt-1">
          <Marca />
          {BotaoTema}
        </div>
        <div className="flex-1 overflow-y-auto">
          <Navegacao perfil={profile.perfil} />
        </div>
        <Usuario profile={profile} onSair={handleSair} saindo={saindo} />
      </aside>

      {/* Celular/tablet: barra no topo + gaveta (dialog nativo prende o foco e fecha com Esc) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borda bg-superficie px-2 lg:hidden">
        <Button variante="fantasma" tamanho="icone" onClick={() => gaveta.current?.showModal()} aria-label="Abrir menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
        <Marca />
        {BotaoTema}
      </header>
      <dialog
        ref={gaveta}
        aria-label="Menu"
        onClick={(e) => e.target === gaveta.current && fecharGaveta()}
        className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-borda bg-superficie p-0 text-texto backdrop:bg-black/50 lg:hidden"
      >
        <div className="flex h-full flex-col gap-6 p-3">
          <div className="flex items-center justify-between pt-1">
            <Marca />
            <Button variante="fantasma" tamanho="icone" onClick={fecharGaveta} aria-label="Fechar menu">
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Navegacao perfil={profile.perfil} onNavegar={fecharGaveta} />
          </div>
          <Usuario profile={profile} onSair={handleSair} saindo={saindo} />
        </div>
      </dialog>

      <main id="conteudo" ref={principal} tabIndex={-1} className="min-w-0 px-4 py-6 outline-none lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

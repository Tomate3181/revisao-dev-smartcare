import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ClipboardList, Eye, EyeOff, HeartPulse, Settings2, Stethoscope, Syringe } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { PAINEL_POR_PERFIL, PERFIS, ROTULO_PERFIL } from '@/lib/perfis'
import { supabaseConfigurado } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { entrar, ErroLogin } from '@/services/auth'
import { perfisDaTela } from '@/routes/menu'
import { Button, Input, Spinner } from '@/components/ui'

const ICONE_PERFIL = { admin: Settings2, medico: Stethoscope, enfermeiro: Syringe, recepcionista: ClipboardList }
const CHAVE_PERFIL = 'smartcare:ultimo-perfil'

const esquema = z.object({
  perfil: z.enum(PERFIS, { error: 'Selecione seu perfil' }),
  identificador: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail ou registro profissional')
    .refine((v) => (v.includes('@') ? z.email().safeParse(v).success : /^[0-9]{3,10}$/.test(v)), {
      message: 'Use um e-mail válido ou só os números do CRM/COREN',
    }),
  senha: z.string().min(6, 'A senha tem pelo menos 6 caracteres'),
})

function ultimoPerfil() {
  try {
    const p = localStorage.getItem(CHAVE_PERFIL)
    return PERFIS.includes(p) ? p : undefined
  } catch {
    return undefined
  }
}

export default function Login() {
  const { profile, carregando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [erro, setErro] = useState(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(esquema),
    mode: 'onBlur',
    defaultValues: { perfil: ultimoPerfil(), identificador: '', senha: '' },
  })
  const perfilEscolhido = useWatch({ control, name: 'perfil' })

  if (carregando) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    )
  }
  // já logado: vai direto ao painel
  if (profile) return <Navigate to={PAINEL_POR_PERFIL[profile.perfil]} replace />

  async function onSubmit(dados) {
    setErro(null)
    try {
      const perfil = await entrar(dados)
      try {
        localStorage.setItem(CHAVE_PERFIL, perfil.perfil)
      } catch {
        // storage bloqueado: só não lembra o perfil
      }
      // volta para a tela que o usuário tentou abrir, se ela for do perfil dele
      const destino = location.state?.de
      const podeVoltar = destino && perfisDaTela(destino).includes(perfil.perfil)
      navigate(podeVoltar ? destino : PAINEL_POR_PERFIL[perfil.perfil], { replace: true })
    } catch (e) {
      setErro(e instanceof ErroLogin ? e.message : 'Algo deu errado ao entrar. Tente novamente em instantes.')
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-marca p-10 text-marca-texto lg:flex" aria-hidden="true">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="size-6" />
          Smart Care
        </div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight">Triagem, leitos e fila de atendimento em tempo real.</p>
          <p className="mt-3 text-sm opacity-85">
            Classificação de risco pelo Protocolo de Manchester, alocação de médicos e leitos e indicadores para a gestão.
          </p>
        </div>
        <p className="text-xs opacity-75">SENN MED-AI · Gestão hospitalar inteligente</p>
      </section>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-ui bg-marca text-marca-texto">
              <HeartPulse className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold">Smart Care</span>
          </div>

          <h1 className="text-2xl font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-texto-suave">Use seu e-mail ou seu registro profissional.</p>

          {!supabaseConfigurado && (
            <p role="alert" className="mt-4 rounded-ui bg-aviso-suave p-3 text-sm text-aviso-texto">
              O sistema não está ligado ao banco de dados. Copie o .env.example para .env e preencha as chaves do Supabase.
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Perfil</legend>
              <div className="grid grid-cols-2 gap-2">
                {PERFIS.map((p) => {
                  const Icone = ICONE_PERFIL[p]
                  return (
                    <label
                      key={p}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-ui border px-3 py-2.5 text-sm transition-colors',
                        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco',
                        perfilEscolhido === p
                          ? 'border-marca bg-marca-suave font-medium text-marca-forte'
                          : 'border-borda bg-superficie text-texto hover:bg-superficie-2',
                      )}
                    >
                      <input type="radio" value={p} {...register('perfil')} className="sr-only" />
                      <Icone className="size-4 shrink-0" aria-hidden="true" />
                      <span className="leading-tight">{p === 'enfermeiro' ? 'Enfermeiro' : ROTULO_PERFIL[p]}</span>
                    </label>
                  )
                })}
              </div>
              {errors.perfil && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-perigo">
                  {errors.perfil.message}
                </p>
              )}
            </fieldset>

            <Input
              label="E-mail ou registro (CRM/COREN)"
              autoComplete="username"
              dica="Para registro, digite só os números"
              erro={errors.identificador?.message}
              {...register('identificador')}
            />

            <div className="relative">
              <Input
                label="Senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                classeCampo="pr-11"
                erro={errors.senha?.message}
                {...register('senha')}
              />
              <Button
                variante="fantasma"
                tamanho="icone"
                className="absolute right-0 top-6.5 size-10"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
              >
                {mostrarSenha ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </Button>
            </div>

            {erro && (
              <div role="alert" className="flex gap-2 rounded-ui bg-perigo-suave p-3 text-sm text-perigo">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{erro}</span>
              </div>
            )}

            <Button type="submit" tamanho="lg" carregando={isSubmitting}>
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

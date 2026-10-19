import {
  BarChart3,
  ClipboardList,
  HelpCircle,
  LayoutGrid,
  Settings2,
  Stethoscope,
  Syringe,
} from 'lucide-react'

/**
 * Fonte única das telas: o menu lateral e as rotas protegidas leem daqui quem acessa o quê.
 * A RLS do banco continua sendo a barreira real; isto só organiza a navegação.
 */
export const TELAS = [
  { caminho: '/admin', rotulo: 'Administração', icone: Settings2, perfis: ['admin'] },
  { caminho: '/dashboard', rotulo: 'Dashboard', icone: BarChart3, perfis: ['admin'] },
  { caminho: '/recepcao', rotulo: 'Recepção', icone: ClipboardList, perfis: ['recepcionista'] },
  { caminho: '/triagem', rotulo: 'Triagem', icone: Syringe, perfis: ['enfermeiro'] },
  { caminho: '/medico', rotulo: 'Meus atendimentos', icone: Stethoscope, perfis: ['medico'] },
  { caminho: '/monitor', rotulo: 'Mapa de ocupação', icone: LayoutGrid, perfis: ['admin', 'medico', 'enfermeiro', 'recepcionista'] },
  { caminho: '/ajuda', rotulo: 'Ajuda', icone: HelpCircle, perfis: ['admin', 'medico', 'enfermeiro', 'recepcionista'] },
]

export const perfisDaTela = (caminho) => TELAS.find((t) => t.caminho === caminho)?.perfis ?? []
export const menuDoPerfil = (perfil) => TELAS.filter((t) => t.perfis.includes(perfil))

import { createClient } from '@supabase/supabase-js'

// Só variáveis públicas (VITE_*) chegam ao navegador. A anon key é segura aqui porque
// todo acesso aos dados é filtrado pelas políticas de RLS no banco (RNF01).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey)

if (!supabaseConfigurado) {
  console.warn('[Smart Care] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Copie .env.example para .env.')
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'chave-ausente', {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
})

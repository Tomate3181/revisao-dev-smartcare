import { cn } from '@/lib/cn'

// Classe base compartilhada por Input, Select e Textarea.
export const estiloCampo = cn(
  'w-full rounded-ui border border-borda bg-superficie px-3 text-sm text-texto',
  'placeholder:text-texto-suave/70 disabled:opacity-60',
  'aria-[invalid=true]:border-perigo',
)

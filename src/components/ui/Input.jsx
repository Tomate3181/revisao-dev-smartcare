import { cn } from '@/lib/cn'
import { Campo } from './Campo'
import { estiloCampo } from './estilos'

// Compatível com react-hook-form: <Input label="Nome" {...register('nome')} erro={errors.nome?.message} />
// className vai no bloco (rótulo + campo); classeCampo vai no <input>.
export function Input({ label, erro, dica, obrigatorio, className, classeCampo, ref, ...props }) {
  return (
    <Campo label={label} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      {(a11y) => <input ref={ref} className={cn(estiloCampo, 'h-10', classeCampo)} {...a11y} {...props} />}
    </Campo>
  )
}

export function Textarea({ label, erro, dica, obrigatorio, className, rows = 3, ref, ...props }) {
  return (
    <Campo label={label} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      {(a11y) => <textarea ref={ref} rows={rows} className={cn(estiloCampo, 'py-2')} {...a11y} {...props} />}
    </Campo>
  )
}

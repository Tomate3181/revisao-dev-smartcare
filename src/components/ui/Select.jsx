import { cn } from '@/lib/cn'
import { Campo } from './Campo'
import { estiloCampo } from './estilos'

/**
 * opcoes: [{ valor, rotulo }]. `placeholder` vira uma opção vazia desabilitada.
 */
export function Select({ label, erro, dica, obrigatorio, opcoes = [], placeholder, className, ref, ...props }) {
  return (
    <Campo label={label} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      {(a11y) => (
        <select ref={ref} className={cn(estiloCampo, 'h-10')} {...a11y} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      )}
    </Campo>
  )
}

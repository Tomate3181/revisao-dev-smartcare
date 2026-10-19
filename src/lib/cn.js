// Junta classes CSS ignorando valores falsos: cn('a', cond && 'b') → 'a b'
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

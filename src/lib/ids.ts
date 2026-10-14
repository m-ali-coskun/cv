let counter = 0

/** Short random id, e.g. "k3f9x2a1". Good enough for client-side records. */
export function uid(prefix = ''): string {
  counter = (counter + 1) % 1679616
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36).slice(-4)}${rand}${counter.toString(36)}`
}

/** Next human friendly job id ("DT-2857") given the existing ones. */
export function nextJobId(existing: string[]): string {
  const max = existing.reduce((m, id) => {
    const n = Number(id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 2800)
  return `DT-${max + 1}`
}

export function nextInvoiceId(existing: string[]): string {
  const max = existing.reduce((m, id) => {
    const n = Number(id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 1000)
  return `INV-${max + 1}`
}

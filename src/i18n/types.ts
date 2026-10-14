export type Dict = Record<string, string>

/**
 * A locale namespace. `en` is the source of truth; `de` / `tr` may be partial —
 * missing keys fall back to English.
 *
 * Keys are flat strings; use dots for grouping inside a namespace, e.g.
 *   { en: { 'empty.title': 'No jobs yet' } }  →  t('jobs.empty.title')
 *
 * Interpolation: 'Hello {name}' → t('ns.key', { name: 'Ali' })
 * Plurals: provide 'key_one' and 'key_other'; pass { count }.
 */
export interface Namespace {
  en: Dict
  de: Dict
  tr: Dict
}

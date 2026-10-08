import type { Provenance } from '@/lib/api/meta'
import { provenanceLabel } from '@/lib/api/meta'

interface ProvenanceBadgeProps {
  provenance: Provenance
  /** Tooltip / aria-label override. Default text matches the user's prefs. */
  title?: string
  /** Size variant. `sm` is the default; `xs` is for inline use. */
  size?: 'xs' | 'sm'
}

/**
 * Small muted pill rendered next to rows whose dynamic fields fell back to
 * the prototype array. Returns null for fully-live rows (provenance 'db')
 * so the UI stays uncluttered.
 *
 * Styled inline rather than via a global CSS class so consumers can drop it
 * into any layout context without worrying about specificity.
 */
export function ProvenanceBadge({ provenance, title, size = 'sm' }: ProvenanceBadgeProps) {
  const label = provenanceLabel(provenance)
  if (!label) return null

  const tip =
    title
    ?? (label === 'partial'
      ? 'Partial live data. Some fields stay on the prototype until backfill completes'
      : 'Prototype data. It is replaced with live data once ingested')

  const padding = size === 'xs' ? '1px 5px' : '2px 7px'
  const fontSize = size === 'xs' ? 9 : 10

  return (
    <span
      title={tip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: 5,
        fontSize,
        fontFamily: 'var(--fm)',
        fontWeight: 500,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        background: 'rgba(74,158,255,0.08)',
        color: 'var(--blue)',
        border: '1px solid rgba(74,158,255,0.22)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

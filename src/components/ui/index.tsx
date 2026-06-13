import { X } from 'lucide-react'

// ── Modal ────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
const sizeMap = { sm: 460, md: 580, lg: 720, xl: 900 }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(15,15,15,0.6)' }} onClick={onClose} />
      <div className="notion-modal relative flex flex-col" style={{ width: '100%', maxWidth: sizeMap[size], maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(55,53,47,0.09)', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#37352F' }}>{title}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '3px 5px' }}><X size={15} /></button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Page Header (Notion style) — text only, no emoji ──
export function PageHeader({
  title, subtitle, actions
}: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <hr className="notion-divider mt-6" />
    </div>
  )
}

// ── Tags / Badges ────────────────────────────────────
type TagVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
export function Tag({ label, variant = 'gray', dot }: { label: string; variant?: TagVariant; dot?: boolean }) {
  return (
    <span className={`tag tag-${variant}`}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {label}
    </span>
  )
}

const categoryTags: Record<string, { label: string; variant: TagVariant }> = {
  refrigerator:    { label: 'Refrigerator',    variant: 'blue'   },
  washing_machine: { label: 'Washing Machine', variant: 'purple' },
  microwave_oven:  { label: 'Microwave Oven',  variant: 'yellow' },
  air_conditioner: { label: 'AC',              variant: 'green'  },
}
export function CategoryTag({ category }: { category: string }) {
  const { label, variant } = categoryTags[category] ?? { label: category, variant: 'gray' as TagVariant }
  return <Tag label={label} variant={variant} />
}

// ── Loading ──────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div className="empty-state">
      <div style={{
        width: 20, height: 20,
        border: '2px solid rgba(55,53,47,0.1)',
        borderTopColor: 'rgba(55,53,47,0.4)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────
export function EmptyState({ message, cta }: { message: string; cta?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <p style={{ marginBottom: cta ? 12 : 0 }}>{message}</p>
      {cta}
    </div>
  )
}

// ── Stat Card (Notion callout) ───────────────────────
export function StatCard({
  label, value, sub, accent
}: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="stat-block">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || '#37352F', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(55,53,47,0.45)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Form Field ───────────────────────────────────────
export function FormField({
  label, required, children, error, hint
}: { label: string; required?: boolean; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div>
      <label className="form-label">
        {label}{required && <span style={{ color: '#E03E3E', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: 'rgba(55,53,47,0.45)', marginTop: 3 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#E03E3E', marginTop: 3 }}>{error}</p>}
    </div>
  )
}

// ── Search Input ─────────────────────────────────────
export function SearchInput({
  value, onChange, placeholder = 'Search…', autoFocus
}: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{ width: 240 }}
    />
  )
}

// ── Scanner Input (Zebra TC57 optimised) ─────────────
export function ScannerInput({
  value, onChange, onScan, placeholder = 'Scan barcode…', disabled
}: {
  value: string; onChange: (v: string) => void
  onScan: (s: string) => void; placeholder?: string; disabled?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onScan(value.trim()); onChange('') } }}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus
      autoComplete="off"
      spellCheck={false}
      style={{
        width: '100%',
        fontSize: 18,
        fontFamily: 'monospace',
        padding: '10px 12px',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#2383E2',
      }}
    />
  )
}

// ── Inline Toolbar (for table rows) ──────────────────
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
      {children}
    </div>
  )
}

// ── Section divider with label ────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600,
      color: 'rgba(55,53,47,0.45)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 8,
      marginTop: 4,
    }}>
      {children}
    </div>
  )
}

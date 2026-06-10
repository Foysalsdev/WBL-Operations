import { X } from 'lucide-react'

// ── Modal ──────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Badge ──────────────────────────────────────────
type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'slate'
const badgeStyles: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-amber-50 text-amber-700',
  purple: 'bg-purple-50 text-purple-700',
  slate: 'bg-slate-100 text-slate-600',
}
export function Badge({ label, variant = 'slate' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`badge ${badgeStyles[variant]}`}>{label}</span>
  )
}

// ── Category Badge ─────────────────────────────────
const catMap: Record<string, { label: string; variant: BadgeVariant }> = {
  refrigerator: { label: 'Refrigerator', variant: 'blue' },
  washing_machine: { label: 'Washing Machine', variant: 'purple' },
  microwave_oven: { label: 'Microwave Oven', variant: 'yellow' },
  air_conditioner: { label: 'Air Conditioner', variant: 'green' },
}
export function CategoryBadge({ category }: { category: string }) {
  const { label, variant } = catMap[category] ?? { label: category, variant: 'slate' as BadgeVariant }
  return <Badge label={label} variant={variant} />
}

// ── Loading ────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
}

// ── Empty State ────────────────────────────────────
export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      {icon && <div className="mb-3 opacity-40">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color?: string
}
export function StatCard({ label, value, sub, icon, color = 'text-brand-600' }: StatCardProps) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`mt-1 ${color} opacity-80`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Form helpers ────────────────────────────────────
export function FormField({
  label, required, children, error,
}: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Search Input ───────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64"
    />
  )
}

// ── Scanner Input ──────────────────────────────────
// Optimised for Zebra TC57: large target, auto-focus, beep feedback
export function ScannerInput({
  value, onChange, onScan, placeholder = 'Scan barcode…', disabled,
}: {
  value: string
  onChange: (v: string) => void
  onScan: (serial: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onScan(value.trim())
      onChange('')
    }
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className="w-full text-lg font-mono py-3 border-2 border-brand-300 focus:border-brand-500"
    />
  )
}

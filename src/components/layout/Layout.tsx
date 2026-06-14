import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Icon } from '../ui'

// Dashboard is standalone — never inside a section
const NAV_HOME = { to: '/', label: 'Dashboard', icon: 'dashboard' }

const NAV_OPERATIONS = [
  { to: '/serial',    label: 'Serial Search',      icon: 'search' },
  { to: '/inbound',   label: 'Inbound',            icon: 'call_received' },
  { to: '/outbound',  label: 'Outbound',           icon: 'call_made' },
  { to: '/inventory', label: 'Physical Inventory', icon: 'inventory_2' },
  { to: '/stock',     label: 'Stock Summary',      icon: 'package_2' },
  { to: '/reports',   label: 'Reports',            icon: 'bar_chart' },
]
const NAV_MASTER = [
  { to: '/sku',       label: 'SKU List',  icon: 'database' },
  { to: '/customers', label: 'Customers', icon: 'group' },
]
const ALL = [NAV_HOME, ...NAV_OPERATIONS, ...NAV_MASTER]

// ── Single nav item — no nested buttons ──────────────────────────
function NavItem({
  to, label, icon, end, onClick
}: { to: string; label: string; icon: string; end?: boolean; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors',
          isActive
            ? 'bg-black/8 text-gray-900 font-medium'
            : 'text-gray-600 hover:bg-black/5 hover:text-gray-900',
        ].join(' ')
      }
      style={{ marginLeft: 4, textDecoration: 'none' }}
    >
      <Icon name={icon} size={16} style={{ color: 'rgba(55,53,47,0.55)', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 14, lineHeight: '22px' }}>{label}</span>
    </NavLink>
  )
}

// ── Collapsible section ──────────────────────────────────────────
function Section({
  title,
  items,
  open,
  onToggle,
  onNavigate,
}: {
  title: string
  items: typeof NAV_OPERATIONS
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div style={{ marginBottom: 2 }}>
      {/* Header — click only to toggle, not to navigate */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          width: '100%', padding: '4px 8px', borderRadius: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          userSelect: 'none',
        }}
        className="hover:bg-black/5"
      >
        <Icon
          name={open ? 'keyboard_arrow_down' : 'chevron_right'}
          size={14}
          style={{ color: 'rgba(55,53,47,0.45)', flexShrink: 0 }}
        />
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(55,53,47,0.50)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          flex: 1,
          textAlign: 'left',
        }}>
          {title}
        </span>
      </button>

      {open && (
        <div style={{ paddingTop: 2 }}>
          {items.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              onClick={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Layout ───────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(true)
  const [masterOpen, setMasterOpen] = useState(true)
  const location = useLocation()
  const current = ALL.find(n => n.to === location.pathname)
  const closeMobile = () => setMobileOpen(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F7F5' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed', inset: 0, zIndex: 20,
            background: 'rgba(0,0,0,0.3)',
          }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside
        style={{
          width: 240,
          background: '#F7F7F5',
          borderRight: '1px solid rgba(55,53,47,0.09)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100%',
          zIndex: 30,
        }}
        className={`
          fixed top-0 left-0
          transition-transform duration-200
          lg:static lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >

        {/* Workspace header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 12px', height: 48, flexShrink: 0,
          borderBottom: '1px solid rgba(55,53,47,0.07)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: 1, minWidth: 0,
            padding: '4px 6px', borderRadius: 4,
            cursor: 'pointer',
          }}
            className="hover:bg-black/5"
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              background: '#37352F', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>W</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#37352F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              WBL Operations
            </span>
            <Icon name="keyboard_arrow_down" size={16} style={{ color: 'rgba(55,53,47,0.45)', flexShrink: 0 }} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>

          {/* Dashboard — standalone home item */}
          <NavItem
            to={NAV_HOME.to}
            label={NAV_HOME.label}
            icon={NAV_HOME.icon}
            end
            onClick={closeMobile}
          />

          <div style={{ height: 12 }} />

          {/* Operations section */}
          <Section
            title="Operations"
            items={NAV_OPERATIONS}
            open={opsOpen}
            onToggle={() => setOpsOpen(o => !o)}
            onNavigate={closeMobile}
          />

          <div style={{ height: 8 }} />

          {/* Master Data section */}
          <Section
            title="Master Data"
            items={NAV_MASTER}
            open={masterOpen}
            onToggle={() => setMasterOpen(o => !o)}
            onNavigate={closeMobile}
          />
        </nav>

        {/* Footer */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(55,53,47,0.09)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(55,53,47,0.55)' }}>Madanpur Warehouse</div>
          <div style={{ fontSize: 10, color: 'rgba(55,53,47,0.45)', marginTop: 2 }}>v1.0</div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: 48, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 24px',
          borderBottom: '1px solid rgba(55,53,47,0.09)',
          background: '#FFFFFF',
        }}>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden"
            style={{
              background: 'rgba(55,53,47,0.06)', border: 'none',
              borderRadius: 4, padding: '4px 6px',
              cursor: 'pointer', color: 'rgba(55,53,47,0.65)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: 'rgba(55,53,47,0.50)' }}>WBL Operations</span>
            <Icon name="chevron_right" size={14} style={{ color: 'rgba(55,53,47,0.35)' }} />
            <Icon
              name={current?.icon ?? 'dashboard'}
              size={15}
              style={{ color: 'rgba(55,53,47,0.60)' }}
            />
            <span style={{ color: '#37352F', fontWeight: 500 }}>
              {current?.label ?? 'Dashboard'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#FFFFFF' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 56px' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Icon } from '../ui'

const NAV_OPERATIONS = [
  { to: '/',          label: 'Dashboard',         icon: 'dashboard' },
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
const ALL = [...NAV_OPERATIONS, ...NAV_MASTER]

function SidebarSection({
  title, items, open, onToggle, onNavigate
}: {
  title: string
  items: { to: string; label: string; icon: string }[]
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div className="mb-0.5">
      {/* Section header — collapsible, hover reveals + button */}
      <div
        className="group flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-black/5"
        onClick={onToggle}
        style={{ userSelect: 'none' }}
      >
        <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(55,53,47,0.45)' }}>
          <Icon name={open ? 'expand_more' : 'chevron_right'} size={14} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>
          {title}
        </span>
        <button
          onClick={(e) => { e.stopPropagation() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'rgba(55,53,47,0.45)', borderRadius: 3, display: 'flex' }}
          title="Add page"
        >
          <Icon name="add" size={14} />
        </button>
      </div>

      {/* Items */}
      {open && items.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => `
            group flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors
            ${isActive ? 'bg-gray-200/80 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-100'}
          `}
          style={{ marginLeft: 4 }}
        >
          <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={icon} size={16} />
          </span>
          <span className="truncate" style={{ flex: 1, fontSize: 14 }}>{label}</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'rgba(55,53,47,0.4)', borderRadius: 3, flexShrink: 0, display: 'flex' }}
            title="More"
          >
            <Icon name="more_horiz" size={14} />
          </button>
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(true)
  const [masterOpen, setMasterOpen] = useState(true)
  const location = useLocation()
  const current = ALL.find(n => n.to === location.pathname)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F7F7F5' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        transition-transform duration-200 lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        style={{
          width: 240,
          background: '#F7F7F5',
          borderRight: '1px solid rgba(55,53,47,0.09)',
        }}
      >
        {/* Workspace header */}
        <div className="flex items-center gap-2 px-3 py-3" style={{ minHeight: 48 }}>
          <div className="flex items-center gap-2 flex-1 min-w-0 px-1.5 py-1 rounded cursor-pointer hover:bg-black/5 transition-colors">
            <div style={{
              width: 20, height: 20, borderRadius: 4, background: '#37352F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>W</div>
            <span className="text-sm font-semibold text-gray-800 truncate">WBL Operations</span>
            <span className="flex-shrink-0 ml-auto" style={{ color: 'rgba(55,53,47,0.45)', display: 'flex' }}>
              <Icon name="expand_more" size={16} />
            </span>
          </div>
        </div>

        {/* Search row */}
        <div className="px-3 mb-1">
          <div className="flex items-center gap-2 px-2 py-1 rounded text-sm text-gray-500 hover:bg-black/5 cursor-pointer transition-colors">
            <span style={{ color: 'rgba(55,53,47,0.45)', display: 'flex' }}>
              <Icon name="search" size={15} />
            </span>
            <span style={{ fontSize: 13 }}>Search</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <SidebarSection
            title="Operations"
            items={NAV_OPERATIONS}
            open={opsOpen}
            onToggle={() => setOpsOpen(o => !o)}
            onNavigate={() => setMobileOpen(false)}
          />
          <div className="mt-2">
            <SidebarSection
              title="Master Data"
              items={NAV_MASTER}
              open={masterOpen}
              onToggle={() => setMasterOpen(o => !o)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(55,53,47,0.09)' }}>
          <div style={{ fontSize: 11, color: 'rgba(55,53,47,0.40)' }}>Madanpur Warehouse</div>
          <div style={{ fontSize: 10, color: 'rgba(55,53,47,0.30)', marginTop: 2 }}>v1.0</div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-2 px-4 lg:px-8"
          style={{
            height: 48,
            borderBottom: '1px solid rgba(55,53,47,0.09)',
            background: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden"
            style={{
              background: 'rgba(55,53,47,0.06)',
              border: 'none',
              borderRadius: 4,
              padding: '4px 6px',
              cursor: 'pointer',
              color: 'rgba(55,53,47,0.65)',
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* Breadcrumb with page icon */}
          <div className="flex items-center gap-1.5" style={{ fontSize: 13, color: 'rgba(55,53,47,0.55)' }}>
            <span>WBL Operations</span>
            <Icon name="chevron_right" size={14} style={{ color: 'rgba(55,53,47,0.30)' }} />
            <Icon name={current?.icon ?? 'dashboard'} size={16} style={{ color: 'rgba(55,53,47,0.65)' }} />
            <span style={{ color: '#37352F', fontWeight: 500 }}>
              {current?.label ?? 'Dashboard'}
            </span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
          <div className="max-w-5xl mx-auto px-6 lg:px-14 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

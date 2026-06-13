import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X, ChevronRight } from 'lucide-react'

const NAV_OPERATIONS = [
  { to: '/',          label: 'Dashboard' },
  { to: '/serial',    label: 'Serial Search' },
  { to: '/inbound',   label: 'Inbound' },
  { to: '/outbound',  label: 'Outbound' },
  { to: '/inventory', label: 'Physical Inventory' },
  { to: '/stock',     label: 'Stock Summary' },
  { to: '/reports',   label: 'Reports' },
]
const NAV_MASTER = [
  { to: '/sku',       label: 'SKU List' },
  { to: '/customers', label: 'Customers' },
]
const ALL = [...NAV_OPERATIONS, ...NAV_MASTER]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
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
          <div className="flex items-center gap-2 flex-1 min-w-0 px-1 py-1 rounded cursor-pointer hover:bg-black/5 transition-colors">
            <div className="w-5 h-5 rounded-sm bg-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">WBL Operations</span>
            <ChevronRight size={12} className="flex-shrink-0 ml-auto" style={{ color: 'rgba(55,53,47,0.45)' }} />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">

          {/* Operations */}
          <div className="mb-1">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '8px 8px' }}>
              Operations
            </div>
            {NAV_OPERATIONS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors
                  ${isActive 
                    ? 'bg-gray-200 text-gray-900 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-3">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '8px 8px' }}>
              Master Data
            </div>
            {NAV_MASTER.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors
                  ${isActive 
                    ? 'bg-gray-200 text-gray-900 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <span>{label}</span>
              </NavLink>
            ))}
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

          {/* Breadcrumb */}
          <div className="flex items-center gap-1" style={{ fontSize: 13, color: 'rgba(55,53,47,0.55)' }}>
            <span>WBL</span>
            <ChevronRight size={12} style={{ color: 'rgba(55,53,47,0.30)' }} />
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

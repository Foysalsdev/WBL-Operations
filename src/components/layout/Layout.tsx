import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, PackageCheck, PackageMinus, ClipboardList,
  Database, Users, BarChart2, Boxes, Menu, X,
  ChevronDown, ScanLine, Truck, ChevronRight
} from 'lucide-react'

const NAV_OPERATIONS = [
  { to: '/',          label: 'Dashboard',          icon: LayoutDashboard, emoji: '🏠' },
  { to: '/serial',    label: 'Serial Search',       icon: ScanLine,        emoji: '🔍' },
  { to: '/inbound',   label: 'Inbound',             icon: PackageCheck,    emoji: '📥' },
  { to: '/outbound',  label: 'Outbound',            icon: PackageMinus,    emoji: '📤' },
  { to: '/inventory', label: 'Physical Inventory',  icon: ClipboardList,   emoji: '📋' },
  { to: '/stock',     label: 'Stock Summary',       icon: Boxes,           emoji: '📦' },
  { to: '/reports',   label: 'Reports',             icon: BarChart2,       emoji: '📊' },
]
const NAV_MASTER = [
  { to: '/sku',       label: 'SKU List',   icon: Database, emoji: '🗄️' },
  { to: '/customers', label: 'Customers',  icon: Users,    emoji: '👥' },
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

      {/* ── Sidebar ───────────────────────────────────── */}
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
            <div className="w-5 h-5 rounded-sm bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Truck size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-notion-text truncate" style={{ color: '#37352F' }}>
              WBL Operations
            </span>
            <ChevronDown size={13} className="flex-shrink-0 ml-auto" style={{ color: 'rgba(55,53,47,0.45)' }} />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">

          {/* Operations */}
          <div className="mb-1">
            <div className="px-2 py-1" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Operations
            </div>
            {NAV_OPERATIONS.map(({ to, label, emoji }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-3">
            <div className="px-2 py-1" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Master Data
            </div>
            {NAV_MASTER.map(({ to, label, emoji }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(55,53,47,0.09)' }}>
          <div style={{ fontSize: 11, color: 'rgba(55,53,47,0.40)' }}>Madanpur Warehouse · v1.0</div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar — mobile only breadcrumb */}
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
            className="lg:hidden btn-ghost mr-1"
            style={{ padding: '4px 6px' }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1" style={{ fontSize: 13, color: 'rgba(55,53,47,0.55)' }}>
            <Truck size={13} style={{ color: 'rgba(55,53,47,0.40)' }} />
            <span>WBL</span>
            <ChevronRight size={12} style={{ color: 'rgba(55,53,47,0.30)' }} />
            <span style={{ color: '#37352F', fontWeight: 500 }}>
              {current?.label ?? 'WBL Operations'}
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

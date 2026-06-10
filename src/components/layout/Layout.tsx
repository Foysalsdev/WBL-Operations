import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, PackageCheck, PackageMinus, ClipboardList,
  Database, Users, BarChart2, Boxes, Menu, X, Truck, ChevronRight
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbound', label: 'Inbound', icon: PackageCheck },
  { to: '/outbound', label: 'Outbound', icon: PackageMinus },
  { to: '/inventory', label: 'Physical Inventory', icon: ClipboardList },
  { to: '/stock', label: 'Stock Summary', icon: Boxes },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/sku', label: 'SKU List', icon: Database },
  { to: '/customers', label: 'Customers', icon: Users },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const pageName = NAV.find(n => n.to === location.pathname)?.label ?? 'WBL Operations'

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 z-30 flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">WBL Operations</p>
              <p className="text-slate-400 text-xs">Whirlpool Bangladesh</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <p className="px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Operations</p>
          {NAV.slice(0, 6).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors relative
                ${isActive
                  ? 'text-white bg-brand-600/20 border-r-2 border-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <p className="px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-5">Master Data</p>
          {NAV.slice(6).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors
                ${isActive
                  ? 'text-white bg-brand-600/20 border-r-2 border-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">Madanpur Warehouse</p>
          <p className="text-xs text-slate-600 mt-0.5">v1.0 · PWA + Zebra TC57</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span>WBL</span>
            <ChevronRight size={14} />
            <span className="text-slate-900 font-medium">{pageName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Icon } from '../ui'

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',         icon: 'dashboard',    dividerAfter: true  },
  { to: '/inbound',   label: 'Inbound',            icon: 'call_received' },
  { to: '/outbound',  label: 'Outbound',           icon: 'call_made'     },
  { to: '/serial',    label: 'Serial Search',      icon: 'search'        },
  { to: '/inventory', label: 'Physical Inventory', icon: 'inventory_2'   },
  { to: '/stock',     label: 'Stock Summary',      icon: 'package_2'     },
  { to: '/reports',   label: 'Reports',            icon: 'bar_chart',    dividerAfter: true  },
  { to: '/sku',       label: 'SKU List',           icon: 'database'      },
  { to: '/customers', label: 'Customers',          icon: 'group'         },
]

function NavItem({ to, label, icon, end, onClick }: {
  to: string; label: string; icon: string; end?: boolean; onClick: () => void
}) {
  return (
    <NavLink
      to={to} end={end} onClick={onClick}
      style={{ textDecoration: 'none' }}
      className={({ isActive }) => [
        'flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors',
        isActive
          ? 'bg-black/8 text-gray-900 font-medium'
          : 'text-gray-600 hover:bg-black/5 hover:text-gray-900',
      ].join(' ')}
    >
      <Icon name={icon} size={16} style={{ color: 'inherit', opacity: 0.7, flexShrink: 0 }} />
      <span style={{ fontSize: 14, lineHeight: '22px' }}>{label}</span>
    </NavLink>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const current = NAV_ITEMS.find(n => n.to === location.pathname)
  const closeMobile = () => setMobileOpen(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F7F5' }}>

      {mobileOpen && (
        <div onClick={closeMobile} className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.3)' }} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 transition-transform duration-200 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 220, height: '100%', background: '#F7F7F5', borderRight: '1px solid rgba(55,53,47,0.09)', display: 'flex', flexDirection: 'column', zIndex: 30 }}
      >
        {/* Workspace */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: 48, borderBottom: '1px solid rgba(55,53,47,0.07)', flexShrink: 0 }}>
          <div className="flex items-center gap-2 flex-1 min-w-0 px-1 py-1 rounded hover:bg-black/5 cursor-pointer transition-colors">
            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#37352F', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>W</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#37352F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>WBL Operations</span>
            <Icon name="keyboard_arrow_down" size={15} style={{ color: 'rgba(55,53,47,0.45)', flexShrink: 0 }} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {NAV_ITEMS.map(({ to, label, icon, dividerAfter }) => (
            <div key={to}>
              <NavItem to={to} label={label} icon={icon} end={to === '/'} onClick={closeMobile} />
              {dividerAfter && <div style={{ height: 1, background: 'rgba(55,53,47,0.07)', margin: '5px 4px' }} />}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(55,53,47,0.09)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(55,53,47,0.55)' }}>Madanpur Warehouse</div>
          <div style={{ fontSize: 10, color: 'rgba(55,53,47,0.45)', marginTop: 2 }}>v1.0</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', borderBottom: '1px solid rgba(55,53,47,0.09)', background: '#FFFFFF' }}>
          <button onClick={() => setMobileOpen(v => !v)} className="lg:hidden btn-ghost">
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: 'rgba(55,53,47,0.50)' }}>WBL Operations</span>
            <Icon name="chevron_right" size={13} style={{ color: 'rgba(55,53,47,0.35)' }} />
            <Icon name={current?.icon ?? 'dashboard'} size={15} style={{ color: 'rgba(55,53,47,0.60)' }} />
            <span style={{ color: '#37352F', fontWeight: 500 }}>{current?.label ?? 'Dashboard'}</span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', background: '#FFFFFF' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 56px' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { StatCard, LoadingSpinner, PageHeader } from '../../components/ui'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const thisMonth = format(new Date(), 'MMMM')
      const [inAll, outAll, invCount, inMonth, outMonth] = await Promise.all([
        supabase.from('inbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty,air_conditioner_qty,transport_cost'),
        supabase.from('outbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty,transport_cost'),
        supabase.from('physical_inventory').select('id', { count: 'exact', head: true }),
        supabase.from('inbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty,air_conditioner_qty').eq('month', thisMonth),
        supabase.from('outbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty').eq('month', thisMonth),
      ])
      const sumQty = (rows: any[]) => (rows || []).reduce((a: number, r: any) =>
        a + (r.refrigerator_qty||0) + (r.washing_machine_qty||0) + (r.microwave_oven_qty||0) + (r.air_conditioner_qty||0), 0)
      const sumCost = (rows: any[]) => (rows || []).reduce((a: number, r: any) => a + (r.transport_cost||0), 0)
      return {
        totalInbound:  sumQty(inAll.data  || []),
        totalOutbound: sumQty(outAll.data || []),
        totalScans:    invCount.count || 0,
        monthInbound:  sumQty(inMonth.data  || []),
        monthOutbound: sumQty(outMonth.data || []),
        totalCost: sumCost([...(inAll.data||[]), ...(outAll.data||[])]),
        thisMonth,
      }
    },
  })
}

function useChart() {
  return useQuery({
    queryKey: ['monthly-chart'],
    queryFn: async () => {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const [inD, outD] = await Promise.all([
        supabase.from('inbound_entries').select('month,refrigerator_qty,washing_machine_qty,microwave_oven_qty,air_conditioner_qty'),
        supabase.from('outbound_entries').select('month,refrigerator_qty,washing_machine_qty,microwave_oven_qty'),
      ])
      const sumByMonth = (rows: any[]) => {
        const m: Record<string, number> = {}
        for (const r of rows||[]) {
          if (!r.month) continue
          m[r.month] = (m[r.month]||0) + (r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0)
        }
        return m
      }
      const inMap  = sumByMonth(inD.data  || [])
      const outMap = sumByMonth(outD.data || [])
      return months.filter(m => inMap[m] || outMap[m]).map(m => ({
        month: m.slice(0,3), Inbound: inMap[m]||0, Outbound: outMap[m]||0
      }))
    },
  })
}

function useRecent() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const [inD, outD] = await Promise.all([
        supabase.from('inbound_entries').select('*').order('receiving_date', { ascending: false }).limit(6),
        supabase.from('outbound_entries').select('*').order('dispatch_date', { ascending: false }).limit(6),
      ])
      return { inbound: inD.data||[], outbound: outD.data||[] }
    },
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(55,53,47,0.12)',
      borderRadius: 6, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#37352F' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const stats  = useStats()
  const chart  = useChart()
  const recent = useRecent()

  if (stats.isLoading) return <LoadingSpinner />
  const s = stats.data!

  return (
    <div>
      <PageHeader
        icon="🏠"
        title="Dashboard"
        subtitle={`${format(new Date(), 'EEEE, d MMMM yyyy')} · Madanpur Warehouse`}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Inbound"   value={s.totalInbound.toLocaleString()}  sub={`+${s.monthInbound} this month`}    accent="#0F7B6C" />
        <StatCard label="Total Outbound"  value={s.totalOutbound.toLocaleString()} sub={`+${s.monthOutbound} this month`}   accent="#E03E3E" />
        <StatCard label="Inventory Scans" value={s.totalScans.toLocaleString()}    sub="Physical count records"             accent="#6940A5" />
        <StatCard label="Transport Cost"  value={`৳${Math.round(s.totalCost/1000)}K`} sub="All-time total"                 accent="#DFAB01" />
      </div>

      {/* Chart + Recent side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Chart */}
        <div className="lg:col-span-2">
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Monthly Movement
          </div>
          {chart.isLoading ? <LoadingSpinner /> : !chart.data?.length ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(55,53,47,0.3)', fontSize: 13, border: '1px dashed rgba(55,53,47,0.15)', borderRadius: 6 }}>
              Add inbound/outbound entries to see trends
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart.data} barSize={14} barGap={3}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(55,53,47,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(55,53,47,0.5)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(55,53,47,0.5)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(55,53,47,0.03)' }} />
                <Bar dataKey="Inbound"  fill="#0F7B6C" radius={[2,2,0,0]} />
                <Bar dataKey="Outbound" fill="#E03E3E" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* This month summary */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {s.thisMonth} Summary
          </div>
          <div className="stat-block" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ fontSize: 13, color: 'rgba(55,53,47,0.7)' }}>Inbound</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#0F7B6C' }}>{s.monthInbound}</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(55,53,47,0.06)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ fontSize: 13, color: 'rgba(55,53,47,0.7)' }}>Outbound</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#E03E3E' }}>{s.monthOutbound}</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(55,53,47,0.06)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ fontSize: 13, color: 'rgba(55,53,47,0.7)' }}>Net</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: s.monthInbound - s.monthOutbound >= 0 ? '#0F7B6C' : '#E03E3E' }}>
                {s.monthInbound - s.monthOutbound >= 0 ? '+' : ''}{s.monthInbound - s.monthOutbound}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inbound */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Recent Inbound
          </div>
          <div className="card overflow-hidden">
            <table className="notion-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {recent.data?.inbound.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(55,53,47,0.35)', padding: '20px 12px', fontSize: 13 }}>No entries yet</td></tr>
                )}
                {recent.data?.inbound.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 140 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }} className="truncate block">{r.party_name}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.55)', whiteSpace: 'nowrap' }}>{r.receiving_date}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F7B6C', fontSize: 13 }}>
                      +{(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Outbound */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Recent Outbound
          </div>
          <div className="card overflow-hidden">
            <table className="notion-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {recent.data?.outbound.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(55,53,47,0.35)', padding: '20px 12px', fontSize: 13 }}>No entries yet</td></tr>
                )}
                {recent.data?.outbound.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 140 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }} className="truncate block">{r.party_name}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.55)', whiteSpace: 'nowrap' }}>{r.dispatch_date}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#E03E3E', fontSize: 13 }}>
                      −{(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

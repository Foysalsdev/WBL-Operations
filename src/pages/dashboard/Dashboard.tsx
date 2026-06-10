import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { StatCard, LoadingSpinner } from '../../components/ui'
import {
  PackageCheck, PackageMinus, ClipboardList, Boxes,
  TrendingUp, TrendingDown, AlertCircle, Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts'

function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date()
      const thisMonth = format(today, 'MMMM')

      const [inboundAll, outboundAll, inventoryCount, inboundMonth, outboundMonth] = await Promise.all([
        supabase.from('inbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty,air_conditioner_qty,transport_cost'),
        supabase.from('outbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty,transport_cost'),
        supabase.from('physical_inventory').select('id', { count: 'exact', head: true }),
        supabase.from('inbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty').eq('month', thisMonth),
        supabase.from('outbound_entries').select('refrigerator_qty,washing_machine_qty,microwave_oven_qty').eq('month', thisMonth),
      ])

      const sumQty = (rows: any[]) =>
        (rows || []).reduce((a: number, r: any) =>
          a + (r.refrigerator_qty || 0) + (r.washing_machine_qty || 0) + (r.microwave_oven_qty || 0) + (r.air_conditioner_qty || 0), 0)

      const sumCost = (rows: any[]) =>
        (rows || []).reduce((a: number, r: any) => a + (r.transport_cost || 0), 0)

      return {
        totalInbound: sumQty(inboundAll.data || []),
        totalOutbound: sumQty(outboundAll.data || []),
        totalInventoryScans: inventoryCount.count || 0,
        monthInbound: sumQty(inboundMonth.data || []),
        monthOutbound: sumQty(outboundMonth.data || []),
        totalTransportCost: sumCost([...(inboundAll.data || []), ...(outboundAll.data || [])]),
        thisMonth,
      }
    },
  })
}

function useMonthlyChart() {
  return useQuery({
    queryKey: ['monthly-chart'],
    queryFn: async () => {
      const months = ['January','February','March','April','May','June',
        'July','August','September','October','November','December']

      const [inboundData, outboundData] = await Promise.all([
        supabase.from('inbound_entries').select('month,refrigerator_qty,washing_machine_qty,microwave_oven_qty'),
        supabase.from('outbound_entries').select('month,refrigerator_qty,washing_machine_qty,microwave_oven_qty'),
      ])

      const sumByMonth = (rows: any[]) => {
        const map: Record<string, number> = {}
        for (const r of rows || []) {
          if (!r.month) continue
          map[r.month] = (map[r.month] || 0) + (r.refrigerator_qty || 0) + (r.washing_machine_qty || 0) + (r.microwave_oven_qty || 0)
        }
        return map
      }

      const inMap = sumByMonth(inboundData.data || [])
      const outMap = sumByMonth(outboundData.data || [])

      return months
        .filter(m => inMap[m] || outMap[m])
        .map(m => ({ month: m.slice(0, 3), Inbound: inMap[m] || 0, Outbound: outMap[m] || 0 }))
    },
  })
}

function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const [inbound, outbound] = await Promise.all([
        supabase.from('inbound_entries').select('*').order('receiving_date', { ascending: false }).limit(5),
        supabase.from('outbound_entries').select('*').order('dispatch_date', { ascending: false }).limit(5),
      ])
      return {
        inbound: inbound.data || [],
        outbound: outbound.data || [],
      }
    },
  })
}

export default function Dashboard() {
  const stats = useStats()
  const chart = useMonthlyChart()
  const recent = useRecentActivity()

  if (stats.isLoading) return <LoadingSpinner />

  const s = stats.data!

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(), 'EEEE, dd MMMM yyyy')} · Madanpur Warehouse
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-100 rounded-lg px-3 py-2">
          <Calendar size={14} />
          {s.thisMonth} Overview
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inbound"
          value={s.totalInbound.toLocaleString()}
          sub={`${s.monthInbound} this month`}
          icon={<PackageCheck size={22} />}
          color="text-emerald-600"
        />
        <StatCard
          label="Total Outbound"
          value={s.totalOutbound.toLocaleString()}
          sub={`${s.monthOutbound} this month`}
          icon={<PackageMinus size={22} />}
          color="text-red-500"
        />
        <StatCard
          label="Inventory Scans"
          value={s.totalInventoryScans.toLocaleString()}
          sub="Physical count records"
          icon={<ClipboardList size={22} />}
          color="text-purple-600"
        />
        <StatCard
          label="Transport Cost"
          value={`৳${Math.round(s.totalTransportCost / 1000)}K`}
          sub="All time total"
          icon={<Boxes size={22} />}
          color="text-amber-600"
        />
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Monthly Movement</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/>Inbound</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"/>Outbound</span>
            </div>
          </div>
          {chart.isLoading ? (
            <LoadingSpinner />
          ) : chart.data?.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No data yet — add inbound/outbound entries to see trends.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart.data} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="Inbound" fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="Outbound" fill="#f87171" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick summary */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">This Month</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <TrendingUp size={15} className="text-emerald-500" /> Inbound
              </div>
              <span className="font-semibold text-slate-900">{s.monthInbound}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <TrendingDown size={15} className="text-red-400" /> Outbound
              </div>
              <span className="font-semibold text-slate-900">{s.monthOutbound}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <AlertCircle size={15} className="text-amber-500" /> Net Movement
              </div>
              <span className={`font-semibold ${s.monthInbound - s.monthOutbound >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {s.monthInbound - s.monthOutbound >= 0 ? '+' : ''}{s.monthInbound - s.monthOutbound}
              </span>
            </div>
          </div>

          {/* Recent inbound */}
          <h3 className="font-medium text-slate-700 mt-6 mb-3 text-sm">Recent Inbound</h3>
          <div className="space-y-2">
            {recent.data?.inbound.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-700 font-medium truncate max-w-[130px]">{r.party_name}</p>
                  <p className="text-slate-400">{r.receiving_date}</p>
                </div>
                <span className="text-emerald-600 font-semibold">
                  +{(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner, StatCard } from '../../components/ui'
import { BarChart2, TrendingUp, TrendingDown, DollarSign, Truck } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import { MONTHS } from '../../types/database'

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

interface InboundRow { month: string|null; party_name: string; refrigerator_qty: number; washing_machine_qty: number; microwave_oven_qty: number; air_conditioner_qty: number; transport_cost: number|null; transport_vendor: string|null }
interface OutboundRow { month: string|null; party_name: string; refrigerator_qty: number; washing_machine_qty: number; microwave_oven_qty: number; transport_cost: number|null; transport_vendor: string|null }

function useReportsData() {
  return useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const [inbound, outbound] = await Promise.all([
        supabase.from('inbound_entries').select('month,party_name,refrigerator_qty,washing_machine_qty,microwave_oven_qty,air_conditioner_qty,transport_cost,transport_vendor'),
        supabase.from('outbound_entries').select('month,party_name,refrigerator_qty,washing_machine_qty,microwave_oven_qty,transport_cost,transport_vendor'),
      ])

      const inRows: InboundRow[] = (inbound.data || []) as InboundRow[]
      const outRows: OutboundRow[] = (outbound.data || []) as OutboundRow[]

      const monthly = MONTHS.map(m => {
        const inM = inRows.filter(r => r.month === m)
        const outM = outRows.filter(r => r.month === m)
        const sumInQty = inM.reduce((a, r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0), 0)
        const sumOutQty = outM.reduce((a, r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0), 0)
        const cost = inM.reduce((a, r) => a+(r.transport_cost||0), 0) + outM.reduce((a, r) => a+(r.transport_cost||0), 0)
        return { month: m.slice(0, 3), Inbound: sumInQty, Outbound: sumOutQty, Cost: cost }
      }).filter(m => m.Inbound || m.Outbound)

      const catTotal = {
        Refrigerator: outRows.reduce((a, r) => a+(r.refrigerator_qty||0), 0),
        'Washing Machine': outRows.reduce((a, r) => a+(r.washing_machine_qty||0), 0),
        'Microwave Oven': outRows.reduce((a, r) => a+(r.microwave_oven_qty||0), 0),
      }
      const catData = Object.entries(catTotal).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

      const custMap: Record<string, number> = {}
      for (const r of outRows) {
        custMap[r.party_name] = (custMap[r.party_name]||0)+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)
      }
      const topCustomers = Object.entries(custMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name, qty]) => ({ name, qty }))

      const vendorMap: Record<string, number> = {}
      for (const r of [...inRows, ...outRows]) {
        if (r.transport_vendor) vendorMap[r.transport_vendor] = (vendorMap[r.transport_vendor]||0)+(r.transport_cost||0)
      }
      const topVendors = Object.entries(vendorMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, cost]) => ({ name, cost }))

      const totalInboundCost = inRows.reduce((a,r) => a+(r.transport_cost||0), 0)
      const totalOutboundCost = outRows.reduce((a,r) => a+(r.transport_cost||0), 0)
      const totalInboundQty = inRows.reduce((a,r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0), 0)
      const totalOutboundQty = outRows.reduce((a,r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0), 0)

      return { monthly, catData, topCustomers, topVendors, totalInboundCost, totalOutboundCost, totalInboundQty, totalOutboundQty }
    },
  })
}

export default function ReportsPage() {
  const { data, isLoading } = useReportsData()

  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 size={20} className="text-brand-500" /> Reports & Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">All-time summary — Madanpur Warehouse</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inbound Qty" value={data.totalInboundQty.toLocaleString()} icon={<TrendingUp size={22}/>} color="text-emerald-600"/>
        <StatCard label="Total Outbound Qty" value={data.totalOutboundQty.toLocaleString()} icon={<TrendingDown size={22}/>} color="text-red-500"/>
        <StatCard label="Inbound Transport" value={`৳${Math.round(data.totalInboundCost/1000)}K`} icon={<DollarSign size={22}/>} color="text-blue-500"/>
        <StatCard label="Outbound Transport" value={`৳${Math.round(data.totalOutboundCost/1000)}K`} icon={<Truck size={22}/>} color="text-amber-500"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-slate-900 mb-5">Monthly Inbound vs Outbound</h2>
          {data.monthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.monthly} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }}/>
                <Legend wrapperStyle={{ fontSize: '12px' }}/>
                <Bar dataKey="Inbound" fill="#10b981" radius={[3,3,0,0]}/>
                <Bar dataKey="Outbound" fill="#f87171" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-5">Outbound by Category</h2>
          {data.catData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.catData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {data.catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }}/>
                <Legend wrapperStyle={{ fontSize: '11px' }}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Top Customers (by Outbound Qty)</h2>
          {data.topCustomers.length === 0 ? <p className="text-slate-400 text-sm">No data</p> : (
            <div className="space-y-2.5">
              {data.topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 font-mono">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{c.name}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(c.qty/data.topCustomers[0].qty)*100}%` }}/>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{c.qty.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Top Transport Vendors (by Cost)</h2>
          {data.topVendors.length === 0 ? <p className="text-slate-400 text-sm">No data</p> : (
            <div className="space-y-2.5">
              {data.topVendors.map((v, i) => (
                <div key={v.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 font-mono">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{v.name}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(v.cost/data.topVendors[0].cost)*100}%` }}/>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">৳{Math.round(v.cost/1000)}K</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-5">Monthly Transport Cost (৳)</h2>
        {data.monthly.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.monthly} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }}/>
              <Bar dataKey="Cost" fill="#f59e0b" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

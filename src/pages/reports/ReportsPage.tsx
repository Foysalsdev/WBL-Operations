import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner, StatCard, PageHeader } from '../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { MONTHS } from '../../types/database'

const COLORS = ['#2383E2','#6940A5','#DFAB01','#0F7B6C','#E03E3E']

interface InRow { month: string|null; party_name: string; refrigerator_qty: number; washing_machine_qty: number; microwave_oven_qty: number; air_conditioner_qty: number; transport_cost: number|null; transport_vendor: string|null }
interface OutRow { month: string|null; party_name: string; refrigerator_qty: number; washing_machine_qty: number; microwave_oven_qty: number; transport_cost: number|null; transport_vendor: string|null }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(55,53,47,0.12)', borderRadius:6, padding:'8px 12px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
      <p style={{ fontWeight:600, marginBottom:4 }}>{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  )
}

function useData() {
  return useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const [inD, outD] = await Promise.all([
        supabase.from('inbound_entries').select('month,party_name,refrigerator_qty,washing_machine_qty,microwave_oven_qty,air_conditioner_qty,transport_cost,transport_vendor'),
        supabase.from('outbound_entries').select('month,party_name,refrigerator_qty,washing_machine_qty,microwave_oven_qty,transport_cost,transport_vendor'),
      ])
      const inRows = (inD.data||[]) as InRow[]
      const outRows = (outD.data||[]) as OutRow[]

      const monthly = MONTHS.map(m => {
        const iM = inRows.filter(r => r.month===m)
        const oM = outRows.filter(r => r.month===m)
        return { month: m.slice(0,3), Inbound: iM.reduce((a,r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0),0), Outbound: oM.reduce((a,r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0),0), Cost: iM.reduce((a,r) => a+(r.transport_cost||0),0)+oM.reduce((a,r) => a+(r.transport_cost||0),0) }
      }).filter(m => m.Inbound||m.Outbound)

      const catData = [
        { name: 'Refrigerator',    value: outRows.reduce((a,r) => a+(r.refrigerator_qty||0),0) },
        { name: 'Washing Machine', value: outRows.reduce((a,r) => a+(r.washing_machine_qty||0),0) },
        { name: 'Microwave Oven',  value: outRows.reduce((a,r) => a+(r.microwave_oven_qty||0),0) },
      ].filter(d => d.value>0)

      const custMap: Record<string,number> = {}
      for (const r of outRows) custMap[r.party_name] = (custMap[r.party_name]||0)+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)
      const topCustomers = Object.entries(custMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,qty]) => ({ name, qty }))

      const vendorMap: Record<string,number> = {}
      for (const r of [...inRows,...outRows]) if (r.transport_vendor) vendorMap[r.transport_vendor] = (vendorMap[r.transport_vendor]||0)+(r.transport_cost||0)
      const topVendors = Object.entries(vendorMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,cost]) => ({ name, cost }))

      return {
        monthly, catData, topCustomers, topVendors,
        totalInboundQty:  inRows.reduce((a,r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0),0),
        totalOutboundQty: outRows.reduce((a,r) => a+(r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0),0),
        totalInboundCost:  inRows.reduce((a,r) => a+(r.transport_cost||0),0),
        totalOutboundCost: outRows.reduce((a,r) => a+(r.transport_cost||0),0),
      }
    },
  })
}

export default function ReportsPage() {
  const { data, isLoading } = useData()
  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  const sectionLabel = (t: string) => (
    <div style={{ fontSize:11, fontWeight:600, color:'rgba(55,53,47,0.45)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>{t}</div>
  )

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="All-time summary · Madanpur Warehouse" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:32 }} className="lg:grid-cols-4">
        <StatCard label="Total Inbound"  value={data.totalInboundQty.toLocaleString()}  accent="#0F7B6C" />
        <StatCard label="Total Outbound" value={data.totalOutboundQty.toLocaleString()} accent="#E03E3E" />
        <StatCard label="Inbound Cost"   value={`৳${Math.round(data.totalInboundCost/1000)}K`}  accent="#2383E2" />
        <StatCard label="Outbound Cost"  value={`৳${Math.round(data.totalOutboundCost/1000)}K`} accent="#DFAB01" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24, marginBottom:24 }}>
        <div>
          {sectionLabel('Monthly Inbound vs Outbound')}
          <div className="card" style={{ padding:16 }}>
            {!data.monthly.length ? <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(55,53,47,0.3)', fontSize:13 }}>No data yet</div> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthly} barSize={14} barGap={3}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(55,53,47,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:'rgba(55,53,47,0.5)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'rgba(55,53,47,0.5)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(55,53,47,0.03)' }} />
                  <Bar dataKey="Inbound"  fill="#0F7B6C" radius={[2,2,0,0]} />
                  <Bar dataKey="Outbound" fill="#E03E3E" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
        <div>
          {sectionLabel('Outbound by Category')}
          <div className="card" style={{ padding:16 }}>
            {!data.catData.length ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(55,53,47,0.3)', fontSize:13 }}>No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.catData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={2}>
                    {data.catData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:6, border:'1px solid rgba(55,53,47,0.12)', fontSize:12 }} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          {sectionLabel('Monthly Transport Cost')}
          <div className="card" style={{ padding:16 }}>
            {!data.monthly.length ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(55,53,47,0.3)', fontSize:13 }}>No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthly} barSize={16}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(55,53,47,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:'rgba(55,53,47,0.5)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'rgba(55,53,47,0.5)' }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}K`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(55,53,47,0.03)' }} />
                  <Bar dataKey="Cost" fill="#DFAB01" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          {sectionLabel('Top Customers by Outbound')}
          <div className="card" style={{ padding:16 }}>
            {!data.topCustomers.length ? <div style={{ color:'rgba(55,53,47,0.3)', fontSize:13, textAlign:'center', padding:24 }}>No data</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {data.topCustomers.map((c,i) => (
                  <div key={c.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:'rgba(55,53,47,0.35)', fontFamily:'monospace', width:16, textAlign:'right' }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                      <div style={{ height:3, background:'rgba(55,53,47,0.08)', borderRadius:2, marginTop:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'#2383E2', borderRadius:2, width:`${(c.qty/data.topCustomers[0].qty)*100}%`, transition:'width 0.5s ease' }} />
                      </div>
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>{c.qty.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {sectionLabel('Top Transport Vendors')}
          <div className="card" style={{ padding:16 }}>
            {!data.topVendors.length ? <div style={{ color:'rgba(55,53,47,0.3)', fontSize:13, textAlign:'center', padding:24 }}>No data</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {data.topVendors.map((v,i) => (
                  <div key={v.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:'rgba(55,53,47,0.35)', fontFamily:'monospace', width:16, textAlign:'right' }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name}</div>
                      <div style={{ height:3, background:'rgba(55,53,47,0.08)', borderRadius:2, marginTop:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'#DFAB01', borderRadius:2, width:`${(v.cost/data.topVendors[0].cost)*100}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>৳{Math.round(v.cost/1000)}K</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

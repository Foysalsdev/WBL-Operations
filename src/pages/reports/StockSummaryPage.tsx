import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, EmptyState, PageHeader, RowActions } from '../../components/ui'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { MONTHS } from '../../types/database'

interface StockForm { period: string; sku_code: number; sku_description: string; opening_inventory: number; total_inbound: number; total_outbound: number; saleable_qty: number; replacement_qty: number }
interface SKUOption { model_code: number; description: string; category: string }

const emptyForm = (): StockForm => ({ period: new Date().toLocaleString('default',{month:'long'}), sku_code: 0, sku_description: '', opening_inventory: 0, total_inbound: 0, total_outbound: 0, saleable_qty: 0, replacement_qty: 0 })

export default function StockSummaryPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [period, setPeriod] = useState(new Date().toLocaleString('default',{month:'long'}))
  const [form, setForm] = useState<StockForm>(emptyForm())

  const { data: skus } = useQuery({ queryKey: ['skus-for-stock'], queryFn: async () => { const { data } = await supabase.from('skus').select('model_code,description,category').order('sl'); return (data||[]) as SKUOption[] } })
  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock-summary', period],
    queryFn: async () => { let q = supabase.from('stock_summary').select('*').order('sku_code'); if (period) q = q.eq('period', period); const { data } = await q; return (data||[]) as any[] },
  })

  const openNew = () => { setEditing(null); setForm({ ...emptyForm(), period }); setOpen(true) }
  const openEdit = (r: any) => { setEditing(r); setForm({ ...r }); setOpen(true) }

  const handleSkuChange = (code: string) => {
    const n = Number(code); const found = skus?.find(s => s.model_code===n)
    setForm(p => ({ ...p, sku_code: n, sku_description: found ? found.description : p.sku_description }))
  }

  const f = (k: keyof StockForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: ['opening_inventory','total_inbound','total_outbound','saleable_qty','replacement_qty'].includes(k) ? Number(e.target.value) : e.target.value }))

  const save = useMutation({
    mutationFn: async () => {
      if (editing) { const { error } = await supabase.from('stock_summary').update(form).eq('id', editing.id); if (error) throw error }
      else { const { error } = await supabase.from('stock_summary').insert(form as any); if (error) throw error }
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Saved'); qc.invalidateQueries({ queryKey: ['stock-summary'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('stock_summary').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['stock-summary'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const totals = (stock||[]).reduce((acc, s) => ({ opening: acc.opening+s.opening_inventory, inbound: acc.inbound+s.total_inbound, outbound: acc.outbound+s.total_outbound, closing: acc.closing+s.closing_inventory, saleable: acc.saleable+s.saleable_qty }), { opening:0, inbound:0, outbound:0, closing:0, saleable:0 })

  const exportCSV = () => {
    if (!stock?.length) return
    const h = ['SKU Code','Description','Opening','Inbound','Outbound','Closing','Saleable','Replacement','Period']
    const rows = stock.map(s => [s.sku_code, s.sku_description, s.opening_inventory, s.total_inbound, s.total_outbound, s.closing_inventory, s.saleable_qty, s.replacement_qty, s.period])
    const csv = [h,...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = `stock-${period}.csv`; a.click()
  }

  return (
    <div>
      <PageHeader icon="package_2" title="Stock Summary" subtitle={`${period} · ${stock?.length||0} SKUs`}
        actions={<><button onClick={exportCSV} className="btn-secondary"><Download size={13}/>Export</button><button onClick={openNew} className="btn-primary"><Plus size={13}/>Add Record</button></>}
      />

      {/* Period + totals bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 160 }}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {stock && stock.length > 0 && (
          <div style={{ display: 'flex', gap: 20, marginLeft: 8 }}>
            {[['Opening', totals.opening, 'rgba(55,53,47,0.7)'], ['Inbound', totals.inbound, '#0F7B6C'], ['Outbound', totals.outbound, '#E03E3E'], ['Closing', totals.closing, '#37352F']].map(([l,v,c]) => (
              <div key={l as string} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(55,53,47,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c as string }}>{(v as number).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !stock?.length ? (
          <EmptyState message={`No stock data for ${period}.`} cta={<button onClick={openNew} className="btn-primary mt-2"><Plus size={13}/>Add Record</button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="notion-table">
              <thead>
                <tr>
                  <th>Code</th><th>Description</th>
                  <th style={{ textAlign: 'right' }}>Opening</th>
                  <th style={{ textAlign: 'right', color: '#0F7B6C' }}>Inbound</th>
                  <th style={{ textAlign: 'right', color: '#E03E3E' }}>Outbound</th>
                  <th style={{ textAlign: 'right' }}>Closing</th>
                  <th style={{ textAlign: 'right' }}>Saleable</th>
                  <th style={{ textAlign: 'right' }}>Replacement</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {stock?.map(row => (
                  <tr key={row.id} className="group">
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{row.sku_code}</td>
                    <td style={{ fontSize: 13, maxWidth: 260 }} className="truncate">{row.sku_description}</td>
                    <td style={{ textAlign: 'right', color: 'rgba(55,53,47,0.65)' }}>{row.opening_inventory}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F7B6C' }}>{row.total_inbound}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#E03E3E' }}>{row.total_outbound}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.closing_inventory}</td>
                    <td style={{ textAlign: 'right', color: 'rgba(55,53,47,0.65)' }}>{row.saleable_qty}</td>
                    <td style={{ textAlign: 'right', color: '#DFAB01' }}>{row.replacement_qty}</td>
                    <td>
                      <RowActions>
                        <button onClick={() => openEdit(row)} className="btn-ghost"><Pencil size={12}/></button>
                        <button onClick={() => { if(confirm('Delete?')) del.mutate(row.id) }} className="btn-ghost" style={{ color: '#E03E3E' }}><Trash2 size={12}/></button>
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(55,53,47,0.12)' }}>
                  <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'rgba(55,53,47,0.55)' }}>Total</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>{totals.opening.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, color: '#0F7B6C' }}>{totals.inbound.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, color: '#E03E3E' }}>{totals.outbound.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>{totals.closing.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>{totals.saleable.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Stock Record' : 'Add Stock Record'} size="lg">
        <form onSubmit={e => { e.preventDefault(); save.mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Period" required><select value={form.period} onChange={f('period')}>{MONTHS.map(m=><option key={m} value={m}>{m}</option>)}</select></FormField>
            <FormField label="SKU Code" required><select value={form.sku_code||''} onChange={e => handleSkuChange(e.target.value)}><option value="">Select SKU</option>{skus?.map(s=><option key={s.model_code} value={s.model_code}>{s.model_code} – {s.description.slice(0,35)}</option>)}</select></FormField>
          </div>
          <FormField label="SKU Description" required><input value={form.sku_description} onChange={f('sku_description')} /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <FormField label="Opening Inventory"><input type="number" min={0} value={form.opening_inventory} onChange={f('opening_inventory')} /></FormField>
            <FormField label="Total Inbound"><input type="number" min={0} value={form.total_inbound} onChange={f('total_inbound')} /></FormField>
            <FormField label="Total Outbound"><input type="number" min={0} value={form.total_outbound} onChange={f('total_outbound')} /></FormField>
            <FormField label="Closing (Auto)" hint="Opening + Inbound − Outbound">
              <input readOnly value={form.opening_inventory + form.total_inbound - form.total_outbound} style={{ background: '#FAFAF9', color: 'rgba(55,53,47,0.55)' }} />
            </FormField>
            <FormField label="Saleable Qty"><input type="number" min={0} value={form.saleable_qty} onChange={f('saleable_qty')} /></FormField>
            <FormField label="Replacement Qty"><input type="number" min={0} value={form.replacement_qty} onChange={f('replacement_qty')} /></FormField>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Record'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, EmptyState, CategoryBadge } from '../../components/ui'
import { Boxes, Plus, Pencil, Trash2, Download, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { MONTHS } from '../../types/database'

interface StockForm {
  period: string
  sku_code: number
  sku_description: string
  opening_inventory: number
  total_inbound: number
  total_outbound: number
  saleable_qty: number
  replacement_qty: number
}

interface SKUOption { model_code: number; description: string; category: string }

function useSKUs() {
  return useQuery({
    queryKey: ['skus-for-stock'],
    queryFn: async () => {
      const { data } = await supabase.from('skus').select('model_code,description,category').order('sl')
      return (data || []) as SKUOption[]
    },
  })
}

function useStock(period: string) {
  return useQuery({
    queryKey: ['stock-summary', period],
    queryFn: async () => {
      let q = supabase.from('stock_summary').select('*').order('sku_code')
      if (period) q = q.eq('period', period)
      const { data } = await q
      return (data || []) as Array<StockForm & { id: string; closing_inventory: number }>
    },
  })
}

const emptyForm = (): StockForm => ({
  period: new Date().toLocaleString('default', { month: 'long' }),
  sku_code: 0,
  sku_description: '',
  opening_inventory: 0,
  total_inbound: 0,
  total_outbound: 0,
  saleable_qty: 0,
  replacement_qty: 0,
})

export default function StockSummaryPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const currentMonth = new Date().toLocaleString('default', { month: 'long' })
  const [period, setPeriod] = useState(currentMonth)
  const [form, setForm] = useState<StockForm>(emptyForm())
  const skus = useSKUs()
  const { data: stock, isLoading } = useStock(period)

  const openNew = () => { setEditing(null); setForm({ ...emptyForm(), period }); setModalOpen(true) }
  const openEdit = (row: any) => { setEditing(row); setForm({ ...row }); setModalOpen(true) }

  const handleSkuChange = (code: string) => {
    const n = Number(code)
    setForm(f => ({ ...f, sku_code: n }))
    const found = skus.data?.find(s => s.model_code === n)
    if (found) setForm(f => ({ ...f, sku_code: n, sku_description: found.description }))
  }

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from('stock_summary').update(form).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('stock_summary').insert(form)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Record updated' : 'Record saved')
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
      setModalOpen(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stock_summary').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['stock-summary'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const exportCSV = () => {
    if (!stock?.length) return
    const headers = ['SKU Code','Description','Opening','Inbound','Outbound','Closing','Saleable','Replacement','Period']
    const rows = stock.map(s => [s.sku_code, s.sku_description, s.opening_inventory, s.total_inbound, s.total_outbound, s.closing_inventory, s.saleable_qty, s.replacement_qty, s.period])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = `stock-${period}.csv`; a.click()
  }

  const totals = (stock||[]).reduce((acc, s) => ({
    opening: acc.opening + s.opening_inventory,
    inbound: acc.inbound + s.total_inbound,
    outbound: acc.outbound + s.total_outbound,
    closing: acc.closing + s.closing_inventory,
    saleable: acc.saleable + s.saleable_qty,
  }), { opening: 0, inbound: 0, outbound: 0, closing: 0, saleable: 0 })

  const f = (k: keyof StockForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: ['opening_inventory','total_inbound','total_outbound','saleable_qty','replacement_qty'].includes(k) ? Number(e.target.value) : e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes size={20} className="text-amber-500" /> Stock Summary
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Inbound & Outbound Report — {period}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary"><Download size={15}/>Export</button>
          <button onClick={openNew} className="btn-primary"><Plus size={15}/>Add Record</button>
        </div>
      </div>

      {/* Period selector + totals */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Period:</label>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={period} onChange={e => setPeriod(e.target.value)}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {stock && stock.length > 0 && (
          <div className="ml-auto flex gap-6 text-sm">
            <div className="text-center"><p className="text-xs text-slate-500">Opening</p><p className="font-bold text-slate-800">{totals.opening.toLocaleString()}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-emerald-500"/>Inbound</p><p className="font-bold text-emerald-600">{totals.inbound.toLocaleString()}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500 flex items-center gap-1"><TrendingDown size={10} className="text-red-400"/>Outbound</p><p className="font-bold text-red-500">{totals.outbound.toLocaleString()}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500">Closing</p><p className="font-bold text-slate-800">{totals.closing.toLocaleString()}</p></div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? <LoadingSpinner /> : !stock?.length ? (
            <EmptyState message={`No stock data for ${period}. Add records or change period.`} icon={<Boxes size={40}/>}/>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Opening</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Inbound</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Outbound</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wide">Closing</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Saleable</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Replacement</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {stock?.map(row => {
                  const sku = skus.data?.find(s => s.model_code === row.sku_code)
                  return (
                    <tr key={row.id} className="table-row">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{row.sku_code}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700 max-w-[200px] truncate">{row.sku_description}</p>
                        {sku && <CategoryBadge category={sku.category}/>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.opening_inventory}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{row.total_inbound}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">{row.total_outbound}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{row.closing_inventory}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.saleable_qty}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{row.replacement_qty}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded"><Pencil size={13}/></button>
                          <button onClick={() => { if(confirm('Delete?')) del.mutate(row.id) }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-slate-700 text-sm">Total</td>
                  <td className="px-4 py-3 text-right text-slate-700">{totals.opening.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{totals.inbound.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-500">{totals.outbound.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-900">{totals.closing.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{totals.saleable.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Stock Record' : 'Add Stock Record'} size="lg">
        <form onSubmit={e => { e.preventDefault(); save.mutate() }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Period (Month)" required>
              <select value={form.period} onChange={f('period')} className="w-full">
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="SKU Code" required>
              <select value={form.sku_code || ''} onChange={e => handleSkuChange(e.target.value)} className="w-full">
                <option value="">Select SKU</option>
                {skus.data?.map(s => <option key={s.model_code} value={s.model_code}>{s.model_code} – {s.description.slice(0,40)}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="SKU Description" required>
            <input value={form.sku_description} onChange={f('sku_description')} className="w-full" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Opening Inventory">
              <input type="number" min={0} value={form.opening_inventory} onChange={f('opening_inventory')} className="w-full"/>
            </FormField>
            <FormField label="Total Inbound">
              <input type="number" min={0} value={form.total_inbound} onChange={f('total_inbound')} className="w-full"/>
            </FormField>
            <FormField label="Total Outbound">
              <input type="number" min={0} value={form.total_outbound} onChange={f('total_outbound')} className="w-full"/>
            </FormField>
            <FormField label="Saleable Qty">
              <input type="number" min={0} value={form.saleable_qty} onChange={f('saleable_qty')} className="w-full"/>
            </FormField>
            <FormField label="Replacement Qty">
              <input type="number" min={0} value={form.replacement_qty} onChange={f('replacement_qty')} className="w-full"/>
            </FormField>
            <FormField label="Closing (Auto)">
              <input readOnly value={form.opening_inventory + form.total_inbound - form.total_outbound} className="w-full bg-slate-50 text-slate-500 cursor-not-allowed"/>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

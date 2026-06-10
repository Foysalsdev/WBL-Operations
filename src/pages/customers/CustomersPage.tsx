import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, SearchInput, EmptyState } from '../../components/ui'
import { Users, Plus, Pencil, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface CustForm { code: number; customer_name: string; is_active: boolean }

const emptyForm = (): CustForm => ({ code: 0, customer_name: '', is_active: true })

export default function CustomersPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<CustForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string,string>>({})

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      let q = supabase.from('customers').select('*').order('code')
      if (search) q = q.ilike('customer_name', `%${search}%`)
      const { data } = await q
      return (data||[]) as any[]
    },
  })

  const openNew = () => { setEditing(null); setForm(emptyForm()); setErrors({}); setModalOpen(true) }
  const openEdit = (row: any) => { setEditing(row); setForm({ code: row.code, customer_name: row.customer_name, is_active: row.is_active }); setErrors({}); setModalOpen(true) }

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.code || form.code < 1) e.code = 'Required'
    if (!form.customer_name.trim()) e.customer_name = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: async () => {
      if (editing) { const { error } = await supabase.from('customers').update(form).eq('id', editing.id); if (error) throw error }
      else { const { error } = await supabase.from('customers').insert(form as any); if (error) throw error }
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Added'); qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['customers-list'] }); setModalOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('customers').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['customers'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const exportCSV = () => {
    if (!customers?.length) return
    const csv = ['Code,Customer Name,Active', ...customers.map((c:any)=>`${c.code},${c.customer_name},${c.is_active?'Yes':'No'}`)].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'customers.csv'; a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div><h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Users size={20} className="text-brand-500"/> Customers List</h1><p className="text-sm text-slate-500 mt-0.5">{customers?.length||0} customers</p></div>
        <div className="flex gap-2"><button onClick={exportCSV} className="btn-secondary"><Download size={15}/>Export</button><button onClick={openNew} className="btn-primary"><Plus size={15}/>Add Customer</button></div>
      </div>
      <div className="card p-3"><SearchInput value={search} onChange={setSearch} placeholder="Search customer name…"/></div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? <LoadingSpinner/> : !customers?.length ? <EmptyState message="No customers found." icon={<Users size={40}/>}/> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100">{['Code','Customer Name','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {customers?.map((row:any) => (
                  <tr key={row.id} className="table-row">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{row.code}</td>
                    <td className="px-4 py-3 text-slate-700">{row.customer_name}</td>
                    <td className="px-4 py-3"><span className={`badge ${row.is_active?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{row.is_active?'Active':'Inactive'}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button onClick={()=>openEdit(row)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded"><Pencil size={13}/></button><button onClick={()=>{if(confirm('Delete?'))del.mutate(row.id)}} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={13}/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Customer':'Add Customer'}>
        <form onSubmit={e=>{e.preventDefault();if(validate())save.mutate()}} className="space-y-4">
          <FormField label="Customer Code" required error={errors.code}>
            <input type="number" value={form.code||''} onChange={e=>setForm(p=>({...p,code:Number(e.target.value)}))} className="w-full" placeholder="e.g. 88000015"/>
          </FormField>
          <FormField label="Customer Name" required error={errors.customer_name}>
            <input value={form.customer_name} onChange={e=>setForm(p=>({...p,customer_name:e.target.value}))} className="w-full" placeholder="Full company/person name"/>
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} className="rounded"/>
            Active customer
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">{save.isPending?'Saving…':editing?'Update':'Add Customer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

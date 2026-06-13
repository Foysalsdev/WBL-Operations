import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, EmptyState, Tag, PageHeader, RowActions } from '../../components/ui'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface CustForm { code: number; customer_name: string; is_active: boolean }
const emptyForm = (): CustForm => ({ code: 0, customer_name: '', is_active: true })

export default function CustomersPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<CustForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string,string>>({})

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      let q = supabase.from('customers').select('*').order('code')
      if (search) q = q.ilike('customer_name', `%${search}%`)
      const { data } = await q; return (data||[]) as any[]
    },
  })

  const openNew = () => { setEditing(null); setForm(emptyForm()); setErrors({}); setOpen(true) }
  const openEdit = (r: any) => { setEditing(r); setForm({ code: r.code, customer_name: r.customer_name, is_active: r.is_active }); setErrors({}); setOpen(true) }

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.code||form.code<1) e.code='Required'
    if (!form.customer_name.trim()) e.customer_name='Required'
    setErrors(e); return Object.keys(e).length===0
  }

  const save = useMutation({
    mutationFn: async () => {
      if (editing) { const { error } = await supabase.from('customers').update(form).eq('id', editing.id); if (error) throw error }
      else { const { error } = await supabase.from('customers').insert(form as any); if (error) throw error }
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Customer added'); qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['customers-list'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('customers').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['customers'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const exportCSV = () => {
    if (!customers?.length) return
    const csv = ['Code,Name,Active', ...customers.map((c:any) => `${c.code},${c.customer_name},${c.is_active?'Yes':'No'}`)].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'customers.csv'; a.click()
  }

  return (
    <div>
      <PageHeader icon="👥" title="Customers" subtitle={`${customers?.length||0} parties`}
        actions={<><button onClick={exportCSV} className="btn-secondary"><Download size={13}/>Export</button><button onClick={openNew} className="btn-primary"><Plus size={13}/>Add Customer</button></>}
      />
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer name…" style={{ width: 260 }} />
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !customers?.length ? <EmptyState message="No customers found." cta={<button onClick={openNew} className="btn-primary mt-2"><Plus size={13}/>Add Customer</button>} /> : (
          <table className="notion-table">
            <thead><tr><th>Code</th><th>Customer Name</th><th>Status</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {customers?.map((r:any) => (
                <tr key={r.id} className="group">
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{r.code}</td>
                  <td style={{ fontSize: 13 }}>{r.customer_name}</td>
                  <td><Tag label={r.is_active ? 'Active' : 'Inactive'} variant={r.is_active ? 'green' : 'gray'} dot /></td>
                  <td>
                    <RowActions>
                      <button onClick={() => openEdit(r)} className="btn-ghost"><Pencil size={12}/></button>
                      <button onClick={() => { if(confirm('Delete?')) del.mutate(r.id) }} className="btn-ghost" style={{ color: '#E03E3E' }}><Trash2 size={12}/></button>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={e => { e.preventDefault(); if(validate()) save.mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Customer Code" required error={errors.code}>
            <input type="number" value={form.code||''} onChange={e => setForm(p => ({...p, code: Number(e.target.value)}))} placeholder="e.g. 88000015" />
          </FormField>
          <FormField label="Customer Name" required error={errors.customer_name}>
            <input value={form.customer_name} onChange={e => setForm(p => ({...p, customer_name: e.target.value}))} />
          </FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))} />
            Active customer
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Customer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

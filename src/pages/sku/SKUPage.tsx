import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, EmptyState, CategoryTag, PageHeader, RowActions } from '../../components/ui'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface SKURow { id: string; sl: number; china_code?: string; model_code: number; description: string; category: string }
const CATEGORIES = [
  { value: 'refrigerator',    label: 'Refrigerator'    },
  { value: 'washing_machine', label: 'Washing Machine' },
  { value: 'microwave_oven',  label: 'Microwave Oven'  },
  { value: 'air_conditioner', label: 'Air Conditioner' },
]
const emptyForm = () => ({ sl: 1, china_code: '', model_code: 0, description: '', category: 'refrigerator' })

export default function SKUPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState(emptyForm())

  const { data: skus, isLoading } = useQuery({
    queryKey: ['skus', search, catFilter],
    queryFn: async () => {
      let q = supabase.from('skus').select('*').order('sl')
      if (search) q = q.ilike('description', `%${search}%`)
      if (catFilter) q = q.eq('category', catFilter)
      const { data } = await q; return (data||[]) as SKURow[]
    },
  })

  const counts: Record<string,number> = {}
  for (const s of skus||[]) counts[s.category] = (counts[s.category]||0)+1

  const openNew = () => { setEditing(null); setForm({ ...emptyForm(), sl: (skus?.length||0)+1 }); setOpen(true) }
  const openEdit = (r: SKURow) => { setEditing(r); setForm({ sl: r.sl, china_code: r.china_code||'', model_code: r.model_code, description: r.description, category: r.category }); setOpen(true) }

  const save = useMutation({
    mutationFn: async () => {
      const p = { sl: form.sl, china_code: form.china_code||null, model_code: form.model_code, description: form.description, category: form.category }
      if (editing) { const { error } = await supabase.from('skus').update(p).eq('id', editing.id); if (error) throw error }
      else { const { error } = await supabase.from('skus').insert(p as any); if (error) throw error }
    },
    onSuccess: () => { toast.success(editing ? 'SKU updated' : 'SKU added'); qc.invalidateQueries({ queryKey: ['skus'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('skus').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('SKU deleted'); qc.invalidateQueries({ queryKey: ['skus'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader icon="database" title="SKU List" subtitle={`${skus?.length||0} products`} actions={<button onClick={openNew} className="btn-primary"><Plus size={13}/>Add SKU</button>} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description…" style={{ width: 220 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ value: '', label: 'All' }, ...CATEGORIES].map(c => (
            <button key={c.value} onClick={() => setCatFilter(c.value)}
              style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: catFilter===c.value ? '#37352F' : 'rgba(55,53,47,0.06)',
                color: catFilter===c.value ? '#fff' : 'rgba(55,53,47,0.65)',
              }}>
              {c.label}
              {c.value && <span style={{ marginLeft: 4, opacity: 0.6 }}>{counts[c.value]||0}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !skus?.length ? <EmptyState message="No SKUs found." /> : (
          <table className="notion-table">
            <thead>
              <tr>
                <th>#</th><th>Model Code</th><th>China Code</th><th>Description</th><th>Category</th><th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {skus.map(row => (
                <tr key={row.id} className="group">
                  <td style={{ fontSize: 11, color: 'rgba(55,53,47,0.35)', fontFamily: 'monospace' }}>{row.sl}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{row.model_code}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(55,53,47,0.5)' }}>{row.china_code||'—'}</td>
                  <td style={{ fontSize: 13, maxWidth: 300 }}>{row.description}</td>
                  <td><CategoryTag category={row.category} /></td>
                  <td>
                    <RowActions>
                      <button onClick={() => openEdit(row)} className="btn-ghost"><Pencil size={12}/></button>
                      <button onClick={() => { if(confirm('Delete?')) del.mutate(row.id) }} className="btn-ghost" style={{ color: '#E03E3E' }}><Trash2 size={12}/></button>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit SKU' : 'Add SKU'}>
        <form onSubmit={e => { e.preventDefault(); save.mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="SL No." required><input type="number" value={form.sl} onChange={e => setForm(p => ({...p, sl: Number(e.target.value)}))} /></FormField>
            <FormField label="Model Code" required><input type="number" value={form.model_code||''} onChange={e => setForm(p => ({...p, model_code: Number(e.target.value)}))} placeholder="e.g. 25001" /></FormField>
          </div>
          <FormField label="China Code"><input value={form.china_code} onChange={e => setForm(p => ({...p, china_code: e.target.value}))} placeholder="Optional" /></FormField>
          <FormField label="Description" required><input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></FormField>
          <FormField label="Category" required>
            <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add SKU'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

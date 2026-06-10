import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, SearchInput, EmptyState, CategoryBadge } from '../../components/ui'
import { Database, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface SKUFormData {
  sl: number
  china_code?: string
  model_code: number
  description: string
  category: 'refrigerator' | 'washing_machine' | 'microwave_oven' | 'air_conditioner'
}

const CATEGORIES = [
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'washing_machine', label: 'Washing Machine' },
  { value: 'microwave_oven', label: 'Microwave Oven' },
  { value: 'air_conditioner', label: 'Air Conditioner' },
]

function useSKUs(search: string, category: string) {
  return useQuery({
    queryKey: ['skus', search, category],
    queryFn: async () => {
      let q = supabase.from('skus').select('*').order('sl')
      if (search) q = q.ilike('description', `%${search}%`)
      if (category) q = q.eq('category', category)
      const { data } = await q
      return (data || []) as Array<SKUFormData & { id: string; created_at: string }>
    },
  })
}

const emptyForm: SKUFormData = { sl: 1, china_code: '', model_code: 0, description: '', category: 'refrigerator' }

export default function SKUPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState<SKUFormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { data: skus, isLoading } = useSKUs(search, catFilter)

  const openNew = () => {
    setEditing(null)
    setForm({ ...emptyForm, sl: (skus?.length || 0) + 1 })
    setErrors({})
    setModalOpen(true)
  }
  const openEdit = (row: any) => {
    setEditing(row)
    setForm({ sl: row.sl, china_code: row.china_code || '', model_code: row.model_code, description: row.description, category: row.category })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.sl || form.sl < 1) e.sl = 'Required'
    if (!form.model_code || form.model_code < 1) e.model_code = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { sl: form.sl, china_code: form.china_code || null, model_code: form.model_code, description: form.description, category: form.category }
      if (editing) {
        const { error } = await supabase.from('skus').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('skus').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'SKU updated' : 'SKU added')
      qc.invalidateQueries({ queryKey: ['skus'] })
      setModalOpen(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skus').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('SKU deleted'); qc.invalidateQueries({ queryKey: ['skus'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) save.mutate()
  }

  const counts: Record<string, number> = {}
  for (const s of skus || []) counts[s.category] = (counts[s.category] || 0) + 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database size={20} className="text-brand-500" /> SKU List
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{skus?.length || 0} products</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={15}/>Add SKU</button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {[{ value: '', label: 'All', count: skus?.length || 0 }, ...CATEGORIES.map(c => ({ ...c, count: counts[c.value] || 0 }))].map(c => (
          <button
            key={c.value}
            onClick={() => setCatFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              catFilter === c.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
            }`}
          >
            {c.label} <span className="ml-1 opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="card p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search description or code…" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? <LoadingSpinner /> : !skus?.length ? (
            <EmptyState message="No SKUs found." icon={<Database size={40}/>}/>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['SL','Model Code','China Code','Description','Category',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skus?.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.sl}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{row.model_code}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.china_code || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{row.description}</td>
                    <td className="px-4 py-3"><CategoryBadge category={row.category}/></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded"><Pencil size={13}/></button>
                        <button onClick={() => { if(confirm('Delete SKU?')) del.mutate(row.id) }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit SKU' : 'Add SKU'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="SL No." required error={errors.sl}>
              <input type="number" value={form.sl} onChange={e => setForm(f => ({...f, sl: Number(e.target.value)}))} className="w-full" />
            </FormField>
            <FormField label="Model Code" required error={errors.model_code}>
              <input type="number" value={form.model_code || ''} onChange={e => setForm(f => ({...f, model_code: Number(e.target.value)}))} className="w-full" placeholder="e.g. 25001" />
            </FormField>
          </div>
          <FormField label="China Code">
            <input value={form.china_code || ''} onChange={e => setForm(f => ({...f, china_code: e.target.value}))} className="w-full" placeholder="Optional" />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full" placeholder="Full product description" />
          </FormField>
          <FormField label="Category" required>
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as SKUFormData['category']}))} className="w-full">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Add SKU'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

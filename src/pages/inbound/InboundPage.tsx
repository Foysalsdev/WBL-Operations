import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Modal, LoadingSpinner, FormField, EmptyState, Tag, PageHeader, RowActions } from '../../components/ui'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { MONTHS, VEHICLE_SIZES, WAREHOUSES } from '../../types/database'

interface InForm {
  receiving_date: string; sap_invoice_no: string; party_code: string; party_name: string
  load_from: string; offload_to: string; vehicle_type: string; vehicle_size: string; courier: string
  refrigerator_qty: number; washing_machine_qty: number; microwave_oven_qty: number; air_conditioner_qty: number
  transport_cost: string; transport_vendor: string; vehicle_no: string; remarks: string; month: string
}
interface CustomerRow { code: number; customer_name: string }

const emptyForm = (): InForm => ({
  receiving_date: format(new Date(), 'yyyy-MM-dd'), sap_invoice_no: '', party_code: '', party_name: '',
  load_from: '', offload_to: '', vehicle_type: '', vehicle_size: '', courier: '',
  refrigerator_qty: 0, washing_machine_qty: 0, microwave_oven_qty: 0, air_conditioner_qty: 0,
  transport_cost: '', transport_vendor: '', vehicle_no: '', remarks: '', month: format(new Date(), 'MMMM'),
})

export default function InboundPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<InForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string,string>>({})

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => { const { data } = await supabase.from('customers').select('code,customer_name').eq('is_active', true).order('customer_name'); return (data||[]) as CustomerRow[] },
  })
  const { data: entries, isLoading } = useQuery({
    queryKey: ['inbound', search],
    queryFn: async () => {
      let q = supabase.from('inbound_entries').select('*').order('receiving_date', { ascending: false })
      if (search) q = q.ilike('party_name', `%${search}%`)
      const { data } = await q.limit(500)
      return (data||[]) as any[]
    },
  })

  const set = (k: keyof InForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: ['refrigerator_qty','washing_machine_qty','microwave_oven_qty','air_conditioner_qty'].includes(k) ? Number(e.target.value) : e.target.value }))

  const handlePartyCode = (code: string) => {
    const found = customers?.find(c => c.code.toString() === code)
    setForm(p => ({ ...p, party_code: code, party_name: found ? found.customer_name : p.party_name }))
  }

  const openNew  = () => { setEditing(null); setForm(emptyForm()); setErrors({}); setOpen(true) }
  const openEdit = (row: any) => {
    setEditing(row)
    setForm({ receiving_date: row.receiving_date||'', sap_invoice_no: row.sap_invoice_no||'', party_code: row.party_code?.toString()||'', party_name: row.party_name||'', load_from: row.load_from||'', offload_to: row.offload_to||'', vehicle_type: row.vehicle_type||'', vehicle_size: row.vehicle_size||'', courier: row.courier||'', refrigerator_qty: row.refrigerator_qty||0, washing_machine_qty: row.washing_machine_qty||0, microwave_oven_qty: row.microwave_oven_qty||0, air_conditioner_qty: row.air_conditioner_qty||0, transport_cost: row.transport_cost?.toString()||'', transport_vendor: row.transport_vendor||'', vehicle_no: row.vehicle_no||'', remarks: row.remarks||'', month: row.month||'' })
    setErrors({}); setOpen(true)
  }

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.receiving_date) e.receiving_date = 'Required'
    if (!form.party_name.trim()) e.party_name = 'Required'
    if (!form.load_from.trim()) e.load_from = 'Required'
    if (!form.offload_to.trim()) e.offload_to = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, party_code: form.party_code ? parseInt(form.party_code) : null, transport_cost: form.transport_cost ? parseFloat(form.transport_cost) : null }
      if (editing) { const { error } = await supabase.from('inbound_entries').update(payload).eq('id', editing.id); if (error) throw error }
      else { const { error } = await supabase.from('inbound_entries').insert(payload as any); if (error) throw error }
    },
    onSuccess: () => { toast.success(editing ? 'Entry updated' : 'Inbound entry saved'); qc.invalidateQueries({ queryKey: ['inbound'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('inbound_entries').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Entry deleted'); qc.invalidateQueries({ queryKey: ['inbound'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const exportCSV = () => {
    if (!entries?.length) return
    const h = ['SL','Date','SAP Invoice','Party Code','Party Name','Load From','Offload To','Vehicle Size','Courier','Fridge','WM','MWO','AC','Cost','Vendor','Vehicle No','Remarks','Month']
    const rows = entries.map((e,i) => [i+1, e.receiving_date, e.sap_invoice_no||'', e.party_code||'', e.party_name, e.load_from, e.offload_to, e.vehicle_size||'', e.courier||'', e.refrigerator_qty, e.washing_machine_qty, e.microwave_oven_qty, e.air_conditioner_qty, e.transport_cost||'', e.transport_vendor||'', e.vehicle_no||'', e.remarks||'', e.month||''])
    const csv = [h,...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'inbound.csv'; a.click()
  }

  const total = (r: any) => (r.refrigerator_qty||0)+(r.washing_machine_qty||0)+(r.microwave_oven_qty||0)+(r.air_conditioner_qty||0)

  return (
    <div>
      <PageHeader
        icon="call_received"
        title="Inbound"
        subtitle={`${entries?.length||0} receiving records`}
        actions={
          <>
            <button onClick={exportCSV} className="btn-secondary"><Download size={13}/>Export CSV</button>
            <button onClick={openNew} className="btn-primary"><Plus size={13}/>New Entry</button>
          </>
        }
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter by party name…"
          style={{ width: 260 }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !entries?.length ? (
          <EmptyState message="No inbound entries yet." cta={<button onClick={openNew} className="btn-primary mt-2"><Plus size={13}/>New Entry</button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="notion-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Date</th>
                  <th>SAP Invoice</th>
                  <th>Party</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Fridge</th>
                  <th style={{ textAlign: 'right' }}>WM</th>
                  <th style={{ textAlign: 'right' }}>MWO</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Vehicle</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th>Month</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {entries?.map((row,i) => (
                  <tr key={row.id} className="group">
                    <td style={{ color: 'rgba(55,53,47,0.35)', fontSize: 11, fontFamily: 'monospace' }}>{i+1}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'rgba(55,53,47,0.65)' }}>{row.receiving_date}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(55,53,47,0.65)' }}>{row.sap_invoice_no||'—'}</td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13, maxWidth: 160 }} className="truncate">{row.party_name}</div>
                      {row.party_code && <div style={{ fontSize: 11, color: 'rgba(55,53,47,0.4)' }}>{row.party_code}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.55)', whiteSpace: 'nowrap' }}>{row.load_from} → {row.offload_to}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#2383E2' }}>{row.refrigerator_qty||0}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#6940A5' }}>{row.washing_machine_qty||0}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#DFAB01' }}>{row.microwave_oven_qty||0}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{total(row)}</td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.55)' }}>{row.vehicle_no||'—'}</td>
                    <td style={{ textAlign: 'right', fontSize: 12, whiteSpace: 'nowrap' }}>{row.transport_cost ? `৳${Number(row.transport_cost).toLocaleString()}` : '—'}</td>
                    <td>{row.month && <Tag label={row.month.slice(0,3)} variant="blue" />}</td>
                    <td>
                      <RowActions>
                        <button onClick={() => openEdit(row)} className="btn-ghost" title="Edit"><Pencil size={12}/></button>
                        <button onClick={() => { if(confirm('Delete this entry?')) del.mutate(row.id) }} className="btn-ghost" title="Delete" style={{ color: '#E03E3E' }}><Trash2 size={12}/></button>
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Inbound Entry' : 'New Inbound Entry'} size="xl">
        <form onSubmit={e => { e.preventDefault(); if(validate()) save.mutate() }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Receiving Date" required error={errors.receiving_date}>
              <input type="date" value={form.receiving_date} onChange={set('receiving_date')} />
            </FormField>
            <FormField label="Month">
              <select value={form.month} onChange={set('month')}>
                <option value="">Select month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="SAP Invoice No.">
              <input value={form.sap_invoice_no} onChange={set('sap_invoice_no')} placeholder="e.g. 8815004173" />
            </FormField>
            <FormField label="Party Code">
              <select value={form.party_code} onChange={e => handlePartyCode(e.target.value)}>
                <option value="">Select customer</option>
                {customers?.map(c => <option key={c.code} value={c.code}>{c.code} – {c.customer_name}</option>)}
              </select>
            </FormField>
            <div style={{ gridColumn: '1/-1' }}>
              <FormField label="Party Name" required error={errors.party_name}>
                <input value={form.party_name} onChange={set('party_name')} placeholder="Party name" />
              </FormField>
            </div>
            <FormField label="Load From" required error={errors.load_from}>
              <input value={form.load_from} onChange={set('load_from')} list="wh-from-in" placeholder="e.g. Narshindi WH" />
              <datalist id="wh-from-in">{WAREHOUSES.map(w => <option key={w} value={w}/>)}</datalist>
            </FormField>
            <FormField label="Offload To" required error={errors.offload_to}>
              <input value={form.offload_to} onChange={set('offload_to')} list="wh-to-in" placeholder="e.g. Madanpur WH" />
              <datalist id="wh-to-in">{WAREHOUSES.map(w => <option key={w} value={w}/>)}</datalist>
            </FormField>
            <FormField label="Vehicle Size">
              <select value={form.vehicle_size} onChange={set('vehicle_size')}>
                <option value="">Select size</option>
                {VEHICLE_SIZES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FormField>
            <FormField label="Vehicle No.">
              <input value={form.vehicle_no} onChange={set('vehicle_no')} placeholder="e.g. DM TA-11-5329" />
            </FormField>
            <FormField label="Transport Vendor">
              <input value={form.transport_vendor} onChange={set('transport_vendor')} placeholder="e.g. Aroma" />
            </FormField>
            <FormField label="Transport Cost (৳)">
              <input type="number" value={form.transport_cost} onChange={set('transport_cost')} placeholder="0" />
            </FormField>
            <FormField label="Courier">
              <input value={form.courier} onChange={set('courier')} />
            </FormField>
            <FormField label="Remarks">
              <input value={form.remarks} onChange={set('remarks')} />
            </FormField>
          </div>

          {/* Quantities */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Quantities Received
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <FormField label="Refrigerator">
                <input type="number" min={0} value={form.refrigerator_qty} onChange={set('refrigerator_qty')} />
              </FormField>
              <FormField label="Washing Machine">
                <input type="number" min={0} value={form.washing_machine_qty} onChange={set('washing_machine_qty')} />
              </FormField>
              <FormField label="Microwave Oven">
                <input type="number" min={0} value={form.microwave_oven_qty} onChange={set('microwave_oven_qty')} />
              </FormField>
              <FormField label="Air Conditioner">
                <input type="number" min={0} value={form.air_conditioner_qty} onChange={set('air_conditioner_qty')} />
              </FormField>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

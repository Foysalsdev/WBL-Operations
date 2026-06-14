import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Modal, FormField, LoadingSpinner, EmptyState, Tag, RowActions } from '../../../components/ui'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const RETURN_REASONS = [
  'Damaged on arrival',
  'Wrong item received',
  'Excess quantity',
  'Quality rejected',
  'Expired / Near expiry',
  'Supplier request',
  'Other',
]

interface PRNItem {
  sku_code: number | ''
  sku_description: string
  received_qty: number
  return_qty: number
}

interface PRNForm {
  prn_sap_ref: string
  grn_id: string
  pr_id: string
  return_date: string
  return_reason: string
  supplier_name: string
  remarks: string
  items: PRNItem[]
  serials: string[]
}

function emptyItem(): PRNItem {
  return { sku_code: '', sku_description: '', received_qty: 0, return_qty: 0 }
}
function emptyForm(): PRNForm {
  return { prn_sap_ref: '', grn_id: '', pr_id: '', return_date: format(new Date(), 'yyyy-MM-dd'), return_reason: '', supplier_name: '', remarks: '', items: [emptyItem()], serials: [] }
}

export default function PRNTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<PRNForm>(emptyForm())
  const [serialInput, setSerialInput] = useState('')
  const [lastScan, setLastScan] = useState<{ val: string; ok: boolean } | null>(null)

  const { data: prns, isLoading } = useQuery({
    queryKey: ['prn-entries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prn_entries')
        .select('*, prn_items(*), prn_serials(*), grn_entries(grn_sap_ref), purchase_requisitions(pr_number)')
        .order('created_at', { ascending: false })
      return (data || []) as any[]
    },
  })

  const { data: grns } = useQuery({
    queryKey: ['grn-entries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('grn_entries')
        .select('id, grn_sap_ref, pr_id, supplier_name, grn_items(*), purchase_requisitions(pr_number)')
        .order('receive_date', { ascending: false })
      return (data || []) as any[]
    },
  })

  const setF = (k: keyof PRNForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleGRNSelect = (grnId: string) => {
    const grn = grns?.find((g: any) => g.id === grnId)
    if (!grn) { setForm(p => ({ ...p, grn_id: grnId, pr_id: '', supplier_name: '', items: [emptyItem()] })); return }
    const items: PRNItem[] = (grn.grn_items || []).map((i: any) => ({
      sku_code: i.sku_code,
      sku_description: i.sku_description,
      received_qty: i.received_qty,
      return_qty: 0,
    }))
    setForm(p => ({
      ...p,
      grn_id: grnId,
      pr_id: grn.pr_id || '',
      supplier_name: grn.supplier_name || '',
      items: items.length ? items : [emptyItem()],
    }))
  }

  const setItem = (i: number, k: keyof PRNItem, v: any) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items } })

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))

  const handleScan = (val: string) => {
    const s = val.trim()
    if (!s) return
    if (form.serials.includes(s)) { setLastScan({ val: s, ok: false }); toast.error('Duplicate serial'); return }
    setForm(p => ({ ...p, serials: [...p.serials, s] }))
    setLastScan({ val: s, ok: true })
    setSerialInput('')
  }

  const removeSerial = (s: string) => setForm(p => ({ ...p, serials: p.serials.filter(x => x !== s) }))

  const openNew = () => { setEditing(null); setForm(emptyForm()); setSerialInput(''); setLastScan(null); setOpen(true) }
  const openEdit = (row: any) => {
    setEditing(row)
    const items = (row.prn_items || []).map((i: any) => ({
      sku_code: i.sku_code, sku_description: i.sku_description,
      received_qty: i.received_qty, return_qty: i.return_qty,
    }))
    const serials = (row.prn_serials || []).map((s: any) => s.serial_no)
    setForm({ prn_sap_ref: row.prn_sap_ref || '', grn_id: row.grn_id || '', pr_id: row.pr_id || '', return_date: row.return_date, return_reason: row.return_reason || '', supplier_name: row.supplier_name || '', remarks: row.remarks || '', items: items.length ? items : [emptyItem()], serials })
    setSerialInput(''); setLastScan(null); setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.prn_sap_ref.trim()) throw new Error('PRN SAP Reference is required')
      if (!form.grn_id) throw new Error('Link to a GRN is required')
      const validItems = form.items.filter(i => i.sku_code !== '' && i.return_qty > 0)
      if (!validItems.length) throw new Error('Add at least one item with return quantity')

      const header = {
        prn_sap_ref: form.prn_sap_ref.trim(),
        grn_id: form.grn_id,
        pr_id: form.pr_id || null,
        return_date: form.return_date,
        return_reason: form.return_reason || null,
        supplier_name: form.supplier_name || null,
        remarks: form.remarks || null,
      }

      let prnId: string

      if (editing) {
        const { error } = await supabase.from('prn_entries').update(header).eq('id', editing.id)
        if (error) throw error
        prnId = editing.id
        await supabase.from('prn_items').delete().eq('prn_id', prnId)
        await supabase.from('prn_serials').delete().eq('prn_id', prnId)
      } else {
        const { data, error } = await supabase.from('prn_entries').insert(header as any).select().single()
        if (error) throw error
        prnId = data.id
      }

      await supabase.from('prn_items').insert(validItems.map(i => ({ prn_id: prnId, ...i })) as any)
      if (form.serials.length) {
        await supabase.from('prn_serials').insert(form.serials.map(s => ({ prn_id: prnId, serial_no: s })) as any)
      }
    },
    onSuccess: () => { toast.success(editing ? 'PRN updated' : 'PRN saved'); qc.invalidateQueries({ queryKey: ['prn-entries'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('prn_entries').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('PRN deleted'); qc.invalidateQueries({ queryKey: ['prn-entries'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const totalReturn = (row: any) => (row.prn_items || []).reduce((s: number, i: any) => s + (i.return_qty || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'rgba(55,53,47,0.55)' }}>{prns?.length || 0} return records</span>
        <button onClick={openNew} className="btn-primary"><Plus size={13} />New PRN</button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !prns?.length ? (
          <EmptyState message="No purchase return records yet." cta={<button onClick={openNew} className="btn-primary mt-2"><Plus size={13} />New PRN</button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="notion-table">
              <thead><tr>
                <th>PRN SAP Ref</th><th>GRN Ref</th><th>PR Number</th>
                <th>Return Date</th><th>Supplier</th>
                <th style={{ textAlign: 'right' }}>Return Qty</th>
                <th style={{ textAlign: 'right' }}>Serials</th>
                <th>Reason</th><th style={{ width: 60 }}></th>
              </tr></thead>
              <tbody>
                {prns?.map((row: any) => (
                  <tr key={row.id} className="group">
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.prn_sap_ref || '—'}</td>
                    <td>
                      {row.grn_entries?.grn_sap_ref
                        ? <Tag label={row.grn_entries.grn_sap_ref} variant="blue" />
                        : <span style={{ color: 'rgba(55,53,47,0.4)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      {row.purchase_requisitions?.pr_number
                        ? <Tag label={row.purchase_requisitions.pr_number} variant="gray" />
                        : <span style={{ color: 'rgba(55,53,47,0.4)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.65)', whiteSpace: 'nowrap' }}>{row.return_date}</td>
                    <td style={{ fontSize: 13 }}>{row.supplier_name || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#c0392b' }}>{totalReturn(row)}</td>
                    <td style={{ textAlign: 'right', fontSize: 12 }}>{row.prn_serials?.length || 0}</td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.65)', maxWidth: 140 }}>
                      <span className="truncate block">{row.return_reason || '—'}</span>
                    </td>
                    <td><RowActions>
                      <button onClick={() => openEdit(row)} className="btn-ghost"><Pencil size={12} /></button>
                      <button onClick={() => { if (confirm('Delete PRN?')) del.mutate(row.id) }} className="btn-ghost" style={{ color: '#c0392b' }}><Trash2 size={12} /></button>
                    </RowActions></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit PRN' : 'New Purchase Return Note'} size="xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="PRN SAP Reference" required hint="Number from SAP — not auto-generated">
              <input value={form.prn_sap_ref} onChange={setF('prn_sap_ref')} placeholder="e.g. 6000001234" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
            </FormField>
            <FormField label="Return Date" required>
              <input type="date" value={form.return_date} onChange={setF('return_date')} />
            </FormField>
            <FormField label="Link to GRN" required hint="Select GRN to auto-fill items">
              <select value={form.grn_id} onChange={e => handleGRNSelect(e.target.value)}>
                <option value="">Select GRN</option>
                {grns?.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.grn_sap_ref || 'No ref'} — {g.purchase_requisitions?.pr_number || 'No PR'} — {g.supplier_name || 'No supplier'}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Linked PR" hint="Auto-fill from GRN">
              <input
                value={grns?.find((g: any) => g.id === form.grn_id)?.purchase_requisitions?.pr_number || ''}
                readOnly
                style={{ background: '#FAFAF9', color: 'rgba(55,53,47,0.55)', fontFamily: 'monospace' }}
                placeholder="Auto-filled from GRN"
              />
            </FormField>
            <FormField label="Supplier Name">
              <input value={form.supplier_name} onChange={setF('supplier_name')} placeholder="Auto-fill from GRN" />
            </FormField>
            <FormField label="Return Reason">
              <select value={form.return_reason} onChange={setF('return_reason')}>
                <option value="">Select reason</option>
                {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <div style={{ gridColumn: '1/-1' }}>
              <FormField label="Remarks"><input value={form.remarks} onChange={setF('remarks')} /></FormField>
            </div>
          </div>

          {/* Items */}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Return Items
              </span>
              {!form.grn_id && (
                <button onClick={addItem} className="btn-secondary" style={{ fontSize: 12, padding: '3px 10px' }}><Plus size={12} />Add Item</button>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAFAF9', borderBottom: '1px solid rgba(55,53,47,0.09)' }}>
                  {['SKU Code', 'Description', 'Received Qty', 'Return Qty', ''].map(h => (
                    <th key={h} style={{ textAlign: ['Received Qty','Return Qty'].includes(h) ? 'right' : 'left', padding: '6px 8px', fontSize: 11, color: 'rgba(55,53,47,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(55,53,47,0.06)' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                      {item.sku_code || '—'}
                    </td>
                    <td style={{ padding: '6px 8px', fontSize: 13 }}>{item.sku_description || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'rgba(55,53,47,0.6)' }}>{item.received_qty}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="number" min={0} max={item.received_qty}
                        value={item.return_qty}
                        onChange={e => setItem(i, 'return_qty', Math.min(Number(e.target.value), item.received_qty))}
                        style={{ textAlign: 'right', width: 70, fontSize: 13, fontWeight: 600, borderColor: '#c0392b' }}
                      />
                    </td>
                    <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                      {!form.grn_id && form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="btn-ghost" style={{ padding: '2px 4px', color: '#c0392b' }}><Trash2 size={11} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {form.items.some(i => i.return_qty > 0) && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(55,53,47,0.12)' }}>
                    <td colSpan={3} style={{ padding: '8px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'rgba(55,53,47,0.6)' }}>Total Return</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#c0392b' }}>
                      {form.items.reduce((s, i) => s + i.return_qty, 0)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Serial Scanner */}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Return Serial Numbers ({form.serials.length})
            </div>
            <input
              type="text"
              value={serialInput}
              onChange={e => setSerialInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(serialInput) } }}
              placeholder="Scan serial of unit being returned — press Enter"
              autoComplete="off"
              style={{ width: '100%', fontSize: 15, fontFamily: 'monospace', borderWidth: 2, borderColor: '#c0392b', marginBottom: 8 }}
            />
            {lastScan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 4, marginBottom: 8, fontSize: 13, fontWeight: 500, background: lastScan.ok ? '#DDEDEA' : '#FDDEDE', color: lastScan.ok ? '#0a6b5c' : '#c0392b' }}>
                {lastScan.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {lastScan.ok ? 'Added: ' : 'Duplicate: '}
                <span style={{ fontFamily: 'monospace' }}>{lastScan.val}</span>
              </div>
            )}
            {form.serials.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {form.serials.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FDDEDE', color: '#c0392b', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace' }}>
                    {s}
                    <button onClick={() => removeSerial(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', padding: 0, display: 'flex', lineHeight: 1 }}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Save PRN'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

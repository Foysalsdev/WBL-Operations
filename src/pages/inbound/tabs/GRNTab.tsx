import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Modal, FormField, LoadingSpinner, EmptyState, Tag, RowActions } from '../../../components/ui'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface GRNItem {
  sku_code: number | ''
  sku_description: string
  ordered_qty: number
  received_qty: number
  damaged_qty: number
  shortage_qty: number
}

interface GRNForm {
  grn_sap_ref: string
  pr_id: string
  receive_date: string
  supplier_name: string
  remarks: string
  items: GRNItem[]
  serials: string[]
}

function emptyItem(): GRNItem {
  return { sku_code: '', sku_description: '', ordered_qty: 0, received_qty: 0, damaged_qty: 0, shortage_qty: 0 }
}
function emptyForm(): GRNForm {
  return { grn_sap_ref: '', pr_id: '', receive_date: format(new Date(), 'yyyy-MM-dd'), supplier_name: '', remarks: '', items: [emptyItem()], serials: [] }
}

export default function GRNTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<GRNForm>(emptyForm())
  const [serialInput, setSerialInput] = useState('')
  const [lastScan, setLastScan] = useState<{ val: string; ok: boolean } | null>(null)

  const { data: grns, isLoading } = useQuery({
    queryKey: ['grn-entries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('grn_entries')
        .select('*, grn_items(*), grn_serials(*), purchase_requisitions(pr_number)')
        .order('created_at', { ascending: false })
      return (data || []) as any[]
    },
  })

  const { data: prs } = useQuery({
    queryKey: ['purchase-requisitions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_requisitions')
        .select('id, pr_number, supplier_name, supplier_code, purchase_requisition_items(*)')
        .in('status', ['approved', 'partially_received'])
        .order('pr_number')
      return (data || []) as any[]
    },
  })

  const { data: skus } = useQuery({
    queryKey: ['skus-for-stock'],
    queryFn: async () => { const { data } = await supabase.from('skus').select('model_code,description'); return data || [] },
  })

  const setF = (k: keyof GRNForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handlePRSelect = (prId: string) => {
    const pr = prs?.find((p: any) => p.id === prId)
    if (!pr) { setForm(p => ({ ...p, pr_id: prId, supplier_name: '', items: [emptyItem()] })); return }
    const items: GRNItem[] = (pr.purchase_requisition_items || []).map((i: any) => ({
      sku_code: i.sku_code, sku_description: i.sku_description,
      ordered_qty: i.ordered_qty, received_qty: i.ordered_qty,
      damaged_qty: 0, shortage_qty: 0,
    }))
    setForm(p => ({ ...p, pr_id: prId, supplier_name: pr.supplier_name || '', items: items.length ? items : [emptyItem()] }))
  }

  const setItem = (i: number, k: keyof GRNItem, v: any) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items } })

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))

  const handleScan = (val: string) => {
    const s = val.trim()
    if (!s) return
    if (form.serials.includes(s)) {
      setLastScan({ val: s, ok: false })
      toast.error('Duplicate serial')
      return
    }
    setForm(p => ({ ...p, serials: [...p.serials, s] }))
    setLastScan({ val: s, ok: true })
    setSerialInput('')
  }

  const removeSerial = (s: string) => setForm(p => ({ ...p, serials: p.serials.filter(x => x !== s) }))

  const openNew = () => { setEditing(null); setForm(emptyForm()); setSerialInput(''); setLastScan(null); setOpen(true) }
  const openEdit = (row: any) => {
    setEditing(row)
    const items = (row.grn_items || []).map((i: any) => ({
      sku_code: i.sku_code, sku_description: i.sku_description,
      ordered_qty: i.ordered_qty, received_qty: i.received_qty,
      damaged_qty: i.damaged_qty, shortage_qty: i.shortage_qty,
    }))
    const serials = (row.grn_serials || []).map((s: any) => s.serial_no)
    setForm({ grn_sap_ref: row.grn_sap_ref || '', pr_id: row.pr_id || '', receive_date: row.receive_date, supplier_name: row.supplier_name || '', remarks: row.remarks || '', items: items.length ? items : [emptyItem()], serials })
    setSerialInput(''); setLastScan(null); setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.grn_sap_ref.trim()) throw new Error('GRN SAP Reference is required')
      const validItems = form.items.filter(i => i.sku_code !== '' && i.received_qty >= 0)
      if (!validItems.length) throw new Error('Add at least one item')

      const header = {
        grn_sap_ref: form.grn_sap_ref.trim(),
        pr_id: form.pr_id || null,
        receive_date: form.receive_date,
        supplier_name: form.supplier_name || null,
        remarks: form.remarks || null,
      }

      let grnId: string

      if (editing) {
        const { error } = await supabase.from('grn_entries').update(header).eq('id', editing.id)
        if (error) throw error
        grnId = editing.id
        await supabase.from('grn_items').delete().eq('grn_id', grnId)
        await supabase.from('grn_serials').delete().eq('grn_id', grnId)
      } else {
        // If no PR selected, auto-create a PR
        let prId = form.pr_id || null

        if (!prId) {
          const year = new Date().getFullYear()
          const { data: lastPR } = await supabase.from('purchase_requisitions').select('pr_number').ilike('pr_number', `PR-${year}-%`).order('pr_number', { ascending: false }).limit(1)
          const seq = lastPR?.[0]?.pr_number ? parseInt(lastPR[0].pr_number.split('-')[2] || '0') + 1 : 1
          const prNumber = `PR-${year}-${String(seq).padStart(4, '0')}`

          const { data: newPR, error: prErr } = await supabase.from('purchase_requisitions').insert({
            pr_number: prNumber,
            supplier_name: form.supplier_name || null,
            pr_date: form.receive_date,
            status: 'fully_received',
            auto_created: true,
            total_value: 0,
          } as any).select().single()
          if (prErr) throw prErr

          await supabase.from('purchase_requisition_items').insert(
            validItems.map(i => ({ pr_id: newPR.id, sku_code: i.sku_code, sku_description: i.sku_description, ordered_qty: i.received_qty, unit_price: 0, received_qty: i.received_qty })) as any
          )
          prId = newPR.id
        }

        const { data: newGRN, error: grnErr } = await supabase.from('grn_entries').insert({ ...header, pr_id: prId } as any).select().single()
        if (grnErr) throw grnErr
        grnId = newGRN.id

        // Update PR status
        if (form.pr_id) {
          const pr = prs?.find((p: any) => p.id === form.pr_id)
          if (pr) {
            const totalOrdered = (pr.purchase_requisition_items || []).reduce((s: number, i: any) => s + i.ordered_qty, 0)
            const totalReceived = validItems.reduce((s, i) => s + i.received_qty, 0)
            const newStatus = totalReceived >= totalOrdered ? 'fully_received' : 'partially_received'
            await supabase.from('purchase_requisitions').update({ status: newStatus }).eq('id', form.pr_id)
            // Update received_qty on PR items
            for (const item of validItems) {
              await supabase.from('purchase_requisition_items').update({ received_qty: item.received_qty }).eq('pr_id', form.pr_id).eq('sku_code', item.sku_code)
            }
          }
        }
      }

      // Insert items
      await supabase.from('grn_items').insert(
        validItems.map(i => ({ grn_id: grnId, ...i })) as any
      )

      // Insert serials
      if (form.serials.length) {
        await supabase.from('grn_serials').insert(
          form.serials.map(s => ({ grn_id: grnId, serial_no: s, sku_code: null })) as any
        )
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'GRN updated' : 'GRN saved')
      qc.invalidateQueries({ queryKey: ['grn-entries'] })
      qc.invalidateQueries({ queryKey: ['purchase-requisitions'] })
      setOpen(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('grn_entries').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('GRN deleted'); qc.invalidateQueries({ queryKey: ['grn-entries'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const totalReceived = (row: any) => (row.grn_items || []).reduce((s: number, i: any) => s + (i.received_qty || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'rgba(55,53,47,0.55)' }}>{grns?.length || 0} GRN records</span>
        <button onClick={openNew} className="btn-primary"><Plus size={13} />New GRN</button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !grns?.length ? (
          <EmptyState message="No GRN records yet." cta={<button onClick={openNew} className="btn-primary mt-2"><Plus size={13} />New GRN</button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="notion-table">
              <thead><tr>
                <th>GRN SAP Ref</th><th>Linked PR</th><th>Receive Date</th>
                <th>Supplier</th><th style={{ textAlign: 'right' }}>Total Received</th>
                <th style={{ textAlign: 'right' }}>Serials</th><th>Remarks</th><th style={{ width: 60 }}></th>
              </tr></thead>
              <tbody>
                {grns?.map((row: any) => (
                  <tr key={row.id} className="group">
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.grn_sap_ref || '—'}</td>
                    <td>
                      {row.purchase_requisitions?.pr_number
                        ? <Tag label={row.purchase_requisitions.pr_number} variant="blue" />
                        : <span style={{ color: 'rgba(55,53,47,0.4)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.65)', whiteSpace: 'nowrap' }}>{row.receive_date}</td>
                    <td style={{ fontSize: 13 }}>{row.supplier_name || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0a6b5c' }}>{totalReceived(row)}</td>
                    <td style={{ textAlign: 'right', fontSize: 12 }}>{row.grn_serials?.length || 0}</td>
                    <td style={{ fontSize: 12, color: 'rgba(55,53,47,0.65)' }}>{row.remarks || '—'}</td>
                    <td><RowActions>
                      <button onClick={() => openEdit(row)} className="btn-ghost"><Pencil size={12} /></button>
                      <button onClick={() => { if (confirm('Delete GRN?')) del.mutate(row.id) }} className="btn-ghost" style={{ color: '#c0392b' }}><Trash2 size={12} /></button>
                    </RowActions></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit GRN' : 'New GRN'} size="xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="GRN SAP Reference" required hint="Number from SAP — not auto-generated">
              <input value={form.grn_sap_ref} onChange={setF('grn_sap_ref')} placeholder="e.g. 5000012345" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
            </FormField>
            <FormField label="Receive Date" required>
              <input type="date" value={form.receive_date} onChange={setF('receive_date')} />
            </FormField>
            <FormField label="Link to PR" hint="Optional — leave blank to auto-create PR">
              <select value={form.pr_id} onChange={e => handlePRSelect(e.target.value)}>
                <option value="">No PR — manual entry (auto-creates PR)</option>
                {prs?.map((p: any) => <option key={p.id} value={p.id}>{p.pr_number} — {p.supplier_name || 'No supplier'}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier Name">
              <input value={form.supplier_name} onChange={setF('supplier_name')} placeholder="Auto-fill from PR or type" />
            </FormField>
            <div style={{ gridColumn: '1/-1' }}>
              <FormField label="Remarks"><input value={form.remarks} onChange={setF('remarks')} /></FormField>
            </div>
          </div>

          {/* Line items */}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Items Received
              </span>
              <button onClick={addItem} className="btn-secondary" style={{ fontSize: 12, padding: '3px 10px' }}><Plus size={12} />Add Item</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAFAF9', borderBottom: '1px solid rgba(55,53,47,0.09)' }}>
                  {['SKU Code', 'Description', 'Ordered', 'Received', 'Damaged', 'Shortage', ''].map(h => (
                    <th key={h} style={{ textAlign: h === '' ? 'center' : ['Ordered','Received','Damaged','Shortage'].includes(h) ? 'right' : 'left', padding: '6px 8px', fontSize: 11, color: 'rgba(55,53,47,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(55,53,47,0.06)' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <select value={item.sku_code} onChange={e => { const s = skus?.find((x: any) => x.model_code === Number(e.target.value)); setItem(i, 'sku_code', Number(e.target.value) || ''); if (s) setItem(i, 'sku_description', s.description) }} style={{ width: 90, fontSize: 12 }}>
                        <option value="">—</option>
                        {skus?.map((s: any) => <option key={s.model_code} value={s.model_code}>{s.model_code}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input value={item.sku_description} onChange={e => setItem(i, 'sku_description', e.target.value)} style={{ fontSize: 12 }} />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="number" min={0} value={item.ordered_qty} onChange={e => setItem(i, 'ordered_qty', Number(e.target.value))} style={{ textAlign: 'right', width: 65, fontSize: 13, background: 'rgba(55,53,47,0.04)', color: 'rgba(55,53,47,0.6)' }} readOnly={!!form.pr_id} />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="number" min={0} value={item.received_qty} onChange={e => setItem(i, 'received_qty', Number(e.target.value))} style={{ textAlign: 'right', width: 65, fontSize: 13, fontWeight: 600, borderColor: '#2383E2' }} />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="number" min={0} value={item.damaged_qty} onChange={e => setItem(i, 'damaged_qty', Number(e.target.value))} style={{ textAlign: 'right', width: 65, fontSize: 13 }} />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="number" min={0} value={item.shortage_qty} onChange={e => setItem(i, 'shortage_qty', Number(e.target.value))} style={{ textAlign: 'right', width: 65, fontSize: 13 }} />
                    </td>
                    <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="btn-ghost" style={{ padding: '2px 4px', color: '#c0392b' }}><Trash2 size={11} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Serial Scanner */}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Serial Numbers ({form.serials.length})
            </div>
            <input
              type="text"
              value={serialInput}
              onChange={e => setSerialInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(serialInput) } }}
              placeholder="Scan or type serial — press Enter"
              autoComplete="off"
              style={{ width: '100%', fontSize: 15, fontFamily: 'monospace', borderWidth: 2, borderColor: '#2383E2', marginBottom: 8 }}
            />
            {lastScan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 4, marginBottom: 8, fontSize: 13, fontWeight: 500, background: lastScan.ok ? '#DDEDEA' : '#FDDEDE', color: lastScan.ok ? '#0a6b5c' : '#c0392b' }}>
                {lastScan.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {lastScan.ok ? 'Scanned: ' : 'Duplicate: '}
                <span style={{ fontFamily: 'monospace' }}>{lastScan.val}</span>
              </div>
            )}
            {form.serials.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                {form.serials.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E7F3FB', color: '#1d6fa8', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace' }}>
                    {s}
                    <button onClick={() => removeSerial(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d6fa8', padding: 0, display: 'flex', lineHeight: 1 }}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(55,53,47,0.09)' }}>
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Save GRN'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner, Modal, FormField, PageHeader, Tag } from '../../components/ui'
import {
  Search, PackageCheck, PackageMinus, ClipboardList,
  History, Pencil, Printer, ArrowLeftRight, AlertCircle,
  CheckCircle2, Clock, ChevronRight, X
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────
interface SerialResult { serial: string; status: 'in_stock'|'dispatched'|'in_inventory'; entries: EntryHit[] }
interface EntryHit {
  type: 'inbound'|'outbound'|'inventory'; id: string; date: string
  party_name?: string; load_from?: string; offload_to?: string; sap_invoice_no?: string
  location?: string; scanner_name?: string; session_id?: string
  refrigerator_qty?: number; washing_machine_qty?: number; microwave_oven_qty?: number; air_conditioner_qty?: number
  vehicle_no?: string; transport_vendor?: string; remarks?: string; scanned_serials?: string[]; month?: string; raw: any
}
interface AuditLog {
  id: string; created_at: string; action: string; entry_type: string; entry_id: string
  serial_old?: string; serial_new?: string; field_changed?: string; old_value?: string; new_value?: string
  reason: string; operator_name?: string
}

// ── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SerialResult['status'], { label: string; variant: 'green'|'red'|'purple'; icon: any }> = {
  in_stock:     { label: 'In Stock',           variant: 'green',  icon: CheckCircle2 },
  dispatched:   { label: 'Dispatched',         variant: 'red',    icon: PackageMinus },
  in_inventory: { label: 'In Inventory Scan',  variant: 'purple', icon: ClipboardList },
}

function StatusBadge({ status }: { status: SerialResult['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  const bg = { green: '#DDEDEA', red: '#FDDEDE', purple: '#EAE4F2' }[cfg.variant]
  const fg = { green: '#0F7B6C', red: '#E03E3E', purple: '#6940A5' }[cfg.variant]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:600, background:bg, color:fg }}>
      <Icon size={14}/> {cfg.label}
    </span>
  )
}

// ── Search ───────────────────────────────────────────────────────────────
async function searchSerial(serial: string): Promise<SerialResult | null> {
  if (!serial.trim()) return null
  const s = serial.trim()
  const [inR, outR, invR] = await Promise.all([
    supabase.from('inbound_entries').select('*').order('receiving_date',{ascending:false}),
    supabase.from('outbound_entries').select('*').order('dispatch_date',{ascending:false}),
    supabase.from('physical_inventory').select('*').eq('serial_no', s).order('created_at',{ascending:false}),
  ])
  const entries: EntryHit[] = []
  for (const row of (inR.data||[])) {
    const serials: string[] = row.scanned_serials||[]
    if (serials.includes(s) || row.sap_invoice_no===s) entries.push({ type:'inbound', id:row.id, date:row.receiving_date, party_name:row.party_name, load_from:row.load_from, offload_to:row.offload_to, sap_invoice_no:row.sap_invoice_no, refrigerator_qty:row.refrigerator_qty, washing_machine_qty:row.washing_machine_qty, microwave_oven_qty:row.microwave_oven_qty, vehicle_no:row.vehicle_no, transport_vendor:row.transport_vendor, remarks:row.remarks, month:row.month, scanned_serials:row.scanned_serials, raw:row })
  }
  for (const row of (outR.data||[])) {
    const serials: string[] = row.scanned_serials||[]
    if (serials.includes(s) || row.sap_invoice_no===s) entries.push({ type:'outbound', id:row.id, date:row.dispatch_date, party_name:row.party_name, load_from:row.load_from, offload_to:row.offload_to, sap_invoice_no:row.sap_invoice_no, refrigerator_qty:row.refrigerator_qty, washing_machine_qty:row.washing_machine_qty, microwave_oven_qty:row.microwave_oven_qty, vehicle_no:row.vehicle_no, transport_vendor:row.transport_vendor, remarks:row.remarks, month:row.month, scanned_serials:row.scanned_serials, raw:row })
  }
  for (const row of (invR.data||[])) {
    entries.push({ type:'inventory', id:row.id, date:row.scan_date, location:row.location, scanner_name:row.scanner_name, session_id:row.session_id, raw:row })
  }
  if (entries.length===0) return null
  const sorted = [...entries].sort((a,b) => new Date(b.date).getTime()-new Date(a.date).getTime())
  const latest = sorted[0]
  let status: SerialResult['status'] = 'in_stock'
  if (latest.type==='outbound') status='dispatched'
  else if (latest.type==='inventory') status='in_inventory'
  return { serial:s, status, entries:sorted }
}

function useAuditLog(entryId: string | null) {
  return useQuery({
    queryKey: ['audit-log', entryId],
    queryFn: async () => {
      if (!entryId) return []
      const { data } = await supabase.from('serial_audit_log').select('*').eq('entry_id', entryId).order('created_at',{ascending:false})
      return (data||[]) as AuditLog[]
    },
    enabled: !!entryId,
  })
}

// ── Print ────────────────────────────────────────────────────────────────
function printSerialCard(result: SerialResult) {
  const cfg = STATUS_CONFIG[result.status]
  const statusBg = { green:'#DDEDEA', red:'#FDDEDE', purple:'#EAE4F2' }[cfg.variant]
  const statusFg = { green:'#0F7B6C', red:'#E03E3E', purple:'#6940A5' }[cfg.variant]
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Serial ${result.serial}</title>
  <style>
    body{font-family:-apple-system,Arial,sans-serif;padding:32px;max-width:720px;margin:0 auto;color:#37352F;}
    h1{font-size:20px;margin:0 0 4px;letter-spacing:-0.02em;}
    .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;background:${statusBg};color:${statusFg};margin-top:8px;}
    table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
    th{background:#FAFAF9;text-align:left;padding:8px 10px;border-bottom:1px solid rgba(55,53,47,0.09);font-size:11px;text-transform:uppercase;color:rgba(55,53,47,0.55);letter-spacing:0.04em;}
    td{padding:8px 10px;border-bottom:1px solid rgba(55,53,47,0.06);}
    .section h2{font-size:12px;font-weight:600;color:rgba(55,53,47,0.55);text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 8px;}
    .tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:500;}
    .t-in{background:#DDEDEA;color:#0F7B6C;} .t-out{background:#FDDEDE;color:#E03E3E;} .t-inv{background:#EAE4F2;color:#6940A5;}
    .footer{margin-top:32px;font-size:11px;color:rgba(55,53,47,0.4);border-top:1px solid rgba(55,53,47,0.09);padding-top:12px;}
  </style></head><body>
  <h1>Serial No: ${result.serial}</h1>
  <span class="status">${cfg.label}</span>
  <p style="font-size:12px;color:rgba(55,53,47,0.55);margin-top:12px;">Printed ${format(new Date(),'dd MMM yyyy HH:mm')}</p>
  <div class="section"><h2>Movement History (${result.entries.length})</h2>
  <table><tr><th>Type</th><th>Date</th><th>Party / Location</th><th>SAP Invoice</th><th>Route</th><th>Remarks</th></tr>
  ${result.entries.map(e => `<tr><td><span class="tag ${e.type==='inbound'?'t-in':e.type==='outbound'?'t-out':'t-inv'}">${e.type.toUpperCase()}</span></td><td>${e.date}</td><td>${e.party_name||e.location||'—'}</td><td>${e.sap_invoice_no||'—'}</td><td>${e.load_from&&e.offload_to?`${e.load_from} → ${e.offload_to}`:'—'}</td><td>${e.remarks||'—'}</td></tr>`).join('')}
  </table></div>
  <div class="footer">WBL Operations · Madanpur Warehouse · ${format(new Date(),'yyyy')}</div>
  </body></html>`
  const w = window.open('', '_blank', 'width=780,height=620')
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400) }
}

// ── Edit Modal ───────────────────────────────────────────────────────────
function EditEntryModal({ open, onClose, entry, serial }: { open: boolean; onClose: () => void; entry: EntryHit; serial: string }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<'fields'|'replace'|'history'>('fields')
  const [form, setForm] = useState({ ...entry.raw })
  const [replaceOld, setReplaceOld] = useState(serial)
  const [replaceNew, setReplaceNew] = useState('')
  const { data: auditLogs } = useAuditLog(entry.id)

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm((p: any) => ({ ...p, [k]: e.target.value }))

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Reason is required')
      const table = entry.type==='inbound' ? 'inbound_entries' : 'outbound_entries'
      const changed: string[] = []
      for (const k of Object.keys(form)) if (JSON.stringify(form[k]) !== JSON.stringify(entry.raw[k])) changed.push(k)
      const { error } = await supabase.from(table).update(form).eq('id', entry.id)
      if (error) throw error
      for (const field of changed) {
        await supabase.from('serial_audit_log').insert({ action:'edit_entry', entry_type:entry.type, entry_id:entry.id, serial_old:serial, field_changed:field, old_value:String(entry.raw[field]??''), new_value:String(form[field]??''), reason } as any)
      }
    },
    onSuccess: () => { toast.success('Entry updated with audit log'); qc.invalidateQueries({ queryKey:['inbound'] }); qc.invalidateQueries({ queryKey:['outbound'] }); onClose() },
    onError: (e: any) => toast.error(e.message),
  })

  const saveReplace = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Reason is required')
      if (!replaceNew.trim()) throw new Error('New serial is required')
      const table = entry.type==='inbound' ? 'inbound_entries' : entry.type==='outbound' ? 'outbound_entries' : null
      if (table) {
        const current: string[] = form.scanned_serials||[]
        const updated = current.map((s: string) => s===replaceOld ? replaceNew.trim() : s)
        const { error } = await supabase.from(table).update({ scanned_serials: updated }).eq('id', entry.id)
        if (error) throw error
      }
      await supabase.from('serial_audit_log').insert({ action:'replace_serial', entry_type:entry.type, entry_id:entry.id, serial_old:replaceOld, serial_new:replaceNew.trim(), reason } as any)
    },
    onSuccess: () => { toast.success(`Replaced: ${replaceOld} → ${replaceNew}`); qc.invalidateQueries({ queryKey:['inbound'] }); qc.invalidateQueries({ queryKey:['outbound'] }); setReplaceNew(''); onClose() },
    onError: (e: any) => toast.error(e.message),
  })

  const typeLabel = entry.type==='inbound' ? 'Inbound' : entry.type==='outbound' ? 'Outbound' : 'Inventory'
  const typeVariant = entry.type==='inbound' ? 'green' : entry.type==='outbound' ? 'red' : 'purple'

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${typeLabel} Entry`} size="xl">
      {/* Summary */}
      <div className="stat-block" style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:16, padding:'12px 16px' }}>
        <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.45)' }}>Type</div><Tag label={typeLabel} variant={typeVariant as any} /></div>
        <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.45)' }}>Date</div><div style={{ fontSize:13, fontWeight:600 }}>{entry.date}</div></div>
        <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.45)' }}>Party</div><div style={{ fontSize:13, fontWeight:600 }}>{entry.party_name||entry.location||'—'}</div></div>
        {entry.sap_invoice_no && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.45)' }}>SAP Invoice</div><div style={{ fontSize:13, fontWeight:600, fontFamily:'monospace' }}>{entry.sap_invoice_no}</div></div>}
        <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.45)' }}>Serial</div><div style={{ fontSize:13, fontWeight:600, fontFamily:'monospace', color:'#2383E2' }}>{serial}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:16, background:'rgba(55,53,47,0.04)', padding:3, borderRadius:6 }}>
        {[{key:'fields',label:'Edit Fields',icon:Pencil},{key:'replace',label:'Replace Serial',icon:ArrowLeftRight},{key:'history',label:`History (${auditLogs?.length||0})`,icon:History}].map(({key,label,icon:Icon}) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 10px', borderRadius:4, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', background: tab===key ? '#fff' : 'transparent', color: tab===key ? '#37352F' : 'rgba(55,53,47,0.5)', boxShadow: tab===key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {/* Edit Fields */}
      {tab==='fields' && entry.type!=='inventory' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <FormField label="SAP Invoice No."><input value={form.sap_invoice_no||''} onChange={setF('sap_invoice_no')} /></FormField>
            <FormField label="Party Name"><input value={form.party_name||''} onChange={setF('party_name')} /></FormField>
            <FormField label="Load From"><input value={form.load_from||''} onChange={setF('load_from')} /></FormField>
            <FormField label="Offload To"><input value={form.offload_to||''} onChange={setF('offload_to')} /></FormField>
            <FormField label="Vehicle No."><input value={form.vehicle_no||''} onChange={setF('vehicle_no')} /></FormField>
            <FormField label="Transport Vendor"><input value={form.transport_vendor||''} onChange={setF('transport_vendor')} /></FormField>
            <FormField label="Transport Cost (৳)"><input type="number" value={form.transport_cost||''} onChange={setF('transport_cost')} /></FormField>
          </div>
          <FormField label="Remarks"><input value={form.remarks||''} onChange={setF('remarks')} /></FormField>
          <div style={{ background:'#FBF3DB', border:'1px solid rgba(223,171,1,0.25)', borderRadius:6, padding:12 }}>
            <FormField label="Reason for Edit" required>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Explain why this entry is being edited…" style={{ resize:'none' }} />
            </FormField>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:'1px solid rgba(55,53,47,0.09)' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className="btn-primary">{saveEdit.isPending ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      {/* Replace Serial */}
      {tab==='replace' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#E7F3FB', border:'1px solid rgba(35,131,226,0.2)', borderRadius:6, padding:12, fontSize:13, color:'#1a5f8f' }}>
            <strong>Replace Serial Number</strong> — the old serial is swapped with the new one. Full audit trail saved.
          </div>
          <FormField label="Current Serial (to replace)">
            <input value={replaceOld} onChange={e => setReplaceOld(e.target.value)} style={{ fontFamily:'monospace', fontSize:15 }} />
          </FormField>
          <div style={{ display:'flex', justifyContent:'center', color:'rgba(55,53,47,0.3)' }}><ArrowLeftRight size={18}/></div>
          <FormField label="New Serial Number" required>
            <input value={replaceNew} onChange={e => setReplaceNew(e.target.value)} placeholder="Scan or type new serial…" autoFocus style={{ fontFamily:'monospace', fontSize:15, borderWidth:2, borderColor:'#2383E2' }} />
          </FormField>
          <div style={{ background:'#FBF3DB', border:'1px solid rgba(223,171,1,0.25)', borderRadius:6, padding:12 }}>
            <FormField label="Reason / Cause for Replacement" required>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. Wrong serial scanned, damaged unit exchanged, barcode unreadable…" style={{ resize:'none' }} />
            </FormField>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:'1px solid rgba(55,53,47,0.09)' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => saveReplace.mutate()} disabled={saveReplace.isPending||!replaceNew.trim()||!reason.trim()} className="btn-primary">{saveReplace.isPending ? 'Replacing…' : 'Replace Serial'}</button>
          </div>
        </div>
      )}

      {/* History */}
      {tab==='history' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {!auditLogs?.length ? (
            <div className="empty-state"><History size={32} style={{ opacity:0.25, marginBottom:8 }}/><p>No edit history yet for this entry.</p></div>
          ) : auditLogs.map(log => (
            <div key={log.id} className="card" style={{ padding:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <Tag label={log.action.replace('_',' ').toUpperCase()} variant={log.action==='replace_serial'?'blue':'yellow'} />
                    {log.field_changed && <span style={{ fontSize:11, color:'rgba(55,53,47,0.5)', fontFamily:'monospace' }}>{log.field_changed}</span>}
                  </div>
                  {log.action==='replace_serial' && (
                    <p style={{ fontSize:13, fontFamily:'monospace' }}>
                      <span style={{ color:'#E03E3E' }}>{log.serial_old}</span>
                      <span style={{ margin:'0 8px', color:'rgba(55,53,47,0.3)' }}>→</span>
                      <span style={{ color:'#0F7B6C' }}>{log.serial_new}</span>
                    </p>
                  )}
                  {log.action==='edit_entry' && log.field_changed && (
                    <p style={{ fontSize:13 }}>
                      <span style={{ color:'#E03E3E', textDecoration:'line-through' }}>{log.old_value||'(empty)'}</span>
                      <span style={{ margin:'0 8px', color:'rgba(55,53,47,0.3)' }}>→</span>
                      <span style={{ color:'#0F7B6C' }}>{log.new_value||'(empty)'}</span>
                    </p>
                  )}
                  <p style={{ fontSize:12, color:'rgba(55,53,47,0.55)', marginTop:6 }}><strong>Reason:</strong> {log.reason}</p>
                </div>
                <p style={{ fontSize:11, color:'rgba(55,53,47,0.4)', whiteSpace:'nowrap' }}>{format(new Date(log.created_at),'dd MMM yyyy HH:mm')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Entry Card ───────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit }: { entry: EntryHit; onEdit: () => void }) {
  const typeLabel = entry.type==='inbound' ? 'Inbound' : entry.type==='outbound' ? 'Outbound' : 'Inventory Scan'
  const typeVariant = entry.type==='inbound' ? 'green' : entry.type==='outbound' ? 'red' : 'purple'
  const TypeIcon = entry.type==='inbound' ? PackageCheck : entry.type==='outbound' ? PackageMinus : ClipboardList

  return (
    <div className="card" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, gap:8, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Tag label={typeLabel} variant={typeVariant as any} />
          <span style={{ fontSize:13, color:'rgba(55,53,47,0.55)' }}><TypeIcon size={12} style={{ display:'inline', marginRight:4, verticalAlign:-1 }}/>{entry.date}</span>
          {entry.month && <span className="tag tag-gray">{entry.month}</span>}
        </div>
        {entry.type!=='inventory' && (
          <button onClick={onEdit} className="btn-secondary" style={{ padding:'4px 10px', fontSize:12 }}><Pencil size={11}/>Edit</button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:10, fontSize:13 }}>
        {entry.party_name && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Party</div><div style={{ fontWeight:500 }}>{entry.party_name}</div></div>}
        {entry.sap_invoice_no && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>SAP Invoice</div><div style={{ fontWeight:500, fontFamily:'monospace' }}>{entry.sap_invoice_no}</div></div>}
        {entry.load_from && entry.offload_to && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Route</div><div>{entry.load_from} <ChevronRight size={11} style={{ display:'inline', verticalAlign:-1, opacity:0.4 }}/> {entry.offload_to}</div></div>}
        {entry.location && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Location</div><div style={{ fontWeight:500 }}>{entry.location}</div></div>}
        {entry.scanner_name && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Scanner</div><div style={{ fontWeight:500 }}>{entry.scanner_name}</div></div>}
        {entry.session_id && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Session</div><div style={{ fontFamily:'monospace', fontSize:12 }}>{entry.session_id}</div></div>}
        {entry.vehicle_no && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Vehicle</div><div>{entry.vehicle_no}</div></div>}
        {entry.transport_vendor && <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Vendor</div><div>{entry.transport_vendor}</div></div>}
        {((entry.refrigerator_qty||0)+(entry.washing_machine_qty||0)+(entry.microwave_oven_qty||0))>0 && (
          <div><div style={{ fontSize:11, color:'rgba(55,53,47,0.4)' }}>Quantities</div><div style={{ fontSize:12 }}>
            {entry.refrigerator_qty ? `Fridge: ${entry.refrigerator_qty}  ` : ''}{entry.washing_machine_qty ? `WM: ${entry.washing_machine_qty}  ` : ''}{entry.microwave_oven_qty ? `MWO: ${entry.microwave_oven_qty}` : ''}
          </div></div>
        )}
      </div>
      {entry.remarks && <p style={{ marginTop:10, fontSize:12, color:'rgba(55,53,47,0.55)', background:'#FAFAF9', borderRadius:4, padding:'6px 10px' }}>Remarks: {entry.remarks}</p>}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function SerialSearchPage() {
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [inputValue, setInputValue] = useState(initialQ)
  const [searchTerm, setSearchTerm] = useState(initialQ)
  const [editEntry, setEditEntry] = useState<EntryHit|null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-search if navigated with ?q= from dashboard
  useEffect(() => {
    if (initialQ) setSearchTerm(initialQ)
  }, [initialQ])

  const { data: result, isFetching } = useQuery({
    queryKey: ['serial-search', searchTerm],
    queryFn: () => searchSerial(searchTerm),
    enabled: !!searchTerm,
    staleTime: 0,
  })

  const handleSearch = (val?: string) => { const v=(val??inputValue).trim(); if(v) setSearchTerm(v) }
  const clearSearch = () => { setInputValue(''); setSearchTerm(''); inputRef.current?.focus() }

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader icon="search" title="Serial Search" subtitle="Scan or type any serial — status, history, edit, replace, print" />

      {/* Search bar */}
      <div className="card" style={{ padding:14, marginBottom:20 }}>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(55,53,47,0.4)' }}/>
            <input
              ref={inputRef} type="text" value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') handleSearch() }}
              placeholder="Scan barcode or type serial number…"
              autoFocus autoComplete="off" spellCheck={false}
              style={{ width:'100%', paddingLeft:36, paddingRight:36, paddingTop:10, paddingBottom:10, fontSize:15, fontFamily:'monospace', borderWidth:2, borderColor:'#2383E2' }}
            />
            {inputValue && (
              <button onClick={clearSearch} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'rgba(55,53,47,0.4)', background:'none', border:'none', cursor:'pointer' }}>
                <X size={14}/>
              </button>
            )}
          </div>
          <button onClick={() => handleSearch()} className="btn-primary" style={{ padding:'10px 18px' }}><Search size={14}/>Search</button>
        </div>
        <p style={{ fontSize:11, color:'rgba(55,53,47,0.4)', marginTop:8, marginLeft:2 }}>Press Enter or pull scanner trigger to search instantly</p>
      </div>

      {isFetching && <LoadingSpinner />}

      {!isFetching && searchTerm && result===null && (
        <div className="empty-state" style={{ border:'1px dashed rgba(55,53,47,0.15)', borderRadius:6 }}>
          <AlertCircle size={28} style={{ color:'#DFAB01', marginBottom:8 }}/>
          <p style={{ fontWeight:600, color:'#37352F', marginBottom:4 }}>Serial not found</p>
          <p style={{ fontSize:12 }}><span className="tag tag-gray" style={{ fontFamily:'monospace' }}>{searchTerm}</span> was not found in any record.</p>
        </div>
      )}

      {!isFetching && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Status card */}
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(55,53,47,0.45)', marginBottom:2 }}>Serial Number</div>
                <div style={{ fontSize:24, fontWeight:700, fontFamily:'monospace', letterSpacing:'-0.01em' }}>{result.serial}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <StatusBadge status={result.status} />
                <button onClick={() => printSerialCard(result)} className="btn-secondary" style={{ fontSize:12 }}><Printer size={12}/>Print</button>
              </div>
            </div>
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(55,53,47,0.45)' }}>
              <History size={12}/> {result.entries.length} movement record{result.entries.length!==1?'s':''} found
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Clock size={13} style={{ color:'rgba(55,53,47,0.4)' }}/>
            <span style={{ fontSize:12, fontWeight:600, color:'rgba(55,53,47,0.55)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Movement History</span>
            <span style={{ marginLeft:'auto', fontSize:11, color:'rgba(55,53,47,0.55)' }}>newest first</span>
          </div>

          {result.entries.map((entry,i) => <EntryCard key={entry.id+i} entry={entry} onEdit={() => setEditEntry(entry)} />)}
        </div>
      )}

      {editEntry && <EditEntryModal open={!!editEntry} onClose={() => setEditEntry(null)} entry={editEntry} serial={result?.serial||searchTerm} />}
    </div>
  )
}

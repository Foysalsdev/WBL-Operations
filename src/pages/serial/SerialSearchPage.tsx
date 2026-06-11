import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner, Modal, FormField } from '../../components/ui'
import {
  Search, Scan, PackageCheck, PackageMinus, ClipboardList,
  History, Pencil, Printer, ArrowLeftRight, AlertCircle,
  CheckCircle2, Clock, ChevronRight, X
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────
interface SerialResult {
  serial: string
  status: 'in_stock' | 'dispatched' | 'in_inventory'
  entries: EntryHit[]
}

interface EntryHit {
  type: 'inbound' | 'outbound' | 'inventory'
  id: string
  date: string
  party_name?: string
  load_from?: string
  offload_to?: string
  sap_invoice_no?: string
  location?: string
  scanner_name?: string
  session_id?: string
  refrigerator_qty?: number
  washing_machine_qty?: number
  microwave_oven_qty?: number
  air_conditioner_qty?: number
  vehicle_no?: string
  transport_vendor?: string
  remarks?: string
  scanned_serials?: string[]
  month?: string
  raw: any
}

interface AuditLog {
  id: string
  created_at: string
  action: string
  entry_type: string
  entry_id: string
  serial_old?: string
  serial_new?: string
  field_changed?: string
  old_value?: string
  new_value?: string
  reason: string
  operator_name?: string
}

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  in_stock: { label: 'In Stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  dispatched: { label: 'Dispatched', color: 'bg-red-50 text-red-700 border-red-200', icon: PackageMinus },
  in_inventory: { label: 'In Inventory Scan', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: ClipboardList },
}

function StatusBadge({ status }: { status: SerialResult['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.color}`}>
      <Icon size={14} /> {cfg.label}
    </span>
  )
}

// ── Search function ────────────────────────────────────────────────────────
async function searchSerial(serial: string): Promise<SerialResult | null> {
  if (!serial.trim()) return null

  const s = serial.trim()

  const [inboundRes, outboundRes, inventoryRes] = await Promise.all([
    supabase.from('inbound_entries').select('*').order('receiving_date', { ascending: false }),
    supabase.from('outbound_entries').select('*').order('dispatch_date', { ascending: false }),
    supabase.from('physical_inventory').select('*').eq('serial_no', s).order('created_at', { ascending: false }),
  ])

  const entries: EntryHit[] = []

  // Check inbound entries that contain this serial
  for (const row of (inboundRes.data || [])) {
    const serials: string[] = row.scanned_serials || []
    if (serials.includes(s) || row.sap_invoice_no === s) {
      entries.push({
        type: 'inbound',
        id: row.id,
        date: row.receiving_date,
        party_name: row.party_name,
        load_from: row.load_from,
        offload_to: row.offload_to,
        sap_invoice_no: row.sap_invoice_no,
        refrigerator_qty: row.refrigerator_qty,
        washing_machine_qty: row.washing_machine_qty,
        microwave_oven_qty: row.microwave_oven_qty,
        vehicle_no: row.vehicle_no,
        transport_vendor: row.transport_vendor,
        remarks: row.remarks,
        month: row.month,
        scanned_serials: row.scanned_serials,
        raw: row,
      })
    }
  }

  // Check outbound entries
  for (const row of (outboundRes.data || [])) {
    const serials: string[] = row.scanned_serials || []
    if (serials.includes(s) || row.sap_invoice_no === s) {
      entries.push({
        type: 'outbound',
        id: row.id,
        date: row.dispatch_date,
        party_name: row.party_name,
        load_from: row.load_from,
        offload_to: row.offload_to,
        sap_invoice_no: row.sap_invoice_no,
        refrigerator_qty: row.refrigerator_qty,
        washing_machine_qty: row.washing_machine_qty,
        microwave_oven_qty: row.microwave_oven_qty,
        vehicle_no: row.vehicle_no,
        transport_vendor: row.transport_vendor,
        remarks: row.remarks,
        month: row.month,
        scanned_serials: row.scanned_serials,
        raw: row,
      })
    }
  }

  // Inventory scans
  for (const row of (inventoryRes.data || [])) {
    entries.push({
      type: 'inventory',
      id: row.id,
      date: row.scan_date,
      location: row.location,
      scanner_name: row.scanner_name,
      session_id: row.session_id,
      raw: row,
    })
  }

  if (entries.length === 0) return null

  // Determine status: latest entry type determines status
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const latest = sorted[0]
  let status: SerialResult['status'] = 'in_stock'
  if (latest.type === 'outbound') status = 'dispatched'
  else if (latest.type === 'inventory') status = 'in_inventory'
  else if (latest.type === 'inbound') status = 'in_stock'

  return { serial: s, status, entries: sorted }
}

// ── Audit log hook ─────────────────────────────────────────────────────────
function useAuditLog(entryId: string | null) {
  return useQuery({
    queryKey: ['audit-log', entryId],
    queryFn: async () => {
      if (!entryId) return []
      const { data } = await supabase
        .from('serial_audit_log')
        .select('*')
        .eq('entry_id', entryId)
        .order('created_at', { ascending: false })
      return (data || []) as AuditLog[]
    },
    enabled: !!entryId,
  })
}

// ── Print helper ───────────────────────────────────────────────────────────
function printSerialCard(result: SerialResult) {
  const cfg = STATUS_CONFIG[result.status]
  const html = `
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>Serial: ${result.serial}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; max-width: 700px; margin: 0 auto; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .status { display:inline-block; padding: 4px 12px; border-radius: 20px; font-size:13px; font-weight:600; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }
      .status.dispatched { background:#fef2f2; color:#991b1b; border-color:#fecaca; }
      .status.inventory { background:#faf5ff; color:#6b21a8; border-color:#e9d5ff; }
      table { width:100%; border-collapse:collapse; margin-top:16px; font-size:13px; }
      th { background:#f8fafc; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; font-size:11px; text-transform:uppercase; color:#64748b; }
      td { padding:8px 10px; border:1px solid #e2e8f0; }
      .section { margin-top:20px; }
      .section h2 { font-size:13px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
      .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; }
      .badge-in { background:#dbeafe; color:#1d4ed8; }
      .badge-out { background:#fee2e2; color:#b91c1c; }
      .badge-inv { background:#ede9fe; color:#6d28d9; }
      .footer { margin-top:24px; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px; }
    </style></head><body>
    <h1>Serial No: <strong>${result.serial}</strong></h1>
    <p class="status ${result.status === 'dispatched' ? 'dispatched' : result.status === 'in_inventory' ? 'inventory' : ''}">${cfg.label}</p>
    <p style="font-size:12px;color:#64748b;margin-top:8px;">Printed: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>

    <div class="section">
      <h2>Movement History (${result.entries.length} entries)</h2>
      <table>
        <tr>
          <th>Type</th><th>Date</th><th>Party / Location</th><th>SAP Invoice</th><th>Route</th><th>Remarks</th>
        </tr>
        ${result.entries.map(e => `
          <tr>
            <td><span class="badge ${e.type === 'inbound' ? 'badge-in' : e.type === 'outbound' ? 'badge-out' : 'badge-inv'}">${e.type.toUpperCase()}</span></td>
            <td>${e.date}</td>
            <td>${e.party_name || e.location || '—'}</td>
            <td>${e.sap_invoice_no || '—'}</td>
            <td>${e.load_from && e.offload_to ? `${e.load_from} → ${e.offload_to}` : '—'}</td>
            <td>${e.remarks || '—'}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    <div class="footer">WBL Operations ERP · Madanpur Warehouse · ${format(new Date(), 'yyyy')}</div>
    </body></html>
  `
  const w = window.open('', '_blank', 'width=750,height=600')
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400) }
}

// ── Edit Entry Modal ───────────────────────────────────────────────────────
interface EditModalProps {
  open: boolean
  onClose: () => void
  entry: EntryHit
  serial: string
}

function EditEntryModal({ open, onClose, entry, serial }: EditModalProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<'fields' | 'replace' | 'history'>('fields')
  const [form, setForm] = useState({ ...entry.raw })
  const [replaceOld, setReplaceOld] = useState(serial)
  const [replaceNew, setReplaceNew] = useState('')
  const { data: auditLogs } = useAuditLog(entry.id)

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.value }))

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Reason is required')
      const table = entry.type === 'inbound' ? 'inbound_entries' : 'outbound_entries'

      // Detect what changed
      const changed: string[] = []
      for (const k of Object.keys(form)) {
        if (JSON.stringify(form[k]) !== JSON.stringify(entry.raw[k])) changed.push(k)
      }

      const { error } = await supabase.from(table).update(form).eq('id', entry.id)
      if (error) throw error

      // Log audit for each changed field
      for (const field of changed) {
        await supabase.from('serial_audit_log').insert({
          action: 'edit_entry',
          entry_type: entry.type,
          entry_id: entry.id,
          serial_old: serial,
          field_changed: field,
          old_value: String(entry.raw[field] ?? ''),
          new_value: String(form[field] ?? ''),
          reason,
        } as any)
      }
    },
    onSuccess: () => {
      toast.success('Entry updated with audit log')
      qc.invalidateQueries({ queryKey: ['inbound'] })
      qc.invalidateQueries({ queryKey: ['outbound'] })
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const saveReplace = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Reason is required')
      if (!replaceNew.trim()) throw new Error('New serial is required')

      const table = entry.type === 'inbound' ? 'inbound_entries'
        : entry.type === 'outbound' ? 'outbound_entries' : null

      if (table) {
        const currentSerials: string[] = form.scanned_serials || []
        const newSerials = currentSerials.map((s: string) => s === replaceOld ? replaceNew.trim() : s)
        const { error } = await supabase.from(table).update({ scanned_serials: newSerials }).eq('id', entry.id)
        if (error) throw error
      }

      await supabase.from('serial_audit_log').insert({
        action: 'replace_serial',
        entry_type: entry.type,
        entry_id: entry.id,
        serial_old: replaceOld,
        serial_new: replaceNew.trim(),
        reason,
      } as any)
    },
    onSuccess: () => {
      toast.success(`Serial replaced: ${replaceOld} → ${replaceNew}`)
      qc.invalidateQueries({ queryKey: ['inbound'] })
      qc.invalidateQueries({ queryKey: ['outbound'] })
      setReplaceNew('')
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const typeLabel = entry.type === 'inbound' ? 'Inbound' : entry.type === 'outbound' ? 'Outbound' : 'Inventory'
  const typeColor = entry.type === 'inbound' ? 'text-emerald-600' : entry.type === 'outbound' ? 'text-red-500' : 'text-purple-600'

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${typeLabel} Entry`} size="xl">
      {/* Entry summary header */}
      <div className="bg-slate-50 rounded-xl p-4 mb-5 flex flex-wrap gap-4 text-sm">
        <div><p className="text-xs text-slate-500">Type</p><p className={`font-semibold ${typeColor}`}>{typeLabel}</p></div>
        <div><p className="text-xs text-slate-500">Date</p><p className="font-semibold text-slate-800">{entry.date}</p></div>
        <div><p className="text-xs text-slate-500">Party</p><p className="font-semibold text-slate-800">{entry.party_name || entry.location || '—'}</p></div>
        {entry.sap_invoice_no && <div><p className="text-xs text-slate-500">SAP Invoice</p><p className="font-mono font-semibold text-slate-800">{entry.sap_invoice_no}</p></div>}
        <div><p className="text-xs text-slate-500">Serial</p><p className="font-mono font-semibold text-brand-700">{serial}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg">
        {[
          { key: 'fields', label: 'Edit Fields', icon: Pencil },
          { key: 'replace', label: 'Replace Serial', icon: ArrowLeftRight },
          { key: 'history', label: `History (${auditLogs?.length || 0})`, icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Edit Fields ── */}
      {tab === 'fields' && entry.type !== 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="SAP Invoice No.">
              <input value={form.sap_invoice_no || ''} onChange={setF('sap_invoice_no')} className="w-full" />
            </FormField>
            <FormField label="Party Name">
              <input value={form.party_name || ''} onChange={setF('party_name')} className="w-full" />
            </FormField>
            <FormField label="Load From">
              <input value={form.load_from || ''} onChange={setF('load_from')} className="w-full" />
            </FormField>
            <FormField label="Offload To">
              <input value={form.offload_to || ''} onChange={setF('offload_to')} className="w-full" />
            </FormField>
            <FormField label="Vehicle No.">
              <input value={form.vehicle_no || ''} onChange={setF('vehicle_no')} className="w-full" />
            </FormField>
            <FormField label="Transport Vendor">
              <input value={form.transport_vendor || ''} onChange={setF('transport_vendor')} className="w-full" />
            </FormField>
            <FormField label="Transport Cost (৳)">
              <input type="number" value={form.transport_cost || ''} onChange={setF('transport_cost')} className="w-full" />
            </FormField>
          </div>
          <FormField label="Remarks">
            <input value={form.remarks || ''} onChange={setF('remarks')} className="w-full" />
          </FormField>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <FormField label="⚠️ Reason for Edit" required>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="w-full resize-none"
                placeholder="Explain why this entry is being edited…"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className="btn-primary">
              {saveEdit.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Replace Serial ── */}
      {tab === 'replace' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">🔄 Replace Serial Number</p>
            <p className="text-xs text-blue-600">The old serial will be swapped with the new one in the entry. Full audit trail is saved.</p>
          </div>
          <FormField label="Current Serial (to replace)">
            <input
              value={replaceOld}
              onChange={e => setReplaceOld(e.target.value)}
              className="w-full font-mono text-base"
              placeholder="Old serial number"
            />
          </FormField>
          <div className="flex items-center justify-center text-slate-400">
            <ArrowLeftRight size={20} />
          </div>
          <FormField label="New Serial Number" required>
            <input
              value={replaceNew}
              onChange={e => setReplaceNew(e.target.value)}
              className="w-full font-mono text-base border-2 border-brand-300 focus:border-brand-500"
              placeholder="Scan or type new serial…"
              autoFocus
            />
          </FormField>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <FormField label="⚠️ Reason / Cause for Replacement" required>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="w-full resize-none"
                placeholder="e.g. Wrong serial scanned, damaged unit exchanged, barcode unreadable…"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => saveReplace.mutate()} disabled={saveReplace.isPending || !replaceNew.trim() || !reason.trim()} className="btn-primary">
              {saveReplace.isPending ? 'Replacing…' : 'Replace Serial'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: History ── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {!auditLogs?.length ? (
            <div className="text-center py-10 text-slate-400">
              <History size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No edit history yet for this entry.</p>
            </div>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge text-xs font-semibold ${
                        log.action === 'replace_serial' ? 'bg-blue-50 text-blue-700'
                        : log.action === 'edit_entry' ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {log.action.replace('_', ' ').toUpperCase()}
                      </span>
                      {log.field_changed && (
                        <span className="text-xs text-slate-500 font-mono">{log.field_changed}</span>
                      )}
                    </div>
                    {log.action === 'replace_serial' && (
                      <p className="text-sm text-slate-700 font-mono">
                        <span className="text-red-600">{log.serial_old}</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="text-emerald-600">{log.serial_new}</span>
                      </p>
                    )}
                    {log.action === 'edit_entry' && log.field_changed && (
                      <p className="text-sm text-slate-700">
                        <span className="text-red-500 line-through">{log.old_value || '(empty)'}</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="text-emerald-600">{log.new_value || '(empty)'}</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1.5">
                      <span className="font-medium text-slate-700">Reason: </span>{log.reason}
                    </p>
                    {log.operator_name && <p className="text-xs text-slate-400 mt-0.5">By: {log.operator_name}</p>}
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Entry Card ─────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit }: { entry: EntryHit; serial?: string; onEdit: () => void }) {
  const typeLabel = entry.type === 'inbound' ? 'Inbound' : entry.type === 'outbound' ? 'Outbound' : 'Inventory Scan'
  const typeStyles = {
    inbound: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    outbound: 'bg-red-50 text-red-700 border-red-200',
    inventory: 'bg-purple-50 text-purple-700 border-purple-200',
  }[entry.type]
  const TypeIcon = entry.type === 'inbound' ? PackageCheck : entry.type === 'outbound' ? PackageMinus : ClipboardList

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${typeStyles}`}>
            <TypeIcon size={12} /> {typeLabel}
          </span>
          <span className="text-slate-500 text-sm">{entry.date}</span>
          {entry.month && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{entry.month}</span>}
        </div>
        <div className="flex gap-2">
          {entry.type !== 'inventory' && (
            <button onClick={onEdit} className="btn-secondary py-1.5 px-3 text-xs">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        {entry.party_name && (
          <div><p className="text-xs text-slate-400 mb-0.5">Party</p><p className="font-medium text-slate-800">{entry.party_name}</p></div>
        )}
        {entry.sap_invoice_no && (
          <div><p className="text-xs text-slate-400 mb-0.5">SAP Invoice</p><p className="font-mono font-medium text-slate-800">{entry.sap_invoice_no}</p></div>
        )}
        {entry.load_from && entry.offload_to && (
          <div><p className="text-xs text-slate-400 mb-0.5">Route</p><p className="text-slate-700">{entry.load_from} <ChevronRight size={12} className="inline text-slate-400"/> {entry.offload_to}</p></div>
        )}
        {entry.location && (
          <div><p className="text-xs text-slate-400 mb-0.5">Location</p><p className="font-medium text-slate-800">{entry.location}</p></div>
        )}
        {entry.scanner_name && (
          <div><p className="text-xs text-slate-400 mb-0.5">Scanner</p><p className="font-medium text-slate-800">{entry.scanner_name}</p></div>
        )}
        {entry.session_id && (
          <div><p className="text-xs text-slate-400 mb-0.5">Session</p><p className="font-mono text-xs text-slate-700">{entry.session_id}</p></div>
        )}
        {entry.vehicle_no && (
          <div><p className="text-xs text-slate-400 mb-0.5">Vehicle</p><p className="text-slate-700">{entry.vehicle_no}</p></div>
        )}
        {entry.transport_vendor && (
          <div><p className="text-xs text-slate-400 mb-0.5">Vendor</p><p className="text-slate-700">{entry.transport_vendor}</p></div>
        )}
        {((entry.refrigerator_qty || 0) + (entry.washing_machine_qty || 0) + (entry.microwave_oven_qty || 0)) > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Quantities</p>
            <p className="text-slate-700 text-xs">
              {entry.refrigerator_qty ? `🔵 ${entry.refrigerator_qty}` : ''}
              {entry.washing_machine_qty ? ` 🟣 ${entry.washing_machine_qty}` : ''}
              {entry.microwave_oven_qty ? ` 🟡 ${entry.microwave_oven_qty}` : ''}
            </p>
          </div>
        )}
      </div>

      {entry.remarks && (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          Remarks: {entry.remarks}
        </p>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SerialSearchPage() {
  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editEntry, setEditEntry] = useState<EntryHit | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: result, isFetching } = useQuery({
    queryKey: ['serial-search', searchTerm],
    queryFn: () => searchSerial(searchTerm),
    enabled: !!searchTerm,
    staleTime: 0,
  })

  const handleSearch = (val?: string) => {
    const v = (val ?? inputValue).trim()
    if (v) setSearchTerm(v)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const clearSearch = () => {
    setInputValue('')
    setSearchTerm('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Scan size={20} className="text-brand-500" /> Serial Number Search
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Scan or type any serial — see status, history, edit, replace, print</p>
      </div>

      {/* Big scan input */}
      <div className="card p-4">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan barcode or type serial number…"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-9 pr-9 py-3 text-base font-mono border-2 border-brand-300 focus:border-brand-500"
            />
            {inputValue && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            )}
          </div>
          <button onClick={() => handleSearch()} className="btn-primary px-5">
            <Search size={15} /> Search
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 ml-1">Press Enter or pull scanner trigger to search instantly</p>
      </div>

      {/* Loading */}
      {isFetching && <LoadingSpinner />}

      {/* No result */}
      {!isFetching && searchTerm && result === null && (
        <div className="card p-8 text-center">
          <AlertCircle size={36} className="mx-auto text-amber-400 mb-3" />
          <p className="font-semibold text-slate-700">Serial not found</p>
          <p className="text-sm text-slate-400 mt-1">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{searchTerm}</span> was not found in any inbound, outbound, or inventory record.
          </p>
        </div>
      )}

      {/* Result */}
      {!isFetching && result && (
        <div className="space-y-4">
          {/* Status card */}
          <div className="card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Serial Number</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{result.serial}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={result.status} />
                <button
                  onClick={() => printSerialCard(result)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <Printer size={13} /> Print
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <History size={12} />
              {result.entries.length} movement record{result.entries.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Timeline header */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">Movement History</p>
            <span className="ml-auto text-xs text-slate-400">(newest first)</span>
          </div>

          {/* Entry cards */}
          {result.entries.map((entry, i) => (
            <div key={entry.id + i} className="relative">
              {i < result.entries.length - 1 && (
                <div className="absolute left-6 top-full w-0.5 h-4 bg-slate-200 z-10" />
              )}
              <EntryCard
                entry={entry}
                serial={result.serial}
                onEdit={() => setEditEntry(entry)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editEntry && (
        <EditEntryModal
          open={!!editEntry}
          onClose={() => setEditEntry(null)}
          entry={editEntry}
          serial={result?.serial || searchTerm}
        />
      )}
    </div>
  )
}

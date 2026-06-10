import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ScannerInput, LoadingSpinner, EmptyState, Modal, FormField } from '../../components/ui'
import { ClipboardList, Trash2, Download, RefreshCw, CheckCircle, AlertCircle, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const LOCATIONS = Array.from({ length: 22 }, (_, i) => `Line B-${String(i+1).padStart(2,'0')}`)

const generateSessionId = () => `INV-${format(new Date(), 'yyyyMMdd-HHmm')}`
const extractSKU = (serial: string) => serial.slice(0, 5)

export default function PhysicalInventoryPage() {
  const qc = useQueryClient()
  const [sessionId, setSessionId] = useState(generateSessionId)
  const [scannerName, setScannerName] = useState('')
  const [location, setLocation] = useState(LOCATIONS[0])
  const [scanValue, setScanValue] = useState('')
  const [active, setActive] = useState(false)
  const [setupOpen, setSetupOpen] = useState(true)
  const [lastScan, setLastScan] = useState<{ serial: string; status: 'ok' | 'dup' } | null>(null)

  const { data: scans, isLoading } = useQuery({
    queryKey: ['physical-inventory', sessionId],
    queryFn: async () => {
      const { data } = await supabase.from('physical_inventory').select('*').eq('session_id', sessionId).order('created_at', { ascending: false })
      return (data || []) as any[]
    },
    enabled: active,
    refetchInterval: active ? 5000 : false,
  })

  const addScan = useMutation({
    mutationFn: async (serial: string) => {
      const nextSl = ((scans||[]).filter((s: any) => s.location === location).length || 0) + 1
      const { error } = await supabase.from('physical_inventory').insert({
        scan_date: format(new Date(), 'yyyy-MM-dd'),
        scanner_name: scannerName,
        location,
        sl: nextSl,
        sku_code: extractSKU(serial),
        serial_no: serial,
        session_id: sessionId,
      } as any)
      if (error) throw error
      return serial
    },
    onSuccess: (serial) => {
      setLastScan({ serial, status: 'ok' })
      qc.invalidateQueries({ queryKey: ['physical-inventory', sessionId] })
    },
    onError: (e: any) => {
      if (e.message?.includes('unique') || e.message?.includes('duplicate') || e.code === '23505') {
        setLastScan({ serial: scanValue, status: 'dup' })
        toast.error('Duplicate serial — already scanned in this session')
      } else {
        toast.error(e.message)
      }
    },
  })

  const deleteScan = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('physical_inventory').delete().eq('id', id); if (error) throw error },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['physical-inventory', sessionId] }),
  })

  const handleScan = (serial: string) => { if (serial.trim()) addScan.mutate(serial.trim()) }

  const startSession = () => {
    if (!scannerName.trim()) { toast.error('Enter scanner name'); return }
    setActive(true); setSetupOpen(false); toast.success(`Session ${sessionId} started`)
  }

  const newSession = () => { setSessionId(generateSessionId()); setActive(false); setSetupOpen(true); setLastScan(null) }

  const exportCSV = () => {
    if (!scans?.length) return
    const headers = ['SL','Scan Date','Scanner','Location','SKU Code','Serial No','Session ID']
    const rows = (scans||[]).map((s:any) => [s.sl, s.scan_date, s.scanner_name, s.location, s.sku_code, s.serial_no, s.session_id])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = `inventory-${sessionId}.csv`; a.click()
  }

  const byLocation: Record<string, any[]> = {}
  for (const s of scans || []) {
    if (!byLocation[s.location]) byLocation[s.location] = []
    byLocation[s.location].push(s)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><ClipboardList size={20} className="text-purple-500"/> Physical Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Session: <span className="font-mono font-medium">{sessionId}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary" disabled={!scans?.length}><Download size={15}/>Export</button>
          <button onClick={newSession} className="btn-secondary"><RefreshCw size={15}/>New Session</button>
        </div>
      </div>

      <Modal open={setupOpen} onClose={() => {}} title="Start Inventory Session">
        <div className="space-y-4">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-800">
            <p className="font-semibold mb-1">📡 Zebra TC57 Ready</p>
            <p className="text-xs text-brand-600">Scanner auto-submits on Enter/trigger. Large input optimized for gloved hands.</p>
          </div>
          <FormField label="Scanner Operator Name" required>
            <input className="w-full text-base" placeholder="e.g. Hridoy" value={scannerName} onChange={e => setScannerName(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Starting Location">
            <select className="w-full" value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Session ID">
            <input className="w-full font-mono text-sm" value={sessionId} onChange={e => setSessionId(e.target.value)} />
          </FormField>
          <button onClick={startSession} className="btn-primary w-full justify-center py-3 text-base">Start Scanning</button>
        </div>
      </Modal>

      {active && (
        <>
          <div className="card p-4">
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-brand-500"/>
                <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-white" value={location} onChange={e => setLocation(e.target.value)}>
                  {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="ml-auto text-xs text-slate-500">
                <span className="font-medium text-slate-700">{scans?.length||0}</span> total ·{' '}
                <span className="font-medium text-purple-600">{byLocation[location]?.length||0}</span> at this location
              </div>
            </div>
            <ScannerInput value={scanValue} onChange={setScanValue} onScan={handleScan} placeholder="Scan serial number or type + Enter…" disabled={addScan.isPending}/>
            {lastScan && (
              <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${lastScan.status==='ok'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>
                {lastScan.status==='ok' ? <><CheckCircle size={16}/> Scanned: <span className="font-mono">{lastScan.serial}</span></> : <><AlertCircle size={16}/> Duplicate: <span className="font-mono">{lastScan.serial}</span></>}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Scanned Items — {sessionId}</h2>
              <span className="text-xs text-slate-400">{scans?.length} items</span>
            </div>
            {isLoading ? <LoadingSpinner/> : !scans?.length ? <EmptyState message="Start scanning to see items here." icon={<ClipboardList size={40}/>}/> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">{['SL','Location','SKU','Serial No.','Scanned At',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                  <tbody>
                    {scans?.map((row:any, i:number) => (
                      <tr key={row.id} className="table-row">
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{i+1}</td>
                        <td className="px-4 py-2.5"><span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded">{row.location}</span></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{row.sku_code||'—'}</td>
                        <td className="px-4 py-2.5 font-mono text-sm font-medium text-slate-800">{row.serial_no}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{format(new Date(row.created_at), 'HH:mm:ss')}</td>
                        <td className="px-4 py-2.5"><button onClick={()=>{if(confirm('Remove?'))deleteScan.mutate(row.id)}} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={13}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {Object.keys(byLocation).length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-800 mb-4 text-sm">Location Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(byLocation).sort().map(([loc, items]) => (
                  <div key={loc} className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 font-medium">{loc}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ScannerInput, LoadingSpinner, EmptyState, Modal, FormField, PageHeader } from '../../components/ui'
import { Trash2, Download, RefreshCw, CheckCircle2, AlertCircle, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const LOCATIONS = Array.from({ length: 22 }, (_, i) => `Line B-${String(i+1).padStart(2,'0')}`)
const generateSessionId = () => `INV-${format(new Date(), 'yyyyMMdd-HHmm')}`
const extractSKU = (s: string) => s.slice(0, 5)

export default function PhysicalInventoryPage() {
  const qc = useQueryClient()
  const [sessionId, setSessionId] = useState(generateSessionId)
  const [scannerName, setScannerName] = useState('')
  const [location, setLocation] = useState(LOCATIONS[0])
  const [scanValue, setScanValue] = useState('')
  const [active, setActive] = useState(false)
  const [setupOpen, setSetupOpen] = useState(true)
  const [lastScan, setLastScan] = useState<{ serial: string; status: 'ok'|'dup' } | null>(null)

  const { data: scans, isLoading } = useQuery({
    queryKey: ['physical-inventory', sessionId],
    queryFn: async () => {
      const { data } = await supabase.from('physical_inventory').select('*').eq('session_id', sessionId).order('created_at', { ascending: false })
      return (data||[]) as any[]
    },
    enabled: active,
    refetchInterval: active ? 5000 : false,
  })

  const addScan = useMutation({
    mutationFn: async (serial: string) => {
      const nextSl = ((scans||[]).filter((s:any) => s.location === location).length||0) + 1
      const { error } = await supabase.from('physical_inventory').insert({ scan_date: format(new Date(),'yyyy-MM-dd'), scanner_name: scannerName, location, sl: nextSl, sku_code: extractSKU(serial), serial_no: serial, session_id: sessionId } as any)
      if (error) throw error
      return serial
    },
    onSuccess: (serial) => { setLastScan({ serial, status: 'ok' }); qc.invalidateQueries({ queryKey: ['physical-inventory', sessionId] }) },
    onError: (e: any) => {
      if (e.message?.includes('unique') || e.message?.includes('duplicate') || e.code === '23505') {
        setLastScan({ serial: scanValue, status: 'dup' }); toast.error('Duplicate — already scanned')
      } else toast.error(e.message)
    },
  })

  const deleteScan = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('physical_inventory').delete().eq('id', id); if (error) throw error },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['physical-inventory', sessionId] }),
  })

  const startSession = () => {
    if (!scannerName.trim()) { toast.error('Enter scanner name'); return }
    setActive(true); setSetupOpen(false); toast.success(`Session ${sessionId} started`)
  }

  const newSession = () => { setSessionId(generateSessionId()); setActive(false); setSetupOpen(true); setLastScan(null) }

  const exportCSV = () => {
    if (!scans?.length) return
    const h = ['SL','Scan Date','Scanner','Location','SKU Code','Serial No','Session ID']
    const rows = scans.map((s:any) => [s.sl, s.scan_date, s.scanner_name, s.location, s.sku_code, s.serial_no, s.session_id])
    const csv = [h,...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = `inventory-${sessionId}.csv`; a.click()
  }

  const byLocation: Record<string,any[]> = {}
  for (const s of scans||[]) { if (!byLocation[s.location]) byLocation[s.location]=[]; byLocation[s.location].push(s) }

  return (
    <div>
      <PageHeader
        emoji="📋"
        title="Physical Inventory"
        subtitle={`Session: ${sessionId}`}
        actions={
          <>
            <button onClick={exportCSV} className="btn-secondary" disabled={!scans?.length}><Download size={13}/>Export</button>
            <button onClick={newSession} className="btn-secondary"><RefreshCw size={13}/>New Session</button>
          </>
        }
      />

      {/* Setup modal */}
      <Modal open={setupOpen} onClose={() => {}} title="Start Scanning Session">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#E7F3FB', border: '1px solid rgba(35,131,226,0.2)', borderRadius: 6, padding: '12px 14px', fontSize: 13, color: '#1a5f8f' }}>
            <strong>📡 Zebra TC57 ready</strong> — scanner trigger fires Enter automatically.
          </div>
          <FormField label="Operator Name" required>
            <input value={scannerName} onChange={e => setScannerName(e.target.value)} placeholder="e.g. Hridoy" autoFocus />
          </FormField>
          <FormField label="Starting Location">
            <select value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Session ID">
            <input value={sessionId} onChange={e => setSessionId(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </FormField>
          <button onClick={startSession} className="btn-primary" style={{ justifyContent: 'center', padding: '10px 16px', fontSize: 15 }}>
            Start Scanning
          </button>
        </div>
      </Modal>

      {active && (
        <>
          {/* Scanner panel */}
          <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <MapPin size={13} style={{ color: '#2383E2' }} />
                <select value={location} onChange={e => setLocation(e.target.value)}
                  style={{ border: '1px solid rgba(55,53,47,0.16)', borderRadius: 4, padding: '3px 8px', fontSize: 13, background: 'white' }}>
                  {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(55,53,47,0.5)' }}>
                <span style={{ fontWeight: 600, color: '#37352F' }}>{scans?.length||0}</span> total ·{' '}
                <span style={{ fontWeight: 600, color: '#6940A5' }}>{byLocation[location]?.length||0}</span> at {location}
              </div>
            </div>

            <ScannerInput value={scanValue} onChange={setScanValue} onScan={s => addScan.mutate(s)} disabled={addScan.isPending} />

            {lastScan && (
              <div style={{
                marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 4, fontSize: 13, fontWeight: 500,
                background: lastScan.status==='ok' ? '#DDEDEA' : '#FDDEDE',
                color: lastScan.status==='ok' ? '#0F7B6C' : '#E03E3E',
              }}>
                {lastScan.status==='ok' ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
                {lastScan.status==='ok' ? 'Scanned: ' : 'Duplicate: '}
                <span style={{ fontFamily: 'monospace' }}>{lastScan.serial}</span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden" style={{ marginBottom: 16 }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(55,53,47,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Scanned Items</span>
              <span style={{ fontSize: 11, color: 'rgba(55,53,47,0.45)' }}>{scans?.length||0} items</span>
            </div>
            {isLoading ? <LoadingSpinner /> : !scans?.length ? (
              <EmptyState message="Start scanning to see items here." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="notion-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Location</th><th>SKU</th><th>Serial No.</th><th>Time</th><th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans?.map((row:any, i:number) => (
                      <tr key={row.id} className="group">
                        <td style={{ fontSize: 11, color: 'rgba(55,53,47,0.35)', fontFamily: 'monospace' }}>{i+1}</td>
                        <td><span className="tag tag-purple">{row.location}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(55,53,47,0.55)' }}>{row.sku_code||'—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{row.serial_no}</td>
                        <td style={{ fontSize: 11, color: 'rgba(55,53,47,0.4)' }}>{format(new Date(row.created_at),'HH:mm:ss')}</td>
                        <td>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { if(confirm('Remove?')) deleteScan.mutate(row.id) }} className="btn-ghost" style={{ color: '#E03E3E' }}><Trash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Location summary */}
          {Object.keys(byLocation).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(55,53,47,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Location Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {Object.entries(byLocation).sort().map(([loc, items]) => (
                  <div key={loc} className="stat-block" style={{ textAlign: 'center', padding: '10px 8px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(55,53,47,0.5)', marginBottom: 2 }}>{loc}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{items.length}</div>
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

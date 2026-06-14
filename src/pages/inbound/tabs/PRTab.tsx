import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Modal, FormField, LoadingSpinner, EmptyState, Tag, RowActions } from '../../../components/ui'
import { Plus, Pencil, Trash2, Lightbulb } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', approved: 'Approved',
  partially_received: 'Partial', fully_received: 'Received', closed: 'Closed',
}
const STATUS_VARIANT: Record<string, 'gray'|'yellow'|'blue'|'green'|'red'> = {
  draft: 'gray', approved: 'yellow',
  partially_received: 'blue', fully_received: 'green', closed: 'red',
}
const STATUSES = ['draft','approved','partially_received','fully_received','closed']
const DELIVERY_TERMS = ['FOB','CIF','EXW','DDP','DAP','FCA']

interface PRItem { sku_code: number|''; sku_description: string; ordered_qty: number; unit_price: number }
interface PRForm {
  pr_number: string; supplier_name: string; supplier_code: string
  pr_date: string; expected_delivery_date: string
  status: string; approved_by: string; delivery_terms: string; remarks: string
  items: PRItem[]
}

function emptyItem(): PRItem { return { sku_code: '', sku_description: '', ordered_qty: 0, unit_price: 0 } }
function emptyForm(prNum: string): PRForm {
  return { pr_number: prNum, supplier_name: '', supplier_code: '', pr_date: format(new Date(),'yyyy-MM-dd'), expected_delivery_date: '', status: 'draft', approved_by: '', delivery_terms: '', remarks: '', items: [emptyItem()] }
}

async function generatePRNumber() {
  const year = new Date().getFullYear()
  const { data } = await supabase.from('purchase_requisitions').select('pr_number').ilike('pr_number', `PR-${year}-%`).order('pr_number', { ascending: false }).limit(1)
  const last = data?.[0]?.pr_number
  const seq = last ? parseInt(last.split('-')[2] || '0') + 1 : 1
  return `PR-${year}-${String(seq).padStart(4,'0')}`
}

export default function PRTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<PRForm>(emptyForm('PR-GENERATING...'))
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: prs, isLoading } = useQuery({
    queryKey: ['purchase-requisitions'],
    queryFn: async () => {
      const { data } = await supabase.from('purchase_requisitions').select('*, purchase_requisition_items(*)').order('created_at', { ascending: false })
      return (data || []) as any[]
    },
  })

  const { data: skus } = useQuery({
    queryKey: ['skus-for-stock'],
    queryFn: async () => { const { data } = await supabase.from('skus').select('model_code,description,min_stock_level').order('sl'); return data || [] },
  })

  const { data: lowStockSKUs } = useQuery({
    queryKey: ['low-stock-suggestions'],
    queryFn: async () => {
      const { data: stock } = await supabase.from('stock_summary').select('sku_code,sku_description,closing_inventory').order('sku_code')
      const { data: skuList } = await supabase.from('skus').select('model_code,description,min_stock_level')
      if (!stock || !skuList) return []
      return skuList.filter((s: any) => {
        const st = stock.find((x: any) => x.sku_code === s.model_code)
        const closing = st?.closing_inventory ?? 0
        return s.min_stock_level > 0 && closing < s.min_stock_level
      }).map((s: any) => {
        const st = stock.find((x: any) => x.sku_code === s.model_code)
        return { sku_code: s.model_code, sku_description: s.description, current_stock: st?.closing_inventory ?? 0, min_stock: s.min_stock_level }
      })
    },
  })

  const openNew = async () => {
    setEditing(null)
    const prNum = await generatePRNumber()
    setForm(emptyForm(prNum))
    setShowSuggestions(false)
    setOpen(true)
  }

  const openEdit = async (row: any) => {
    setEditing(row)
    const items = (row.purchase_requisition_items || []).map((i: any) => ({ sku_code: i.sku_code, sku_description: i.sku_description, ordered_qty: i.ordered_qty, unit_price: i.unit_price || 0 }))
    setForm({ pr_number: row.pr_number, supplier_name: row.supplier_name || '', supplier_code: row.supplier_code?.toString() || '', pr_date: row.pr_date, expected_delivery_date: row.expected_delivery_date || '', status: row.status, approved_by: row.approved_by || '', delivery_terms: row.delivery_terms || '', remarks: row.remarks || '', items: items.length ? items : [emptyItem()] })
    setShowSuggestions(false)
    setOpen(true)
  }

  const setF = (k: keyof PRForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const setItem = (i: number, k: keyof PRItem, v: any) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items } })

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_,j) => j !== i) }))

  const addSuggestion = (s: any) => {
    const already = form.items.some(i => i.sku_code === s.sku_code)
    if (already) { toast.error('Already in list'); return }
    setForm(p => ({ ...p, items: [...p.items.filter(i => i.sku_code !== ''), { sku_code: s.sku_code, sku_description: s.sku_description, ordered_qty: s.min_stock - s.current_stock, unit_price: 0 }] }))
  }

  const totalValue = form.items.reduce((s, i) => s + (i.ordered_qty * i.unit_price), 0)

  const save = useMutation({
    mutationFn: async () => {
      const header = { pr_number: form.pr_number, supplier_name: form.supplier_name || null, supplier_code: form.supplier_code ? parseInt(form.supplier_code) : null, pr_date: form.pr_date, expected_delivery_date: form.expected_delivery_date || null, status: form.status, approved_by: form.approved_by || null, delivery_terms: form.delivery_terms || null, remarks: form.remarks || null, total_value: totalValue }
      const validItems = form.items.filter(i => i.sku_code !== '' && i.ordered_qty > 0)
      if (!validItems.length) throw new Error('Add at least one item with quantity')
      if (editing) {
        const { error } = await supabase.from('purchase_requisitions').update(header).eq('id', editing.id)
        if (error) throw error
        await supabase.from('purchase_requisition_items').delete().eq('pr_id', editing.id)
        await supabase.from('purchase_requisition_items').insert(validItems.map(i => ({ pr_id: editing.id, ...i })) as any)
      } else {
        const { data, error } = await supabase.from('purchase_requisitions').insert(header as any).select().single()
        if (error) throw error
        await supabase.from('purchase_requisition_items').insert(validItems.map(i => ({ pr_id: data.id, ...i })) as any)
      }
    },
    onSuccess: () => { toast.success(editing ? 'PR updated' : 'PR created'); qc.invalidateQueries({ queryKey: ['purchase-requisitions'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('purchase_requisitions').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('PR deleted'); qc.invalidateQueries({ queryKey: ['purchase-requisitions'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: async () => { const { data } = await supabase.from('customers').select('code,customer_name').eq('is_active',true).order('customer_name'); return data || [] } })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontSize:13, color:'rgba(55,53,47,0.55)' }}>{prs?.length || 0} requisitions</span>
        <div style={{ display:'flex', gap:8 }}>
          {(lowStockSKUs?.length ?? 0) > 0 && (
            <button className="btn-secondary" style={{ color:'#a07800' }}>
              <Lightbulb size={13} /> {lowStockSKUs!.length} low stock
            </button>
          )}
          <button onClick={openNew} className="btn-primary"><Plus size={13}/>New PR</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <LoadingSpinner /> : !prs?.length ? <EmptyState message="No purchase requisitions yet." cta={<button onClick={openNew} className="btn-primary mt-2"><Plus size={13}/>New PR</button>} /> : (
          <div style={{ overflowX:'auto' }}>
            <table className="notion-table">
              <thead><tr>
                <th>PR Number</th><th>Supplier</th><th>PR Date</th><th>Expected</th>
                <th>Items</th><th style={{textAlign:'right'}}>Total Value</th>
                <th>Status</th><th>Approved By</th><th style={{width:60}}></th>
              </tr></thead>
              <tbody>
                {prs?.map((row:any) => (
                  <tr key={row.id} className="group">
                    <td style={{fontFamily:'monospace',fontWeight:600}}>{row.pr_number}</td>
                    <td style={{fontSize:13}}>{row.supplier_name || '—'}</td>
                    <td style={{fontSize:12,color:'rgba(55,53,47,0.65)',whiteSpace:'nowrap'}}>{row.pr_date}</td>
                    <td style={{fontSize:12,color:'rgba(55,53,47,0.65)',whiteSpace:'nowrap'}}>{row.expected_delivery_date || '—'}</td>
                    <td style={{fontSize:12}}>{row.purchase_requisition_items?.length || 0} SKUs</td>
                    <td style={{textAlign:'right',fontWeight:600}}>৳{(row.total_value||0).toLocaleString()}</td>
                    <td><Tag label={STATUS_LABEL[row.status]||row.status} variant={STATUS_VARIANT[row.status]||'gray'} /></td>
                    <td style={{fontSize:12,color:'rgba(55,53,47,0.65)'}}>{row.approved_by||'—'}</td>
                    <td><RowActions>
                      <button onClick={()=>openEdit(row)} className="btn-ghost"><Pencil size={12}/></button>
                      <button onClick={()=>{if(confirm('Delete PR?'))del.mutate(row.id)}} className="btn-ghost" style={{color:'#c0392b'}}><Trash2 size={12}/></button>
                    </RowActions></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={editing ? `Edit ${form.pr_number}` : 'New Purchase Requisition'} size="xl">
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Low stock suggestions banner */}
          {!editing && (lowStockSKUs?.length ?? 0) > 0 && (
            <div style={{background:'#FBF3DB',border:'1px solid rgba(223,171,1,0.25)',borderRadius:6,padding:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:'#a07800',display:'flex',alignItems:'center',gap:6}}>
                  <Lightbulb size={14}/> {lowStockSKUs!.length} SKUs below minimum stock
                </span>
                <button onClick={()=>setShowSuggestions(s=>!s)} className="btn-ghost" style={{fontSize:12}}>
                  {showSuggestions ? 'Hide' : 'Show suggestions'}
                </button>
              </div>
              {showSuggestions && (
                <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:180,overflowY:'auto'}}>
                  {lowStockSKUs!.map((s:any) => (
                    <div key={s.sku_code} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px',background:'rgba(255,255,255,0.6)',borderRadius:4}}>
                      <div>
                        <span style={{fontSize:12,fontWeight:600,fontFamily:'monospace'}}>{s.sku_code}</span>
                        <span style={{fontSize:12,color:'rgba(55,53,47,0.65)',marginLeft:8}}>{s.sku_description}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:11,color:'#c0392b'}}>Stock: {s.current_stock} / Min: {s.min_stock}</span>
                        <button onClick={()=>addSuggestion(s)} className="btn-secondary" style={{fontSize:11,padding:'2px 8px'}}>+ Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Header fields */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FormField label="PR Number" required><input value={form.pr_number} onChange={setF('pr_number')} style={{fontFamily:'monospace',fontWeight:600}} /></FormField>
            <FormField label="Status">
              <select value={form.status} onChange={setF('status')}>
                {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier">
              <select value={form.supplier_code} onChange={e=>{const c=customers?.find((x:any)=>x.code.toString()===e.target.value);setForm(p=>({...p,supplier_code:e.target.value,supplier_name:c?.customer_name||p.supplier_name}))}}>
                <option value="">Select supplier</option>
                {customers?.map((c:any)=><option key={c.code} value={c.code}>{c.code} — {c.customer_name}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier Name"><input value={form.supplier_name} onChange={setF('supplier_name')} placeholder="Auto-fill or type" /></FormField>
            <FormField label="PR Date" required><input type="date" value={form.pr_date} onChange={setF('pr_date')} /></FormField>
            <FormField label="Expected Delivery Date"><input type="date" value={form.expected_delivery_date} onChange={setF('expected_delivery_date')} /></FormField>
            <FormField label="Approved By"><input value={form.approved_by} onChange={setF('approved_by')} placeholder="Name" /></FormField>
            <FormField label="Delivery Terms">
              <select value={form.delivery_terms} onChange={setF('delivery_terms')}>
                <option value="">Select</option>
                {DELIVERY_TERMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <div style={{gridColumn:'1/-1'}}><FormField label="Remarks"><input value={form.remarks} onChange={setF('remarks')} /></FormField></div>
          </div>

          {/* Line items */}
          <div style={{paddingTop:12,borderTop:'1px solid rgba(55,53,47,0.09)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:600,color:'rgba(55,53,47,0.55)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Line Items</span>
              <button onClick={addItem} className="btn-secondary" style={{fontSize:12,padding:'3px 10px'}}><Plus size={12}/>Add SKU</button>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#FAFAF9',borderBottom:'1px solid rgba(55,53,47,0.09)'}}>
                  <th style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'rgba(55,53,47,0.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>SKU Code</th>
                  <th style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'rgba(55,53,47,0.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Description</th>
                  <th style={{textAlign:'right',padding:'6px 8px',fontSize:11,color:'rgba(55,53,47,0.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Qty</th>
                  <th style={{textAlign:'right',padding:'6px 8px',fontSize:11,color:'rgba(55,53,47,0.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Unit Price</th>
                  <th style={{textAlign:'right',padding:'6px 8px',fontSize:11,color:'rgba(55,53,47,0.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Total</th>
                  <th style={{width:30}}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item,i)=>{
                  const sku = skus?.find((s:any)=>s.model_code===Number(item.sku_code))
                  return (
                    <tr key={i} style={{borderBottom:'1px solid rgba(55,53,47,0.06)'}}>
                      <td style={{padding:'4px 6px'}}>
                        <select value={item.sku_code} onChange={e=>{const s=skus?.find((x:any)=>x.model_code===Number(e.target.value));setItem(i,'sku_code',Number(e.target.value)||'');if(s)setItem(i,'sku_description',s.description)}} style={{width:100,fontSize:12}}>
                          <option value="">—</option>
                          {skus?.map((s:any)=><option key={s.model_code} value={s.model_code}>{s.model_code}</option>)}
                        </select>
                      </td>
                      <td style={{padding:'4px 6px'}}><input value={item.sku_description} onChange={e=>setItem(i,'sku_description',e.target.value)} placeholder={sku?.description||'Description'} style={{fontSize:12}} /></td>
                      <td style={{padding:'4px 6px'}}><input type="number" min={0} value={item.ordered_qty} onChange={e=>setItem(i,'ordered_qty',Number(e.target.value))} style={{textAlign:'right',width:70,fontSize:13}} /></td>
                      <td style={{padding:'4px 6px'}}><input type="number" min={0} value={item.unit_price} onChange={e=>setItem(i,'unit_price',Number(e.target.value))} style={{textAlign:'right',width:90,fontSize:13}} /></td>
                      <td style={{padding:'4px 6px',textAlign:'right',fontSize:13,fontWeight:500}}>৳{(item.ordered_qty*item.unit_price).toLocaleString()}</td>
                      <td style={{padding:'4px 2px'}}>
                        {form.items.length>1&&<button onClick={()=>removeItem(i)} className="btn-ghost" style={{padding:'2px 4px',color:'#c0392b'}}><Trash2 size={11}/></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{borderTop:'2px solid rgba(55,53,47,0.12)'}}>
                  <td colSpan={4} style={{padding:'8px',textAlign:'right',fontSize:12,fontWeight:600,color:'rgba(55,53,47,0.6)'}}>Total Value</td>
                  <td style={{padding:'8px',textAlign:'right',fontSize:15,fontWeight:700}}>৳{totalValue.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:12,borderTop:'1px solid rgba(55,53,47,0.09)'}}>
            <button onClick={()=>setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={()=>save.mutate()} disabled={save.isPending} className="btn-primary">{save.isPending?'Saving…':editing?'Save Changes':'Create PR'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

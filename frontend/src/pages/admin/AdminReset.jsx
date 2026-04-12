// src/pages/admin/AdminReset.jsx

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, Card, CardHeader, Table, Tr, Td,
  Btn, Spinner, Empty, AlertBanner, Checkbox, DangerBadge, Mono, tokens as T
} from '../../components/admin/AdminUI'

const TARGETS = [
  { key:'orders',    label:'Orders',       desc:'All customer orders and their status',        icon:'◳', danger:true  },
  { key:'expenses',  label:'Expenses',     desc:'All logged expense entries',                  icon:'◎', danger:false },
  { key:'cogs',      label:'COGS Entries', desc:'All cost-of-goods entries + supplier totals', icon:'▦', danger:false },
  { key:'products',  label:'Products',     desc:'Entire product catalogue',                    icon:'◈', danger:true  },
  { key:'suppliers', label:'Suppliers',    desc:'All supplier records',                        icon:'⬡', danger:false },
]

export default function AdminReset() {
  const [selected, setSelected]   = useState([])
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [archives, setArchives]   = useState(null)
  const [archLoading, setArchLoading] = useState(true)

  useEffect(() => { loadArchives() }, [])

  async function loadArchives() {
    setArchLoading(true)
    try { const res = await adminApi.get('/system/archives'); setArchives(res.data) }
    finally { setArchLoading(false) }
  }

  function toggleTarget(key) {
    setSelected(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key])
    setResult(null)
  }

  async function doReset() {
    if (confirm !== 'RESET' || selected.length === 0) return
    setLoading(true); setResult(null)
    try {
      const res = await adminApi.post('/system/reset', { targets:selected, confirm })
      setResult({ success:true, data:res.data })
      setSelected([]); setConfirm('')
      await loadArchives()
    } catch (err) {
      setResult({ success:false, error:err.response?.data?.error || 'Reset failed' })
    } finally { setLoading(false) }
  }

  const hasDanger = selected.some(s => TARGETS.find(t => t.key===s)?.danger)

  return (
    <>
      <PageHeader title="Data Reset" subtitle="Archive & wipe test data" />
      <PageContent>

        <AlertBanner
          type="warning"
          title="All data is archived before deletion"
          body="Nothing is permanently destroyed. Every reset is saved with a batch ID, timestamp, and your admin email."
        />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' }}>

          {/* Target selection */}
          <Card>
            <CardHeader title="Select what to reset" />
            <div style={{ padding:'8px 0' }}>
              {TARGETS.map(t => {
                const isSelected = selected.includes(t.key)
                return (
                  <div
                    key={t.key}
                    onClick={() => toggleTarget(t.key)}
                    style={{
                      display:'flex', alignItems:'center', gap:14,
                      padding:'14px 18px', cursor:'pointer',
                      borderBottom:`1px solid ${T.border}`,
                      background: isSelected ? (t.danger ? 'rgba(255,45,120,0.06)' : 'rgba(184,255,60,0.04)') : 'transparent',
                      transition:'background 0.15s',
                    }}
                  >
                    <Checkbox checked={isSelected} onChange={() => toggleTarget(t.key)} danger={t.danger} />
                    <div style={{ fontSize:16, color:T.muted }}>{t.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text, display:'flex', alignItems:'center', gap:8 }}>
                        {t.label}
                        {t.danger && <DangerBadge />}
                      </div>
                      <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{t.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Confirm panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
                Confirm Reset
              </div>

              {selected.length === 0 ? (
                <div style={{ fontSize:13, color:T.muted, textAlign:'center', padding:'20px 0' }}>
                  Select at least one target
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>Selected:</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {selected.map(s => {
                        const t = TARGETS.find(t => t.key===s)
                        return (
                          <span key={s} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:700, background:t?.danger ? 'rgba(255,45,120,0.12)' : 'rgba(184,255,60,0.10)', color:t?.danger ? T.pink : T.lime }}>
                            {t?.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {hasDanger && (
                    <AlertBanner type="danger" title="High-impact reset selected" body="Cannot be undone from the UI — only from the database archive directly." />
                  )}

                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>
                      Type <strong style={{ color:T.text }}>RESET</strong> to confirm:
                    </div>
                    <input
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Type RESET"
                      className="dn-input"
                      style={{ width:'100%', padding:'10px 14px', background:'#0f0f1a', border:`1px solid ${confirm==='RESET' ? T.pink : T.border}`, borderRadius:10, color:T.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.2s' }}
                    />
                  </div>

                  <button
                    onClick={doReset}
                    disabled={confirm !== 'RESET' || loading}
                    style={{
                      width:'100%', padding:'12px',
                      background: confirm==='RESET' ? T.pink : T.faint,
                      color: confirm==='RESET' ? '#fff' : T.muted,
                      border:'none', borderRadius:10,
                      fontSize:12, fontWeight:900, letterSpacing:'0.06em',
                      cursor: confirm==='RESET' ? 'pointer' : 'not-allowed',
                      transition:'all 0.2s', fontFamily:'inherit',
                      boxShadow: confirm==='RESET' ? `0 0 20px rgba(255,45,120,0.3)` : 'none',
                    }}
                  >
                    {loading ? 'Resetting...' : 'Execute Reset'}
                  </button>
                </>
              )}
            </Card>

            {result && (
              <div style={{ padding:'14px 16px', borderRadius:12, background:result.success ? 'rgba(184,255,60,0.08)' : 'rgba(255,45,120,0.08)', border:`1px solid ${result.success ? 'rgba(184,255,60,0.2)' : 'rgba(255,45,120,0.2)'}` }}>
                {result.success ? (
                  <>
                    <div style={{ fontSize:13, fontWeight:700, color:T.lime, marginBottom:8 }}>✓ Reset Complete</div>
                    <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>Batch: <Mono>{result.data.batch}</Mono></div>
                    {Object.entries(result.data.summary).map(([k,v]) => (
                      <div key={k} style={{ fontSize:12, color:T.muted }}>{k}: {v} records archived</div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontSize:13, color:T.pink }}>✕ {result.error}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Archive history */}
        <div style={{ marginTop:24 }}>
          <Card>
            <CardHeader title="Archive Summary" />
            {archLoading ? <Spinner /> : archives ? (
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
                  {[
                    { label:'Products',  count:archives.products?.count  },
                    { label:'Orders',    count:archives.orders?.count    },
                    { label:'Expenses',  count:archives.expenses?.count  },
                    { label:'Suppliers', count:archives.suppliers?.count },
                    { label:'COGS',      count:archives.cogs?.count      },
                  ].map(({ label, count }) => (
                    <div key={label} style={{ background:'#0f0f1a', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:10, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
                      <div style={{ fontSize:22, fontWeight:900, color: count > 0 ? T.gold : T.faint }}>{count || 0}</div>
                      <div style={{ fontSize:10, color:T.faint, marginTop:4 }}>archived</div>
                    </div>
                  ))}
                </div>

                {archives.batches?.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>
                      Reset History
                    </div>
                    <Table headers={['Batch ID','Performed By','Date']}>
                      {archives.batches.map(b => (
                        <Tr key={b.reset_batch}>
                          <Td><Mono>{b.reset_batch}</Mono></Td>
                          <Td muted>{b.deleted_by_email}</Td>
                          <Td muted>{new Date(b.reset_at).toLocaleString()}</Td>
                        </Tr>
                      ))}
                    </Table>
                  </>
                )}
                {archives.batches?.length === 0 && <Empty message="No resets performed yet" />}
              </div>
            ) : null}
          </Card>
        </div>

      </PageContent>
    </>
  )
}
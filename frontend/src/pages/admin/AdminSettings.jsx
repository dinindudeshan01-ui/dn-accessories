// src/pages/admin/AdminSettings.jsx — Settings: theme, timezone, accent, nuke

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, Card, CardHeader,
  Btn, Modal, ModalFooter, tokens as T
} from '../../components/admin/AdminUI'

const TIMEZONES = [
  { label: 'Asia/Colombo (LKT, UTC+5:30)',       value: 'Asia/Colombo'       },
  { label: 'Asia/Kolkata (IST, UTC+5:30)',        value: 'Asia/Kolkata'       },
  { label: 'Asia/Dubai (GST, UTC+4)',             value: 'Asia/Dubai'         },
  { label: 'Europe/London (GMT/BST)',             value: 'Europe/London'      },
  { label: 'America/New_York (ET)',               value: 'America/New_York'   },
  { label: 'America/Los_Angeles (PT)',            value: 'America/Los_Angeles'},
  { label: 'Australia/Sydney (AEDT)',             value: 'Australia/Sydney'   },
  { label: 'UTC',                                 value: 'UTC'                },
]

const ACCENTS = [
  { label: 'Neon Pink',   value: '#ff2d78', glow: 'rgba(255,45,120,0.4)'  },
  { label: 'Cyber Cyan',  value: '#00e5ff', glow: 'rgba(0,229,255,0.4)'   },
  { label: 'Royal Purple',value: '#a259ff', glow: 'rgba(162,89,255,0.4)'  },
  { label: 'Neon Lime',   value: '#b8ff3c', glow: 'rgba(184,255,60,0.4)'  },
  { label: 'Gold',        value: '#ffc53d', glow: 'rgba(255,197,61,0.4)'  },
]

export default function AdminSettings() {
  const [theme,    setTheme]    = useState(() => localStorage.getItem('dn_admin_theme')    || 'dark')
  const [timezone, setTimezone] = useState(() => localStorage.getItem('dn_admin_timezone') || 'Asia/Colombo')
  const [accent,   setAccent]   = useState(() => localStorage.getItem('dn_admin_accent')   || '#ff2d78')
  const [saved,    setSaved]    = useState(false)

  // Nuke modal state
  const [nukeModal,   setNukeModal]   = useState(false)
  const [nukeStep,    setNukeStep]    = useState(1) // 1 → 2 → 3
  const [nukeConfirm, setNukeConfirm] = useState('')
  const [nuking,      setNuking]      = useState(false)
  const [nukeResult,  setNukeResult]  = useState(null)

  // Current time preview
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function saveSettings() {
    localStorage.setItem('dn_admin_theme',    theme)
    localStorage.setItem('dn_admin_timezone', timezone)
    localStorage.setItem('dn_admin_accent',   accent)
    // Apply theme
    document.documentElement.setAttribute('data-admin-theme', theme)
    // Apply accent CSS variable
    document.documentElement.style.setProperty('--dn-accent', accent)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function openNuke() {
    setNukeModal(true)
    setNukeStep(1)
    setNukeConfirm('')
    setNukeResult(null)
  }

  function closeNuke() {
    setNukeModal(false)
    setNukeStep(1)
    setNukeConfirm('')
    setNukeResult(null)
  }

  async function executeNuke() {
    if (nukeConfirm !== 'DELETE EVERYTHING') return
    setNuking(true)
    try {
      const targets = ['orders', 'expenses', 'cogs', 'products', 'suppliers']
      const res = await adminApi.post('/system/reset', { targets, confirm: 'RESET' })
      setNukeResult({ success: true, batch: res.data.batch, summary: res.data.summary })
      setNukeStep(4)
    } catch (err) {
      setNukeResult({ success: false, error: err.response?.data?.error || 'Nuke failed' })
      setNukeStep(4)
    } finally { setNuking(false) }
  }

  const fmtTime = (tz) => {
    try {
      return now.toLocaleString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, weekday: 'long', month: 'short', day: 'numeric' })
    } catch { return now.toLocaleString() }
  }

  const accentObj = ACCENTS.find(a => a.value === accent) || ACCENTS[0]

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, timezone & data management" />
      <PageContent>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>

          {/* ── Theme ── */}
          <Card>
            <CardHeader title="Theme" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['dark', 'light'].map(t => (
                <div
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${theme === t ? accent : T.border}`,
                    background: theme === t ? `${accent}12` : T.surface,
                    transition: 'all 0.2s',
                    boxShadow: theme === t ? `0 0 20px ${accentObj.glow}` : 'none',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: t === 'dark' ? '#080810' : '#f5f5f7',
                    border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {t === 'dark' ? '◑' : '○'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'capitalize' }}>{t} Mode</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {t === 'dark' ? 'Neon Noir — default' : 'Light surface — coming soon'}
                    </div>
                  </div>
                  {theme === t && (
                    <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#000' }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ── Accent Color ── */}
          <Card>
            <CardHeader title="Accent Color" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACCENTS.map(a => (
                <div
                  key={a.value}
                  onClick={() => setAccent(a.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${accent === a.value ? a.value : T.border}`,
                    background: accent === a.value ? `${a.value}12` : T.surface,
                    transition: 'all 0.2s',
                    boxShadow: accent === a.value ? `0 0 20px ${a.glow}` : 'none',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: a.value,
                    boxShadow: `0 0 12px ${a.glow}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{a.label}</span>
                  {accent === a.value && (
                    <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: a.value, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#000' }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ── Timezone ── */}
          <Card style={{ gridColumn: 'span 2' }}>
            <CardHeader title="Timezone" />
            <div style={{ padding: 20 }}>
              {/* Live clock */}
              <div style={{
                padding: '16px 20px', marginBottom: 16,
                background: T.surface, borderRadius: 12,
                border: `1px solid ${T.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Current time in selected timezone</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: accent, fontFamily: T.mono }}>{fmtTime(timezone)}</div>
                </div>
                <div style={{ fontSize: 32, opacity: 0.3 }}>◷</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {TIMEZONES.map(tz => (
                  <div
                    key={tz.value}
                    onClick={() => setTimezone(tz.value)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${timezone === tz.value ? accent : T.border}`,
                      background: timezone === tz.value ? `${accent}10` : T.surface,
                      transition: 'all 0.15s',
                      boxShadow: timezone === tz.value ? `0 0 16px ${accentObj.glow}` : 'none',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: timezone === tz.value ? accent : T.text }}>{tz.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3, fontFamily: T.mono }}>{fmtTime(tz.value).split(',').pop()?.trim()}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

        </div>

        {/* ── Save button ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, maxWidth: 900 }}>
          <Btn onClick={saveSettings} style={{ background: accent, boxShadow: `0 0 20px ${accentObj.glow}` }}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </Btn>
          {saved && <span style={{ fontSize: 12, color: T.lime }}>Settings applied — reload to see full effect</span>}
        </div>

        {/* ── Danger Zone ── */}
        <div style={{ marginTop: 40, maxWidth: 900 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.pink, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            ⚠ Danger Zone
          </div>
          <div style={{
            padding: '20px 24px', borderRadius: 16,
            border: '1.5px solid rgba(255,45,120,0.3)',
            background: 'rgba(255,45,120,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Nuke Everything</div>
              <div style={{ fontSize: 12, color: T.muted }}>Wipes all orders, expenses, products, suppliers and COGS. Archived before deletion. Cannot be undone from UI.</div>
            </div>
            <Btn variant="danger" onClick={openNuke} style={{ flexShrink: 0, marginLeft: 20 }}>
              ☢ Nuke Database
            </Btn>
          </div>
        </div>

      </PageContent>

      {/* ── Nuke Modal — 3-step confirmation ── */}
      {nukeModal && (
        <Modal title="☢ Nuke Everything" onClose={closeNuke} width={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {nukeStep === 1 && (
              <>
                <div style={{ padding: '16px', background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.25)', borderRadius: 12, fontSize: 13, color: T.pink, lineHeight: 1.6 }}>
                  This will permanently wipe:<br />
                  <strong style={{ color: T.text }}>All orders · All expenses · All products · All suppliers · All COGS entries</strong><br /><br />
                  Everything is archived with a batch ID before deletion.
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>Are you absolutely sure you want to proceed?</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={closeNuke}>Cancel</Btn>
                  <Btn variant="danger" onClick={() => setNukeStep(2)}>Yes, continue →</Btn>
                </div>
              </>
            )}

            {nukeStep === 2 && (
              <>
                <div style={{ fontSize: 13, color: T.gold, fontWeight: 700 }}>⚠ Second confirmation</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                  This action will delete ALL live data from the database. Sewwandi's shop data, all orders, everything. The only way to recover is from the archive table directly in Turso.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={closeNuke}>Cancel</Btn>
                  <Btn variant="danger" onClick={() => setNukeStep(3)}>I understand, proceed →</Btn>
                </div>
              </>
            )}

            {nukeStep === 3 && (
              <>
                <div style={{ fontSize: 13, color: T.pink, fontWeight: 700 }}>☢ Final confirmation</div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
                  Type <strong style={{ color: T.text, fontFamily: T.mono }}>DELETE EVERYTHING</strong> to execute:
                </div>
                <input
                  value={nukeConfirm}
                  onChange={e => setNukeConfirm(e.target.value)}
                  placeholder="DELETE EVERYTHING"
                  className="dn-input"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: T.surface,
                    border: `1.5px solid ${nukeConfirm === 'DELETE EVERYTHING' ? T.pink : T.border}`,
                    borderRadius: 10, color: T.text, fontSize: 13,
                    fontFamily: T.mono, outline: 'none',
                    boxShadow: nukeConfirm === 'DELETE EVERYTHING' ? '0 0 20px rgba(255,45,120,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={closeNuke}>Cancel</Btn>
                  <button
                    onClick={executeNuke}
                    disabled={nukeConfirm !== 'DELETE EVERYTHING' || nuking}
                    style={{
                      padding: '9px 18px', borderRadius: 10, border: 'none',
                      background: nukeConfirm === 'DELETE EVERYTHING' ? T.pink : T.faint,
                      color: nukeConfirm === 'DELETE EVERYTHING' ? '#fff' : T.muted,
                      fontSize: 12, fontWeight: 700, cursor: nukeConfirm === 'DELETE EVERYTHING' ? 'pointer' : 'not-allowed',
                      fontFamily: T.font, transition: 'all 0.2s',
                      boxShadow: nukeConfirm === 'DELETE EVERYTHING' ? '0 0 24px rgba(255,45,120,0.5)' : 'none',
                    }}
                  >
                    {nuking ? '☢ Nuking...' : '☢ EXECUTE NUKE'}
                  </button>
                </div>
              </>
            )}

            {nukeStep === 4 && nukeResult && (
              <>
                {nukeResult.success ? (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.lime, marginBottom: 8 }}>Database Nuked</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono, marginBottom: 12 }}>Batch: {nukeResult.batch}</div>
                    {Object.entries(nukeResult.summary).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 12, color: T.muted }}>{k}: {v} records archived</div>
                    ))}
                    <div style={{ marginTop: 16 }}>
                      <Btn onClick={closeNuke}>Close</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: T.pink, marginBottom: 12 }}>✕ {nukeResult.error}</div>
                    <Btn variant="ghost" onClick={closeNuke}>Close</Btn>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
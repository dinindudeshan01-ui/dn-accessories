// src/pages/admin/AdminAuditLog.jsx

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard, Card, Table, Tr, Td,
  Spinner, Empty, Select, Input, ExpandedRow, DiffPanel, tokens as T
} from '../../components/admin/AdminUI'

const ACTION_COLORS = {
  CREATE: { bg:'rgba(184,255,60,0.12)',  color:'#b8ff3c' },
  UPDATE: { bg:'rgba(0,229,255,0.10)',   color:'#00e5ff' },
  DELETE: { bg:'rgba(255,45,120,0.12)',  color:'#ff2d78' },
  RESET:  { bg:'rgba(255,197,61,0.12)', color:'#ffc53d' },
  LOGIN:  { bg:'rgba(162,89,255,0.12)', color:'#a259ff' },
}

export default function AdminAuditLog() {
  const [logs, setLogs]         = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filters, setFilters]   = useState({ entity:'', action:'', search:'', limit:'100' })

  useEffect(() => { loadStats() }, [])
  useEffect(() => { loadLogs() }, [filters])

  async function loadStats() {
    try { const res = await adminApi.get('/system/audit/stats'); setStats(res.data) } catch {}
  }

  async function loadLogs() {
    setLoading(true)
    try {
      const params = {}
      if (filters.entity) params.entity = filters.entity
      if (filters.action) params.action = filters.action
      if (filters.search) params.search = filters.search
      params.limit = filters.limit
      const res = await adminApi.get('/system/audit', { params })
      setLogs(res.data)
    } finally { setLoading(false) }
  }

  function setFilter(key, val) { setFilters(f => ({...f, [key]:val})) }

  function formatTime(ts) {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' ' +
           d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
  }

  return (
    <>
      <PageHeader
        title="Audit Trail"
        subtitle="Tamper-proof admin log"
        action={<span style={{ fontSize:11, color:T.muted }}>{logs.length} records</span>}
      />
      <PageContent>

        {stats && (
          <KpiGrid>
            <KpiCard label="Total Events" value={stats.total} />
            <KpiCard label="Last 7 Days"  value={stats.recent7} />
            <KpiCard label="Creates"      value={stats.byAction?.find(a => a.action==='CREATE')?.count || 0} />
            <KpiCard label="Deletes"      value={stats.byAction?.find(a => a.action==='DELETE')?.count || 0} />
          </KpiGrid>
        )}

        <Card style={{ marginBottom:16, padding:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr auto', gap:12, alignItems:'flex-end' }}>
            <Select label="Entity" value={filters.entity} onChange={e => setFilter('entity', e.target.value)}>
              <option value="">All Entities</option>
              {['product','order','expense','supplier','cogs','theme','system'].map(e => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>
              ))}
            </Select>
            <Select label="Action" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
              <option value="">All Actions</option>
              {['CREATE','UPDATE','DELETE','RESET','LOGIN'].map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Input label="Search" value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Search description..." />
            <Select label="Limit" value={filters.limit} onChange={e => setFilter('limit', e.target.value)}>
              {['50','100','250','500'].map(l => <option key={l} value={l}>{l} rows</option>)}
            </Select>
          </div>
        </Card>

        <Card>
          {loading ? <Spinner /> : logs.length === 0 ? <Empty message="No audit events found" /> : (
            <Table headers={['Time','Admin','Action','Entity','Description','']}>
              {logs.map(log => {
                const ac = ACTION_COLORS[log.action] || ACTION_COLORS.UPDATE
                const isExpanded = expanded === log.id
                return (
                  <>
                    <Tr key={log.id} onClick={() => setExpanded(isExpanded ? null : log.id)}>
                      <Td muted style={{ fontSize:11, whiteSpace:'nowrap' }}>{formatTime(log.created_at)}</Td>
                      <Td style={{ fontSize:12 }}>{log.admin_email}</Td>
                      <Td>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, letterSpacing:'0.08em', background:ac.bg, color:ac.color }}>
                          {log.action}
                        </span>
                      </Td>
                      <Td muted style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        {log.entity}{log.entity_id ? <span style={{ color:T.text }}> #{log.entity_id}</span> : ''}
                      </Td>
                      <Td style={{ fontSize:12, maxWidth:300 }}>{log.description}</Td>
                      <Td muted style={{ fontSize:11 }}>{(log.old_value || log.new_value) ? (isExpanded ? '▲' : '▼') : ''}</Td>
                    </Tr>
                    {isExpanded && (log.old_value || log.new_value) && (
                      <ExpandedRow key={`${log.id}-exp`} colSpan={6}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, paddingTop:12 }}>
                          {log.old_value && (
                            <DiffPanel label="BEFORE" type="before" data={JSON.stringify(JSON.parse(log.old_value), null, 2)} />
                          )}
                          {log.new_value && (
                            <DiffPanel label="AFTER" type="after" data={JSON.stringify(JSON.parse(log.new_value), null, 2)} />
                          )}
                        </div>
                      </ExpandedRow>
                    )}
                  </>
                )
              })}
            </Table>
          )}
        </Card>

      </PageContent>
    </>
  )
}
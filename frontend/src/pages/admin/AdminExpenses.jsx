// src/pages/admin/AdminExpenses.jsx

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, Card, CardHeader, Table, Tr, Td,
  Btn, Input, Select, Spinner, CatPill, tokens as T
} from '../../components/admin/AdminUI'

const EXPENSE_CATS = ['COGS / Materials','Marketing','Delivery / Shipping','Platform Fees','Packaging','Other']

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [month, setMonth]       = useState(new Date().toISOString().slice(0,7))
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ description:'', category:'Marketing', amount:'', date:new Date().toISOString().split('T')[0] })

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    try { const res = await adminApi.get('/finance/expenses', { params:{ month } }); setExpenses(res.data) }
    finally { setLoading(false) }
  }

  async function addExpense() {
    if (!form.description || !form.amount) return
    setSaving(true)
    try {
      await adminApi.post('/finance/expenses', form)
      setForm(f => ({...f, description:'', amount:''}))
      await load()
    } finally { setSaving(false) }
  }

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    await adminApi.delete(`/finance/expenses/Rs {id}`); await load()
  }

  const total  = expenses.reduce((s,e) => s + e.amount, 0)
  const months = Array.from({length:12},(_,i) => { const d=new Date(); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7) })

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Track outgoing costs"
        action={
          <Select value={month} onChange={e => setMonth(e.target.value)} style={{ width:'auto', padding:'7px 12px', fontSize:12 }}>
            {months.map(m => <option key={m} value={m}>{new Date(m+'-01').toLocaleDateString('en-US',{year:'numeric',month:'long'})}</option>)}
          </Select>
        }
      />
      <PageContent>

        <Card style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:T.muted, textTransform:'uppercase', marginBottom:14 }}>
            Add Expense
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:12, alignItems:'flex-end' }}>
            <Input label="Description" value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="e.g. Supplier payment" />
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))}>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="Amount (Rs)" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount:e.target.value}))} placeholder="0.00" />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({...f, date:e.target.value}))} />
            <Btn onClick={addExpense} disabled={saving} style={{ alignSelf:'flex-end', whiteSpace:'nowrap' }}>
              {saving ? 'Adding...' : '+ Add'}
            </Btn>
          </div>
        </Card>

        <Card>
          <CardHeader title={`Rs {expenses.length} expenses — Total: LKR Rs {total.toLocaleString()}`} />
          {loading ? <Spinner /> : (
            <Table headers={['Date','Description','Category','Amount','']}>
              {expenses.length === 0
                ? <tr><td colSpan={5} style={{ padding:'40px 0', textAlign:'center', color:T.muted, fontSize:13 }}>No expenses this month</td></tr>
                : expenses.map(e => (
                  <Tr key={e.id}>
                    <Td muted>{e.date}</Td>
                    <Td>{e.description}</Td>
                    <Td><CatPill label={e.category} /></Td>
                    <Td style={{ color:T.pink, fontWeight:700 }}>-Rs {e.amount.toFixed(2)}</Td>
                    <Td><Btn size="sm" variant="danger" onClick={() => deleteExpense(e.id)}>×</Btn></Td>
                  </Tr>
                ))}
            </Table>
          )}
        </Card>

      </PageContent>
    </>
  )
}
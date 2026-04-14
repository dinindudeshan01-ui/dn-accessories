import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, Card, Table, Tr, Td,
  Btn, Input, Select, Spinner, Empty, Modal, ModalFooter,
  KpiGrid, KpiCard, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminRecipes() {
  const [products,   setProducts]   = useState([])
  const [materials,  setMaterials]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)  // product being edited
  const [recipe,     setRecipe]     = useState([])    // current recipe lines
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [pr, mr] = await Promise.all([
        adminApi.get('/recipes'),
        adminApi.get('/materials'),
      ])
      setProducts(pr.data)
      setMaterials(mr.data)
    } finally { setLoading(false) }
  }

  async function openRecipe(product) {
    setSelected(product)
    try {
      const res = await adminApi.get(`/recipes/${product.id}`)
      setRecipe(res.data.materials.map(m => ({
        material_id: m.material_id,
        qty_needed: m.qty_needed,
      })))
    } catch {
      setRecipe([])
    }
  }

  function addLine() {
    setRecipe(r => [...r, { material_id: '', qty_needed: '' }])
  }

  function removeLine(i) {
    setRecipe(r => r.filter((_, idx) => idx !== i))
  }

  function updateLine(i, key, val) {
    setRecipe(r => r.map((line, idx) => idx === i ? { ...line, [key]: val } : line))
  }

  async function saveRecipe() {
    if (!selected) return
    setSaving(true)
    try {
      await adminApi.put(`/recipes/${selected.id}`, { materials: recipe })
      await load()
      setSelected(null)
      setRecipe([])
    } finally { setSaving(false) }
  }

  // Calculate cost preview from current recipe lines
  function calcPreviewCost() {
    return recipe.reduce((sum, line) => {
      const mat = materials.find(m => m.id === parseInt(line.material_id))
      if (!mat || !line.qty_needed) return sum
      return sum + (parseFloat(line.qty_needed) * mat.avg_cost)
    }, 0)
  }

  const totalProducts    = products.length
  const withRecipe       = products.filter(p => p.material_count > 0).length
  const avgMargin        = products.filter(p => p.price > 0 && p.recipe_cost > 0)
    .reduce((s, p) => s + ((p.price - p.recipe_cost) / p.price) * 100, 0) /
    (products.filter(p => p.price > 0 && p.recipe_cost > 0).length || 1)

  return (
    <>
      <PageHeader title="Recipes" subtitle="Bill of Materials per product" />
      <PageContent>

        <KpiGrid>
          <KpiCard label="Total Products"   value={totalProducts} />
          <KpiCard label="With Recipe"      value={withRecipe} />
          <KpiCard label="Without Recipe"   value={totalProducts - withRecipe} />
          <KpiCard label="Avg Margin"       value={`${avgMargin.toFixed(0)}%`} changeUp={avgMargin > 0} />
        </KpiGrid>

        {loading ? <Spinner /> : (
          <Card>
            <Table headers={['Product', 'Category', 'Sale Price', 'Recipe Cost', 'Margin', 'Materials', '']}>
              {products.length === 0
                ? <tr><td colSpan={7}><Empty message="No products found" /></td></tr>
                : products.map(p => {
                  const margin = p.price > 0 && p.recipe_cost > 0
                    ? ((p.price - p.recipe_cost) / p.price * 100).toFixed(0)
                    : null
                  const marginColor = margin === null ? T.muted : margin > 40 ? '#b8ff3c' : margin > 20 ? '#ffc53d' : '#ff2d78'
                  return (
                    <Tr key={p.id}>
                      <Td style={{ fontWeight:600, color:T.text }}>{p.name}</Td>
                      <Td muted style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em' }}>{p.category}</Td>
                      <Td pink>Rs {Number(p.price).toFixed(2)}</Td>
                      <Td muted>{p.recipe_cost > 0 ? `Rs ${Number(p.recipe_cost).toFixed(2)}` : '—'}</Td>
                      <Td>
                        {margin !== null
                          ? <span style={{ fontSize:12, fontWeight:700, color:marginColor }}>{margin}%</span>
                          : <span style={{ fontSize:11, color:T.muted }}>No recipe</span>
                        }
                      </Td>
                      <Td muted>{p.material_count > 0 ? `${p.material_count} materials` : '—'}</Td>
                      <Td>
                        <Btn size="sm" variant="ghost" onClick={() => openRecipe(p)}>
                          {p.material_count > 0 ? 'Edit' : 'Add Recipe'}
                        </Btn>
                      </Td>
                    </Tr>
                  )
                })}
            </Table>
          </Card>
        )}
      </PageContent>

      {selected && (
        <Modal title={`Recipe — ${selected.name}`} onClose={() => { setSelected(null); setRecipe([]) }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Cost preview */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(255,45,120,0.06)', border:'1px solid rgba(255,45,120,0.15)', borderRadius:10 }}>
              <span style={{ fontSize:12, color:T.muted }}>Estimated Cost Price</span>
              <span style={{ fontSize:16, fontWeight:900, color:T.pink }}>Rs {calcPreviewCost().toFixed(2)}</span>
            </div>

            {/* Recipe lines */}
            {recipe.length === 0 && (
              <div style={{ fontSize:13, color:T.muted, textAlign:'center', padding:'16px 0' }}>
                No materials yet — add one below
              </div>
            )}

            {recipe.map((line, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 120px 36px', gap:8, alignItems:'flex-end' }}>
                <Select
                  label={i === 0 ? 'Material' : undefined}
                  value={line.material_id}
                  onChange={e => updateLine(i, 'material_id', e.target.value)}
                >
                  <option value="">-- Select Material --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit}) — avg Rs {Number(m.avg_cost).toFixed(2)}
                    </option>
                  ))}
                </Select>
                <Input
                  label={i === 0 ? 'Qty' : undefined}
                  type="number"
                  step="0.01"
                  value={line.qty_needed}
                  onChange={e => updateLine(i, 'qty_needed', e.target.value)}
                  placeholder="0"
                />
                <button
                  onClick={() => removeLine(i)}
                  style={{ height:38, width:36, background:'rgba(255,45,120,0.1)', border:'1px solid rgba(255,45,120,0.2)', borderRadius:8, color:T.pink, cursor:'pointer', fontSize:16, marginBottom:1 }}
                >×</button>
              </div>
            ))}

            <Btn variant="ghost" size="sm" onClick={addLine}>+ Add Material</Btn>
          </div>
          <ModalFooter onClose={() => { setSelected(null); setRecipe([]) }} onSave={saveRecipe} saving={saving} saveLabel="Save Recipe" />
        </Modal>
      )}
    </>
  )
}
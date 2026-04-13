import { PageHeader, PageContent } from '../../components/admin/AdminUI'
const T = { faint:'#13131f', border:'rgba(255,255,255,0.07)', pink:'#ff2d78', muted:'#6b6b85', text:'#f0f0f8', gold:'#ffc53d', cyan:'#00e5ff', lime:'#b8ff3c' }
const meta = {
  AdminRecipes:          { icon:'◎', title:'Recipes',          subtitle:'Bill of Materials per product',      features:['Set materials and quantities per product','Auto cost price from recipe + avg material cost','COGS logged automatically when order is paid','Material stock deducted on every paid sale','See real profitability per product'] },
  AdminCustomers:        { icon:'◉', title:'Customers',         subtitle:'Customer profiles from orders',      features:['Auto-built from order history','Total orders and lifetime spend per customer','Full order history per customer','Quick contact — phone and address in one view','Repeat customer identification'] },
  AdminInventoryReport:  { icon:'▤', title:'Inventory Report',  subtitle:'Stock valuation and movement',       features:['Finished product stock with cost value','Raw material stock with avg cost valuation','Total inventory value at a glance','Stock movement history — in and out','Low stock and out of stock in one view'] },
}['AdminCustomers']
export default function AdminCustomers() {
  return (
    <>
      <PageHeader title={meta.title} subtitle={meta.subtitle} />
      <PageContent>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:40, textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:24, background:'rgba(255,45,120,0.08)', border:'1px solid rgba(255,45,120,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:24 }}>{meta.icon}</div>
          <div style={{ fontSize:24, fontWeight:900, color:T.text, marginBottom:8 }}>{meta.title}</div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:32, maxWidth:400 }}>{meta.subtitle}</div>
          <div style={{ background:T.faint, border:`1px solid ${T.border}`, borderRadius:16, padding:'20px 28px', display:'flex', flexDirection:'column', gap:12, maxWidth:420, width:'100%', textAlign:'left' }}>
            <div style={{ fontSize:10, fontWeight:800, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>What's coming</div>
            {meta.features.map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:13, color:T.text }}>
                <span style={{ color:T.pink, fontSize:11, marginTop:2, flexShrink:0 }}>◆</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:28, padding:'6px 16px', background:'rgba(255,197,61,0.1)', border:'1px solid rgba(255,197,61,0.25)', borderRadius:999, fontSize:11, fontWeight:700, color:T.gold, letterSpacing:'0.06em' }}>⚙ In Development</div>
        </div>
      </PageContent>
    </>
  )
}
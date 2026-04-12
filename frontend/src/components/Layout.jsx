import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'linear-gradient(90deg, #ec4899, #d4a853, #ec4899)',
        backgroundSize: '200%',
        animation: 'shimmer 4s linear infinite',
        color: 'white',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '3px',
        textTransform: 'uppercase'
      }}>
        Welcome to D&amp;N Accessories <span style={{ display:'inline-block', width:6, height:6, background:'#d4a853', borderRadius:'50%', margin:'0 6px', verticalAlign:'middle' }}></span> Meet the Bracelet GOAT
      </div>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
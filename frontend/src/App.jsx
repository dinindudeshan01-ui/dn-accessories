import { Routes, Route } from 'react-router-dom'

// Providers
import { CartProvider }   from './context/CartContext'
import { AdminProvider }  from './context/AdminContext'

// ScrollToTop
import ScrollToTop from './components/ScrollToTop'

// Customer Components & Pages
import Layout       from './components/Layout'
import HomePage     from './pages/HomePage'
import CatalogPage  from './pages/CatalogPage'
import CartPage     from './pages/CartPage'
import ContactPage  from './pages/ContactPage'
import RefundPage   from './pages/RefundPage'
import CheckoutPage from './pages/CheckoutPage'

// Admin Components & Pages
import AdminGuard     from './components/admin/AdminGuard'
import AdminLayout    from './components/admin/AdminLayout'
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts  from './pages/admin/AdminProducts'
import AdminOrders    from './pages/admin/AdminOrders'
import AdminStudio    from './pages/admin/AdminStudio'
import AdminPL        from './pages/admin/AdminPL'
import AdminExpenses  from './pages/admin/AdminExpenses'
import AdminInventory from './pages/admin/AdminInventory'
import AdminSuppliers from './pages/admin/AdminSuppliers'
import AdminAuditLog  from './pages/admin/AdminAuditLog'
import AdminReset     from './pages/admin/AdminReset'

export default function App() {
  return (
    <CartProvider>
      <AdminProvider>
        <ScrollToTop />
        <Routes>
          {/* ── Customer routes ── */}
          <Route path="/" element={<Layout />}>
            <Route index                element={<HomePage />}     />
            <Route path="catalog"       element={<CatalogPage />}  />
            <Route path="cart"          element={<CartPage />}     />
            <Route path="contact"       element={<ContactPage />}  />
            <Route path="refund"        element={<RefundPage />}   />
            <Route path="checkout"      element={<CheckoutPage />} />
          </Route>

          {/* ── Admin login (public) ── */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ── Admin panel (protected) ── */}
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index           element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />}  />
            <Route path="orders"   element={<AdminOrders />}    />
            <Route path="studio"   element={<AdminStudio />}    />
            <Route path="pl"       element={<AdminPL />}        />
            <Route path="expenses" element={<AdminExpenses />}  />
            <Route path="inventory"element={<AdminInventory />} />
            <Route path="suppliers"element={<AdminSuppliers />} />
            <Route path="audit"    element={<AdminAuditLog />}  />
            <Route path="reset"    element={<AdminReset />}     />
          </Route>
        </Routes>
      </AdminProvider>
    </CartProvider>
  )
}
import { Routes, Route } from 'react-router-dom'

// Providers
import { CartProvider }  from './context/CartContext'
import { AdminProvider } from './context/AdminContext'

// ScrollToTop
import ScrollToTop from './components/ScrollToTop'

// Customer pages
import Layout       from './components/Layout'
import HomePage     from './pages/HomePage'
import CatalogPage  from './pages/CatalogPage'
import CartPage     from './pages/CartPage'
import ContactPage  from './pages/ContactPage'
import RefundPage   from './pages/RefundPage'
import CheckoutPage from './pages/CheckoutPage'

// Admin shell
import AdminGuard   from './components/admin/AdminGuard'
import AdminLayout  from './components/admin/AdminLayout'
import AdminLogin   from './pages/admin/AdminLogin'

// ── Sales ─────────────────────────────────────────────────────
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders    from './pages/admin/AdminOrders'
import AdminCustomers from './pages/admin/AdminCustomers'

// ── Inventory ─────────────────────────────────────────────────
import AdminProducts  from './pages/admin/AdminProducts'
import AdminMaterials from './pages/admin/AdminMaterials'
import AdminRecipes   from './pages/admin/AdminRecipes'

// ── Purchases ─────────────────────────────────────────────────
import AdminBills     from './pages/admin/AdminBills'
import AdminSuppliers from './pages/admin/AdminSuppliers'

// ── Expenses ──────────────────────────────────────────────────
import AdminExpenses  from './pages/admin/AdminExpenses'

// ── Reports ───────────────────────────────────────────────────
import AdminPL               from './pages/admin/AdminPL'
import AdminInventoryReport  from './pages/admin/AdminInventoryReport'

// ── System ────────────────────────────────────────────────────
import AdminStudio   from './pages/admin/AdminStudio'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminReset    from './pages/admin/AdminReset'

export default function App() {
  return (
    <CartProvider>
      <AdminProvider>
        <ScrollToTop />
        <Routes>

          {/* ── Customer routes ── */}
          <Route path="/" element={<Layout />}>
            <Route index             element={<HomePage />}     />
            <Route path="catalog"    element={<CatalogPage />}  />
            <Route path="cart"       element={<CartPage />}     />
            <Route path="contact"    element={<ContactPage />}  />
            <Route path="refund"     element={<RefundPage />}   />
            <Route path="checkout"   element={<CheckoutPage />} />
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
            {/* Dashboard */}
            <Route index element={<AdminDashboard />} />

            {/* Sales */}
            <Route path="orders"    element={<AdminOrders />}    />
            <Route path="customers" element={<AdminCustomers />} />

            {/* Inventory */}
            <Route path="products"  element={<AdminProducts />}  />
            <Route path="materials" element={<AdminMaterials />} />
            <Route path="recipes"   element={<AdminRecipes />}   />

            {/* Purchases */}
            <Route path="bills"     element={<AdminBills />}     />
            <Route path="suppliers" element={<AdminSuppliers />} />

            {/* Expenses */}
            <Route path="expenses"  element={<AdminExpenses />}  />

            {/* Reports */}
            <Route path="pl"                element={<AdminPL />}              />
            <Route path="inventory-report"  element={<AdminInventoryReport />} />

            {/* System */}
            <Route path="studio"  element={<AdminStudio />}   />
            <Route path="audit"   element={<AdminAuditLog />} />
            <Route path="reset"   element={<AdminReset />}    />
          </Route>

        </Routes>
      </AdminProvider>
    </CartProvider>
  )
}
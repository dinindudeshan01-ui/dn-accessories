// frontend/src/App.jsx
// UPDATED — added AdminStaff import and route

import { Routes, Route } from 'react-router-dom'
import { CartProvider }  from './context/CartContext'
import { AdminProvider } from './context/AdminContext'
import ScrollToTop from './components/ScrollToTop'
import Layout       from './components/Layout'
import HomePage     from './pages/HomePage'
import CatalogPage  from './pages/CatalogPage'
import CartPage     from './pages/CartPage'
import ContactPage  from './pages/ContactPage'
import RefundPage   from './pages/RefundPage'
import CheckoutPage from './pages/CheckoutPage'
import AdminGuard   from './components/admin/AdminGuard'
import AdminLayout  from './components/admin/AdminLayout'
import AdminLogin   from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders    from './pages/admin/AdminOrders'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminProducts  from './pages/admin/AdminProducts'
import AdminMaterials from './pages/admin/AdminMaterials'
import AdminRecipes   from './pages/admin/AdminRecipes'
import AdminBills     from './pages/admin/AdminBills'
import AdminSuppliers from './pages/admin/AdminSuppliers'
import AdminExpenses  from './pages/admin/AdminExpenses'
import AdminPL              from './pages/admin/AdminPL'
import AdminCashFlow        from './pages/admin/AdminCashFlow'
import AdminInventoryReport from './pages/admin/AdminInventoryReport'
import AdminStudio   from './pages/admin/AdminStudio'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminReset    from './pages/admin/AdminReset'
import AdminSettings from './pages/admin/AdminSettings'
import AdminStaff    from './pages/admin/AdminStaff'   // NEW

export default function App() {
  return (
    <CartProvider>
      <AdminProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index           element={<HomePage />}     />
            <Route path="catalog"  element={<CatalogPage />}  />
            <Route path="cart"     element={<CartPage />}     />
            <Route path="contact"  element={<ContactPage />}  />
            <Route path="refund"   element={<RefundPage />}   />
            <Route path="checkout" element={<CheckoutPage />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders"    element={<AdminOrders />}    />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="products"  element={<AdminProducts />}  />
            <Route path="materials" element={<AdminMaterials />} />
            <Route path="recipes"   element={<AdminRecipes />}   />
            <Route path="bills"     element={<AdminBills />}     />
            <Route path="suppliers" element={<AdminSuppliers />} />
            <Route path="expenses"  element={<AdminExpenses />}  />
            <Route path="pl"               element={<AdminPL />}              />
            <Route path="cashflow"         element={<AdminCashFlow />}        />
            <Route path="inventory-report" element={<AdminInventoryReport />} />
            <Route path="studio"  element={<AdminStudio />}   />
            <Route path="audit"   element={<AdminAuditLog />} />
            <Route path="reset"   element={<AdminReset />}    />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="staff"    element={<AdminStaff />}   />   {/* NEW */}
          </Route>
        </Routes>
      </AdminProvider>
    </CartProvider>
  )
}
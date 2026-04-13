// src/pages/admin/AdminCustomers.jsx
import { PageHeader, PageContent, tokens as T } from '../../components/admin/AdminUI'
export default function AdminCustomers() {
  return (
    <>
      <PageHeader title="Customers" subtitle="Customer list extracted from orders" />
      <PageContent>
        <div style={{ color: T.muted, fontSize: 13, padding: 20 }}>Coming soon — Phase 2</div>
      </PageContent>
    </>
  )
}
// backend/lib/roles.js
// Defines what each role can access across the admin panel

const ROLES = {
  owner:   ['*'],
  manager: ['products', 'orders', 'customers', 'inventory', 'materials', 'recipes', 'suppliers'],
  finance: ['finance', 'expenses', 'bills', 'p_and_l', 'cashflow'],
  packer:  ['orders'],
  viewer:  [],
}

const ROLE_LIST = Object.keys(ROLES)

const ROLE_LABELS = {
  owner:   'Owner',
  manager: 'Manager',
  finance: 'Finance',
  packer:  'Packer',
  viewer:  'Viewer',
}

const ROLE_DESC = {
  owner:   'Full access to everything',
  manager: 'Products, orders, customers, inventory, suppliers',
  finance: 'Finance, expenses, bills, P&L, cash flow only',
  packer:  'Orders page only',
  viewer:  'Read-only — no write access',
}

function canAccess(role, resource) {
  const perms = ROLES[role] || []
  return perms.includes('*') || perms.includes(resource)
}

module.exports = { ROLES, ROLE_LIST, ROLE_LABELS, ROLE_DESC, canAccess }
import { Navigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'

export default function AdminGuard({ children }) {
  const { admin } = useAdmin()
  if (!admin) return <Navigate to="/admin/login" replace />
  return children
}
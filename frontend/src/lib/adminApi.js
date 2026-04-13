import axios from 'axios'

const adminApi = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api/admin` })

adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('dn-admin-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('dn-admin-token')
      localStorage.removeItem('dn-admin-user')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

export default adminApi
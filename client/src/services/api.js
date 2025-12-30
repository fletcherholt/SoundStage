import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Add token from localStorage on init
const token = localStorage.getItem('soundstage_token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('soundstage_token')
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

import axios from 'axios'
import { getBaseUrl } from './config'

const api = axios.create({
  baseURL: `${getBaseUrl()}/api`,
})


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
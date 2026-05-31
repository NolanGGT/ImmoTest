import axios from 'axios'

export const httpClient = axios.create({
  timeout: 8000,
  headers: { Accept: 'application/json' },
})

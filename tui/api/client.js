import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' }
});

export function setToken(token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

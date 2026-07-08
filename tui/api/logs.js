import { api } from './client.js';

export async function getLogs(userId) {
  const path = userId ? `/logs/${userId}` : '/logs';
  const res = await api.get(path);
  return res.data;
}

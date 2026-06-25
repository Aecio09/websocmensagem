import { api } from './client.js';

export async function createUser(data) {
  return api.post('/users', data);
}

export async function findUserByUsername(username) {
  const res = await api.get(`/users/username/${username}`);
  return res.data;
}

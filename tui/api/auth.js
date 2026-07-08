import { api } from './client.js';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export async function login(username, password) {
  const res = await api.post('/login', { username, password });
  const data = res.data;
  const decoded = decodeJwt(data.token);
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    expiration: data.expiration,
    user: decoded
      ? { id: decoded.userId, username: decoded.sub, roles: (decoded.scope || '').split(' ') }
      : null,
  };
}

export async function register(username, password) {
  try {
    await api.post('/register', { username, password });
    return true;
  } catch (err) {
    if (err.response) {
      if (err.response.status === 409) throw new Error('Usuário já existe');
      throw new Error(err.response.data?.message || 'Erro ao registrar');
    }
    throw new Error('Servidor não respondeu');
  }
}

export async function editUser(userId, username, password) {
  const res = await api.put(`/edit-user/${userId}`, { username, password });
  return res.data;
}

export async function deleteUser(userId) {
  await api.delete(`/delete-user/${userId}`);
}

export async function listUsers() {
  const res = await api.get('/users');
  return res.data;
}

export { decodeJwt };

import { api } from './client.js';

export async function login(username, password) {
  try {
    const res = await api.post('/login', { username, password });
    return res.data.token;
  } catch (err) {
    // Propaga o erro com mais detalhes
    if (err.response) {
      throw new Error(`${err.response.status}: ${err.response.data?.message || 'Credenciais inválidas'}`);
    } else if (err.request) {
      throw new Error('Servidor não respondeu - verifique se o backend está rodando');
    } else {
      throw new Error(err.message);
    }
  }
}

export async function register(username, password) {
  try {
    await api.post('/register', { username, password });
    return true;
  } catch (err) {
    if (err.response) {
      if (err.response.status === 409) {
        throw new Error('Usuário já existe');
      }
      throw new Error(`${err.response.status}: ${err.response.data?.message || 'Erro ao registrar'}`);
    } else if (err.request) {
      throw new Error('Servidor não respondeu - verifique se o backend está rodando');
    } else {
      throw new Error(err.message);
    }
  }
}

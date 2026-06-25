import { api } from './client.js';

export async function getMessages() {
  const res = await api.get('/messages');
  return res.data;
}

/**
 * Obtém mensagens com um usuário específico (paginado)
 * @param {number} userId - ID do usuário
 * @param {number} page - Página (default: 0)
 * @param {number} size - Tamanho da página (default: 20)
 * @returns {Promise<Array>} - Lista de mensagens
 */
export async function getMessagesWith(userId, page = 0, size = 20) {
  const res = await api.get(`/messages/${userId}`, {
    params: { page, size }
  });
  // Backend retorna Page do Spring, os dados estão em 'content'
  // Inverte para mostrar mensagens mais antigas primeiro
  return res.data.content ? res.data.content.reverse() : [];
}

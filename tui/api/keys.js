import { api } from './client.js';

/**
 * Registra a chave pública do usuário no servidor
 * @param {string} publicKeyBase64 - Chave pública em Base64
 * @returns {Promise<void>}
 */
export async function registerPublicKey(publicKeyBase64) {
  await api.post('/api/keys/keyregister', { publicKey: publicKeyBase64 });
}

/**
 * Obtém a chave pública de um usuário pelo ID
 * @param {number} userId - ID do usuário
 * @returns {Promise<string>} - Chave pública em Base64
 */
export async function getPublicKey(userId) {
  const res = await api.get(`/api/keys/keyget/${userId}`);
  return res.data.publicKey;
}

// Cache de chaves públicas para evitar requisições repetidas
const publicKeyCache = new Map();

/**
 * Obtém a chave pública de um usuário (com cache)
 * @param {number} userId - ID do usuário
 * @returns {Promise<string>} - Chave pública em Base64
 */
export async function getCachedPublicKey(userId) {
  if (publicKeyCache.has(userId)) {
    return publicKeyCache.get(userId);
  }
  
  const publicKey = await getPublicKey(userId);
  publicKeyCache.set(userId, publicKey);
  return publicKey;
}

/**
 * Limpa o cache de chaves públicas
 */
export function clearPublicKeyCache() {
  publicKeyCache.clear();
}

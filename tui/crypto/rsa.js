import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const KEYS_DIR = path.join(os.homedir(), '.chattui');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'public.pem');

// Garante que o diretório de chaves existe
function ensureKeysDir() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Gera um novo par de chaves RSA 2048 bits
 * @returns {{ publicKey: string, privateKey: string }}
 */
export function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { publicKey, privateKey };
}

/**
 * Salva as chaves no disco
 * @param {string} publicKey 
 * @param {string} privateKey 
 */
export function saveKeys(publicKey, privateKey) {
  ensureKeysDir();
  fs.writeFileSync(PRIVATE_KEY_FILE, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_FILE, publicKey, { mode: 0o644 });
}

/**
 * Carrega as chaves do disco
 * @returns {{ publicKey: string, privateKey: string } | null}
 */
export function loadKeys() {
  try {
    if (fs.existsSync(PRIVATE_KEY_FILE) && fs.existsSync(PUBLIC_KEY_FILE)) {
      return {
        privateKey: fs.readFileSync(PRIVATE_KEY_FILE, 'utf8'),
        publicKey: fs.readFileSync(PUBLIC_KEY_FILE, 'utf8')
      };
    }
  } catch (err) {
    console.error('Erro ao carregar chaves:', err);
  }
  return null;
}

/**
 * Verifica se já existem chaves salvas
 * @returns {boolean}
 */
export function hasKeys() {
  return fs.existsSync(PRIVATE_KEY_FILE) && fs.existsSync(PUBLIC_KEY_FILE);
}

/**
 * Gera ou carrega as chaves existentes
 * @returns {{ publicKey: string, privateKey: string }}
 */
export function getOrCreateKeys() {
  const existing = loadKeys();
  if (existing) {
    return existing;
  }
  const keys = generateKeyPair();
  saveKeys(keys.publicKey, keys.privateKey);
  return keys;
}

/**
 * Converte chave pública PEM para Base64 (formato esperado pelo backend)
 * @param {string} pemKey - Chave pública em formato PEM
 * @returns {string} - Chave em Base64 (sem headers PEM)
 */
export function pemToBase64(pemKey) {
  return pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\n/g, '')
    .trim();
}

/**
 * Converte chave pública Base64 para formato PEM
 * @param {string} base64Key - Chave em Base64
 * @returns {string} - Chave em formato PEM
 */
export function base64ToPem(base64Key) {
  const chunks = base64Key.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join('\n')}\n-----END PUBLIC KEY-----`;
}

/**
 * Criptografa uma mensagem com a chave pública do destinatário
 * @param {string} message - Mensagem em texto plano
 * @param {string} recipientPublicKeyBase64 - Chave pública do destinatário em Base64
 * @returns {string} - Mensagem criptografada em Base64
 */
export function encryptMessage(message, recipientPublicKeyBase64) {
  try {
    const publicKeyPem = base64ToPem(recipientPublicKeyBase64);
    const buffer = Buffer.from(message, 'utf8');
    
    // RSA-OAEP com SHA-256 para máxima segurança
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    
    return encrypted.toString('base64');
  } catch (err) {
    console.error('Erro ao criptografar:', err);
    throw new Error('Falha ao criptografar mensagem');
  }
}

/**
 * Descriptografa uma mensagem com a chave privada local
 * @param {string} encryptedBase64 - Mensagem criptografada em Base64
 * @param {string} privateKeyPem - Chave privada em formato PEM
 * @returns {string} - Mensagem descriptografada
 */
export function decryptMessage(encryptedBase64, privateKeyPem) {
  try {
    const buffer = Buffer.from(encryptedBase64, 'base64');
    
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Erro ao descriptografar:', err);
    return '[Mensagem criptografada - não foi possível descriptografar]';
  }
}

/**
 * Retorna a chave privada atual
 * @returns {string | null}
 */
export function getPrivateKey() {
  const keys = loadKeys();
  return keys ? keys.privateKey : null;
}

/**
 * Retorna a chave pública atual em Base64
 * @returns {string | null}
 */
export function getPublicKeyBase64() {
  const keys = loadKeys();
  return keys ? pemToBase64(keys.publicKey) : null;
}

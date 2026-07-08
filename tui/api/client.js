import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

let token = null;
let refreshTokenVal = null;
let onLogoutCb = null;

export function setTokens(access, refresh) {
  token = access;
  refreshTokenVal = refresh;
  api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
}

export function getToken() {
  return token;
}

export function getRefreshToken() {
  return refreshTokenVal;
}

export function clearTokens() {
  token = null;
  refreshTokenVal = null;
  delete api.defaults.headers.common['Authorization'];
}

export function setOnLogout(fn) {
  onLogoutCb = fn;
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && refreshTokenVal) {
      original._retry = true;
      try {
        const res = await axios.post('http://localhost:8080/refresh', {
          refreshToken: refreshTokenVal,
        }, { timeout: 10000 });
        const { token: newToken, refreshToken: newRefresh } = res.data;
        setTokens(newToken, newRefresh);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearTokens();
        if (onLogoutCb) onLogoutCb();
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

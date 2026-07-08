import { state } from './State.js';

const routes = {};
let currentCleanup = null;
let currentName = null;

export function register(name, handler) {
  routes[name] = handler;
}

export function navigate(name, ...args) {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  const handler = routes[name];
  if (handler) {
    currentName = name;
    currentCleanup = handler(...args) || (() => {});
  }
  state.set('currentRoute', name);
}

export function getCurrentRoute() {
  return currentName;
}

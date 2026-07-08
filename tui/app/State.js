class AppState {
  constructor() {
    this._state = {
      user: null,
      token: null,
      refreshToken: null,
      conversations: [],
      activeConversationId: null,
      friends: [],
      connectionStatus: 'disconnected',
      notifications: [],
      messages: {},
      settings: {
        e2e: true,
        notifications: true,
      },
    };
    this._listeners = {};
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    const old = this._state[key];
    this._state[key] = value;
    this._notify(key, value, old);
    return this;
  }

  update(key, fn) {
    const old = this._state[key];
    const value = fn(old);
    this._state[key] = value;
    this._notify(key, value, old);
    return this;
  }

  on(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
    return () => {
      this._listeners[key] = this._listeners[key].filter(l => l !== fn);
    };
  }

  _notify(key, value, old) {
    const listeners = this._listeners[key];
    if (listeners) listeners.forEach(fn => fn(value, old));
  }
}

export const state = new AppState();

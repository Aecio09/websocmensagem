import blessed from 'blessed';
import { theme } from '../../app/Theme.js';
import { state } from '../../app/State.js';
import { navigate } from '../../app/Router.js';
import { login, register } from '../../api/auth.js';
import { setTokens, setOnLogout, clearTokens } from '../../api/client.js';
import { registerPublicKey } from '../../api/keys.js';
import { getOrCreateKeys, pemToBase64 } from '../../crypto/rsa.js';
import { showModal } from '../components/Modal.js';

export function loginScreen(screen) {
  screen.children.forEach(c => c.detach());
  screen.history = [];

  const container = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 46,
    height: 16,
    border: theme.border,
    style: {
      border: { fg: theme.style.primary },
      bg: 'black',
    },
    label: ' {bold}websocmensagem{/bold} ',
    tags: true,
    keys: true,
  });

  blessed.text({
    parent: container,
    top: 0,
    left: 2,
    right: 2,
    content: ' {cyan-fg}━━━ entrar ━━━{/cyan-fg}',
    tags: true,
  });

  const usernameInput = blessed.textbox({
    parent: container,
    top: 2,
    left: 2,
    right: 2,
    height: 3,
    border: theme.border,
    label: ' usuario ',
    style: {
      border: { fg: 'gray' },
      focus: { border: { fg: theme.style.primary } },
    },
    inputOnFocus: true,
  });

  const passwordInput = blessed.textbox({
    parent: container,
    top: 6,
    left: 2,
    right: 2,
    height: 3,
    border: theme.border,
    label: ' senha ',
    secret: true,
    style: {
      border: { fg: 'gray' },
      focus: { border: { fg: theme.style.primary } },
    },
    inputOnFocus: true,
  });

  const statusText = blessed.text({
    parent: container,
    top: 10,
    left: 2,
    right: 2,
    height: 1,
    content: '',
    tags: true,
  });

  const loginBtn = blessed.button({
    parent: container,
    top: 11,
    left: 2,
    width: 12,
    height: 1,
    keys: true,
    content: ' [Entrar] ',
    style: {
      fg: theme.style.primary,
      focus: { fg: 'white', bg: theme.style.primary },
    },
  });

  const registerBtn = blessed.button({
    parent: container,
    top: 11,
    left: 16,
    width: 14,
    height: 1,
    keys: true,
    content: ' [Registrar] ',
    style: {
      fg: theme.style.muted,
      focus: { fg: 'white', bg: theme.style.muted },
    },
  });

  function setStatus(msg, color) {
    statusText.setContent(`{${color}-fg}${msg}{/${color}-fg}`);
    screen.render();
  }

  async function handleLogin() {
    const username = usernameInput.getValue().trim();
    const password = passwordInput.getValue().trim();
    if (!username || !password) {
      setStatus('Preencha todos os campos', 'yellow');
      return;
    }
    setStatus('Autenticando...', 'yellow');
    try {
      const result = await login(username, password);
      setTokens(result.token, result.refreshToken);
      state
        .set('token', result.token)
        .set('refreshToken', result.refreshToken)
        .set('user', result.user);

      setOnLogout(() => {
        clearTokens();
        state.set('user', null).set('token', null).set('refreshToken', null);
        navigate('login');
      });

      setStatus('Configurando criptografia...', 'yellow');
      try {
        const keys = getOrCreateKeys();
        const publicKeyBase64 = pemToBase64(keys.publicKey);
        await registerPublicKey(publicKeyBase64);
      } catch {
        // non-critical
      }

      container.detach();
      navigate('main');
    } catch (err) {
      setStatus(`Erro: ${err.message}`, 'red');
    }
  }

  async function handleRegister() {
    navigate('register');
  }

  usernameInput.on('submit', () => { passwordInput.focus(); screen.render(); });
  passwordInput.on('submit', () => { loginBtn.focus(); screen.render(); });
  loginBtn.on('press', handleLogin);
  registerBtn.on('press', handleRegister);

  const loginOrder = [usernameInput, passwordInput, loginBtn, registerBtn];

  function focusLoginIndex(idx) {
    loginOrder[((idx % loginOrder.length) + loginOrder.length) % loginOrder.length].focus();
    screen.render();
  }

  // Registra setas em cada elemento (necessário pq textbox com inputOnFocus
  // engole screen.key). screen.key ainda funciona mas o handler do textbox
  // pode sobrescrever, então registramos em ambos.
  loginOrder.forEach(el => {
    el.key(['down'], () => {
      const idx = loginOrder.findIndex(e => e.focused);
      focusLoginIndex(idx + 1);
    });
    el.key(['up'], () => {
      const idx = loginOrder.findIndex(e => e.focused);
      focusLoginIndex(idx - 1);
    });
    el.key(['tab'], () => {
      const idx = loginOrder.findIndex(e => e.focused);
      focusLoginIndex(idx + 1);
    });
  });

  // Seta lateral entre botoes lado a lado
  [loginBtn, registerBtn].forEach(el => {
    el.key(['right'], () => { registerBtn.focus(); screen.render(); });
    el.key(['left'], () => { loginBtn.focus(); screen.render(); });
  });

  const screenKeys = [];
  function addScreenKey(key, handler) {
    screen.key([key], handler);
    screenKeys.push([key, handler]);
  }
  function removeScreenKeys() {
    screenKeys.forEach(([key, handler]) => screen.unkey(key, handler));
  }

  // Fallback screen-level para quando elemento não tem keys: true
  addScreenKey('down', () => {
    const idx = loginOrder.findIndex(el => el.focused);
    focusLoginIndex(idx + 1);
  });
  addScreenKey('up', () => {
    const idx = loginOrder.findIndex(el => el.focused);
    focusLoginIndex(idx - 1);
  });
  addScreenKey('escape', () => {});

  usernameInput.focus();
  screen.render();

  return () => {
    removeScreenKeys();
    container.detach();
    screen.render();
  };
}

export function registerScreen(screen) {
  screen.children.forEach(c => c.detach());

  const container = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 46,
    height: 18,
    border: theme.border,
    style: {
      border: { fg: theme.style.primary },
      bg: 'black',
    },
    label: ' {bold}criar conta{/bold} ',
    tags: true,
    keys: true,
  });

  const usernameInput = blessed.textbox({
    parent: container,
    top: 1,
    left: 2,
    right: 2,
    height: 3,
    border: theme.border,
    label: ' usuario ',
    style: {
      border: { fg: 'gray' },
      focus: { border: { fg: theme.style.primary } },
    },
    inputOnFocus: true,
  });

  const passwordInput = blessed.textbox({
    parent: container,
    top: 5,
    left: 2,
    right: 2,
    height: 3,
    border: theme.border,
    label: ' senha ',
    secret: true,
    style: {
      border: { fg: 'gray' },
      focus: { border: { fg: theme.style.primary } },
    },
    inputOnFocus: true,
  });

  const confirmInput = blessed.textbox({
    parent: container,
    top: 9,
    left: 2,
    right: 2,
    height: 3,
    border: theme.border,
    label: ' confirmar senha ',
    secret: true,
    style: {
      border: { fg: 'gray' },
      focus: { border: { fg: theme.style.primary } },
    },
    inputOnFocus: true,
  });

  const statusText = blessed.text({
    parent: container,
    top: 13,
    left: 2,
    right: 2,
    height: 1,
    content: '',
    tags: true,
  });

  const registerBtn = blessed.button({
    parent: container,
    top: 14,
    left: 2,
    width: 12,
    height: 1,
    keys: true,
    content: ' [Criar] ',
    style: {
      fg: theme.style.primary,
      focus: { fg: 'white', bg: theme.style.primary },
    },
  });

  const backBtn = blessed.button({
    parent: container,
    top: 14,
    left: 16,
    width: 12,
    height: 1,
    keys: true,
    content: ' [Voltar] ',
    style: {
      fg: theme.style.muted,
      focus: { fg: 'white', bg: theme.style.muted },
    },
  });

  function setStatus(msg, color) {
    statusText.setContent(`{${color}-fg}${msg}{/${color}-fg}`);
    screen.render();
  }

  async function handleRegister() {
    const username = usernameInput.getValue().trim();
    const password = passwordInput.getValue().trim();
    const confirm = confirmInput.getValue().trim();

    if (!username || !password || !confirm) {
      setStatus('Preencha todos os campos', 'yellow');
      return;
    }
    if (password !== confirm) {
      setStatus('Senhas não coincidem', 'yellow');
      return;
    }
    if (password.length < 4) {
      setStatus('Senha muito curta (min. 4 caracteres)', 'yellow');
      return;
    }

    setStatus('Registrando...', 'yellow');
    try {
      await register(username, password);
      container.detach();
      navigate('login');
    } catch (err) {
      setStatus(`Erro: ${err.message}`, 'red');
    }
  }

  usernameInput.on('submit', () => { passwordInput.focus(); screen.render(); });
  passwordInput.on('submit', () => { confirmInput.focus(); screen.render(); });
  confirmInput.on('submit', () => { registerBtn.focus(); screen.render(); });
  registerBtn.on('press', handleRegister);
  backBtn.on('press', () => { container.detach(); navigate('login'); });

  const registerOrder = [usernameInput, passwordInput, confirmInput, registerBtn, backBtn];

  function focusRegisterIndex(idx) {
    registerOrder[((idx % registerOrder.length) + registerOrder.length) % registerOrder.length].focus();
    screen.render();
  }

  registerOrder.forEach(el => {
    el.key(['down'], () => {
      const idx = registerOrder.findIndex(e => e.focused);
      focusRegisterIndex(idx + 1);
    });
    el.key(['up'], () => {
      const idx = registerOrder.findIndex(e => e.focused);
      focusRegisterIndex(idx - 1);
    });
    el.key(['tab'], () => {
      const idx = registerOrder.findIndex(e => e.focused);
      focusRegisterIndex(idx + 1);
    });
  });

  // Seta lateral entre botoes lado a lado
  [registerBtn, backBtn].forEach(el => {
    el.key(['right'], () => { backBtn.focus(); screen.render(); });
    el.key(['left'], () => { registerBtn.focus(); screen.render(); });
  });

  const screenKeys = [];
  function addScreenKey(key, handler) {
    screen.key([key], handler);
    screenKeys.push([key, handler]);
  }
  function removeScreenKeys() {
    screenKeys.forEach(([key, handler]) => screen.unkey(key, handler));
  }

  addScreenKey('down', () => {
    const idx = registerOrder.findIndex(e => e.focused);
    focusRegisterIndex(idx + 1);
  });
  addScreenKey('up', () => {
    const idx = registerOrder.findIndex(e => e.focused);
    focusRegisterIndex(idx - 1);
  });
  addScreenKey('escape', () => { container.detach(); navigate('login'); });

  usernameInput.focus();
  screen.render();

  return () => {
    removeScreenKeys();
    container.detach();
    screen.render();
  };
}

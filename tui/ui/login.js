import blessed from 'blessed';
import { login, register } from '../api/auth.js';
import { setToken } from '../api/client.js';
import { registerPublicKey } from '../api/keys.js';
import { getOrCreateKeys, pemToBase64 } from '../crypto/rsa.js';
import { menuScreen } from './menu.js';

export function loginScreen(screen) {
  const box = blessed.form({
    parent: screen,
    width: 50,
    height: 14,
    top: 'center',
    left: 'center',
    border: 'line',
    label: ' Login ',
    keys: true
  });

  const user = blessed.textbox({
    parent: box,
    top: 1,
    left: 2,
    width: '90%',
    height: 3,
    label: 'Username',
    border: 'line',
    inputOnFocus: true
  });

  const pass = blessed.textbox({
    parent: box,
    top: 5,
    left: 2,
    width: '90%',
    height: 3,
    secret: true,
    label: 'Password',
    border: 'line',
    inputOnFocus: true
  });

  const registerBtn = blessed.button({
    parent: box,
    bottom: 1,
    right: 2,
    width: 14,
    height: 1,
    content: '[R] Registrar',
    style: {
      fg: 'cyan',
      focus: { fg: 'white', bg: 'blue' }
    }
  });

  const msg = blessed.text({
    parent: box,
    bottom: 1,
    left: 2,
    width: '50%',
    fg: 'red'
  });

  // Tecla R para ir para tela de registro
  screen.key(['r'], () => {
    box.destroy();
    registerScreen(screen);
  });

  registerBtn.on('press', () => {
    box.destroy();
    registerScreen(screen);
  });

  // Quando terminar de digitar username, vai para password
  user.on('submit', () => {
    pass.focus();
  });

  // Quando terminar de digitar password, faz o login
  pass.on('submit', async () => {
    try {
      const username = user.getValue();
      const password = pass.getValue();
      
      if (!username || !password) {
        msg.setContent('Preencha todos os campos');
        screen.render();
        return;
      }
      
      msg.setContent('Autenticando...');
      msg.style.fg = 'yellow';
      screen.render();
      
      const token = await login(username, password);
      setToken(token);
      
      // Gera/carrega chaves E2E e registra no servidor
      msg.setContent('Configurando criptografia E2E...');
      screen.render();
      
      try {
        const keys = getOrCreateKeys();
        const publicKeyBase64 = pemToBase64(keys.publicKey);
        await registerPublicKey(publicKeyBase64);
      } catch (e2eErr) {
        // Continua mesmo se falhar o registro da chave (usuário pode já ter registrado)
        console.error('Aviso E2E:', e2eErr.message);
      }
      
      box.destroy();
      menuScreen(screen, token);
    } catch (err) {
      // Mostrar erro mais detalhado para debug
      msg.style.fg = 'red';
      msg.setContent(`Erro: ${err.message || 'Login inválido'}`);
      screen.render();
    }
  });

  user.focus();
  screen.render();
}

function registerScreen(screen) {
  const box = blessed.form({
    parent: screen,
    width: 50,
    height: 16,
    top: 'center',
    left: 'center',
    border: 'line',
    label: ' Criar Conta ',
    keys: true
  });

  const user = blessed.textbox({
    parent: box,
    top: 1,
    left: 2,
    width: '90%',
    height: 3,
    label: 'Username',
    border: 'line',
    inputOnFocus: true
  });

  const pass = blessed.textbox({
    parent: box,
    top: 5,
    left: 2,
    width: '90%',
    height: 3,
    secret: true,
    label: 'Password',
    border: 'line',
    inputOnFocus: true
  });

  const confirmPass = blessed.textbox({
    parent: box,
    top: 9,
    left: 2,
    width: '90%',
    height: 3,
    secret: true,
    label: 'Confirmar Password',
    border: 'line',
    inputOnFocus: true
  });

  const msg = blessed.text({
    parent: box,
    bottom: 1,
    left: 2,
    fg: 'red'
  });

  // ESC para voltar ao login
  screen.key(['escape'], () => {
    box.destroy();
    loginScreen(screen);
  });

  // Navegação entre campos
  user.on('submit', () => {
    pass.focus();
  });

  pass.on('submit', () => {
    confirmPass.focus();
  });

  // Quando terminar de confirmar password, tenta registrar
  confirmPass.on('submit', async () => {
    try {
      const username = user.getValue();
      const password = pass.getValue();
      const confirm = confirmPass.getValue();

      if (!username || !password || !confirm) {
        msg.setContent('Preencha todos os campos');
        screen.render();
        return;
      }

      if (password !== confirm) {
        msg.style.fg = 'red';
        msg.setContent('Senhas não coincidem');
        screen.render();
        return;
      }

      if (password.length < 4) {
        msg.style.fg = 'red';
        msg.setContent('Senha muito curta (min. 4 caracteres)');
        screen.render();
        return;
      }

      msg.setContent('Registrando...');
      msg.style.fg = 'yellow';
      screen.render();

      await register(username, password);

      msg.style.fg = 'green';
      msg.setContent('Conta criada! Redirecionando...');
      screen.render();

      // Aguarda 1 segundo e volta para o login
      setTimeout(() => {
        box.destroy();
        loginScreen(screen);
      }, 1000);

    } catch (err) {
      msg.style.fg = 'red';
      msg.setContent(`Erro: ${err.message || 'Falha ao registrar'}`);
      screen.render();
    }
  });

  user.focus();
  screen.render();
}

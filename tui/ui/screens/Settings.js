import blessed from 'blessed';
import { theme } from '../../app/Theme.js';
import { state } from '../../app/State.js';
import { navigate } from '../../app/Router.js';
import { editUser, deleteUser } from '../../api/auth.js';
import { clearTokens } from '../../api/client.js';
import { showModal } from '../components/Modal.js';

export function settingsScreen(screen) {
  screen.children.forEach(c => c.detach());
  screen.history = [];

  const container = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 52,
    height: 18,
    border: theme.border,
    style: {
      border: { fg: theme.style.primary },
      bg: 'black',
    },
    label: ' {bold}configuracoes{/bold} ',
    tags: true,
    keys: true,
  });

  const user = state.get('user');

  blessed.text({
    parent: container,
    top: 1,
    left: 2,
    right: 2,
    content: ` {cyan-fg}usuario:{/cyan-fg} ${user?.username || '-'}  {cyan-fg}id:{/cyan-fg} ${user?.id || '-'}`,
    tags: true,
  });

  const e2eLabel = blessed.text({
    parent: container,
    top: 3,
    left: 2,
    height: 1,
    content: '',
    tags: true,
  });

  function updateE2ELabel() {
    const enabled = state.get('settings')?.e2e !== false;
    e2eLabel.setContent(
      ` Criptografia E2E: ${enabled ? '{green-fg}ativada{/green-fg}' : '{yellow-fg}desativada{/yellow-fg}'}  [E] Alternar`
    );
    screen.render();
  }
  updateE2ELabel();

  const notifLabel = blessed.text({
    parent: container,
    top: 5,
    left: 2,
    height: 1,
    content: '',
    tags: true,
  });

  function updateNotifLabel() {
    const enabled = state.get('settings')?.notifications !== false;
    notifLabel.setContent(
      ` Notificacoes: ${enabled ? '{green-fg}ativadas{/green-fg}' : '{yellow-fg}desativadas{/yellow-fg}'}  [N] Alternar`
    );
    screen.render();
  }
  updateNotifLabel();

  blessed.text({
    parent: container,
    top: 7,
    left: 2,
    right: 2,
    content: ' {gray-fg}────────────────────────────{/gray-fg}',
    tags: true,
  });

  const editBtn = blessed.button({
    parent: container,
    top: 9,
    left: 2,
    width: 20,
    height: 1,
    keys: true,
    content: ' [U] Editar usuario ',
    style: {
      fg: 'white',
      focus: { fg: 'white', bg: theme.style.primary },
    },
  });

  const deleteBtn = blessed.button({
    parent: container,
    top: 11,
    left: 2,
    width: 20,
    height: 1,
    keys: true,
    content: ' [D] Excluir conta ',
    style: {
      fg: theme.style.error,
      focus: { fg: 'white', bg: theme.style.error },
    },
  });

  const backBtn = blessed.button({
    parent: container,
    bottom: 1,
    left: 2,
    width: 14,
    height: 1,
    keys: true,
    content: ' [Voltar] ',
    style: {
      fg: theme.style.muted,
      focus: { fg: 'white', bg: theme.style.muted },
    },
  });

  const statusText = blessed.text({
    parent: container,
    bottom: 1,
    right: 2,
    height: 1,
    content: '',
    tags: true,
  });

  function setStatus(msg, color) {
    statusText.setContent(`{${color}-fg}${msg}{/${color}-fg}`);
    screen.render();
  }

  function toggleE2E() {
    const settings = state.get('settings') || {};
    settings.e2e = settings.e2e === false;
    state.set('settings', { ...settings });
    updateE2ELabel();
  }

  function toggleNotif() {
    const settings = state.get('settings') || {};
    settings.notifications = settings.notifications === false;
    state.set('settings', { ...settings });
    updateNotifLabel();
  }

  function handleEdit() {
    showModal(screen, {
      title: 'Editar Usuario',
      message: 'Novo nome de usuario:',
      input: true,
      confirmText: 'Proximo',
      cancelText: 'Cancelar',
      onConfirm: (newUsername) => {
        if (!newUsername || !newUsername.trim()) {
          setStatus('Nome de usuario obrigatorio', 'yellow');
          return;
        }
        showModal(screen, {
          title: 'Nova Senha',
          message: 'Nova senha (obrigatorio):',
          input: true,
          secret: true,
          confirmText: 'Salvar',
          cancelText: 'Cancelar',
          onConfirm: async (newPassword) => {
            if (!newPassword || !newPassword.trim()) {
              setStatus('Senha obrigatoria', 'yellow');
              return;
            }
            try {
              setStatus('Atualizando...', 'yellow');
              const userId = state.get('user')?.id;
              await editUser(userId, newUsername.trim(), newPassword.trim());
              state.set('user', { ...state.get('user'), username: newUsername.trim() });
              setStatus('Usuario atualizado!', 'success');
            } catch (err) {
              setStatus(`Erro: ${err.message}`, 'red');
            }
          },
        });
      },
    });
  }

  function handleDelete() {
    showModal(screen, {
      title: 'Excluir Conta',
      message: 'Tem certeza? Esta acao e irreversivel.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          setStatus('Excluindo...', 'yellow');
          const userId = state.get('user')?.id;
          await deleteUser(userId);
          clearTokens();
          state.set('user', null).set('token', null).set('refreshToken', null);
          container.detach();
          navigate('login');
        } catch (err) {
          setStatus(`Erro: ${err.message}`, 'red');
        }
      },
    });
  }

  const settingsOrder = [editBtn, deleteBtn, backBtn];

  function focusSettingsIndex(idx) {
    settingsOrder[((idx % settingsOrder.length) + settingsOrder.length) % settingsOrder.length].focus();
    screen.render();
  }

  settingsOrder.forEach(el => {
    el.key(['down'], () => {
      const idx = settingsOrder.findIndex(e => e.focused);
      focusSettingsIndex(idx + 1);
    });
    el.key(['up'], () => {
      const idx = settingsOrder.findIndex(e => e.focused);
      focusSettingsIndex(idx - 1);
    });
    el.key(['tab'], () => {
      const idx = settingsOrder.findIndex(e => e.focused);
      focusSettingsIndex(idx + 1);
    });
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
    const idx = settingsOrder.findIndex(e => e.focused);
    focusSettingsIndex(idx + 1);
  });
  addScreenKey('up', () => {
    const idx = settingsOrder.findIndex(e => e.focused);
    focusSettingsIndex(idx - 1);
  });

  addScreenKey('e', toggleE2E);
  addScreenKey('n', toggleNotif);
  addScreenKey('u', handleEdit);
  addScreenKey('d', handleDelete);
  addScreenKey('escape', () => { container.detach(); navigate('main'); });

  editBtn.on('press', handleEdit);
  deleteBtn.on('press', handleDelete);
  backBtn.on('press', () => { container.detach(); navigate('main'); });

  backBtn.focus();
  screen.render();

  return () => {
    removeScreenKeys();
    container.detach();
    screen.render();
  };
}

import blessed from 'blessed';
import { theme } from '../../app/Theme.js';
import { state } from '../../app/State.js';

export function createStatusBar(screen) {
  const bar = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: theme.layout.statusBarHeight,
    style: { bg: 'black', fg: 'white' },
    tags: true,
  });

  function render() {
    const user = state.get('user');
    const status = state.get('connectionStatus');
    const statusColor = theme.statusBar[status] || theme.statusBar.disconnected;
    const statusDot = status === 'connected' ? '●' : status === 'connecting' ? '◐' : '○';
    const userLabel = user ? `${user.username}` : 'desconectado';
    const unread = state.get('conversations')
      .reduce((sum, c) => sum + (c.unread || 0), 0);
    const notif = unread > 0 ? ` {yellow-fg}(${unread}){/yellow-fg}` : '';

    bar.setContent(
      ` {bold}websocmensagem{/bold}  │  {${theme.style.label.fg}-fg}${userLabel}{/${theme.style.label.fg}-fg}${notif}  │  {${statusColor.fg}-fg}${statusDot} ${status}{/${statusColor.fg}-fg}`
    );
    screen.render();
  }

  const unsubs = [];
  unsubs.push(state.on('user', render));
  unsubs.push(state.on('connectionStatus', render));
  unsubs.push(state.on('conversations', render));

  render();

  return {
    destroy: () => {
      unsubs.forEach(fn => fn());
      bar.detach();
    },
  };
}

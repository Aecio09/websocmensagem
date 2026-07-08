import blessed from 'blessed';
import { theme } from '../../app/Theme.js';
import { state } from '../../app/State.js';
import { navigate } from '../../app/Router.js';
import { getLogs } from '../../api/logs.js';

export function logsScreen(screen) {
  screen.children.forEach(c => c.detach());
  screen.history = [];

  const container = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 'black' },
    keys: true,
  });

  const logsLog = blessed.log({
    parent: container,
    top: 2,
    left: 1,
    right: 1,
    bottom: 3,
    border: theme.border,
    label: ' logs ',
    scrollable: true,
    scrollbar: {
      ch: '│',
      style: { fg: 'gray' },
    },
    style: {
      border: { fg: 'gray' },
      bg: 'black',
      fg: 'white',
    },
    tags: true,
  });

  const statusText = blessed.text({
    parent: container,
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    content: ' {yellow-fg}Carregando logs...{/yellow-fg}',
    tags: true,
  });

  const backBtn = blessed.button({
    parent: container,
    bottom: 1,
    left: 1,
    width: 14,
    height: 1,
    content: ' [Voltar] ',
    style: {
      fg: theme.style.muted,
      focus: { fg: 'white', bg: theme.style.muted },
    },
  });

  backBtn.on('press', () => { container.detach(); navigate('main'); });

  const logKeys = [
    ['escape', () => { container.detach(); navigate('main'); }],
    ['q', () => { container.detach(); navigate('main'); }],
    ['up', () => { logsLog.scroll(-1); screen.render(); }],
    ['down', () => { logsLog.scroll(1); screen.render(); }],
  ];
  logKeys.forEach(([key, handler]) => screen.key([key], handler));

  const user = state.get('user');

  (async () => {
    try {
      const logs = await getLogs(user?.id);
      statusText.setContent(' {green-fg}Logs carregados{/green-fg}');
      if (!logs || logs.length === 0) {
        logsLog.log('{gray-fg}Nenhum log encontrado.{/gray-fg}');
      } else {
        logs.slice(-100).forEach(log => {
          const time = log.timestamp || log.criado_em_banco || '';
          const from = log.remetenteId || log.sender || '-';
          const to = log.destinatarioId || log.recipient || '-';
          const content = log.conteudo || log.content || '';
          logsLog.log(
            `{gray-fg}[${time.slice(0, 19)}]{/gray-fg} ${from} -> ${to}: ${content}`
          );
        });
      }
    } catch (err) {
      statusText.setContent(`{red-fg}Erro ao carregar logs: ${err.message}{/red-fg}`);
      logsLog.log('{red-fg}Nao foi possivel conectar ao servidor de logs.{/red-fg}');
    }
    screen.render();
  })();

  backBtn.focus();
  screen.render();

  return () => {
    container.detach();
    screen.render();
  };
}

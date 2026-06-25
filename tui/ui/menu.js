import blessed from 'blessed';
import { chatScreen } from './chat.js';

export function menuScreen(screen, token) {
  const list = blessed.list({
    parent: screen,
    label: ' Menu ',
    width: 30,
    height: 10,
    top: 'center',
    left: 'center',
    border: 'line',
    items: ['Chat', 'Sair'],
    keys: true,
    vi: true,
    mouse: true,
    style: {
      selected: {
        bg: 'blue',
        fg: 'white'
      }
    }
  });

  // Teclas W/S para navegar
  list.key(['w', 'up'], () => {
    list.up();
    screen.render();
  });

  list.key(['s', 'down'], () => {
    list.down();
    screen.render();
  });

  // Enter para selecionar
  list.key('enter', () => {
    const i = list.selected;
    if (i === 0) {
      list.destroy();
      chatScreen(screen, token);
    }
    if (i === 1) process.exit(0);
  });

  list.focus();
  screen.render();
}

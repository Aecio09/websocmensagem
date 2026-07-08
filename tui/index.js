import blessed from 'blessed';
import { state } from './app/State.js';
import { register, navigate } from './app/Router.js';
import { loginScreen, registerScreen } from './ui/screens/Login.js';
import { mainScreen } from './ui/screens/Main.js';
import { settingsScreen } from './ui/screens/Settings.js';
import { logsScreen } from './ui/screens/Logs.js';

const screen = blessed.screen({
  smartCSR: true,
  title: 'websocmensagem',
  cursor: {
    artificial: true,
    shape: 'line',
    blink: true,
  },
});

screen.key(['C-c'], () => process.exit(0));

register('login', () => loginScreen(screen));
register('register', () => registerScreen(screen));
register('main', () => mainScreen(screen));
register('settings', () => settingsScreen(screen));
register('logs', () => logsScreen(screen));

navigate('login');

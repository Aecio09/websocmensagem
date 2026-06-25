import blessed from 'blessed';
import { loginScreen } from './ui/login.js';

const screen = blessed.screen({
  smartCSR: true,
  title: 'Chat TUI'
});

screen.key(['q', 'C-c'], () => process.exit(0));

loginScreen(screen);

import blessed from 'blessed';
import { theme } from '../../app/Theme.js';

export function showModal(screen, opts = {}) {
  const {
    title = 'Modal',
    message = '',
    input = false,
    secret = false,
    placeholder = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    height,
  } = opts;

  const msgLines = message ? message.split('\n').length : 0;
  const boxH = height || (input
    ? Math.max(12, msgLines + 7)
    : Math.max(8, msgLines + 4));

  const overlay = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 'black', transparent: true },
    keys: true,
  });

  const box = blessed.box({
    parent: overlay,
    top: 'center',
    left: 'center',
    width: 50,
    height: boxH,
    border: theme.border,
    style: {
      border: { fg: theme.style.primary },
      bg: 'black',
      fg: 'white',
    },
    label: ` ${title} `,
    tags: true,
    keys: true,
    vi: true,
    shadow: true,
  });

  if (message) {
    blessed.text({
      parent: box,
      top: 1,
      left: 2,
      right: 2,
      content: message,
      tags: true,
    });
  }

  let inputField = null;
  if (input) {
    inputField = blessed.textbox({
      parent: box,
      top: msgLines + 1,
      left: 2,
      right: 2,
      height: 3,
      border: theme.border,
      style: {
        border: { fg: 'gray' },
        focus: { border: { fg: theme.style.primary } },
      },
      inputOnFocus: true,
      secret,
      placeholder,
    });
  }

  const buttonY = msgLines + (input ? 5 : 2);

  const confirmBtn = blessed.button({
    parent: box,
    top: buttonY,
    right: 2,
    width: confirmText.length + 4,
    height: 1,
    content: `[${confirmText}]`,
    style: {
      fg: theme.style.primary,
      focus: { fg: 'white', bg: theme.style.primary },
    },
  });

  const cancelBtn = blessed.button({
    parent: box,
    top: buttonY,
    right: confirmText.length + 8,
    width: cancelText.length + 4,
    height: 1,
    content: `[${cancelText}]`,
    style: {
      fg: theme.style.muted,
      focus: { fg: 'white', bg: theme.style.muted },
    },
  });

  function cleanup() {
    if (overlay.parent) {
      overlay.detach();
      screen.render();
    }
  }

  function focusNext() {
    if (inputField && !inputField.focused) {
      inputField.focus();
    } else {
      confirmBtn.focus();
    }
    screen.render();
  }

  const modalOrder = [];
  if (inputField) modalOrder.push(inputField);
  modalOrder.push(confirmBtn, cancelBtn);

  function focusModalIndex(idx) {
    modalOrder[((idx % modalOrder.length) + modalOrder.length) % modalOrder.length].focus();
    screen.render();
  }

  // Element-level key handlers para navegacao (necessario pq textbox
  // com inputOnFocus engole screen.key)
  modalOrder.forEach(el => {
    el.key(['tab'], () => {
      const idx = modalOrder.findIndex(e => e.focused);
      focusModalIndex(idx + 1);
    });
    el.key(['down'], () => {
      const idx = modalOrder.findIndex(e => e.focused);
      focusModalIndex(idx + 1);
    });
    el.key(['up'], () => {
      const idx = modalOrder.findIndex(e => e.focused);
      focusModalIndex(idx - 1);
    });
  });

  // Seta lateral entre botoes
  [confirmBtn, cancelBtn].forEach(el => {
    el.key(['right'], () => { confirmBtn.focus(); screen.render(); });
    el.key(['left'], () => { cancelBtn.focus(); screen.render(); });
  });

  // Screen-level fallback key handlers
  const modalScreenKeys = [
    ['escape', () => { cleanup(); removeModalKeys(); if (onCancel) onCancel(); }],
    ['tab', () => {
      const idx = modalOrder.findIndex(el => el.focused);
      focusModalIndex(idx + 1);
    }],
    ['down', () => {
      const idx = modalOrder.findIndex(el => el.focused);
      focusModalIndex(idx + 1);
    }],
    ['up', () => {
      const idx = modalOrder.findIndex(el => el.focused);
      focusModalIndex(idx - 1);
    }],
  ];
  function removeModalKeys() {
    modalScreenKeys.forEach(([k, h]) => screen.unkey(k, h));
  }
  modalScreenKeys.forEach(([k, h]) => screen.key([k], h));

  confirmBtn.on('press', () => {
    removeModalKeys();
    cleanup();
    if (onConfirm) onConfirm(inputField ? inputField.getValue() : null);
  });

  cancelBtn.on('press', () => {
    removeModalKeys();
    cleanup();
    if (onCancel) onCancel();
  });

  // Enter no inputField foca o Confirmar
  if (inputField) {
    inputField.on('submit', () => { confirmBtn.focus(); screen.render(); });
  }

  focusNext();

  return {
    cleanup,
    getInput: () => inputField ? inputField.getValue() : null,
  };
}

import blessed from 'blessed';
import { theme } from '../../app/Theme.js';
import { state } from '../../app/State.js';
import { navigate } from '../../app/Router.js';
import { connectChat } from '../../socket/chat.js';
import { findUserByUsername } from '../../api/users.js';
import { getMessagesWith } from '../../api/messages.js';
import { listFriends, getPendingRequests, getRelationshipStatus, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest } from '../../api/friends.js';
import { getCachedPublicKey } from '../../api/keys.js';
import { encryptMessage, decryptMessage, getPrivateKey } from '../../crypto/rsa.js';
import { createStatusBar } from '../components/StatusBar.js';
import { showModal } from '../components/Modal.js';
import { renderMarkdown } from '../components/Markdown.js';

const SW = theme.layout.sidebarWidth;

export function mainScreen(screen) {
  screen.children.forEach(c => c.detach());
  screen.history = [];

  const statusBar = createStatusBar(screen);
  const privateKey = getPrivateKey();
  const recipientsPublicKeys = {};

  let ws = null;
  let activeFocus = 'sidebar-conv';
  let pendingIds = [];

  const container = blessed.box({
    parent: screen,
    top: theme.layout.statusBarHeight,
    left: 0,
    right: 0,
    bottom: theme.layout.helpBarHeight,
    style: { bg: 'black' },
    keys: true,
  });

  const sidebar = blessed.box({
    parent: container,
    left: 0,
    top: 0,
    width: SW,
    bottom: 0,
    border: theme.border,
    style: {
      border: { fg: 'gray' },
      bg: 'black',
    },
    keys: true,
    vi: true,
  });

  blessed.text({
    parent: sidebar,
    top: 0,
    left: 1,
    right: 0,
    height: 1,
    content: ' {cyan-fg}conversas{/cyan-fg} ',
    tags: true,
    style: { fg: 'gray' },
  });

  const convList = blessed.list({
    parent: sidebar,
    top: 1,
    left: 0,
    right: 0,
    height: '50%-1',
    keys: true,
    vi: true,
    tags: true,
    style: {
      selected: { bg: theme.style.primary, fg: 'white' },
      item: { fg: 'white' },
    },
  });

  blessed.line({
    parent: sidebar,
    top: '50%-1',
    left: 0,
    right: 0,
    height: 1,
    orientation: 'horizontal',
    type: 'line',
    style: { fg: 'gray' },
  });

  const friendLabel = blessed.text({
    parent: sidebar,
    top: '50%',
    left: 1,
    right: 0,
    height: 1,
    content: ' {cyan-fg}amigos{/cyan-fg} ',
    tags: true,
    style: { fg: 'gray' },
  });

  const friendList = blessed.list({
    parent: sidebar,
    top: '50%+1',
    left: 0,
    right: 0,
    bottom: 0,
    keys: true,
    vi: true,
    tags: true,
    style: {
      selected: { bg: theme.style.primary, fg: 'white' },
      item: { fg: 'white' },
    },
  });

  const chatPanel = blessed.box({
    parent: container,
    left: SW,
    top: 0,
    right: 0,
    bottom: 0,
    style: { bg: 'black' },
  });

  const chatLabel = blessed.text({
    parent: chatPanel,
    top: 0,
    left: 1,
    right: 0,
    height: 1,
    content: ' {gray-fg}selecione uma conversa{/gray-fg}',
    tags: true,
  });

  const chatLog = blessed.log({
    parent: chatPanel,
    top: 1,
    left: 0,
    right: 0,
    bottom: theme.layout.inputHeight,
    border: theme.border,
    scrollable: true,
    scrollbar: {
      ch: '\u2502',
      style: { fg: 'gray' },
    },
    style: {
      border: { fg: 'gray' },
      bg: 'black',
      fg: 'white',
    },
    tags: true,
  });

  const chatInput = blessed.textbox({
    parent: chatPanel,
    bottom: 0,
    left: 0,
    right: 0,
    height: theme.layout.inputHeight,
    border: theme.border,
    style: {
      border: { fg: 'gray' },
      focus: { border: { fg: theme.style.primary } },
      bg: 'black',
    },
  });

  let chatInputReading = false;

  function startChatInput() {
    if (chatInputReading && typeof chatInput._done === 'function') {
      chatInput._done('stop');
    }
    if (chatInput.__listener) {
      chatInput.removeListener('keypress', chatInput.__listener);
      delete chatInput.__listener;
    }
    if (chatInput.__done) {
      chatInput.removeListener('blur', chatInput.__done);
      delete chatInput.__done;
    }
    chatInputReading = false;
    chatInput._reading = false;

    chatInput.focus();
    chatInput.readInput();
    chatInputReading = true;
  }

  function stopChatInput() {
    if (chatInputReading && typeof chatInput._done === 'function') {
      chatInput._done('stop');
    }
    if (chatInput.__listener) {
      chatInput.removeListener('keypress', chatInput.__listener);
      delete chatInput.__listener;
    }
    if (chatInput.__done) {
      chatInput.removeListener('blur', chatInput.__done);
      delete chatInput.__done;
    }
    chatInputReading = false;
    chatInput._reading = false;
    chatInput.screen.program.hideCursor();
    chatInput.screen.grabKeys = false;
  }

  const helpBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: theme.layout.helpBarHeight,
    style: { bg: 'black', fg: 'gray' },
    tags: true,
  });

  function updateHelpBar() {
    helpBar.setContent(
      ' {gray-fg}[F1]{/gray-fg} Amigos  {gray-fg}[F2]{/gray-fg} Buscar  {gray-fg}[F3]{/gray-fg} Config  {gray-fg}[F4]{/gray-fg} Logs  {gray-fg}[F5]{/gray-fg} Solicita\u00e7\u00f5es  {gray-fg}[Tab]{/gray-fg} Navegar  {gray-fg}[Ctrl+Q]{/gray-fg} Sair'
    );
    screen.render();
  }

  function updateFriendLabel() {
    const count = pendingIds.length;
    const suffix = count > 0 ? ` {yellow-fg}(${count} pendente{/yellow-fg}${count > 1 ? 's' : ''})` : '';
    friendLabel.setContent(` {cyan-fg}amigos{/cyan-fg}${suffix}`);
    screen.render();
  }

  function updateConvList() {
    const convs = state.get('conversations') || [];
    convList.setItems(convs.map(c => {
      const unread = c.unread > 0 ? ` {yellow-fg}(${c.unread}){/yellow-fg}` : '';
      const prefix = c.id === state.get('activeConversationId') ? '>' : ' ';
      return `${prefix} ${c.username}${unread}`;
    }));
    screen.render();
  }

  function updateFriendList() {
    const friends = state.get('friends') || [];
    friendList.setItems(friends.map(f => `  ${f.username}`));
    screen.render();
  }

  async function loadConversationMessages(userId) {
    try {
      const msgs = await getMessagesWith(userId);
      state.set('messages', { ...state.get('messages'), [userId]: msgs || [] });
      renderMessages(userId);
    } catch {
      chatLog.log('{red-fg}Erro ao carregar mensagens{/red-fg}');
      screen.render();
    }
  }

  function renderMessages(userId) {
    chatLog.setContent('');
    const msgs = state.get('messages')?.[userId] || [];
    const user = state.get('user');
    msgs.forEach(msg => {
      const isMine = msg.senderId === user?.id || msg.senderUsername === user?.username;
      const sender = isMine ? 'Voc\u00ea' : (msg.senderUsername || 'Desconhecido');
      const rawContent = msg.messageContent || msg.content || '';
      const content = tryDecrypt(rawContent);
      chatLog.log(renderMarkdown(`${sender}: ${content}`));
    });
    chatLog.setScrollPerc(100);
    screen.render();
  }

  function tryDecrypt(content) {
    if (!privateKey || !content || content.length < 50) return content;
    if (/^[A-Za-z0-9+/=]{50,}$/.test(content)) {
      try {
        return decryptMessage(content, privateKey);
      } catch {
        return content;
      }
    }
    return content;
  }

  async function selectConversation(convId) {
    const convs = state.get('conversations') || [];
    const conv = convs.find(c => c.id === convId);
    if (!conv) return;

    state.set('activeConversationId', convId);
    conv.unread = 0;

    chatLabel.setContent(` {cyan-fg}${conv.username}{/cyan-fg}`);
    chatInput.show();
    activeFocus = 'chat-input';
    startChatInput();

    await loadConversationMessages(convId);

    try {
      if (!recipientsPublicKeys[convId]) {
        recipientsPublicKeys[convId] = await getCachedPublicKey(convId);
      }
    } catch {
      recipientsPublicKeys[convId] = null;
    }

    updateConvList();
  }

  async function addConversation(username) {
    try {
      const user = await findUserByUsername(username);
      if (!user) return;
      const convs = state.get('conversations') || [];
      if (convs.some(c => c.id === user.id)) {
        selectConversation(user.id);
        return;
      }
      convs.push({ id: user.id, username: user.username, unread: 0 });
      state.set('conversations', convs);
      updateConvList();
      selectConversation(user.id);
    } catch {
      showModal(screen, {
        title: 'Erro',
        message: 'Usu\u00e1rio n\u00e3o encontrado',
        cancelText: 'Ok',
        onCancel: () => focusSidebar('conv'),
      });
    }
  }

  async function handleSendMessage() {
    const content = chatInput.getValue().trim();
    if (!content) return;

    const convId = state.get('activeConversationId');
    if (!convId) return;

    let messageToSend = content;
    const pubKey = recipientsPublicKeys[convId];
    if (pubKey && state.get('settings')?.e2e !== false) {
      try {
        messageToSend = encryptMessage(content, pubKey);
      } catch {
        chatLog.log('{red-fg}Erro ao criptografar{/red-fg}');
        chatInput.clearValue();
        startChatInput();
        screen.render();
        return;
      }
    }

    if (ws && ws.send(convId, messageToSend)) {
      const user = state.get('user');
      const msgs = state.get('messages')?.[convId] || [];
      msgs.push({
        senderId: user?.id,
        senderUsername: user?.username,
        content,
        messageContent: content,
        createdAt: new Date().toISOString(),
      });
      state.set('messages', { ...state.get('messages'), [convId]: msgs });
      chatLog.log(renderMarkdown(`Voc\u00ea: ${content}`));
      chatLog.setScrollPerc(100);
    } else {
      chatLog.log('{yellow-fg}Aguardando conex\u00e3o...{/yellow-fg}');
    }

    chatInput.clearValue();
    startChatInput();
    screen.render();
  }

  function handleIncomingMessage(msg) {
    const senderId = msg.senderId || msg.sender;
    const senderUsername = msg.senderUsername || msg.sender || 'Desconhecido';
    const rawContent = msg.messageContent || msg.content || msg.message || '';
    const content = tryDecrypt(rawContent);

    const convs = state.get('conversations') || [];
    let conv = convs.find(c => c.id === senderId);
    if (!conv) {
      conv = { id: senderId, username: senderUsername, unread: 1 };
      convs.push(conv);
      state.set('conversations', convs);
      updateConvList();
    }

    const msgs = state.get('messages')?.[senderId] || [];
    msgs.push({ ...msg, content, messageContent: content });
    state.set('messages', { ...state.get('messages'), [senderId]: msgs });

    const activeId = state.get('activeConversationId');
    if (activeId === senderId) {
      chatLog.log(renderMarkdown(`${senderUsername}: ${content}`));
      chatLog.setScrollPerc(100);
    } else {
      conv.unread = (conv.unread || 0) + 1;
      updateConvList();
    }
    screen.render();
  }

  function focusSidebar(target) {
    if (activeFocus === 'chat-input') stopChatInput();
    if (target === 'conv') {
      activeFocus = 'sidebar-conv';
      convList.focus();
    } else {
      activeFocus = 'sidebar-friends';
      friendList.focus();
    }
    screen.render();
  }

  function focusChatInput() {
    const convId = state.get('activeConversationId');
    if (!convId) return;
    activeFocus = 'chat-input';
    startChatInput();
    screen.render();
  }

  async function refreshFriends() {
    const user = state.get('user');
    if (!user) return;
    try {
      const [friends, pending] = await Promise.all([
        listFriends(user.id),
        getPendingRequests(user.id),
      ]);
      state.set('friends', friends || []);
      pendingIds = (pending || []).map(p => p.id);
      updateFriendList();
      updateFriendLabel();
    } catch {
      // silent
    }
  }

  async function searchUser() {
    showModal(screen, {
      title: 'Buscar Usu\u00e1rio',
      message: 'Digite o nome do usu\u00e1rio:',
      input: true,
      confirmText: 'Buscar',
      cancelText: 'Cancelar',
      onConfirm: async (val) => {
        if (!val || !val.trim()) return;
        let found;
        try {
          found = await findUserByUsername(val.trim());
        } catch {
          showModal(screen, {
            title: 'Erro',
            message: 'Usu\u00e1rio n\u00e3o encontrado',
            cancelText: 'Ok',
            onCancel: () => focusSidebar('conv'),
          });
          return;
        }
        const user = state.get('user');
        let status = 'NONE';
        try {
          const statusRes = await getRelationshipStatus(user.id, found.id);
          status = statusRes.status;
        } catch {
          // message-service pode estar offline; assume NONE
        }
        showUserActions(found, status);
      },
      onCancel: () => {
        if (state.get('activeConversationId')) focusChatInput();
        else focusSidebar('conv');
      },
    });
  }

  function showUserActions(found, status) {
    const user = state.get('user');
    const actions = [];
    if (status === 'SELF') {
      showModal(screen, {
        title: 'Usu\u00e1rio',
        message: `{cyan-fg}${found.username}{/cyan-fg}\n\nEste \u00e9 voc\u00ea!`,
        cancelText: 'Voltar',
        onCancel: () => focusSidebar('conv'),
      });
      return;
    }
    if (status === 'NONE') {
      actions.push({ label: 'Adicionar Amigo', action: 'add' });
      actions.push({ label: 'Conversar', action: 'chat' });
    } else if (status === 'FRIENDS') {
      actions.push({ label: 'Conversar', action: 'chat' });
    } else if (status === 'PENDING_SENT') {
      actions.push({ label: 'Cancelar Solicita\u00e7\u00e3o', action: 'cancel' });
      actions.push({ label: 'Conversar', action: 'chat' });
    } else if (status === 'PENDING_RECEIVED') {
      actions.push({ label: 'Aceitar', action: 'accept' });
      actions.push({ label: 'Recusar', action: 'reject' });
      actions.push({ label: 'Conversar', action: 'chat' });
    }
    actions.push({ label: 'Voltar', action: 'back' });

    const actionLabels = actions.map((a, i) => `${i + 1}. ${a.label}`).join('\n');
    showModal(screen, {
      title: found.username,
      message: `{cyan-fg}${found.username}{/cyan-fg}\n\n${actionLabels}\n\nEscolha uma op\u00e7\u00e3o digitando o n\u00famero no chat:`,
      input: true,
      placeholder: 'n\u00famero',
      confirmText: 'Ok',
      cancelText: 'Voltar',
      onConfirm: async (val) => {
        const idx = parseInt(val, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= actions.length) return;
        const chosen = actions[idx];
        switch (chosen.action) {
          case 'add':
            try {
              await sendFriendRequest(user.id, found.id);
              showModal(screen, {
                title: 'Sucesso',
                message: `Solicita\u00e7\u00e3o enviada para ${found.username}`,
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            } catch {
              showModal(screen, {
                title: 'Erro',
                message: 'N\u00e3o foi poss\u00edvel enviar solicita\u00e7\u00e3o',
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            }
            break;
          case 'chat':
            addConversation(found.username);
            break;
          case 'cancel':
            try {
              await cancelFriendRequest(user.id, found.id);
              showModal(screen, {
                title: 'Sucesso',
                message: 'Solicita\u00e7\u00e3o cancelada',
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            } catch {
              showModal(screen, {
                title: 'Erro',
                message: 'N\u00e3o foi poss\u00edvel cancelar',
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            }
            break;
          case 'accept':
            try {
              await acceptFriendRequest(user.id, found.id);
              refreshFriends();
              showModal(screen, {
                title: 'Sucesso',
                message: `Voc\u00ea e ${found.username} s\u00e3o amigos agora!`,
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            } catch {
              showModal(screen, {
                title: 'Erro',
                message: 'N\u00e3o foi poss\u00edvel aceitar',
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            }
            break;
          case 'reject':
            try {
              await rejectFriendRequest(user.id, found.id);
              refreshFriends();
              showModal(screen, {
                title: 'Sucesso',
                message: `Solicita\u00e7\u00e3o de ${found.username} recusada`,
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            } catch {
              showModal(screen, {
                title: 'Erro',
                message: 'N\u00e3o foi poss\u00edvel recusar',
                cancelText: 'Ok',
                onCancel: () => focusSidebar('conv'),
              });
            }
            break;
          case 'back':
            focusSidebar('conv');
            break;
        }
      },
      onCancel: () => focusSidebar('conv'),
    });
  }

  function showPendingRequests() {
    (async () => {
      const user = state.get('user');
      if (!user) return;
      try {
        const pending = await getPendingRequests(user.id);
        if (!pending || pending.length === 0) {
          showModal(screen, {
            title: 'Solicita\u00e7\u00f5es',
            message: 'Nenhuma solicita\u00e7\u00e3o pendente',
            cancelText: 'Ok',
            onCancel: () => focusSidebar('conv'),
          });
          return;
        }
        showPendingList(pending);
      } catch {
        showModal(screen, {
          title: 'Erro',
          message: 'Erro ao carregar solicita\u00e7\u00f5es',
          cancelText: 'Ok',
          onCancel: () => focusSidebar('conv'),
        });
      }
    })();
  }

  function showPendingList(pending) {
    const user = state.get('user');
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
      height: 12,
      border: theme.border,
      style: {
        border: { fg: theme.style.primary },
        bg: 'black',
        fg: 'white',
      },
      label: ' Solicitações Pendentes ',
      keys: true,
      vi: true,
      shadow: true,
    });

    const list = blessed.list({
      parent: box,
      top: 1,
      left: 2,
      right: 2,
      height: 5,
      border: theme.border,
      keys: true,
      vi: true,
      tags: true,
      style: {
        border: { fg: 'gray' },
        selected: { bg: theme.style.primary, fg: 'white' },
        item: { fg: 'white' },
      },
      items: pending.map(p => `  ${p.username}`),
    });

    const btnBox = blessed.box({
      parent: box,
      top: 7,
      left: 2,
      right: 2,
      height: 1,
    });

    const acceptBtn = blessed.button({
      parent: btnBox,
      top: 0,
      left: 2,
      width: 12,
      height: 1,
      content: '[Aceitar]',
      style: {
        fg: 'green',
        focus: { fg: 'white', bg: 'green' },
      },
    });

    const rejectBtn = blessed.button({
      parent: btnBox,
      top: 0,
      left: 17,
      width: 12,
      height: 1,
      content: '[Recusar]',
      style: {
        fg: 'red',
        focus: { fg: 'white', bg: 'red' },
      },
    });

    const closeBtn = blessed.button({
      parent: btnBox,
      top: 0,
      left: 32,
      width: 10,
      height: 1,
      content: '[Voltar]',
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

    function handleAccept() {
      const idx = list.selected;
      const target = pending[idx];
      if (!target) return;
      cleanup();
      (async () => {
        try {
          await acceptFriendRequest(user.id, target.id);
          refreshFriends();
          showModal(screen, {
            title: 'Sucesso',
            message: `Você e ${target.username} são amigos agora!`,
            cancelText: 'Ok',
            onCancel: () => focusSidebar('conv'),
          });
        } catch {
          showModal(screen, {
            title: 'Erro',
            message: 'Não foi possível aceitar',
            cancelText: 'Ok',
            onCancel: () => focusSidebar('conv'),
          });
        }
      })();
    }

    function handleReject() {
      const idx = list.selected;
      const target = pending[idx];
      if (!target) return;
      cleanup();
      (async () => {
        try {
          await rejectFriendRequest(user.id, target.id);
          refreshFriends();
          showModal(screen, {
            title: 'Sucesso',
            message: `Solicitação de ${target.username} recusada`,
            cancelText: 'Ok',
            onCancel: () => focusSidebar('conv'),
          });
        } catch {
          showModal(screen, {
            title: 'Erro',
            message: 'Não foi possível recusar',
            cancelText: 'Ok',
            onCancel: () => focusSidebar('conv'),
          });
        }
      })();
    }

    const focusOrder = [list, acceptBtn, rejectBtn, closeBtn];
    let focusIdx = 0;

    function focusNext() {
      focusIdx = (focusIdx + 1) % focusOrder.length;
      focusOrder[focusIdx].focus();
      screen.render();
    }

    function focusPrev() {
      focusIdx = (focusIdx - 1 + focusOrder.length) % focusOrder.length;
      focusOrder[focusIdx].focus();
      screen.render();
    }

    focusOrder.forEach(el => {
      if (el === list) {
        el.key(['tab'], focusNext);
      } else {
        el.key(['tab', 'down'], focusNext);
        el.key(['up'], focusPrev);
      }
    });

    [acceptBtn, rejectBtn, closeBtn].forEach(el => {
      el.key(['right'], focusNext);
      el.key(['left'], focusPrev);
    });

    acceptBtn.on('press', handleAccept);
    rejectBtn.on('press', handleReject);
    closeBtn.on('press', () => {
      cleanup();
      focusSidebar('conv');
    });

    [acceptBtn, rejectBtn, closeBtn].forEach(el => {
      el.key(['escape'], () => {
        cleanup();
        focusSidebar('conv');
      });
    });
    list.key(['escape'], () => {
      cleanup();
      focusSidebar('conv');
    });

    list.key(['enter'], handleAccept);

    list.focus();
    screen.render();
  }

  // --- WebSocket ---
  const token = state.get('token');
  if (token) {
    state.set('connectionStatus', 'connecting');
    ws = connectChat(
      token,
      handleIncomingMessage,
      () => state.set('connectionStatus', 'connected'),
      () => state.set('connectionStatus', 'disconnected'),
    );
  }

  // --- Load initial data and set periodic refresh ---
  (async () => {
    const user = state.get('user');
    if (user) {
      try {
        const friends = await listFriends(user.id);
        state.set('friends', friends || []);
        const pending = await getPendingRequests(user.id);
        pendingIds = (pending || []).map(p => p.id);
        updateFriendList();
        updateFriendLabel();
      } catch {
        // no friends yet
      }
    }
  })();

  const refreshInterval = setInterval(refreshFriends, 5000);

  // --- Element event handlers ---
  function handleConvSelect(item, idx) {
    const convs = state.get('conversations') || [];
    const conv = convs[idx];
    if (conv) selectConversation(conv.id);
  }
  convList.on('select', handleConvSelect);

  function handleFriendSelect(item, idx) {
    const friends = state.get('friends') || [];
    const friend = friends[idx];
    if (friend) addConversation(friend.username);
  }
  friendList.on('select', handleFriendSelect);

  chatInput.on('submit', handleSendMessage);

  // --- Screen-level key handlers ---
  const screenKeyHandlers = [];
  function addScreenKey(key, handler) {
    screen.key([key], handler);
    screenKeyHandlers.push([key, handler]);
  }
  function removeScreenKeys() {
    screenKeyHandlers.forEach(([key, handler]) => screen.unkey(key, handler));
  }

  addScreenKey('tab', () => {
    if (activeFocus === 'sidebar-conv') focusSidebar('friends');
    else if (activeFocus === 'sidebar-friends') focusChatInput();
    else focusSidebar('conv');
  });
  addScreenKey('S-tab', () => {
    if (activeFocus === 'chat-input') focusSidebar('friends');
    else if (activeFocus === 'sidebar-friends') focusSidebar('conv');
    else if (activeFocus === 'sidebar-conv') focusChatInput();
  });
  addScreenKey('left', () => {
    if (activeFocus === 'sidebar-friends') focusSidebar('conv');
    else if (activeFocus === 'chat-input') focusSidebar('friends');
  });
  addScreenKey('right', () => {
    if (activeFocus === 'sidebar-conv') focusSidebar('friends');
    else if (activeFocus === 'sidebar-friends') focusChatInput();
  });
  addScreenKey('f1', () => {
    focusSidebar('friends');
  });
  addScreenKey('f2', searchUser);
  addScreenKey('f3', () => navigate('settings'));
  addScreenKey('f4', () => navigate('logs'));
  addScreenKey('f5', showPendingRequests);
  addScreenKey('C-q', () => process.exit(0));

  // --- State listeners ---
  const unsubs = [];
  unsubs.push(state.on('conversations', updateConvList));

  // --- Init ---
  updateHelpBar();
  updateConvList();
  focusSidebar('conv');
  screen.render();

  return () => {
    clearInterval(refreshInterval);
    removeScreenKeys();
    if (ws) ws.disconnect();
    unsubs.forEach(fn => fn());
    statusBar.destroy();
    container.detach();
    helpBar.detach();
    screen.render();
  };
}

import blessed from 'blessed';
import { theme } from '../../app/Theme.js';
import { state } from '../../app/State.js';
import { navigate } from '../../app/Router.js';
import { connectChat } from '../../socket/chat.js';
import { findUserByUsername } from '../../api/users.js';
import { getMessagesWith } from '../../api/messages.js';
import { listFriends } from '../../api/friends.js';
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

  blessed.text({
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
    inputOnFocus: true,
  });

  const helpBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: theme.layout.helpBarHeight,
    style: { bg: 'black', fg: 'gray' },
    tags: true,
  });

  helpBar.setContent(
    ' {gray-fg}[F1]{/gray-fg} Conversas/Amigos  {gray-fg}[F2]{/gray-fg} Adicionar  {gray-fg}[F3]{/gray-fg} Config  {gray-fg}[F4]{/gray-fg} Logs  {gray-fg}[Tab]{/gray-fg} Navegar  {gray-fg}[Ctrl+Q]{/gray-fg} Sair'
  );

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
      const sender = isMine ? 'Você' : (msg.senderUsername || 'Desconhecido');
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
    chatInput.focus();
    activeFocus = 'chat-input';

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
        message: 'Usuário não encontrado',
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
        chatInput.focus();
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
      chatLog.log(renderMarkdown(`Você: ${content}`));
      chatLog.setScrollPerc(100);
    } else {
      chatLog.log('{yellow-fg}Aguardando conexão...{/yellow-fg}');
    }

    chatInput.clearValue();
    chatInput.focus();
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
    chatInput.focus();
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

  // --- Load friends ---
  (async () => {
    const user = state.get('user');
    if (user) {
      try {
        const friends = await listFriends(user.id);
        state.set('friends', friends || []);
        updateFriendList();
      } catch {
        // no friends yet
      }
    }
  })();

  // --- Element event handlers ---
  function handleConvSelect(item, idx) {
    const convs = state.get('conversations') || [];
    const conv = convs[idx];
    if (conv) selectConversation(conv.id);
  }
  convList.on('select', handleConvSelect);
  convList.on('action', handleConvSelect);

  function handleFriendSelect(item, idx) {
    const friends = state.get('friends') || [];
    const friend = friends[idx];
    if (friend) addConversation(friend.username);
  }
  friendList.on('select', handleFriendSelect);
  friendList.on('action', handleFriendSelect);

  chatInput.on('submit', handleSendMessage);

  // --- Screen-level key handlers (blessed propaga como 'element key X' pra parents) ---
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
    if (activeFocus === 'sidebar-conv') focusSidebar('friends');
    else focusSidebar('conv');
  });
  addScreenKey('f2', () => {
    showModal(screen, {
      title: 'Adicionar Conversa',
      message: 'Digite o nome do usuário:',
      input: true,
      confirmText: 'Buscar',
      cancelText: 'Cancelar',
      onConfirm: (val) => {
        if (val && val.trim()) addConversation(val.trim());
      },
      onCancel: () => {
        if (state.get('activeConversationId')) focusChatInput();
        else focusSidebar('conv');
      },
    });
  });
  addScreenKey('f3', () => navigate('settings'));
  addScreenKey('f4', () => navigate('logs'));
  addScreenKey('C-q', () => process.exit(0));

  // --- State listeners ---
  const unsubs = [];
  unsubs.push(state.on('conversations', updateConvList));

  // --- Init ---
  updateConvList();
  focusSidebar('conv');
  screen.render();

  return () => {
    removeScreenKeys();
    if (ws) ws.disconnect();
    unsubs.forEach(fn => fn());
    statusBar.destroy();
    container.detach();
    helpBar.detach();
    screen.render();
  };
}

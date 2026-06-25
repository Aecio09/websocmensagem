import blessed from 'blessed';
import { connectChat } from '../socket/chat.js';
import { findUserByUsername } from '../api/users.js';
import { getMessagesWith } from '../api/messages.js';
import { getCachedPublicKey } from '../api/keys.js';
import { encryptMessage, decryptMessage, getPrivateKey } from '../crypto/rsa.js';
import { menuScreen } from './menu.js';

export function chatScreen(screen, token) {
  // Tela de pesquisa de usuário
  searchUserScreen(screen, token);
}

function searchUserScreen(screen, token) {
  const box = blessed.box({
    parent: screen,
    width: 50,
    height: 10,
    top: 'center',
    left: 'center',
    border: 'line',
    label: ' Pesquisar Usuário '
  });

  const searchInput = blessed.textbox({
    parent: box,
    top: 1,
    left: 2,
    width: '90%',
    height: 3,
    border: 'line',
    label: 'Username',
    inputOnFocus: true
  });

  const msg = blessed.text({
    parent: box,
    bottom: 1,
    left: 2,
    fg: 'yellow'
  });

  searchInput.on('submit', async () => {
    const username = searchInput.getValue().trim();
    if (!username) {
      msg.setContent('Digite um username');
      screen.render();
      searchInput.focus();
      return;
    }

    try {
      msg.setContent('Buscando...');
      screen.render();
      
      const user = await findUserByUsername(username);
      box.destroy();
      openChatWithUser(screen, token, user);
    } catch (err) {
      msg.setContent('Usuário não encontrado');
      screen.render();
      searchInput.clearValue();
      searchInput.focus();
    }
  });

  // ESC para voltar ao menu
  screen.key(['escape'], () => {
    box.destroy();
    menuScreen(screen, token);
  });

  searchInput.focus();
  screen.render();
}

function openChatWithUser(screen, token, targetUser) {
  const messages = blessed.log({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '90%',
    border: 'line',
    label: ` Chat com ${targetUser.username} - Conectando... [ESC] Voltar `,
    scrollable: true,
    tags: true
  });

  const input = blessed.textbox({
    parent: screen,
    bottom: 0,
    height: 3,
    width: '100%',
    border: 'line',
    inputOnFocus: true
  });

  let ws = null;
  let recipientPublicKey = null;
  const privateKey = getPrivateKey();

  // Carrega a chave pública do destinatário
  async function loadRecipientPublicKey() {
    try {
      recipientPublicKey = await getCachedPublicKey(targetUser.id);
      messages.log('{green-fg}🔐 Criptografia E2E ativada{/green-fg}');
      screen.render();
    } catch (err) {
      messages.log('{yellow-fg}⚠ Destinatário sem chave E2E - mensagens não criptografadas{/yellow-fg}');
      screen.render();
    }
  }

  // Função para descriptografar mensagem recebida
  function tryDecryptMessage(content) {
    if (!privateKey || !content) return content;
    
    // Verifica se parece ser uma mensagem criptografada (Base64 longo)
    if (content.length > 100 && /^[A-Za-z0-9+/=]+$/.test(content)) {
      try {
        return decryptMessage(content, privateKey);
      } catch (err) {
        // Se falhar a descriptografia, retorna o conteúdo original
        return content;
      }
    }
    return content;
  }

  // Carrega mensagens anteriores
  async function loadPreviousMessages() {
    try {
      const history = await getMessagesWith(targetUser.id);
      if (history && history.length > 0) {
        history.forEach(msg => {
          const sender = msg.senderUsername || msg.sender || 'Desconhecido';
          const rawContent = msg.messageContent || msg.content || '';
          const content = tryDecryptMessage(rawContent);
          messages.log(`${sender}: ${content}`);
        });
        screen.render();
      }
    } catch (err) {
      // Silenciosamente ignora se não conseguir carregar histórico
    }
  }

  // Carrega chave pública antes de carregar mensagens
  loadRecipientPublicKey().then(() => loadPreviousMessages());

  ws = connectChat(
    token, 
    // onMessage
    msg => {
      
      // Tenta diferentes formatos de campo
      const sender = msg.senderUsername || msg.sender || msg.user || 'Desconhecido';
      const rawContent = msg.messageContent || msg.content || msg.message || '';
      
      // Tenta descriptografar a mensagem
      const content = tryDecryptMessage(rawContent);
      
      messages.log(`${sender}: ${content}`);
      screen.render();
    },
    // onConnect
    () => {
      messages.setLabel(` Chat com ${targetUser.username} - Conectado [ESC] Voltar `);
      messages.log('{green-fg}Conectado ao servidor!{/green-fg}');
      screen.render();
    },
    // onError
    (err) => {
      messages.log(`{red-fg}Erro: ${err}{/red-fg}`);
      screen.render();
    }
  );

  // ESC para voltar ao menu
  screen.key(['escape'], () => {
    if (ws) ws.disconnect();
    messages.destroy();
    input.destroy();
    menuScreen(screen, token);
  });

  input.on('submit', () => {
    const content = input.getValue();
    if (content.trim()) {
      let messageToSend = content;
      
      // Criptografa a mensagem se temos a chave pública do destinatário
      if (recipientPublicKey) {
        try {
          messageToSend = encryptMessage(content, recipientPublicKey);
        } catch (err) {
          messages.log('{red-fg}Erro ao criptografar mensagem{/red-fg}');
          input.clearValue();
          input.focus();
          screen.render();
          return;
        }
      }
      
      if (ws.send(targetUser.id, messageToSend)) {
        messages.log(`Você: ${content}`);
      } else {
        messages.log('{red-fg}Aguarde a conexão...{/red-fg}');
      }
    }
    input.clearValue();
    input.focus();
    screen.render();
  });

  input.focus();
  screen.render();
}

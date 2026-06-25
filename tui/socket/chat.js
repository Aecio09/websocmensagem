import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function connectChat(token, onMessage, onConnect, onError) {
  let isConnected = false;

  const client = new Client({
    webSocketFactory: () => new SockJS('http://localhost:8080/ws-message'),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 5000,
    debug: (str) => {
      // Descomente para debug: console.log(str);
    },
    onConnect: () => {
      isConnected = true;
      // Inscreve no canal de mensagens do usuário
      client.subscribe('/user/queue/messages', (message) => {
        onMessage(JSON.parse(message.body));
      });
      if (onConnect) onConnect();
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers['message']);
      if (onError) onError(frame.headers['message']);
    },
    onWebSocketError: (event) => {
      console.error('WebSocket error:', event);
      if (onError) onError('Erro de conexão');
    }
  });

  client.activate();

  // Retorna objeto com método send compatível
  return {
    send: (recipientId, content) => {
      if (!isConnected) {
        console.error('STOMP não conectado ainda');
        return false;
      }
      client.publish({
        destination: '/app/message',
        body: JSON.stringify({ recipientId, content })
      });
      return true;
    },
    isConnected: () => isConnected,
    disconnect: () => client.deactivate()
  };
}

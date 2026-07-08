package com.message_service.service;

import com.message_service.controller.dto.FriendEventDto;
import com.message_service.controller.dto.KafkaDto;
import com.message_service.entity.User;
import com.message_service.repository.UserRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaMessageConsumerService {

    private final UserRepository userRepository;

    public KafkaMessageConsumerService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @KafkaListener(topics = "auth.events", groupId = "message-service-group")
    public void listenAuthEvents(KafkaDto event) {
        System.out.println("Recebido evento de Autenticação para o usuário: " + event.username());
        
        // Verifica se o usuário já existe na base do message-service
        User user = userRepository.findByUsername(event.username());
        if (user == null) {
            // Se não existe, cria um novo a partir dos dados do evento (cache local/sincronização)
            user = new User();
            user.setId(event.id());
            user.setUsername(event.username());
            // Se a entidade User exigir mais campos, como senha, pode setar um valor default vazio, 
            // pois o message-service não valida senhas, apenas o JWT.
            userRepository.save(user);
            System.out.println("Usuário salvo no banco local do message-service.");
        }
    }

    @KafkaListener(topics = "friend.events", groupId = "message-service-group")
    public void listenFriendEvents(FriendEventDto event) {
        System.out.println("Recebido evento de Amizade. Usuário: " + event.userId() + " | Amigo: " + event.friendId());
        // Aqui você implementaria a lógica para atualizar a lista de amigos na memória 
        // ou recarregar as sessões abertas, caso tenha múltiplas instâncias do message-service rodando.
    }
}

package com.message_service.service;

import com.message_service.controller.dto.ChatMessageDto;
import com.message_service.controller.dto.FriendEventDto;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaMessageProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public KafkaMessageProducerService(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendChatMessage(ChatMessageDto dto){
        kafkaTemplate.send("chat.messages", dto);
    }
    
    public void sendFriendEvent(FriendEventDto dto){
        kafkaTemplate.send("friend.events", dto);
    }
}

package com.estudo.websocmensagem.service;

import com.estudo.websocmensagem.controller.dto.KafkaDto;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuthEventService {

    private final KafkaTemplate<String, KafkaDto> kafkaTemplate;

    public AuthEventService(KafkaTemplate<String, KafkaDto> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendAuthEvent(KafkaDto kafkaDto) {
        kafkaTemplate.send("auth.events", kafkaDto); // Changed from auth-events to auth.events based on README
    }
}

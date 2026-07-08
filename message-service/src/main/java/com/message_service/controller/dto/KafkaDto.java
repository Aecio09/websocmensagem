package com.message_service.controller.dto;

public record KafkaDto(EventType authType, Long id, String username, String jwtToken) {
}

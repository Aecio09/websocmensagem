package com.estudo.websocmensagem.controller.dto;

import com.estudo.websocmensagem.controller.dto.EventType;

public record KafkaDto(EventType authType, Long id, String username, String jwtToken) {
}

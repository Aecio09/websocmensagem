package com.message_service.controller.dto;

public record ChatMessageDto(Long remetenteId, Long destinatarioId, String conteudo, String timestamp) {
}

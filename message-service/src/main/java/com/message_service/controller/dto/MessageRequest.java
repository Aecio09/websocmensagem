package com.message_service.controller.dto;

public record MessageRequest(Long recipientId, String content) {
}

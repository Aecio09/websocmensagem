package com.estudo.websocmensagem.controller.dto;

import java.time.LocalDateTime;

public record MessageResponse(
    Long id,
    String content,
    Long senderId,
    String senderUsername,
    Long recipientId,
    String recipientUsername,
    LocalDateTime createdAt
) {}
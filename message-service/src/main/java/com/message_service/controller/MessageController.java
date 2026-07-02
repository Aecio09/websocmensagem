package com.message_service.controller;

import com.message_service.controller.dto.MessageRequest;
import com.message_service.controller.dto.MessageResponse;
import com.message_service.entity.User;
import com.message_service.service.MessageService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.security.oauth2.jwt.Jwt;

@Controller
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/message")
    public void directMessage(@Payload MessageRequest request, @AuthenticationPrincipal User sender) {
        messageService.sendMessage(request, sender);
    }

    @GetMapping("/messages/{id}")
    @ResponseBody
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(messageService.getConversation(id, jwt, page, size));
    }
}

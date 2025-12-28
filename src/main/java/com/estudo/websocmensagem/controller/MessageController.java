package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.MessageRequest;
import com.estudo.websocmensagem.controller.dto.MessageResponse;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.MessageRepository;
import com.estudo.websocmensagem.entities.Message;
import com.estudo.websocmensagem.repository.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
public class MessageController {
    private final SimpMessagingTemplate template;
    private final MessageRepository mRepo;
    private final UserRepository userRepo;

    public MessageController(SimpMessagingTemplate template, MessageRepository mRepo, UserRepository userRepo) {
        this.template = template;
        this.mRepo = mRepo;
        this.userRepo = userRepo;
    }

    @MessageMapping("/message")
    public void directMessage(@Payload MessageRequest request, @AuthenticationPrincipal User sender) {
        User recipient = userRepo.findById(request.recipientId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Message message = new Message();
        message.setSenderBy(sender);
        message.setRecipientBy(recipient);
        message.setMessageContent(request.content());
        message.setCreatedAt(LocalDateTime.now());

        mRepo.save(message);

        MessageResponse response = new MessageResponse(
                message.getId(),
                message.getMessageContent(),
                sender.getId(),
                sender.getUsername(),
                recipient.getId(),
                recipient.getUsername(),
                message.getCreatedAt()
        );

        template.convertAndSendToUser(
                recipient.getUsername(),
                "/queue/messages",
                response);
    }
}

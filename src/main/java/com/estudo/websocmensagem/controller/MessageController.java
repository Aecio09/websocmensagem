package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.MessageRequest;
import com.estudo.websocmensagem.controller.dto.MessageResponse;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.MessageRepository;
import com.estudo.websocmensagem.entities.Message;
import com.estudo.websocmensagem.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

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

    @GetMapping("/messages/{id}")
    @ResponseBody
    public ResponseEntity<Page<MessageResponse>> getMessages(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        String username = jwt.getSubject();
        User currentUser = userRepo.findByUsername(username);

        User otherUser = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Message> messagesPage = mRepo.findConversationsBy(currentUser, otherUser, pageable);

        Page<MessageResponse> responsePage = messagesPage.map(message -> new MessageResponse(
                message.getId(),
                message.getMessageContent(),
                message.getSenderBy().getId(),
                message.getSenderBy().getUsername(),
                message.getRecipientBy().getId(),
                message.getRecipientBy().getUsername(),
                message.getCreatedAt()
        ));

        return ResponseEntity.ok(responsePage);
    }
}

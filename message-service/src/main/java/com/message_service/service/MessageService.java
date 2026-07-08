package com.message_service.service;

import com.message_service.controller.dto.MessageRequest;
import com.message_service.controller.dto.MessageResponse;
import com.message_service.entity.Message;
import com.message_service.entity.User;
import com.message_service.repository.MessageRepository;
import com.message_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import com.message_service.controller.dto.ChatMessageDto;

import java.time.LocalDateTime;

@Service
public class MessageService {

    private final SimpMessagingTemplate template;
    private final MessageRepository mRepo;
    private final UserRepository userRepo;
    private final KafkaMessageProducerService kafkaProducer;

    public MessageService(SimpMessagingTemplate template, MessageRepository mRepo, UserRepository userRepo, KafkaMessageProducerService kafkaProducer) {
        this.template = template;
        this.mRepo = mRepo;
        this.userRepo = userRepo;
        this.kafkaProducer = kafkaProducer;
    }

    public void sendMessage(MessageRequest request, User sender) {
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
                
        ChatMessageDto chatEvent = new ChatMessageDto(sender.getId(), recipient.getId(), request.content(), message.getCreatedAt().toString());
        kafkaProducer.sendChatMessage(chatEvent);
    }

    public Page<MessageResponse> getConversation(Long userId, Jwt jwt, int page, int size) {
        String username = jwt.getSubject();
        User currentUser = userRepo.findByUsername(username);

        User otherUser = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Message> messagesPage = mRepo.findConversationsBy(currentUser, otherUser, pageable);

        return messagesPage.map(message -> new MessageResponse(
                message.getId(),
                message.getMessageContent(),
                message.getSenderBy().getId(),
                message.getSenderBy().getUsername(),
                message.getRecipientBy().getId(),
                message.getRecipientBy().getUsername(),
                message.getCreatedAt()
        ));
    }
}

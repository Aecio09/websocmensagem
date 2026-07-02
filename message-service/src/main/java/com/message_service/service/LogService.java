package com.message_service.service;

import com.message_service.entity.ChatLog;
import com.message_service.entity.Message;
import com.message_service.repository.LogRepository;
import com.message_service.repository.MessageRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class LogService {

    private final MessageRepository mRepo;
    private final LogRepository logRepo;

    public LogService(MessageRepository mRepo, LogRepository logRepo) {
        this.mRepo = mRepo;
        this.logRepo = logRepo;
    }

    @Transactional
    public void archiveMessages() {
        for (Message message : mRepo.findAll()) {
            if (getMessageDuration(message) >= 30) {
                boolean logCreated = createLog(message.getId());
                if (logCreated) {
                    mRepo.deleteById(message.getId());
                }
            }
        }
    }

    private long getMessageDuration(Message message) {
        return Duration.between(message.getCreatedAt(), LocalDateTime.now()).toDays();
    }

    @Transactional
    public boolean createLog(Long messageId) {
        Message message = mRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        ChatLog log = new ChatLog();
        log.setSender(message.getSenderBy());
        log.setRecipient(message.getRecipientBy());
        log.setDateHour(message.getCreatedAt());
        logRepo.save(log);

        return true;
    }
}

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
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        for (Message message : mRepo.findMessagesOlderThan(cutoff)) {
            boolean logCreated = createLog(message);
            if (logCreated) {
                mRepo.delete(message);
            }
        }
    }

    @Transactional
    public boolean createLog(Message message) {
        ChatLog log = new ChatLog();
        log.setSender(message.getSenderBy());
        log.setRecipient(message.getRecipientBy());
        log.setDateHour(message.getCreatedAt());
        logRepo.save(log);
        return true;
    }
}

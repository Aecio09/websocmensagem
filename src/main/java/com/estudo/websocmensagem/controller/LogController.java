package com.estudo.websocmensagem.controller;


import com.estudo.websocmensagem.entities.ChatLog;
import com.estudo.websocmensagem.entities.Message;
import com.estudo.websocmensagem.repository.LogRepository;
import com.estudo.websocmensagem.repository.MessageRepository;
import com.estudo.websocmensagem.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDateTime;


@RestController
public class LogController {
    public MessageRepository mRepo;
    public UserRepository userRepo;
    public LogRepository logRepo;

    public LogController(MessageRepository mRepo, UserRepository userRepo, LogRepository logRepo) {
        this.logRepo = logRepo;
        this.mRepo = mRepo;
        this.userRepo = userRepo;
    }

    public long getMessageDuration(Message message) {
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

    @Scheduled(fixedRate = 86400000) //24hr so para eu lembrar
    @Transactional
    public void deleteMessageAndCreateLogs() {
        for (Message message : mRepo.findAll()) {
            if (getMessageDuration(message) >= 30) {
                boolean logCreated = createLog(message.getId());
                    if (logCreated) {
                        mRepo.deleteById(message.getId());
                    }
                }
            }
        }
}

package com.message_service.controller;

import com.message_service.service.LogService;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LogController {

    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    @Scheduled(fixedRate = 86400000)
    @Transactional
    public void deleteMessageAndCreateLogs() {
        logService.archiveMessages();
    }
}

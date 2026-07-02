package com.message_service.repository;

import com.message_service.entity.ChatLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogRepository extends JpaRepository<ChatLog, Long> {
}

package com.estudo.websocmensagem.repository;

import com.estudo.websocmensagem.entities.ChatLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogRepository extends JpaRepository<ChatLog, Long> {
}

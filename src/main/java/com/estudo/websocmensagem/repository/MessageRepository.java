package com.estudo.websocmensagem.repository;


import com.estudo.websocmensagem.entities.Message;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {
}

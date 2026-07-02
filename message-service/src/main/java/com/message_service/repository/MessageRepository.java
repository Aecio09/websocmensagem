package com.message_service.repository;

import com.message_service.entity.Message;
import com.message_service.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    Message findById(long id);

    List<Message> findBySenderBy(User senderBy);

    List<Message> findByRecipientBy(User recipientBy);

    Page<Message> findConversationsBy(User senderBy, User recipientBy, Pageable pageable);
}

package com.message_service.repository;

import com.message_service.entity.Message;
import com.message_service.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderBy(User senderBy);

    List<Message> findByRecipientBy(User recipientBy);

    @Query("SELECT m FROM Message m WHERE (m.senderBy = ?1 AND m.recipientBy = ?2) OR (m.senderBy = ?2 AND m.recipientBy = ?1) ORDER BY m.createdAt DESC")
    Page<Message> findConversationsBy(User senderBy, User recipientBy, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.createdAt < ?1")
    List<Message> findMessagesOlderThan(java.time.LocalDateTime date);
}

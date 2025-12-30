package com.estudo.websocmensagem.repository;


import com.estudo.websocmensagem.entities.Message;
import com.estudo.websocmensagem.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    Message findById(long id);

    List<Message> findBySenderBy(User senderBy);

    List<Message> findByRecipientBy(User recipientBy);
}

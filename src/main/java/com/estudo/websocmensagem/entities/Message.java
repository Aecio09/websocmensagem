package com.estudo.websocmensagem.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "tb_message")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String messageContent;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User senderBy;

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipientBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

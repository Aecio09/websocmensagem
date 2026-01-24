package com.estudo.websocmensagem.entities;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.text.DateFormat;
import java.time.LocalDateTime;


@Getter
@Setter
@Entity
@Table(name = "tb_chat_log")
public class ChatLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(nullable = false)
    private LocalDateTime dateHour;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;
}

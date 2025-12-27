package com.estudo.websocmensagem.controller;


import com.estudo.websocmensagem.controller.dto.UserCreate;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class UserController {

    private final UserRepository userRepo;

    private  final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<Void> createUser(@RequestBody UserCreate dto) {

        if (userRepo.findByUsername(dto.username()) != null) {
            return ResponseEntity.status(409).build();
        }
    User user = new User();
        user.setUsername(dto.username());
        user.setPassword(passwordEncoder.encode(dto.password()));
        userRepo.save(user);
        return ResponseEntity.status(201).build();
    }
    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers() {
        List<User> users = userRepo.findAll();
        return ResponseEntity.ok(users);
    }
}

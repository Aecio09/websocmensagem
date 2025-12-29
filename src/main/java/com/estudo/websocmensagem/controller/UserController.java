package com.estudo.websocmensagem.controller;


import com.estudo.websocmensagem.controller.dto.UserCreate;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.RoleRepository;
import com.estudo.websocmensagem.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserController {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;

    private  final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepo, RoleRepository roleRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<Void> createUser(@RequestBody UserCreate dto) {

        if (userRepo.findByUsername(dto.username()) != null) {
            return ResponseEntity.status(409).build();
        }

        var role = roleRepo.findByName("usr");

    User user = new User();
        user.setUsername(dto.username());
        user.setPassword(passwordEncoder.encode(dto.password()));
        user.getRoles().add(role);
        userRepo.save(user);
        return ResponseEntity.status(201).build();
    }
    @GetMapping("/users")
    @PreAuthorize("hasAuthority('adm')")
    public ResponseEntity<List<User>> listUsers() {
        List<User> users = userRepo.findAll();
        return ResponseEntity.ok(users);
    }


    //to com preguica de fazer esse aqui agora, depois eu faco
    @PutMapping("/edit-user/{id}")
    @PreAuthorize("hasAuthority('adm')")
    @Transactional
    public ResponseEntity<User> editUser(@PathVariable Long id, @RequestBody UserCreate dto) {

        return ResponseEntity.ok().build();
    }
}

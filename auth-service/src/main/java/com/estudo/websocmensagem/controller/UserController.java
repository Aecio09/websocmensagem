package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.UserCreate;
import com.estudo.websocmensagem.controller.dto.UserResponse;
import com.estudo.websocmensagem.controller.dto.UserResponseForusr;
import com.estudo.websocmensagem.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<Void> createUser(@RequestBody UserCreate dto) {
        var user = userService.createUser(dto);
        if (user == null) return ResponseEntity.status(409).build();
        return ResponseEntity.status(201).build();
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('adm')")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(userService.listUsers());
    }

    @GetMapping("/users/username/{username}")
    public ResponseEntity<UserResponseForusr> getUserByUsername(@PathVariable String username) {
        UserResponseForusr user = userService.findByUsername(username);
        if (user == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(user);
    }

    @PutMapping("/edit-user/{id}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<Void> editUser(@PathVariable Long id, @RequestBody UserCreate dto) {
        userService.editUser(id, dto);
        return ResponseEntity.status(201).build();
    }

    @DeleteMapping("/delete-user/{id}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.status(204).build();
    }
}

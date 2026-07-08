package com.estudo.websocmensagem.service;

import com.estudo.websocmensagem.controller.dto.UserCreate;
import com.estudo.websocmensagem.controller.dto.UserResponse;
import com.estudo.websocmensagem.controller.dto.UserResponseForusr;
import com.estudo.websocmensagem.entities.Role;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.RoleRepository;
import com.estudo.websocmensagem.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.estudo.websocmensagem.controller.dto.EventType;
import com.estudo.websocmensagem.controller.dto.KafkaDto;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthEventService authEventService;

    public UserService(UserRepository userRepo, RoleRepository roleRepo, PasswordEncoder passwordEncoder, AuthEventService authEventService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.passwordEncoder = passwordEncoder;
        this.authEventService = authEventService;
    }

    @Transactional
    public User createUser(UserCreate dto) {
        if (userRepo.findByUsername(dto.username()) != null) {
            return null;
        }

        var role = roleRepo.findByName("usr");

        User user = new User();
        user.setUsername(dto.username());
        user.setPassword(passwordEncoder.encode(dto.password()));
        user.getRoles().add(role);
        
        User savedUser = userRepo.save(user);
        
        KafkaDto event = new KafkaDto(EventType.REGISTER, savedUser.getId(), savedUser.getUsername(), null);
        authEventService.sendAuthEvent(event);
        
        return savedUser;
    }

    public List<UserResponse> listUsers() {
        return userRepo.findAll().stream()
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getRoles().stream().map(Role::getName).toList()
                ))
                .toList();
    }

    public UserResponseForusr findByUsername(String username) {
        User user = userRepo.findByUsername(username);
        if (user == null) return null;
        return new UserResponseForusr(user.getId(), user.getUsername());
    }

    @Transactional
    public void editUser(Long id, UserCreate dto) {
        User user = userRepo.findById(id).orElseThrow();
        user.setUsername(dto.username());
        user.setPassword(passwordEncoder.encode(dto.password()));
        userRepo.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepo.findById(id).orElseThrow();
        userRepo.delete(user);
    }
}

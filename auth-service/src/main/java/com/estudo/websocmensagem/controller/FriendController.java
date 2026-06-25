package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.UserResponseForusr;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class FriendController {

    private final UserRepository userRepo;

    public FriendController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }


    @GetMapping("/users/friends/{id}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    @Transactional
    public ResponseEntity<List<UserResponseForusr>> getFriends(@PathVariable Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        List<UserResponseForusr> friends = user.getFriendsIds().stream()
                .map(friendId -> userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found")))
                .map(friend -> new UserResponseForusr(friend.getId(), friend.getUsername()))
                .toList();

        return ResponseEntity.status(201).body(friends);
    }

    @PostMapping("/users/friends/sendrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    @Transactional
    public ResponseEntity<Void> sendFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        if (user.getFriendsIds().contains(friendId)) {
            return ResponseEntity.status(404).build(); 
        }

        friend.getFriendRequestsIds().add(id);
        userRepo.save(friend);

        return ResponseEntity.status(201).build();
    }
    @PostMapping("/users/friends/acceptrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    @Transactional
    public ResponseEntity<Void> acceptFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        try {
            if(user.getFriendRequestsIds().contains(friendId)) {
            user.getFriendsIds().add(friendId);
            friend.getFriendsIds().add(id);
            user.getFriendRequestsIds().remove(friendId);
            userRepo.save(user);
            userRepo.save(friend);
            return ResponseEntity.status(201).build();
            }
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/users/friends/rejectrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    @Transactional
    public ResponseEntity<Void> rejectFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        try {
            if(user.getFriendRequestsIds().contains(friendId)) {
                user.getFriendRequestsIds().remove(friendId);
                userRepo.save(user);
                return ResponseEntity.status(201).build();
            }
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/users/friends/cancelrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    @Transactional
    public ResponseEntity<Void> cancelFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        try {
            if(friend.getFriendRequestsIds().contains(id)) {
                friend.getFriendRequestsIds().remove(id);
                userRepo.save(friend);
                return ResponseEntity.status(201).build();
            }
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}

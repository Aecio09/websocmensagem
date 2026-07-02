package com.message_service.controller;

import com.message_service.controller.dto.UserResponseForusr;
import com.message_service.service.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping("/users/friends/{id}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<List<UserResponseForusr>> getFriends(@PathVariable Long id) {
        return ResponseEntity.status(201).body(friendService.getFriends(id));
    }

    @PostMapping("/users/friends/sendrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<Void> sendFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        friendService.sendFriendRequest(id, friendId);
        return ResponseEntity.status(201).build();
    }

    @PostMapping("/users/friends/acceptrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<Void> acceptFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        friendService.acceptFriendRequest(id, friendId);
        return ResponseEntity.status(201).build();
    }

    @PostMapping("/users/friends/rejectrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<Void> rejectFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        friendService.rejectFriendRequest(id, friendId);
        return ResponseEntity.status(201).build();
    }

    @PostMapping("/users/friends/cancelrequest/{id}/{friendId}")
    @PreAuthorize("#id.equals(authentication.principal.claims['userId']) or hasAuthority('adm')")
    public ResponseEntity<Void> cancelFriendRequest(@PathVariable Long id, @PathVariable Long friendId) {
        friendService.cancelFriendRequest(id, friendId);
        return ResponseEntity.status(201).build();
    }
}

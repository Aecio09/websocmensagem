package com.message_service.service;

import com.message_service.controller.dto.UserResponseForusr;
import com.message_service.entity.User;
import com.message_service.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FriendService {

    private final UserRepository userRepo;

    public FriendService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    public List<UserResponseForusr> getFriends(Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        return user.getFriendsIds().stream()
                .map(friendId -> userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found")))
                .map(friend -> new UserResponseForusr(friend.getId(), friend.getUsername()))
                .toList();
    }

    @Transactional
    public void sendFriendRequest(Long id, Long friendId) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        if (user.getFriendsIds().contains(friendId)) {
            throw new RuntimeException("Already friends");
        }

        friend.getFriendRequestsIds().add(id);
        userRepo.save(friend);
    }

    @Transactional
    public void acceptFriendRequest(Long id, Long friendId) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        if (!user.getFriendRequestsIds().contains(friendId)) {
            throw new RuntimeException("No friend request found");
        }

        user.getFriendsIds().add(friendId);
        friend.getFriendsIds().add(id);
        user.getFriendRequestsIds().remove(friendId);
        userRepo.save(user);
        userRepo.save(friend);
    }

    @Transactional
    public void rejectFriendRequest(Long id, Long friendId) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getFriendRequestsIds().contains(friendId)) {
            throw new RuntimeException("No friend request found");
        }

        user.getFriendRequestsIds().remove(friendId);
        userRepo.save(user);
    }

    @Transactional
    public void cancelFriendRequest(Long id, Long friendId) {
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        if (!friend.getFriendRequestsIds().contains(id)) {
            throw new RuntimeException("No friend request found");
        }

        friend.getFriendRequestsIds().remove(id);
        userRepo.save(friend);
    }
}

package com.message_service.service;

import com.message_service.controller.dto.UserResponseForusr;
import com.message_service.entity.User;
import com.message_service.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import com.message_service.controller.dto.FriendEventDto;

import java.util.List;

@Service
public class FriendService {

    private final UserRepository userRepo;
    private final KafkaMessageProducerService kafkaProducer;

    public FriendService(UserRepository userRepo, KafkaMessageProducerService kafkaProducer) {
        this.userRepo = userRepo;
        this.kafkaProducer = kafkaProducer;
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
        if (id.equals(friendId)) {
            throw new RuntimeException("You cannot send a friend request to yourself");
        }

        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User friend = userRepo.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

        if (user.getFriendsIds().contains(friendId)) {
            throw new RuntimeException("Already friends");
        }

        if (friend.getFriendRequestsIds().contains(id)) {
            throw new RuntimeException("Friend request already sent");
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
        
        FriendEventDto friendEvent = new FriendEventDto(id, friendId);
        kafkaProducer.sendFriendEvent(friendEvent);
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

    public List<UserResponseForusr> getPendingRequests(Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        return user.getFriendRequestsIds().stream()
                .map(reqId -> userRepo.findById(reqId).orElseThrow(() -> new RuntimeException("User not found")))
                .map(req -> new UserResponseForusr(req.getId(), req.getUsername()))
                .toList();
    }

    public String getRelationshipStatus(Long id, Long targetId) {
        if (id.equals(targetId)) return "SELF";
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User target = userRepo.findById(targetId).orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getFriendsIds().contains(targetId)) return "FRIENDS";
        if (user.getFriendRequestsIds().contains(targetId)) return "PENDING_RECEIVED";
        if (target.getFriendRequestsIds().contains(id)) return "PENDING_SENT";
        return "NONE";
    }
}

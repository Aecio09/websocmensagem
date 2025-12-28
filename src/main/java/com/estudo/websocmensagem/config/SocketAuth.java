package com.estudo.websocmensagem.config;

import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.UserRepository;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

public class SocketAuth implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;
    private final UserRepository userRepository;

    public SocketAuth(JwtDecoder jwtDecoder, UserRepository userRepository) {
        this.jwtDecoder = jwtDecoder;
        this.userRepository = userRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authToken = accessor.getFirstNativeHeader("Authorization");
            
            System.out.println("=== WebSocket CONNECT ===");
            System.out.println("Authorization header: " + authToken);

            if (authToken != null && authToken.startsWith("Bearer ")) {
                String token = authToken.substring(7);

                try {
                    Jwt jwt = jwtDecoder.decode(token);
                    String username = jwt.getClaimAsString("sub");
                    
                    System.out.println("JWT decoded successfully. Username: " + username);
                    
                    User user = userRepository.findByUsername(username);
                    if (user == null) {
                        System.err.println("User not found: " + username);
                        throw new RuntimeException("User not found: " + username);
                    }

                    System.out.println("User found: " + user.getUsername() + " (ID: " + user.getId() + ")");

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    user,
                                    null,
                                    null
                            );

                    accessor.setUser(authentication);
                    System.out.println("Authentication set successfully");
                } catch (Exception e) {
                    System.err.println("JWT authentication error: " + e.getMessage());
                    e.printStackTrace();
                    throw new RuntimeException("Invalid JWT token: " + e.getMessage());
                }
            } else {
                System.err.println("No valid Authorization header found");
            }
        }

        return message;
    }
}

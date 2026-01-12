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
            

            if (authToken != null && authToken.startsWith("Bearer ")) {
                String token = authToken.substring(7);

                try {
                    Jwt jwt = jwtDecoder.decode(token);
                    String username = jwt.getClaimAsString("sub");

                    String type = jwt.getClaimAsString("type");

                    if(!"access".equals(type)) {
                        throw new RuntimeException("Invalid token type: " + type);
                    }
                    
                    User user = userRepository.findByUsername(username);
                    if (user == null) {
                        throw new RuntimeException("User not found: " + username);
                    }

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    user,
                                    null,
                                    null
                            ) {
                                @Override
                                public String getName() {
                                    return user.getUsername();
                                }
                            };

                    accessor.setUser(authentication);
                } catch (Exception e) {
                    throw new RuntimeException("Invalid JWT token: " + e.getMessage());
                }
            } else {
                throw new RuntimeException("Missing or invalid Authorization header");
            }
        }

        return message;
    }
}

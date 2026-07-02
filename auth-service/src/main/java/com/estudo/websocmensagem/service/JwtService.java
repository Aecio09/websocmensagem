package com.estudo.websocmensagem.service;

import com.estudo.websocmensagem.controller.dto.LoginRequest;
import com.estudo.websocmensagem.controller.dto.LoginResponse;
import com.estudo.websocmensagem.controller.dto.RefreshTokenRequest;
import com.estudo.websocmensagem.entities.Role;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    private static final long EXPIREtime = 900L;
    private static final long REFRESHtime = 604800L;

    public JwtService(JwtEncoder encoder, JwtDecoder decoder,
                      UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest dto) {
        var user = userRepo.findByUsername(dto.username());
        if (user == null || !passwordEncoder.matches(dto.password(), user.getPassword())) {
            return null;
        }

        return buildLoginResponse(user);
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        try {
            Jwt jwt = decoder.decode(request.refreshToken());

            String tokenType = jwt.getClaim("type");
            if (!"refresh".equals(tokenType)) return null;

            String username = jwt.getSubject();
            var user = userRepo.findByUsername(username);
            if (user == null) return null;

            return buildLoginResponse(user);

        } catch (JwtException e) {
            return null;
        }
    }

    private LoginResponse buildLoginResponse(User user) {
        var roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        String newAccessToken = generateAccessToken(user.getId(), user.getUsername(), roles);
        String newRefreshToken = generateRefreshToken(user.getUsername());

        return new LoginResponse(newAccessToken, newRefreshToken, EXPIREtime);
    }

    public String generateAccessToken(Long userId, String username, Set<String> roles) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer("estudo-websoc-mensagem")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(EXPIREtime))
                .subject(username)
                .claim("type", "access")
                .claim("userId", userId)
                .claim("username", username)
                .claim("scope", String.join(" ", roles))
                .build();

        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String generateRefreshToken(String username) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer("estudo-websoc-mensagem")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(REFRESHtime))
                .subject(username)
                .claim("type", "refresh")
                .build();

        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}

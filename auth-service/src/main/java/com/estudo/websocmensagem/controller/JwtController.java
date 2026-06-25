package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.LoginRequest;
import com.estudo.websocmensagem.controller.dto.LoginResponse;
import com.estudo.websocmensagem.controller.dto.RefreshTokenRequest;
import com.estudo.websocmensagem.entities.Role;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.UserRepository;
import org.jspecify.annotations.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
public class JwtController {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    private static final long EXPIREtime = 900L;
    private static final long REFRESHtime = 604800L;

    public JwtController(JwtEncoder encoder, JwtDecoder decoder,
                         UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest dto) {
        var user = userRepo.findByUsername(dto.username());
        if (user == null || !passwordEncoder.matches(dto.password(), user.getPassword())) {
            return ResponseEntity.status(401).build();
        }

        return getLoginResponseResponseEntity(user);
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@RequestBody RefreshTokenRequest request) {
        try {
            Jwt jwt = decoder.decode(request.refreshToken());

            String tokenType = jwt.getClaim("type");
            if (!"refresh".equals(tokenType)) {
                return ResponseEntity.status(401).build();
            }

            String username = jwt.getSubject();
            var user = userRepo.findByUsername(username);

            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            return getLoginResponseResponseEntity(user);

        } catch (JwtException e) {
            return ResponseEntity.status(401).build();
        }
    }

    @NonNull
    private ResponseEntity<LoginResponse> getLoginResponseResponseEntity(User user) {
        var roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        String newAccessToken = generateAccessToken(user.getId(), user.getUsername(), roles);
        String newRefreshToken = generateRefreshToken(user.getUsername());

        return ResponseEntity.ok(new LoginResponse(newAccessToken, newRefreshToken, EXPIREtime));
    }

    private String generateAccessToken(Long userId, String username, Set<String> roles) {
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

    private String generateRefreshToken(String username) {
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

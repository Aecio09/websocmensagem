package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.LoginRequest;
import com.estudo.websocmensagem.controller.dto.LoginResponse;
import com.estudo.websocmensagem.entities.Role;
import com.estudo.websocmensagem.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.stream.Collectors;

@RestController
public class JwtController {

    private final JwtEncoder encoder;
    private  final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public JwtController(JwtEncoder encoder, UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.encoder = encoder;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> loginresponse(@RequestBody LoginRequest dto) {
    var user = userRepo.findByUsername(dto.username());
        if(user == null || !passwordEncoder.matches(dto.password(), user.getPassword())) {
            return ResponseEntity.status(401).build();
        }
        var now = Instant.now();
        var expiresAt = 36000L;
        var roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());

        var claims = JwtClaimsSet.builder()
                .issuer("estudo-websoc-mensagem")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(expiresAt))
                .subject(user.getUsername())
                .claim("username", user.getUsername())
                .claim("scope", String.join(" ", roles))
                .build();

        var jwtValue = encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();

        return ResponseEntity.ok(new LoginResponse(jwtValue, expiresAt));
    }

}

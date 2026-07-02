package com.message_service.controller;

import com.message_service.controller.dto.PublicKeyRequest;
import com.message_service.controller.dto.PublicKeyResponse;
import com.message_service.service.EncryptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/keys")
public class KeyController {

    private final EncryptionService encryptionService;

    public KeyController(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    @PostMapping("/keyregister")
    public ResponseEntity<String> registerKey(@RequestBody PublicKeyRequest request, @AuthenticationPrincipal Jwt jwt) {
        encryptionService.registerPublicKey(jwt.getSubject(), request.publicKey());
        return ResponseEntity.ok("Public key registered successfully");
    }

    @GetMapping("/keyget/{userId}")
    public ResponseEntity<PublicKeyResponse> getUserPublicKey(@PathVariable Long userId) {
        String publicKey = encryptionService.getPublicKeyByUserId(userId);
        return ResponseEntity.ok(new PublicKeyResponse(userId, publicKey));
    }
}

package com.estudo.websocmensagem.controller;


import com.estudo.websocmensagem.controller.dto.PublicKeyRequest;
import com.estudo.websocmensagem.controller.dto.PublicKeyResponse;
import com.estudo.websocmensagem.entities.User;
import com.estudo.websocmensagem.repository.UserRepository;
import com.estudo.websocmensagem.service.EncryptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/keys")
public class KeyController {

    private final EncryptionService encryptionService;
    private final UserRepository userRepo;

    public KeyController(EncryptionService encryptionService, UserRepository userRepo) {
        this.encryptionService = encryptionService;
        this.userRepo = userRepo;
    }

    @PostMapping("/keyregister")
    public ResponseEntity<String> registerKey(@RequestBody PublicKeyRequest request, @AuthenticationPrincipal Jwt jwt) {
    String username = jwt.getSubject();
    User user = userRepo.findByUsername(username);

    if (user == null) {
        return ResponseEntity.status(404).body("User not found");
    }

    encryptionService.registerPublicKey(user.getId(), request.publicKey());

    return ResponseEntity.ok("Public key registered successfully");
    }

    @GetMapping("/keyget/{userId}")
    public ResponseEntity<PublicKeyResponse> getUserPublicKey(@PathVariable Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        String publicKey = encryptionService.getPublicKeyByUserId(userId);

        PublicKeyResponse response = new PublicKeyResponse(user.getId(), publicKey);

        return ResponseEntity.ok(response);
    }
}

package com.message_service.service;

import com.message_service.entity.User;
import com.message_service.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;


@Service
public class EncryptionService {

    private final UserRepository userRepo;

    public EncryptionService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Transactional
    public void registerPublicKey(String username, String publicKey) {
        User user = userRepo.findByUsername(username);
        if (user == null) {
            throw new IllegalArgumentException("User not found: " + username);
        }

        validatePublicKey(publicKey);
        user.setPublicKey(publicKey);
        userRepo.save(user);
    }

    public String getPublicKeyByUserId(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (user.getPublicKey() == null) {
            throw new IllegalArgumentException("Public key not found for user with id: " + userId);
        }

        return user.getPublicKey();
    }


    private void validatePublicKey(String publicKeyBase64) {
        try {
            byte[] keyBytes = Base64.getDecoder().decode(publicKeyBase64);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            PublicKey publicKey = keyFactory.generatePublic(spec);

            if (keyBytes.length < 256) {
                throw new IllegalArgumentException("Rsa key size is too small. Minimum 2048 bits required.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid publickey: " + e.getMessage(), e);
        }
    }

}

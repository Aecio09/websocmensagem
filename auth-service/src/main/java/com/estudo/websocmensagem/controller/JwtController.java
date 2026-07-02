package com.estudo.websocmensagem.controller;

import com.estudo.websocmensagem.controller.dto.LoginRequest;
import com.estudo.websocmensagem.controller.dto.LoginResponse;
import com.estudo.websocmensagem.controller.dto.RefreshTokenRequest;
import com.estudo.websocmensagem.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class JwtController {

    private final JwtService jwtService;

    public JwtController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest dto) {
        LoginResponse response = jwtService.login(dto);
        if (response == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@RequestBody RefreshTokenRequest request) {
        LoginResponse response = jwtService.refresh(request);
        if (response == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(response);
    }
}

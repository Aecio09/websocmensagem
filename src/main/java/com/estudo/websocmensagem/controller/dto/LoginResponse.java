package com.estudo.websocmensagem.controller.dto;

public record LoginResponse(String token, long expiration) {
}

package com.merkostore.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 86400000L);
    }

    @Test
    @DisplayName("Debe generar un token JWT válido y extraer el nombre de usuario y rol")
    void shouldGenerateAndValidateJwtToken() {
        String token = jwtTokenProvider.generateToken("admin", "ROLE_ADMIN", "default-store");

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("admin", jwtTokenProvider.getUsernameFromToken(token));
        assertEquals("ROLE_ADMIN", jwtTokenProvider.getRoleFromToken(token));
    }

    @Test
    @DisplayName("Debe rechazar tokens JWT inválidos o alterados")
    void shouldRejectInvalidJwtToken() {
        String invalidToken = "eyJhbGciOiJIUzI1NiJ9.invalidPayload.invalidSignature";
        assertFalse(jwtTokenProvider.validateToken(invalidToken));
    }
}

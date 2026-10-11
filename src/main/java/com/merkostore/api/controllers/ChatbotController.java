package com.merkostore.api.controllers;

import com.merkostore.api.dtos.ApiResponse;
import com.merkostore.api.dtos.ChatRequest;
import com.merkostore.api.dtos.ChatResponse;
import com.merkostore.api.services.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChatbotController {

    private final ChatbotService chatbotService;

    /**
     * Endpoint para procesar mensajes del usuario con el Agente Inteligente / LLM
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ChatResponse>> ask(@Valid @RequestBody ChatRequest request) {
        ChatResponse response = chatbotService.processUserMessage(request);
        return ResponseEntity.ok(ApiResponse.ok("Respuesta generada con éxito", response));
    }

    /**
     * Sugerencias rápidas iniciales para el componente visual del chat
     */
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<String>>> getInitialSuggestions() {
        List<String> suggestions = chatbotService.getInitialSuggestions();
        return ResponseEntity.ok(ApiResponse.ok("Sugerencias iniciales obtenidas", suggestions));
    }
}

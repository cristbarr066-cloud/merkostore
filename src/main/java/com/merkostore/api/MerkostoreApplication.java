package com.merkostore.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class MerkostoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(MerkostoreApplication.class, args);
        System.out.println("\n=======================================================");
        System.out.println("🚀 MERKOSTORE BACKEND INICIADO CON ÉXITO EN PUERTO 8080");
        System.out.println("=======================================================\n");
    }
}

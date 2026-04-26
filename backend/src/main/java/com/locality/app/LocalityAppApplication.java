package com.locality.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LocalityAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(LocalityAppApplication.class, args);
    }
}

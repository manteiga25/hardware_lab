package com.web.app.Configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebSecurity implements WebMvcConfigurer {

    // The front-end is served by this application (src/main/resources/static), so its
    // API calls are same-origin and need no CORS. Only list origins here when the
    // front-end is hosted somewhere else (e.g. app.cors.allowed-origins=https://cpus.example.org).
    @Value("${app.cors.allowed-origins:}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins)
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);

        if (origins.length == 0) return;

        // Read-only public API without login: no cookies or credentials are ever needed.
        registry.addMapping("/API/**")
                .allowedOrigins(origins)
                .allowedMethods("GET")
                .allowCredentials(false)
                .maxAge(3600);
    }

}

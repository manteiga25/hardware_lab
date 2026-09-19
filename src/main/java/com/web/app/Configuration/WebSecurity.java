package com.web.app.Configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class WebSecurity {

    // The front-end only loads its own files and only calls this server.
    private static final String CONTENT_SECURITY_POLICY = String.join("; ",
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'self'",
            "frame-ancestors 'none'"
    );

    // The front-end is served by this application (src/main/resources/static), so its
    // API calls are same-origin and need no CORS. Only list origins here when the
    // front-end is hosted somewhere else (e.g. app.cors.allowed-origins=https://cpus.example.org).
    @Value("${app.cors.allowed-origins:}")
    private String[] allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // No login on purpose: no sessions, login form or basic auth.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)

                // CSRF for a JavaScript front-end: the token lives in the XSRF-TOKEN cookie and
                // must come back in the X-XSRF-TOKEN header on every POST, PUT, PATCH or DELETE.
                .csrf(csrf -> csrf
                        .spa()
                        .csrfTokenRepository(csrfTokenRepository()))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)

                .cors(Customizer.withDefaults())

                // Read-only site: only GET on known paths. Anything else is refused with 403.
                // New endpoints that change data must be added here explicitly.
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET,
                                "/", "/index.html", "/favicon.svg", "/css/**", "/js/**", "/API/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().denyAll())

                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY))
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
                        .permissionsPolicyHeader(permissions -> permissions.policy("camera=(), microphone=(), geolocation=()")));

        return http.build();
    }

    private CookieCsrfTokenRepository csrfTokenRepository() {
        // Readable by the front-end's JavaScript (that is how the token is sent back),
        // but never sent along with requests started by other sites.
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.sameSite("Strict"));
        return repository;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        List<String> origins = Arrays.stream(allowedOrigins)
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();

        if (origins.isEmpty()) return source;

        // Read-only public API without login: no cookies or credentials are ever needed.
        CorsConfiguration api = new CorsConfiguration();
        api.setAllowedOrigins(origins);
        api.setAllowedMethods(List.of("GET"));
        api.setAllowCredentials(false);
        api.setMaxAge(3600L);
        source.registerCorsConfiguration("/API/**", api);

        return source;
    }

}

package com.web.app.Configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Spring Security creates the CSRF token lazily, so on a site that only makes GET requests
// the XSRF-TOKEN cookie would never be written. Reading the token here writes the cookie on
// the first page load, so the front-end already has it before its first POST/PUT/DELETE.
// Not a @Component on purpose: it is registered only inside the security filter chain.
final class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain)
            throws ServletException, IOException {

        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) csrfToken.getToken();

        chain.doFilter(request, response);
    }
}

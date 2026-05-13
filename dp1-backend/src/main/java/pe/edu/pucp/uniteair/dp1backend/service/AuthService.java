package pe.edu.pucp.uniteair.dp1backend.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.dto.AuthResponse;
import pe.edu.pucp.uniteair.dp1backend.dto.LoginRequest;
import pe.edu.pucp.uniteair.dp1backend.dto.RegisterRequest;
import pe.edu.pucp.uniteair.dp1backend.entity.User;
import pe.edu.pucp.uniteair.dp1backend.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            securityContextRepository.saveContext(SecurityContextHolder.getContext(), httpRequest, httpResponse);

            var user = userRepository.findByUsername(request.getUsername()).orElse(null);
            return AuthResponse.builder()
                    .success(true)
                    .username(request.getUsername())
                    .role(user != null ? user.getRole() : "USER")
                    .message("Login exitoso")
                    .build();
        } catch (Exception e) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Credenciales inválidas")
                    .build();
        }
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("El usuario ya existe")
                    .build();
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(user);

        return AuthResponse.builder()
                .success(true)
                .username(request.getUsername())
                .role("USER")
                .message("Registro exitoso")
                .build();
    }

    public AuthResponse checkStatus() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            var user = userRepository.findByUsername(authentication.getName()).orElse(null);
            return AuthResponse.builder()
                    .success(true)
                    .username(authentication.getName())
                    .role(user != null ? user.getRole() : "USER")
                    .message("Sesión activa")
                    .build();
        }
        return AuthResponse.builder()
                .success(false)
                .message("No hay sesión activa")
                .build();
    }

    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        SecurityContextHolder.clearContext();
        var session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}

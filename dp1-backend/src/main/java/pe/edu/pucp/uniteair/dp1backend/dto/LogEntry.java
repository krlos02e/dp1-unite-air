package pe.edu.pucp.uniteair.dp1backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEntry {
    private LocalDateTime timestamp;
    private String tipo;
    private String mensaje;
    private String modulo;
    private String detalle;
}

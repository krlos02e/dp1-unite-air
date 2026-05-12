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
public class VueloDTO {
    private String id;
    private String origen;
    private String destino;
    private double latOrigen;
    private double lonOrigen;
    private double latDestino;
    private double lonDestino;
    private LocalDateTime salidaUtc;
    private LocalDateTime llegadaUtc;
    private int capacidad;
    private int cargaActual;
    private double progresoVuelo;
}

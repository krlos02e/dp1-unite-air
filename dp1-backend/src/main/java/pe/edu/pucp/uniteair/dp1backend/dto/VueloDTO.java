package pe.edu.pucp.uniteair.dp1backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
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
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime salidaUtc;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime llegadaUtc;
    private int capacidad;
    private int cargaActual;
    private double progresoVuelo;
    private String estado;
}

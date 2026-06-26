package pe.edu.pucp.uniteair.dp1backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnvioSimulacionDTO {
    private String id;
    private String origen;
    private String destino;
    private String estado;
    private String aeropuertoActual;
    private String vueloActual;
    private String vueloEsperado;
    private String ultimoVuelo;
    private String ultimaLlegadaUtc;
    private List<String> rutaAeropuertos;
    private int cantidad;
}

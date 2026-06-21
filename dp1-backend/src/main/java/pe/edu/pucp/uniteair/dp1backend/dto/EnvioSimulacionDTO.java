package pe.edu.pucp.uniteair.dp1backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private int cantidad;
}

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
public class MaletaSimulacionDTO {
    private String id;
    private String envioId;
    private int indice;
    private int subrutaIndex;
    private String origen;
    private String destino;
    private String estado;
    private String aeropuertoActual;
    private String vueloActual;
    private String vueloEsperado;
    private String ultimaLlegadaUtc;
    private List<String> rutaAeropuertos;
    private List<String> rutaVuelos;
    private List<String> rutaAnteriorAeropuertos;
    private List<String> rutaAnteriorVuelos;
    private int cantidad;
}

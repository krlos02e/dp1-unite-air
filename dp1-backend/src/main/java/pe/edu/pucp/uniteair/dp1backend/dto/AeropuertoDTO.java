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
public class AeropuertoDTO {
    private String codigoOACI;
    private double latitud;
    private double longitud;
    private String ciudad;
    private int capacidadMaxima;
    private int ocupacionActual;
    private List<String> vuelosEntrantes;
    private List<String> vuelosSalientes;
    private List<String> vuelosCanceladosSalientes;
}

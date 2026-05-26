package pe.edu.pucp.uniteair.dp1backend.dto;

import lombok.Data;

@Data
public class SimulacionConfigRequest {
    private int duracionDias;
    private String fechaInicio;
    private String horaInicio;
    private String algoritmo;
    private double velocidad = 1.0;
}

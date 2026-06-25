package pe.edu.pucp.uniteair.dp1backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramacionVueloDTO {
    private Long id;
    private String origenOACI;
    private String destinoOACI;
    private String horaSalidaLocal;
    private String horaLlegadaLocal;
    private int capacidad;
}

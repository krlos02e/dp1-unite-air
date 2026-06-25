package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Entity
@Table(name = "programaciones_vuelo")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramacionVuelo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AlmacenContexto contexto;

    @Column(nullable = false, length = 8)
    private String origenOACI;

    @Column(nullable = false, length = 8)
    private String destinoOACI;

    @Column(nullable = false)
    private LocalTime horaSalidaLocal;

    @Column(nullable = false)
    private LocalTime horaLlegadaLocal;

    @Column(nullable = false)
    private Integer capacidad;
}

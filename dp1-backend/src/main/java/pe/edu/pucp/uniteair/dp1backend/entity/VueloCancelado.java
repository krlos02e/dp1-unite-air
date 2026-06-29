package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "vuelos_cancelados",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_vuelo_cancelado_contexto_vuelo",
                        columnNames = {"contexto", "vuelo_id"}
                )
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VueloCancelado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AlmacenContexto contexto;

    @Column(name = "vuelo_id", nullable = false, length = 128)
    private String vueloId;

    @Column(nullable = false, length = 8)
    private String origenOACI;

    @Column(nullable = false, length = 8)
    private String destinoOACI;

    @Column(nullable = false)
    private LocalDateTime salidaUtc;

    @Column(nullable = false)
    private LocalTime horaSalidaLocal;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}

package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "planificacion_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanificacionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime timestampEjecucion;

    private long duracionMs;

    private int paquetesProcesados;

    private int rutasAsignadas;

    private int paquetesNoAsignados;

    private double costoTotal;

    @Column(length = 20)
    private String estado;

    @Column(columnDefinition = "TEXT")
    private String mensajeError;

    @Column(columnDefinition = "TEXT")
    private String detallesJson;
}

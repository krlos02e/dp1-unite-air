package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationSession {

    @Id
    private String sessionId;

    private String estado;

    private int duracionDias;

    private LocalDateTime fechaInicio;

    private LocalDateTime fechaActualSimulacion;

    private double velocidad;

    private String algoritmo;

    private int progresoPorcentaje;

    @Column(columnDefinition = "TEXT")
    private String motivoColapso;

    private LocalDateTime createdAt;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String datasetJson;
}

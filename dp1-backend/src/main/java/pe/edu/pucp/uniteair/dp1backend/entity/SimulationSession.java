package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationSession implements Persistable<String> {

    @Id
    private String sessionId;

    @Transient
    private boolean isNewSession;

    @Override
    public String getId() {
        return sessionId;
    }

    @Override
    @Transient
    public boolean isNew() {
        return isNewSession;
    }

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
